"""Train YOLOv8n on Kaggle and report the run to Convex.

The script installs its small set of orchestration dependencies at runtime so
it can be pushed directly as a private Kaggle script kernel. Dataset images and
weights stay in Kaggle/Roboflow; only run metrics are written to Convex.
"""

from __future__ import annotations

import importlib.util
import math
import os
import re
import subprocess
import sys
import time
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version
from pathlib import Path
from typing import Any

DATASET_VERSION = 1
EPOCHS = 50
MODEL_ARCH = "yolov8n.pt"
ROBOFLOW_MODEL_TYPE = "yolov8"
REQUIRED_ULTRALYTICS_VERSION = "8.0.196"

INSTALL_REQUIREMENTS = (
    "numpy<2",
    "ultralytics==8.0.196",
    "roboflow>=1.1.0,<2",
    "convex>=0.7.0,<1",
    "python-dotenv>=1.0,<2",
)


def _dependencies_need_installing() -> bool:
    required_modules = ("convex", "dotenv", "roboflow", "ultralytics")
    if any(importlib.util.find_spec(module) is None for module in required_modules):
        return True

    try:
        return package_version("ultralytics") != REQUIRED_ULTRALYTICS_VERSION
    except PackageNotFoundError:
        return True


def _ensure_dependencies() -> None:
    """Install Kaggle dependencies only when they are missing or incompatible."""

    if not _dependencies_need_installing():
        return

    subprocess.check_call(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            *INSTALL_REQUIREMENTS,
        ]
    )


def _kaggle_secret(key: str) -> str | None:
    try:
        from kaggle_secrets import UserSecretsClient
    except ImportError:
        return None

    try:
        value = UserSecretsClient().get_secret(key)
    except Exception:  # noqa: BLE001 - Kaggle does not expose one stable error type.
        return None

    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _environment_secret(key: str) -> str | None:
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        # _ensure_dependencies() installs python-dotenv in normal execution.
        # Keeping this fallback makes get_secret() usable in minimal test tools.
        pass

    value = os.getenv(key)
    if value and value.strip():
        return value.strip()
    return None


def get_secret(key: str) -> str:
    """Read a Kaggle secret first, then fall back to a dotenv environment."""

    value = _kaggle_secret(key) or _environment_secret(key)
    if value is None:
        raise RuntimeError(
            f"Required secret {key!r} is not configured in Kaggle or the environment."
        )
    return value


def _optional_secret(key: str) -> str | None:
    return _kaggle_secret(key) or _environment_secret(key)


def _with_training_secret(payload: dict[str, Any]) -> dict[str, Any]:
    secret = _optional_secret("KAGGLE_RUN_SECRET")
    if secret is not None:
        payload["secret"] = secret
    return payload


def _safe_directory_name(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-.")
    return normalized or "roboflow-project"


def _metric_value(results: Any, key: str, fallback_attribute: str) -> float | None:
    results_dict = getattr(results, "results_dict", None)
    value = results_dict.get(key) if isinstance(results_dict, dict) else None

    if value is None:
        box_metrics = getattr(results, "box", None)
        value = getattr(box_metrics, fallback_attribute, None)

    if hasattr(value, "item"):
        value = value.item()

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    return number if math.isfinite(number) else None


def _training_directory(results: Any) -> Path:
    save_dir = getattr(results, "save_dir", None)
    if save_dir is None:
        raise RuntimeError("Ultralytics did not report the training output directory.")

    directory = Path(save_dir).resolve()
    if not (directory / "weights" / "best.pt").is_file():
        raise RuntimeError("Training completed without a weights/best.pt checkpoint.")
    return directory


def main() -> None:
    _ensure_dependencies()

    from convex import ConvexClient
    from roboflow import Roboflow
    from ultralytics import YOLO

    roboflow_api_key = get_secret("ROBOFLOW_API_KEY")
    workspace_name = get_secret("ROBOFLOW_WORKSPACE")
    project_name = get_secret("ROBOFLOW_PROJECT")
    convex_url = get_secret("CONVEX_URL")

    client = ConvexClient(convex_url)
    run_id: str | None = None

    try:
        run_id = client.mutation(
            "runs:startRun",
            _with_training_secret(
                {
                    "project": project_name,
                    "version": DATASET_VERSION,
                    "modelArch": MODEL_ARCH,
                    "epochs": EPOCHS,
                    "startedAt": int(time.time() * 1000),
                }
            ),
        )

        roboflow = Roboflow(api_key=roboflow_api_key)
        project = roboflow.workspace(workspace_name).project(project_name)
        version = project.version(DATASET_VERSION)

        script_directory = Path(__file__).resolve().parent
        dataset_directory = (
            script_directory
            / "datasets"
            / f"{_safe_directory_name(project_name)}-v{DATASET_VERSION}"
        )
        dataset = version.download(
            ROBOFLOW_MODEL_TYPE,
            location=str(dataset_directory),
            overwrite=True,
        )
        data_yaml = Path(dataset.location) / "data.yaml"
        if not data_yaml.is_file():
            raise RuntimeError(f"Roboflow download did not create {data_yaml}.")

        model = YOLO(MODEL_ARCH)
        results = model.train(
            data=str(data_yaml),
            epochs=EPOCHS,
            project=str(script_directory / "runs"),
            name=f"yolov8n-v{DATASET_VERSION}",
            exist_ok=True,
        )

        map50 = _metric_value(results, "metrics/mAP50(B)", "map50")
        map50_95 = _metric_value(results, "metrics/mAP50-95(B)", "map")
        training_directory = _training_directory(results)

        completion: dict[str, Any] = {
            "runId": run_id,
            "completedAt": int(time.time() * 1000),
        }
        if map50 is not None:
            completion["mAP50"] = map50
        if map50_95 is not None:
            completion["mAP50_95"] = map50_95

        client.mutation(
            "runs:completeRun",
            _with_training_secret(completion),
        )

        # A deployment problem should not erase a successfully trained run.
        # Roboflow currently requires YOLOv8 uploads to use ultralytics 8.0.196.
        try:
            version.deploy(
                model_type=ROBOFLOW_MODEL_TYPE,
                model_path=str(training_directory),
                filename="weights/best.pt",
            )
        except Exception as deployment_error:  # noqa: BLE001 - SDK boundary.
            print(
                "WARNING: Training completed, but the Roboflow weights upload "
                f"failed ({type(deployment_error).__name__}).",
                file=sys.stderr,
            )
    except Exception:
        if run_id is not None:
            try:
                client.mutation(
                    "runs:failRun",
                    _with_training_secret(
                        {
                            "runId": run_id,
                            "completedAt": int(time.time() * 1000),
                        }
                    ),
                )
            except Exception as reporting_error:  # noqa: BLE001 - preserve root error.
                print(
                    "WARNING: The failed training run could not be reported to "
                    f"Convex ({type(reporting_error).__name__}).",
                    file=sys.stderr,
                )
        raise


if __name__ == "__main__":
    main()
