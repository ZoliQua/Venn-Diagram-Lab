/**
 * Item Share Distribution: per-membership-count item totals.
 *
 * Given a binary item × set matrix (rows = items, columns = sets,
 * cells in {0, 1}), returns a Map keyed by k ∈ [1, nSets] mapping
 * to the number of items present in exactly k sets.
 *
 * Zero-valued bins are included for every k in [1, nSets].
 * Rows that sum to zero are ignored (universe-rule violation; defensive).
 */
export function itemShareDistribution(
  matrix: readonly (readonly number[])[],
  nSets: number,
): Map<number, number> {
  const counts = new Map<number, number>();
  for (let k = 1; k <= nSets; k++) counts.set(k, 0);

  for (const row of matrix) {
    let k = 0;
    for (let i = 0; i < nSets; i++) if (row[i]) k++;
    if (k >= 1 && k <= nSets) counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  return counts;
}
