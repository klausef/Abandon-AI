"""Command-line entry point for the processor."""

from __future__ import annotations

import argparse
import logging
import sys

from dotenv import load_dotenv

from .config import ConfigurationError, ProcessorSettings, processor_source_mode
from .doctor import run_preflight
from .pipeline import ProcessorPipeline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run authorized video through Roboflow and ingest metadata into Convex."
    )
    parser.add_argument(
        "--env-file",
        default=".env",
        help="Environment file to load (default: .env). Existing environment values win.",
    )
    parser.add_argument(
        "--log-level",
        choices=("DEBUG", "INFO", "WARNING", "ERROR"),
        default="INFO",
    )
    parser.add_argument(
        "--doctor",
        action="store_true",
        help=(
            "Validate configuration, Convex health, and the camera stream without "
            "ingesting events."
        ),
    )
    parser.add_argument(
        "--check-roboflow",
        action="store_true",
        help=(
            "With --doctor, send one frame to Roboflow to validate the API key. "
            "This consumes one hosted inference."
        ),
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.check_roboflow and not args.doctor:
        parser.error("--check-roboflow requires --doctor")
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    load_dotenv(args.env_file, override=False)
    try:
        if processor_source_mode() == "disabled":
            if args.doctor:
                logging.getLogger(__name__).error(
                    "Doctor requires a configured source. Set PROCESSOR_SOURCE_MODE "
                    "and VIDEO_SOURCE in the processor .env first."
                )
                return 2
            logging.getLogger(__name__).info(
                "Processor source mode is disabled. Dashboard mock preview remains active; "
                "no camera, Roboflow, or Convex ingestion connection was opened."
            )
            return 0
        settings = ProcessorSettings.from_env()
        if args.doctor:
            results = run_preflight(
                settings,
                check_roboflow=args.check_roboflow,
            )
            for result in results:
                status = "PASS" if result.ok else "FAIL"
                print(f"[{status}] {result.name}: {result.detail}")
            return 0 if all(result.ok for result in results) else 1
        ProcessorPipeline(settings).run()
    except ConfigurationError as error:
        logging.getLogger(__name__).error("Configuration error: %s", error)
        return 2
    except Exception as error:
        logging.getLogger(__name__).error("Processor failed: %s", error)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
