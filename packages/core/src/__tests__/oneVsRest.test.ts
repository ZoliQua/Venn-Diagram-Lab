import { describe, expect, it } from 'vitest';
import { oneVsRestEnrichment } from '../statistics.ts';
import { exportOneVsRestTsv } from '../exportData.ts';
import { hypergeometricPValue, foldEnrichment } from '../statistics.ts';
import type { VennResult } from '../csvParser.ts';

/**
 * Hand-built 3-set Venn. Regions:
 *   exclA=10 exclB=20 exclC=30  AB=5 AC=3 BC=4  ABC=2   -> total = 74
 * Inclusive sizes:
 *   A = 10+5+3+2 = 20
 *   B = 20+5+4+2 = 31
 *   C = 30+3+4+2 = 39
 */
function makeResult(): VennResult {
  return {
    inclusive: new Map([['A', 20], ['B', 31], ['C', 39]]),
    exclusive: new Map([['A', 10], ['B', 20], ['C', 30]]),
    inclusiveItems: new Map(),
    exclusiveItems: new Map(),
    totalUniqueItems: 74,
  };
}

describe('oneVsRestEnrichment — derivation', () => {
  const rows = oneVsRestEnrichment(makeResult(), 3, 74, ['Alpha', 'Beta', 'Gamma']);
  const byLetter = new Map(rows.map(r => [r.set, r]));

  it('derives K, restSize, intersection per set from the counts', () => {
    // A: K=20, excl=10 -> restSize = 74-10 = 64, k = 20-10 = 10
    const a = byLetter.get('A')!;
    expect(a.name).toBe('Alpha');
    expect(a.size).toBe(20);
    expect(a.restSize).toBe(64);
    expect(a.intersection).toBe(10);

    // B: K=31, excl=20 -> restSize = 74-20 = 54, k = 11
    const b = byLetter.get('B')!;
    expect(b.size).toBe(31);
    expect(b.restSize).toBe(54);
    expect(b.intersection).toBe(11);

    // C: K=39, excl=30 -> restSize = 74-30 = 44, k = 9
    const c = byLetter.get('C')!;
    expect(c.size).toBe(39);
    expect(c.restSize).toBe(44);
    expect(c.intersection).toBe(9);
  });

  it('computes expected = K*restSize/N and fold = k*N/(K*restSize) by hand (set A)', () => {
    const a = byLetter.get('A')!;
    // expected = 20*64/74 = 1280/74 = 17.297297...
    expect(a.expected).toBeCloseTo(1280 / 74, 10);
    // fold = 10*74/(20*64) = 740/1280 = 0.578125 (exact)
    expect(a.foldEnrichment).toBe(0.578125);
    expect(a.foldEnrichment).toBe(foldEnrichment(74, 20, 64, 10));
  });

  it('one-sided over-representation p-value is exactly 1.0 (observed k is the support minimum)', () => {
    // For one-vs-rest, k = K - excl_S equals max(0, K + restSize - N),
    // the lower bound of the hypergeometric support, so P(X>=k) = 1.
    for (const r of rows) {
      expect(r.pValue).toBe(1);
      expect(r.pValue).toBe(hypergeometricPValue(74, r.size, r.restSize, r.intersection));
      expect(r.fdr).toBe(1);
      expect(r.bonferroni).toBe(1); // min(1, 1 * 3)
      expect(r.significant).toBe(false);
    }
  });

  it('is stable-sorted by p-value ascending (equal p keeps letter order)', () => {
    expect(rows.map(r => r.set)).toEqual(['A', 'B', 'C']);
  });
});

describe('exportOneVsRestTsv — formatting', () => {
  const tsv = exportOneVsRestTsv(makeResult(), 3, 74, ['Alpha', 'Beta', 'Gamma']);
  const lines = tsv.split('\n');

  it('has the exact header', () => {
    expect(lines[0]).toBe(
      'Set\tName\tSize\tRest_Size\tIntersection\tExpected\tFold_Enrichment\tP_value\tFDR\tBonferroni\tSignificant',
    );
  });

  it('formats numbers with the pairwise-TSV conventions', () => {
    // A row: Expected toFixed(2), Fold toFixed(3), p/fdr/bon toFixed(6) (>=0.001), Significant=ns
    expect(lines[1]).toBe('A\tAlpha\t20\t64\t10\t17.30\t0.578\t1.000000\t1.000000\t1.000000\tns');
  });
});
