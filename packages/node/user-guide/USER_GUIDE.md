---
title: "venn-diagram-lab — Node.js Package"
subtitle: "User Guide"
author: "Zoltán Dul, Márton Ölbei, N. Shaun B. Thomas, Azeddine Si Ammour, Attila Csikász-Nagy"
date: "v2.4.0"
---

# Overview

`venn-diagram-lab` is the headless Node.js/TypeScript companion to the *Venn Diagram Lab*
web tool (<https://venndiagramlab.org/>). It exposes the same set-analysis math, the same
44 SVG model templates, and a byte-equivalent TSV export contract — but without a browser.
Two surfaces:

- **Node library** (`venn-diagram-lab`): TypeScript functions you import from scripts,
  pipelines, or CI jobs.
- **CLI** (`vdl`): every library surface is also reachable as a shell command, with the
  same defaults and the same output bytes.

Sister projects:

| Surface | URL / Install | Notes |
|---|---|---|
| Web tool | <https://venndiagramlab.org/> | Browser SVG editor + interactive analysis |
| Python companion | `pip install venn-diagram-lab` | Headless Python lib + `vdl` CLI |
| R companion | `install.packages("vennDiagramLab")` | S4 / ggplot2-flavoured port; same TSV bytes |
| Node (this) | `npm install venn-diagram-lab` | Headless TypeScript lib + `vdl` CLI |

All four surfaces are kept in lock-step at the same major version and produce
byte-identical TSV exports, verified by fixture-based parity tests on every release.

# Installation

```bash
npm install venn-diagram-lab
```

Requires Node.js 18 or newer.

For a global CLI install:

```bash
npm install -g venn-diagram-lab
vdl --version
```

Or use `npx` without a global install:

```bash
npx vdl --help
```

# Core concepts

## AnalyzeResult

Every analysis function returns an `AnalyzeResult`:

```ts
interface AnalyzeResult {
  csv:      CsvData;              // raw parsed table (headers + rows)
  columns:  number[];             // column indices selected as sets
  setNames: string[];             // display names for each set (from column headers)
  venn:     VennResult;           // region counts, exclusive items, totals
  mode:     'binary' | 'aggregated';
}
```

A **region** is one of the 2^n − 1 non-empty subsets of an n-set diagram. The `venn`
field holds:

- `exclusive` — a `Map<string, number>` from region label (e.g. `"AB"`) to exclusive
  item count.
- `exclusiveItems` — a `Map<string, string[]>` from label to the list of exclusive items.
- `inclusive` — a `Map<string, number>` from single-set label (e.g. `"A"`) to total
  (inclusive) count for that set.
- `totalUniqueItems` — the universe size (count of items appearing in at least one set).

## Binary vs. aggregated auto-detection

**Binary mode** (`mode: 'binary'`)  
The input is a wide-form item × set matrix with 0/1 cells. The first column is the item
identifier; remaining columns are sets. The library auto-detects which columns contain
only 0s and 1s and selects those as set columns.

Example:

```
gene    SetA  SetB  SetC
TP53    1     0     1
BRCA1   0     1     1
MYC     1     1     0
```

**Aggregated mode** (`mode: 'aggregated'`)  
Each column is a set and cells hold item names directly (no 0/1). Activated when no
binary columns are detected.

Example:

```
SetA    SetB    SetC
TP53    BRCA1   TP53
MYC     MYC     EGFR
```

# Input formats

## CSV / TSV

```ts
import { analyzeCsvText } from 'venn-diagram-lab';

const result = analyzeCsvText(rawText);
```

`analyzeCsvText` auto-detects the delimiter (comma or tab) and then auto-detects binary
vs. aggregated mode. The function accepts any plain-text string — file content, fetch
response body, etc.

If you have already parsed the file into a `CsvData` object (e.g. from a custom parser),
pass it directly to `analyzeCsv`:

```ts
import { analyzeCsv } from 'venn-diagram-lab';

const result = analyzeCsv(myCsvData);
```

## GMT (Broad Gene Matrix Transposed)

Each line: `set_name<TAB>description<TAB>item1<TAB>item2…`

```ts
import { analyzeGmtText } from 'venn-diagram-lab';
import { readFileSync } from 'node:fs';

const result = analyzeGmtText(readFileSync('gene_sets.gmt', 'utf8'));
```

## GMX (Broad column-oriented gene sets)

Row 1 = set names, row 2 = descriptions, remaining rows = items.

```ts
import { analyzeGmxText } from 'venn-diagram-lab';
import { readFileSync } from 'node:fs';

const result = analyzeGmxText(readFileSync('gene_sets.gmx', 'utf8'));
```

The CLI uses file extension (`.gmt` / `.gmx`) to auto-detect format; everything else is
treated as CSV/TSV.

# TSV exports

Three functions export analysis results as tab-separated text. All three are
**byte-identical** to the web tool's Export menu and to the Python and R equivalents —
verified by parity tests across all bundled samples.

## Region Summary

```ts
import { toRegionSummaryTsv } from 'venn-diagram-lab';
import { writeFileSync } from 'node:fs';

const tsv = toRegionSummaryTsv(result);
writeFileSync('region_summary.tsv', tsv, 'utf8');
```

One row per region. Columns: region label, exclusive item count, comma-separated
exclusive items. Mirrors the web tool's **Export → Region Summary**.

## Item Matrix

```ts
import { toMatrixTsv } from 'venn-diagram-lab';

const tsv = toMatrixTsv(result);
writeFileSync('matrix.tsv', tsv, 'utf8');
```

Binary item × set membership matrix. Each row is one item; each set column is 0 or 1.
Mirrors the web tool's **Export → Item Matrix**.

## Statistics

```ts
import { toStatisticsTsv } from 'venn-diagram-lab';

const tsv = toStatisticsTsv(result);
writeFileSync('statistics.tsv', tsv, 'utf8');
```

Pairwise statistics table. Columns include Jaccard index, Dice coefficient, fold
enrichment, and BH-corrected FDR for every set pair. Mirrors the web tool's
**Export → Statistics**.

## Writing all three at once

```ts
import {
  loadSampleText,
  analyzeCsvText,
  toRegionSummaryTsv,
  toMatrixTsv,
  toStatisticsTsv,
} from 'venn-diagram-lab';
import { writeFileSync } from 'node:fs';

const result = analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4'));
writeFileSync('region_summary.tsv', toRegionSummaryTsv(result), 'utf8');
writeFileSync('matrix.tsv',         toMatrixTsv(result),         'utf8');
writeFileSync('statistics.tsv',     toStatisticsTsv(result),     'utf8');
```

# Rendering

Seven functions produce SVG strings. All renders are byte-identical to the web tool's
shared builders.

## Templated Venn diagram

```ts
import { toVennSvg, listVennModels } from 'venn-diagram-lab';

// Pick a model whose set count matches the data
console.log(listVennModels().filter(m => m.includes('4-set')));
// ['venn-4-set.svg', 'venn-4a-set-edwards.svg', 'venn-4b-set-anderson.svg', ...]

const svg = toVennSvg(result, 'venn-4-set');
```

`toVennSvg(result, model)` fills the named template's count labels and set names. The
`model` argument is a filename from `listVennModels()` — the `.svg` extension is
optional. The function **throws** if the model's set count does not match
`result.columns.length`.

## Area-proportional diagram (2–3 sets)

```ts
import { toProportionalSvg } from 'venn-diagram-lab';

const svg = toProportionalSvg(result); // 2 or 3 sets only
```

Solves circle positions to make areas proportional to set sizes and intersections.
**Throws** for fewer than 2 or more than 3 sets.

## UpSet plot

```ts
import { toUpsetSvg } from 'venn-diagram-lab';

const svg = toUpsetSvg(result);
```

Print-optimized UpSet plot. Shows intersection bars above a dot matrix, with horizontal
set size bars. Maximum 20 columns (top 20 intersections by count).

## Force-directed network

```ts
import { toNetworkSvg } from 'venn-diagram-lab';

// Default metric: intersection count
const svg = toNetworkSvg(result);

// Choose a different edge weight
const svg2 = toNetworkSvg(result, 'jaccard');
```

Valid edge weight metrics:

| Value | Description |
|---|---|
| `'intersection'` | Raw intersection count (default) |
| `'jaccard'` | Jaccard index |
| `'foldEnrichment'` | Fold enrichment |
| `'overlapCoeff'` | Overlap coefficient |

## Item-share-distribution histogram

```ts
import { toShareDistributionSvg } from 'venn-diagram-lab';

const svg = toShareDistributionSvg(result);
```

Bar chart showing how many items are shared across exactly 1, 2, 3, … sets.

## Enrichment bar chart

```ts
import { toEnrichmentBarSvg } from 'venn-diagram-lab';

const svg  = toEnrichmentBarSvg(result);                         // default: neglog10fdr
const svg2 = toEnrichmentBarSvg(result, 'foldEnrichment');
```

Pairwise enrichment displayed as a bar chart.

Valid enrichment metrics:

| Value | Description |
|---|---|
| `'neglog10fdr'` | −log10(BH-FDR) — default |
| `'foldEnrichment'` | Fold enrichment |

## Enrichment lollipop chart

```ts
import { toEnrichmentLollipopSvg } from 'venn-diagram-lab';

const svg  = toEnrichmentLollipopSvg(result);
const svg2 = toEnrichmentLollipopSvg(result, 'foldEnrichment');
```

Same pairwise enrichment data as the bar chart, rendered as a lollipop. Accepts the
same two metrics.

## Writing an SVG file

All seven functions return a plain `string`. Write with `fs.writeFileSync`:

```ts
import { writeFileSync } from 'node:fs';

writeFileSync('network.svg', toNetworkSvg(result), 'utf8');
```

# Rasterization

```ts
import { svgToPng, svgToPdf } from 'venn-diagram-lab';
```

## PNG (synchronous)

```ts
const png: Uint8Array = svgToPng(svg);
// or with explicit width:
const png1200 = svgToPng(svg, { fitWidth: 1200 });

import { writeFileSync } from 'node:fs';
writeFileSync('diagram.png', png1200);
```

`svgToPng` is **synchronous** and returns a `Uint8Array`. `fitWidth` scales the output
to that pixel width while preserving the aspect ratio. When omitted, the SVG's intrinsic
size is used.

## PDF (asynchronous, single page)

```ts
const pdf: Uint8Array = await svgToPdf(svg);
// or:
const pdf1200 = await svgToPdf(svg, { fitWidth: 1200 });

writeFileSync('diagram.pdf', pdf1200);
```

`svgToPdf` rasterizes the SVG to PNG at `fitWidth` (default 1200 px), then embeds it in
a single-page PDF whose dimensions match the rendered image. Returns a `Promise<Uint8Array>`.

> **Font note:** Both functions load system fonts via `@resvg/resvg-js`. Text rendering
> depends on the fonts installed on the machine running the code. For consistent output
> across environments, ensure the relevant fonts are present.

## Options interfaces

```ts
interface PngOptions {
  fitWidth?: number;  // render width in px; height scales proportionally
}

interface PdfOptions {
  fitWidth?: number;  // raster width before embedding; default 1200
}
```

# PDF report

`renderPdfReport(result, opts?)` composes a full multi-page PDF report from an
`AnalyzeResult`, mirroring the page-by-page layout of the web tool's PDF report
(`src/utils/pdfReport.ts`) and its Python/R equivalents.

```ts
import { writeFileSync } from 'node:fs';
import { loadSampleText, analyzeCsvText, renderPdfReport } from 'venn-diagram-lab';

const result = analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4'));

const pdf = await renderPdfReport(result, {
  title: 'Cancer Drivers — 4-Set Overlap',
  model: 'dataset_real_cancer_drivers_4.tsv',
  vennModel: 'venn-4-set',
});

writeFileSync('report.pdf', pdf);
```

## Signature

```ts
function renderPdfReport(
  result: AnalyzeResult,
  opts?: RenderPdfReportOptions,
): Promise<Uint8Array>;

interface RenderPdfReportOptions {
  title?: string;      // report title, shown in the Data Overview block. Default: 'Data Report'
  model?: string;      // source-file label, shown in the Data Overview block
  vennModel?: string;  // Venn model filename ('.svg' optional); auto-picked by set count if omitted
}
```

`opts` and every field on it is optional. If `vennModel` is omitted, the function calls
the same set-count-matching logic as `toVennSvg` selection: it prefers the canonical
`venn-N-set.svg` template for the data's set count, falling back to any bundled template
whose name-label count matches. It throws if no bundled model matches.

All embedded figures are rasterised to PNG via `@resvg/resvg-js` (the same rasteriser
used by `svgToPng`) before being placed on the page, so the same system-font caveat
applies (see [Rasterization](#rasterization)).

## Page-by-page layout

The report is built with a fixed page order. For 2–6 sets, the three Statistics tables
share one page; for 7–9 sets, each Statistics table gets its own page (there are simply
more rows to fit).

1. **Data Overview + Set Sizes** — a key/value block (Title, Source, Venn model, Number
   of sets, Background universe, Items assigned to regions, Total regions, Filled
   regions, Core intersection, Largest exclusive region) followed by a **Set Sizes**
   table: one row per set with Size, Exclusive count, Shared count, and percentage share
   of the inclusive total.
2. **Plots** — the **Venn Diagram** (filled `vennModel` template) and the **UpSet Plot**
   (top 20 intersections by size, same builder as `toUpsetSvg`).
3. **Set Relationship Network** — the force-directed network (`toNetworkSvg`, weighted by
   Jaccard index) plus a text line listing every pair with FDR < 0.05 and its Jaccard
   value, when any exist.
4. **Statistics** —
   - **Pairwise Jaccard Index**: Pair, Intersection, Union, Jaccard, Overlap Coefficient.
   - **Sørensen–Dice Index**: Pair, Dice.
   - **Intersection Enrichment (Hypergeometric Test)**: Pair, Observed, Expected, Fold
     Enrichment, p-value, FDR, and a significance marker (`***` FDR<0.001, `**` FDR<0.01,
     `*` FDR<0.05, `ns` otherwise).
5. **Statistics: Enrichment Visualisations** — the **Bar chart** (`toEnrichmentBarSvg`)
   and the **Lollipop chart** (`toEnrichmentLollipopSvg`), both using the default
   `neglog10fdr` metric.
6. **Item Share Distribution** — the histogram (`toShareDistributionSvg`) showing how
   many items belong to exactly 1, 2, 3, … sets.
7. **About This Report** — closing page(s) of methodology text shared verbatim across
   the Web, Python, R, and Node reports: short explanations of Venn diagrams, UpSet
   plots, the Set Relationship Network, the Jaccard index, the Sørensen–Dice index, the
   hypergeometric enrichment test, and the bar/lollipop charts and item-share
   distribution shown earlier in the report. This shared text also briefly documents two
   concepts used elsewhere in the Venn Diagram Lab suite (Heatmap and Cluster Heatmap)
   that are **not** rendered as figures in this Node PDF report — their numeric
   equivalents live in the Intersection Enrichment table above.

   The **final section is "Credits and Cite"**: authorship, MIT license note, and a
   table linking all four packages (Web, PyPI, CRAN, npm) plus the GitHub repository,
   Zenodo DOI, and full citation string — identical content to the
   [Credits and Cite](../README.md#credits-and-cite) section of this package's README.

## CLI

```bash
vdl report <input> --out <path.pdf> [--model <id>] [--title <text>]
```

| Argument / flag | Required | Description |
|---|---|---|
| `<input>` | yes | Path to the input file (CSV, TSV, GMT, GMX); format auto-detected |
| `--out <path>` | yes | Output PDF path; **must** end in `.pdf` (validated before running) |
| `--model <id>` | no | Venn model filename to use in the report, e.g. `venn-4-set` (maps to `vennModel`) |
| `--title <text>` | no | Report title shown in the Data Overview block |

**Examples:**

```bash
# Minimal: auto-picked Venn model, default title
vdl report genes.tsv --out report.pdf

# Explicit model and title
vdl report genes.tsv --out report.pdf --model venn-4-set --title "Cancer Drivers"

# GMT input
vdl report gene_sets.gmt --out report.pdf
```

**Error behaviour:**

- **Missing `--out`** — message to stderr, exit code 1.
- **`--out` not ending in `.pdf`** — message to stderr, exit code 1.
- **No bundled Venn model matches the data's set count** (only possible when `--model`
  is omitted and the data has an unusual set count) — `renderPdfReport` throws; the
  error message is written to stderr, exit code 1.

# Bundled assets

## Sample datasets

Five curated datasets ship with the package (3 real biological, 2 mock):

```ts
import { listSamples, loadSampleText } from 'venn-diagram-lab';

console.log(listSamples());
// [
//   'dataset_real_cancer_drivers_4',
//   'dataset_real_msigdb_cancer_pathways',
//   'dataset_real_msigdb_immune_pathways',
//   'dataset_mock_gene_sets',
//   'dataset_mock_streaming_platforms',
// ]

const text = loadSampleText('dataset_real_cancer_drivers_4');
const result = analyzeCsvText(text);
```

`loadSampleText(name)` returns the raw file content as a UTF-8 string. It **throws**
with a descriptive message for unknown names.

The real datasets (`dataset_real_*`) are TSV files; the mock datasets
(`dataset_mock_*`) are CSV files. `analyzeCsvText` handles both automatically.

## Venn model templates

Forty-four SVG model templates covering set counts 2–9 and all major construction
families (Venn, Edwards, Anderson, Grunbaum, Bannier, Carroll, Mamakani et al., SUMO):

```ts
import { listVennModels, loadVennTemplate } from 'venn-diagram-lab';

const models = listVennModels();
// sorted array of 44 filenames: ['venn-2-set.svg', 'venn-2a-set-edwards.svg', ...]

// Filter by set count
const fourSetModels = models.filter(m => m.startsWith('venn-4'));

// Load a template (raw SVG string; '.svg' extension is optional)
const template = loadVennTemplate('venn-4-set');
```

`loadVennTemplate` **throws** with a descriptive message if the filename is not in the
bundled set.

# CLI reference

The `vdl` CLI exposes three commands: `analyze`, `render`, and `report`.

```
vdl [--version] [--help]
vdl analyze <input> [options]
vdl render  <kind>  <input> [options]
vdl report  <input> [options]
```

## `vdl analyze`

Analyze a CSV/TSV/GMT/GMX file and write TSV outputs.

```
vdl analyze <input> [--region-summary <path>] [--matrix <path>] [--statistics <path>]
```

| Argument / flag | Description |
|---|---|
| `<input>` | Path to the input file (CSV, TSV, GMT, GMX) |
| `--region-summary <path>` | Write Region Summary TSV to this path |
| `--matrix <path>` | Write Item Matrix TSV to this path |
| `--statistics <path>` | Write Statistics TSV to this path |

When no output flags are given, the Region Summary TSV is printed to stdout.
File format is auto-detected: `.gmt` → GMT, `.gmx` → GMX, everything else → CSV/TSV.

**Examples:**

```bash
# Print Region Summary to stdout
vdl analyze genes.tsv

# Write all three outputs
vdl analyze genes.tsv \
  --region-summary summary.tsv \
  --matrix         matrix.tsv \
  --statistics     stats.tsv

# GMT input
vdl analyze gene_sets.gmt --region-summary summary.tsv
```

## `vdl render`

Render a visualization and write SVG, PNG, or PDF output.

```
vdl render <kind> <input> [--out <path>] [--model <name>] [--metric <value>]
```

| Argument / flag | Description |
|---|---|
| `<kind>` | One of the 7 render kinds (see table below) |
| `<input>` | Path to the input file (CSV, TSV, GMT, GMX) |
| `--out <path>` | Output path. Extension determines format: `.svg`, `.png`, or `.pdf`. Default: print SVG to stdout |
| `--model <name>` | Required for `kind=venn`. Venn model filename, e.g. `venn-4-set` |
| `--metric <value>` | Edge/enrichment metric (see per-kind details below) |

### Render kinds

| Kind | Description | `--metric` values |
|---|---|---|
| `venn` | Fill a named Venn model template | — (no metric; requires `--model`) |
| `proportional` | Area-proportional diagram (2–3 sets only) | — |
| `upset` | UpSet plot | — |
| `network` | Force-directed set-relationship network | `intersection` (default), `jaccard`, `foldEnrichment`, `overlapCoeff` |
| `share-dist` | Item-share-distribution histogram | — |
| `enrichment-bar` | Pairwise enrichment bar chart | `neglog10fdr` (default), `foldEnrichment` |
| `enrichment-lollipop` | Pairwise enrichment lollipop chart | `neglog10fdr` (default), `foldEnrichment` |

### Output format inference

The `--out` flag infers the output format from the file extension:

| Extension | Output |
|---|---|
| `.svg` (or absent) | SVG text written to file (or stdout) |
| `.png` | PNG raster (synchronous rasterization via `@resvg/resvg-js`) |
| `.pdf` | Single-page PDF embedding the rasterized PNG |

### Examples

```bash
# Venn SVG into a named model
vdl render venn genes.tsv --model venn-4-set --out venn.svg

# Area-proportional (2 or 3 sets only)
vdl render proportional two_sets.tsv --out proportional.svg

# UpSet plot as PNG
vdl render upset genes.tsv --out upset.png

# Network with Jaccard weighting as PDF
vdl render network genes.tsv --metric jaccard --out network.pdf

# Item-share distribution (stdout SVG)
vdl render share-dist genes.tsv

# Enrichment bar chart
vdl render enrichment-bar genes.tsv --out enrichment.svg

# Enrichment lollipop with fold enrichment metric
vdl render enrichment-lollipop genes.tsv --metric foldEnrichment --out lollipop.svg

# GMT input
vdl render venn gene_sets.gmt --model venn-4-set --out venn.svg
```

### Error behaviour

- **Unknown render kind** — message to stderr, exit code 1.
- **Unknown `--metric` value** — message to stderr listing valid options, exit code 1.
- **`kind=venn` without `--model`** — message to stderr, exit code 1.
- **Set-count mismatch** (`--model` has different set count than the data) — the
  `toVennSvg` function throws; the error message is written to stderr, exit code 1.
- **`kind=proportional` with n ≠ 2 or 3** — `toProportionalSvg` throws; error to stderr,
  exit code 1.

## `vdl report`

Generate the multi-page PDF report from a CSV/TSV/GMT/GMX analysis. See the
[PDF report](#pdf-report) section above for the full page-by-page description of what
this command produces.

```
vdl report <input> --out <path.pdf> [--model <id>] [--title <text>]
```

| Argument / flag | Description |
|---|---|
| `<input>` | Path to the input file (CSV, TSV, GMT, GMX) |
| `--out <path>` | Required. Output path for the PDF; must end in `.pdf` |
| `--model <id>` | Venn model filename used on the Plots page, e.g. `venn-4-set`. Auto-picked by set count if omitted |
| `--title <text>` | Report title shown in the Data Overview block |

**Examples:**

```bash
vdl report genes.tsv --out report.pdf
vdl report genes.tsv --out report.pdf --model venn-4-set --title "Cancer Drivers"
vdl report gene_sets.gmt --out report.pdf
```

### Error behaviour

- **Missing `--out`** — message to stderr, exit code 1.
- **`--out` not ending in `.pdf`** — message to stderr, exit code 1.
- **No bundled Venn model matches the data's set count** (when `--model` is omitted) —
  `renderPdfReport` throws; error to stderr, exit code 1.

# API reference

## Analysis

| Function | Signature | Returns |
|---|---|---|
| `analyzeCsvText` | `(text: string) => AnalyzeResult` | Parse raw CSV/TSV and analyze |
| `analyzeCsv` | `(csv: CsvData) => AnalyzeResult` | Analyze pre-parsed CSV data |
| `analyzeGmtText` | `(text: string) => AnalyzeResult` | Parse GMT and analyze |
| `analyzeGmxText` | `(text: string) => AnalyzeResult` | Parse GMX and analyze |

## TSV exports

| Function | Signature | Returns |
|---|---|---|
| `toRegionSummaryTsv` | `(result: AnalyzeResult) => string` | Region Summary TSV |
| `toMatrixTsv` | `(result: AnalyzeResult) => string` | Item Matrix TSV |
| `toStatisticsTsv` | `(result: AnalyzeResult) => string` | Statistics TSV |

## Rendering

| Function | Signature | Returns |
|---|---|---|
| `toVennSvg` | `(result: AnalyzeResult, model: string) => string` | Filled Venn template SVG |
| `toProportionalSvg` | `(result: AnalyzeResult) => string` | Area-proportional SVG (2–3 sets) |
| `toUpsetSvg` | `(result: AnalyzeResult) => string` | UpSet plot SVG |
| `toNetworkSvg` | `(result: AnalyzeResult, metric?: EdgeWeightMetric) => string` | Network SVG |
| `toShareDistributionSvg` | `(result: AnalyzeResult) => string` | Share-distribution SVG |
| `toEnrichmentBarSvg` | `(result: AnalyzeResult, metric?: EnrichmentMetric) => string` | Enrichment bar SVG |
| `toEnrichmentLollipopSvg` | `(result: AnalyzeResult, metric?: EnrichmentMetric) => string` | Enrichment lollipop SVG |

## Rasterization

| Function | Signature | Returns |
|---|---|---|
| `svgToPng` | `(svg: string, opts?: PngOptions) => Uint8Array` | PNG bytes (sync) |
| `svgToPdf` | `(svg: string, opts?: PdfOptions) => Promise<Uint8Array>` | PDF bytes (async) |

## PDF report

| Function | Signature | Returns |
|---|---|---|
| `renderPdfReport` | `(result: AnalyzeResult, opts?: RenderPdfReportOptions) => Promise<Uint8Array>` | Multi-page PDF report bytes |

## Bundled data

| Function | Signature | Returns |
|---|---|---|
| `listSamples` | `() => string[]` | Names of 5 bundled sample datasets |
| `loadSampleText` | `(name: string) => string` | Raw text of a bundled sample |
| `listVennModels` | `() => string[]` | Filenames of 44 bundled Venn model templates |
| `loadVennTemplate` | `(model: string) => string` | Raw SVG of a bundled model template |

# Parity note

TSV output from `toRegionSummaryTsv`, `toMatrixTsv`, and `toStatisticsTsv` is
byte-identical to:

- the web tool's **Export** menu downloads,
- `venn_diagram_lab` (Python) equivalents,
- `vennDiagramLab` (R) equivalents.

Parity is verified by fixture-based tests that run the Node, Python, and R functions on
all five bundled samples and compare outputs byte-for-byte. The SVG builders
(`toVennSvg`, `toUpsetSvg`, `toNetworkSvg`, etc.) also share code with the web tool and
produce identical files.
