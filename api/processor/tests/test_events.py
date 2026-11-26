from __future__ import annotations

import uuid
from datetime import UTC, datetime

from campus_safety_processor.domain import (
    BoundingBox,
    ObjectTrackUpdate,
    PersonAssociation,
    TrackedDetection,
)
from campus_safety_processor.events import EventFactory


def factory() -> EventFactory:
    return EventFactory(
        device_id="PROCESSOR-TEST-001",
        camera_id="CAM-001",
        session_id="session-test-001",
        zone_id="ZONE-DEMO-001",
        model_version="v2-s",
        supported_classes=("person", "backpack", "mug", "parcel"),
        uuid_factory=lambda: uuid.UUID("11111111-2222-3333-4444-555555555555"),
        now=lambda: datetime(2026, 11, 10, 1, 2, 3, 456000, tzinfo=UTC),
    )


def update() -> ObjectTrackUpdate:
    return ObjectTrackUpdate(
        detection=TrackedDetection(
            tracking_id=1_000_000_001,
            object_class="parcel",
            confidence=0.81,
            bounding_box=BoundingBox(0.2, 0.3, 0.2, 0.2),
        ),
        previous_bounding_box=BoundingBox(0.19, 0.3, 0.2, 0.2),
        state="ALERTED",
        first_seen_at=0,
        stationary_since=20,
        stationary_duration_seconds=60,
        unattended_duration_seconds=45,
        association=PersonAssociation(False, 7, 0.42, None),
        is_new=False,
        state_changed=True,
        association_changed=True,
        potential_incident=True,
    )


def test_model_information_declares_the_expanded_unverified_vocabulary() -> None:
    event = factory().model_information()
    assert event["event_type"] == "model_information"
    assert event["occurred_at"] == "2026-11-10T01:02:03.456Z"
    assert event["model"]["provider"] == "roboflow"
    assert "parcel" in event["model"]["supported_classes"]
    assert "person" in event["model"]["supported_classes"]


def test_potential_incident_is_metadata_only_and_requires_human_review_downstream() -> None:
    event = factory().potential_incident(update())
    assert event["object_class"] == "parcel"
    assert event["stationary_duration_seconds"] == 60
    assert event["monitoring_zone_id"] == "ZONE-DEMO-001"
    assert event["person_association"] == {
        "associated_person_observed": False,
        "observation_window_seconds": 45,
        "nearest_person_tracking_id": 7,
        "distance_normalized": 0.42,
    }
    assert "image" not in event
    assert "video" not in event
