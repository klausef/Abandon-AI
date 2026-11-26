from __future__ import annotations

import pytest

from campus_safety_processor.domain import BoundingBox, DetectionBatch, ModelDetection
from campus_safety_processor.tracking import MultiObjectTracker

pytest.importorskip("trackers")
pytest.importorskip("supervision")


def test_real_bytetrack_adapter_uses_distinct_nonnegative_namespaces() -> None:
    tracker = MultiObjectTracker(frame_rate=2, object_id_offset=1_000_000_000)
    batch = DetectionBatch(
        detections=(
            ModelDetection("person", "person", 0.9, BoundingBox(0.1, 0.1, 0.2, 0.5)),
            ModelDetection("box", "cardboard box", 0.8, BoundingBox(0.6, 0.6, 0.2, 0.2)),
        ),
        image_width=1_000,
        image_height=500,
        inference_latency_ms=10,
    )

    tracker.update(batch)
    people, objects = tracker.update(batch)

    assert len(people) == 1
    assert len(objects) == 1
    assert people[0].tracking_id >= 0
    assert objects[0].tracking_id >= 1_000_000_000
    assert people[0].tracking_id != objects[0].tracking_id
