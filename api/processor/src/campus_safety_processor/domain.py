"""Typed domain values shared by detection, tracking, and event generation."""

from __future__ import annotations

from dataclasses import dataclass
from math import hypot
from typing import Literal, TypeAlias

DetectionObjectClass: TypeAlias = Literal[
    "person",
    "backpack",
    "handbag",
    "suitcase",
    "duffel_bag",
    "shopping_bag",
    "briefcase",
    "bag",
    "bottle",
    "mug",
    "cup",
    "box",
    "package",
    "parcel",
]
IncidentObjectClass: TypeAlias = Literal[
    "backpack",
    "handbag",
    "suitcase",
    "duffel_bag",
    "shopping_bag",
    "briefcase",
    "bag",
    "bottle",
    "mug",
    "cup",
    "box",
    "package",
    "parcel",
]
TrackState: TypeAlias = Literal[
    "OBSERVED",
    "MONITORING",
    "POTENTIAL_UNATTENDED",
    "ALERTED",
    "CLEARED",
]
DetectionStatus: TypeAlias = Literal[
    "detected",
    "tracking",
    "stationary",
    "unattended_monitoring",
    "potential_incident",
]


@dataclass(frozen=True, slots=True)
class BoundingBox:
    """Bounding box normalized to a zero-to-one image coordinate system."""

    x: float
    y: float
    width: float
    height: float

    def __post_init__(self) -> None:
        values = (self.x, self.y, self.width, self.height)
        if not all(0 <= value <= 1 for value in values):
            raise ValueError("Bounding-box coordinates must be normalized between 0 and 1.")
        if self.width <= 0 or self.height <= 0:
            raise ValueError("Bounding-box width and height must be positive.")
        if self.x + self.width > 1.000_001 or self.y + self.height > 1.000_001:
            raise ValueError("Bounding box must fit inside the normalized image.")

    @property
    def center(self) -> tuple[float, float]:
        return (self.x + self.width / 2, self.y + self.height / 2)

    def center_distance(self, other: BoundingBox) -> float:
        first_x, first_y = self.center
        second_x, second_y = other.center
        return hypot(first_x - second_x, first_y - second_y)

    def to_payload(self) -> dict[str, float]:
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
        }


@dataclass(frozen=True, slots=True)
class ModelDetection:
    """One validated and normalized object returned by Roboflow."""

    object_class: DetectionObjectClass
    raw_class: str
    confidence: float
    bounding_box: BoundingBox


@dataclass(frozen=True, slots=True)
class DetectionBatch:
    """Detections and timing metadata produced for one video frame."""

    detections: tuple[ModelDetection, ...]
    image_width: int
    image_height: int
    inference_latency_ms: float


@dataclass(frozen=True, slots=True)
class TrackedDetection:
    """A model detection with a processor-session-scoped tracking ID."""

    tracking_id: int
    object_class: DetectionObjectClass
    confidence: float
    bounding_box: BoundingBox


@dataclass(frozen=True, slots=True)
class PersonAssociation:
    """Current relationship between a portable object and nearby people."""

    associated_person_observed: bool
    nearest_person_tracking_id: int | None
    distance_normalized: float | None
    confidence: float | None


@dataclass(frozen=True, slots=True)
class ObjectTrackUpdate:
    """State-machine output for one currently observed portable object."""

    detection: TrackedDetection
    previous_bounding_box: BoundingBox | None
    state: TrackState
    first_seen_at: float
    stationary_since: float | None
    stationary_duration_seconds: float
    unattended_duration_seconds: float
    association: PersonAssociation
    is_new: bool
    state_changed: bool
    association_changed: bool
    potential_incident: bool


@dataclass(frozen=True, slots=True)
class AnalysisResult:
    """State-machine result for a sampled video frame."""

    object_updates: tuple[ObjectTrackUpdate, ...]
    removed_track_ids: tuple[int, ...]
