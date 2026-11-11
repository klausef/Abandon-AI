"""End-to-end Roboflow-to-Convex processing pipeline."""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any

from . import __version__
from .classes import normalize_model_class
from .config import ProcessorSettings
from .convex_client import ConvexIngestionClient
from .domain import ObjectTrackUpdate, TrackedDetection
from .events import EventFactory
from .geometry import filter_objects_to_polygon
from .roboflow import RoboflowYoloWorldDetector
from .state_machine import StateMachineConfig, UnattendedObjectStateMachine
from .tracking import MultiObjectTracker
from .video import VideoReader, redact_video_source

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class PipelineSummary:
    sampled_frames: int
    emitted_events: int
    potential_incidents: int


class ProcessorPipeline:
    def __init__(
        self,
        settings: ProcessorSettings,
        *,
        ingestion: ConvexIngestionClient | None = None,
        detector: RoboflowYoloWorldDetector | None = None,
        tracker: MultiObjectTracker | None = None,
    ) -> None:
        self.settings = settings
        self._ingestion = ingestion or ConvexIngestionClient(
            site_url=settings.convex_site_url,
            device_id=settings.processor_device_id,
            shared_secret=settings.processor_shared_secret,
            timeout_seconds=settings.request_timeout_seconds,
            retries=settings.request_retries,
        )
        self._owns_ingestion = ingestion is None
        self._detector = detector or RoboflowYoloWorldDetector(
            api_url=settings.roboflow_api_url,
            api_key=settings.roboflow_api_key,
            class_prompts=settings.roboflow_class_prompts,
            model_version=settings.roboflow_model_version,
            confidence=settings.detection_confidence,
        )
        self._tracker = tracker or MultiObjectTracker(
            frame_rate=settings.sample_fps,
            object_id_offset=settings.object_tracking_id_offset,
        )

    def run(self) -> PipelineSummary:
        session_id = f"session-{uuid.uuid4().hex}"
        factory = EventFactory(
            device_id=self.settings.processor_device_id,
            camera_id=self.settings.camera_id,
            session_id=session_id,
            zone_id=self.settings.monitoring_zone_id,
            model_version=self.settings.roboflow_model_version,
            supported_classes=tuple(
                dict.fromkeys(
                    object_class
                    for prompt in self.settings.roboflow_class_prompts
                    if (object_class := normalize_model_class(prompt)) is not None
                )
            ),
        )
        state_machine = UnattendedObjectStateMachine(
            StateMachineConfig(
                stationary_seconds=self.settings.stationary_seconds,
                unattended_seconds=self.settings.unattended_seconds,
                association_distance=self.settings.association_distance,
                movement_threshold=self.settings.movement_threshold,
                warmup_seconds=self.settings.warmup_seconds,
                track_ttl_seconds=self.settings.track_ttl_seconds,
            ),
            started_at=0,
        )
        seen_person_ids: set[int] = set()
        last_summary_at: dict[int, float] = {}
        sampled_frames = 0
        emitted_events = 0
        potential_incidents = 0
        last_heartbeat_at = -self.settings.heartbeat_interval_seconds
        last_latency: float | None = None
        wall_started_at = time.monotonic()

        logger.info(
            "Starting processor session %s for camera %s from %s.",
            session_id,
            self.settings.camera_id,
            redact_video_source(self.settings.video_source),
        )

        try:
            self._ingestion.check_health()
            emitted_events += self._send(factory.model_information())
            emitted_events += self._send(factory.processing_status("processing"))

            with VideoReader(
                self.settings.video_source,
                sample_fps=self.settings.sample_fps,
                max_sampled_frames=self.settings.max_sampled_frames,
            ) as reader:
                for packet in reader.frames():
                    batch = filter_objects_to_polygon(
                        self._detector.detect(packet.frame),
                        self.settings.monitoring_zone_polygon,
                    )
                    people, objects = self._tracker.update(batch)
                    analysis = state_machine.update(
                        now=packet.analysis_time_seconds,
                        objects=objects,
                        people=people,
                    )
                    sampled_frames += 1
                    last_latency = batch.inference_latency_ms

                    for person in people:
                        if person.tracking_id not in seen_person_ids:
                            emitted_events += self._send(
                                factory.detection(person, "tracking")
                            )
                            seen_person_ids.add(person.tracking_id)

                    for update in analysis.object_updates:
                        emitted, incident = self._emit_object_events(
                            factory,
                            update,
                            packet.analysis_time_seconds,
                            last_summary_at,
                        )
                        emitted_events += emitted
                        potential_incidents += incident

                    if (
                        packet.analysis_time_seconds - last_heartbeat_at
                        >= self.settings.heartbeat_interval_seconds
                    ):
                        elapsed = max(time.monotonic() - wall_started_at, 0.001)
                        emitted_events += self._send(
                            factory.heartbeat(
                                status="processing",
                                processor_version=__version__,
                                fps=sampled_frames / elapsed,
                                inference_latency_ms=last_latency,
                            )
                        )
                        last_heartbeat_at = packet.analysis_time_seconds

                    if self.settings.display_preview:
                        _show_preview(packet.frame, people, objects)

            emitted_events += self._send(factory.processing_status("idle"))
            logger.info(
                "Processor session completed: %d sampled frames, %d events, "
                "%d potential incidents.",
                sampled_frames,
                emitted_events,
                potential_incidents,
            )
            return PipelineSummary(sampled_frames, emitted_events, potential_incidents)
        except KeyboardInterrupt:
            logger.info("Processor session interrupted by the operator.")
            self._best_effort_status(factory, "paused", "Stopped by operator.")
            return PipelineSummary(sampled_frames, emitted_events, potential_incidents)
        except Exception:
            self._best_effort_status(factory, "error", "Processor stopped after an error.")
            raise
        finally:
            if self._owns_ingestion:
                self._ingestion.close()
            if self.settings.display_preview:
                _close_preview()

    def _emit_object_events(
        self,
        factory: EventFactory,
        update: ObjectTrackUpdate,
        analysis_time: float,
        last_summary_at: dict[int, float],
    ) -> tuple[int, int]:
        emitted = 0
        incidents = 0
        tracking_id = update.detection.tracking_id
        if update.is_new:
            emitted += self._send(factory.detection(update.detection, "detected"))

        summary_due = (
            update.is_new
            or update.state_changed
            or analysis_time - last_summary_at.get(tracking_id, float("-inf"))
            >= self.settings.summary_interval_seconds
        )
        if summary_due:
            emitted += self._send(factory.track_summary(update))
            last_summary_at[tracking_id] = analysis_time

        if update.is_new or update.association_changed:
            emitted += self._send(factory.person_association(update))

        if update.potential_incident:
            emitted += self._send(factory.potential_incident(update))
            incidents += 1
        return emitted, incidents

    def _send(self, event: dict[str, Any]) -> int:
        self._ingestion.send_event(event)
        return 1

    def _best_effort_status(
        self,
        factory: EventFactory,
        status: str,
        message: str,
    ) -> None:
        try:
            self._ingestion.send_event(factory.processing_status(status, message))
        except Exception:
            logger.warning("Unable to report final processor status to Convex.")


def _show_preview(
    frame: Any,
    people: tuple[TrackedDetection, ...],
    objects: tuple[TrackedDetection, ...],
) -> None:
    try:
        import cv2
    except ImportError:
        return
    preview = frame.copy()
    height, width = preview.shape[:2]
    for detection in (*people, *objects):
        box = detection.bounding_box
        left = round(box.x * width)
        top = round(box.y * height)
        right = round((box.x + box.width) * width)
        bottom = round((box.y + box.height) * height)
        color = (255, 220, 0) if detection.object_class == "person" else (0, 180, 255)
        cv2.rectangle(preview, (left, top), (right, bottom), color, 2)
        cv2.putText(
            preview,
            f"{detection.object_class} #{detection.tracking_id}",
            (left, max(20, top - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            color,
            1,
            cv2.LINE_AA,
        )
    cv2.imshow("Campus Safety Processor", preview)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        raise KeyboardInterrupt


def _close_preview() -> None:
    try:
        import cv2
    except ImportError:
        return
    cv2.destroyAllWindows()
