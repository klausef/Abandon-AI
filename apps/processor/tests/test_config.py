from __future__ import annotations

import pytest

from campus_safety_processor.config import (
    ConfigurationError,
    ProcessorSettings,
    processor_source_mode,
)


def valid_environment() -> dict[str, str]:
    return {
        "CONVEX_SITE_URL": "https://example.convex.site",
        "PROCESSOR_SOURCE_MODE": "video",
        "PROCESSOR_DEVICE_ID": "PROCESSOR-TEST-001",
        "PROCESSOR_SHARED_SECRET": "processor-test-secret-0123456789abcdef",
        "CAMERA_ID": "CAM-001",
        "MONITORING_ZONE_ID": "ZONE-DEMO-001",
        "MONITORING_ZONE_POLYGON": "0.1:0.1;0.9:0.1;0.9:0.9;0.1:0.9",
        "VIDEO_SOURCE": "authorized.mp4",
        "VIDEO_SOURCE_AUTHORIZED": "true",
        "ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED": "true",
        "ROBOFLOW_API_KEY": "test-only-key",
        "MAX_SAMPLED_FRAMES": "10",
    }


def test_loads_a_fail_closed_configuration() -> None:
    settings = ProcessorSettings.from_env(valid_environment())

    assert settings.camera_id == "CAM-001"
    assert settings.source_mode == "video"
    assert settings.roboflow_model_version == "v2-s"
    assert settings.monitoring_zone_polygon == (
        (0.1, 0.1),
        (0.9, 0.1),
        (0.9, 0.9),
        (0.1, 0.9),
    )
    assert "coffee mug" in settings.roboflow_class_prompts
    assert settings.max_sampled_frames == 10


@pytest.mark.parametrize(
    "missing_name",
    [
        "CONVEX_SITE_URL",
        "PROCESSOR_DEVICE_ID",
        "PROCESSOR_SHARED_SECRET",
        "CAMERA_ID",
        "VIDEO_SOURCE",
        "ROBOFLOW_API_KEY",
    ],
)
def test_rejects_missing_required_values(missing_name: str) -> None:
    environment = valid_environment()
    del environment[missing_name]

    with pytest.raises(ConfigurationError, match=missing_name):
        ProcessorSettings.from_env(environment)


def test_requires_explicit_video_and_cloud_upload_authorization() -> None:
    environment = valid_environment()
    environment["VIDEO_SOURCE_AUTHORIZED"] = "false"
    with pytest.raises(ConfigurationError, match="VIDEO_SOURCE_AUTHORIZED"):
        ProcessorSettings.from_env(environment)

    environment = valid_environment()
    environment["ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED"] = "false"
    with pytest.raises(ConfigurationError, match="ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED"):
        ProcessorSettings.from_env(environment)


def test_rejects_short_processor_secrets_and_insecure_remote_urls() -> None:
    environment = valid_environment()
    environment["PROCESSOR_SHARED_SECRET"] = "too-short"
    with pytest.raises(ConfigurationError, match="at least 32"):
        ProcessorSettings.from_env(environment)

    environment = valid_environment()
    environment["CONVEX_SITE_URL"] = "http://remote.example.com"
    with pytest.raises(ConfigurationError, match="HTTPS"):
        ProcessorSettings.from_env(environment)


def test_rejects_subjective_or_unknown_detection_prompts() -> None:
    environment = valid_environment()
    environment["ROBOFLOW_CLASS_PROMPTS"] = "person,suspicious-looking object"

    with pytest.raises(ConfigurationError, match="unsupported labels"):
        ProcessorSettings.from_env(environment)


def test_requires_people_for_unattended_object_association() -> None:
    environment = valid_environment()
    environment["ROBOFLOW_CLASS_PROMPTS"] = "backpack,parcel"

    with pytest.raises(ConfigurationError, match="include person"):
        ProcessorSettings.from_env(environment)


def test_requires_a_valid_polygon_for_a_named_zone() -> None:
    environment = valid_environment()
    del environment["MONITORING_ZONE_POLYGON"]
    with pytest.raises(ConfigurationError, match="MONITORING_ZONE_POLYGON is required"):
        ProcessorSettings.from_env(environment)

    environment = valid_environment()
    environment["MONITORING_ZONE_POLYGON"] = "0.1:0.1;2:0.2;0.3:0.3"
    with pytest.raises(ConfigurationError, match="normalized"):
        ProcessorSettings.from_env(environment)

    environment = valid_environment()
    environment["MONITORING_ZONE_POLYGON"] = "0.1:0.1;0.2:0.2;0.3:0.3"
    with pytest.raises(ConfigurationError, match="non-zero area"):
        ProcessorSettings.from_env(environment)


def test_requires_explicit_acknowledgement_for_unbounded_cloud_processing() -> None:
    environment = valid_environment()
    environment["MAX_SAMPLED_FRAMES"] = "0"
    with pytest.raises(ConfigurationError, match="CONTINUOUS_PROCESSING_ACKNOWLEDGED"):
        ProcessorSettings.from_env(environment)

    environment["CONTINUOUS_PROCESSING_ACKNOWLEDGED"] = "true"
    assert ProcessorSettings.from_env(environment).max_sampled_frames is None


def test_disabled_mode_needs_no_camera_or_service_credentials() -> None:
    assert processor_source_mode({}) == "disabled"
    assert processor_source_mode({"PROCESSOR_SOURCE_MODE": "disabled"}) == "disabled"
    with pytest.raises(ConfigurationError, match="source mode is disabled"):
        ProcessorSettings.from_env({"PROCESSOR_SOURCE_MODE": "disabled"})


def test_tapo_mode_requires_an_rtsp_source() -> None:
    environment = valid_environment()
    environment["PROCESSOR_SOURCE_MODE"] = "tapo_rtsp"
    with pytest.raises(ConfigurationError, match="must be an RTSP URL"):
        ProcessorSettings.from_env(environment)

    environment["VIDEO_SOURCE"] = "rtsp://camera-account@192.168.1.20:554/stream1"
    assert ProcessorSettings.from_env(environment).source_mode == "tapo_rtsp"


def test_rejects_unknown_source_modes() -> None:
    with pytest.raises(ConfigurationError, match="PROCESSOR_SOURCE_MODE"):
        processor_source_mode({"PROCESSOR_SOURCE_MODE": "mock-camera"})
