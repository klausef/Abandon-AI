"""Normalized monitoring-zone geometry."""

from __future__ import annotations

from .domain import DetectionBatch


def filter_objects_to_polygon(
    batch: DetectionBatch,
    polygon: tuple[tuple[float, float], ...] | None,
) -> DetectionBatch:
    """Keep all people, but only portable objects centered inside the zone."""

    if polygon is None:
        return batch
    detections = tuple(
        detection
        for detection in batch.detections
        if detection.object_class == "person"
        or point_in_polygon(detection.bounding_box.center, polygon)
    )
    return DetectionBatch(
        detections=detections,
        image_width=batch.image_width,
        image_height=batch.image_height,
        inference_latency_ms=batch.inference_latency_ms,
    )


def point_in_polygon(
    point: tuple[float, float],
    polygon: tuple[tuple[float, float], ...],
) -> bool:
    """Ray-casting point test that treats polygon boundaries as inside."""

    x, y = point
    inside = False
    previous_x, previous_y = polygon[-1]
    for current_x, current_y in polygon:
        if _point_on_segment(point, (previous_x, previous_y), (current_x, current_y)):
            return True
        crosses = (current_y > y) != (previous_y > y)
        if crosses:
            intersection_x = (previous_x - current_x) * (y - current_y) / (
                previous_y - current_y
            ) + current_x
            if x < intersection_x:
                inside = not inside
        previous_x, previous_y = current_x, current_y
    return inside


def _point_on_segment(
    point: tuple[float, float],
    start: tuple[float, float],
    end: tuple[float, float],
) -> bool:
    x, y = point
    start_x, start_y = start
    end_x, end_y = end
    cross = (x - start_x) * (end_y - start_y) - (y - start_y) * (end_x - start_x)
    if abs(cross) > 1e-9:
        return False
    return (
        min(start_x, end_x) - 1e-9 <= x <= max(start_x, end_x) + 1e-9
        and min(start_y, end_y) - 1e-9 <= y <= max(start_y, end_y) + 1e-9
    )
