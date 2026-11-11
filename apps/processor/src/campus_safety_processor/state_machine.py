"""Conservative spatio-temporal unattended-object state machine."""

from __future__ import annotations

from dataclasses import dataclass

from .domain import (
    AnalysisResult,
    BoundingBox,
    ObjectTrackUpdate,
    PersonAssociation,
    TrackedDetection,
    TrackState,
)


@dataclass(frozen=True, slots=True)
class StateMachineConfig:
    stationary_seconds: float
    unattended_seconds: float
    association_distance: float
    movement_threshold: float
    warmup_seconds: float
    track_ttl_seconds: float


@dataclass(slots=True)
class _TrackMemory:
    first_seen_at: float
    last_seen_at: float
    last_box: BoundingBox
    stationary_since: float | None
    unattended_since: float | None
    eligible: bool
    alert_sent: bool
    state: TrackState
    associated_person_id: int | None
    associated_person_observed: bool


class UnattendedObjectStateMachine:
    """Classifies only temporal behavior; it never labels appearance suspicious."""

    def __init__(self, config: StateMachineConfig, *, started_at: float = 0) -> None:
        self.config = config
        self.started_at = started_at
        self._tracks: dict[int, _TrackMemory] = {}

    def update(
        self,
        *,
        now: float,
        objects: tuple[TrackedDetection, ...],
        people: tuple[TrackedDetection, ...],
    ) -> AnalysisResult:
        updates: list[ObjectTrackUpdate] = []
        observed_ids = {item.tracking_id for item in objects}

        for item in objects:
            memory = self._tracks.get(item.tracking_id)
            is_new = memory is None
            if memory is None:
                baseline = now - self.started_at <= self.config.warmup_seconds
                memory = _TrackMemory(
                    first_seen_at=now,
                    last_seen_at=now,
                    last_box=item.bounding_box,
                    stationary_since=None,
                    unattended_since=None,
                    eligible=not baseline,
                    alert_sent=False,
                    state="OBSERVED",
                    associated_person_id=None,
                    associated_person_observed=False,
                )
                self._tracks[item.tracking_id] = memory

            previous_box = None if is_new else memory.last_box
            previous_state = memory.state
            previous_association = (
                memory.associated_person_observed,
                memory.associated_person_id,
            )

            movement = (
                0.0
                if previous_box is None
                else item.bounding_box.center_distance(previous_box)
            )
            if movement > self.config.movement_threshold:
                memory.eligible = True
                memory.stationary_since = None
                memory.unattended_since = None
            elif memory.stationary_since is None:
                memory.stationary_since = now

            association = self._associate(item, people)
            memory.associated_person_observed = association.associated_person_observed
            if association.associated_person_observed:
                memory.eligible = True
                memory.associated_person_id = association.nearest_person_tracking_id
                memory.unattended_since = None
            elif (
                memory.eligible
                and memory.stationary_since is not None
                and memory.unattended_since is None
            ):
                memory.unattended_since = now

            stationary_duration = (
                max(0.0, now - memory.stationary_since)
                if memory.stationary_since is not None
                else 0.0
            )
            unattended_duration = (
                max(0.0, now - memory.unattended_since)
                if memory.unattended_since is not None
                else 0.0
            )

            qualifies = (
                memory.eligible
                and not association.associated_person_observed
                and stationary_duration >= self.config.stationary_seconds
                and unattended_duration >= self.config.unattended_seconds
            )
            potential_incident = qualifies and not memory.alert_sent
            if potential_incident:
                memory.alert_sent = True

            if memory.alert_sent:
                memory.state = "ALERTED"
            elif qualifies:
                memory.state = "POTENTIAL_UNATTENDED"
            elif memory.stationary_since is not None:
                memory.state = "MONITORING"
            else:
                memory.state = "OBSERVED"

            memory.last_seen_at = now
            memory.last_box = item.bounding_box
            association_changed = previous_association != (
                memory.associated_person_observed,
                memory.associated_person_id,
            )
            updates.append(
                ObjectTrackUpdate(
                    detection=item,
                    previous_bounding_box=previous_box,
                    state=memory.state,
                    first_seen_at=memory.first_seen_at,
                    stationary_since=memory.stationary_since,
                    stationary_duration_seconds=stationary_duration,
                    unattended_duration_seconds=unattended_duration,
                    association=association,
                    is_new=is_new,
                    state_changed=memory.state != previous_state,
                    association_changed=association_changed,
                    potential_incident=potential_incident,
                )
            )

        removed: list[int] = []
        for tracking_id, memory in tuple(self._tracks.items()):
            is_stale = now - memory.last_seen_at > self.config.track_ttl_seconds
            if tracking_id not in observed_ids and is_stale:
                removed.append(tracking_id)
                del self._tracks[tracking_id]

        return AnalysisResult(tuple(updates), tuple(removed))

    def _associate(
        self,
        item: TrackedDetection,
        people: tuple[TrackedDetection, ...],
    ) -> PersonAssociation:
        if not people:
            return PersonAssociation(False, None, None, None)

        nearest = min(
            people,
            key=lambda person: item.bounding_box.center_distance(person.bounding_box),
        )
        distance = item.bounding_box.center_distance(nearest.bounding_box)
        is_near = distance <= self.config.association_distance
        confidence = (
            max(0.0, min(1.0, 1 - distance / self.config.association_distance))
            if is_near
            else None
        )
        return PersonAssociation(
            associated_person_observed=is_near,
            nearest_person_tracking_id=nearest.tracking_id,
            distance_normalized=distance,
            confidence=confidence,
        )
