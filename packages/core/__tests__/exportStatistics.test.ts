import { describe, expect, it } from 'vitest';
import { calculateVennCounts, exportStatisticsTsv } from '../src/index.ts';

const csv = {
  headers: ['Gene', 'A', 'B'],
  rows: [['g1', '1', '0'], ['g2', '1', '1'], ['g3', '0', '1']],
};

describe('exportStatisticsTsv', () => {
  it('emits the 22-column header ending in Significant', () => {
    const venn = calculateVennCounts(csv, [1, 2]);
    const tsv = exportStatisticsTsv(venn, 2, venn.totalUniqueItems, ['A', 'B']);
    const cols = tsv.split('\n')[0].split('\t');
    expect(cols).toHaveLength(22);
    expect(cols[0]).toBe('Set_A');
    // New columns after FDR (index 14), before the final Significant column.
    expect(cols.slice(14)).toEqual([
      'FDR', 'Bonferroni', 'P_two_sided',
      'Jaccard_CI_low', 'Jaccard_CI_high', 'Dice_CI_low', 'Dice_CI_high',
      'Significant',
    ]);
    expect(cols[21]).toBe('Significant');
  });

  it('formats the A/B pair row with web-tool number formats', () => {
    const venn = calculateVennCounts(csv, [1, 2]);
    const row = exportStatisticsTsv(venn, 2, venn.totalUniqueItems, ['A', 'B']).split('\n')[1].split('\t');
    // sizeA=2 (g1,g2), sizeB=2 (g2,g3), intersection=1 (g2), union=3
    expect([row[0], row[1], row[4], row[5], row[6], row[7]]).toEqual(['A', 'B', '2', '2', '1', '3']);
    expect(row[8]).toBe('0.3333'); // jaccard 1/3, 4dp
  });
});
