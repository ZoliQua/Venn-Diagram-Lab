# vennDiagramLab

<!-- badges: start -->
[![CRAN status](https://www.r-pkg.org/badges/version/vennDiagramLab)](https://CRAN.R-project.org/package=vennDiagramLab)
[![CRAN downloads](https://cranlogs.r-pkg.org/badges/grand-total/vennDiagramLab)](https://CRAN.R-project.org/package=vennDiagramLab)
[![R CMD check](https://github.com/ZoliQua/Venn-Diagram-Lab/actions/workflows/r-cmd-check.yml/badge.svg)](https://github.com/ZoliQua/Venn-Diagram-Lab/actions/workflows/r-cmd-check.yml)
[![Lifecycle: stable](https://img.shields.io/badge/lifecycle-stable-brightgreen.svg)](https://lifecycle.r-lib.org/articles/stages.html#stable)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![DOI (Zenodo concept)](https://zenodo.org/badge/DOI/10.5281/zenodo.19510813.svg)](https://doi.org/10.5281/zenodo.19510813)
[![DOI (CRAN)](https://img.shields.io/badge/DOI-10.32614%2FCRAN.package.vennDiagramLab-1F4288.svg)](https://doi.org/10.32614/CRAN.package.vennDiagramLab)
<!-- badges: end -->

`vennDiagramLab` is the R companion to the [Venn Diagram Lab web tool](https://www.venndiagramlab.org/) and the [Python `venn-diagram-lab` package](https://pypi.org/project/venn-diagram-lab/). It provides headless Venn / UpSet / Network diagram analysis and rendering for bioinformaticians and biostatisticians who work natively in R, with byte-equivalent outputs that match the web tool and the Python package down to the byte.

## Features

* **44 SVG diagram models** (2- to 9-set) from a dozen construction methods (Venn 1880, Edwards 1996, Anderson 1988, Grünbaum 1984/1992, Bannier-Bodin 2017, Carroll 2000, Mamakani 2012, SUMO-Venn) — the same library shipped by the web tool.
* **Area-proportional 2- and 3-set layouts** via analytical (`solve_2set`) and approximate (`solve_3set`) solvers.
* **UpSet plots** via [`ComplexUpset`](https://github.com/krassowski/complex-upset) with sort-by-size / sort-by-degree, depth / heatmap / custom color modes, and threshold cutoffs.
* **Force-directed network views** via [`ggraph`](https://ggraph.data-imaginist.com/) + [`tidygraph`](https://tidygraph.data-imaginist.com/), with configurable edge metric (intersection / Jaccard / fold enrichment / overlap coefficient) and significance coloring.
* **Five pairwise statistical metrics** (Jaccard, Dice, overlap coefficient, fold enrichment, hypergeometric over-representation) with BH-FDR adjustment.
* **Multi-page PDF reports** combining overview, Venn + UpSet, statistics tables, network, and methodology pages in a single US-Letter-landscape document.
* **`ggplot2` layer** (`geom_venn()`) and **`broom`-compatible S3 methods** (`tidy()` / `glance()` / `augment()`) for tidyverse + `targets` / `drake` pipeline integration.
* **Byte-equivalent TSV exports** tested against the React webapp's golden fixtures — the same region-summary, item-matrix, and statistics files the web tool's "Export" buttons emit.
* **Cross-implementation parity** verified by 12 byte-equivalence tests against the Python package's golden fixtures (4 sample datasets × 3 export types).

## Install

### From CRAN (recommended)

`vennDiagramLab` is on CRAN as of **2026-05-18** (current version: **2.2.2**):

```r
install.packages("vennDiagramLab")
```

CRAN binaries are built for the three current major Windows / macOS / Linux R versions. Source-only? `install.packages("vennDiagramLab", type = "source")`.

### From Bioconductor (alternate channel once published)

```r
if (!require("BiocManager", quietly = TRUE))
    install.packages("BiocManager")
BiocManager::install("vennDiagramLab")
```

### Development version (GitHub)

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

## Quickstart

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

## Statistics surfaces (v2.2.2)

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

## Documentation

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

## Related projects

`vennDiagramLab` is one of three coordinated implementations sharing the same SVG model library, statistics, and byte-equivalent TSV outputs:

* **Web tool** — interactive viewer, editor, and visual analysis: <https://www.venndiagramlab.org/>
* **Python package** (`venn-diagram-lab` on PyPI): <https://pypi.org/project/venn-diagram-lab/>
* **R package** (this package — `vennDiagramLab` on CRAN + Bioconductor)

### Source repositories

* **Monorepo** (web tool + Python + R, primary development): <https://github.com/ZoliQua/Venn-Diagram-Lab>
* **R-only mirror** (for Bioconductor Single Package Builder, auto-synced from monorepo `main`): <https://github.com/ZoliQua/vennDiagramLab>

The mirror is read-only — file changes should always be made in the monorepo. A GitHub Action splits the `r/` subtree and force-pushes it (with a Bioc `0.99.z` `Version` override) to the mirror on every push to `main`.

## Citation

If you use `vennDiagramLab` in published work, please cite both the software and the version you used.

After install:

```r
citation("vennDiagramLab")
```

returns a `bibentry` with the correct version + DOI for the installed copy.

### DOIs

Two stable identifiers are available — pick whichever fits your reference style:

| DOI | Resolves to | When to use |
|---|---|---|
| **`10.32614/CRAN.package.vennDiagramLab`** ([link](https://doi.org/10.32614/CRAN.package.vennDiagramLab)) | The CRAN package page | Citing the package as a CRAN release |
| **`10.5281/zenodo.19510813`** ([link](https://doi.org/10.5281/zenodo.19510813)) | The Zenodo concept record — always resolves to the latest archived version | Citing the software as an archived artifact ("Cite all versions" — no need to update per release) |

### Plain-text citation

```
Dul Z., Ölbei M., Thomas N.S.B., Si Ammour A., Csikász-Nagy A. (2026).
vennDiagramLab: Headless Venn diagram analysis and rendering.
R package version 2.2.2.
https://CRAN.R-project.org/package=vennDiagramLab
DOI: 10.32614/CRAN.package.vennDiagramLab
```

## Contributing + bug reports

* Issues: <https://github.com/ZoliQua/Venn-Diagram-Lab/issues>
* The repository accepts pull requests against `main` in the monorepo. Do not open PRs against the R-only mirror — they will be lost on the next subtree sync.

## License

MIT — see [LICENSE](LICENSE).
