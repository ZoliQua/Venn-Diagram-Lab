import { describe, it, expect } from 'vitest';
import {
  logChoose,
  hypergeometricPValue,
  foldEnrichment,
  adjustPValues,
  pairwiseStatistics,
  twoSidedFisher,
  jaccardCI,
  diceCI,
  wilsonInterval,
} from '../utils/statistics.ts';
import type { VennResult } from '../utils/csvParser.ts';

describe('logChoose', () => {
  it('computes C(10,3) = 120', () => {
    expect(Math.exp(logChoose(10, 3))).toBeCloseTo(120, 5);
  });
  it('computes C(0,0) = 1', () => {
    expect(logChoose(0, 0)).toBe(0);
  });
  it('computes C(5,5) = 1', () => {
    expect(logChoose(5, 5)).toBe(0);
  });
  it('returns -Infinity for k > n', () => {
    expect(logChoose(5, 6)).toBe(-Infinity);
  });
  it('returns -Infinity for negative k', () => {
    expect(logChoose(5, -1)).toBe(-Infinity);
  });
  it('computes C(20,10) correctly', () => {
    expect(Math.exp(logChoose(20, 10))).toBeCloseTo(184756, 0);
  });
  it('uses symmetry: C(10,3) === C(10,7)', () => {
    expect(logChoose(10, 3)).toBeCloseTo(logChoose(10, 7), 10);
  });
});

describe('hypergeometricPValue', () => {
  it('returns ~0.5 for expected intersection', () => {
    // N=100, K=50, n=50, k=25 → expected is 25, p ≈ 0.5
    const p = hypergeometricPValue(100, 50, 50, 25);
    expect(p).toBeGreaterThan(0.3);
    expect(p).toBeLessThan(0.7);
  });

  it('returns very small p for strong enrichment', () => {
    // N=1000, K=100, n=100, k=50 → expected 10, observed 50
    const p = hypergeometricPValue(1000, 100, 100, 50);
    expect(p).toBeLessThan(0.001);
  });

  it('returns 1.0 for invalid inputs', () => {
    expect(hypergeometricPValue(0, 0, 0, 0)).toBe(1.0);
    expect(hypergeometricPValue(-1, 10, 10, 5)).toBe(1.0);
  });

  it('returns ~1.0 for k=0 (no enrichment)', () => {
    const p = hypergeometricPValue(100, 50, 50, 0);
    expect(p).toBeCloseTo(1.0, 1);
  });

  it('returns small p for complete overlap', () => {
    // N=100, K=10, n=10, k=10 → all in common
    const p = hypergeometricPValue(100, 10, 10, 10);
    expect(p).toBeLessThan(0.001);
  });
});

describe('foldEnrichment', () => {
  it('computes FE = 5.0 for N=1000, K=100, n=100, k=50', () => {
    expect(foldEnrichment(1000, 100, 100, 50)).toBeCloseTo(5.0, 5);
  });
  it('computes FE = 1.0 for expected value', () => {
    expect(foldEnrichment(100, 50, 50, 25)).toBeCloseTo(1.0, 5);
  });
  it('returns 0 for zero denominators', () => {
    expect(foldEnrichment(0, 10, 10, 5)).toBe(0);
    expect(foldEnrichment(100, 0, 10, 0)).toBe(0);
    expect(foldEnrichment(100, 10, 0, 0)).toBe(0);
  });
});

describe('adjustPValues (Benjamini-Hochberg)', () => {
  it('adjusts simple example', () => {
    const raw = [0.01, 0.04, 0.03];
    const adj = adjustPValues(raw);
    // Sorted: 0.01, 0.03, 0.04 → ranks 1,2,3
    // Adjusted: 0.01*3/1=0.03, 0.03*3/2=0.045, 0.04*3/3=0.04
    // Monotonicity (right-to-left): 0.03, min(0.045, 0.04)=0.04, 0.04
    expect(adj[0]).toBeCloseTo(0.03, 5);  // original idx 0: p=0.01
    expect(adj[1]).toBeCloseTo(0.04, 5);  // original idx 1: p=0.04
    expect(adj[2]).toBeCloseTo(0.04, 5);  // original idx 2: p=0.03 → adjusted 0.045 → capped to 0.04
  });

  it('handles empty array', () => {
    expect(adjustPValues([])).toEqual([]);
  });

  it('clips to 1.0', () => {
    const adj = adjustPValues([0.8, 0.9]);
    expect(adj[0]).toBeLessThanOrEqual(1.0);
    expect(adj[1]).toBeLessThanOrEqual(1.0);
  });

  it('single p-value unchanged', () => {
    const adj = adjustPValues([0.05]);
    expect(adj[0]).toBeCloseTo(0.05, 5);
  });
});

describe('twoSidedFisher', () => {
  it('matches hand-computed 2x2 (N=20, K=8, n=6, k=5)', () => {
    // Support i in [0..6]; C(20,6)=38760. Point masses:
    //   i=0:924  i=1:6336  i=2:13860  i=3:12320  i=4:4620  i=5:672  i=6:28
    // Observed i=5 -> mass 672. Two-sided sums masses <= 672: i=5 (672) + i=6 (28) = 700.
    expect(twoSidedFisher(20, 8, 6, 5)).toBeCloseTo(700 / 38760, 12);
  });

  it('sums the whole support to 1 when observed is the modal cell', () => {
    // Modal cell has the largest mass, so every point mass is <= observed -> p = 1.
    expect(twoSidedFisher(20, 8, 6, 2)).toBeCloseTo(1.0, 12);
  });

  it('returns 1.0 for invalid inputs', () => {
    expect(twoSidedFisher(0, 0, 0, 0)).toBe(1.0);
    expect(twoSidedFisher(-1, 8, 6, 5)).toBe(1.0);
  });
});

describe('Wilson score confidence intervals', () => {
  it('wilsonInterval matches hand-computed value (x=10, nn=40)', () => {
    const [lo, hi] = wilsonInterval(10, 40);
    expect(lo).toBeCloseTo(0.14187118639096302, 12);
    expect(hi).toBeCloseTo(0.40193961420768026, 12);
  });

  it('jaccardCI(inter=10, union=40) uses Wilson on the proportion directly', () => {
    const [lo, hi] = jaccardCI(10, 40);
    expect(lo).toBeCloseTo(0.14187118639096302, 12);
    expect(hi).toBeCloseTo(0.40193961420768026, 12);
  });

  it('diceCI(inter=10, sizeA=20, sizeB=30) doubles the Wilson bounds', () => {
    const [lo, hi] = diceCI(10, 20, 30);
    expect(lo).toBeCloseTo(0.2248750003155222, 12);
    expect(hi).toBeCloseTo(0.6607421186445084, 12);
  });

  it('returns [0,0] for zero-denominator', () => {
    expect(jaccardCI(0, 0)).toEqual([0, 0]);
    expect(diceCI(0, 0, 0)).toEqual([0, 0]);
  });
});

describe('pairwiseStatistics', () => {
  it('computes correct stats for 2-set case', () => {
    const vennResult: VennResult = {
      inclusive: new Map([['A', 30], ['B', 20], ['AB', 10]]),
      exclusive: new Map([['A', 20], ['B', 10], ['AB', 10]]),
      inclusiveItems: new Map([['A', []], ['B', []], ['AB', []]]),
      exclusiveItems: new Map([['A', []], ['B', []], ['AB', []]]),
      totalUniqueItems: 40,
    };
    const stats = pairwiseStatistics(vennResult, 2, 40, ['SetA', 'SetB']);
    expect(stats).toHaveLength(1);
    const s = stats[0];
    expect(s.a).toBe('A');
    expect(s.b).toBe('B');
    expect(s.sizeA).toBe(30);
    expect(s.sizeB).toBe(20);
    expect(s.intersection).toBe(10);
    expect(s.union).toBe(40);
    expect(s.jaccard).toBeCloseTo(0.25, 3);
    expect(s.dice).toBeCloseTo(0.4, 3);
    expect(s.overlapCoeff).toBeCloseTo(0.5, 3);
    expect(s.foldEnrichment).toBeGreaterThan(0);
    expect(s.pValue).toBeGreaterThan(0);
    expect(s.pValue).toBeLessThanOrEqual(1);
    // m = 1 pair -> Bonferroni == pValue (both clamped to 1).
    expect(s.bonferroni).toBeCloseTo(Math.min(1, s.pValue), 12);
    expect(s.pTwoSided).toBeCloseTo(twoSidedFisher(40, 30, 20, 10), 12);
    // Jaccard CI: Wilson on inter=10, union=40.
    expect(s.jaccardCiLow).toBeCloseTo(0.14187118639096302, 12);
    expect(s.jaccardCiHigh).toBeCloseTo(0.40193961420768026, 12);
    // Dice CI: 2x Wilson on inter=10, sizeA+sizeB=50.
    expect(s.diceCiLow).toBeCloseTo(0.2248750003155222, 12);
    expect(s.diceCiHigh).toBeCloseTo(0.6607421186445084, 12);
  });

  it('computes correct number of pairs for 4 sets', () => {
    const inc = new Map<string, number>();
    const exc = new Map<string, number>();
    const incI = new Map<string, string[]>();
    const excI = new Map<string, string[]>();
    const letters = ['A', 'B', 'C', 'D'];
    for (let mask = 1; mask < 16; mask++) {
      const label = letters.filter((_, i) => mask & (1 << i)).join('');
      inc.set(label, 10);
      exc.set(label, 1);
      incI.set(label, []);
      excI.set(label, []);
    }
    const vr: VennResult = { inclusive: inc, exclusive: exc, inclusiveItems: incI, exclusiveItems: excI, totalUniqueItems: 100 };
    const stats = pairwiseStatistics(vr, 4, 100, ['A', 'B', 'C', 'D']);
    expect(stats).toHaveLength(6); // C(4,2) = 6
    // Bonferroni multiplies each raw p by m = 6 pairs, clamped to 1.
    for (const s of stats) {
      expect(s.bonferroni).toBeCloseTo(Math.min(1, s.pValue * 6), 12);
    }
  });
});
