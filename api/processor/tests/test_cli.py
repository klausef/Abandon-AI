from __future__ import annotations

import logging

from campus_safety_processor.cli import main


def test_disabled_mode_exits_cleanly_without_constructing_pipeline(
    monkeypatch,
    caplog,
) -> None:
    monkeypatch.setenv("PROCESSOR_SOURCE_MODE", "disabled")
    caplog.set_level(logging.INFO)

    result = main(["--env-file", "missing.env"])

    assert result == 0
    assert "no camera, Roboflow, or Convex ingestion connection was opened" in caplog.text
