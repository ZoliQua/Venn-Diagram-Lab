# vennDiagramLab — NEWS

## v2.9.0 — 2026-10-05 — FE confidence interval

* **New exported `fold_enrichment_ci(N, K, n, k)`**: approximate 95% CI for
  the fold enrichment (log-scale Wald with Jeffreys-style continuity
  correction), byte-identical to the TypeScript and Python implementations.
  The hypergeometric long-form table gains `fe_ci_low` / `fe_ci_high` columns,
  and `to_statistics_tsv()` gains `FE_CI_low` / `FE_CI_high` (24 columns).
  Monte Carlo null coverage: 95.6% over 20,000 trials
  (`scripts/bio_validation.py`, section F).
* Version lockstep with the web tool (2.5.0 → 2.9.0 also covers the v2.7.0
  binary-loader dedupe parity fix and the v2.8.0 custom-universe support via
  the `universe_size` slot).

## v2.4.2 — 2026-06-10 — CRAN checktime fix (faster delimited-file loader)

Maintenance release addressing the CRAN incoming-pretest checktime NOTE
(`Overall checktime > 10 min` on r-devel-windows). No API, output, or
dependency changes — every public function behaves byte-identically.

* **`load_csv()` / `load_tsv()` are now ~10x faster on large files.** The
  internal delimited-file parser (`.split_line`, `.binary_columns_to_dataset`,
  `.aggregated_columns_to_dataset`) was quadratic in the number of rows
  because it grew result vectors one element at a time and trimmed cells
  character-by-character. It is now vectorised: unquoted lines split with a
  single `strsplit()`, and membership / trim / lower-case run over a
  character matrix. Loading the bundled 20,000-row
  `dataset_real_cancer_drivers_4` sample dropped from ~6.5s to ~0.5s.
  Parsing results (item sets, item order, universe size, error conditions)
  are unchanged — verified by the byte-parity fixtures and the
  `.split_line` / converter unit tests.
* `skip_on_cran()` added to the remaining heavy PDF-rendering integration
  tests (`to_pdf_report` share / cluster pages, `to_zip_report`) so the
  on-CRAN test pass stays light; these still run on CI and under
  `devtools::check()`.

## v2.4.1 — 2026-06-10 — Cross-package version sync (no functional R changes)

Version-only release: bumps `vennDiagramLab` from 2.2.3 to 2.4.1 to keep the
R, Python, and web-tool version lines in lockstep with the Python companion
`venn-diagram-lab` 2.4.1 on PyPI and the web tool. No new exports, no API or
behaviour changes, and no new dependencies relative to 2.2.3 — the test suite,
vignettes, and documentation are unchanged apart from the version string.

## v2.2.3 — 2026-06-03 — Render + PDF + bundle parity, Phase 11 item / highlight / DSL surface

Cross-package patch release matching webtool v2.2.3 and Python v2.2.3,
delivered in two additive phases (10 + 11). No breaking changes, no
removed APIs.

### Phase 10 — Render + PDF + bundle parity

New rendering and export APIs that bring the R surface in line with the
webtool and the Python package:

* `render_enrichment_bar(result, metric, width, height)`: pairwise
  enrichment bar chart SVG. Bar height encodes -log10(BH-FDR) or
  Fold Enrichment, with green / grey colouring at FDR < 0.05 and
  significance markers `***`/`**`/`*` above each bar.
* `render_enrichment_lollipop(result, metric, width, height)`: same
  data as `render_enrichment_bar()` rendered as a stem-and-dot plot,
  with dot radius scaling by `sqrt(intersection / max_intersection)`.
* `to_excel_workbook(result, path)`: 3-sheet xlsx (Jaccard, Sørensen-Dice,
  Enrichment) matching the webtool's ZIP-bundle statistics file.
  Pure-R (uses `openxlsx`).
* `to_zip_report(result, path, include_share, include_cluster)`: bundles
  PDF + 4 SVGs + 3 TSVs + xlsx + README.txt into a single ZIP archive.
  Pure-R (uses `zip`).
* `to_pdf_report()` gains `include_share = TRUE` (Item Share Distribution
  page, on by default) and `include_cluster = FALSE` (Cluster Heatmap
  page, opt-in) flags.

### Phase 11 — Item display, Highlight, Region accessors, Boolean DSL

Six new public APIs (two `render_venn_svg()` parameters plus four
exported functions) for inspecting and presenting individual regions.

* `render_venn_svg(result, show_items = TRUE, item_options = list(...))`:
  replaces the per-region count text with the actual item identifiers,
  optionally column-paginated, optionally truncated. `item_options`
  recognises `max_items_per_region`, `ncol_items`, `truncate_long_names`,
  `line_height`, `font_size`, `show_counts_with_items`, `ellipsis`.
* `render_venn_svg(result, highlight = ...)`: spotlight mode. Accepts a
  character vector of region labels (`"AB"`, `"ABC"`, ...) OR an integer
  vector of region bitmasks. Sets that do not contribute to any
  highlighted region get desaturated to `#cccccc` at 25% opacity.
* `intersection_items(result, sets)`: items appearing in every set in
  `sets`, regardless of other memberships.
* `exclusive_items(result, sets)`: items in EXACTLY this combination
  (not in any other set in the dataset).
* `union_items(result, sets)`: items in any of the named sets.
* `parse_region_expression(expr, n_sets)`: Boolean DSL parser. Grammar:
  `&` intersection, `|`/`+` union, `~`/`!` complement, parentheses
  for grouping, atoms `A..I`. Returns a sorted integer vector of
  region bitmasks suitable for `highlight = ...`.

The four new public functions chain naturally with the existing
renderers:

```r
masks <- parse_region_expression("A & B + B & C", n_sets = 4L)
img   <- render_venn_svg(result, highlight = masks, show_items = TRUE)
items <- exclusive_items(result, c("A", "B"))
```

### Dependencies

* `openxlsx` and `zip` added to `Imports` (both pure-R). No new
  dependencies in Phase 11.

## v2.2.2 — 2026-05-31 — Item-share distribution + cluster heatmap (cross-package parity)

Additive feature release matching the webtool v2.2.2 and Python v2.2.2 releases. No breaking changes, no removed APIs, no new hard dependencies.

### New features

* `item_share_distribution(matrix)`: per-membership-count item totals.
* `cluster_set_order(D, linkage)`: UPGMA / complete / single linkage on a
  symmetric distance matrix, with `leaf_order` and `merges` matching the
  cross-package convention (smaller-min-leaf on the left).
* `render_share_distribution(dataset)`: histogram SVG, 480×280 viewBox.
* `render_cluster_heatmap(result, linkage, ...)`: 1 − Jaccard reordered
  heatmap with row and column dendrogram overlays.
* Mirrors webtool v2.2.2 and Python v2.2.2 (cross-package parity tests
  cover all four exports).

### Internal

* New S4 class `SvgImage` (`content`, `width`, `height` slots) returned
  by the two new plot renderers. `render_venn_svg()` continues to return
  a plain `character` for backwards compatibility with the v2.0.x API.

## v2.0.5 — 2026-05-12 — Fix inst/CITATION pre-install crash + finish vignette skip

Patch release addressing two issues from the CRAN auto-check on v2.0.4.

### Fixed

* **`inst/CITATION` no longer errors during CRAN incoming-feasibility check.** The file previously called `utils::packageDescription("vennDiagramLab")`, which returns `NA` when the package is not yet installed (as during CRAN's pre-install incoming check). `NA$Version` then triggers the cryptic `"$ operator is invalid for atomic vectors"` error. The fix uses the `meta` variable that R auto-injects when parsing the CITATION file, the documented pattern from "Writing R Extensions". `citation("vennDiagramLab")` output is unchanged on installed copies.

### Changed

* **Vignette evaluation now globally gated on `NOT_CRAN` for every chunk in every vignette.** v2.0.4 gated only the four obviously-slow chunks (`render_upset`, `render_network`, `to_pdf_report`, `geom_venn` composite), but win-builder still reported `[12m] OK` on the `re-building of vignette outputs` step. The remaining time was spent on per-vignette `library(vennDiagramLab)` calls (which transitively load `ggplot2`, `ComplexUpset`, `ggraph`, `tidygraph`, `rsvg`, `patchwork`, `gridExtra`, `BiocGenerics` — slow on Windows VMs) plus the lightweight `analyze()` / `render_venn_svg()` / `broom` chunks across eight vignettes. The setup chunk of every vignette now sets `knitr::opts_chunk$set(eval = NOT_CRAN)`, so on CRAN the rebuild is text-only (~1 minute total). Under `devtools::check()` and on the package's GitHub Actions CI matrix `NOT_CRAN=true` and all chunks evaluate normally. Locally verified: total vignette rebuild dropped from 12 min (Windows) / ~2 min (Mac) to ~12 seconds on Mac.

No public-API or feature changes.

### CRAN history

* v2.0.4 (2026-05-12): rejected on win-builder — (1) `inst/CITATION` `packageDescription()` NA crash during incoming check, (2) overall checktime 20 min > 10 min (vignettes 12 min — partial gating was insufficient).
* v2.0.5 (this release): CITATION uses auto-injected `meta`; all vignette chunks gated.

## v2.0.4 — 2026-05-10 — DESCRIPTION quoting + vignette buildtime fix

Patch release addressing two issues from the CRAN auto-check + human reviewer feedback on v2.0.3.

### Changed

* **DESCRIPTION single-quotes software names** per CRAN reviewer (Uwe Ligges). Quoted: `'Venn Diagram Lab'`, `'UpSet'`, `'CSV'`, `'TSV'`, `'GMT'`, `'GMX'`, `'Jaccard'`, `'ggplot2'`, `'tidygraph'`, `'broom'`. Suppresses the "Possibly misspelled words in DESCRIPTION" NOTE (flagged GMX, Jaccard, TSV, UpSet, ggplot, tidygraph).
* **Vignette buildtime cut from ~12 minutes to ~1 minute on CRAN** by gating the slow rendering chunks (`render_upset`, `render_network`, `to_pdf_report`, `geom_venn` composite, `rsvg_png`/`rsvg_pdf` export) on `NOT_CRAN`. On dev (`devtools::check()` sets `NOT_CRAN=true`) and CI all chunks still build their figures; the full 590+ test suite + 8 vignettes still execute on the 5-cell GitHub Actions matrix. On CRAN only the lightweight analysis chunks evaluate, bringing total checktime well under the 10-minute budget.

No public-API or feature changes.

### CRAN history

* v2.0.3 (2026-05-08): rejected on win-builder — 18-min overall checktime (vignettes alone ~12 min) and DESCRIPTION-quoting NOTE.
* v2.0.4 (this release): vignette `NOT_CRAN` gating + DESCRIPTION quoting.

## v2.0.3 — 2026-05-08 — Skip slow tests on CRAN

Patch release reducing CRAN auto-check time below the 10-minute target. The full test suite (590+ tests) and integration tests against bundled samples + 44 SVG models pushed the Windows R CMD check to ~41 minutes, which auto-rejected the v2.0.2 incoming pretest.

### Changed

* Slow-running tests (`test-render-pdf`, `test-render-svg`, `test-render-upset`, `test-render-network`, `test-parity-with-webapp`) now call `testthat::skip_on_cran()` at the top of every `test_that()` block. CRAN sees only the fast unit-test slice (`test-analysis`, `test-classes`, `test-statistics`, `test-broom-tidy`, `test-ggplot-layer`, `test-io`, `test-samples`, `test-proportional`, `test-tsv-export`). The skipped tests still run on the package's GitHub Actions CI matrix (5 cells × 590 tests), where `NOT_CRAN=true` triggers the full test suite.

No public-API or feature changes; the package's user-facing behavior is identical.

### CRAN history

* v2.0.1 (2026-05-07): rejected on Windows pretest due to a CRLF byte-parity bug in `cat(..., file = path)` text-mode write.
* v2.0.2 (2026-05-07): the CRLF fix; rejected on Windows pretest due to 41-minute overall checktime exceeding CRAN's 10-minute auto-pass threshold.
* v2.0.3 (this release): `skip_on_cran()` in slow tests; expected sub-10-min pretest.

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
