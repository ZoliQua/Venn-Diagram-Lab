# vennDiagramLab

<!-- badges: start -->
[![CRAN status](https://www.r-pkg.org/badges/version/vennDiagramLab)](https://CRAN.R-project.org/package=vennDiagramLab)
[![CRAN downloads](https://cranlogs.r-pkg.org/badges/grand-total/vennDiagramLab)](https://CRAN.R-project.org/package=vennDiagramLab)
[![R CMD check](https://github.com/ZoliQua/Venn-Diagram-Lab/actions/workflows/r-cmd-check.yml/badge.svg)](https://github.com/ZoliQua/Venn-Diagram-Lab/actions/workflows/r-cmd-check.yml)
[![Lifecycle: stable](https://img.shields.io/badge/lifecycle-stable-brightgreen.svg)](https://lifecycle.r-lib.org/articles/stages.html#stable)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![DOI (Zenodo concept)](http://www.venndiagramlab.org/zenodo.19510813.svg)](https://doi.org/10.5281/zenodo.19510813)
[![DOI (CRAN)](https://img.shields.io/badge/DOI-10.32614%2FCRAN.package.vennDiagramLab-1F4288.svg)](https://doi.org/10.32614/CRAN.package.vennDiagramLab)
<!-- badges: end -->

`vennDiagramLab` is the R companion to the [Venn Diagram Lab web tool](https://www.venndiagramlab.org/) and the [Python `venn-diagram-lab` package](https://pypi.org/project/venn-diagram-lab/). It provides headless Venn / UpSet / Network diagram analysis and rendering for bioinformaticians and biostatisticians who work natively in R, with byte-equivalent outputs that match the web tool and the Python package down to the byte.

## 1. Features

* **44 SVG diagram models** (2- to 9-set) from a dozen construction methods (Venn 1880, Edwards 1996, Anderson 1988, Grünbaum 1984/1992, Bannier-Bodin 2017, Carroll 2000, Mamakani 2012, SUMO-Venn) — the same library shipped by the web tool.
* **Area-proportional 2- and 3-set layouts** via analytical (`solve_2set`) and approximate (`solve_3set`) solvers.
* **UpSet plots** via [`ComplexUpset`](https://github.com/krassowski/complex-upset) with sort-by-size / sort-by-degree, depth / heatmap / custom color modes, and threshold cutoffs.
* **Force-directed network views** via [`ggraph`](https://ggraph.data-imaginist.com/) + [`tidygraph`](https://tidygraph.data-imaginist.com/), with configurable edge metric (intersection / Jaccard / fold enrichment / overlap coefficient) and significance coloring.
* **Five pairwise statistical metrics** (Jaccard, Dice, overlap coefficient, fold enrichment, hypergeometric over-representation) with BH-FDR adjustment, **Bonferroni** FWER control, the **two-sided Fisher's exact p-value**, and analytic Wilson **95% confidence intervals** for Jaccard and Dice.
* **Multi-page PDF reports** combining overview, Venn + UpSet, statistics tables, network, and methodology pages in a single US-Letter-landscape document.
* **`ggplot2` layer** (`geom_venn()`) and **`broom`-compatible S3 methods** (`tidy()` / `glance()` / `augment()`) for tidyverse + `targets` / `drake` pipeline integration.
* **Byte-equivalent TSV/JSON exports** tested against the React webapp's golden fixtures — region-summary, item-matrix, statistics, one-vs-rest enrichment (`to_one_vs_rest_tsv()`), and the full result as JSON (`to_result_json()`), matching the web tool's "Export" buttons.
* **Cross-implementation parity** verified by byte-equivalence tests against the Python package's golden fixtures.

## 2. Install

### 2.1. From CRAN (recommended)

`vennDiagramLab` is on CRAN (current version: **2.4.2**):

```r
install.packages("vennDiagramLab")
```

CRAN binaries are built for the three current major Windows / macOS / Linux R versions. Source-only? `install.packages("vennDiagramLab", type = "source")`.

### 2.2. From Bioconductor (alternate channel once published)

```r
if (!require("BiocManager", quietly = TRUE))
    install.packages("BiocManager")
BiocManager::install("vennDiagramLab")
```

### 2.3. Development version (GitHub)

The package source lives in the `r/` subdirectory of the monorepo:

```r
install.packages("remotes")
remotes::install_github("ZoliQua/Venn-Diagram-Lab", subdir = "r")
```

A standalone mirror (no `subdir =` needed) is kept in sync on every push to `main` for Bioconductor's Single Package Builder, which requires `DESCRIPTION` at repo root:

```r
remotes::install_github("ZoliQua/vennDiagramLab")
```

Both installs produce the same package; the mirror exists purely to satisfy Bioc's submission tooling.

## 3. Quickstart

```r
library(vennDiagramLab)

# Load a bundled dataset (4 cancer driver source catalogs)
ds     <- load_sample("dataset_real_cancer_drivers_4")
result <- analyze(ds)

# Render the Venn diagram as SVG
svg <- render_venn_svg(result, title = "Cancer driver overlap")
writeLines(svg, "cancer_drivers.svg")

# Or get a tidy summary
broom::tidy(result)

# Or generate a multi-page PDF report
to_pdf_report(result, "cancer_drivers.pdf")
```

See `vignette("v01_quickstart")` for the full intro and `browseVignettes("vennDiagramLab")` for the complete eight-vignette gallery.

### 3.1 Complete User Guide

You can reach the complete [`USER GUIDE`](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/r/user-guide/USER_GUIDE.md) here in markdown format or downlad it as a [`PDF File`](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/r/user-guide/USER_GUIDE.pdf).

## 4. Statistics surfaces

Two additional statistics surfaces complement the pairwise tables, matching
the web tool's Statistics panel and the Python package:

| Function | Purpose |
|---|---|
| `item_share_distribution(matrix)` | Histogram of how many sets each item belongs to (1, 2, ..., n) |
| `cluster_set_order(D, linkage = "average")` | UPGMA / complete / single hierarchical linkage on a distance matrix; returns leaf order plus dendrogram merges |
| `render_share_distribution(dataset)` | SVG bar chart of the item-share distribution |
| `render_cluster_heatmap(result, linkage = "average")` | Pairwise-Jaccard heatmap with UPGMA-reordered axes and side dendrograms |

```r
library(vennDiagramLab)

ds  <- load_sample("dataset_real_cancer_drivers_4")
res <- analyze(ds)

img <- render_share_distribution(ds)
substr(slot(img, "content"), 1L, 200L)

heatmap <- render_cluster_heatmap(res, linkage = "average")
substr(slot(heatmap, "content"), 1L, 200L)
```

Both renderers return an `SvgImage` S4 object (slots: `content`, `width`,
`height`), the same shape as `render_venn_svg()`.

## 5. PDF report — About + Credits

`to_pdf_report()` closes with the unified *About This Report* appendix
shared across the webtool, the Python package, and this companion: 12
structured sections (intro, Plots, Statistics) followed by a *Credits and
Cite* footer listing authors, package URLs, and the Zenodo DOI. Section
titles render in bold, bodies in plain weight, and the content
auto-paginates across as many landscape pages as needed.

## 6. Latest additions (v2.2.3)

### 6.1. Render + PDF + bundle parity

- `render_enrichment_bar(result, metric)` — Pairwise enrichment bar chart SVG.
- `render_enrichment_lollipop(result, metric)` — Pairwise enrichment lollipop chart SVG.
- `to_excel_workbook(result, path)` — 3-sheet xlsx (Jaccard / Sørensen-Dice / Enrichment).
- `to_zip_report(result, path)` — Full Report ZIP bundle (PDF + SVGs + TSVs + xlsx + README).

`to_pdf_report()` also gains `include_share = TRUE` (Item Share Distribution
page, on by default) and `include_cluster = FALSE` (Cluster Heatmap page,
opt-in) flags.

### 6.2. Item display, Highlight, Region accessors, Boolean DSL

- `render_venn_svg(result, show_items = TRUE, item_options = list(...))` — Item names inside regions, with truncation and column layout.
- `render_venn_svg(result, highlight = c("AB", "ABC"))` — Spotlight mode; desaturates sets that do not contribute to any highlighted region.
- `intersection_items(result, sets)` — Items in every named set.
- `exclusive_items(result, sets)` — Items in exactly this combination.
- `union_items(result, sets)` — Items in any of the named sets.
- `parse_region_expression(expr, n_sets)` — Boolean DSL parser returning a sorted integer vector of region bitmasks; composes with `highlight = ...`.

The four new helpers chain naturally:

```r
masks <- parse_region_expression("A & B + B & C", n_sets = 4L)
img   <- render_venn_svg(result, highlight = masks, show_items = TRUE)
items <- exclusive_items(result, c("A", "B"))
```

### 6.3. Statistics + export additions (unreleased)

- `to_statistics_tsv(result, path)` gains four columns: `Bonferroni` (FWER-adjusted
  p-value, `min(1, p * m)`, alongside the existing Benjamini-Hochberg `FDR`),
  `P_two_sided` (the two-sided Fisher's exact p-value for the same pair — note the
  existing `P_value` column is the **one-sided** over-representation test), and
  `Jaccard_CI_low/high` + `Dice_CI_low/high` (analytic Wilson 95% confidence intervals).
- `to_one_vs_rest_tsv(result, path)` — new TSV export: tests each set against the union
  of all other sets. Columns: `Set, Name, Size, Rest_Size, Intersection, Expected,
  Fold_Enrichment, P_value, FDR, Bonferroni, Significant`.
- `to_result_json(result, path)` — new JSON export: the full region + statistics result
  (model, set names, universe size, every non-empty region, set sizes, and the pairwise
  statistics array with `bonferroni` / `pTwoSided`) as a single canonical JSON document,
  byte-equivalent to the web tool's "Full Result (JSON)" export and Python's
  `RegionResult.to_json()`.

These are additions to the **TSV/JSON export layer** — the PDF report's statistics
tables (`to_pdf_report()`) are unchanged.

```r
to_statistics_tsv(result, "statistics.tsv")
to_one_vs_rest_tsv(result, "one_vs_rest.tsv")
to_result_json(result, "result.json")
```

## 7. Documentation

* Full reference site + vignettes: <https://zoliqua.github.io/Venn-Diagram-Lab/r/>
* Eight RMarkdown vignettes (also accessible via `vignette(package = "vennDiagramLab")`):
  1. `v01_quickstart` — five-step intro.
  2. `v02_real_cancer_drivers` — long-form biological walkthrough (Vogelstein, COSMIC CGC, OncoKB, IntOGen).
  3. `v03_proportional_diagrams` — area-proportional 2/3-set layouts and the low-level geometry helpers.
  4. `v04_upset_vs_venn_vs_network` — choosing the right visualization per set count.
  5. `v05_statistics_deep_dive` — Jaccard / Dice / hypergeometric / BH-FDR worked examples.
  6. `v06_pipeline_integration` — `broom` + `dplyr` + `targets` pipeline sketch.
  7. `v07_pdf_reports` — composite multi-page PDF generation.
  8. `v08_custom_styling_and_export` — custom names / colors, `geom_venn()`, multi-format export.

## 8. Related projects

`vennDiagramLab` is one of four coordinated implementations sharing the same SVG model library, statistics, and byte-equivalent TSV outputs:

* **Web tool** — interactive viewer, editor, and visual analysis: <https://www.venndiagramlab.org/>
* **Python package** (`venn-diagram-lab` on PyPI): <https://pypi.org/project/venn-diagram-lab/>
* **Node.js package** (`venn-diagram-lab` on npm): <https://www.npmjs.com/package/venn-diagram-lab>
* **R package** (this package — `vennDiagramLab` on CRAN + Bioconductor)

### 9. Source repositories

* **Monorepo** (web tool + Python + R, primary development): <https://github.com/ZoliQua/Venn-Diagram-Lab>
* **R-only mirror** (for Bioconductor Single Package Builder, auto-synced from monorepo `main`): <https://github.com/ZoliQua/vennDiagramLab>

The mirror is read-only — file changes should always be made in the monorepo. A GitHub Action splits the `r/` subtree and force-pushes it (with a Bioc `0.99.z` `Version` override) to the mirror on every push to `main`.

## 9. Citation

If you use `vennDiagramLab` in published work, please cite both the software and the version you used.

After install:

```r
citation("vennDiagramLab")
```

returns a `bibentry` with the correct version + DOI for the installed copy.

### 10.1. DOIs

Two stable identifiers are available — pick whichever fits your reference style:

| DOI | Resolves to | When to use |
|---|---|---|
| **`10.32614/CRAN.package.vennDiagramLab`** ([link](https://doi.org/10.32614/CRAN.package.vennDiagramLab)) | The CRAN package page | Citing the package as a CRAN release |
| **`10.5281/zenodo.19510813`** ([link](https://doi.org/10.5281/zenodo.19510813)) | The Zenodo concept record — always resolves to the latest archived version | Citing the software as an archived artifact ("Cite all versions" — no need to update per release) |

### 10.2. Plain-text citation

```
Dul Z., Ölbei M., Thomas N.S.B., Si Ammour A., Csikász-Nagy A. (2026).
vennDiagramLab: Headless Venn diagram analysis and rendering.
R package version 2.2.2.
https://CRAN.R-project.org/package=vennDiagramLab
DOI: 10.32614/CRAN.package.vennDiagramLab
```

[![DOI](http://www.venndiagramlab.org/zenodo.19510813.svg)](https://doi.org/10.5281/zenodo.19510813)


## 10. Contributing + bug reports

* Issues: <https://github.com/ZoliQua/Venn-Diagram-Lab/issues>
* The repository accepts pull requests against `main` in the monorepo. Do not open PRs against the R-only mirror — they will be lost on the next subtree sync.

## 11. License

MIT — see [LICENSE](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/r/LICENSE).
