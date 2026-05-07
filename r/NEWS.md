# vennDiagramLab — NEWS

## v2.0.2 — 2026-05-07 — Windows CRLF parity fix

Patch release fixing a cross-platform packaging bug that surfaced on the
win-builder CRAN check for v2.0.1.

### Fixed

* **TSV writers now produce byte-identical output on Windows.** `cat(out, file = path)` opens the connection in text mode by default; on Windows that converts `"\n"` → `"\r\n"`, breaking the 12 byte-parity tests against the Python golden fixtures (which use `"\n"` only, matching the React webapp's TSV exports). New private helper `.write_bytes()` opens the file in `"wb"` (binary) mode and uses `writeBin(charToRaw(x), con)`. Affects `to_region_summary_tsv()`, `to_matrix_tsv()`, and `to_statistics_tsv()`. No public-API changes; behavior on Linux/macOS unchanged.

### CRAN history

v2.0.1 was submitted to CRAN on 2026-05-07; the win-builder pretest failed with the CRLF bug above before the human reviewer was reached. v2.0.2 is the resubmission with the fix.

## v2.0.1 — 2026-05-06 — Pre-submission feedback fix (Marci)

Patch release fixing a packaging bug that broke `analyze()` for users installing via `remotes::install_github()`.

### Fixed

* **`analyze()` no longer fails with `"no file found"` after `remotes::install_github(..., subdir = "r")`.** Root cause: the bundled 44 SVG templates, 44 region JSONs, and 5 sample datasets under `r/inst/extdata/` were gitignored; only the directory structure (via `.gitkeep` files) was tracked. The local developer populated them by running `Rscript r/data-raw/sync_data.R` before `R CMD build`, so the CRAN / Bioconductor tarballs would have shipped them — but `remotes::install_github()` builds from the git tree, where those files were absent. The result: install succeeds, but `system.file("extdata", "models", "json", package = "vennDiagramLab", mustWork = TRUE)` returns `""`, and the first `analyze()` call throws the cryptic `mustWork` error.

  The fix tracks the synced data files in git (root `.gitignore` updated), so `install_github` now produces a working install out of the box. The synced files are regenerated and committed as part of the release workflow; the `r/data-raw/sync_data.R` script remains the single source of truth.

### Changed

* `.models_json_dir()` (internal) replaced the cryptic `mustWork = TRUE` error with an actionable message walking the user through the clone + sync + `R CMD INSTALL` workflow as a fallback. This branch is now defensive — the gitignore fix removed the trigger — but mis-built installs (hand-edited package directories, missing rebuilds after a model change) will still see a useful message instead of `"no file found"`.

No public-API changes. No new features.

## v2.0.0 — 2026-05-04

First public release. Headless companion to the [Venn Diagram Lab web tool](https://www.venndiagramlab.org/) and the [Python `venn-diagram-lab` package](https://pypi.org/project/venn-diagram-lab/), targeting CRAN + Bioconductor.

### Core (Phase 1)

* `VennDataset`, `RegionData`, `RegionResult`, `StatisticsResult` — four S4 classes covering inputs, regions, results, and pairwise statistics.
* Loaders for CSV, TSV, GMT, GMX (`load_csv`, `load_tsv`, `load_gmt`, `load_gmx`) plus `load_sample` / `list_samples` for five bundled datasets (3 biological, 2 mock).
* `analyze(dataset, model = "auto")` — region enumeration via integer bitmask, model resolution mirroring the web tool.
* `statistics(result)` — lazy `StatisticsResult` with five pairwise metrics: Jaccard, Dice, overlap coefficient, fold enrichment, hypergeometric p-value (BH-FDR adjusted).
* Stateless metric helpers: `jaccard()`, `dice()`, `overlap_coefficient()`, `hypergeometric_p_value()`, `fold_enrichment()`, `bh_fdr()`, `compute_pairwise()`.
* `effective_universe(result)` — universe N consistent with the web tool's binary/aggregated semantics.

### TSV exports + parity (Phase 2)

* `to_region_summary_tsv()`, `to_matrix_tsv()`, `to_statistics_tsv()` — three byte-equivalent writers matching the React webapp's TSV exports.
* JS-style float formatting helpers under the hood (toExponential / toFixed semantics).
* Twelve byte-parity tests against the Python golden fixtures (4 samples × 3 export types). The 8-set `dataset_mock_streaming_platforms` is xfail-strict due to the documented row-vs-set divergence in the web tool's loader.

### SVG rendering (Phase 3)

* `render_venn_svg(result, ...)` — templates the bundled 44-model SVG library via xml2 (`Count_*`, `Name*`, `Bullet*`, `Shape*` substitution).
* Custom `set_names`, `colors`, `title`, `show_names`, `show_counts` overrides per render.
* `analyze(ds, model = "proportional")` — area-proportional 2-set (exact) and 3-set (approximate) generator with `solve_2set`, `solve_3set`, `circle_intersection_area`, `generate_proportional_svg` helpers.

### UpSet + Network rendering (Phase 4)

* `render_upset(result, ...)` — `ComplexUpset`-based UpSet plot with sort modes (`size`, `degree`), color modes (`depth`, `heatmap`, `custom`), and `threshold` / `max_columns` cutoffs.
* `render_network(result, ...)` — force-directed network via `tidygraph` + `ggraph`. Edge metric configurable (`intersection`, `jaccard`, `fold_enrichment`, `overlap_coefficient`); significance threshold colorizes edges.

### PDF reports (Phase 5)

* `to_pdf_report(result, path, ...)` — multi-page US-Letter-landscape PDF combining venn + UpSet + statistics + network + about pages, generated via `grDevices::pdf` + `patchwork`.
* Network and About pages are toggleable via `include_network` and `include_about`.

### ggplot2 + broom integration (Phase 6)

* `geom_venn(data, ...)` — embed a rendered venn as a ggplot2 layer (annotation_custom + geom_blank + coord_fixed).
* `tidy.RegionResult()`, `glance.RegionResult()`, `augment.RegionResult()` — broom-compatible S3 methods returning tibbles.
* `broom` and `tibble` are Suggests-only (registered via `@exportS3Method`) — users not in the tidyverse pay zero install cost.

### Vignette gallery (Phase 7)

* Eight RMarkdown vignettes, all executed during `R CMD check --as-cran`:
  * `v01_quickstart` — five-step intro
  * `v02_real_cancer_drivers` — long-form biological walkthrough (Vogelstein / COSMIC / OncoKB / IntOGen)
  * `v03_proportional_diagrams` — when to use area-proportional + low-level helpers
  * `v04_upset_vs_venn_vs_network` — choosing the right visualization
  * `v05_statistics_deep_dive` — Jaccard / Dice / hypergeometric / BH-FDR worked
  * `v06_pipeline_integration` — broom + dplyr + targets pipeline sketch
  * `v07_pdf_reports` — composite PDF generation
  * `v08_custom_styling_and_export` — custom names/colors, geom_venn, multi-format export

### Compatibility notes

* On R < 4.6, `render_upset()` and `to_pdf_report()` emit a runtime warning about an upstream `ComplexUpset` 1.3.3 / `ggplot2` 4.x incompatibility (tracking [krassowski/complex-upset#213](https://github.com/krassowski/complex-upset/issues/213)). Vignette chunks that depend on UpSet rendering are gated on `eval = (getRversion() >= "4.6")`. The warning + skip will be removed when ComplexUpset 1.4+ ships.
