import type { VennResult } from './csvParser.ts';
import { oneVsRestEnrichment, pairwiseStatistics } from './statistics.ts';

const FORMULA_PREFIX_RE = /^[\t\r ]*[=+\-@]/;

export function escapeSpreadsheetCell(value: string): string {
  return FORMULA_PREFIX_RE.test(value) ? `'${value}` : value;
}

/**
 * FORMAT A: Region Summary TSV
 * Columns: Region | Sets | Depth | Exclusive_Count | Inclusive_Count | Exclusive_Pct | Items
 */
export function exportRegionSummaryTsv(
  result: VennResult,
  n: number,
  setNames: string[],
  totalItems: number,
): string {
  const letters = 'ABCDEFGHI'.slice(0, n).split('');
  const header = [
    'Region', 'Sets', 'Depth',
    'Exclusive_Count', 'Inclusive_Count',
    'Exclusive_Pct', 'Items'
  ].join('\t');

  const rows: string[] = [];

  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = letters.filter((_, i) => mask & (1 << i));
    const label = subset.join('');
    const setLabels = subset
      .map(l => escapeSpreadsheetCell(setNames[l.charCodeAt(0) - 65] ?? l))
      .join(' \u2229 ');
    const exCount = result.exclusive.get(label) ?? 0;
    const inCount = result.inclusive.get(label) ?? 0;
    const pct = totalItems > 0 ? (exCount / totalItems * 100).toFixed(2) : '0.00';
    const items = (result.exclusiveItems.get(label) ?? [])
      .map(escapeSpreadsheetCell)
      .join(';');

    rows.push([label, setLabels, subset.length, exCount, inCount, pct, items].join('\t'));
  }

  rows.sort((a, b) => {
    const dA = parseInt(a.split('\t')[2]);
    const dB = parseInt(b.split('\t')[2]);
    return dA - dB || a.localeCompare(b);
  });

  return [header, ...rows].join('\n');
}

/**
 * FORMAT B: Item Matrix TSV
 * Columns: Item | SetA_name | SetB_name | ... | Region
 */
export function exportMatrixTsv(
  result: VennResult,
  n: number,
  setNames: string[],
): string {
  const letters = 'ABCDEFGHI'.slice(0, n).split('');
  const headerCols = ['Item', ...letters.map((l, i) => escapeSpreadsheetCell(setNames[i] ?? l)), 'Region'];
  const header = headerCols.join('\t');

  const rows: string[] = [];

  for (const [label, items] of result.exclusiveItems) {
    for (const item of items) {
      const membership = letters.map(l => label.includes(l) ? '1' : '0');
      rows.push([escapeSpreadsheetCell(item), ...membership, label].join('\t'));
    }
  }

  return [header, ...rows].join('\n');
}

/** Significance stars from an FDR value (web tool convention). */
export function sigLabel(fdr: number): string {
  if (fdr < 0.001) return '***';
  if (fdr < 0.01) return '**';
  if (fdr < 0.05) return '*';
  return 'ns';
}

/**
 * FORMAT C: pairwise Statistics TSV — byte-identical to the web tool's
 * "Export -> Statistics" (DataSummaryPanel.handleExportStats). This format
 * intentionally does NOT escape cells (mirror the web app exactly).
 */
export function exportStatisticsTsv(
  vennResult: VennResult,
  n: number,
  totalItems: number,
  setNames: string[],
): string {
  const pairStats = pairwiseStatistics(vennResult, n, totalItems, setNames);
  const fmtP = (p: number) => (p < 0.001 ? p.toExponential(2) : p.toFixed(6));
  const header = [
    'Set_A', 'Set_B', 'Name_A', 'Name_B', 'Size_A', 'Size_B',
    'Intersection', 'Union', 'Jaccard', 'Overlap_Coeff', 'Dice',
    'Expected', 'Fold_Enrichment', 'P_value', 'FDR',
    'Bonferroni', 'P_two_sided',
    'Jaccard_CI_low', 'Jaccard_CI_high', 'Dice_CI_low', 'Dice_CI_high',
    'Significant',
  ].join('\t');
  const rows = pairStats.map(s => [
    s.a, s.b, s.nameA, s.nameB, s.sizeA, s.sizeB,
    s.intersection, s.union,
    s.jaccard.toFixed(4), s.overlapCoeff.toFixed(4), s.dice.toFixed(4),
    s.expected.toFixed(2), s.foldEnrichment.toFixed(3),
    fmtP(s.pValue),
    fmtP(s.fdr),
    fmtP(s.bonferroni),
    fmtP(s.pTwoSided),
    s.jaccardCiLow.toFixed(4), s.jaccardCiHigh.toFixed(4),
    s.diceCiLow.toFixed(4), s.diceCiHigh.toFixed(4),
    sigLabel(s.fdr),
  ].join('\t'));
  return [header, ...rows].join('\n');
}

/**
 * FORMAT D: one-vs-rest Enrichment TSV — each set S tested against the union of
 * the inclusive members of all OTHER sets, via the shared hypergeometric
 * machinery. Number formatting mirrors the pairwise Statistics TSV. Like that
 * export, cells are intentionally NOT escaped.
 *
 * Columns: Set | Name | Size | Rest_Size | Intersection | Expected |
 *          Fold_Enrichment | P_value | FDR | Bonferroni | Significant
 */
export function exportOneVsRestTsv(
  vennResult: VennResult,
  n: number,
  totalItems: number,
  setNames: string[],
): string {
  const stats = oneVsRestEnrichment(vennResult, n, totalItems, setNames);
  const fmtP = (p: number) => (p < 0.001 ? p.toExponential(2) : p.toFixed(6));
  const header = [
    'Set', 'Name', 'Size', 'Rest_Size', 'Intersection', 'Expected',
    'Fold_Enrichment', 'P_value', 'FDR', 'Bonferroni', 'Significant',
  ].join('\t');
  const rows = stats.map(s => [
    s.set, s.name, s.size, s.restSize, s.intersection,
    s.expected.toFixed(2), s.foldEnrichment.toFixed(3),
    fmtP(s.pValue), fmtP(s.fdr), fmtP(s.bonferroni),
    sigLabel(s.fdr),
  ].join('\t'));
  return [header, ...rows].join('\n');
}
