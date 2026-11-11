"""Fail-closed environment configuration for the AI processor."""

from __future__ import annotations

import os
import re
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal, TypeAlias, cast

from .classes import DEFAULT_CLASS_PROMPTS, normalize_model_class

_IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
_MODEL_VERSIONS = {"v2-s", "v2-m", "v2-l", "v2-x", "s", "m", "l", "x"}
ProcessorSourceMode: TypeAlias = Literal["disabled", "video", "tapo_rtsp"]


class ConfigurationError(ValueError):
    """Raised when processor configuration is absent or unsafe."""


def processor_source_mode(
    source: Mapping[str, str] | None = None,
) -> ProcessorSourceMode:
    """Read the source mode without requiring credentials for disabled mode."""

    env = os.environ if source is None else source
    value = env.get("PROCESSOR_SOURCE_MODE", "disabled").strip().lower()
    if value not in {"disabled", "video", "tapo_rtsp"}:
        raise ConfigurationError(
            "PROCESSOR_SOURCE_MODE must be disabled, video, or tapo_rtsp."
        )
    return cast(ProcessorSourceMode, value)


def _required(env: Mapping[str, str], name: str) -> str:
    value = env.get(name, "").strip()
    if not value:
        raise ConfigurationError(f"{name} is required.")
    return value


def _boolean(env: Mapping[str, str], name: str, default: bool = False) -> bool:
    raw = env.get(name)
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ConfigurationError(f"{name} must be true or false.")


def _float(
    env: Mapping[str, str],
    name: str,
    default: float,
    *,
    minimum: float,
    maximum: float,
) -> float:
    raw = env.get(name)
    try:
        value = default if raw is None else float(raw)
    except ValueError as error:
        raise ConfigurationError(f"{name} must be a number.") from error
    if not minimum <= value <= maximum:
        raise ConfigurationError(f"{name} must be between {minimum} and {maximum}.")
    return value


def _integer(
    env: Mapping[str, str],
    name: str,
    default: int,
    *,
    minimum: int,
    maximum: int,
) -> int:
    raw = env.get(name)
    try:
        value = default if raw is None else int(raw)
    except ValueError as error:
        raise ConfigurationError(f"{name} must be an integer.") from error
    if not minimum <= value <= maximum:
        raise ConfigurationError(f"{name} must be between {minimum} and {maximum}.")
    return value


@dataclass(frozen=True, slots=True)
class ProcessorSettings:
    """Validated runtime settings loaded from environment variables."""

    source_mode: Literal["video", "tapo_rtsp"]
    convex_site_url: str
    processor_device_id: str
    processor_shared_secret: str
    camera_id: str
    monitoring_zone_id: str | None
    monitoring_zone_polygon: tuple[tuple[float, float], ...] | None
    video_source: str
    roboflow_api_key: str
    roboflow_api_url: str
    roboflow_model_version: str
    roboflow_class_prompts: tuple[str, ...]
    detection_confidence: float
    sample_fps: float
    stationary_seconds: float
    unattended_seconds: float
    association_distance: float
    movement_threshold: float
    warmup_seconds: float
    track_ttl_seconds: float
    summary_interval_seconds: float
    heartbeat_interval_seconds: float
    request_timeout_seconds: float
    request_retries: int
    display_preview: bool
    max_sampled_frames: int | None
    object_tracking_id_offset: int

    @classmethod
    def from_env(cls, source: Mapping[str, str] | None = None) -> ProcessorSettings:
        env = os.environ if source is None else source
        source_mode = processor_source_mode(env)
        if source_mode == "disabled":
            raise ConfigurationError(
                "Processor source mode is disabled; no video processing is configured."
            )

        secret = _required(env, "PROCESSOR_SHARED_SECRET")
        if len(secret) < 32:
            raise ConfigurationError("PROCESSOR_SHARED_SECRET must be at least 32 characters.")

        device_id = _required(env, "PROCESSOR_DEVICE_ID")
        camera_id = _required(env, "CAMERA_ID")
        zone_id = env.get("MONITORING_ZONE_ID", "").strip() or None
        for name, value in (
            ("PROCESSOR_DEVICE_ID", device_id),
            ("CAMERA_ID", camera_id),
            ("MONITORING_ZONE_ID", zone_id),
        ):
            if value is not None and not _IDENTIFIER_PATTERN.fullmatch(value):
                raise ConfigurationError(f"{name} is malformed.")
        zone_polygon = _polygon(env.get("MONITORING_ZONE_POLYGON", ""))
        if zone_id is not None and zone_polygon is None:
            raise ConfigurationError(
                "MONITORING_ZONE_POLYGON is required when MONITORING_ZONE_ID is set."
            )

        convex_site_url = _required(env, "CONVEX_SITE_URL").rstrip("/")
        if not convex_site_url.startswith(("https://", "http://127.0.0.1", "http://localhost")):
            raise ConfigurationError(
                "CONVEX_SITE_URL must use HTTPS, except for localhost development."
            )

        video_source = _required(env, "VIDEO_SOURCE")
        is_rtsp = bool(re.match(r"^rtsps?://", video_source, flags=re.IGNORECASE))
        if source_mode == "tapo_rtsp" and not is_rtsp:
            raise ConfigurationError(
                "VIDEO_SOURCE must be an RTSP URL when PROCESSOR_SOURCE_MODE=tapo_rtsp."
            )
        if source_mode == "video" and is_rtsp:
            raise ConfigurationError(
                "Use PROCESSOR_SOURCE_MODE=tapo_rtsp for an RTSP camera source."
            )
        if not _boolean(env, "VIDEO_SOURCE_AUTHORIZED"):
            raise ConfigurationError(
                "VIDEO_SOURCE_AUTHORIZED=true is required before processing video."
            )
        if not _boolean(env, "ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED"):
            raise ConfigurationError(
                "ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED=true is required because frames "
                "are sent to Roboflow."
            )

        model_version = env.get("ROBOFLOW_MODEL_VERSION", "v2-s").strip()
        if model_version not in _MODEL_VERSIONS:
            raise ConfigurationError("ROBOFLOW_MODEL_VERSION is not supported by YOLO-World.")

        raw_prompts = env.get("ROBOFLOW_CLASS_PROMPTS")
        prompts = (
            tuple(part.strip() for part in raw_prompts.split(",") if part.strip())
            if raw_prompts
            else DEFAULT_CLASS_PROMPTS
        )
        if not prompts or len(prompts) > 32:
            raise ConfigurationError("ROBOFLOW_CLASS_PROMPTS must contain 1 to 32 classes.")
        if any(len(prompt) > 64 for prompt in prompts):
            raise ConfigurationError("Roboflow class prompts must be at most 64 characters.")
        unknown_prompts = [prompt for prompt in prompts if normalize_model_class(prompt) is None]
        if unknown_prompts:
            raise ConfigurationError(
                "ROBOFLOW_CLASS_PROMPTS contains unsupported labels: "
                + ", ".join(unknown_prompts)
            )
        if not any(normalize_model_class(prompt) == "person" for prompt in prompts):
            raise ConfigurationError(
                "ROBOFLOW_CLASS_PROMPTS must include person for association checks."
            )

        max_frames_value = _integer(
            env,
            "MAX_SAMPLED_FRAMES",
            0,
            minimum=0,
            maximum=10_000_000,
        )
        if max_frames_value == 0 and not _boolean(
            env, "CONTINUOUS_PROCESSING_ACKNOWLEDGED"
        ):
            raise ConfigurationError(
                "Set MAX_SAMPLED_FRAMES to a bounded value or explicitly set "
                "CONTINUOUS_PROCESSING_ACKNOWLEDGED=true."
            )

        return cls(
            source_mode=source_mode,
            convex_site_url=convex_site_url,
            processor_device_id=device_id,
            processor_shared_secret=secret,
            camera_id=camera_id,
            monitoring_zone_id=zone_id,
            monitoring_zone_polygon=zone_polygon,
            video_source=video_source,
            roboflow_api_key=_required(env, "ROBOFLOW_API_KEY"),
            roboflow_api_url=env.get(
                "ROBOFLOW_API_URL", "https://serverless.roboflow.com"
            ).rstrip("/"),
            roboflow_model_version=model_version,
            roboflow_class_prompts=prompts,
            detection_confidence=_float(
                env, "DETECTION_CONFIDENCE", 0.25, minimum=0.01, maximum=1
            ),
            sample_fps=_float(env, "SAMPLE_FPS", 2, minimum=0.1, maximum=30),
            stationary_seconds=_float(
                env, "STATIONARY_SECONDS", 30, minimum=1, maximum=86_400
            ),
            unattended_seconds=_float(
                env, "UNATTENDED_SECONDS", 60, minimum=1, maximum=86_400
            ),
            association_distance=_float(
                env, "ASSOCIATION_DISTANCE", 0.18, minimum=0.01, maximum=2
            ),
            movement_threshold=_float(
                env, "MOVEMENT_THRESHOLD", 0.015, minimum=0.0001, maximum=1
            ),
            warmup_seconds=_float(
                env, "BACKGROUND_WARMUP_SECONDS", 10, minimum=0, maximum=3_600
            ),
            track_ttl_seconds=_float(
                env, "TRACK_TTL_SECONDS", 10, minimum=1, maximum=3_600
            ),
            summary_interval_seconds=_float(
                env, "SUMMARY_INTERVAL_SECONDS", 5, minimum=0.5, maximum=3_600
            ),
            heartbeat_interval_seconds=_float(
                env, "HEARTBEAT_INTERVAL_SECONDS", 30, minimum=5, maximum=3_600
            ),
            request_timeout_seconds=_float(
                env, "REQUEST_TIMEOUT_SECONDS", 30, minimum=1, maximum=120
            ),
            request_retries=_integer(env, "REQUEST_RETRIES", 3, minimum=0, maximum=10),
            display_preview=_boolean(env, "DISPLAY_PREVIEW"),
            max_sampled_frames=max_frames_value or None,
            object_tracking_id_offset=_integer(
                env,
                "OBJECT_TRACKING_ID_OFFSET",
                1_000_000_000,
                minimum=100_000_000,
                maximum=1_500_000_000,
            ),
        )


def _polygon(raw: str) -> tuple[tuple[float, float], ...] | None:
    value = raw.strip()
    if not value:
        return None
    points: list[tuple[float, float]] = []
    try:
        for encoded_point in value.split(";"):
            x_text, y_text = encoded_point.strip().split(":", 1)
            point = (float(x_text), float(y_text))
            if not 0 <= point[0] <= 1 or not 0 <= point[1] <= 1:
                raise ValueError
            points.append(point)
    except ValueError as error:
        raise ConfigurationError(
            "MONITORING_ZONE_POLYGON must use normalized x:y points separated by semicolons."
        ) from error
    if not 3 <= len(points) <= 64:
        raise ConfigurationError(
            "MONITORING_ZONE_POLYGON must contain between 3 and 64 points."
        )
    area = abs(
        sum(
            first[0] * second[1] - second[0] * first[1]
            for first, second in zip(points, (*points[1:], points[0]), strict=True)
        )
    ) / 2
    if area <= 1e-9:
        raise ConfigurationError("MONITORING_ZONE_POLYGON must enclose a non-zero area.")
    return tuple(points)
