from campus_safety_processor.domain import BoundingBox, DetectionBatch, ModelDetection
from campus_safety_processor.geometry import filter_objects_to_polygon, point_in_polygon

ZONE = ((0.1, 0.1), (0.9, 0.1), (0.9, 0.9), (0.1, 0.9))


def test_point_in_polygon_includes_boundaries() -> None:
    assert point_in_polygon((0.5, 0.5), ZONE)
    assert point_in_polygon((0.1, 0.5), ZONE)
    assert not point_in_polygon((0.95, 0.5), ZONE)


def test_filters_portable_objects_but_keeps_people_outside_the_zone() -> None:
    batch = DetectionBatch(
        detections=(
            ModelDetection("box", "box", 0.9, BoundingBox(0.4, 0.4, 0.1, 0.1)),
            ModelDetection("parcel", "parcel", 0.8, BoundingBox(0.92, 0.4, 0.05, 0.1)),
            ModelDetection("person", "person", 0.95, BoundingBox(0.92, 0.2, 0.05, 0.5)),
        ),
        image_width=100,
        image_height=100,
        inference_latency_ms=10,
    )

    filtered = filter_objects_to_polygon(batch, ZONE)
    assert [item.object_class for item in filtered.detections] == ["box", "person"]
