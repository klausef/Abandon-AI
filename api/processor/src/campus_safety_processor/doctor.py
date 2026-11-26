"""Read-only preflight checks for the processor.

The doctor validates configuration, Convex reachability, and the camera stream
without ingesting events. Roboflow is only contacted when explicitly requested,
because hosted inference is billed per frame.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .config import ProcessorSettings
from .convex_client import ConvexIngestionClient
from .roboflow import RoboflowYoloWorldDetector
from .video import VideoReader, redact_video_source


@dataclass(frozen=True, slots=True)
class CheckResult:
    """Outcome of one independent preflight check."""

    name: str
    ok: bool
    detail: str


def run_preflight(
    settings: ProcessorSettings,
    *,
    check_roboflow: bool = False,
    ingestion: Any | None = None,
    reader_factory: Any | None = None,
    detector: Any | None = None,
) -> list[CheckResult]:
    """Run every check even when an earlier one fails.

    ``ingestion``, ``reader_factory``, and ``detector`` are injection seams for
    tests. Production callers leave them unset.
    """

    results = [_check_convex(settings, ingestion)]
    frame, camera_result = _check_camera(settings, reader_factory)
    results.append(camera_result)

    if check_roboflow:
        results.append(_check_roboflow(settings, frame, detector))
    return results


def _check_convex(
    settings: ProcessorSettings,
    ingestion: Any | None,
) -> CheckResult:
    owns_client = ingestion is None
    client = ingestion or ConvexIngestionClient(
        site_url=settings.convex_site_url,
        device_id=settings.processor_device_id,
        shared_secret=settings.processor_shared_secret,
        timeout_seconds=settings.request_timeout_seconds,
        retries=settings.request_retries,
    )
    try:
        client.check_health()
        return CheckResult("convex", True, "public ingestion health endpoint is ready")
    except Exception as error:
        return CheckResult(
            "convex",
            False,
            _safe_error(error, settings.processor_shared_secret),
        )
    finally:
        if owns_client:
            client.close()


def _check_camera(
    settings: ProcessorSettings,
    reader_factory: Any | None,
) -> tuple[Any | None, CheckResult]:
    factory = reader_factory or VideoReader
    source = redact_video_source(settings.video_source)
    try:
        with factory(
            settings.video_source,
            sample_fps=settings.sample_fps,
            max_sampled_frames=1,
            rtsp_transport=settings.rtsp_transport,
            timeout_seconds=settings.rtsp_timeout_seconds,
        ) as reader:
            packet = next(iter(reader.frames()))
    except StopIteration:
        return None, CheckResult("camera", False, f"{source} returned no frames")
    except Exception as error:
        return None, CheckResult(
            "camera",
            False,
            _safe_error(error, settings.video_source),
        )

    shape = getattr(packet.frame, "shape", None)
    if shape is None or len(shape) < 2:
        return packet.frame, CheckResult("camera", False, "frame has no image dimensions")
    height, width = int(shape[0]), int(shape[1])
    return packet.frame, CheckResult("camera", True, f"{width}x{height} from {source}")


def _check_roboflow(
    settings: ProcessorSettings,
    frame: Any | None,
    detector: Any | None,
) -> CheckResult:
    if frame is None:
        return CheckResult("roboflow", False, "skipped because the camera check failed")
    try:
        active_detector = detector or RoboflowYoloWorldDetector(
            api_url=settings.roboflow_api_url,
            api_key=settings.roboflow_api_key,
            class_prompts=settings.roboflow_class_prompts,
            model_version=settings.roboflow_model_version,
            confidence=settings.detection_confidence,
        )
        batch = active_detector.detect(frame)
    except Exception as error:
        return CheckResult(
            "roboflow",
            False,
            _safe_error(error, settings.roboflow_api_key),
        )
    return CheckResult(
        "roboflow",
        True,
        f"{len(batch.detections)} approved detections in {batch.inference_latency_ms:.0f} ms",
    )


def _safe_error(error: Exception, *sensitive_values: str) -> str:
    """Render an actionable error without URLs, keys, or shared secrets."""

    detail = str(error).strip() or type(error).__name__
    for value in sensitive_values:
        if value:
            detail = detail.replace(value, "[redacted]")
    return re.sub(r"(?i)rtsps?://[^\s]+", "rtsp://[redacted]", detail)
