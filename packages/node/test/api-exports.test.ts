import { describe, expect, it } from 'vitest';
import { analyzeCsvText, toMatrixTsv, toStatisticsTsv } from '../src/api.ts';

const TSV = ['Gene\tA\tB', 'g1\t1\t0', 'g2\t1\t1', 'g3\t0\t1'].join('\n');

describe('toMatrixTsv', () => {
  it('emits Item + set-name columns + Region, one row per item', () => {
    const tsv = toMatrixTsv(analyzeCsvText(TSV));
    const lines = tsv.split('\n');
    expect(lines[0]).toBe('Item\tA\tB\tRegion');
    expect(lines).toContain('g2\t1\t1\tAB');
    expect(lines).toHaveLength(4); // header + 3 items
  });
});

describe('toStatisticsTsv', () => {
  it('emits the 22-column statistics header and one pair row', () => {
    const tsv = toStatisticsTsv(analyzeCsvText(TSV));
    const lines = tsv.split('\n');
    const cols = lines[0].split('\t');
    expect(cols).toHaveLength(22);
    expect(lines[0].startsWith('Set_A\tSet_B\t')).toBe(true);
    // New columns land after FDR, before the final Significant column.
    expect(cols.slice(14)).toEqual([
      'FDR', 'Bonferroni', 'P_two_sided',
      'Jaccard_CI_low', 'Jaccard_CI_high', 'Dice_CI_low', 'Dice_CI_high',
      'Significant',
    ]);
    expect(lines).toHaveLength(2); // header + the single A/B pair
  });
});
