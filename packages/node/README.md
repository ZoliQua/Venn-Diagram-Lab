# venn-diagram-lab

Headless Venn diagram analysis and rendering for Node.js.

[![npm version](https://img.shields.io/npm/v/venn-diagram-lab.svg)](https://www.npmjs.com/package/venn-diagram-lab)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

`venn-diagram-lab` is the JavaScript/TypeScript companion to the
[Venn Diagram Lab](https://venndiagramlab.org/) web tool. It shares the same core code as
the web tool and as the Python (`venn-diagram-lab` on PyPI) and R (`vennDiagramLab` on
CRAN) packages, so TSV exports and SVG renders are **byte-identical** across all four
surfaces. No browser required — all analysis and rendering runs headlessly in Node.js.

## Install

```bash
npm install venn-diagram-lab
```

Requires Node.js 18 or newer.

## Quickstart

```ts
import { writeFileSync } from 'node:fs';
import {
  loadSampleText,
  analyzeCsvText,
  toRegionSummaryTsv,
  toVennSvg,
  svgToPng,
} from 'venn-diagram-lab';

// 1. Load a bundled sample dataset
const text = loadSampleText('dataset_real_cancer_drivers_4');

// 2. Analyze (auto-detects binary vs. aggregated)
const result = analyzeCsvText(text);
// result.mode === 'binary'   result.setNames has 4 names

// 3. Write Region Summary TSV (byte-identical to web tool's Export → Region Summary)
writeFileSync('summary.tsv', toRegionSummaryTsv(result), 'utf8');

// 4. Render to a named Venn template SVG
//    Pick a model with the right set count (4 sets → venn-4-set)
const svg = toVennSvg(result, 'venn-4-set');
writeFileSync('venn.svg', svg, 'utf8');

// 5. Rasterize to PNG
const png = svgToPng(svg, { fitWidth: 1200 });
writeFileSync('venn.png', png);
```

---

## Analysis

```ts
import { analyzeCsvText, analyzeGmtText, analyzeGmxText, analyzeCsv } from 'venn-diagram-lab';
```

| Function | Input | Notes |
|---|---|---|
| `analyzeCsvText(text)` | raw CSV/TSV string | auto-detects delimiter; auto-detects binary vs. aggregated mode |
| `analyzeCsv(csv)` | pre-parsed `CsvData` | same logic, skip re-parsing |
| `analyzeGmtText(text)` | Broad GMT string | one gene-set per line |
| `analyzeGmxText(text)` | Broad GMX string | column-oriented gene sets |

All four return an `AnalyzeResult`:

```ts
interface AnalyzeResult {
  csv:      CsvData;            // raw parsed table
  columns:  number[];           // indices of the set columns
  setNames: string[];           // header labels for the sets
  venn:     VennResult;         // region counts + item lists + totals
  mode:     'binary' | 'aggregated';
}
```

**Binary mode** — the input is a wide-form item × set matrix with 0/1 values. Columns
with only 0/1 entries are auto-selected as sets.

**Aggregated mode** — every column is a set and cells hold the item identifiers. Activated
when no binary columns are detected.

---

## TSV exports

Four export functions produce byte-identical output to the web tool's Export menu:

```ts
import {
  toRegionSummaryTsv, toMatrixTsv, toStatisticsTsv, toOneVsRestTsv,
} from 'venn-diagram-lab';

const regionSummary = toRegionSummaryTsv(result); // one row per region: label, count, items
const matrix        = toMatrixTsv(result);        // item × set binary membership matrix
const statistics    = toStatisticsTsv(result);    // pairwise Jaccard, Dice, enrichment, FDR, ...
const oneVsRest     = toOneVsRestTsv(result);     // each set vs. the union of all other sets
```

All four return a `string` (UTF-8 TSV, `\n` line endings). Write them with
`fs.writeFileSync(path, tsv, 'utf8')`.

`toStatisticsTsv` columns: `Set_A, Set_B, Name_A, Name_B, Size_A, Size_B, Intersection,
Union, Jaccard, Overlap_Coeff, Dice, Expected, Fold_Enrichment, P_value, FDR, Bonferroni,
P_two_sided, Jaccard_CI_low, Jaccard_CI_high, Dice_CI_low, Dice_CI_high, Significant`.
`P_value` is the **one-sided** Fisher's exact over-representation p-value; `P_two_sided`
is the **two-sided** Fisher's exact variant of the same pair. `Bonferroni` is the
FWER-adjusted p-value (`min(1, p * m)`), reported alongside the existing
Benjamini-Hochberg `FDR` column. `Jaccard_CI_low/high` and `Dice_CI_low/high` are
analytic Wilson 95% confidence intervals.

`toOneVsRestTsv` columns: `Set, Name, Size, Rest_Size, Intersection, Expected,
Fold_Enrichment, P_value, FDR, Bonferroni, Significant`.

These additions are export-layer only — the PDF report's Statistics pages
(`renderPdfReport`, below) keep their existing column set.

---

## JSON export

```ts
import { toResultJson } from 'venn-diagram-lab';

const json = toResultJson(result, 'venn-4-set'); // model id is optional, second argument
fs.writeFileSync('result.json', json, 'utf8');
```

`toResultJson(result, model?)` returns a `string` — the full region + statistics result
(model id, set names, universe size, every non-empty region with exclusive/inclusive
counts and exclusive items, single-set sizes, and the pairwise statistics array
including `bonferroni` / `pTwoSided`) as one canonical JSON document. Byte-equivalent to
the web tool's "Full Result (JSON)" export, Python's `RegionResult.to_json()`, and R's
`to_result_json()`.

---

## Rendering

Seven SVG-rendering functions, all returning a `string`:

```ts
import {
  toVennSvg,
  toProportionalSvg,
  toUpsetSvg,
  toNetworkSvg,
  toShareDistributionSvg,
  toEnrichmentBarSvg,
  toEnrichmentLollipopSvg,
} from 'venn-diagram-lab';
```

| Function | Description | Extra argument |
|---|---|---|
| `toVennSvg(result, model)` | Fill a bundled Venn template with counts and names | `model`: filename from `listVennModels()`, e.g. `'venn-4-set'` |
| `toProportionalSvg(result)` | Area-proportional circle layout | 2 or 3 sets only; throws for other counts |
| `toUpsetSvg(result)` | Print-optimized UpSet plot | — |
| `toNetworkSvg(result, metric?)` | Force-directed set-relationship network | `metric`: `'intersection'` (default) \| `'jaccard'` \| `'foldEnrichment'` \| `'overlapCoeff'` |
| `toShareDistributionSvg(result)` | Item-share-distribution histogram | — |
| `toEnrichmentBarSvg(result, metric?)` | Pairwise enrichment bar chart | `metric`: `'neglog10fdr'` (default) \| `'foldEnrichment'` |
| `toEnrichmentLollipopSvg(result, metric?)` | Pairwise enrichment lollipop chart | `metric`: `'neglog10fdr'` (default) \| `'foldEnrichment'` |

`toVennSvg` throws if the model's set count does not match `result.columns.length`.
`toProportionalSvg` throws for fewer than 2 or more than 3 sets.

---

## Network export (Cytoscape)

```ts
import { toNetworkGraphml, toNetworkSif } from 'venn-diagram-lab';

const graphml = toNetworkGraphml(result);              // default metric: 'intersection'
const sif     = toNetworkSif(result, 'jaccard');        // metric drives the graphml `weight` field
fs.writeFileSync('network.graphml', graphml, 'utf8');
fs.writeFileSync('network.sif', sif, 'utf8');
```

`toNetworkGraphml(result, metric?)` and `toNetworkSif(result, metric?)` both return a
`string` for the same force-directed network as `toNetworkSvg` (nodes = sets, edges =
every pairwise overlap). `metric` is the same `EdgeWeightMetric` union used by
`toNetworkSvg` — `'intersection'` (default) \| `'jaccard'` \| `'foldEnrichment'` \|
`'overlapCoeff'` — and only affects the `weight` value; every pairwise edge is written
regardless of metric.

- **GraphML**: standard 2-space-indented GraphML XML with node keys (`label`, `size`) and
  edge keys (`weight`, `intersection`, `jaccard`, `foldEnrichment`, `overlapCoeff`, `dice`,
  `pValue`, `fdr`, `significant`).
- **SIF**: one line per edge (`<sourceId>\toverlap\t<targetId>`, letter ids), with
  isolated (degree-0) nodes emitted as lone id lines after all edges.

Both formats are Cytoscape-compatible and byte-identical to the web tool's Network-view
"Export GraphML" / "Export SIF" buttons and to the Python/R exporters.

---

## Rasterization

```ts
import { svgToPng, svgToPdf } from 'venn-diagram-lab';

// Synchronous → Uint8Array
const png = svgToPng(svg, { fitWidth: 1200 });
fs.writeFileSync('diagram.png', png);

// Async → Uint8Array (single-page PDF sized to the image)
const pdf = await svgToPdf(svg, { fitWidth: 1200 });
fs.writeFileSync('diagram.pdf', pdf);
```

`fitWidth` scales the output to that pixel width; height is preserved proportionally.
`svgToPdf` defaults to `fitWidth: 1200` when the option is omitted.

> **Font note:** both functions load system fonts via `@resvg/resvg-js`. Text rendering
> depends on fonts available on the current machine.

---

## PDF report

```ts
import { renderPdfReport } from 'venn-diagram-lab';
```

`renderPdfReport(result, opts?)` composes a multi-page PDF report from an `AnalyzeResult`
and returns `Promise<Uint8Array>`:

```ts
import { writeFileSync } from 'node:fs';
import { loadSampleText, analyzeCsvText, renderPdfReport } from 'venn-diagram-lab';

const result = analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4'));

const pdf = await renderPdfReport(result, {
  title: 'Cancer Drivers — 4-Set Overlap',
  model: 'dataset_real_cancer_drivers_4.tsv',
});

writeFileSync('report.pdf', pdf);
```

`RenderPdfReportOptions` (all optional):

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `'Data Report'` | Report title shown in the Data Overview block |
| `model` | `string` | `'(in-memory data)'` | Source-file label shown in the Data Overview block |
| `vennModel` | `string` | auto-picked by set count | Bundled Venn model filename to render on the Plots page (`.svg` optional) |

If `vennModel` is omitted, a bundled template whose set count matches the data is chosen
automatically (preferring the canonical `venn-N-set.svg`).

The report is multi-page: a Data Overview + Set Sizes page, a Plots page (Venn diagram +
UpSet plot), a Set Relationship Network page with its significant-edges list, Statistics
tables (Jaccard, Sørensen–Dice, hypergeometric Enrichment), an Enrichment Visualisations
page (bar chart + lollipop chart), an Item Share Distribution histogram, and a final
**About + Credits & Cite** page listing the Web, Python, R, and Node.js packages. All
figures are rasterised via `@resvg/resvg-js` and embedded as PNG images.

The same report is available from the shell as `vdl report` — see **CLI → Report** below.

---

## Bundled assets

### 5 sample datasets

```ts
import { listSamples, loadSampleText } from 'venn-diagram-lab';

listSamples();
// [
//   'dataset_real_cancer_drivers_4',
//   'dataset_real_msigdb_cancer_pathways',
//   'dataset_real_msigdb_immune_pathways',
//   'dataset_mock_gene_sets',
//   'dataset_mock_streaming_platforms',
// ]

const text = loadSampleText('dataset_real_cancer_drivers_4'); // raw TSV/CSV string
```

`loadSampleText` throws for unknown names.

### 44 Venn model templates

```ts
import { listVennModels, loadVennTemplate } from 'venn-diagram-lab';

listVennModels();  // sorted array of 44 filenames, e.g. ['venn-2-set.svg', ...]
const svg = loadVennTemplate('venn-4-set'); // raw SVG template string ('.svg' optional)
```

`loadVennTemplate` throws if the model is not in the bundled set.

---

## CLI

Install globally or use `npx`:

```bash
npm install -g venn-diagram-lab
# or: npx vdl --help
```

### Analyze

```bash
# Print Region Summary to stdout
vdl analyze genes.tsv

# Write all four outputs (TSV x3 + JSON)
vdl analyze genes.tsv \
  --region-summary summary.tsv \
  --matrix         matrix.tsv \
  --statistics     stats.tsv \
  --json           result.json
```

`--json <path>` writes the full result + statistics JSON (`toResultJson`); pair it with
`--model <id>` to set the `model` field written into the JSON (defaults to `venn-<n>-set`).

### Export

`vdl export <kind> <input> [--out <path>]` writes a single artifact to a path (or
stdout, if `--out` is omitted):

```bash
vdl export one-vs-rest    genes.tsv --out one_vs_rest.tsv
vdl export region-summary genes.tsv --out summary.tsv
vdl export matrix         genes.tsv --out matrix.tsv
vdl export statistics     genes.tsv --out stats.tsv

# Cytoscape network export
vdl export graphml genes.tsv --out network.graphml
vdl export sif     genes.tsv --out network.sif --metric jaccard
```

`one-vs-rest | region-summary | matrix | statistics | graphml | sif` are the valid
`<kind>` values. `--metric <metric>` (`intersection` (default) \| `jaccard` \|
`foldEnrichment` \| `overlapCoeff`) applies only to `graphml`/`sif`, selecting the edge
`weight` field. There is no `export json` subcommand — write the JSON export via
`vdl analyze --json <path>` (above).

### Render

```bash
vdl render venn               genes.tsv --model venn-4-set --out venn.svg
vdl render proportional       two_sets.tsv --out proportional.svg  # 2-3 sets
vdl render upset              genes.tsv --out upset.svg
vdl render network            genes.tsv --out network.svg
vdl render network            genes.tsv --metric jaccard --out network.svg
vdl render share-dist         genes.tsv --out share.svg
vdl render enrichment-bar     genes.tsv --out bar.svg
vdl render enrichment-lollipop genes.tsv --out lollipop.svg --metric foldEnrichment

# Output format inferred from extension: .svg, .png, or .pdf
vdl render upset genes.tsv --out upset.png
vdl render venn  genes.tsv --model venn-4-set --out venn.pdf
```

### Report

```bash
vdl report genes.tsv --out report.pdf
vdl report genes.tsv --out report.pdf --model venn-4-set --title "Cancer Drivers"
```

| Flag | Required | Description |
|---|---|---|
| `--out <path>` | yes | Output path; must end in `.pdf` |
| `--model <id>` | no | Venn model filename to use in the report, e.g. `venn-4-set` |
| `--title <text>` | no | Report title shown in the Data Overview block |

`<input>` is a CSV/TSV/GMT/GMX path (format auto-detected, same rule as `vdl analyze` /
`vdl render`).

See the [Full User Guide](./user-guide/USER_GUIDE.md)
([GitHub](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/packages/node/user-guide/USER_GUIDE.md))
for complete CLI reference, all flag details, and extended code examples.

---

## Companion packages

| Surface | Install | Status |
|---|---|---|
| **Web tool** | [venndiagramlab.org](https://venndiagramlab.org/) | live |
| **Python (PyPI)** | `pip install venn-diagram-lab` | live |
| **R (CRAN)** | `install.packages("vennDiagramLab")` | live |
| **Node.js (npm)** | `npm install venn-diagram-lab` | live |

All packages share the same core math and produce byte-identical TSV exports.

---

## Credits and Cite

Venn Diagram Lab is developed and maintained by **Zoltán Dul, Márton Ölbei, N. Shaun B. Thomas, Azeddine Si Ammour, and Attila Csikász-Nagy**. Open-source under the MIT License.

### All packages

| Surface | Package / URL |
|---|---|
| Web | <https://venndiagramlab.org/> |
| Python | [`venn-diagram-lab` on PyPI](https://pypi.org/project/venn-diagram-lab/) |
| R | [`vennDiagramLab` on CRAN](https://CRAN.R-project.org/package=vennDiagramLab) |
| Node.js | [`venn-diagram-lab` on npm](https://www.npmjs.com/package/venn-diagram-lab) |

All packages share the same core math and produce byte-identical TSV exports.

### Citation

If you use this package in research, please cite via the Zenodo concept (all-versions) DOI:

```
Dul Z., Ölbei M., Thomas N. S. B., Si Ammour A., Csikász-Nagy A. (2026).
Venn Diagram Lab — interactive Venn / UpSet diagrams.
https://venndiagramlab.org/
DOI: 10.5281/zenodo.19510813 (concept, all versions)
```

[![DOI](http://www.venndiagramlab.org/zenodo.19510813.svg)](https://doi.org/10.5281/zenodo.19510813)

---

## License

MIT — see [LICENSE](../../LICENSE).
