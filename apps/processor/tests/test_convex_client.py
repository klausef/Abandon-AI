from __future__ import annotations

import hashlib
import hmac
import json

import httpx

from campus_safety_processor.convex_client import (
    ConvexIngestionClient,
    build_canonical_request,
    serialize_event,
    sign_body,
)

SECRET = "processor-test-secret-0123456789abcdef"


def test_builds_the_documented_signature() -> None:
    body = b'{"event":"value"}'
    canonical = build_canonical_request(
        device_id="PROCESSOR-TEST-001",
        timestamp="1700000000",
        nonce="nonce-12345678",
        body_hash=hashlib.sha256(body).hexdigest(),
    )
    expected = hmac.new(SECRET.encode(), canonical.encode(), hashlib.sha256).hexdigest()

    assert sign_body(
        secret=SECRET,
        device_id="PROCESSOR-TEST-001",
        timestamp="1700000000",
        nonce="nonce-12345678",
        body=body,
    ) == expected


def test_retries_identical_body_bytes_with_a_new_nonce() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if len(requests) == 1:
            return httpx.Response(503, json={"ok": False})
        return httpx.Response(201, json={"ok": True, "status": "accepted"})

    nonces = iter(("nonce-first-1234", "nonce-second-123"))
    client = ConvexIngestionClient(
        site_url="https://example.convex.site",
        device_id="PROCESSOR-TEST-001",
        shared_secret=SECRET,
        retries=1,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
        sleep=lambda _: None,
        now=lambda: 1_700_000_000,
        nonce_factory=lambda: next(nonces),
    )
    event = {"event_id": "evt-1", "value": 1}

    response = client.send_event(event)

    assert response.status_code == 201
    assert len(requests) == 2
    assert requests[0].content == requests[1].content == serialize_event(event)
    assert requests[0].headers["x-processor-nonce"] != requests[1].headers[
        "x-processor-nonce"
    ]
    assert requests[0].headers["x-processor-signature"] != requests[1].headers[
        "x-processor-signature"
    ]


def test_uses_compact_deterministic_json() -> None:
    encoded = serialize_event({"name": "café", "nested": {"enabled": True}})
    assert encoded == '{"name":"café","nested":{"enabled":true}}'.encode()
    assert json.loads(encoded) == {"name": "café", "nested": {"enabled": True}}


def test_health_check_requires_a_ready_json_response() -> None:
    transport = httpx.MockTransport(
        lambda _: httpx.Response(200, json={"ok": True, "service": "test"})
    )
    client = ConvexIngestionClient(
        site_url="https://example.convex.site",
        device_id="PROCESSOR-TEST-001",
        shared_secret=SECRET,
        client=httpx.Client(transport=transport),
    )
    assert client.check_health()["service"] == "test"
