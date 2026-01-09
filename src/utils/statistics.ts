import type { VennResult } from './csvParser.ts';

/** Log-binomial coefficient, overflow-safe */
export function logChoose(n: number, k: number): number {
  if (k > n || k < 0) return -Infinity;
  if (k === 0 || k === n) return 0;
  const kk = Math.min(k, n - k);
  let result = 0;
  for (let i = 0; i < kk; i++) {
    result += Math.log(n - i) - Math.log(i + 1);
  }
  return result;
}

/**
 * One-sided hypergeometric p-value (over-representation).
 * P(X >= k) where X ~ Hypergeometric(N, K, n)
 *
 * N = population size (total items)
 * K = number of success states in population (|A|, inclusive)
 * n = number of draws (|B|, inclusive)
 * k = observed successes (|A∩B|, inclusive intersection)
 */
export function hypergeometricPValue(N: number, K: number, n: number, k: number): number {
  if (N < 1 || K < 0 || n < 0 || k < 0) return 1.0;
  if (K > N) K = N;
  if (n > N) n = N;
  if (k > Math.min(K, n)) return 1.0;

  const logDenom = logChoose(N, n);
  let pValue = 0;
  const upper = Math.min(K, n);

  for (let i = k; i <= upper; i++) {
    const logP = logChoose(K, i) + logChoose(N - K, n - i) - logDenom;
    if (logP > -700) { // avoid underflow
      pValue += Math.exp(logP);
    }
  }

  return Math.min(pValue, 1.0);
}

/**
 * Fold enrichment: observed / expected intersection ratio.
 * FE = (k/n) / (K/N) = k*N / (K*n)
 */
export function foldEnrichment(N: number, K: number, n: number, k: number): number {
  if (K === 0 || n === 0 || N === 0) return 0;
  return (k * N) / (K * n);
}

/** Benjamini-Hochberg FDR correction */
export function adjustPValues(pValues: number[]): number[] {
  const m = pValues.length;
  if (m === 0) return [];

  // Create indexed array, sort by p-value ascending
  const indexed = pValues.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p - b.p);

  const adjusted = new Array<number>(m);
  for (let rank = 0; rank < m; rank++) {
    adjusted[indexed[rank].i] = indexed[rank].p * m / (rank + 1);
  }

  // Enforce monotonicity: right-to-left minimum (in sorted order)
  // Process in reverse rank order
  for (let rank = m - 2; rank >= 0; rank--) {
    const curIdx = indexed[rank].i;
    const nextIdx = indexed[rank + 1].i;
    adjusted[curIdx] = Math.min(adjusted[curIdx], adjusted[nextIdx]);
  }

  // Clip to [0, 1]
  for (let i = 0; i < m; i++) {
    adjusted[i] = Math.min(Math.max(adjusted[i], 0), 1);
  }

  return adjusted;
}

export interface PairwiseStat {
  a: string;
  b: string;
  label: string;
  nameA: string;
  nameB: string;
  sizeA: number;
  sizeB: number;
  intersection: number;
  union: number;
  jaccard: number;
  overlapCoeff: number;
  dice: number;
  expected: number;
  foldEnrichment: number;
  pValue: number;
  fdr: number;
  significant: boolean;
  highlySignificant: boolean;
}

/**
 * Compute pairwise statistics for all set pairs.
 * Returns sorted by p-value ascending.
 */
export function pairwiseStatistics(
  vennResult: VennResult,
  n: number,
  totalItems: number,
  setNames: string[],
): PairwiseStat[] {
  const letters = 'ABCDEFGH'.slice(0, n).split('');
  const stats: PairwiseStat[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = letters[i];
      const b = letters[j];
      const label = a + b;

      const sizeA = vennResult.inclusive.get(a) ?? 0;
      const sizeB = vennResult.inclusive.get(b) ?? 0;
      const inter = vennResult.inclusive.get(label) ?? 0;
      const union = sizeA + sizeB - inter;

      const jac = union > 0 ? inter / union : 0;
      const oc = Math.min(sizeA, sizeB) > 0 ? inter / Math.min(sizeA, sizeB) : 0;
      const dic = (sizeA + sizeB) > 0 ? (2 * inter) / (sizeA + sizeB) : 0;

      const N = totalItems;
      const exp = N > 0 ? (sizeA * sizeB) / N : 0;
      const fe = foldEnrichment(N, sizeA, sizeB, inter);
      const pVal = hypergeometricPValue(N, sizeA, sizeB, inter);

      stats.push({
        a, b, label,
        nameA: setNames[i] ?? a,
        nameB: setNames[j] ?? b,
        sizeA, sizeB,
        intersection: inter,
        union,
        jaccard: jac,
        overlapCoeff: oc,
        dice: dic,
        expected: exp,
        foldEnrichment: fe,
        pValue: pVal,
        fdr: 0, // will be filled after BH correction
        significant: false,
        highlySignificant: false,
      });
    }
  }

  // BH FDR correction
  const rawP = stats.map(s => s.pValue);
  const adjP = adjustPValues(rawP);
  for (let i = 0; i < stats.length; i++) {
    stats[i].fdr = adjP[i];
    stats[i].significant = adjP[i] < 0.05;
    stats[i].highlySignificant = adjP[i] < 0.001;
  }

  // Sort by p-value ascending
  stats.sort((a, b) => a.pValue - b.pValue);

  return stats;
}
