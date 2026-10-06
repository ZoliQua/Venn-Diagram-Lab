# venn-diagram-lab — Changelog

## 2.9.0 — 2026-10-05 — PDF report, extended statistics, JSON / Cytoscape exports, data-quality report

Second npm release. Versions 2.5.0–2.8.0 were internal lockstep bumps shared with the web tool and were not published to npm; everything below is new relative to 2.4.0. All tabular outputs remain byte-identical to the web tool and the Python / R companions (parity goldens regenerated).

### PDF report
- `renderPdfReport(result, options)` — multi-page A4 report (data overview, set sizes, Venn diagram, UpSet plot, set-relationship network, enrichment bar / lollipop / heatmap, item share distribution, cluster-ordered heatmap, Jaccard / Sørensen–Dice / enrichment statistics tables, Credits & Cite).
- `vdl report <input> --out report.pdf [--model <name>] [--title <text>]` — CLI front end; the report's *Source* field shows the input filename.
- `about` / Credits & Cite text now lists all four packages (web, npm, PyPI, CRAN).

### Statistics
- Statistics TSV grows from 16 to 24 columns: `Bonferroni` (family-wise correction next to BH-FDR), `P_two_sided` (two-sided Fisher's exact test, log-space point-mass sum), `Jaccard_CI_low/high` and `Dice_CI_low/high` (Wilson score 95% intervals), `FE_CI_low/high` (log-scale Wald 95% interval of the fold enrichment with Jeffreys continuity correction).
- One-vs-rest enrichment: `toOneVsRestTsv(result)` and `vdl export one-vs-rest` test each set against the union of all other sets (`Rest_Size` derived from the union, not the row count).
- Display formatters floor underflowed p-values to `< 1e-300`.

### Exports
- `toResultJson(result)` and `vdl analyze --json` — full region result + statistics as JSON (values rounded to 6 decimals, byte-identical across surfaces).
- `toNetworkGraphml(result, metric)` / `toNetworkSif(result, metric)` and `vdl export graphml|sif --metric intersection|jaccard|foldEnrichment|overlapCoeff` — Cytoscape-ready set-relationship network; edges use the same background N as every other view.
- `vdl export <kind>` now accepts `one-vs-rest | region-summary | matrix | statistics | graphml | sif`.

### Data quality
- `toDataQuality(result)` (type `DataQualityReport`) over core `analyzeDataQuality` — duplicate identifiers, empty / whitespace cells, case-only collisions (e.g. `TP53` vs `tp53`); non-destructive, identifiers are never changed. `vdl analyze` prints a one-line summary to stderr when issues are found.

### Internals
- Core `@venn-diagram-lab/core` 2.9.0 bundled (declares its `exceljs` dependency explicitly; Excel parser handles ISO dates and merged cells).
- CLI subprocess tests carry explicit timeouts; PDF-report tests allow 90 s on cold Windows runners.

## 2.4.0 — 2026-06-21 — First release

Headless Venn Diagram Lab for Node — analysis, byte-equivalent TSV exports, SVG/PNG/PDF rendering, and a `vdl` CLI. Shares the same engine as the Venn Diagram Lab web tool and the Python / R companions.

### Analysis & data
- `analyzeCsvText` / `analyzeCsv` — binary 0/1 matrices and aggregated (one-set-per-column) inputs, auto-detected (`AnalyzeResult.mode`).
- `analyzeGmtText` / `analyzeGmxText` — Broad GMT / GMX gene-set files.
- Byte-equivalent TSV exports: `toRegionSummaryTsv`, `toMatrixTsv`, `toStatisticsTsv` (parity-tested against the web tool / Python / R goldens across 5 sample datasets).

### Rendering (SVG, with PNG/PDF rasterization)
- `toVennSvg` (44 model templates via `listVennModels`), `toProportionalSvg` (2–3 set area-proportional), `toUpsetSvg`, `toNetworkSvg`, `toShareDistributionSvg`, `toEnrichmentBarSvg`, `toEnrichmentLollipopSvg`.
- `svgToPng` (`@resvg/resvg-js`) and `svgToPdf` (single-page, `pdf-lib`).

### CLI (`vdl`)
- `vdl analyze <input> [--region-summary | --matrix | --statistics <path>]` (CSV/TSV/GMT/GMX).
- `vdl render <kind> <input> [--model <name>] [--metric <m>] [--out <file>]` — output format inferred from the `--out` extension (`.svg` / `.png` / `.pdf`).

### Helpers
- `listVennModels` / `loadVennTemplate` — enumerate and load the 44 bundled SVG model templates.
- `listSamples` / `loadSampleText` — enumerate and load the bundled sample datasets.
