"""HMAC-authenticated HTTP client for Convex processor ingestion."""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

import httpx

EVENT_PATH = "/api/ai/events"
HEALTH_PATH = "/api/ai/health"
SIGNATURE_VERSION = "v1"


class ConvexIngestionError(RuntimeError):
    """Raised when Convex rejects or cannot process an event."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True, slots=True)
class IngestionResponse:
    status_code: int
    body: Mapping[str, Any]


def serialize_event(event: Mapping[str, Any]) -> bytes:
    """Serialize once so idempotent retries resend identical body bytes."""

    return json.dumps(
        event,
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def build_canonical_request(
    *,
    device_id: str,
    timestamp: str,
    nonce: str,
    body_hash: str,
    path: str = EVENT_PATH,
) -> str:
    return "\n".join(
        (
            SIGNATURE_VERSION,
            "POST",
            path,
            device_id,
            timestamp,
            nonce,
            body_hash,
        )
    )


def sign_body(
    *,
    secret: str,
    device_id: str,
    timestamp: str,
    nonce: str,
    body: bytes,
    path: str = EVENT_PATH,
) -> str:
    body_hash = hashlib.sha256(body).hexdigest()
    canonical = build_canonical_request(
        device_id=device_id,
        timestamp=timestamp,
        nonce=nonce,
        body_hash=body_hash,
        path=path,
    )
    return hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()


class ConvexIngestionClient:
    """Sends processor events without exposing a Convex deployment admin key."""

    def __init__(
        self,
        *,
        site_url: str,
        device_id: str,
        shared_secret: str,
        timeout_seconds: float = 30,
        retries: int = 3,
        client: httpx.Client | None = None,
        sleep: Callable[[float], None] = time.sleep,
        now: Callable[[], float] = time.time,
        nonce_factory: Callable[[], str] | None = None,
    ) -> None:
        self._site_url = site_url.rstrip("/")
        self._device_id = device_id
        self._shared_secret = shared_secret
        self._retries = retries
        self._sleep = sleep
        self._now = now
        self._nonce_factory = nonce_factory or (lambda: secrets.token_urlsafe(24))
        self._owns_client = client is None
        self._client = client or httpx.Client(timeout=timeout_seconds)

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> ConvexIngestionClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def check_health(self) -> Mapping[str, Any]:
        try:
            response = self._client.get(f"{self._site_url}{HEALTH_PATH}")
        except httpx.HTTPError as error:
            raise ConvexIngestionError("Convex ingestion health check failed.") from error
        if response.status_code != 200:
            raise ConvexIngestionError(
                f"Convex ingestion health check returned HTTP {response.status_code}.",
                status_code=response.status_code,
            )
        body = _safe_json_object(response)
        if body.get("ok") is not True:
            raise ConvexIngestionError("Convex ingestion health response was not ready.")
        return body

    def send_event(self, event: Mapping[str, Any]) -> IngestionResponse:
        body = serialize_event(event)
        last_error: Exception | None = None

        for attempt in range(self._retries + 1):
            timestamp = str(int(self._now()))
            nonce = self._nonce_factory()
            signature = sign_body(
                secret=self._shared_secret,
                device_id=self._device_id,
                timestamp=timestamp,
                nonce=nonce,
                body=body,
            )
            headers = {
                "Content-Type": "application/json",
                "X-Processor-Device-Id": self._device_id,
                "X-Processor-Timestamp": timestamp,
                "X-Processor-Nonce": nonce,
                "X-Processor-Signature": signature,
                "X-Processor-Signature-Version": SIGNATURE_VERSION,
            }

            try:
                response = self._client.post(
                    f"{self._site_url}{EVENT_PATH}",
                    headers=headers,
                    content=body,
                )
            except httpx.HTTPError as error:
                last_error = error
                if attempt < self._retries:
                    self._sleep(_retry_delay(attempt))
                    continue
                break

            response_body = _safe_json_object(response)
            if response.status_code in {200, 201} and response_body.get("ok") is True:
                return IngestionResponse(response.status_code, response_body)

            if response.status_code == 429 or response.status_code >= 500:
                last_error = ConvexIngestionError(
                    f"Convex ingestion temporarily failed with HTTP {response.status_code}.",
                    status_code=response.status_code,
                )
                if attempt < self._retries:
                    self._sleep(_retry_delay(attempt))
                    continue

            code = _error_code(response_body)
            raise ConvexIngestionError(
                f"Convex rejected the event with HTTP {response.status_code} ({code}).",
                status_code=response.status_code,
            )

        raise ConvexIngestionError("Convex ingestion failed after retries.") from last_error


def _retry_delay(attempt: int) -> float:
    delay = 0.5 * float(2**attempt)
    return delay if delay < 8 else 8.0


def _safe_json_object(response: httpx.Response) -> dict[str, Any]:
    try:
        value = response.json()
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _error_code(body: Mapping[str, Any]) -> str:
    error = body.get("error")
    if isinstance(error, dict):
        code = error.get("code")
        if isinstance(code, str):
            return code
    return "UNKNOWN_ERROR"
