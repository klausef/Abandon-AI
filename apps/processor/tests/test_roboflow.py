from __future__ import annotations

import pytest

from campus_safety_processor.roboflow import (
    RoboflowInferenceError,
    RoboflowYoloWorldDetector,
    parse_yolo_world_response,
)


class FakeInferenceClient:
    def __init__(self) -> None:
        self.arguments: dict[str, object] = {}

    def infer_from_yolo_world(self, **kwargs: object) -> list[dict[str, object]]:
        self.arguments = kwargs
        return [{"image": {"width": 100, "height": 100}, "predictions": []}]


def test_detector_calls_the_hosted_yolo_world_contract() -> None:
    client = FakeInferenceClient()
    clock = iter((10.0, 10.05))
    detector = RoboflowYoloWorldDetector(
        api_url="https://serverless.roboflow.com",
        api_key="test-key",
        class_prompts=("person", "parcel"),
        model_version="v2-s",
        confidence=0.25,
        client=client,
        monotonic=lambda: next(clock),
    )

    result = detector.detect(object())

    assert client.arguments["class_names"] == ["person", "parcel"]
    assert client.arguments["model_version"] == "v2-s"
    assert client.arguments["confidence"] == 0.25
    assert result.inference_latency_ms == pytest.approx(50)


def test_parses_and_normalizes_yolo_world_predictions() -> None:
    result = parse_yolo_world_response(
        [
            {
                "image": {"width": 1000, "height": 500},
                "predictions": [
                    {
                        "class": "coffee mug",
                        "confidence": 0.88,
                        "x": 250,
                        "y": 250,
                        "width": 100,
                        "height": 100,
                    },
                    {
                        "class": "person",
                        "confidence": 0.95,
                        "x": 700,
                        "y": 250,
                        "width": 200,
                        "height": 400,
                    },
                    {
                        "class": "suspicious object",
                        "confidence": 0.99,
                        "x": 100,
                        "y": 100,
                        "width": 50,
                        "height": 50,
                    },
                ],
            }
        ],
        latency_ms=42,
    )

    assert [item.object_class for item in result.detections] == ["person", "mug"]
    mug = result.detections[1]
    assert mug.bounding_box.x == pytest.approx(0.2)
    assert mug.bounding_box.y == pytest.approx(0.4)
    assert mug.bounding_box.width == pytest.approx(0.1)
    assert mug.bounding_box.height == pytest.approx(0.2)
    assert result.inference_latency_ms == 42


def test_deduplicates_overlapping_prompt_synonyms_but_not_people() -> None:
    result = parse_yolo_world_response(
        [
            {
                "image": {"width": 100, "height": 100},
                "predictions": [
                    {
                        "class": "water bottle",
                        "confidence": 0.9,
                        "x": 50,
                        "y": 50,
                        "width": 20,
                        "height": 40,
                    },
                    {
                        "class": "bottle",
                        "confidence": 0.8,
                        "x": 50,
                        "y": 50,
                        "width": 20,
                        "height": 40,
                    },
                    {
                        "class": "person",
                        "confidence": 0.7,
                        "x": 50,
                        "y": 50,
                        "width": 20,
                        "height": 40,
                    },
                ],
            }
        ],
        latency_ms=1,
    )

    assert [item.object_class for item in result.detections] == ["bottle", "person"]


def test_rejects_malformed_response_dimensions() -> None:
    with pytest.raises(RoboflowInferenceError, match=r"image\.width"):
        parse_yolo_world_response(
            [{"image": {"width": 0, "height": 100}, "predictions": []}],
            latency_ms=1,
        )
