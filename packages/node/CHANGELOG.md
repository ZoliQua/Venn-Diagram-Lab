# venn-diagram-lab — Changelog

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
