"""Construction of strictly validated Convex ingestion payloads."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from .domain import (
    DetectionStatus,
    ObjectTrackUpdate,
    PersonAssociation,
    TrackedDetection,
)


def utc_iso(value: datetime | None = None) -> str:
    timestamp = value or datetime.now(UTC)
    return timestamp.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class EventFactory:
    """Creates immutable logical events with stable retry identifiers."""

    def __init__(
        self,
        *,
        device_id: str,
        camera_id: str,
        session_id: str,
        zone_id: str | None,
        model_version: str,
        supported_classes: tuple[str, ...],
        uuid_factory: Callable[[], uuid.UUID] = uuid.uuid4,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        self.device_id = device_id
        self.camera_id = camera_id
        self.session_id = session_id
        self.zone_id = zone_id
        self.model_version = model_version
        self.supported_classes = supported_classes
        self._uuid_factory = uuid_factory
        self._now = now or (lambda: datetime.now(UTC))

    @property
    def model(self) -> dict[str, Any]:
        return {
            "provider": "roboflow",
            "name": "yolo-world",
            "version": self.model_version,
            "model_type": "pretrained",
            "supported_classes": list(self.supported_classes),
        }

    def _base(self, event_type: str) -> dict[str, Any]:
        event_identifier = self._uuid_factory().hex
        return {
            "schema_version": "1.0",
            "event_id": f"evt-{event_identifier}",
            "event_type": event_type,
            "idempotency_key": f"idem-{event_identifier}",
            "processor_device_id": self.device_id,
            "occurred_at": utc_iso(self._now()),
        }

    def model_information(self) -> dict[str, Any]:
        return {
            **self._base("model_information"),
            "camera_id": self.camera_id,
            "model": self.model,
        }

    def processing_status(self, status: str, message: str | None = None) -> dict[str, Any]:
        event = {
            **self._base("camera_processing_status"),
            "camera_id": self.camera_id,
            "status": status,
            "processing_session_id": self.session_id,
        }
        if message:
            event["message"] = message[:500]
        return event

    def heartbeat(
        self,
        *,
        status: str,
        processor_version: str,
        fps: float,
        inference_latency_ms: float | None,
    ) -> dict[str, Any]:
        metrics: dict[str, float | int] = {"fps": max(fps, 0), "queue_depth": 0}
        if inference_latency_ms is not None:
            metrics["inference_latency_ms"] = max(inference_latency_ms, 0)
        return {
            **self._base("processor_heartbeat"),
            "status": status,
            "processor_version": processor_version,
            "camera_id": self.camera_id,
            "processing_session_id": self.session_id,
            "metrics": metrics,
        }

    def detection(
        self,
        detection: TrackedDetection,
        status: DetectionStatus,
    ) -> dict[str, Any]:
        event = {
            **self._base("detection"),
            "camera_id": self.camera_id,
            "processing_session_id": self.session_id,
            "tracking_id": detection.tracking_id,
            "object_class": detection.object_class,
            "confidence": detection.confidence,
            "bounding_box": detection.bounding_box.to_payload(),
            "status": status,
            "model": self.model,
        }
        if self.zone_id:
            event["monitoring_zone_id"] = self.zone_id
        return event

    def track_summary(self, update: ObjectTrackUpdate) -> dict[str, Any]:
        event = {
            **self._base("track_summary"),
            "camera_id": self.camera_id,
            "processing_session_id": self.session_id,
            "tracking_id": update.detection.tracking_id,
            "object_class": update.detection.object_class,
            "confidence": update.detection.confidence,
            "bounding_box": update.detection.bounding_box.to_payload(),
            "stationary_duration_seconds": update.stationary_duration_seconds,
            "state": update.state,
            "model": self.model,
        }
        if update.previous_bounding_box:
            event["previous_bounding_box"] = update.previous_bounding_box.to_payload()
        if self.zone_id:
            event["monitoring_zone_id"] = self.zone_id
        return event

    def person_association(self, update: ObjectTrackUpdate) -> dict[str, Any]:
        association = update.association
        event = {
            **self._base("person_association"),
            "camera_id": self.camera_id,
            "processing_session_id": self.session_id,
            "tracking_id": update.detection.tracking_id,
            "object_class": update.detection.object_class,
            "associated_person_observed": association.associated_person_observed,
            "observation_window_seconds": max(update.unattended_duration_seconds, 0),
        }
        _add_association_fields(event, association)
        return event

    def potential_incident(self, update: ObjectTrackUpdate) -> dict[str, Any]:
        association: dict[str, Any] = {
            "associated_person_observed": update.association.associated_person_observed,
            "observation_window_seconds": max(update.unattended_duration_seconds, 0),
        }
        _add_association_fields(association, update.association)
        event = {
            **self._base("potential_unattended_object"),
            "camera_id": self.camera_id,
            "processing_session_id": self.session_id,
            "tracking_id": update.detection.tracking_id,
            "object_class": update.detection.object_class,
            "confidence": update.detection.confidence,
            "stationary_duration_seconds": update.stationary_duration_seconds,
            "bounding_box": update.detection.bounding_box.to_payload(),
            "person_association": association,
            "model": self.model,
        }
        if self.zone_id:
            event["monitoring_zone_id"] = self.zone_id
        return event


def _add_association_fields(target: dict[str, Any], association: PersonAssociation) -> None:
    if association.confidence is not None:
        target["association_confidence"] = association.confidence
    if association.nearest_person_tracking_id is not None:
        target["nearest_person_tracking_id"] = association.nearest_person_tracking_id
    if association.distance_normalized is not None:
        target["distance_normalized"] = association.distance_normalized
