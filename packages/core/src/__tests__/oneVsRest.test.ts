import { describe, expect, it } from 'vitest';
import { oneVsRestEnrichment } from '../statistics.ts';
import { exportOneVsRestTsv } from '../exportData.ts';
import { hypergeometricPValue, foldEnrichment } from '../statistics.ts';
import type { VennResult } from '../csvParser.ts';

/**
 * Hand-built 3-set Venn with a background universe LARGER than the union.
 * Regions:
 *   exclA=5 exclB=5 exclC=5  AB=10 AC=10 BC=10  ABC=5
 * Union of all sets (U = sum of exclusive over every region):
 *   U = 5+5+5+10+10+10+5 = 50
 * Inclusive sizes (all symmetric):
 *   A = 5+10+10+5 = 30 ; B = 30 ; C = 30
 * Universe N = 1000 (binary mode: many rows belong to no set, so N=1000 > U=50).
 * `totalUniqueItems` is deliberately set to 1000 (!= U) to prove restSize uses
 * U (the union), not totalUniqueItems.
 */
function makeEnriched(): VennResult {
  return {
    inclusive: new Map([['A', 30], ['B', 30], ['C', 30], ['AB', 15], ['AC', 15], ['BC', 15], ['ABC', 5]]),
    exclusive: new Map([['A', 5], ['B', 5], ['C', 5], ['AB', 10], ['AC', 10], ['BC', 10], ['ABC', 5]]),
    inclusiveItems: new Map(),
    exclusiveItems: new Map(),
    totalUniqueItems: 1000,
  };
}

const N = 1000;

describe('oneVsRestEnrichment — corrected derivation (restSize uses U = union)', () => {
  const rows = oneVsRestEnrichment(makeEnriched(), 3, N, ['Alpha', 'Beta', 'Gamma']);
  const byLetter = new Map(rows.map(r => [r.set, r]));

  it('derives K, restSize (from U, not totalUniqueItems), intersection per set', () => {
    // U = 50. A: K=30, excl=5 -> restSize = U - excl = 50-5 = 45 (NOT 1000-5=995), k = 30-5 = 25
    const a = byLetter.get('A')!;
    expect(a.name).toBe('Alpha');
    expect(a.size).toBe(30);
    expect(a.restSize).toBe(45); // proves U (=50) is used, not totalUniqueItems (=1000)
    expect(a.intersection).toBe(25);

    // Symmetric: B and C identical to A
    for (const l of ['B', 'C']) {
      const r = byLetter.get(l)!;
      expect(r.size).toBe(30);
      expect(r.restSize).toBe(45);
      expect(r.intersection).toBe(25);
    }
  });

  it('computes expected = K*restSize/N and fold = k*N/(K*restSize) by hand (set A)', () => {
    const a = byLetter.get('A')!;
    // expected = 30*45/1000 = 1.35 (exact)
    expect(a.expected).toBeCloseTo(1.35, 10);
    // fold = 25*1000/(30*45) = 25000/1350 = 18.5185...
    expect(a.foldEnrichment).toBeCloseTo(25000 / 1350, 10);
    expect(a.foldEnrichment).toBe(foldEnrichment(N, 30, 45, 25));
    expect(a.foldEnrichment).toBeGreaterThan(1); // clearly enriched
  });

  it('gives a MEANINGFUL (non-degenerate, small) p-value when N > U', () => {
    // observed k=25 vastly exceeds expected 1.35 -> P(X>=25) is astronomically small.
    for (const r of rows) {
      expect(r.pValue).toBe(hypergeometricPValue(N, r.size, r.restSize, r.intersection));
      expect(r.pValue).not.toBe(1);
      expect(r.pValue).toBeGreaterThan(0);
      expect(r.pValue).toBeLessThan(1e-6);
      expect(r.significant).toBe(true); // fdr < 0.05
    }
  });

  it('is stable-sorted by p-value ascending (equal p keeps letter order)', () => {
    expect(rows.map(r => r.set)).toEqual(['A', 'B', 'C']);
  });
});

/**
 * When the universe equals the union (N == U, e.g. aggregated mode), the test is
 * honestly non-informative: k = K - excl_S is the hypergeometric support minimum
 * so P(X >= k) = 1. This is mathematically correct, not a bug.
 */
describe('oneVsRestEnrichment — N == U yields honest p = 1', () => {
  function makeAggregated(): VennResult {
    return {
      inclusive: new Map([['A', 20], ['B', 31], ['C', 39], ['AB', 7], ['AC', 5], ['BC', 6], ['ABC', 2]]),
      exclusive: new Map([['A', 10], ['B', 20], ['C', 30], ['AB', 5], ['AC', 3], ['BC', 4], ['ABC', 2]]),
      inclusiveItems: new Map(),
      exclusiveItems: new Map(),
      totalUniqueItems: 74,
    };
  }
  it('all p-values are exactly 1 when N == U == 74', () => {
    const rows = oneVsRestEnrichment(makeAggregated(), 3, 74, ['A', 'B', 'C']);
    // U = 10+20+30+5+3+4+2 = 74 == N
    for (const r of rows) {
      expect(r.restSize + (r.size - r.intersection)).toBe(74); // restSize + excl = U
      expect(r.pValue).toBe(1);
      expect(r.significant).toBe(false);
    }
  });
});

describe('exportOneVsRestTsv — formatting', () => {
  const tsv = exportOneVsRestTsv(makeEnriched(), 3, N, ['Alpha', 'Beta', 'Gamma']);
  const lines = tsv.split('\n');

  it('has the exact header', () => {
    expect(lines[0]).toBe(
      'Set\tName\tSize\tRest_Size\tIntersection\tExpected\tFold_Enrichment\tP_value\tFDR\tBonferroni\tSignificant',
    );
  });

  it('formats numbers with the pairwise-TSV conventions (set A, enriched -> *** )', () => {
    const p = hypergeometricPValue(N, 30, 45, 25);
    const fmtP = (x: number) => (x < 0.001 ? x.toExponential(2) : x.toFixed(6));
    // A row: Expected toFixed(2)=1.35, Fold toFixed(3)=18.519, p/fdr/bon exponential, Significant=***
    const expectedRow = ['A', 'Alpha', '30', '45', '25', '1.35', '18.519', fmtP(p), fmtP(p), fmtP(Math.min(1, p * 3)), '***'].join('\t');
    expect(lines[1]).toBe(expectedRow);
  });
});
