"""Build python/examples/10_enrichment_plots_comparison.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

# ---------------------------------------------------------------------------
# Cell content constants
# ---------------------------------------------------------------------------

_INTRO = (
    "# 10 -- Enrichment Plot Families: Bar, Lollipop, Heatmap, Cluster Heatmap, Share Distribution\n\n"
    "venn-diagram-lab ships five complementary plots for the *same* underlying\n"
    "pairwise statistics. Each emphasises a different aspect of the data, and\n"
    "the PDF report uses them together to give a complete picture. This\n"
    "notebook renders all five on one dataset side-by-side and explains which\n"
    "to pick when.\n\n"
    "**Audience:** researchers choosing between visualisations for a paper\n"
    "or talk.\n\n"
    "**The five plot families:**\n\n"
    "1. **Bar chart** -- vertical bars per pair, ranked, easy to compare absolute\n"
    "   magnitudes (`-log10(FDR)` or fold enrichment).\n"
    "2. **Lollipop chart** -- same data as bar but with point markers; cleaner\n"
    "   for dense pair lists and emphasises rank order.\n"
    "3. **Heatmap** -- square matrix of pairs; reveals symmetric structure and\n"
    "   block patterns at a glance.\n"
    "4. **Cluster heatmap** -- adds UPGMA-reordered axes + dendrograms; surfaces\n"
    "   which catalogs form natural groups.\n"
    "5. **Item Share Distribution** -- histogram of items by *how many* sets they\n"
    "   appear in; reveals the core/accessory split.\n"
)

_SETUP_CODE = (
    "import venn_diagram_lab as vdl\n"
    "from IPython.display import display\n\n"
    "ds = vdl.load_sample('dataset_real_cancer_drivers_4')\n"
    "result = vdl.analyze(ds, model='auto')\n"
    "print(f'venn-diagram-lab {vdl.__version__}')\n"
    "print('Sets:', result.dataset.set_names)\n"
    "print('Set sizes:', dict(result.set_sizes))"
)

_BAR_MD = (
    "## 1. Bar chart -- ranked magnitudes\n\n"
    "Bars are the most familiar encoding for magnitude. Use the bar chart when\n"
    "the audience needs to compare absolute values across pairs (e.g. *Vogelstein /\n"
    "COSMIC_CGC is twice as enriched as Vogelstein / IntOGen*). Default metric\n"
    "is `-log10(FDR)`; significance markers (`***`/`**`/`*`) sit at the bar tip.\n"
)

_BAR_CODE = (
    "from venn_diagram_lab.render.svg import render_enrichment_bar_svg\n\n"
    "display(render_enrichment_bar_svg(result))"
)

_LOLLI_MD = (
    "## 2. Lollipop chart -- cleaner for dense pair lists\n\n"
    "Lollipops replace the bar with a stem + circle marker. The reduced ink\n"
    "makes long lists (10+ pairs) more legible without sacrificing the rank\n"
    "information. Same metric options as bar.\n"
)

_LOLLI_CODE = (
    "from venn_diagram_lab.render.svg import render_enrichment_lollipop_svg\n\n"
    "display(render_enrichment_lollipop_svg(result))"
)

_HEATMAP_MD = (
    "## 3. Heatmap -- symmetric matrix view\n\n"
    "The heatmap shows the full N x N similarity matrix (Jaccard by default).\n"
    "Strengths: surfaces symmetric structure instantly, no labelling needed for\n"
    "the diagonal, and the colour gradient makes outlier pairs pop. Weakness:\n"
    "harder to read exact values without hover tooltips.\n"
)

_HEATMAP_CODE = (
    "from venn_diagram_lab.render.svg import render_cluster_heatmap_svg\n\n"
    "# Without dendrograms -- pure heatmap, axes in input order.\n"
    "display(render_cluster_heatmap_svg(\n"
    "    result,\n"
    "    show_row_dendrogram=False,\n"
    "    show_col_dendrogram=False,\n"
    "))"
)

_CLUSTER_MD = (
    "## 4. Cluster heatmap -- which catalogs group together?\n\n"
    "Adding row + column dendrograms (UPGMA / `linkage='average'` by default)\n"
    "reorders both axes so similar sets sit next to each other. The L-shaped\n"
    "dendrogram overlays show the merge order. Use this when the question\n"
    "shifts from *how similar is pair X?* to *which catalogs cluster?*\n"
)

_CLUSTER_CODE = (
    "display(render_cluster_heatmap_svg(\n"
    "    result,\n"
    "    linkage='average',\n"
    "    show_row_dendrogram=True,\n"
    "    show_col_dendrogram=True,\n"
    "))"
)

_DECISION_MD = (
    "## Decision table\n\n"
    "| Plot | Use when... | Avoid when... |\n"
    "|------|------------|---------------|\n"
    "| Bar | You need exact magnitudes per pair | >15 pairs (gets crowded) |\n"
    "| Lollipop | Dense pair list, rank matters | Audience expects classic bars |\n"
    "| Heatmap | Symmetric structure should pop visually | Exact values critical |\n"
    "| Cluster heatmap | Audience needs to see catalog groupings | Set count < 4 (no cluster signal) |\n"
    "| Share distribution | You want to discuss the core/accessory split | Set count = 2 (degenerate) |\n"
)

_FE_MD = (
    "## Switching the metric: fold enrichment\n\n"
    "Both bar and lollipop accept a `metric` keyword. Default is\n"
    "`'neglog10fdr'` (significance scale); switching to `'foldEnrichment'`\n"
    "(effect-size scale) tells a different story for the same pairs.\n"
    "Use FE when the audience cares about *how big* the over-representation\n"
    "is rather than *how confident* we are it isn't noise.\n"
)

_FE_CODE = (
    "display(render_enrichment_bar_svg(result, metric='foldEnrichment'))\n"
    "display(render_enrichment_lollipop_svg(result, metric='foldEnrichment'))"
)

_SHAREDIST_MD = (
    "## 5. Item Share Distribution -- the 5th, complementary plot\n\n"
    "The other four plots all summarise *pairwise* statistics. The share\n"
    "distribution asks a different question: *across the entire dataset,\n"
    "how many items appear in exactly 1, 2, 3, ..., N sets?* The result\n"
    "is a single histogram that reveals the **core/accessory split**:\n"
    "tall left bar = mostly unique items (low overlap); tall right bar =\n"
    "mostly shared items (high consensus).\n\n"
    "It is computed on the `Dataset` (not the `RegionResult`) because it\n"
    "only depends on item membership, not on which Venn model was chosen.\n"
)

_SHAREDIST_CODE = (
    "from venn_diagram_lab.render.svg import render_share_distribution_svg\n\n"
    "display(render_share_distribution_svg(ds))"
)

_PDF_PLACEMENT_MD = (
    "## How the PDF report uses each plot\n\n"
    "All five plots appear in the multi-page report generated by\n"
    "`result.to_pdf_report()` (see notebook 07). The placement mirrors a\n"
    "narrative arc:\n\n"
    "1. **Page 1 -- Overview**: set sizes + share distribution (core vs accessory).\n"
    "2. **Page 2 -- Visual summary**: Venn + UpSet (set membership).\n"
    "3. **Page 3+ -- Pairwise stats**: Jaccard / Dice / Enrichment tables, then\n"
    "   the bar, lollipop, and cluster heatmap plots in that order.\n"
    "4. **Final page**: Network + methodology explanations.\n\n"
    "Each plot complements the next: the table gives exact numbers, the bar\n"
    "ranks them, the lollipop densifies, the cluster heatmap exposes groups,\n"
    "and the share distribution closes the loop by showing how the universe\n"
    "as a whole partitions.\n"
)

_NEXT_STEPS_MD = (
    "## Next steps\n\n"
    "- [`05_statistics_deep_dive.ipynb`](05_statistics_deep_dive.ipynb)"
    " -- the formulae underlying every plot here\n"
    "- [`07_pdf_reports.ipynb`](07_pdf_reports.ipynb)"
    " -- bundle every plot into a single PDF\n"
)

# ---------------------------------------------------------------------------
# Cell list
# ---------------------------------------------------------------------------

CELLS = [
    ("md", _INTRO),
    ("code", _SETUP_CODE),
    ("md", _BAR_MD),
    ("code", _BAR_CODE),
    ("md", _LOLLI_MD),
    ("code", _LOLLI_CODE),
    ("md", _HEATMAP_MD),
    ("code", _HEATMAP_CODE),
    ("md", _CLUSTER_MD),
    ("code", _CLUSTER_CODE),
    ("md", _DECISION_MD),
    ("md", _FE_MD),
    ("code", _FE_CODE),
    ("md", _SHAREDIST_MD),
    ("code", _SHAREDIST_CODE),
    ("md", _PDF_PLACEMENT_MD),
    ("md", _NEXT_STEPS_MD),
]

if __name__ == "__main__":
    out = (
        Path(__file__).resolve().parent.parent.parent
        / "examples"
        / "10_enrichment_plots_comparison.ipynb"
    )
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
