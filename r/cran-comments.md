## Submission — v2.9.0

This is a feature update of the CRAN package `vennDiagramLab` (current CRAN
version 2.4.2, published 2026-06-10). The version jumps 2.4.2 -> 2.9.0 because
the R, Python, npm and web-tool components share a single version line and
the intermediate numbers were lockstep bumps that were never submitted to
CRAN.

All changes are additive: no removed, renamed or re-signatured functions, no
new dependencies (`Imports` unchanged since 2.4.2). New exported functions:
`fold_enrichment_ci()`, `one_vs_rest_enrichment()`, `to_one_vs_rest_tsv()`,
`to_result_json()`, `to_network_graphml()`, `to_network_sif()`,
`analyze_data_quality()`, `validate_dataset()`. The pairwise statistics table
and `to_statistics_tsv()` gain additional columns (Bonferroni, two-sided
Fisher P, Wilson and log-Wald confidence intervals); existing columns are
unchanged. Full details in `NEWS.md`.

The checktime fixes from 2.4.2 are retained: the heavy PDF / ZIP integration
tests and the slow examples remain behind `skip_on_cran()` / `\donttest{}`,
and the new functions add only lightweight examples on the bundled 3-item
toy dataset.

### Test environments

* GitHub Actions `R CMD check` matrix on this commit: ubuntu-latest
  (R release, R devel, R oldrel-1), macos-latest (release), windows-latest
  (release) — 5/5 OK.
* Local macOS (Apple Silicon), R release — `R CMD check --as-cran` (see
  below).
* `BiocCheck` (scheduled CI job) — no ERROR.

### R CMD check results

0 ERRORs | 0 WARNINGs | 1 NOTE

* checking HTML version of manual ... NOTE — "Skipping checking HTML
  validation: 'tidy' doesn't look like recent enough HTML Tidy" /
  "Skipping checking math rendering: package 'V8' unavailable". Local
  toolchain only (macOS system tidy, no V8); not reproducible on the CI
  matrix.

Timing on the local --as-cran run: examples with --run-donttest 26 s,
tests 12 s, vignettes rebuilt OK.

## Resubmission — v2.4.2

The previous submission (v2.4.1) passed the Windows and Debian pretests with
`Status: OK` but was auto-rejected for a checktime NOTE on
r-devel-windows-x86_64: `Overall checktime 23 min > 10 min`.

This resubmission fixes that. The root cause was a quadratic internal
delimited-file parser: loading the bundled 20,000-row
`dataset_real_cancer_drivers_4` sample took ~6.5s, and ~19 examples plus
several tests each loaded it. The parser is now vectorised (single
`strsplit()` for unquoted lines; trim / lower-case / membership over a
character matrix instead of element-by-element vector growth), cutting that
load from ~6.5s to ~0.5s. `skip_on_cran()` was also added to the remaining
heavy PDF-rendering integration tests. Parsing results are byte-identical
(guarded by the parity fixtures and parser unit tests); there are no API,
output, or dependency changes relative to 2.4.1.

Local `R CMD check --as-cran --run-donttest` example + test time fell from
~230s to well under that — see the timing note below.

### Original 2.4.1 submission notes (still applicable)

This is an update of the CRAN package `vennDiagramLab` (current CRAN
version 2.0.5). It rolls up the additive feature work released as 2.2.2
and 2.2.3 on GitHub, plus a version-sync bump (2.4.x) so that the R,
Python, and web-tool components share a single version line (the Python
companion `venn-diagram-lab` 2.4.1 is on PyPI and the web tool is on 2.4.x).

No breaking changes, no removed APIs, no defunct functions. `render_venn_svg()`
still returns a plain `character` vector, preserving the 2.0.x public API.

### What changed since the CRAN 2.0.5 release

All changes are additive. New exported functions (following 2.0.5
conventions):

* Statistics and summary plots:
  `item_share_distribution()`, `cluster_set_order()`,
  `render_share_distribution()`, `render_cluster_heatmap()`,
  `render_enrichment_bar()`, `render_enrichment_lollipop()`.
* Region inspection / selection:
  `intersection_items()`, `exclusive_items()`, `union_items()`,
  `parse_region_expression()` (a small Boolean DSL — `& | + ~ !`, atoms
  `A..I` — returning a sorted integer vector of region bitmasks).
* Export:
  `to_excel_workbook()` (3-sheet xlsx) and `to_zip_report()`
  (PDF + SVGs + TSVs + xlsx + README bundle).

New parameters on existing functions:

* `render_venn_svg(show_items =, item_options =, highlight =)`.
* `to_pdf_report(include_share =, include_cluster =)`.

New `Imports`: `openxlsx` and `zip` (both pure R).

Version 2.4.1 itself adds no new R code over 2.2.3 — it is a version-only
synchronisation release.

### Carried over from the accepted 2.0.5 submission

* `inst/CITATION` uses the auto-injected `meta` object (so it does not
  error during the pre-install incoming-feasibility check).
* Every vignette gates its heavy chunks with
  `knitr::opts_chunk$set(eval = NOT_CRAN)`, so the on-CRAN vignette
  rebuild is essentially text-only and the overall checktime stays well
  under 10 minutes. The heavy chunks still run on the GitHub Actions CI
  matrix and under `devtools::check()`.

### Test environments

* Local: macOS (Apple Silicon), R 4.6.0 — `R CMD check --as-cran` on the
  vignette-built tarball.
* GitHub Actions (`R CMD check --as-cran`):
  * ubuntu-latest — R 4.6.0 (release), R-devel (2026-06-08 r90120), R 4.5.3 (oldrel-1)
  * macos-latest — R 4.6.0 (release)
  * windows-latest — R 4.6.0 (release)

### R CMD check results

`Status: OK` — 0 ERRORs | 0 WARNINGs | 0 NOTEs on every environment above,
including the local `--as-cran` run (the CRAN incoming-feasibility sub-check
also reports OK).

The version number deliberately jumps from the CRAN 2.0.5 to 2.4.2; the
intermediate 2.2.x / 2.4.0 / 2.4.1 versions were published on GitHub only (2.4.1
was the rejected pretest submission) and are folded into this submission. The
rationale (cross-package version lockstep) is described above.

### Downstream dependencies

None — `vennDiagramLab` has no reverse dependencies on CRAN (verified against
the current CRAN package index).

### Companion packages

`vennDiagramLab` is the R companion to the
[`venn-diagram-lab` Python package](https://pypi.org/project/venn-diagram-lab/)
(2.4.1 on PyPI) and the [Venn Diagram Lab web
tool](https://www.venndiagramlab.org/). The three implementations share the
same SVG model library and produce byte-equivalent TSV outputs, verified by
parity tests against shared golden fixtures.

### Notes for the reviewer

* Five bundled sample datasets in `inst/extdata/samples/` (~250 KB total)
  cover both biological (cancer drivers, MSigDB pathways) and mock
  (streaming platforms, gene sets) scenarios — all used in the eight
  vignettes for fully self-contained execution.
* `inst/extdata/models/` contains 44 SVG model templates + 44 JSON region
  files (~700 KB total) from a dozen published Venn / Edwards / Grünbaum /
  Anderson / Carroll / Mamakani / SUMO construction methods — bundled for
  byte-equivalent rendering parity with the web tool.
