"""Execute every notebook in python/examples/ and verify clean execution."""

from __future__ import annotations

from pathlib import Path

import nbformat
import pytest
from nbconvert.preprocessors import ExecutePreprocessor

_EXAMPLES_DIR = Path(__file__).resolve().parent.parent / "examples"


def _discover_notebooks() -> list[Path]:
    """Return all .ipynb files in python/examples/, sorted by name."""
    if not _EXAMPLES_DIR.is_dir():
        return []
    return sorted(_EXAMPLES_DIR.glob("*.ipynb"))


@pytest.mark.slow
@pytest.mark.parametrize("notebook_path", _discover_notebooks(), ids=lambda p: p.name)
def test_notebook_executes_cleanly(notebook_path: Path) -> None:
    """Re-execute a notebook end-to-end via nbconvert; fail on any cell error."""
    with notebook_path.open("r", encoding="utf-8") as f:
        nb = nbformat.read(f, as_version=4)
    ep = ExecutePreprocessor(timeout=300, kernel_name="python3")
    ep.preprocess(nb, {"metadata": {"path": str(notebook_path.parent)}})
