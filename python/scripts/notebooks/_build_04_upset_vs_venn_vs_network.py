"""Build python/examples/04_upset_vs_venn_vs_network.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

# ---------------------------------------------------------------------------
# Cell content constants (kept in named vars to hold lines under 100 chars)
# ---------------------------------------------------------------------------

_INTRO = (
    "# 04 -- UpSet vs Venn vs Network: Choosing the Right Visualization\n\n"
    "Venn diagrams, UpSet plots, and Network graphs each reveal different facets\n"
    "of overlapping sets. Picking the wrong one wastes space and confuses readers.\n"
    "This notebook shows each visualization applied to 3-set, 5-set, and 7-set\n"
    "data so you can see exactly when each approach shines -- and when it struggles.\n\n"
    "**What you will learn:**\n\n"
    "- Why Venn diagrams work beautifully for 2-4 sets but deteriorate beyond that\n"
    "- Why UpSet plots are the recommended alternative for 5+ sets\n"
    "- When a Network plot adds value regardless of set count\n"
)

_IMPORT_CODE = (
    "import venn_diagram_lab as vdl\n\n"
    "print(f'venn-diagram-lab {vdl.__version__}')"
)

_RULE_TABLE_ROWS = "\n".join([
    "| Set count | Venn diagram | UpSet plot | Network plot |",
    "|-----------|-------------|------------|--------------|",
    "| 2-4 sets  | Best choice -- regions are readable"
    " | Works, but overkill"
    " | Use when pairwise relationships are the focus |",
    "| 5-7 sets  | Gets crowded, hard to read"
    " | **Preferred** -- exact bars, scalable"
    " | Useful for spotting clusters and strong edges |",
    "| 8-9 sets  | Avoid -- nearly unreadable"
    " | **Recommended** -- threshold filter helps"
    " | Helpful, especially with Jaccard/FE edge weights |",
])
_RULE_TABLE_MD = (
    "## Rule-of-thumb: which plot to pick\n\n"
    + _RULE_TABLE_ROWS
    + "\n\n"
    "A good default rule:\n\n"
    "> Use **Venn** for <=4 sets, **UpSet** for >=5 sets, and **Network** whenever\n"
    "> pairwise overlap strength matters more than the full intersection breakdown.\n"
)

_3SET_HEADER_MD = (
    "## 3 sets -- Venn is the natural choice\n\n"
    "With three sets there are exactly 7 non-empty intersection regions. A Venn diagram\n"
    "maps them perfectly: each region is visible, labeled, and easy to trace back to\n"
    "its contributing sets.\n"
)

_3SET_BUILD_CODE = (
    "# Compact 3-set cancer gene example\n"
    "ds_3 = vdl.Dataset.from_dict({\n"
    "    'TP53_Pathway': {'CDKN1A', 'MDM2', 'BAX', 'BBC3', 'PUMA'},\n"
    "    'Apoptosis':    {'BAX', 'BBC3', 'CASP3', 'CASP9', 'BCL2'},\n"
    "    'DNA_Repair':   {'CDKN1A', 'BRCA1', 'BRCA2', 'ATM', 'CASP3'},\n"
    "})\n"
    "r_3 = vdl.analyze(ds_3, model='auto')\n"
    "print('Model selected:', r_3.model)\n"
    "print('Non-empty regions:', len(r_3.regions))"
)

_3SET_VENN_CODE = (
    "# Venn diagram -- clean and easy to read for 3 sets\n"
    "r_3.render_venn()"
)

_5SET_HEADER_MD = (
    "## 5 sets -- Venn becomes crowded\n\n"
    "We load a real dataset of MSigDB cancer pathway gene sets (5 sets, all from\n"
    "Molecular Signatures Database hallmark pathways). The Venn diagram can still\n"
    "render 31 regions, but many regions overlap visually and the labels compete\n"
    "for space. Notice how the diagram feels cluttered compared to the 3-set version.\n"
)

_5SET_LOAD_CODE = (
    "# Real MSigDB cancer pathways dataset (5 sets)\n"
    "ds_5 = vdl.load_sample('dataset_real_msigdb_cancer_pathways')\n"
    "r_5 = vdl.analyze(ds_5, model='auto')\n"
    "print('Set names:', ds_5.set_names)\n"
    "print('Model selected:', r_5.model)\n"
    "print('Non-empty regions:', len(r_5.regions))"
)

_5SET_VENN_CODE = (
    "# Venn diagram for 5 sets -- readable but getting busy\n"
    "r_5.render_venn()"
)

_5SET_UPSET_CODE = (
    "# UpSet plot for 5 sets -- recommended alternative\n"
    "# Each bar represents one intersection; the dot matrix shows which sets contribute.\n"
    "r_5.render_upset()"
)

_7SET_HEADER_MD = (
    "## 7 sets -- UpSet is essential\n\n"
    "A 7-set Venn diagram has 127 possible non-empty regions. Even the best template\n"
    "cannot make that legible. UpSet collapses the visual complexity to a ranked\n"
    "bar chart: the tallest bars are the biggest intersections, and you can filter\n"
    "to show only the most populated ones.\n\n"
    "We generate a synthetic 7-set dataset where each set has 20 unique items plus\n"
    "one item (`'shared'`) present in all sets.\n"
)

_7SET_BUILD_CODE = (
    "# Synthetic 7-set dataset: 20 unique items per set + 1 shared item\n"
    "ds_7 = vdl.Dataset.from_dict(\n"
    "    {chr(ord('A') + i): {f'item{j}{i}' for j in range(20)} | {'shared'}\n"
    "     for i in range(7)}\n"
    ")\n"
    "r_7 = vdl.analyze(ds_7, model='auto')\n"
    "print('Model selected:', r_7.model)\n"
    "print('Total possible regions:', len(r_7.regions))"
)

_7SET_VENN_CODE = (
    "# Venn diagram for 7 sets -- note how overwhelming this becomes\n"
    "r_7.render_venn()"
)

_7SET_UPSET_CODE = (
    "# UpSet plot for 7 sets -- all intersections ranked by size\n"
    "r_7.render_upset()"
)

_7SET_THRESHOLD_CODE = (
    "# Threshold filter: show only intersections with >= 2 items\n"
    "# This removes noise and highlights meaningful overlaps.\n"
    "r_7.render_upset(threshold=2)"
)

_NETWORK_HEADER_MD = (
    "## Network plot -- relationship-focused view\n\n"
    "The Network plot represents sets as nodes and pairwise overlaps as edges.\n"
    "Edge weight and color reflect overlap strength (Jaccard similarity by default).\n"
    "It answers a different question: *which sets are most similar to each other?*\n\n"
    "The 5-set cancer dataset works well here because the pathway groupings\n"
    "create a meaningful cluster structure.\n"
)

_NETWORK_CODE = (
    "# Network plot for the 5-set cancer dataset\n"
    "# Node size = set cardinality, edge weight = pairwise Jaccard similarity.\n"
    "r_5.render_network()"
)

_NEXT_STEPS_MD = (
    "## Next steps\n\n"
    "- [`05_statistics_deep_dive.ipynb`](05_statistics_deep_dive.ipynb)"
    " -- Jaccard, Dice, and hypergeometric enrichment explained with real data\n"
    "- [`07_pdf_reports.ipynb`](07_pdf_reports.ipynb)"
    " -- generate a publication-ready multi-page PDF report combining Venn,"
    " UpSet, Network, and statistics\n"
)

# ---------------------------------------------------------------------------
# Cell list -- 18 cells
# ---------------------------------------------------------------------------

CELLS = [
    # 1. Title + intro
    ("md", _INTRO),
    # 2. Import
    ("code", _IMPORT_CODE),
    # 3. Rule-of-thumb table
    ("md", _RULE_TABLE_MD),
    # 4. 3-set header
    ("md", _3SET_HEADER_MD),
    # 5. Build 3-set dataset
    ("code", _3SET_BUILD_CODE),
    # 6. Render Venn (3-set)
    ("code", _3SET_VENN_CODE),
    # 7. 5-set header
    ("md", _5SET_HEADER_MD),
    # 8. Load 5-set dataset
    ("code", _5SET_LOAD_CODE),
    # 9. Render Venn (5-set, crowded)
    ("code", _5SET_VENN_CODE),
    # 10. Render UpSet (5-set, recommended)
    ("code", _5SET_UPSET_CODE),
    # 11. 7-set header
    ("md", _7SET_HEADER_MD),
    # 12. Build 7-set dataset
    ("code", _7SET_BUILD_CODE),
    # 13. Render Venn (7-set, overwhelming)
    ("code", _7SET_VENN_CODE),
    # 14. Render UpSet (7-set)
    ("code", _7SET_UPSET_CODE),
    # 15. Render UpSet with threshold filter
    ("code", _7SET_THRESHOLD_CODE),
    # 16. Network header
    ("md", _NETWORK_HEADER_MD),
    # 17. Render Network (5-set)
    ("code", _NETWORK_CODE),
    # 18. Next steps
    ("md", _NEXT_STEPS_MD),
]

if __name__ == "__main__":
    out = (
        Path(__file__).resolve().parent.parent.parent
        / "examples"
        / "04_upset_vs_venn_vs_network.ipynb"
    )
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
