import { fillVennTemplate, loadVennTemplate } from './vennTemplate.ts';
import {
  analyzeDataQuality,
  buildEnrichmentBarSvg,
  buildEnrichmentLollipopSvg,
  buildNetworkData,
  buildNetworkSvgString,
  buildShareDistributionSvg,
  buildUpsetSvgString,
  calculateVennCounts,
  calculateVennCountsFromAggregated,
  detectDelimiter,
  exportMatrixTsv,
  exportOneVsRestTsv,
  exportRegionSummaryTsv,
  exportResultJson,
  exportStatisticsTsv,
  generateProportionalModel,
  getBinaryColumns,
  itemShareDistribution,
  pairwiseStatistics,
  parseCsvWithDelimiter,
  parseGmt,
  parseGmx,
  saveSvg,
  toGraphml,
  toSif,
  solve2SetLayout,
  solve3SetLayout,
  upsetDataFromVennResult,
  type CsvData,
  type DataQualityReport,
  type EdgeWeightMetric,
  type EnrichmentMetric,
  type VennResult,
} from '@venn-diagram-lab/core';

export type { DataQualityReport } from '@venn-diagram-lab/core';

const LETTERS = 'ABCDEFGHI';

export interface AnalyzeResult {
  csv: CsvData;
  columns: number[];
  setNames: string[];
  venn: VennResult;
  mode: 'binary' | 'aggregated';
}

/** Analyse an already-parsed CsvData, auto-detecting binary vs aggregated mode. */
export function analyzeCsv(csv: CsvData): AnalyzeResult {
  const binaryColumns = getBinaryColumns(csv);
  if (binaryColumns.length >= 2) {
    const setNames = binaryColumns.map(i => csv.headers[i]);
    return { csv, columns: binaryColumns, setNames, venn: calculateVennCounts(csv, binaryColumns), mode: 'binary' as const };
  }
  // Aggregated: every column is a set, cells hold the items.
  const columns = csv.headers.map((_, i) => i);
  const setNames = columns.map(i => csv.headers[i]);
  return { csv, columns, setNames, venn: calculateVennCountsFromAggregated(csv, columns), mode: 'aggregated' as const };
}

/** Parse raw CSV/TSV text and analyse it (auto binary vs aggregated). */
export function analyzeCsvText(text: string): AnalyzeResult {
  const delimiter = detectDelimiter(text);
  return analyzeCsv(parseCsvWithDelimiter(text, delimiter, true));
}

/** Region Summary TSV — byte-identical to the web tool's "Export → Region Summary". */
export function toRegionSummaryTsv(result: AnalyzeResult): string {
  return exportRegionSummaryTsv(
    result.venn,
    result.columns.length,
    result.setNames,
    result.venn.totalUniqueItems,
  );
}

/** Item Matrix TSV — byte-identical to the web tool's "Export -> Item Matrix". */
export function toMatrixTsv(result: AnalyzeResult): string {
  return exportMatrixTsv(result.venn, result.columns.length, result.setNames);
}

/** Pairwise Statistics TSV — byte-identical to the web tool's "Export -> Statistics". */
export function toStatisticsTsv(result: AnalyzeResult): string {
  return exportStatisticsTsv(
    result.venn,
    result.columns.length,
    result.venn.totalUniqueItems,
    result.setNames,
  );
}

/** One-vs-rest Enrichment TSV — byte-identical to the web tool's "Export → One-vs-rest". */
export function toOneVsRestTsv(result: AnalyzeResult): string {
  return exportOneVsRestTsv(
    result.venn,
    result.columns.length,
    result.venn.totalUniqueItems,
    result.setNames,
  );
}

/**
 * Full Venn result + statistics as a canonical JSON string (schemaVersion "1").
 * Byte-identical to the web tool's "Export → JSON" and the shared golden.
 * `model` labels the diagram (defaults to `venn-<n>-set`).
 */
export function toResultJson(result: AnalyzeResult, model?: string): string {
  const n = result.columns.length;
  return exportResultJson(
    result.venn,
    n,
    result.setNames,
    result.venn.totalUniqueItems,
    model ?? `venn-${n}-set`,
  );
}

/** Analyse a GMT (Gene Matrix Transposed) gene-set file. */
export function analyzeGmtText(text: string): AnalyzeResult {
  return analyzeCsv(parseGmt(text).csv);
}

/** Analyse a GMX (column-oriented gene-set) file. */
export function analyzeGmxText(text: string): AnalyzeResult {
  return analyzeCsv(parseGmx(text).csv);
}

/**
 * Pure, read-only data-quality report (duplicates, empty cells, case
 * collisions) for an already-analysed result. See core's
 * {@link DataQualityReport} for exact detection semantics. Never mutates
 * `result` and never affects `result.venn` — item identity is unchanged.
 * Aggregated mode always uses the default ',' item delimiter, matching the
 * delimiter `analyzeCsv`/`analyzeCsvText` use to compute `result.venn`.
 */
export function toDataQuality(result: AnalyzeResult): DataQualityReport {
  return analyzeDataQuality(result.csv, result.columns, result.mode);
}

/** Force-directed Network SVG of the set relationships. */
export function toNetworkSvg(result: AnalyzeResult, metric: EdgeWeightMetric = 'intersection'): string {
  const data = buildNetworkData(
    result.venn, result.columns.length, result.venn.totalUniqueItems, result.setNames, metric,
  );
  return buildNetworkSvgString(data, metric);
}

/** Cytoscape GraphML of the set-relationship network (all pairwise edges). */
export function toNetworkGraphml(result: AnalyzeResult, metric: EdgeWeightMetric = 'intersection'): string {
  const data = buildNetworkData(
    result.venn, result.columns.length, result.venn.totalUniqueItems, result.setNames, metric,
  );
  return toGraphml(data);
}

/** Cytoscape SIF of the set-relationship network (all pairwise edges). */
export function toNetworkSif(result: AnalyzeResult, metric: EdgeWeightMetric = 'intersection'): string {
  const data = buildNetworkData(
    result.venn, result.columns.length, result.venn.totalUniqueItems, result.setNames, metric,
  );
  return toSif(data);
}

/** Binary item × set membership matrix from the result's exclusive items. */
function binaryMatrix(result: AnalyzeResult): number[][] {
  const letters = LETTERS.slice(0, result.columns.length).split('');
  const matrix: number[][] = [];
  for (const [label, items] of result.venn.exclusiveItems) {
    if (label === '') continue; // items in no set — skip
    for (let i = 0; i < items.length; i++) {
      matrix.push(letters.map(l => (label.includes(l) ? 1 : 0)));
    }
  }
  return matrix;
}

/** Item-Share-Distribution histogram SVG. */
export function toShareDistributionSvg(result: AnalyzeResult): string {
  const dist = itemShareDistribution(binaryMatrix(result), result.columns.length);
  return buildShareDistributionSvg(dist);
}

function pairStats(result: AnalyzeResult) {
  return pairwiseStatistics(result.venn, result.columns.length, result.venn.totalUniqueItems, result.setNames);
}

/** Pairwise-enrichment bar chart SVG. metric: 'neglog10fdr' (default) | 'foldEnrichment'. */
export function toEnrichmentBarSvg(result: AnalyzeResult, metric: EnrichmentMetric = 'neglog10fdr'): string {
  return buildEnrichmentBarSvg(pairStats(result), { metric });
}

/** Pairwise-enrichment lollipop chart SVG. */
export function toEnrichmentLollipopSvg(result: AnalyzeResult, metric: EnrichmentMetric = 'neglog10fdr'): string {
  return buildEnrichmentLollipopSvg(pairStats(result), { metric });
}

/** UpSet plot SVG (print-optimised). */
export function toUpsetSvg(result: AnalyzeResult): string {
  const data = upsetDataFromVennResult(result.venn, result.columns.length);
  return buildUpsetSvgString(data, result.setNames);
}

/** Render the analysis result into a bundled Venn model template (by filename, ".svg" optional). */
export function toVennSvg(result: AnalyzeResult, model: string): string {
  const template = loadVennTemplate(model);
  const modelSets = (template.match(/id="Name[A-I]"/g) ?? []).length;
  if (modelSets !== result.columns.length) {
    throw new Error(`Model ${model} has ${modelSets} sets but the data has ${result.columns.length}.`);
  }
  const letters = LETTERS.slice(0, result.columns.length).split('');
  return fillVennTemplate(template, {
    setNames: result.setNames,
    counts: result.venn.exclusive,
    countSums: new Map(letters.map(l => [l, result.venn.inclusive.get(l) ?? 0])),
  });
}

/**
 * Area-proportional Venn SVG (2 or 3 sets). Mirrors the web tool's proportional
 * path: solve circle layout at canvasSize 700, generate the model, serialize.
 * Throws for n < 2 or n > 3.
 */
export function toProportionalSvg(result: AnalyzeResult): string {
  const n = result.columns.length;
  if (n < 2 || n > 3) {
    throw new Error(`Area-proportional diagrams support only 2 or 3 sets (got ${n}).`);
  }
  const { inclusive, exclusive } = result.venn;
  const letters = 'ABC'.slice(0, n).split('');
  const sizes = letters.map(l => inclusive.get(l) ?? 0);
  const layout = n === 2
    ? solve2SetLayout(sizes[0], sizes[1], inclusive.get('AB') ?? 0, 700)
    : solve3SetLayout(
        sizes as [number, number, number],
        { AB: inclusive.get('AB') ?? 0, AC: inclusive.get('AC') ?? 0, BC: inclusive.get('BC') ?? 0 },
        inclusive.get('ABC') ?? 0,
        700,
      );
  const doc = generateProportionalModel(n, result.setNames, exclusive, inclusive, layout);
  return saveSvg(doc);
}
