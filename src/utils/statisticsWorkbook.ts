/**
 * Statistics workbook builder (XLSX).
 *
 * Shared by the "Report (zip)" bundle (`zipReport.ts`) and the dedicated
 * "Export All Statistics (XLSX)" button in the Data-mode Statistics panel
 * (`DataSummaryPanel.tsx`). exceljs is lazy-imported so callers only pay for
 * the dependency when actually exporting.
 */
import type { PairwiseStat } from './statistics.ts';
import { sigLabel } from './exportData.ts';
import { APP_VERSION } from '../version.ts';

export function formatP(p: number): string {
  if (p === 0) return '< 1e-300';
  if (p < 0.001) return p.toExponential(2);
  return p.toFixed(4);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function buildStatisticsWorkbook(stats: PairwiseStat[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = `Venn Diagram Lab v${APP_VERSION}`;
  wb.created = new Date();

  // Sheet 1 — Pairwise Jaccard (sorted by Jaccard desc)
  const s1 = wb.addWorksheet('Pairwise Jaccard');
  s1.addRow(['Pair', 'Name A', 'Name B', 'Size A', 'Size B', 'Intersection', 'Union', 'Jaccard',
    'Jaccard CI low', 'Jaccard CI high', 'Overlap Coeff']);
  const jacSorted = [...stats].sort((a, b) => b.jaccard - a.jaccard);
  for (const s of jacSorted) {
    s1.addRow([s.label, s.nameA, s.nameB, s.sizeA, s.sizeB, s.intersection, s.union,
      Number(s.jaccard.toFixed(4)),
      Number(s.jaccardCiLow.toFixed(4)), Number(s.jaccardCiHigh.toFixed(4)),
      Number(s.overlapCoeff.toFixed(4))]);
  }

  // Sheet 2 — Sorensen-Dice (sorted by Dice desc)
  const s2 = wb.addWorksheet('Sorensen-Dice');
  s2.addRow(['Pair', 'Name A', 'Name B', 'Dice', 'Dice CI low', 'Dice CI high']);
  const diceSorted = [...stats].sort((a, b) => b.dice - a.dice);
  for (const s of diceSorted) {
    s2.addRow([s.label, s.nameA, s.nameB, Number(s.dice.toFixed(4)),
      Number(s.diceCiLow.toFixed(4)), Number(s.diceCiHigh.toFixed(4))]);
  }

  // Sheet 3 — Intersection Enrichment (sorted by FDR asc)
  const s3 = wb.addWorksheet('Intersection Enrichment');
  s3.addRow(['Pair', 'Name A', 'Name B', 'Size A', 'Size B', 'Intersection', 'Expected',
    'Fold Enrichment', 'p-value', 'P (2-sided)', 'FDR', 'Bonferroni', 'Significance']);
  const fdrSorted = [...stats].sort((a, b) => a.fdr - b.fdr);
  for (const s of fdrSorted) {
    s3.addRow([s.label, s.nameA, s.nameB, s.sizeA, s.sizeB, s.intersection,
      Number(s.expected.toFixed(2)), Number(s.foldEnrichment.toFixed(3)),
      formatP(s.pValue), formatP(s.pTwoSided), formatP(s.fdr), formatP(s.bonferroni), sigLabel(s.fdr)]);
  }

  // Styling — header row bold + frozen
  for (const sheet of [s1, s2, s3]) {
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.alignment = { vertical: 'middle' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    // Column widths
    sheet.columns?.forEach(col => {
      let max = 10;
      col?.eachCell?.({ includeEmpty: false }, cell => {
        const len = String(cell.value ?? '').length;
        if (len > max) max = len;
      });
      if (col) col.width = Math.min(max + 2, 40);
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
/* eslint-enable @typescript-eslint/no-explicit-any */
