"""Build python/examples/06_pipeline_integration.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

# ---------------------------------------------------------------------------
# Cell content constants (kept in named vars to hold lines under 100 chars)
# ---------------------------------------------------------------------------

_INTRO = (
    "# 06 -- Pipeline Integration: CLI vs Library API\n\n"
    "The `venn-diagram-lab` package ships two interfaces:\n\n"
    "1. **Python library API** -- `import venn_diagram_lab as vdl` -- best for\n"
    "   interactive notebooks and custom scripts where you want to inspect\n"
    "   intermediate objects (`result.regions`, `result.statistics`, etc.).\n"
    "2. **`vdl` CLI** -- a shell command that reads a file and writes output\n"
    "   artefacts (SVG, PNG, PDF, TSV) -- best for reproducible pipelines in\n"
    "   Snakemake, Nextflow, Makefile, or CI/CD workflows.\n\n"
    "**What you will learn:**\n\n"
    "- When to reach for the library vs the CLI\n"
    "- The full CLI command reference (`vdl --help`)\n"
    "- How to run a quick demo with `vdl render-sample`\n"
    "- How to wire `vdl analyze` into a Snakemake workflow\n"
    "- How to wire `vdl analyze` into a Nextflow pipeline\n"
)

_IMPORT_CODE = (
    "import venn_diagram_lab as vdl\n\n"
    "print(f'venn-diagram-lab {vdl.__version__}')"
)

_TRADEOFFS_MD = "## Library vs CLI tradeoffs"

_TRADEOFFS_TABLE_MD = (
    "| Concern | Library API | CLI (`vdl`) |\n"
    "|---------|------------|-------------|\n"
    "| Interactive exploration | Best | No |\n"
    "| Inspect intermediate objects | Yes | No |\n"
    "| Custom plots / downstream code | Yes | No |\n"
    "| Shell scripts / Makefile | No | Best |\n"
    "| Snakemake / Nextflow | No | Best |\n"
    "| CI/CD artefact generation | No | Best |\n"
    "| Reproducible file-in / file-out | Possible | Native |\n"
    "| No Python knowledge required | No | Yes |\n"
)

_WHEN_LIBRARY_MD = (
    "### When to use the library\n\n"
    "- Jupyter notebooks where you want to render inline figures.\n"
    "- Scripts that apply custom filters, post-process region lists, or feed\n"
    "  results into another analysis (e.g., pathway enrichment after vdl).\n"
    "- Cases where you need `result.statistics` DataFrames directly in memory.\n\n"
    "```python\n"
    "import venn_diagram_lab as vdl\n\n"
    "result = vdl.analyze(vdl.load_sample('dataset_real_cancer_drivers_4'), model='auto')\n"
    "print(result.statistics.jaccard)\n"
    "```\n"
)

_WHEN_CLI_MD = (
    "### When to use the CLI\n\n"
    "- Snakemake rules or Nextflow processes that consume a TSV and produce\n"
    "  SVG/PNG/PDF/TSV artefacts.\n"
    "- Shell one-liners: `vdl analyze data.tsv --output-dir out/`\n"
    "- CI workflows that must run without a Jupyter kernel.\n"
    "- Any situation where reproducibility is best enforced at the file level\n"
    "  (input hash -> output hash) rather than in-memory state.\n"
)

_CLI_OVERVIEW_MD = "## CLI overview"

_CLI_HELP_CODE = (
    "import subprocess, sys\n"
    "from pathlib import Path\n\n"
    "# Derive the vdl executable from the active Python interpreter's bin dir\n"
    "# so this cell works regardless of whether 'vdl' is on PATH.\n"
    "_vdl = str(Path(sys.executable).parent / 'vdl')\n\n"
    "r = subprocess.run([_vdl, '--help'], capture_output=True, text=True, check=True)\n"
    "print(r.stdout)"
)

_DEMO_MD = "## Quick demo: render a sample dataset"

_DEMO_INTRO_MD = (
    "The `vdl render-sample` command looks up a bundled dataset by name and\n"
    "runs the full analysis pipeline, writing the output bundle to a directory.\n"
    "It is equivalent to:\n\n"
    "```\n"
    "vdl analyze <path-to-sample-tsv> --output-dir <dir>\n"
    "```\n"
    "\n"
    "Run it now against the mock streaming-platforms dataset (4 sets):\n"
)

_DEMO_CODE = (
    "import subprocess, tempfile, os\n\n"
    "demo_dir = tempfile.mkdtemp(prefix='vdl_demo_')\n"
    "r = subprocess.run(\n"
    "    [_vdl, 'render-sample', 'dataset_mock_streaming_platforms',\n"
    "     '--output-dir', demo_dir],\n"
    "    capture_output=True, text=True, check=True,\n"
    ")\n"
    "print(r.stdout or '(no stdout)')\n"
    "print('Files written to', demo_dir)"
)

_DEMO_LS_CODE = (
    "for fname in sorted(os.listdir(demo_dir)):\n"
    "    fpath = os.path.join(demo_dir, fname)\n"
    "    size_kb = os.path.getsize(fpath) / 1024\n"
    "    print(f'{fname:<30}  {size_kb:>7.1f} KB')"
)

_SNAKEMAKE_MD = "## Snakemake example"

_SNAKEMAKE_EXPLAIN_MD = (
    "The `Snakefile` below defines two rules:\n\n"
    "- **`all_reports`** -- the default target that declares all expected output files.\n"
    "- **`analyze`** -- the worker rule that runs `vdl analyze` with `--output-dir`\n"
    "  and maps the five output files into named Snakemake outputs for provenance.\n\n"
    "Snakemake will automatically resolve that `all_reports` depends on `analyze`\n"
    "and run only the rules needed to produce the requested outputs.\n"
)

_SNAKEMAKE_CODE = (
    "from pathlib import Path\n"
    "import venn_diagram_lab\n\n"
    "# Derive repo root from the installed package location (works in any cwd)\n"
    "_repo_root = Path(venn_diagram_lab.__file__).parents[3]\n"
    "_snakefile = _repo_root / 'python' / 'examples' / 'pipelines' / 'Snakefile'\n"
    "print(_snakefile.read_text())"
)

_SNAKEMAKE_RUN_MD = (
    "Run with:\n\n"
    "```bash\n"
    "snakemake --cores 1 --snakefile python/examples/pipelines/Snakefile all_reports\n"
    "```\n\n"
    "Snakemake will skip the rule on subsequent runs if the output files are\n"
    "already up to date (newer than the input TSV) -- giving you incremental\n"
    "rebuild for free.\n"
)

_NEXTFLOW_MD = "## Nextflow example"

_NEXTFLOW_CODE = (
    "_nf = _repo_root / 'python' / 'examples' / 'pipelines' / 'main.nf'\n"
    "print(_nf.read_text())"
)

_NEXTFLOW_RUN_MD = (
    "Run with:\n\n"
    "```bash\n"
    "nextflow run python/examples/pipelines/main.nf\n"
    "```\n\n"
    "Nextflow stages the input file into a work directory, runs the process\n"
    "inside it, then copies the named outputs to `params.outdir` via `publishDir`.\n"
    "The `Channel.fromPath` source can be replaced with a glob pattern to fan out\n"
    "over multiple input files -- each processed in parallel by a separate worker.\n"
)

_NEXT_STEPS_MD = (
    "## Next steps\n\n"
    "- [`07_pdf_reports.ipynb`](07_pdf_reports.ipynb)"
    " -- bundle Venn, UpSet, Network, and statistics into a single PDF report\n"
    "- [`08_custom_styling_and_export.ipynb`](08_custom_styling_and_export.ipynb)"
    " -- style diagrams and export SVG/PNG for publication\n"
)

# ---------------------------------------------------------------------------
# Cell list -- 17 cells
# ---------------------------------------------------------------------------

CELLS = [
    # 1. Title + intro
    ("md", _INTRO),
    # 2. Import vdl + version
    ("code", _IMPORT_CODE),
    # 3. Library vs CLI section header
    ("md", _TRADEOFFS_MD),
    # 4. Tradeoffs table
    ("md", _TRADEOFFS_TABLE_MD),
    # 5. When to use library
    ("md", _WHEN_LIBRARY_MD),
    # 6. When to use CLI
    ("md", _WHEN_CLI_MD),
    # 7. CLI overview section header
    ("md", _CLI_OVERVIEW_MD),
    # 8. vdl --help via subprocess
    ("code", _CLI_HELP_CODE),
    # 9. Quick demo section header
    ("md", _DEMO_MD),
    # 10. Intro to render-sample
    ("md", _DEMO_INTRO_MD),
    # 11. Run render-sample
    ("code", _DEMO_CODE),
    # 12. List output files
    ("code", _DEMO_LS_CODE),
    # 13. Snakemake section header
    ("md", _SNAKEMAKE_MD),
    # 14. Snakemake explanation
    ("md", _SNAKEMAKE_EXPLAIN_MD),
    # 15. Print Snakefile content
    ("code", _SNAKEMAKE_CODE),
    # 16. Run instructions for Snakemake
    ("md", _SNAKEMAKE_RUN_MD),
    # 17. Nextflow section header
    ("md", _NEXTFLOW_MD),
    # 18. Print main.nf content
    ("code", _NEXTFLOW_CODE),
    # 19. Run instructions for Nextflow
    ("md", _NEXTFLOW_RUN_MD),
    # 20. Next steps
    ("md", _NEXT_STEPS_MD),
]

if __name__ == "__main__":
    out = (
        Path(__file__).resolve().parent.parent.parent
        / "examples"
        / "06_pipeline_integration.ipynb"
    )
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
