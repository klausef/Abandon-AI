from __future__ import annotations

from collections.abc import Iterator
from typing import Any

from campus_safety_processor.config import ProcessorSettings
from campus_safety_processor.domain import (
    BoundingBox,
    DetectionBatch,
    ModelDetection,
    TrackedDetection,
)
from campus_safety_processor.pipeline import ProcessorPipeline
from campus_safety_processor.video import FramePacket


class FakeIngestion:
    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []
        self.health_checked = False

    def check_health(self) -> dict[str, bool]:
        self.health_checked = True
        return {"ok": True}

    def send_event(self, event: dict[str, Any]) -> object:
        self.events.append(event)
        return object()


class FakeDetector:
    def detect(self, _: object) -> DetectionBatch:
        return DetectionBatch(
            detections=(
                ModelDetection(
                    object_class="box",
                    raw_class="cardboard box",
                    confidence=0.8,
                    bounding_box=BoundingBox(0.4, 0.5, 0.1, 0.1),
                ),
            ),
            image_width=100,
            image_height=100,
            inference_latency_ms=10,
        )


class FakeTracker:
    def update(
        self, _: DetectionBatch
    ) -> tuple[tuple[TrackedDetection, ...], tuple[TrackedDetection, ...]]:
        return (
            (),
            (
                TrackedDetection(
                    tracking_id=1_000_000_001,
                    object_class="box",
                    confidence=0.8,
                    bounding_box=BoundingBox(0.4, 0.5, 0.1, 0.1),
                ),
            ),
        )


class FakeReader:
    def __init__(self, *_: object, **__: object) -> None:
        pass

    def __enter__(self) -> FakeReader:
        return self

    def __exit__(self, *_: object) -> None:
        pass

    def frames(self) -> Iterator[FramePacket]:
        yield FramePacket(object(), 0, 20)
        yield FramePacket(object(), 1, 61)


def settings() -> ProcessorSettings:
    return ProcessorSettings(
        source_mode="video",
        convex_site_url="https://example.convex.site",
        processor_device_id="PROCESSOR-TEST-001",
        processor_shared_secret="processor-test-secret-0123456789abcdef",
        camera_id="CAM-001",
        monitoring_zone_id="ZONE-DEMO-001",
        monitoring_zone_polygon=((0.1, 0.1), (0.9, 0.1), (0.9, 0.9), (0.1, 0.9)),
        video_source="authorized.mp4",
        roboflow_api_key="test-key",
        roboflow_api_url="https://serverless.roboflow.com",
        roboflow_model_version="v2-s",
        roboflow_class_prompts=("person", "cardboard box"),
        detection_confidence=0.25,
        sample_fps=2,
        stationary_seconds=20,
        unattended_seconds=40,
        association_distance=0.2,
        movement_threshold=0.02,
        warmup_seconds=10,
        track_ttl_seconds=10,
        summary_interval_seconds=5,
        heartbeat_interval_seconds=30,
        request_timeout_seconds=30,
        request_retries=0,
        display_preview=False,
        max_sampled_frames=2,
        object_tracking_id_offset=1_000_000_000,
    )


def test_pipeline_emits_real_model_metadata_and_one_potential_event(monkeypatch: Any) -> None:
    ingestion = FakeIngestion()
    monkeypatch.setattr("campus_safety_processor.pipeline.VideoReader", FakeReader)
    pipeline = ProcessorPipeline(
        settings(),
        ingestion=ingestion,  # type: ignore[arg-type]
        detector=FakeDetector(),  # type: ignore[arg-type]
        tracker=FakeTracker(),  # type: ignore[arg-type]
    )

    summary = pipeline.run()

    assert ingestion.health_checked
    assert summary.sampled_frames == 2
    assert summary.potential_incidents == 1
    event_types = [event["event_type"] for event in ingestion.events]
    assert event_types[0:2] == ["model_information", "camera_processing_status"]
    assert event_types.count("potential_unattended_object") == 1
    assert event_types[-1] == "camera_processing_status"
    assert ingestion.events[-1]["status"] == "idle"
