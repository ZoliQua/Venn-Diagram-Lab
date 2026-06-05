"""Build python/examples/11_data_validation_and_lookup.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

# ---------------------------------------------------------------------------
# Cell content constants
# ---------------------------------------------------------------------------

_INTRO = (
    "# 11 -- Data Validation and Item Lookup: the `vdl data` Subapp\n\n"
    "Before plotting anything, you want to know: *is the input file healthy,*\n"
    "*how big are the sets, what's the right model, and where does my favourite*\n"
    "*gene live?* The `vdl data` subapp answers all of these in script-friendly\n"
    "form (JSON / plain text), so a CI workflow or pipeline can decide what to\n"
    "do next without an interactive prompt.\n\n"
    "**Audience:** bioinformaticians who validate inputs and look up specific\n"
    "genes across multiple datasets.\n\n"
    "**What you will learn:**\n\n"
    "- `vdl data validate` for schema + content checks (JSON + `--strict`)\n"
    "- `vdl data describe` for a quick text summary\n"
    "- `vdl data lookup` to find which Venn region a gene lives in\n"
    "- `vdl data fit-model` for model recommendations\n"
    "- `vdl data convert` for TSV<->CSV format conversion\n"
    "- A typical data-hygiene checklist for new inputs\n"
)

_SETUP_CODE = (
    "import json\n"
    "import subprocess\n"
    "import sys\n"
    "from pathlib import Path\n\n"
    "VDL = str(Path(sys.executable).parent / 'vdl')\n"
    "print('Using vdl:', VDL)"
)

_VALIDATE_MD = (
    "## 1. `vdl data validate` -- structured JSON report\n\n"
    "By default `vdl data validate` emits a JSON document with `sets`,\n"
    "`item_count`, `errors`, `warnings`, `info`, and `exit_code` keys. The\n"
    "command exits non-zero iff `errors` is non-empty.\n"
)

_VALIDATE_CODE = (
    "r = subprocess.run(\n"
    "    [VDL, 'data', 'validate', '--sample'],\n"
    "    capture_output=True, text=True, check=True,\n"
    ")\n"
    "report = json.loads(r.stdout)\n"
    "print('Input        :', report['input'])\n"
    "print('Sets         :', report['sets'])\n"
    "print('Item count   :', report['item_count'])\n"
    "print('Errors       :', report['errors'])\n"
    "print('Warnings     :', report['warnings'])\n"
    "print('Exit code    :', report['exit_code'])\n"
    "print()\n"
    "print('Per-set sizes (from info field):')\n"
    "for entry in report['info']:\n"
    "    if entry.get('kind') == 'set-size':\n"
    "        print(f'  {entry[\"set\"]:20s}  {entry[\"count\"]:>6,} items')"
)

_STRICT_MD = (
    "## 2. `--strict` mode for CI pipelines\n\n"
    "With `--strict`, warnings are promoted to errors. This is the right mode\n"
    "for CI: a non-zero exit code stops the pipeline before a malformed input\n"
    "reaches the renderer. For the bundled clean sample there are no warnings,\n"
    "so the strict run also succeeds.\n"
)

_STRICT_CODE = (
    "r = subprocess.run(\n"
    "    [VDL, 'data', 'validate', '--sample', '--strict'],\n"
    "    capture_output=True, text=True,\n"
    ")\n"
    "print(f'Exit code: {r.returncode}')\n"
    "report = json.loads(r.stdout)\n"
    "print(f'Errors after strict promotion: {len(report[\"errors\"])}')\n"
    "print(f'Exit-code field in report   : {report[\"exit_code\"]}')"
)

_LOOKUP_HIT_MD = (
    "## 3. `vdl data lookup` -- find a known gene\n\n"
    "`vdl data lookup --sample TP53` walks every Venn region and prints the\n"
    "ones that contain the requested item. TP53 is in all four cancer-driver\n"
    "catalogs, so it should appear in the 4-way intersection.\n"
)

_LOOKUP_HIT_CODE = (
    "r = subprocess.run(\n"
    "    [VDL, 'data', 'lookup', '--sample', 'TP53'],\n"
    "    capture_output=True, text=True, check=True,\n"
    ")\n"
    "print(r.stdout)"
)

_LOOKUP_MISS_MD = (
    "## 4. `vdl data lookup` -- gene not in the dataset\n\n"
    "If the item is not in any set, `lookup` prints a one-line *not found*\n"
    "message and exits cleanly (exit code 0). Scripts can detect this by\n"
    "matching the string `'not found'` in stdout.\n"
)

_LOOKUP_MISS_CODE = (
    "r = subprocess.run(\n"
    "    [VDL, 'data', 'lookup', '--sample', 'NOTAGENE'],\n"
    "    capture_output=True, text=True, check=True,\n"
    ")\n"
    "print(r.stdout)\n"
    "print('Found?', 'not found' not in r.stdout)"
)

_LOOKUP_BATCH_MD = (
    "## 5. Batch lookup: tabulate where each gene lives\n\n"
    "Loop over a list of well-known oncogenes and print a compact summary\n"
    "of which sets each appears in.\n"
)

_LOOKUP_BATCH_CODE = (
    "genes = ['TP53', 'KRAS', 'MYC', 'BRCA1', 'EGFR']\n"
    "print(f'{\"gene\":<8}  {\"region(s) hit\":<60}')\n"
    "print('-' * 70)\n"
    "for g in genes:\n"
    "    r = subprocess.run(\n"
    "        [VDL, 'data', 'lookup', '--sample', g],\n"
    "        capture_output=True, text=True, check=True,\n"
    "    )\n"
    "    # First line is the summary; subsequent lines list each region.\n"
    "    lines = r.stdout.strip().splitlines()\n"
    "    if 'not found' in lines[0]:\n"
    "        print(f'{g:<8}  (not in dataset)')\n"
    "    else:\n"
    "        print(f'{g:<8}  {lines[0]}')\n"
    "        for region_line in lines[1:]:\n"
    "            print(f'          {region_line.strip()}')"
)

_DESCRIBE_MD = (
    "## 6. `vdl data describe` -- quick text summary\n\n"
    "`describe` is the fastest way to see set names + sizes + a model\n"
    "recommendation without parsing JSON. Useful at the top of any script.\n"
)

_DESCRIBE_CODE = (
    "r = subprocess.run(\n"
    "    [VDL, 'data', 'describe', '--sample'],\n"
    "    capture_output=True, text=True, check=True,\n"
    ")\n"
    "print(r.stdout)"
)

_FITMODEL_MD = (
    "## 7. `vdl data fit-model` -- which Venn template fits?\n\n"
    "`fit-model` looks at the set count and suggests a model name, plus the\n"
    "list of all bundled candidates for that count. The default suggestion is\n"
    "what `analyze(model='auto')` would pick.\n"
)

_FITMODEL_CODE = (
    "r = subprocess.run(\n"
    "    [VDL, 'data', 'fit-model', '--sample'],\n"
    "    capture_output=True, text=True, check=True,\n"
    ")\n"
    "print(r.stdout)"
)

_CONVERT_MD = (
    "## 8. `vdl data convert` -- TSV <-> CSV roundtrip\n\n"
    "Some downstream tools insist on CSV; others on TSV. `vdl data convert`\n"
    "swaps the delimiter while preserving the binary-matrix structure.\n"
    "It takes two explicit file-path arguments (`input output`) and infers the\n"
    "format from each extension. Below we (a) write the sample's region-summary\n"
    "TSV via `vdl export`, (b) convert it to CSV, (c) round-trip back to TSV,\n"
    "and (d) verify the row count is preserved.\n"
)

_CONVERT_CODE = (
    "import tempfile\n\n"
    "tmp = Path(tempfile.mkdtemp(prefix='vdl_convert_'))\n\n"
    "# Step 1: get a real TSV on disk from the bundled sample.\n"
    "tsv_in = tmp / 'sample.tsv'\n"
    "subprocess.run(\n"
    "    [VDL, 'export', 'region-summary', '--sample', '--out', str(tsv_in)],\n"
    "    check=True,\n"
    ")\n"
    "print(f'TSV (input)        : {tsv_in} ({tsv_in.stat().st_size:,} bytes)')\n\n"
    "# Step 2: TSV -> CSV.\n"
    "csv_out = tmp / 'sample.csv'\n"
    "subprocess.run(\n"
    "    [VDL, 'data', 'convert', str(tsv_in), str(csv_out)],\n"
    "    check=True,\n"
    ")\n"
    "print(f'CSV                 : {csv_out} ({csv_out.stat().st_size:,} bytes)')\n\n"
    "# Step 3: CSV -> TSV (round-trip).\n"
    "tsv_out = tmp / 'sample_roundtrip.tsv'\n"
    "subprocess.run(\n"
    "    [VDL, 'data', 'convert', str(csv_out), str(tsv_out)],\n"
    "    check=True,\n"
    ")\n"
    "print(f'TSV (round-tripped) : {tsv_out} ({tsv_out.stat().st_size:,} bytes)')\n\n"
    "# Step 4: spot-check row counts.\n"
    "in_rows = sum(1 for _ in tsv_in.open())\n"
    "csv_rows = sum(1 for _ in csv_out.open())\n"
    "tsv_rows = sum(1 for _ in tsv_out.open())\n"
    "print(f'Rows: input={in_rows}, csv={csv_rows}, roundtrip={tsv_rows}, '\n"
    "      f'match={in_rows == csv_rows == tsv_rows}')"
)

_CHECKLIST_MD = (
    "## Typical data-hygiene checklist\n\n"
    "Before running a full pipeline on a new input, walk through:\n\n"
    "1. **`vdl data validate <input> --strict`** -- schema clean? Fail-fast if not.\n"
    "2. **`vdl data describe <input>`** -- set count + sizes look plausible?\n"
    "3. **`vdl data fit-model <input>`** -- pick a model (or stick with auto).\n"
    "4. **`vdl data lookup <input> <known-gene>`** -- sanity-check at least one\n"
    "   expected gene appears where you think it should.\n"
    "5. **`vdl data convert <input> --to ...`** -- only if a downstream tool\n"
    "   requires a specific delimiter.\n\n"
    "Then proceed to `vdl analyze` or `vdl workflow run-from` with confidence.\n"
)

_NEXT_STEPS_MD = (
    "## Next steps\n\n"
    "- [`09_cli_workflows.ipynb`](09_cli_workflows.ipynb)"
    " -- broader CLI walkthrough including `vdl workflow run-from`\n"
    "- [`06_pipeline_integration.ipynb`](06_pipeline_integration.ipynb)"
    " -- wire validation + analysis into Snakemake or Nextflow\n"
)

# ---------------------------------------------------------------------------
# Cell list
# ---------------------------------------------------------------------------

CELLS = [
    ("md", _INTRO),
    ("code", _SETUP_CODE),
    ("md", _VALIDATE_MD),
    ("code", _VALIDATE_CODE),
    ("md", _STRICT_MD),
    ("code", _STRICT_CODE),
    ("md", _LOOKUP_HIT_MD),
    ("code", _LOOKUP_HIT_CODE),
    ("md", _LOOKUP_MISS_MD),
    ("code", _LOOKUP_MISS_CODE),
    ("md", _LOOKUP_BATCH_MD),
    ("code", _LOOKUP_BATCH_CODE),
    ("md", _DESCRIBE_MD),
    ("code", _DESCRIBE_CODE),
    ("md", _FITMODEL_MD),
    ("code", _FITMODEL_CODE),
    ("md", _CONVERT_MD),
    ("code", _CONVERT_CODE),
    ("md", _CHECKLIST_MD),
    ("md", _NEXT_STEPS_MD),
]

if __name__ == "__main__":
    out = (
        Path(__file__).resolve().parent.parent.parent
        / "examples"
        / "11_data_validation_and_lookup.ipynb"
    )
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
