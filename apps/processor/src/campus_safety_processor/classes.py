"""Roboflow prompt configuration and conservative class normalization."""

from __future__ import annotations

import re
from typing import Literal, TypeAlias, cast

from .domain import DetectionObjectClass, IncidentObjectClass

DEFAULT_CLASS_PROMPTS = (
    "person",
    "backpack",
    "handbag",
    "suitcase",
    "duffel bag",
    "shopping bag",
    "briefcase",
    "bag",
    "water bottle",
    "coffee mug",
    "cup",
    "cardboard box",
    "package",
    "parcel",
)

DETECTION_OBJECT_CLASSES: tuple[DetectionObjectClass, ...] = (
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
)

INCIDENT_OBJECT_CLASSES: tuple[IncidentObjectClass, ...] = cast(
    tuple[IncidentObjectClass, ...],
    tuple(value for value in DETECTION_OBJECT_CLASSES if value != "person"),
)

ObjectCategory: TypeAlias = Literal["person", "bag", "drink_container", "package"]

_ALIASES: dict[str, DetectionObjectClass] = {
    "person": "person",
    "people": "person",
    "human": "person",
    "backpack": "backpack",
    "back pack": "backpack",
    "rucksack": "backpack",
    "handbag": "handbag",
    "hand bag": "handbag",
    "purse": "handbag",
    "suitcase": "suitcase",
    "luggage": "suitcase",
    "duffel bag": "duffel_bag",
    "duffle bag": "duffel_bag",
    "shopping bag": "shopping_bag",
    "briefcase": "briefcase",
    "bag": "bag",
    "water bottle": "bottle",
    "plastic bottle": "bottle",
    "bottle": "bottle",
    "coffee mug": "mug",
    "mug": "mug",
    "cup": "cup",
    "cardboard box": "box",
    "carton": "box",
    "box": "box",
    "package": "package",
    "parcel": "parcel",
}


def _normalize_label(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower().replace("_", "-").replace("-", " "))


def normalize_model_class(raw_class: str) -> DetectionObjectClass | None:
    """Map only explicitly approved model labels into the backend vocabulary."""

    return _ALIASES.get(_normalize_label(raw_class))


def object_category(object_class: DetectionObjectClass) -> ObjectCategory:
    if object_class == "person":
        return "person"
    if object_class in {"bottle", "mug", "cup"}:
        return "drink_container"
    if object_class in {"box", "package", "parcel"}:
        return "package"
    return "bag"


def is_incident_object(
    object_class: DetectionObjectClass,
) -> bool:
    return object_class != "person"
