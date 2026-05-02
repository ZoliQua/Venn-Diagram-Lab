"""Build python/examples/05_statistics_deep_dive.ipynb."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _build import build_notebook  # sys.path bootstrap for sibling import

# ---------------------------------------------------------------------------
# Cell content constants (kept in named vars to hold lines under 100 chars)
# ---------------------------------------------------------------------------

_INTRO = (
    "# 05 -- Statistics Deep Dive: Jaccard, Dice, Overlap, Enrichment, and BH-FDR\n\n"
    "Every pairwise statistics table produced by `result.statistics` answers a subtly\n"
    "different question. Picking the right metric prevents misleading conclusions:\n\n"
    "- **Jaccard**: how much do two sets overlap relative to everything in either set?\n"
    "- **Dice (Sorensen-Dice)**: same signal, but weighted toward moderate overlap.\n"
    "- **Overlap coefficient**: is one set almost completely contained in the other?\n"
    "- **Fold enrichment**: how many times greater is the observed overlap than chance?\n"
    "- **Hypergeometric p-value**: is the overlap statistically significant?\n"
    "- **BH-FDR adjusted p**: can we trust that significance after testing 6 pairs at once?\n\n"
    "**What you will learn:**\n\n"
    "- The formula, range, and intuition behind each metric\n"
    "- How to read and visualise each matrix from `result.statistics`\n"
    "- Why Dice is always >= Jaccard for the same data\n"
    "- What BH-FDR does and when it matters\n"
    "- How to reproduce the web tool's TSV export in one line\n"
)

_IMPORT_CODE = (
    "import venn_diagram_lab as vdl\n\n"
    "# 4-set real cancer-driver dataset (Vogelstein, COSMIC CGC, OncoKB, IntOGen)\n"
    "result = vdl.analyze(vdl.load_sample('dataset_real_cancer_drivers_4'), model='auto')\n\n"
    "print(f'venn-diagram-lab {vdl.__version__}')\n"
    "print('Sets:', result.dataset.set_names)\n"
    "print('Set sizes (inclusive):', result.set_sizes)\n"
    "print('Universe (total unique items):', sum(\n"
    "    r.exclusive_count for r in result.regions.values()\n"
    "))"
)

_METRICS_OVERVIEW_MD = "## Set similarity metrics overview"

_DEFINITIONS_TABLE_MD = (
    "The three similarity coefficients and two enrichment measures share the same raw\n"
    "inputs -- two set sizes and their intersection -- but combine them differently.\n\n"
    "| Metric | Formula | Range | Diagonal |\n"
    "|--------|---------|-------|----------|\n"
    "| Jaccard | `|A and B| / |A or B|` | [0, 1] | 1.0 |\n"
    "| Dice | `2|A and B| / (|A| + |B|)` | [0, 1] | 1.0 |\n"
    "| Overlap coeff. | `|A and B| / min(|A|, |B|)` | [0, 1] | 1.0 |\n"
    "| Fold enrichment | `(k * N) / (K * n)` | [0, +inf) | NaN |\n"
    "| Hypergeometric p | `P(X >= k)`, X ~ Hypergeom(N, K, n) | (0, 1] | -- |\n\n"
    "Notation: `k` = observed intersection, `K` = |set A| inclusive,\n"
    "`n` = |set B| inclusive, `N` = universe size (total unique items).\n"
)

_JACCARD_MD = "## Jaccard similarity"

_JACCARD_FORMULA_MD = (
    "**Formula:** `J(A, B) = |A and B| / |A or B|`\n\n"
    "where `|A or B| = |A| + |B| - |A and B|`.\n\n"
    "Range is **[0, 1]**: 0 means the sets are completely disjoint; 1 means they are\n"
    "identical. Because the denominator is the union (everything in either set),\n"
    "Jaccard is *penalised* by large non-overlapping portions of both sets.\n"
    "It is the standard metric for comparing gene sets in the bioinformatics\n"
    "literature (GSEApy, GeneSetTools, EnrichR all report it).\n"
)

_JACCARD_CODE = "result.statistics.jaccard"

_JACCARD_INTERP_MD = (
    "**Reading the table:**\n\n"
    "- `COSMIC_CGC / OncoKB = 0.47` -- the two largest catalogs share nearly half\n"
    "  their union, suggesting substantial consensus.\n"
    "- `Vogelstein / OncoKB = 0.11` -- the small Vogelstein list (138 genes) contributes\n"
    "  little to OncoKB's 1231-gene union, so the score is low even though most\n"
    "  Vogelstein genes appear in OncoKB (high overlap coefficient, see below).\n"
    "- The matrix is symmetric; the diagonal is 1.0 by definition.\n"
)

_JACCARD_HEATMAP_CODE = (
    "# Pandas Styler renders inline in Jupyter as a coloured HTML table.\n"
    "result.statistics.jaccard.style.background_gradient(cmap='Reds').format('{:.3f}')"
)

_DICE_MD = "## Dice (Sorensen-Dice) coefficient"

_DICE_FORMULA_MD = (
    "**Formula:** `D(A, B) = 2|A and B| / (|A| + |B|)`\n\n"
    "Range is **[0, 1]**. Dice is exactly twice Jaccard divided by (1 + Jaccard),\n"
    "so it is a monotonic transformation of Jaccard: the ranking of pairs is preserved,\n"
    "but every value is *higher* than the corresponding Jaccard because the denominator\n"
    "is smaller (sum of sizes vs. union).\n\n"
    "Dice is equivalent to the **F1 score** in information retrieval, making it\n"
    "natural when you think of one set as 'retrieved' and the other as 'relevant'.\n"
)

_DICE_CODE = "result.statistics.dice"

_DICE_NOTE_MD = (
    "Dice values are always >= the corresponding Jaccard for the same pair:\n\n"
    "> `D(A, B) = 2J(A, B) / (1 + J(A, B))`, so `D >= J` with equality only at 0 and 1.\n\n"
    "The heatmap gradients will be shifted toward higher values compared to Jaccard.\n"
    "Use Dice when you want to emphasise moderate-overlap pairs; use Jaccard when\n"
    "you need a conservative estimate that penalises large non-overlapping portions."
)

_OVERLAP_MD = "## Overlap (Szymkiewicz-Simpson) coefficient"

_OVERLAP_FORMULA_MD = (
    "**Formula:** `OC(A, B) = |A and B| / min(|A|, |B|)`\n\n"
    "Range is **[0, 1]**. The denominator is the *smaller* of the two set sizes,\n"
    "so OC = 1 means the smaller set is a complete **subset** of the larger one.\n\n"
    "This makes OC the right metric for detecting containment relationships --\n"
    "for example, checking whether a small curated gene list is fully covered by\n"
    "a large cancer atlas. Jaccard and Dice would report a low value in this case\n"
    "(because the large set introduces many non-overlapping genes), but OC = 1.\n"
)

_OVERLAP_CODE = "result.statistics.overlap_coefficient"

_FE_MD = "## Fold enrichment"

_FE_FORMULA_MD = (
    "**Formula:** `FE = (k * N) / (K * n)`\n\n"
    "where:\n"
    "- `k` = observed intersection count\n"
    "- `N` = universe size (total unique items across all sets)\n"
    "- `K` = size of set A (inclusive)\n"
    "- `n` = size of set B (inclusive)\n\n"
    "Fold enrichment answers: *how many times more overlap is there than we would\n"
    "expect if the two sets were drawn randomly from the same universe?*\n\n"
    "- FE = 1 means the overlap is exactly at chance level.\n"
    "- FE > 1 means over-representation (sets share more than expected).\n"
    "- FE < 1 means under-representation (sets overlap less than expected).\n\n"
    "The diagonal is `NaN` because comparing a set to itself is not defined in\n"
    "the enrichment framework (it would need to equal N/K, which can exceed 1).\n"
)

_FE_CODE = "result.statistics.fold_enrichment"

_HYPER_MD = "## Hypergeometric over-representation test"

_HYPER_EXPLAIN_MD = (
    "The hypergeometric test asks: if we drew `n` items uniformly at random from a\n"
    "universe of `N` items, and `K` of those items belong to set A, what is the\n"
    "probability of observing at least `k` items in common with set B by chance?\n\n"
    "Parameters:\n"
    "- `N` = universe size (all unique items across all sets)\n"
    "- `K` = |set A| inclusive\n"
    "- `n` = |set B| inclusive\n"
    "- `k` = |set A and set B| (observed intersection)\n\n"
    "The one-tailed p-value `P(X >= k)` is:\n\n"
    "```\n"
    "p = sum_{i=k}^{min(K,n)} C(K, i) * C(N-K, n-i) / C(N, n)\n"
    "```\n\n"
    "Internally the package calls `scipy.stats.hypergeom.sf(k - 1, N, K, n)`,\n"
    "which computes the survival function (1 - CDF) evaluated at k-1 --\n"
    "equivalent to `P(X >= k)` but numerically more stable for extreme p-values.\n"
)

_HYPER_DERIVATION_MD = (
    "**Step-by-step derivation for the Vogelstein / COSMIC_CGC pair:**\n\n"
    "| Symbol | Value | Meaning |\n"
    "|--------|-------|---------|\n"
    "| N | 1394 | total unique items (universe) |\n"
    "| K | 138 | Vogelstein inclusive size |\n"
    "| n | 581 | COSMIC CGC inclusive size |\n"
    "| k | 126 | observed Vogelstein and COSMIC CGC intersection |\n\n"
    "Expected intersection under the null: `(K * n) / N = (138 * 581) / 1394 ≈ 57.5`.\n"
    "Observed is 126 -- roughly **2.2x** the expectation, hence FE ~ 2.19.\n"
    "The resulting p-value is ~5.7e-38: near-certain over-representation.\n"
)

_HYPER_CODE = "result.statistics.hypergeometric"

_BH_MD = "## BH-FDR adjustment"

_BH_EXPLAIN_MD = (
    "With C(4, 2) = 6 pairwise tests, running each at alpha = 0.05 gives an\n"
    "expected false discovery rate of up to 6 * 0.05 = 0.30 under the null --\n"
    "meaning up to 30% of 'significant' results could be spurious by chance.\n\n"
    "**Benjamini-Hochberg (BH-FDR)** controls the *expected proportion* of\n"
    "false discoveries among all rejected hypotheses (the False Discovery Rate).\n"
    "Procedure:\n"
    "1. Sort raw p-values in ascending order: p(1) <= p(2) <= ... <= p(m).\n"
    "2. Find the largest k such that `p(k) <= k/m * alpha`.\n"
    "3. Reject all hypotheses with p <= p(k).\n\n"
    "This is less conservative than Bonferroni correction (which would require\n"
    "p < 0.05/6 = 0.0083), but still controls the FDR at alpha = 0.05.\n"
    "The `scipy.stats.false_discovery_control(method='bh')` function is used\n"
    "internally and the result is stored in the `p_adjusted` column.\n"
)

_BH_CODE = (
    "# Show only the columns relevant for the BH correction comparison\n"
    "df = result.statistics.hypergeometric[\n"
    "    ['set_a', 'set_b', 'p_value', 'p_adjusted', 'significant']\n"
    "]\n"
    "df"
)

_BH_DISCUSSION_MD = (
    "**Reading the table:**\n\n"
    "- Pairs 0-3 (COSMIC_CGC/IntOGen, COSMIC_CGC/OncoKB, Vogelstein/COSMIC_CGC,\n"
    "  Vogelstein/IntOGen) have astronomically small raw p-values (< 1e-29) that\n"
    "  survive FDR correction unchanged in relative terms.\n"
    "- Pair 4 (Vogelstein/OncoKB, p_raw = 0.0047) remains significant after\n"
    "  BH adjustment (p_adj = 0.0056 < 0.05). The small adjustment reflects that\n"
    "  only one test is borderline; the others are so extreme they don't 'use up'\n"
    "  FDR budget.\n"
    "- Pair 5 (OncoKB/IntOGen) has p_raw = 1.0: these large databases overlap\n"
    "  *less* than expected by chance (FE = 0.85 < 1), so the one-tailed\n"
    "  over-representation test correctly returns p = 1.0 (not significant).\n"
)

_TSV_MD = "## Reproducing the web tool's TSV export"

_TSV_CODE = (
    "# The web tool's 'Export TSV' button produces a tab-separated table.\n"
    "# Reproduce it in one line (print instead of saving to disk):\n"
    "print(result.statistics.hypergeometric.to_csv(sep='\\t', index=False))"
)

_NEXT_STEPS_MD = (
    "## Next steps\n\n"
    "- [`07_pdf_reports.ipynb`](07_pdf_reports.ipynb)"
    " -- bundle Venn, UpSet, Network, and statistics into a single PDF report\n"
    "- [`08_custom_styling_and_export.ipynb`](08_custom_styling_and_export.ipynb)"
    " -- style diagrams and export SVG/PNG for publication\n"
)

# ---------------------------------------------------------------------------
# Cell list -- 30 cells
# ---------------------------------------------------------------------------

CELLS = [
    # 1. Title + "Why statistics?" intro
    ("md", _INTRO),
    # 2. Import + load dataset
    ("code", _IMPORT_CODE),
    # 3. Metrics overview section header
    ("md", _METRICS_OVERVIEW_MD),
    # 4. Definitions table
    ("md", _DEFINITIONS_TABLE_MD),
    # 5. Jaccard section header
    ("md", _JACCARD_MD),
    # 6. Jaccard formula + interpretation
    ("md", _JACCARD_FORMULA_MD),
    # 7. Jaccard matrix
    ("code", _JACCARD_CODE),
    # 8. Jaccard interpretation paragraph
    ("md", _JACCARD_INTERP_MD),
    # 9. Jaccard heatmap (pandas styler)
    ("code", _JACCARD_HEATMAP_CODE),
    # 10. Dice section header
    ("md", _DICE_MD),
    # 11. Dice formula
    ("md", _DICE_FORMULA_MD),
    # 12. Dice matrix
    ("code", _DICE_CODE),
    # 13. Dice vs Jaccard note
    ("md", _DICE_NOTE_MD),
    # 14. Overlap section header
    ("md", _OVERLAP_MD),
    # 15. Overlap formula
    ("md", _OVERLAP_FORMULA_MD),
    # 16. Overlap matrix
    ("code", _OVERLAP_CODE),
    # 17. Fold enrichment section header
    ("md", _FE_MD),
    # 18. Fold enrichment formula
    ("md", _FE_FORMULA_MD),
    # 19. Fold enrichment matrix
    ("code", _FE_CODE),
    # 20. Hypergeometric section header
    ("md", _HYPER_MD),
    # 21. Hypergeometric explanation
    ("md", _HYPER_EXPLAIN_MD),
    # 22. Step-by-step derivation
    ("md", _HYPER_DERIVATION_MD),
    # 23. Hypergeometric long-form table
    ("code", _HYPER_CODE),
    # 24. BH-FDR section header
    ("md", _BH_MD),
    # 25. BH-FDR explanation
    ("md", _BH_EXPLAIN_MD),
    # 26. BH effect comparison
    ("code", _BH_CODE),
    # 27. BH discussion
    ("md", _BH_DISCUSSION_MD),
    # 28. TSV export section header
    ("md", _TSV_MD),
    # 29. TSV export code
    ("code", _TSV_CODE),
    # 30. Next steps
    ("md", _NEXT_STEPS_MD),
]

if __name__ == "__main__":
    out = (
        Path(__file__).resolve().parent.parent.parent
        / "examples"
        / "05_statistics_deep_dive.ipynb"
    )
    build_notebook(CELLS, out)
    print(f"Wrote {out}")
