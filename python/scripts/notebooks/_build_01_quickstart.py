"""Build python/examples/01_quickstart.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

_INTRO = (
    "# 01 -- Quickstart\n\n"
    "First Venn analysis in ~10 cells. After this notebook you can:\n\n"
    "- Import venn-diagram-lab\n"
    "- Load a bundled sample dataset\n"
    "- Run an analysis\n"
    "- Render a Venn diagram and save it to disk\n"
)

_LOAD_MD = (
    "## Load and analyze\n\n"
    "We'll use the streaming-platforms dataset "
    "(8 sets: which streaming services carry which titles)."
)

_LOAD_CODE = (
    "ds = vdl.load_sample('dataset_mock_streaming_platforms')\n"
    "result = vdl.analyze(ds, model='auto')\n"
    "print('Model:', result.model)\n"
    "print('Set sizes:', dict(result.set_sizes))"
)

_RENDER_MD = (
    "## Render the diagram\n\n"
    "The SvgImage object renders inline thanks to its `_repr_svg_` method."
)

_SAVE_MD = (
    "## Save to disk\n\n"
    "`SvgImage.save(path)` auto-detects format from the extension "
    "(.svg / .png / .pdf)."
)

_SAVE_CODE = (
    "from pathlib import Path\n\n"
    "out = Path('/tmp/quickstart_venn.svg')\n"
    "result.render_venn().save(out)\n"
    "print(f'Wrote {out} ({out.stat().st_size} bytes)')"
)

_NEXT_STEPS = (
    "## Next steps\n\n"
    "- [`02_real_cancer_drivers.ipynb`](02_real_cancer_drivers.ipynb)"
    " -- walkthrough of a real biological dataset\n"
    "- [`05_statistics_deep_dive.ipynb`](05_statistics_deep_dive.ipynb)"
    " -- Jaccard/Dice/Hypergeometric details\n"
    "- [`07_pdf_reports.ipynb`](07_pdf_reports.ipynb)"
    " -- publication-ready multi-page PDF\n"
)

CELLS = [
    ("md", _INTRO),
    ("code", "import venn_diagram_lab as vdl\n\nprint(f'venn-diagram-lab {vdl.__version__}')"),
    ("md", "## Bundled samples\n\nFive curated datasets ship with the package:"),
    ("code", "vdl.list_samples()"),
    ("md", _LOAD_MD),
    ("code", _LOAD_CODE),
    ("md", _RENDER_MD),
    ("code", "result.render_venn()"),
    ("md", _SAVE_MD),
    ("code", _SAVE_CODE),
    ("md", _NEXT_STEPS),
]

if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent.parent / "examples" / "01_quickstart.ipynb"
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
