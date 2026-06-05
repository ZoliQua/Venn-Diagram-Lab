"""Build python/examples/02_real_cancer_drivers.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

# ---------------------------------------------------------------------------
# Cell content constants (extracted to keep lines under 100 chars)
# ---------------------------------------------------------------------------

_INTRO = (
    "# 02 -- Real Cancer Drivers: Comparing Four Catalogs\n\n"
    "Cancer driver genes are those whose mutation confers a selective growth advantage to tumor\n"
    "cells. Multiple research groups have independently curated catalogs of such genes, each\n"
    "applying different evidence thresholds and computational methods:\n\n"
    "| Catalog | Short name | Description |\n"
    "|---------|------------|-------------|\n"
    "| Vogelstein *et al.* 2013 | **Vogelstein** | 138 curated high-confidence drivers |\n"
    "| COSMIC Cancer Gene Census | **COSMIC_CGC** | ~580 genes from somatic mutation data |\n"
    "| OncoKB | **OncoKB** | Precision oncology knowledge base (~1200 genes) |\n"
    "| IntOGen | **IntOGen** | Computational pan-cancer drivers (~630 genes) |\n\n"
    "This notebook answers:\n\n"
    "- How much do the catalogs agree?\n"
    "- Which genes appear in **all four** catalogs?\n"
    "- Are the overlaps statistically significant?\n"
    "- How can we customize the diagram for a manuscript?\n"
)

_LOAD_MD = (
    "## Load the dataset\n\n"
    "The sample `dataset_real_cancer_drivers_4` ships with the package. "
    "It encodes set membership as a 4-column TSV where each column represents "
    "one catalog and each row is a gene."
)

_LOAD_CODE = (
    "ds = vdl.load_sample('dataset_real_cancer_drivers_4')\n"
    "print('Sets:', ds.set_names)"
)

_SIZES_MD = (
    "## Catalog sizes\n\n"
    "Before comparing, check the raw size of each catalog. "
    "Large size differences affect all similarity metrics."
)

_SIZES_CODE = (
    "for name in ds.set_names:\n"
    "    print(f'  {name:15s}: {len(ds.items[name]):4d} genes')"
)

_ANALYZE_MD = (
    "## Run the analysis\n\n"
    "`vdl.analyze` picks the best-matching Venn model automatically "
    "(`model='auto'`). For 4 sets it selects the 4-set Edwards-Venn diagram."
)

_ANALYZE_CODE = (
    "result = vdl.analyze(ds, model='auto')\n"
    "print('Model :', result.model)\n"
    "print('Set sizes:', dict(result.set_sizes))"
)

_DEFAULT_RENDER_MD = (
    "## Default Venn diagram\n\n"
    "The diagram renders inline in Jupyter via `_repr_svg_`. "
    "The counts shown in each region are the number of **exclusive** items "
    "(genes that belong to exactly that combination of sets)."
)

_CORE_MD = (
    "## The 'core' driver genes (intersection of all 4 catalogs)\n\n"
    "Bitmask `0b1111` (= 15) selects the region belonging to **all four** sets simultaneously. "
    "`exclusive_items` are the genes found in every catalog."
)

_CORE_CODE = (
    "ABCD = 0b1111  # all four sets\n"
    "if ABCD in result.regions:\n"
    "    core_genes = result.regions[ABCD].exclusive_items\n"
    "    print(f'{len(core_genes)} genes appear in all 4 catalogs.')\n"
    "    print('First 10:', list(core_genes)[:10])\n"
    "else:\n"
    "    print('No genes appear in all 4 catalogs simultaneously.')"
)

_CORE_DISCUSS = (
    "### Interpretation\n\n"
    "These **core driver genes** represent the highest-confidence subset: "
    "every major catalog independently identified them as cancer drivers using "
    "different data sources and scoring methods. "
    "They are strong candidates for targeted therapy development and biomarker validation.\n\n"
    "The large size of the COSMIC_CGC, OncoKB, and IntOGen catalogs relative to Vogelstein "
    "reflects the different scope of each resource -- Vogelstein deliberately curated a "
    "conservative high-confidence list, while the others cast a wider net."
)

_JACCARD_MD = (
    "## Pairwise Jaccard similarity\n\n"
    "Jaccard(A, B) = |A & B| / |A | B|. Values range from 0 (no overlap) to 1 (identical).\n"
    "The matrix is symmetric; diagonal entries are 1."
)

_JACCARD_INTERPRET = (
    "### Interpretation\n\n"
    "COSMIC_CGC and OncoKB share the highest Jaccard (~0.47), reflecting that both are "
    "broad community databases updated with overlapping literature. "
    "Vogelstein has the lowest similarity to all others because it is the smallest and most "
    "conservative catalog."
)

_DICE_MD = (
    "## Pairwise Dice similarity\n\n"
    "Dice(A, B) = 2|A ∩ B| / (|A| + |B|). Dice is always >= Jaccard for the same pair "
    "because it penalizes size differences less harshly."
)

_HYPER_MD = (
    "## Hypergeometric over-representation\n\n"
    "For each pair the hypergeometric test asks: "
    "*given the universe of all genes (~20,000), is the overlap larger than expected by chance?* "
    "Significant pairs (BH-adjusted p < 0.05) indicate genuine co-annotation."
)

_HYPER_DISCUSS = (
    "### Discussion\n\n"
    "All six pairs are overwhelmingly significant (BH-FDR p << 0.001), confirming that "
    "the catalog overlaps are not random against a ~20,000-gene background. "
    "Fold enrichments range from ~12x (OncoKB / IntOGen, the two largest catalogs, "
    "where the denominator effect dampens the ratio) up to ~31x (Vogelstein / COSMIC_CGC, "
    "where the small Vogelstein list overlaps almost completely with the larger CGC). "
    "Several large-vs-large pairs return p = 0.0 in double precision; the package's "
    "`p_adjusted` column applies BH-FDR but the correction is dwarfed by the raw "
    "effect sizes."
)

_V223_MD = (
    "## v2.2.3 — Cluster patterns and core/accessory split\n\n"
    "Two new render functions surface the dataset's *shape* in addition to its\n"
    "pairwise statistics:\n\n"
    "- **Item Share Distribution** -- how many genes appear in 1, 2, 3, 4 catalogs?\n"
    "  The first bar (genes seen in exactly one catalog) is the **accessory** set;\n"
    "  the last bar (genes in all four) is the **core** consensus.\n"
    "- **Cluster heatmap** -- UPGMA-reordered Jaccard similarity matrix with\n"
    "  L-shaped dendrograms; reveals which catalogs cluster together.\n"
)

_SHAREDIST_CODE = (
    "from venn_diagram_lab.render.svg import render_share_distribution_svg\n\n"
    "render_share_distribution_svg(ds)"
)

_CLUSTER_CODE = (
    "from venn_diagram_lab.render.svg import render_cluster_heatmap_svg\n\n"
    "render_cluster_heatmap_svg(result, linkage='average')"
)

_V223_INTERPRET_MD = (
    "### Interpretation\n\n"
    "The share distribution shows the catalogs disagree more than they agree:\n"
    "many genes appear in only one or two of the four lists (the *accessory*\n"
    "drivers), while a small core appears in all four (the highest-confidence\n"
    "consensus drivers). The cluster heatmap places COSMIC_CGC and OncoKB as\n"
    "the closest pair (large, broadly curated databases) while Vogelstein sits\n"
    "apart -- its conservative high-confidence list shares fewer genes in\n"
    "absolute terms even though most Vogelstein genes appear elsewhere.\n"
)

_CUSTOM_MD = (
    "## Customize names and colors\n\n"
    "Use `set_names` to apply publication-ready labels and `colors` to assign brand colors. "
    "The `title` argument sets the diagram heading."
)

_CUSTOM_CODE = (
    "result.render_venn(\n"
    "    set_names={\n"
    "        'A': 'Vogelstein 2013',\n"
    "        'B': 'COSMIC CGC',\n"
    "        'C': 'OncoKB',\n"
    "        'D': 'IntOGen',\n"
    "    },\n"
    "    colors={\n"
    "        'A': '#FF6B6B',\n"
    "        'B': '#4ECDC4',\n"
    "        'C': '#45B7D1',\n"
    "        'D': '#FFA07A',\n"
    "    },\n"
    "    title='Cancer driver gene catalogs',\n"
    ")"
)

_EXPORT_MD = (
    "## Export for a manuscript\n\n"
    "`SvgImage.save(path, dpi=300)` produces publication-grade rasters. "
    "Pass a `.svg` path for lossless vector output (preferred for journal submissions) "
    "or `.png` / `.pdf` for raster/PDF output."
)

_EXPORT_CODE = (
    "from pathlib import Path\n\n"
    "img = result.render_venn(\n"
    "    set_names={\n"
    "        'A': 'Vogelstein 2013',\n"
    "        'B': 'COSMIC CGC',\n"
    "        'C': 'OncoKB',\n"
    "        'D': 'IntOGen',\n"
    "    },\n"
    "    colors={\n"
    "        'A': '#FF6B6B',\n"
    "        'B': '#4ECDC4',\n"
    "        'C': '#45B7D1',\n"
    "        'D': '#FFA07A',\n"
    "    },\n"
    "    title='Cancer driver gene catalogs',\n"
    ")\n\n"
    "out_png = Path('/tmp/cancer_drivers_venn.png')\n"
    "out_svg = Path('/tmp/cancer_drivers_venn.svg')\n"
    "img.save(out_png, dpi=300)\n"
    "img.save(out_svg)\n"
    "print(f'PNG: {out_png} ({out_png.stat().st_size:,} bytes)')\n"
    "print(f'SVG: {out_svg} ({out_svg.stat().st_size:,} bytes)')"
)

_NEXT_STEPS = (
    "## Next steps\n\n"
    "- [`03_proportional_diagrams.ipynb`](03_proportional_diagrams.ipynb)"
    " -- area-proportional Venn diagrams where region size reflects gene count\n"
    "- [`05_statistics_deep_dive.ipynb`](05_statistics_deep_dive.ipynb)"
    " -- deep dive into Jaccard, Dice, and hypergeometric enrichment\n"
    "- [`07_pdf_reports.ipynb`](07_pdf_reports.ipynb)"
    " -- generate a publication-ready multi-page PDF report\n"
)

# ---------------------------------------------------------------------------
# Cell list -- alternating md + code, ~26 cells
# ---------------------------------------------------------------------------

CELLS = [
    # 1. Title + intro
    ("md", _INTRO),
    # 2. Import
    ("code", "import venn_diagram_lab as vdl\n\nprint(f'venn-diagram-lab {vdl.__version__}')"),
    # 3. Load section header
    ("md", _LOAD_MD),
    # 4. Load dataset
    ("code", _LOAD_CODE),
    # 5. Catalog sizes header
    ("md", _SIZES_MD),
    # 6. Per-set size loop
    ("code", _SIZES_CODE),
    # 7. Analyze header
    ("md", _ANALYZE_MD),
    # 8. Run analysis
    ("code", _ANALYZE_CODE),
    # 9. Default render header
    ("md", _DEFAULT_RENDER_MD),
    # 10. Default render
    ("code", "result.render_venn()"),
    # 11. Core intersection header
    ("md", _CORE_MD),
    # 12. Core intersection code
    ("code", _CORE_CODE),
    # 13. Core discussion
    ("md", _CORE_DISCUSS),
    # 14. Jaccard header
    ("md", _JACCARD_MD),
    # 15. Jaccard matrix
    ("code", "result.statistics.jaccard"),
    # 16. Jaccard interpretation
    ("md", _JACCARD_INTERPRET),
    # 17. Dice header
    ("md", _DICE_MD),
    # 18. Dice matrix
    ("code", "result.statistics.dice"),
    # 19. Hypergeometric header
    ("md", _HYPER_MD),
    # 20. Hypergeometric table
    ("code", "result.statistics.hypergeometric"),
    # 21. Hypergeometric discussion
    ("md", _HYPER_DISCUSS),
    # 21b. v2.2.3 — Cluster patterns + core/accessory split
    ("md", _V223_MD),
    ("code", _SHAREDIST_CODE),
    ("code", _CLUSTER_CODE),
    ("md", _V223_INTERPRET_MD),
    # 22. Customize header
    ("md", _CUSTOM_MD),
    # 23. Customize render
    ("code", _CUSTOM_CODE),
    # 24. Export header
    ("md", _EXPORT_MD),
    # 25. Export code
    ("code", _EXPORT_CODE),
    # 26. Next steps
    ("md", _NEXT_STEPS),
]

if __name__ == "__main__":
    out = (
        Path(__file__).resolve().parent.parent.parent
        / "examples"
        / "02_real_cancer_drivers.ipynb"
    )
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
