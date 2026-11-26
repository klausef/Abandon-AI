from __future__ import annotations

from dataclasses import replace
from types import SimpleNamespace
from typing import Any

from campus_safety_processor.config import ProcessorSettings
from campus_safety_processor.doctor import run_preflight
from campus_safety_processor.domain import DetectionBatch
from campus_safety_processor.video import FramePacket


def settings() -> ProcessorSettings:
    return ProcessorSettings.from_env(
        {
            "CONVEX_SITE_URL": "https://example.convex.site",
            "PROCESSOR_SOURCE_MODE": "video",
            "PROCESSOR_DEVICE_ID": "PROCESSOR-TEST-001",
            "PROCESSOR_SHARED_SECRET": "processor-test-secret-0123456789abcdef",
            "CAMERA_ID": "CAM-001",
            "VIDEO_SOURCE": "authorized.mp4",
            "VIDEO_SOURCE_AUTHORIZED": "true",
            "ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED": "true",
            "ROBOFLOW_API_KEY": "test-only-key",
            "MAX_SAMPLED_FRAMES": "10",
        }
    )


class FakeIngestion:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error

    def check_health(self) -> dict[str, bool]:
        if self.error is not None:
            raise self.error
        return {"ok": True}

    def close(self) -> None:
        pass


class FakeReader:
    def __init__(self, *_: object, **__: object) -> None:
        pass

    def __enter__(self) -> FakeReader:
        return self

    def __exit__(self, *_: object) -> None:
        pass

    def frames(self) -> Any:
        yield FramePacket(SimpleNamespace(shape=(480, 640, 3)), 0, 1.0)


class EmptyReader(FakeReader):
    def frames(self) -> Any:
        return iter(())


class LeakyReader(FakeReader):
    def __init__(self, source: str, **_: object) -> None:
        self.source = source

    def __enter__(self) -> LeakyReader:
        raise RuntimeError(f"failed to open {self.source}")


class FakeDetector:
    def __init__(self) -> None:
        self.calls = 0

    def detect(self, _: object) -> DetectionBatch:
        self.calls += 1
        return DetectionBatch(
            detections=(),
            image_width=640,
            image_height=480,
            inference_latency_ms=42.0,
        )


class LeakyDetector:
    def __init__(self, key: str) -> None:
        self.key = key

    def detect(self, _: object) -> DetectionBatch:
        raise RuntimeError(f"request rejected for key {self.key}")


def test_all_checks_pass() -> None:
    detector = FakeDetector()
    results = run_preflight(
        settings(),
        check_roboflow=True,
        ingestion=FakeIngestion(),
        reader_factory=FakeReader,
        detector=detector,
    )

    assert [result.name for result in results] == ["convex", "camera", "roboflow"]
    assert all(result.ok for result in results)
    assert "640x480" in results[1].detail
    assert "0 approved detections" in results[2].detail
    assert detector.calls == 1


def test_roboflow_is_not_called_unless_requested() -> None:
    detector = FakeDetector()
    results = run_preflight(
        settings(),
        ingestion=FakeIngestion(),
        reader_factory=FakeReader,
        detector=detector,
    )

    assert [result.name for result in results] == ["convex", "camera"]
    assert detector.calls == 0


def test_camera_failure_still_reports_convex_and_skips_roboflow() -> None:
    results = run_preflight(
        settings(),
        check_roboflow=True,
        ingestion=FakeIngestion(),
        reader_factory=EmptyReader,
        detector=FakeDetector(),
    )

    assert [result.ok for result in results] == [True, False, False]
    assert "returned no frames" in results[1].detail
    assert "skipped" in results[2].detail


def test_convex_failure_does_not_block_camera_check() -> None:
    results = run_preflight(
        settings(),
        ingestion=FakeIngestion(error=RuntimeError("health unavailable")),
        reader_factory=FakeReader,
    )

    assert [result.ok for result in results] == [False, True]
    assert "health unavailable" in results[0].detail


def test_failure_details_redact_urls_keys_and_shared_secrets() -> None:
    configured = replace(
        settings(),
        video_source="rtsp://operator:password@192.0.2.10:554/stream2",
    )
    results = run_preflight(
        configured,
        check_roboflow=True,
        ingestion=FakeIngestion(
            error=RuntimeError(
                f"rejected secret {configured.processor_shared_secret}"
            )
        ),
        reader_factory=LeakyReader,
        detector=LeakyDetector(configured.roboflow_api_key),
    )
    output = " ".join(result.detail for result in results)

    assert configured.processor_shared_secret not in output
    assert configured.video_source not in output
    assert "operator:password" not in output

    roboflow_results = run_preflight(
        configured,
        check_roboflow=True,
        ingestion=FakeIngestion(),
        reader_factory=FakeReader,
        detector=LeakyDetector(configured.roboflow_api_key),
    )
    roboflow_output = " ".join(result.detail for result in roboflow_results)
    assert configured.roboflow_api_key not in roboflow_output
