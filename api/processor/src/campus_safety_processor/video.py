"""Explicitly authorized video source reader with deterministic frame sampling."""

from __future__ import annotations

import re
import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class VideoSourceError(RuntimeError):
    """Raised when an authorized video source cannot be opened or decoded."""


@dataclass(frozen=True, slots=True)
class FramePacket:
    frame: Any
    frame_index: int
    analysis_time_seconds: float


class VideoReader:
    def __init__(
        self,
        source: str,
        *,
        sample_fps: float,
        max_sampled_frames: int | None = None,
    ) -> None:
        self.source = source
        self.sample_fps = sample_fps
        self.max_sampled_frames = max_sampled_frames
        self._capture: Any | None = None
        self._cv2: Any | None = None

    def __enter__(self) -> VideoReader:
        try:
            import cv2
        except ImportError as error:  # pragma: no cover - exercised by runtime setup
            raise VideoSourceError(
                "OpenCV is missing. Install the processor with [vision]."
            ) from error
        self._cv2 = cv2
        parsed_source: str | int
        if self.source.isdigit():
            parsed_source = int(self.source)
        else:
            parsed_source = self.source
            if not _is_stream_url(self.source) and not Path(self.source).is_file():
                raise VideoSourceError("The configured video file does not exist.")
        self._capture = cv2.VideoCapture(parsed_source)
        if not self._capture.isOpened():
            self._capture.release()
            self._capture = None
            raise VideoSourceError("The configured video source could not be opened.")
        return self

    def __exit__(self, *_: object) -> None:
        if self._capture is not None:
            self._capture.release()
            self._capture = None

    def frames(self) -> Iterator[FramePacket]:
        if self._capture is None or self._cv2 is None:
            raise VideoSourceError("VideoReader must be opened before reading frames.")
        source_fps = float(self._capture.get(self._cv2.CAP_PROP_FPS))
        source_fps = source_fps if source_fps > 0 else self.sample_fps
        sample_every = max(1, round(source_fps / self.sample_fps))
        sampled = 0
        frame_index = 0
        started_at = time.monotonic()
        is_file = not self.source.isdigit() and not _is_stream_url(self.source)

        while True:
            success, frame = self._capture.read()
            if not success:
                break
            if frame_index % sample_every != 0:
                frame_index += 1
                continue
            if is_file:
                position_ms = float(self._capture.get(self._cv2.CAP_PROP_POS_MSEC))
                analysis_time = max(position_ms / 1_000, frame_index / source_fps)
            else:
                analysis_time = time.monotonic() - started_at
            yield FramePacket(frame, frame_index, analysis_time)
            sampled += 1
            frame_index += 1
            if self.max_sampled_frames is not None and sampled >= self.max_sampled_frames:
                break


def redact_video_source(source: str) -> str:
    """Return a log-safe source label without stream credentials or query strings."""

    if source.isdigit():
        return f"webcam:{source}"
    if _is_stream_url(source):
        scheme = source.split(":", 1)[0].lower()
        return f"{scheme}://[redacted]"
    return Path(source).name


def _is_stream_url(source: str) -> bool:
    return bool(re.match(r"^(?:rtsp|rtsps|http|https)://", source, flags=re.IGNORECASE))
