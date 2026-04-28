from __future__ import annotations

import logging
import sys
from pathlib import Path


def _setup_path() -> None:
    """
    Ensure the data/src/ directory is on sys.path so we can import our modules
    when running `python main_download.py` or `python -m main` from the project root.
    """
    project_root = Path(__file__).resolve().parent
    src_path = project_root / "data" / "src"
    if str(src_path) not in sys.path:
        sys.path.insert(0, str(src_path))


def _configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def main() -> None:
    _setup_path()
    _configure_logging()


    from download.pipeline import DATASET_NAMES, PROCESSED_ROOT, download_all  # type: ignore
    from preprocessing.converters import validate_pkls  # type: ignore

    download_all()

    # Run a light validation pass on the produced PKL files
    validate_pkls(DATASET_NAMES, processed_root=PROCESSED_ROOT)


if __name__ == "__main__":
    main()

