# venn-diagram-lab (Node)

Headless Venn diagram analysis for Node.js — the JavaScript/TypeScript companion to the
[Venn Diagram Lab](https://venndiagramlab.org/) web tool, sharing the same core code so the
TSV exports are **byte-identical** to the web tool and to the Python (`venn-diagram-lab`) and
R (`vennDiagramLab`) packages.

## Install
```bash
npm install venn-diagram-lab
```

## Library
```ts
import { analyzeCsvText, toRegionSummaryTsv, loadSampleText } from 'venn-diagram-lab';

const result = analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4'));
console.log(toRegionSummaryTsv(result));
```

### Input formats

```ts
import { analyzeCsvText, analyzeGmtText, analyzeGmxText, loadSampleText } from 'venn-diagram-lab';

analyzeCsvText(csvText);   // binary 0/1 matrix OR aggregated (one set per column) — auto-detected
analyzeGmtText(gmtText);   // Broad GMT gene-set file
analyzeGmxText(gmxText);   // Broad GMX gene-set file
```

The CLI auto-detects `.gmt` / `.gmx` by extension; everything else is treated as CSV/TSV.

## CLI
```bash
vdl analyze genes.tsv \
  --region-summary summary.tsv \
  --matrix matrix.tsv \
  --statistics stats.tsv
```

Covers analysis of **binary, aggregated, and GMT/GMX** inputs + byte-equivalent **Region Summary /
Item Matrix / Statistics** TSV exports (parity-tested against the web tool / Python / R goldens
across all five bundled samples, 4- to 8-set).

### Render (SVG)

```bash
vdl render network            genes.tsv --out network.svg
vdl render share-dist         genes.tsv --out share.svg
vdl render enrichment-bar     genes.tsv --out bar.svg --metric foldEnrichment
vdl render enrichment-lollipop genes.tsv --out lollipop.svg
vdl render upset              genes.tsv --out upset.svg
vdl render proportional       two_set.tsv --out proportional.svg   # 2-3 sets only
vdl render venn               genes.tsv --model venn-4-set --out venn.svg
```

Network, Item-Share-Distribution, Enrichment (bar / lollipop), UpSet, area-proportional, and
templated Venn SVGs are byte-identical to the web tool's (shared builders). Use
`listVennModels()` to get the full list of available model names.

Output format is inferred from `--out`'s extension: `.svg` (default), `.png`, or `.pdf`.

```bash
vdl render upset genes.tsv --out upset.png
vdl render venn  genes.tsv --model venn-4-set --out venn.pdf
```

Multi-page PDF reports (with statistics tables and UpSet plot) remain a later release.
