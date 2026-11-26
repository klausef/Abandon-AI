from __future__ import annotations

import logging

import pytest

from campus_safety_processor.cli import main
from campus_safety_processor.config import ProcessorSettings
from campus_safety_processor.doctor import CheckResult


def test_disabled_mode_exits_cleanly_without_constructing_pipeline(
    monkeypatch,
    caplog,
) -> None:
    monkeypatch.setenv("PROCESSOR_SOURCE_MODE", "disabled")
    caplog.set_level(logging.INFO)

    result = main(["--env-file", "missing.env"])

    assert result == 0
    assert "no camera, Roboflow, or Convex ingestion connection was opened" in caplog.text


def test_doctor_requires_a_configured_source(monkeypatch, caplog) -> None:
    monkeypatch.setenv("PROCESSOR_SOURCE_MODE", "disabled")
    caplog.set_level(logging.ERROR)

    result = main(["--doctor", "--env-file", "missing.env"])

    assert result == 2
    assert "Doctor requires a configured source" in caplog.text


def test_check_roboflow_requires_doctor() -> None:
    with pytest.raises(SystemExit) as error:
        main(["--check-roboflow", "--env-file", "missing.env"])

    assert error.value.code == 2


def test_doctor_prints_each_result_and_fails_when_a_check_fails(
    monkeypatch,
    capsys,
) -> None:
    monkeypatch.setenv("PROCESSOR_SOURCE_MODE", "video")
    monkeypatch.setattr(
        ProcessorSettings,
        "from_env",
        classmethod(lambda cls: object()),
    )
    monkeypatch.setattr(
        "campus_safety_processor.cli.run_preflight",
        lambda settings, check_roboflow: [
            CheckResult("convex", True, "ready"),
            CheckResult("camera", False, "could not open stream"),
            CheckResult("roboflow", False, "skipped"),
        ],
    )

    result = main(
        ["--doctor", "--check-roboflow", "--env-file", "missing.env"]
    )
    output = capsys.readouterr().out

    assert result == 1
    assert "[PASS] convex: ready" in output
    assert "[FAIL] camera: could not open stream" in output
    assert "[FAIL] roboflow: skipped" in output
