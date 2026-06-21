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

Three export functions produce byte-identical output to the web tool's Export menu:

```ts
import { toRegionSummaryTsv, toMatrixTsv, toStatisticsTsv } from 'venn-diagram-lab';

const regionSummary = toRegionSummaryTsv(result); // one row per region: label, count, items
const matrix        = toMatrixTsv(result);        // item × set binary membership matrix
const statistics    = toStatisticsTsv(result);    // pairwise Jaccard, Dice, enrichment, FDR
```

All three return a `string` (UTF-8 TSV, `\n` line endings). Write them with
`fs.writeFileSync(path, tsv, 'utf8')`.

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

# Write all three TSV outputs
vdl analyze genes.tsv \
  --region-summary summary.tsv \
  --matrix         matrix.tsv \
  --statistics     stats.tsv
```

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

All packages share the same core math and produce byte-identical TSV exports.

---

## License

MIT — see [LICENSE](../../LICENSE).
