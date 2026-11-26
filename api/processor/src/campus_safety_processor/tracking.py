"""ByteTrack adapter with separate person and portable-object ID namespaces."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from .classes import DETECTION_OBJECT_CLASSES
from .domain import BoundingBox, DetectionBatch, DetectionObjectClass, TrackedDetection


class TrackingError(RuntimeError):
    """Raised when tracking dependencies or outputs are invalid."""


class MultiObjectTracker:
    """Tracks people and portable objects independently to reduce class swaps."""

    def __init__(
        self,
        *,
        frame_rate: float,
        object_id_offset: int,
        person_tracker: Any | None = None,
        object_tracker: Any | None = None,
    ) -> None:
        self.object_id_offset = object_id_offset
        self._class_votes: dict[int, Counter[DetectionObjectClass]] = defaultdict(Counter)
        if person_tracker is not None and object_tracker is not None:
            self._person_tracker = person_tracker
            self._object_tracker = object_tracker
            return
        try:
            from trackers import ByteTrackTracker
        except ImportError as error:  # pragma: no cover - exercised by runtime setup
            raise TrackingError(
                "Tracking dependencies are missing. Install the processor with [vision]."
            ) from error
        rounded_frame_rate = max(1, round(frame_rate))
        self._person_tracker = ByteTrackTracker(frame_rate=rounded_frame_rate)
        self._object_tracker = ByteTrackTracker(frame_rate=rounded_frame_rate)

    def update(
        self,
        batch: DetectionBatch,
    ) -> tuple[tuple[TrackedDetection, ...], tuple[TrackedDetection, ...]]:
        people = tuple(item for item in batch.detections if item.object_class == "person")
        objects = tuple(item for item in batch.detections if item.object_class != "person")
        tracked_people = self._update_tracker(
            self._person_tracker,
            people,
            batch.image_width,
            batch.image_height,
            id_offset=0,
        )
        tracked_objects = self._update_tracker(
            self._object_tracker,
            objects,
            batch.image_width,
            batch.image_height,
            id_offset=self.object_id_offset,
        )
        return tracked_people, tracked_objects

    def _update_tracker(
        self,
        tracker: Any,
        detections: tuple[Any, ...],
        image_width: int,
        image_height: int,
        *,
        id_offset: int,
    ) -> tuple[TrackedDetection, ...]:
        try:
            import numpy as np
            import supervision as sv
        except ImportError as error:  # pragma: no cover - exercised by runtime setup
            raise TrackingError(
                "Tracking dependencies are missing. Install the processor with [vision]."
            ) from error

        if detections:
            xyxy = np.array(
                [
                    [
                        item.bounding_box.x * image_width,
                        item.bounding_box.y * image_height,
                        (item.bounding_box.x + item.bounding_box.width) * image_width,
                        (item.bounding_box.y + item.bounding_box.height) * image_height,
                    ]
                    for item in detections
                ],
                dtype=float,
            )
            class_ids = np.array(
                [DETECTION_OBJECT_CLASSES.index(item.object_class) for item in detections],
                dtype=int,
            )
            confidence = np.array([item.confidence for item in detections], dtype=float)
            detector_output = sv.Detections(
                xyxy=xyxy,
                confidence=confidence,
                class_id=class_ids,
            )
        else:
            detector_output = sv.Detections.empty()

        tracked = tracker.update(detector_output)
        results: list[TrackedDetection] = []
        tracker_ids = getattr(tracked, "tracker_id", None)
        if tracker_ids is None:
            return ()
        for index, raw_tracking_id in enumerate(tracker_ids):
            if raw_tracking_id is None:
                continue
            raw_tracking_id = int(raw_tracking_id)
            # The trackers package uses -1 while a detection is not yet a
            # confirmed track. Convex accepts only stable non-negative IDs.
            if raw_tracking_id < 0:
                continue
            class_id = int(tracked.class_id[index])
            if not 0 <= class_id < len(DETECTION_OBJECT_CLASSES):
                continue
            tracking_id = raw_tracking_id + id_offset
            detected_class = DETECTION_OBJECT_CLASSES[class_id]
            self._class_votes[tracking_id][detected_class] += 1
            object_class = self._class_votes[tracking_id].most_common(1)[0][0]
            left, top, right, bottom = (float(value) for value in tracked.xyxy[index])
            x = max(0.0, min(left / image_width, 1.0))
            y = max(0.0, min(top / image_height, 1.0))
            width = max(0.0, min(right / image_width, 1.0) - x)
            height = max(0.0, min(bottom / image_height, 1.0) - y)
            if width <= 0 or height <= 0:
                continue
            raw_confidence = tracked.confidence[index] if tracked.confidence is not None else 0.0
            results.append(
                TrackedDetection(
                    tracking_id=tracking_id,
                    object_class=object_class,
                    confidence=max(0.0, min(float(raw_confidence), 1.0)),
                    bounding_box=BoundingBox(x, y, width, height),
                )
            )
        return tuple(results)
