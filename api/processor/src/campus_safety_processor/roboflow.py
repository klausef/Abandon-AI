"""Roboflow YOLO-World Serverless API adapter."""

from __future__ import annotations

import time
from collections.abc import Callable, Mapping, Sequence
from typing import Any

from .classes import normalize_model_class, object_category
from .domain import BoundingBox, DetectionBatch, ModelDetection


class RoboflowInferenceError(RuntimeError):
    """Raised when Roboflow inference fails or returns an invalid response."""


class RoboflowYoloWorldDetector:
    """Runs open-vocabulary detection without embedding API keys in URLs."""

    def __init__(
        self,
        *,
        api_url: str,
        api_key: str,
        class_prompts: tuple[str, ...],
        model_version: str,
        confidence: float,
        client: Any | None = None,
        monotonic: Callable[[], float] = time.perf_counter,
    ) -> None:
        self.class_prompts = class_prompts
        self.model_version = model_version
        self.confidence = confidence
        self._monotonic = monotonic
        if client is not None:
            self._client = client
            return

        try:
            from inference_sdk import InferenceConfiguration, InferenceHTTPClient
        except ImportError as error:  # pragma: no cover - exercised by runtime setup
            raise RoboflowInferenceError(
                "Vision dependencies are missing. Install the processor with [vision]."
            ) from error

        self._client = InferenceHTTPClient(
            api_url=api_url,
            api_key=api_key,
        ).configure(InferenceConfiguration(api_key_transport="header"))

    def detect(self, frame: Any) -> DetectionBatch:
        started_at = self._monotonic()
        try:
            results = self._client.infer_from_yolo_world(
                inference_input=frame,
                class_names=list(self.class_prompts),
                model_version=self.model_version,
                confidence=self.confidence,
            )
        except Exception as error:  # SDK exception types vary by release.
            raise RoboflowInferenceError("Roboflow YOLO-World inference failed.") from error
        latency_ms = max(0.0, (self._monotonic() - started_at) * 1_000)
        return parse_yolo_world_response(results, latency_ms=latency_ms)


def parse_yolo_world_response(
    results: Any,
    *,
    latency_ms: float,
) -> DetectionBatch:
    """Validate the SDK response and discard labels outside the approved vocabulary."""

    if not isinstance(results, Sequence) or isinstance(results, (str, bytes)) or not results:
        raise RoboflowInferenceError("Roboflow returned no result frames.")
    first = _as_mapping(results[0])
    image = _as_mapping(first.get("image"))
    width = _positive_integer(image.get("width"), "image.width")
    height = _positive_integer(image.get("height"), "image.height")
    predictions = first.get("predictions", [])
    if not isinstance(predictions, Sequence) or isinstance(predictions, (str, bytes)):
        raise RoboflowInferenceError("Roboflow predictions must be an array.")

    normalized: list[ModelDetection] = []
    for value in predictions:
        if not isinstance(value, Mapping):
            continue
        raw_class = value.get("class") or value.get("class_name")
        if not isinstance(raw_class, str):
            continue
        object_class = normalize_model_class(raw_class)
        if object_class is None:
            continue
        try:
            confidence = float(value["confidence"])
            center_x = float(value["x"])
            center_y = float(value["y"])
            box_width = float(value["width"])
            box_height = float(value["height"])
        except (KeyError, TypeError, ValueError):
            continue
        if not 0 <= confidence <= 1 or box_width <= 0 or box_height <= 0:
            continue
        x = max(0.0, (center_x - box_width / 2) / width)
        y = max(0.0, (center_y - box_height / 2) / height)
        normalized_width = min(box_width / width, 1 - x)
        normalized_height = min(box_height / height, 1 - y)
        if normalized_width <= 0 or normalized_height <= 0:
            continue
        try:
            bounding_box = BoundingBox(x, y, normalized_width, normalized_height)
        except ValueError:
            continue
        normalized.append(
            ModelDetection(
                object_class=object_class,
                raw_class=raw_class,
                confidence=confidence,
                bounding_box=bounding_box,
            )
        )

    return DetectionBatch(
        detections=tuple(_deduplicate(normalized)),
        image_width=width,
        image_height=height,
        inference_latency_ms=latency_ms,
    )


def _deduplicate(detections: list[ModelDetection]) -> list[ModelDetection]:
    """Remove overlapping prompt synonyms without suppressing objects inside people."""

    kept: list[ModelDetection] = []
    for candidate in sorted(detections, key=lambda item: item.confidence, reverse=True):
        duplicate = any(
            object_category(candidate.object_class) == object_category(existing.object_class)
            and _intersection_over_union(candidate.bounding_box, existing.bounding_box) >= 0.8
            for existing in kept
        )
        if not duplicate:
            kept.append(candidate)
    return kept


def _intersection_over_union(first: BoundingBox, second: BoundingBox) -> float:
    left = max(first.x, second.x)
    top = max(first.y, second.y)
    right = min(first.x + first.width, second.x + second.width)
    bottom = min(first.y + first.height, second.y + second.height)
    intersection = max(0.0, right - left) * max(0.0, bottom - top)
    union = first.width * first.height + second.width * second.height - intersection
    return intersection / union if union > 0 else 0.0


def _as_mapping(value: Any) -> Mapping[str, Any]:
    if isinstance(value, Mapping):
        return value
    model_dump = getattr(value, "model_dump", None)
    if callable(model_dump):
        dumped = model_dump()
        if isinstance(dumped, Mapping):
            return dumped
    raise RoboflowInferenceError("Roboflow returned an unexpected response object.")


def _positive_integer(value: Any, field: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError) as error:
        raise RoboflowInferenceError(f"Roboflow {field} is invalid.") from error
    if parsed <= 0:
        raise RoboflowInferenceError(f"Roboflow {field} must be positive.")
    return parsed
