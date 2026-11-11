"""Command-line entry point for the processor."""

from __future__ import annotations

import argparse
import logging
import sys

from dotenv import load_dotenv

from .config import ConfigurationError, ProcessorSettings, processor_source_mode
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
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    load_dotenv(args.env_file, override=False)
    try:
        if processor_source_mode() == "disabled":
            logging.getLogger(__name__).info(
                "Processor source mode is disabled. Dashboard mock preview remains active; "
                "no camera, Roboflow, or Convex ingestion connection was opened."
            )
            return 0
        settings = ProcessorSettings.from_env()
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
