# StatisticsResult: container for pairwise statistical metric tables

Returned by \[compute_pairwise()\] and (lazily) by \`statistics()\` on a
\`RegionResult\`. Holds five tables:

## Slots

- `jaccard`:

  NxN named matrix of Jaccard indices.

- `dice`:

  NxN named matrix of Sorensen-Dice coefficients.

- `overlap_coefficient`:

  NxN named matrix of Szymkiewicz-Simpson overlap coefficients.

- `fold_enrichment`:

  NxN named matrix of fold-enrichment values.

- `hypergeometric`:

  Long-form data.frame (one row per set pair) with columns: set_a,
  set_b, intersection, expected, p_value, p_adjusted, p_bonferroni,
  p_two_sided, jaccard_ci_low, jaccard_ci_high, dice_ci_low,
  dice_ci_high, significant, highly_significant.
