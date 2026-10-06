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
