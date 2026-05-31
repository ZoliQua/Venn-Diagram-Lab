## Submission — v2.2.2

This is an additive feature release on top of the CRAN-accepted v2.0.5.
Version jumps from 2.0.5 to 2.2.2 to keep the R, Python, and web tool
versions in lockstep (cross-package parity is part of the release
contract). No breaking changes, no removed APIs, no new hard
dependencies.

New exports (all follow v2.0.5 conventions):

* `item_share_distribution()` — per-membership-count item totals.
* `cluster_set_order()` — UPGMA / complete / single linkage on a
  symmetric distance matrix.
* `render_share_distribution()` — histogram SVG (480 × 280).
* `render_cluster_heatmap()` — 1 − Jaccard reordered heatmap with
  row + column dendrogram overlays.

A new internal S4 class `SvgImage` (`content`, `width`, `height`) is
returned by the two new plot renderers. `render_venn_svg()` still
returns a plain `character` vector, preserving the v2.0.x API.

R CMD check: 0 errors / 0 warnings / 0 notes (preserves the v2.0.5
baseline). Full test suite passes (576+ tests).

## v2.0.5 history (previous submission, accepted)

This was a resubmission addressing the two issues from the CRAN
auto-check on v2.0.4:

1. **`inst/CITATION` crash during the incoming-feasibility check**
   (`Reading CITATION file fails with $ operator is invalid for atomic
   vectors when package is not installed`). v2.0.4's `inst/CITATION`
   called `utils::packageDescription("vennDiagramLab")`, which returns
   `NA` pre-install; `NA$Version` then errored. v2.0.5 uses the `meta`
   variable that R auto-injects when parsing the CITATION file (the
   pattern documented in "Writing R Extensions"). Verified locally by
   reading the CITATION with `utils::readCitationFile(..., meta = ...)`
   using only DESCRIPTION-derived meta.

2. **Overall checktime 20 min > 10 min on Windows** (vignette rebuild
   still at 12 min after v2.0.4's partial gating). v2.0.4 only gated the
   obviously-slow chunks (`render_upset`, `render_network`,
   `to_pdf_report`, `geom_venn` composite, rsvg exports). On Windows
   win-builder VMs, the remaining time came from per-vignette
   `library(vennDiagramLab)` (transitively loads ggplot2, ComplexUpset,
   ggraph, tidygraph, rsvg, patchwork, gridExtra, BiocGenerics — slow
   to load on Windows) plus the lightweight `analyze` / `render_venn_svg`
   / `broom` chunks across all 8 vignettes. v2.0.5 sets
   `knitr::opts_chunk$set(eval = NOT_CRAN)` in every vignette's setup
   chunk, so on CRAN the rebuild is essentially text-only. Locally the
   full 8-vignette rebuild dropped from ~2 min (Mac, NOT_CRAN=true) to
   ~12 seconds (Mac, NOT_CRAN unset). Heavy chunks still run under
   `devtools::check()` and on the GitHub Actions CI matrix.

History:
* v2.0.1: rejected on Windows pretest — CRLF byte-parity bug in
  `cat(..., file = path)`.
* v2.0.2: CRLF fix landed; rejected by 41-min overall checktime
  (slow tests).
* v2.0.3: `skip_on_cran()` added; rejected by 18-min overall checktime
  (slow vignettes) and DESCRIPTION-quoting NOTE.
* v2.0.4: DESCRIPTION single-quoting + partial vignette gating;
  rejected by 20-min checktime (vignettes still 12 min) and a CITATION
  pre-install NA crash.
* v2.0.5 (this submission): CITATION uses auto-injected `meta`; full
  vignette gating via `opts_chunk$set(eval = NOT_CRAN)`.

No public-API changes.

## Test environments

* local macOS 14.6 (Apple Silicon), R 4.6.0
* GitHub Actions:
  * ubuntu-latest, R 4.4 (release)
  * ubuntu-latest, R 4.5 (devel)
  * ubuntu-latest, R 4.3 (oldrel-1)
  * macos-latest, R 4.6 (release)
  * windows-latest, R 4.4 (release)

## R CMD check results

0 ERRORs | 0 WARNINGs | 1 NOTE

* "New submission" — expected.

## Downstream dependencies

None — this is a new package.

## Companion packages

`vennDiagramLab` is the R companion to the
[`venn-diagram-lab` Python package](https://pypi.org/project/venn-diagram-lab/)
(v2.0.3 on PyPI) and the [Venn Diagram Lab web
tool](https://www.venndiagramlab.org/). The three implementations share the
same SVG model library and produce byte-equivalent TSV outputs (verified by
12 parity tests against shared golden fixtures).

## Notes for the reviewer

* Five bundled sample datasets in `inst/extdata/samples/` (~250 KB total)
  cover both biological (cancer drivers, MSigDB pathways) and mock
  (streaming platforms, gene sets) scenarios — all used in the eight
  vignettes for fully self-contained execution.
* `inst/extdata/models/` contains 44 SVG model templates + 44 JSON region
  files (~700 KB total) from a dozen published Venn / Edwards / Grünbaum /
  Anderson / Carroll / Mamakani / SUMO construction methods — bundled for
  byte-equivalent rendering parity with the web tool.
