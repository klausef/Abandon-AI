from __future__ import annotations

from campus_safety_processor.domain import BoundingBox, TrackedDetection
from campus_safety_processor.state_machine import (
    StateMachineConfig,
    UnattendedObjectStateMachine,
)


def item(
    tracking_id: int = 1_000_000_001,
    *,
    x: float = 0.4,
    object_class: str = "box",
) -> TrackedDetection:
    return TrackedDetection(
        tracking_id=tracking_id,
        object_class=object_class,  # type: ignore[arg-type]
        confidence=0.8,
        bounding_box=BoundingBox(x, 0.5, 0.1, 0.1),
    )


def person(x: float = 0.42) -> TrackedDetection:
    return TrackedDetection(
        tracking_id=7,
        object_class="person",
        confidence=0.9,
        bounding_box=BoundingBox(x, 0.4, 0.15, 0.5),
    )


def engine(*, warmup: float = 10) -> UnattendedObjectStateMachine:
    return UnattendedObjectStateMachine(
        StateMachineConfig(
            stationary_seconds=20,
            unattended_seconds=40,
            association_distance=0.2,
            movement_threshold=0.02,
            warmup_seconds=warmup,
            track_ttl_seconds=10,
        ),
        started_at=0,
    )


def test_new_stationary_object_alerts_only_after_both_time_thresholds() -> None:
    state = engine()
    first = state.update(now=20, objects=(item(),), people=())
    assert first.object_updates[0].is_new
    assert not first.object_updates[0].potential_incident

    middle = state.update(now=50, objects=(item(),), people=())
    assert middle.object_updates[0].stationary_duration_seconds == 30
    assert not middle.object_updates[0].potential_incident

    alert = state.update(now=60, objects=(item(),), people=())
    assert alert.object_updates[0].potential_incident
    assert alert.object_updates[0].state == "ALERTED"

    repeat = state.update(now=70, objects=(item(),), people=())
    assert not repeat.object_updates[0].potential_incident


def test_preexisting_background_object_does_not_alert_until_it_moves() -> None:
    state = engine(warmup=10)
    state.update(now=0, objects=(item(),), people=())
    background = state.update(now=100, objects=(item(),), people=())
    assert not background.object_updates[0].potential_incident

    state.update(now=101, objects=(item(x=0.5),), people=())
    state.update(now=102, objects=(item(x=0.5),), people=())
    alert = state.update(now=142, objects=(item(x=0.5),), people=())
    assert alert.object_updates[0].potential_incident


def test_nearby_person_resets_the_unattended_timer() -> None:
    state = engine(warmup=0)
    state.update(now=1, objects=(item(),), people=(person(),))
    near = state.update(now=50, objects=(item(),), people=(person(),))
    assert near.object_updates[0].association.associated_person_observed
    assert not near.object_updates[0].potential_incident

    separated = state.update(now=51, objects=(item(),), people=())
    assert separated.object_updates[0].association_changed
    assert not separated.object_updates[0].potential_incident

    alert = state.update(now=91, objects=(item(),), people=())
    assert alert.object_updates[0].potential_incident


def test_stale_tracks_are_removed() -> None:
    state = engine(warmup=0)
    state.update(now=1, objects=(item(),), people=())
    result = state.update(now=12, objects=(), people=())
    assert result.removed_track_ids == (1_000_000_001,)
