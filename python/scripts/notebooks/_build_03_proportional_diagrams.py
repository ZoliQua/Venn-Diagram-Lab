"""Build python/examples/03_proportional_diagrams.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

# ---------------------------------------------------------------------------
# Cell content constants (extracted to keep lines under 100 chars)
# ---------------------------------------------------------------------------

_INTRO = (
    "# 03 -- Area-Proportional Venn Diagrams\n\n"
    "Standard Venn diagrams use fixed templates: every region has the same visual size\n"
    "regardless of how many items it contains. **Area-proportional** (or\n"
    "*Euler-proportional*) diagrams resize the circles so that the area of each region\n"
    "matches the number of items it holds. This notebook covers:\n\n"
    "- When proportional diagrams help (and when they don't)\n"
    "- How to request one with `model='proportional'`\n"
    "- The accuracy difference between 2-set (exact) and 3-set (approximate)\n"
    "- Why 4+ sets are unsupported and what to use instead\n"
)

_WHEN_TO_USE_MD = (
    "## When to use proportional diagrams\n\n"
    "Use proportional mode when **set sizes differ widely** and you want the diagram\n"
    "to convey magnitude at a glance. For example, comparing a 50-item catalog with a\n"
    "5-item subset makes the size imbalance invisible on a standard template but\n"
    "obvious on a proportional one.\n\n"
    "Stick to the standard template when:\n"
    "- Sets are similar in size (the gain is cosmetic)\n"
    "- You have 4 or more sets (proportional is not supported)\n"
    "- Exact topology matters more than visual area (e.g., every region must be visible)\n"
)

_BUILD_2SET_CODE = (
    "# 2-set dataset: Catalog A (50 items) vs Catalog B (8 items, 3 shared)\n"
    "ds_2 = vdl.Dataset.from_dict({\n"
    "    'Catalog A': {f'a{i}' for i in range(50)},\n"
    "    'Catalog B': {f'b{i}' for i in range(5)} | {f'a{i}' for i in range(3)},\n"
    "})\n"
    "print('Catalog A:', len(ds_2.items['Catalog A']), 'items')\n"
    "print('Catalog B:', len(ds_2.items['Catalog B']), 'items')\n"
    "print('Shared (A & B):', len(ds_2.items['Catalog A'] & ds_2.items['Catalog B']), 'items')"
)

_TEMPLATE_VS_PROP_MD = (
    "## Templated vs proportional (2-set)\n\n"
    "We render the same dataset twice: once with the standard 2-set template and once\n"
    "with the proportional renderer. The counts are identical -- only the visual areas change."
)

_TEMPLATE_CODE = (
    "r_template = vdl.analyze(ds_2, model='venn-2-set')\n"
    "r_template.render_venn()  # standard fixed-size circles"
)

_PROP_CODE = (
    "r_prop = vdl.analyze(ds_2, model='proportional')\n"
    "r_prop.render_venn()  # circles sized to set cardinality"
)

_VISUAL_DIFF_MD = (
    "### Observation\n\n"
    "In the templated diagram both circles look roughly the same size, making the\n"
    "50-vs-8 ratio invisible. In the proportional diagram Catalog A's circle is\n"
    "noticeably larger, immediately communicating the size imbalance.\n\n"
    "When set sizes differ widely, proportional makes the relative difference\n"
    "visually obvious without requiring the reader to read the numbers first."
)

_EXACT_CODE = (
    "# For 2-set diagrams the solver is analytical (binary search on lens area).\n"
    "print('is_approximate:', r_prop.is_approximate)\n"
    "# Expected: False"
)

_3SET_MD = (
    "## 3-set proportional (approximate)\n\n"
    "Three mutually overlapping circles cannot always be placed so that *every* region\n"
    "area is exactly proportional -- the mathematical constraints are over-determined.\n"
    "The solver does its best via a triangulation approach and marks the result as\n"
    "approximate. An `'approximate'` footnote appears in the bottom-right of the SVG."
)

_BUILD_3SET_CODE = (
    "ds_3 = vdl.Dataset.from_dict({\n"
    "    'A': {'x', 'y', 'z'},\n"
    "    'B': {'y', 'z', 'w'},\n"
    "    'C': {'z', 'w', 'v'},\n"
    "})\n"
    "r_3prop = vdl.analyze(ds_3, model='proportional')\n"
    "print('is_approximate:', r_3prop.is_approximate)\n"
    "r_3prop.render_venn()"
)

_APPROX_DISCUSS_MD = (
    "### Why 3-set area-proportionality is hard\n\n"
    "With two circles the only free parameter is the inter-center distance, and there\n"
    "is always an exact solution. With three circles we have six free parameters (two\n"
    "center coordinates per circle) but seven region-area constraints -- an overdetermined\n"
    "system. The solver uses pairwise distance fitting to minimize total area error, but\n"
    "perfect proportionality is not guaranteed. The `'approximate'` footnote in the\n"
    "diagram flags this limitation so readers are not misled."
)

_4SET_MD = (
    "## 4+ sets are unsupported\n\n"
    "Beyond three sets there is no known general algorithm for area-proportional circle\n"
    "packing. Requesting `model='proportional'` on a 4-set dataset raises\n"
    "`IncompatibleModelError` when you call `render_venn()`."
)

_4SET_CODE = (
    "ds_4 = vdl.Dataset.from_dict({chr(ord('A') + i): {f'x{i}'} for i in range(4)})\n"
    "r_4 = vdl.analyze(ds_4, model='proportional')\n"
    "try:\n"
    "    r_4.render_venn()\n"
    "except vdl.IncompatibleModelError as e:\n"
    "    print(f'Expected error: {e}')"
)

_ALTERNATIVES_MD = (
    "For 4+ sets the right alternatives are:\n\n"
    "- **UpSet plot** (`result.render_upset()`) -- shows all intersection sizes as bars,\n"
    "  scales to 9+ sets, exact counts\n"
    "- **Network plot** (`result.render_network()`) -- shows pairwise relationships as\n"
    "  a force-directed graph, useful for spotting clusters\n\n"
    "Both are demonstrated in notebook **04 -- UpSet vs Venn vs Network**."
)

_NEXT_STEPS = (
    "## Next steps\n\n"
    "- [`04_upset_vs_venn_vs_network.ipynb`](04_upset_vs_venn_vs_network.ipynb)"
    " -- comparing UpSet, Venn, and Network views for large set counts\n"
    "- [`05_statistics_deep_dive.ipynb`](05_statistics_deep_dive.ipynb)"
    " -- Jaccard, Dice, and hypergeometric enrichment details\n"
    "- [`07_pdf_reports.ipynb`](07_pdf_reports.ipynb)"
    " -- generate a publication-ready multi-page PDF report\n"
)

# ---------------------------------------------------------------------------
# Cell list -- 17 cells alternating md + code
# ---------------------------------------------------------------------------

CELLS = [
    # 1. Title + intro
    ("md", _INTRO),
    # 2. Import
    ("code", "import venn_diagram_lab as vdl\n\nprint(f'venn-diagram-lab {vdl.__version__}')"),
    # 3. When to use
    ("md", _WHEN_TO_USE_MD),
    # 4. Build 2-set dataset
    ("code", _BUILD_2SET_CODE),
    # 5. Templated vs proportional header
    ("md", _TEMPLATE_VS_PROP_MD),
    # 6. Render templated
    ("code", _TEMPLATE_CODE),
    # 7. Render proportional
    ("code", _PROP_CODE),
    # 8. Visual difference discussion
    ("md", _VISUAL_DIFF_MD),
    # 9. Confirm is_approximate False
    ("code", _EXACT_CODE),
    # 10. 3-set proportional header
    ("md", _3SET_MD),
    # 11. Build 3-set and render
    ("code", _BUILD_3SET_CODE),
    # 12. Approximate discussion
    ("md", _APPROX_DISCUSS_MD),
    # 13. 4+ sets header
    ("md", _4SET_MD),
    # 14. IncompatibleModelError demo
    ("code", _4SET_CODE),
    # 15. Alternatives for 4+ sets
    ("md", _ALTERNATIVES_MD),
    # 16. Next steps
    ("md", _NEXT_STEPS),
]

if __name__ == "__main__":
    out = (
        Path(__file__).resolve().parent.parent.parent
        / "examples"
        / "03_proportional_diagrams.ipynb"
    )
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
