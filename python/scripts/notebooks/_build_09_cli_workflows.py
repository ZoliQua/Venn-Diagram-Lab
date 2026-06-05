"""Build python/examples/09_cli_workflows.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

# ---------------------------------------------------------------------------
# Cell content constants
# ---------------------------------------------------------------------------

_INTRO = (
    "# 09 -- CLI Workflows from Python: `vdl` via `subprocess`\n\n"
    "The `vdl` command-line interface is the most reproducible way to drive\n"
    "venn-diagram-lab in a pipeline -- inputs and outputs are files, so every\n"
    "step is hashable and cacheable. But many users prefer Python notebooks for\n"
    "exploration and orchestration. This notebook bridges the gap: every demo\n"
    "shells out to `vdl` via `subprocess`, parses the result back into Python,\n"
    "and treats the CLI as a building block for richer scripts.\n\n"
    "**Audience:** pipeline users who script with Python but want to use the CLI\n"
    "for reproducible batch runs (CI, Snakemake, Nextflow, ad-hoc parallelisation).\n\n"
    "**What you will learn:**\n\n"
    "- How to discover the CLI surface (`vdl tree`, `vdl <sub> --help`)\n"
    "- How to capture and parse `vdl` stdout (TSV, JSON)\n"
    "- How to drive a multi-output run from a YAML config\n"
    "- How to bundle results into a ZIP for sharing\n"
    "- When the CLI is the right tool vs the Python API\n"
)

_SETUP_CODE = (
    "import json\n"
    "import subprocess\n"
    "import sys\n"
    "from pathlib import Path\n\n"
    "# Derive the `vdl` executable from the active Python interpreter's bin dir\n"
    "# so the notebook works regardless of whether `vdl` is on PATH.\n"
    "VDL = str(Path(sys.executable).parent / 'vdl')\n"
    "print('Using vdl:', VDL)"
)

_TREE_MD = (
    "## 1. Discover the full CLI surface with `vdl tree`\n\n"
    "`vdl tree` prints every subcommand grouped by subapp. Use it as a\n"
    "self-documenting map -- no man pages required.\n"
)

_TREE_CODE = (
    "r = subprocess.run([VDL, 'tree'], capture_output=True, text=True, check=True)\n"
    "print(r.stdout)"
)

_HELP_MD = (
    "## 2. Drill into a subapp with `--help`\n\n"
    "Every command and subapp supports `--help`. Two of the most useful\n"
    "subapps are `render` (visual outputs) and `data` (input hygiene).\n"
)

_HELP_RENDER_CODE = (
    "r = subprocess.run([VDL, 'render', '--help'], capture_output=True, text=True, check=True)\n"
    "print(r.stdout)"
)

_HELP_DATA_CODE = (
    "r = subprocess.run([VDL, 'data', '--help'], capture_output=True, text=True, check=True)\n"
    "print(r.stdout)"
)

_DEMO1_MD = (
    "## 3. Demo 1: render a Venn SVG and display it inline\n\n"
    "`vdl render venn --sample --out /tmp/v.svg` writes an SVG file. From the\n"
    "notebook we then read it back and let IPython display it inline.\n"
)

_DEMO1_CODE = (
    "from IPython.display import SVG, display\n\n"
    "out_svg = Path('/tmp/v.svg')\n"
    "subprocess.run(\n"
    "    [VDL, 'render', 'venn', '--sample', '--out', str(out_svg)],\n"
    "    check=True,\n"
    ")\n"
    "print(f'Wrote {out_svg} ({out_svg.stat().st_size:,} bytes)')\n"
    "display(SVG(filename=str(out_svg)))"
)

_DEMO2_MD = (
    "## 4. Demo 2: capture statistics TSV from stdout into pandas\n\n"
    "Most `vdl export` commands accept `--out -` to stream the TSV to stdout.\n"
    "Combined with `io.StringIO`, you can pipe straight into pandas without\n"
    "ever touching the filesystem.\n"
)

_DEMO2_CODE = (
    "import io\n"
    "import pandas as pd\n\n"
    "r = subprocess.run(\n"
    "    [VDL, 'export', 'statistics', '--sample', '--out', '-'],\n"
    "    capture_output=True, text=True, check=True,\n"
    ")\n"
    "df = pd.read_csv(io.StringIO(r.stdout), sep='\\t')\n"
    "print(f'Columns: {list(df.columns)}')\n"
    "print(f'Rows: {len(df)}')\n"
    "df.head()"
)

_DEMO3_MD = (
    "## 5. Demo 3: parse `vdl data validate` JSON output\n\n"
    "`vdl data validate` emits a structured JSON report by default --\n"
    "perfect for programmatic checking in a pipeline.\n"
)

_DEMO3_CODE = (
    "r = subprocess.run(\n"
    "    [VDL, 'data', 'validate', '--sample'],\n"
    "    capture_output=True, text=True, check=True,\n"
    ")\n"
    "report = json.loads(r.stdout)\n"
    "print('Top-level keys:', list(report.keys()))\n"
    "print('Sets         :', report['sets'])\n"
    "print('Item count   :', report['item_count'])\n"
    "print('Errors       :', report['errors'])\n"
    "print('Exit code    :', report['exit_code'])"
)

_DEMO4_MD = (
    "## 6. Demo 4: run a YAML workflow with `vdl workflow run-from`\n\n"
    "Write a small `analysis.yaml`, then point `vdl workflow run-from` at it.\n"
    "Each output is dispatched to the appropriate renderer / exporter, and the\n"
    "final directory contains every artefact described in the config.\n"
)

_DEMO4_CODE = (
    "import tempfile\n"
    "import os\n\n"
    "tmp = Path(tempfile.mkdtemp(prefix='vdl_wf_'))\n"
    "yaml_text = '''\\\n"
    "version: 1\n"
    "input: dataset_real_cancer_drivers_4\n"
    "model: auto\n"
    "outputs:\n"
    "  - kind: venn\n"
    "    out: ''' + str(tmp / 'venn.svg') + '''\n"
    "  - kind: upset\n"
    "    out: ''' + str(tmp / 'upset.svg') + '''\n"
    "  - kind: statistics\n"
    "    out: ''' + str(tmp / 'statistics.tsv') + '''\n"
    "'''\n"
    "yaml_path = tmp / 'analysis.yaml'\n"
    "yaml_path.write_text(yaml_text)\n"
    "r = subprocess.run(\n"
    "    [VDL, 'workflow', 'run-from', str(yaml_path)],\n"
    "    capture_output=True, text=True, check=True,\n"
    ")\n"
    "print(r.stdout)\n"
    "print('Files in', tmp, ':')\n"
    "for f in sorted(tmp.iterdir()):\n"
    "    print(f'  {f.name:<25}  {f.stat().st_size:>8,} bytes')"
)

_DEMO5_MD = (
    "## 7. Demo 5: bundle outputs into a ZIP with `vdl report zip`\n\n"
    "`vdl report zip` packs the PDF report and every TSV/SVG into a single\n"
    "ZIP file -- ideal for emailing a colleague or attaching to a paper.\n"
)

_DEMO5_CODE = (
    "import zipfile\n\n"
    "out_zip = Path('/tmp/bundle.zip')\n"
    "subprocess.run(\n"
    "    [VDL, 'report', 'zip', '--sample', '--out', str(out_zip)],\n"
    "    check=True,\n"
    ")\n"
    "print(f'Wrote {out_zip} ({out_zip.stat().st_size:,} bytes)')\n"
    "with zipfile.ZipFile(out_zip) as z:\n"
    "    for info in z.infolist():\n"
    "        print(f'  {info.filename:<40}  {info.file_size:>8,} bytes')"
)

_DECISION_MD = (
    "## When to use the CLI vs the Python API\n\n"
    "Both interfaces share the same engine, so output bytes are identical.\n"
    "The right choice depends on *who* is calling and *why*.\n\n"
    "| Use case | Prefer CLI | Prefer Python API |\n"
    "|----------|-----------|------------------|\n"
    "| Reproducible batch run (CI, Snakemake, cron) | Yes -- file-in/file-out is hashable | -- |\n"
    "| Interactive exploration (Jupyter) | -- | Yes -- inspect `result.regions` |\n"
    "| Custom post-processing of statistics | -- | Yes -- direct pandas access |\n\n"
    "A common pattern is **both**: use the CLI for production pipelines, but\n"
    "develop the analysis interactively with the Python API first, then\n"
    "translate the proven workflow into an `analysis.yaml` for the CLI.\n"
)

_NEXT_STEPS_MD = (
    "## Next steps\n\n"
    "- [`06_pipeline_integration.ipynb`](06_pipeline_integration.ipynb)"
    " -- Snakemake and Nextflow integration patterns\n"
    "- [`11_data_validation_and_lookup.ipynb`](11_data_validation_and_lookup.ipynb)"
    " -- deeper dive into `vdl data validate` and `vdl data lookup` workflows\n"
)

# ---------------------------------------------------------------------------
# Cell list
# ---------------------------------------------------------------------------

CELLS = [
    ("md", _INTRO),
    ("code", _SETUP_CODE),
    ("md", _TREE_MD),
    ("code", _TREE_CODE),
    ("md", _HELP_MD),
    ("code", _HELP_RENDER_CODE),
    ("code", _HELP_DATA_CODE),
    ("md", _DEMO1_MD),
    ("code", _DEMO1_CODE),
    ("md", _DEMO2_MD),
    ("code", _DEMO2_CODE),
    ("md", _DEMO3_MD),
    ("code", _DEMO3_CODE),
    ("md", _DEMO4_MD),
    ("code", _DEMO4_CODE),
    ("md", _DEMO5_MD),
    ("code", _DEMO5_CODE),
    ("md", _DECISION_MD),
    ("md", _NEXT_STEPS_MD),
]

if __name__ == "__main__":
    out = (
        Path(__file__).resolve().parent.parent.parent
        / "examples"
        / "09_cli_workflows.ipynb"
    )
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
