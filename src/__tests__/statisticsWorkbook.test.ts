import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildStatisticsWorkbook } from '../utils/statisticsWorkbook.ts';
import type { PairwiseStat } from '../utils/statistics.ts';

const capturedRows: Record<string, unknown[][]> = {};
let currentSheet = '';

vi.mock('exceljs', () => ({
  default: {
    Workbook: class MockWorkbook {
      creator = '';
      created = new Date();
      xlsx = { writeBuffer: async () => new ArrayBuffer(8) };
      addWorksheet(name: string) {
        currentSheet = name;
        capturedRows[name] = [];
        return {
          addRow: (row: unknown[]) => { capturedRows[currentSheet].push(row); },
          getRow: () => ({ font: {}, alignment: {} }),
          views: [],
          columns: [],
        };
      }
    },
  },
}));

const stats: PairwiseStat[] = [
  {
    a: 'A', b: 'B', label: 'AB', nameA: 'Group A', nameB: 'Group B',
    sizeA: 10, sizeB: 8, intersection: 4, union: 14,
    jaccard: 4 / 14, overlapCoeff: 0.5, dice: 8 / 18,
    expected: 3.2, foldEnrichment: 1.25,
    pValue: 0.02, fdr: 0.04, bonferroni: 0.06, pTwoSided: 0.03,
    jaccardCiLow: 0.1, jaccardCiHigh: 0.5,
    diceCiLow: 0.2, diceCiHigh: 0.6,
    significant: true, highlySignificant: false,
  },
];

describe('buildStatisticsWorkbook', () => {
  beforeEach(() => {
    for (const k of Object.keys(capturedRows)) delete capturedRows[k];
  });

  it('produces an xlsx Blob', async () => {
    const blob = await buildStatisticsWorkbook(stats);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  it('writes 3 sheets: Pairwise Jaccard, Sorensen-Dice, Intersection Enrichment', async () => {
    await buildStatisticsWorkbook(stats);
    expect(Object.keys(capturedRows)).toEqual([
      'Pairwise Jaccard', 'Sorensen-Dice', 'Intersection Enrichment',
    ]);
  });

  it('includes Jaccard 95% CI columns in the Pairwise Jaccard sheet', async () => {
    await buildStatisticsWorkbook(stats);
    const header = capturedRows['Pairwise Jaccard'][0];
    expect(header).toContain('Jaccard CI low');
    expect(header).toContain('Jaccard CI high');
    const row = capturedRows['Pairwise Jaccard'][1];
    expect(row).toContain(0.1);
    expect(row).toContain(0.5);
  });

  it('includes Dice 95% CI columns in the Sorensen-Dice sheet', async () => {
    await buildStatisticsWorkbook(stats);
    const header = capturedRows['Sorensen-Dice'][0];
    expect(header).toContain('Dice CI low');
    expect(header).toContain('Dice CI high');
  });

  it('includes Bonferroni and two-sided p-value columns in the Intersection Enrichment sheet', async () => {
    await buildStatisticsWorkbook(stats);
    const header = capturedRows['Intersection Enrichment'][0];
    expect(header).toContain('Bonferroni');
    expect(header).toContain('P (2-sided)');
    const row = capturedRows['Intersection Enrichment'][1];
    // formatP formats 0.06 and 0.03 as fixed(4) since >= 0.001
    expect(row).toContain((0.06).toFixed(4));
    expect(row).toContain((0.03).toFixed(4));
  });
});
