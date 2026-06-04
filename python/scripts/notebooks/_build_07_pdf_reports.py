"""Build python/examples/07_pdf_reports.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

# ---------------------------------------------------------------------------
# Cell content constants (kept in named vars to hold lines under 100 chars)
# ---------------------------------------------------------------------------

_INTRO = (
    "# 07 -- Publication-Ready PDF Reports\n\n"
    "`venn-diagram-lab` can bundle every view into a single multi-page PDF:\n"
    "the overview pie chart, the Venn + UpSet panel, pairwise statistics tables,\n"
    "the network graph, and a methodology appendix.\n\n"
    "**What you will learn:**\n\n"
    "- Generate a full PDF report with one method call\n"
    "- Inspect file size and verify the PDF magic bytes\n"
    "- Understand the multi-page layout and when it expands\n"
    "- Opt out of the network or about pages for a smaller file\n"
    "- Use the standalone `vdl.render_pdf_report()` function form\n"
)

_IMPORT_CODE = (
    "import venn_diagram_lab as vdl\n\n"
    "print(f'venn-diagram-lab {vdl.__version__}')"
)

_GENERATE_MD = "## Generate the report"

_ANALYZE_CODE = (
    "result = vdl.analyze(\n"
    "    vdl.load_sample('dataset_real_cancer_drivers_4'),\n"
    "    model='auto',\n"
    ")\n\n"
    "result.to_pdf_report(\n"
    "    '/tmp/cancer_drivers.pdf',\n"
    "    title='Cancer Drivers Comparison',\n"
    ")\n"
    "print('Report written to /tmp/cancer_drivers.pdf')"
)

_SIZE_CODE = (
    "from pathlib import Path\n\n"
    "p = Path('/tmp/cancer_drivers.pdf')\n"
    "size_kb = p.stat().st_size / 1024\n"
    "magic = p.read_bytes()[:4]\n"
    "print(f'File size : {size_kb:.1f} KB')\n"
    "print(f'Magic bytes: {magic}  (valid PDF starts with %PDF)')"
)

_LAYOUT_MD = "## Page layout"

_LAYOUT_DETAIL_MD = (
    "The report contains between 4 and 7 pages depending on the number of sets:\n\n"
    "| Page | Content | Notes |\n"
    "|------|---------|-------|\n"
    "| 1 | **Overview** -- title, pie chart of set sizes, per-set item count table, "
    "metadata (model, sets, universe size) | Always present |\n"
    "| 2 | **Venn + UpSet** -- Venn SVG (left) and UpSet plot (right) side by side "
    "at 300 dpi | Always present |\n"
    "| 3 | **Statistics** -- Jaccard (top-left), Dice (top-right), and "
    "Hypergeometric + BH-FDR (bottom) on one page for 2-6 sets | 1 page for 2-6 "
    "sets; 3 separate pages for 7-9 sets |\n"
    "| 4 | **Network** -- force-directed set relationship graph + significant "
    "edge list | Skipped when `include_network=False` |\n"
    "| 5 | **About** -- methodology appendix (Venn, UpSet, Jaccard, Dice, "
    "enrichment) | Skipped when `include_about=False` |\n\n"
    "**Summary:**\n\n"
    "- 2-6 sets, all pages: **5 pages** (1 overview + 1 venn/upset + 1 stats + "
    "1 network + 1 about)\n"
    "- 7-9 sets, all pages: **7 pages** (same, but statistics expand to 3 pages)\n"
    "- Minimal (no network, no about): **3 pages** for 2-6 sets\n"
)

_SKIP_MD = "## Skip network or about pages"

_MINIMAL_CODE = (
    "result.to_pdf_report(\n"
    "    '/tmp/r_minimal.pdf',\n"
    "    include_network=False,\n"
    "    include_about=False,\n"
    ")\n\n"
    "full_kb = Path('/tmp/cancer_drivers.pdf').stat().st_size / 1024\n"
    "mini_kb = Path('/tmp/r_minimal.pdf').stat().st_size / 1024\n"
    "print(f'Full report  : {full_kb:.1f} KB')\n"
    "print(f'Minimal report: {mini_kb:.1f} KB')\n"
    "print(f'Size reduction: {(1 - mini_kb / full_kb) * 100:.0f}%')"
)

_STANDALONE_MD = "## Standalone function form"

_STANDALONE_CODE = (
    "vdl.render_pdf_report(result, '/tmp/r2.pdf', title='Cancer Drivers Comparison')\n\n"
    "size_kb = Path('/tmp/r2.pdf').stat().st_size / 1024\n"
    "print(f'r2.pdf: {size_kb:.1f} KB')\n"
    "print('render_pdf_report() is identical to result.to_pdf_report()')"
)

_V223_MD = (
    "## v2.2.3 additions: share distribution + cluster heatmap\n\n"
    "Two PDF additions land in v2.2.3 to close the webtool parity gap:\n\n"
    "1. **Item Share Distribution page** -- always present. Adds the\n"
    "   histogram (items shared by exactly k sets, for k=1..N) plus a\n"
    "   per-bin breakdown table. Sits between the Statistics tables and\n"
    "   the Network page.\n"
    "2. **Cluster-mode heatmap** -- opt-in via `cluster_heatmap=True`.\n"
    "   Appends a cluster-ordered Jaccard similarity heatmap (UPGMA\n"
    "   average linkage by default) with L-shaped dendrograms,\n"
    "   mirroring the webtool's `axisOrder=cluster` toggle on the PDF.\n"
)

_V223_CODE = (
    "result.to_pdf_report('/tmp/r_cluster.pdf', cluster_heatmap=True)\n\n"
    "default_kb = Path('/tmp/cancer_drivers.pdf').stat().st_size / 1024\n"
    "cluster_kb = Path('/tmp/r_cluster.pdf').stat().st_size / 1024\n"
    "print(f'Default report   : {default_kb:.1f} KB')\n"
    "print(f'+ cluster heatmap : {cluster_kb:.1f} KB')\n"
    "print(f'Extra page adds   : {cluster_kb - default_kb:.1f} KB')"
)

_NEXT_STEPS_MD = (
    "## Next steps\n\n"
    "- [`08_custom_styling_and_export.ipynb`](08_custom_styling_and_export.ipynb)"
    " -- SVG/PNG export and custom diagram styling for publication figures\n"
)

# ---------------------------------------------------------------------------
# Cell list -- 12 cells
# ---------------------------------------------------------------------------

CELLS = [
    # 1. Title + intro
    ("md", _INTRO),
    # 2. Import
    ("code", _IMPORT_CODE),
    # 3. Section header
    ("md", _GENERATE_MD),
    # 4. Load + analyze + write PDF
    ("code", _ANALYZE_CODE),
    # 5. File size + magic bytes
    ("code", _SIZE_CODE),
    # 6. Layout section header
    ("md", _LAYOUT_MD),
    # 7. Page-by-page description
    ("md", _LAYOUT_DETAIL_MD),
    # 8. Skip pages section header
    ("md", _SKIP_MD),
    # 9. Minimal report
    ("code", _MINIMAL_CODE),
    # 10. Standalone function section header
    ("md", _STANDALONE_MD),
    # 11. render_pdf_report() standalone call
    ("code", _STANDALONE_CODE),
    # 12. v2.2.3 section header + explanation
    ("md", _V223_MD),
    # 13. cluster-heatmap demo
    ("code", _V223_CODE),
    # 14. Next steps
    ("md", _NEXT_STEPS_MD),
]

if __name__ == "__main__":
    out = (
        Path(__file__).resolve().parent.parent.parent
        / "examples"
        / "07_pdf_reports.ipynb"
    )
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
