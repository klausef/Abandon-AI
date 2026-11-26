from __future__ import annotations

import pytest

from campus_safety_processor.video import (
    VideoSourceError,
    build_ffmpeg_capture_options,
    redact_video_source,
)


def test_build_ffmpeg_capture_options_selects_transport() -> None:
    assert build_ffmpeg_capture_options("tcp") == "rtsp_transport;tcp"
    assert build_ffmpeg_capture_options(" UDP ") == "rtsp_transport;udp"


def test_build_ffmpeg_capture_options_rejects_unknown_transport() -> None:
    with pytest.raises(VideoSourceError, match="tcp or udp"):
        build_ffmpeg_capture_options("quic")


def test_redact_video_source_hides_credentials_and_address() -> None:
    redacted = redact_video_source(
        "rtsp://operator:super-secret@192.168.1.50:554/stream1?token=abc"
    )

    assert redacted == "rtsp://[redacted]"
    assert "super-secret" not in redacted
    assert "192.168.1.50" not in redacted
    assert "token" not in redacted
