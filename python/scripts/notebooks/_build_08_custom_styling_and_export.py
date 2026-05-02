"""Build python/examples/08_custom_styling_and_export.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

# ---------------------------------------------------------------------------
# Cell content constants (kept in named vars to hold lines under 100 chars)
# ---------------------------------------------------------------------------

_INTRO = (
    "# 08 -- Custom Styling and Multi-Format Export\n\n"
    "This notebook covers advanced output control: how to override Venn colours\n"
    "and labels, manipulate the resulting SVG with `lxml`, style UpSet bars in\n"
    "custom palettes, export diagrams to SVG / PNG / PDF at any resolution, and\n"
    "wire up the force-directed network graph with custom node colours and edge\n"
    "metrics.\n\n"
    "**What you will learn:**\n\n"
    "- Override default set names, fill colours, and diagram title at render time\n"
    "- Parse and patch SVG elements with `lxml` (brand-colour tweaks, extra\n"
    "  decorations, accessibility attributes)\n"
    "- Apply per-bar custom colours to the UpSet intersection chart\n"
    "- Export to `.svg`, `.png` (72 dpi / 300 dpi), and `.pdf`; compare file sizes\n"
    "- Customise the network graph: node colours, edge metric, and layout seed\n"
    "- Understand where PowerPoint embedding fits (roadmap pointer)\n"
)

_IMPORT_CODE = (
    "import venn_diagram_lab as vdl\n\n"
    "print(f'venn-diagram-lab {vdl.__version__}')"
)

_LOAD_ANALYZE_CODE = (
    "result = vdl.analyze(\n"
    "    vdl.load_sample('dataset_real_cancer_drivers_4'),\n"
    "    model='auto',\n"
    ")\n\n"
    "# Quick sanity check\n"
    "n_sets = len(result.dataset.set_names)\n"
    "n_items = sum(len(v) for v in result.dataset.items.values())\n"
    "print(f'Sets       : {list(result.dataset.set_names)}')\n"
    "print(f'Universe   : {n_items} items (with overlaps)')\n"
    "print(f'Model      : {result.model}')"
)

_CUSTOM_NAMES_COLORS_MD = "## Custom set names and colors"

_NAMES_COLORS_EXPLAIN_MD = (
    "Every render function accepts optional keyword arguments to override the\n"
    "defaults that come from the loaded dataset:\n\n"
    "| kwarg | Type | Effect |\n"
    "|-------|------|--------|\n"
    "| `set_names` | `dict[str, str]` | Map letter (`'A'`) to display label |\n"
    "| `colors` | `dict[str, str]` | Map letter to CSS hex colour |\n"
    "| `title` | `str` | Diagram heading shown in the SVG |\n\n"
    "Unspecified letters keep the dataset defaults. This is useful when a figure\n"
    "must match corporate or journal colour palettes.\n"
)

_CUSTOM_RENDER_CODE = (
    "img = result.render_venn(\n"
    "    set_names={\n"
    "        'A': 'Vogelstein (2013)',\n"
    "        'B': 'COSMIC CGC',\n"
    "        'C': 'OncoKB',\n"
    "        'D': 'IntOGen',\n"
    "    },\n"
    "    colors={\n"
    "        'A': '#4E79A7',\n"
    "        'B': '#F28E2B',\n"
    "        'C': '#E15759',\n"
    "        'D': '#76B7B2',\n"
    "    },\n"
    "    title='Cancer Driver Gene Databases -- 4-Way Overlap',\n"
    ")\n"
    "img  # displays inline in Jupyter"
)

_LXML_MD = "## Post-render SVG manipulation with lxml"

_LXML_EXPLAIN_MD = (
    "The `SvgImage.svg` attribute holds the raw SVG string. Because it is plain\n"
    "XML, you can parse it with `lxml`, walk the element tree, and modify any\n"
    "attribute before serialising back to a string or saving to disk.\n\n"
    "Typical use-cases:\n\n"
    "- Swap a fill colour for an on-brand hex that differs from the palette\n"
    "- Increase stroke width for high-DPI print\n"
    "- Add `aria-label` attributes for accessibility\n"
    "- Inject a `<title>` or `<desc>` element for screen readers\n"
    "- Embed a logo `<image>` element\n"
)

_LXML_PARSE_CODE = (
    "from lxml import etree\n\n"
    "# Parse the SVG string into an element tree\n"
    "root = etree.fromstring(img.svg.encode())\n\n"
    "# Find ShapeA and override its fill to a darker brand colour\n"
    "for el in root.iter():\n"
    "    if el.attrib.get('id') == 'ShapeA':\n"
    "        original_style = el.attrib.get('style', '')\n"
    "        # Replace only the fill: portion so stroke and opacity are preserved\n"
    "        el.attrib['style'] = original_style.replace(\n"
    "            'fill:#4E79A7', 'fill:#1B4F72'\n"
    "        )\n"
    "        print('Original style:', original_style)\n"
    "        print('Modified style:', el.attrib['style'])\n"
    "        break"
)

_LXML_SERIALIZE_CODE = (
    "modified_svg = etree.tostring(root, encoding='unicode')\n\n"
    "# Confirm the edit is present in the serialised string\n"
    "print(modified_svg[:500])"
)

_LXML_SAVE_CODE = (
    "# Save the hand-patched SVG to disk\n"
    "from pathlib import Path\n\n"
    "patched_path = Path('/tmp/cancer_drivers_patched.svg')\n"
    "patched_path.write_text(modified_svg, encoding='utf-8')\n"
    "print(f'Patched SVG saved: {patched_path} ({patched_path.stat().st_size} bytes)')"
)

_UPSET_COLORS_MD = "## Custom UpSet bar colors"

_UPSET_COLORS_EXPLAIN_MD = (
    "The UpSet chart supports three `color_mode` values:\n\n"
    "| mode | behaviour |\n"
    "|------|-----------|\n"
    "| `'depth'` | colour by intersection degree (default) |\n"
    "| `'heatmap'` | colour by intersection size on a Reds scale |\n"
    "| `'custom'` | colour by label via the `colors` mapping |\n\n"
    "In `'custom'` mode, the `colors` dict maps the intersection label\n"
    "(e.g. `'A'`, `'AB'`, `'ACD'`) to a CSS hex string. Unlabelled\n"
    "intersections fall back to a neutral grey.\n"
)

_UPSET_CODE = (
    "upset_fig = result.render_upset(\n"
    "    color_mode='custom',\n"
    "    colors={\n"
    "        'ABCD': '#9C27B0',  # All four -- purple\n"
    "        'ABC':  '#3F51B5',  # Three-way without IntOGen\n"
    "        'ABD':  '#2196F3',\n"
    "        'ACD':  '#00BCD4',\n"
    "        'BCD':  '#009688',\n"
    "        'AB':   '#4CAF50',\n"
    "        'AC':   '#8BC34A',\n"
    "        'AD':   '#CDDC39',\n"
    "        'BC':   '#FFC107',\n"
    "        'BD':   '#FF9800',\n"
    "        'CD':   '#FF5722',\n"
    "        'A':    '#795548',\n"
    "        'B':    '#9E9E9E',\n"
    "        'C':    '#607D8B',\n"
    "        'D':    '#F44336',\n"
    "    },\n"
    ")\n"
    "upset_fig  # displays inline in Jupyter"
)

_EXPORT_MD = "## Multi-format export"

_EXPORT_EXPLAIN_MD = (
    "### Format and DPI trade-offs\n\n"
    "| Format | Use-case | Notes |\n"
    "|--------|----------|-------|\n"
    "| `.svg` | Web, slides, further editing | Vector; infinitely scalable; "
    "smallest file |\n"
    "| `.png` @ 72 dpi | Screen / presentation preview | Fast; compact; "
    "not print-ready |\n"
    "| `.png` @ 300 dpi | Journal figures, posters | ~4x larger than 72 dpi; "
    "sharp at print size |\n"
    "| `.pdf` | Publication submission, LaTeX `\\includegraphics` | Vector; "
    "universally accepted |\n\n"
    "The `save()` method accepts a `dpi` keyword (ignored for SVG).\n"
    "The DPI scale is applied as a multiplier on the native SVG canvas size\n"
    "(baseline 96 dpi), so `dpi=300` produces an image roughly 3x wider and\n"
    "taller in pixels than `dpi=96`.\n"
)

_EXPORT_CODE = (
    "from pathlib import Path\n\n"
    "out_dir = Path('/tmp/exports')\n"
    "out_dir.mkdir(exist_ok=True)\n\n"
    "# Render once, save four ways\n"
    "venn_img = result.render_venn(\n"
    "    title='Cancer Driver Gene Databases',\n"
    "    colors={'A': '#4E79A7', 'B': '#F28E2B', 'C': '#E15759', 'D': '#76B7B2'},\n"
    ")\n\n"
    "venn_img.save(out_dir / 'diagram.svg')\n"
    "venn_img.save(out_dir / 'diagram_screen.png', dpi=72)\n"
    "venn_img.save(out_dir / 'diagram_print.png', dpi=300)\n"
    "venn_img.save(out_dir / 'diagram.pdf')\n\n"
    "print(f'{'File':<25}  {'Bytes':>10}  {'KB':>8}')\n"
    "print('-' * 48)\n"
    "for f in sorted(out_dir.iterdir()):\n"
    "    sz = f.stat().st_size\n"
    "    print(f'{f.name:<25}  {sz:>10,}  {sz/1024:>7.1f}')"
)

_EXPORT_DISCUSSION_MD = (
    "### When to use each format\n\n"
    "**SVG** is the best choice for most downstream workflows: it can be opened\n"
    "in Inkscape or Illustrator for final polish, embedded in HTML without\n"
    "re-encoding, and scaled to any size without quality loss.\n\n"
    "**PNG @ 72 dpi** is convenient for quick previews in slide decks or wikis\n"
    "where file size matters more than sharpness.\n\n"
    "**PNG @ 300 dpi** meets the minimum requirement of most journals (Nature,\n"
    "Cell, PLOS) for raster figure submissions. For a 700 x 700 px SVG canvas,\n"
    "300 dpi yields a ~2188 x 2188 px PNG.\n\n"
    "**PDF** is preferred for LaTeX (`\\\\includegraphics{diagram.pdf}`) and\n"
    "for journal-submission portals that accept vector figures, because it\n"
    "embeds fonts and curves exactly. File size is close to SVG.\n"
)

_PPTX_MD = (
    "## PowerPoint embedding (future work)\n\n"
    "For PowerPoint reports, install `python-pptx`:\n\n"
    "    !pip install python-pptx\n\n"
    "Then embed the diagram as a PNG image on a slide:\n\n"
    "```python\n"
    "# NOTE: code shown for reference only -- python-pptx is NOT installed in\n"
    "# this notebook. Run it in an environment where python-pptx is available.\n"
    "#\n"
    "# from pptx import Presentation\n"
    "# from pptx.util import Inches\n"
    "#\n"
    "# prs = Presentation()\n"
    "# slide = prs.slides.add_slide(prs.slide_layouts[5])  # blank layout\n"
    "#\n"
    "# # Export Venn at 300 dpi first\n"
    "# venn_img.save('/tmp/diagram_print.png', dpi=300)\n"
    "#\n"
    "# # Add picture to slide (left=0.5in, top=1in, width=5in)\n"
    "# slide.shapes.add_picture(\n"
    "#     '/tmp/diagram_print.png',\n"
    "#     left=Inches(0.5), top=Inches(1.0), width=Inches(5.0),\n"
    "# )\n"
    "# prs.save('cancer_drivers_report.pptx')\n"
    "```\n\n"
    "Native EMF/WMF embedding (true vector in PowerPoint) requires an SVG-to-EMF\n"
    "converter such as `librsvg` + `unoconv`. This is tracked as a future\n"
    "enhancement in the project roadmap.\n"
)

_NETWORK_COLORS_MD = "## Network plot custom node colors"

_NETWORK_COLORS_EXPLAIN_MD = (
    "The `render_network()` function accepts a `node_color_map` dict mapping\n"
    "set letters to hex colours. Node size is proportional to the set's\n"
    "cardinality (total item count). Edge thickness and colour reflect the\n"
    "chosen edge metric and statistical significance.\n"
)

_NETWORK_COLORS_CODE = (
    "net_custom = result.render_network(\n"
    "    node_color_map={\n"
    "        'A': '#4E79A7',  # Vogelstein -- steel blue\n"
    "        'B': '#F28E2B',  # COSMIC CGC -- amber\n"
    "        'C': '#E15759',  # OncoKB -- coral\n"
    "        'D': '#76B7B2',  # IntOGen -- teal\n"
    "    },\n"
    ")\n"
    "net_custom  # displays inline in Jupyter"
)

_EDGE_METRIC_MD = "## Edge metric override"

_EDGE_METRIC_EXPLAIN_MD = (
    "By default, edge weight is the raw intersection count (`'intersection'`).\n"
    "Switch to `'jaccard'` for a normalised similarity coefficient that is\n"
    "independent of set size -- more informative when sets vary greatly in\n"
    "cardinality. Available metrics:\n\n"
    "| metric | range | meaning |\n"
    "|--------|-------|---------|\n"
    "| `'intersection'` | 0 .. N | Raw shared item count |\n"
    "| `'jaccard'` | 0 .. 1 | Jaccard similarity (|A & B| / |A | B|) |\n"
)

_EDGE_METRIC_CODE = (
    "net_jaccard = result.render_network(edge_metric='jaccard')\n"
    "net_jaccard  # displays inline in Jupyter"
)

_SEED_MD = "## Reproducible layouts via seed"

_SEED_EXPLAIN_MD = (
    "The force-directed layout (Fruchterman-Reingold) is seeded for\n"
    "determinism. The default seed is `42`. Changing the seed shifts the\n"
    "node positions while preserving all edge weights and colours -- useful\n"
    "when the default layout places a label on top of an edge.\n\n"
    "Both calls below use `edge_metric='jaccard'` so only the layout differs.\n"
)

_SEED_CODE = (
    "net_seed7 = result.render_network(edge_metric='jaccard', seed=7)\n"
    "net_seed7  # displays inline in Jupyter"
)

_WRAP_UP_MD = (
    "## Wrap-up -- all 8 notebooks\n\n"
    "You have reached the end of the `venn-diagram-lab` example series.\n"
    "Here is a quick reference to all notebooks:\n\n"
    "| # | Notebook | Focus |\n"
    "|---|----------|-------|\n"
    "| 1 | [`01_quickstart.ipynb`](01_quickstart.ipynb)"
    " | Install, load sample data, first Venn |\n"
    "| 2 | [`02_real_cancer_drivers.ipynb`](02_real_cancer_drivers.ipynb)"
    " | End-to-end walkthrough with biological data |\n"
    "| 3 | [`03_proportional_diagrams.ipynb`](03_proportional_diagrams.ipynb)"
    " | Area-proportional Venn for 2-3 sets |\n"
    "| 4 | [`04_upset_vs_venn_vs_network.ipynb`](04_upset_vs_venn_vs_network.ipynb)"
    " | Compare three view types side by side |\n"
    "| 5 | [`05_statistics_deep_dive.ipynb`](05_statistics_deep_dive.ipynb)"
    " | Jaccard, Dice, hypergeometric, BH-FDR |\n"
    "| 6 | [`06_pipeline_integration.ipynb`](06_pipeline_integration.ipynb)"
    " | CLI, Snakemake, Nextflow |\n"
    "| 7 | [`07_pdf_reports.ipynb`](07_pdf_reports.ipynb)"
    " | One-call multi-page PDF reports |\n"
    "| 8 | [`08_custom_styling_and_export.ipynb`](08_custom_styling_and_export.ipynb)"
    " | **This notebook** -- lxml, palettes, multi-format export |\n\n"
    "For the full API reference run `help(vdl)` or consult the project README.\n"
)

# ---------------------------------------------------------------------------
# Cell list -- 25 cells
# ---------------------------------------------------------------------------

CELLS = [
    # 1. Title + intro
    ("md", _INTRO),
    # 2. Import vdl + version
    ("code", _IMPORT_CODE),
    # 3. Load + analyze
    ("code", _LOAD_ANALYZE_CODE),
    # 4. Section header
    ("md", _CUSTOM_NAMES_COLORS_MD),
    # 5. Explain kwarg table
    ("md", _NAMES_COLORS_EXPLAIN_MD),
    # 6. render_venn with set_names + colors + title
    ("code", _CUSTOM_RENDER_CODE),
    # 7. Section header
    ("md", _LXML_MD),
    # 8. Explain lxml use-cases
    ("md", _LXML_EXPLAIN_MD),
    # 9. Parse SVG + patch ShapeA fill
    ("code", _LXML_PARSE_CODE),
    # 10. Serialise and print first 500 chars
    ("code", _LXML_SERIALIZE_CODE),
    # 11. Save patched SVG to disk
    ("code", _LXML_SAVE_CODE),
    # 12. Section header
    ("md", _UPSET_COLORS_MD),
    # 13. Explain color_mode options
    ("md", _UPSET_COLORS_EXPLAIN_MD),
    # 14. render_upset with color_mode="custom"
    ("code", _UPSET_CODE),
    # 15. Section header
    ("md", _EXPORT_MD),
    # 16. Format + DPI trade-offs table
    ("md", _EXPORT_EXPLAIN_MD),
    # 17. Save SVG / PNG@72 / PNG@300 / PDF; list sizes
    ("code", _EXPORT_CODE),
    # 18. When-to-use discussion
    ("md", _EXPORT_DISCUSSION_MD),
    # 19. PowerPoint embedding (markdown only, no code cell)
    ("md", _PPTX_MD),
    # 20. Section header
    ("md", _NETWORK_COLORS_MD),
    # 21. Explain node_color_map
    ("md", _NETWORK_COLORS_EXPLAIN_MD),
    # 22. render_network with custom node colours
    ("code", _NETWORK_COLORS_CODE),
    # 23. Section header + edge metric table
    ("md", _EDGE_METRIC_MD),
    # 24. Explain edge metrics
    ("md", _EDGE_METRIC_EXPLAIN_MD),
    # 25. render_network with edge_metric="jaccard"
    ("code", _EDGE_METRIC_CODE),
    # 26. Section header
    ("md", _SEED_MD),
    # 27. Explain seed
    ("md", _SEED_EXPLAIN_MD),
    # 28. render_network with seed=7
    ("code", _SEED_CODE),
    # 29. Wrap-up table of all 8 notebooks
    ("md", _WRAP_UP_MD),
]

if __name__ == "__main__":
    out = (
        Path(__file__).resolve().parent.parent.parent
        / "examples"
        / "08_custom_styling_and_export.ipynb"
    )
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
