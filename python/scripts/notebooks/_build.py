"""Shared notebook-building helper used by all _build_NN_<topic>.py scripts.

Usage from a sibling build script (with sys.path bootstrap):

    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from _build import build_notebook

    cells = [
        ("md", "# Quickstart"),
        ("code", "import venn_diagram_lab as vdl; print(vdl.__version__)"),
    ]
    build_notebook(cells, "python/examples/01_quickstart.ipynb")

Then execute the .ipynb to populate output cells:

    jupyter nbconvert --to notebook --execute --inplace python/examples/01_quickstart.ipynb
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

import nbformat as nbf

CellType = Literal["md", "code"]


def build_notebook(
    cells: list[tuple[CellType, str]],
    output_path: Path | str,
) -> None:
    """Build a Jupyter notebook from a list of (cell_type, source) tuples.

    cell_type must be 'md' (markdown) or 'code' (python). Raises ValueError
    on any other value.
    """
    nb = nbf.v4.new_notebook()
    nb.cells = []
    for cell_type, content in cells:
        if cell_type == "md":
            nb.cells.append(nbf.v4.new_markdown_cell(content))
        elif cell_type == "code":
            nb.cells.append(nbf.v4.new_code_cell(content))
        else:
            raise ValueError(f"Unknown cell type {cell_type!r} (use 'md' or 'code')")

    nb.metadata["kernelspec"] = {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    }
    p = Path(output_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8") as f:
        nbf.write(nb, f)
