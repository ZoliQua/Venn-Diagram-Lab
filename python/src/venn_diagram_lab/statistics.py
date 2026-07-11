"""Statistical metrics for Venn diagram region analysis.

Ported from the web tool (src/utils/statistics.ts) to maintain numerical parity.
All functions are pure and operate on primitive scalar inputs (set sizes,
intersection counts) so they can be unit-tested in isolation.
"""

from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import dataclass
from itertools import combinations

import numpy as np
import pandas as pd
from scipy.stats import false_discovery_control, hypergeom

# Exact 97.5% normal quantile — shared constant so all surfaces (web/Python/R)
# produce identical bytes for the Wilson score intervals.
Z = 1.959963984540054


def log_choose(n: int, k: int) -> float:
    """Overflow-safe log binomial coefficient log(C(n, k)).

    Ported byte-for-byte from the web tool's ``logChoose`` (statistics.ts).
    The explicit summation loop ``sum(log(n - i) - log(i + 1))`` is used
    deliberately instead of :func:`scipy.special.gammaln` so that the floating
    point arithmetic matches the TypeScript source exactly and the downstream
    ``js_to_*`` formatting produces identical bytes.
    """
    if k > n or k < 0:
        return -math.inf
    if k in (0, n):
        return 0.0
    kk = min(k, n - k)
    result = 0.0
    for i in range(kk):
        result += math.log(n - i) - math.log(i + 1)
    return result


def jaccard(size_a: int, size_b: int, intersection: int) -> float:
    """Jaccard similarity: |A intersect B| / |A union B|.

    Returns 0.0 if both sets are empty (convention matches the web tool).
    """
    union = size_a + size_b - intersection
    if union <= 0:
        return 0.0
    return intersection / union


def dice(size_a: int, size_b: int, intersection: int) -> float:
    """Dice (Sørensen-Dice) coefficient: 2|A ∩ B| / (|A| + |B|)."""
    denom = size_a + size_b
    if denom <= 0:
        return 0.0
    return (2.0 * intersection) / denom


def overlap_coefficient(size_a: int, size_b: int, intersection: int) -> float:
    """Szymkiewicz-Simpson overlap coefficient: |A intersect B| / min(|A|, |B|)."""
    denom = min(size_a, size_b)
    if denom <= 0:
        return 0.0
    return intersection / denom


def hypergeometric_p_value(N: int, K: int, n: int, k: int) -> float:  # noqa: N803
    """One-sided over-representation p-value: P(X >= k) where X ~ Hypergeometric(N, K, n).

    Parameters
    ----------
    N : population size (total items in the universe)
    K : number of "success" states in the population (e.g. |A| inclusive)
    n : number of draws (e.g. |B| inclusive)
    k : observed successes (e.g. |A intersect B| inclusive)

    Returns 1.0 for invalid inputs (matches web tool convention) so the metric
    is safe to feed into BH-FDR without filtering.
    """
    if N < 1 or K < 0 or n < 0 or k < 0:
        return 1.0
    K = min(K, N)  # noqa: N806
    n = min(n, N)
    if k > min(K, n):
        return 1.0
    # P(X >= k) = P(X > k - 1) = sf(k - 1, N, K, n)
    p = float(hypergeom.sf(k - 1, N, K, n))
    return min(max(p, 0.0), 1.0)


def fold_enrichment(N: int, K: int, n: int, k: int) -> float:  # noqa: N803
    """Fold enrichment: observed / expected = (k * N) / (K * n).

    Returns 0.0 if any denominator is zero (matches web tool convention).
    """
    if N == 0 or K == 0 or n == 0:
        return 0.0
    return (k * N) / (K * n)


def two_sided_fisher(N: int, K: int, n: int, k: int) -> float:  # noqa: N803
    """Two-sided Fisher's exact test for the 2x2 table derived from (N, K, n, k).

    Manual log-space point-mass port of the web tool's ``twoSidedFisher``
    (statistics.ts). Sums every hypergeometric point mass P(X=i) over the
    support ``i in [max(0, K+n-N) .. min(K, n)]`` whose log-probability is
    ``<= logP_observed + 1e-7`` (a log-space tie tolerance). Result clamped
    to [0, 1].

    Deliberately does NOT call :func:`scipy.stats.fisher_exact`: the manual
    port reuses :func:`log_choose`, guaranteeing byte-identical output to the
    TypeScript source after ``js_to_*`` formatting.

        logP_i = log_choose(K, i) + log_choose(N-K, n-i) - log_choose(N, n)
    """
    if N < 1 or K < 0 or n < 0 or k < 0:
        return 1.0
    K = min(K, N)  # noqa: N806
    n = min(n, N)

    lo = max(0, K + n - N)
    hi = min(K, n)
    if k < lo or k > hi:
        return 1.0

    log_denom = log_choose(N, n)
    log_p_obs = log_choose(K, k) + log_choose(N - K, n - k) - log_denom
    tol = 1e-7

    p = 0.0
    for i in range(lo, hi + 1):
        log_p = log_choose(K, i) + log_choose(N - K, n - i) - log_denom
        if log_p <= log_p_obs + tol:
            p += math.exp(log_p)

    return min(max(p, 0.0), 1.0)


def wilson_interval(x: float, nn: float) -> tuple[float, float]:
    """Wilson score 95% confidence interval for a proportion phat = x / nn.

    Ported from the web tool's ``wilsonInterval`` (statistics.ts). Returns
    ``(low, high)`` clamped to [0, 1]. Zero/negative trials -> ``(0.0, 0.0)``.
    """
    if nn <= 0:
        return (0.0, 0.0)
    phat = x / nn
    z2 = Z * Z
    denom = 1 + z2 / nn
    center = (phat + z2 / (2 * nn)) / denom
    half = (Z * math.sqrt((phat * (1 - phat)) / nn + z2 / (4 * nn * nn))) / denom
    low = min(max(center - half, 0.0), 1.0)
    high = min(max(center + half, 0.0), 1.0)
    return (low, high)


def jaccard_ci(intersection: int, union: int) -> tuple[float, float]:
    """Wilson 95% CI for the Jaccard index J = inter / union.

    Treats J as a proportion with ``union`` trials. ``union == 0`` -> (0, 0).
    """
    return wilson_interval(intersection, union)


def dice_ci(intersection: int, size_a: int, size_b: int) -> tuple[float, float]:
    """Wilson 95% CI for the Dice coefficient D = 2*inter / (size_a + size_b).

    Treats ``p = inter / (size_a + size_b)`` as a proportion with
    ``(size_a + size_b)`` trials, then multiplies both Wilson bounds by 2
    (clamped to [0, 1]). Denominator 0 -> (0, 0).
    """
    nn = size_a + size_b
    lo, hi = wilson_interval(intersection, nn)
    return (min(2 * lo, 1.0), min(2 * hi, 1.0))


def bh_fdr(p_values: list[float]) -> list[float]:
    """Benjamini-Hochberg FDR adjustment, preserving input order.

    Returns adjusted p-values in the same order as the input. Empty input -> empty output.
    """
    if not p_values:
        return []
    adjusted = false_discovery_control(p_values, method="bh")
    # Clip into [0, 1] for safety (scipy already does this, but be explicit).
    return [min(max(float(p), 0.0), 1.0) for p in adjusted]


# Significance thresholds (match web tool defaults)
_THRESHOLD_SIGNIFICANT = 0.05
_THRESHOLD_HIGHLY_SIGNIFICANT = 0.001


@dataclass(frozen=True)
class StatisticsResult:
    """Container for the five pairwise metric tables produced by :func:`compute_pairwise`.

    All four similarity/enrichment matrices are square (NxN) DataFrames indexed
    and columned by set names — easy to feed into a heatmap renderer. The
    hypergeometric table is long-form (one row per pair) because each row carries
    multiple columns (intersection, expected, p_value, p_adjusted, flags).

    Attributes:
        jaccard: NxN Jaccard similarity matrix.
        dice: NxN Sørensen-Dice coefficient matrix.
        overlap_coefficient: NxN overlap coefficient (Szymkiewicz-Simpson).
        fold_enrichment: NxN fold-enrichment matrix.
        hypergeometric: Long-form table with set_a, set_b, intersection, expected,
            p_value, p_two_sided (two-sided Fisher), jaccard_ci_low/high and
            dice_ci_low/high (Wilson 95% CIs), p_adjusted (Benjamini-Hochberg),
            p_bonferroni (min(1, p * m)), significant, highly_significant.
    """

    jaccard: pd.DataFrame
    dice: pd.DataFrame
    overlap_coefficient: pd.DataFrame
    fold_enrichment: pd.DataFrame
    hypergeometric: pd.DataFrame


def _square_metric(
    set_names: list[str],
    pair_to_value: Mapping[tuple[str, str], float],
    diagonal_value: float,
) -> pd.DataFrame:
    n = len(set_names)
    matrix = np.full((n, n), diagonal_value, dtype=float)
    name_to_idx = {name: i for i, name in enumerate(set_names)}
    for (a, b), v in pair_to_value.items():
        i, j = name_to_idx[a], name_to_idx[b]
        matrix[i, j] = v
        matrix[j, i] = v
    return pd.DataFrame(matrix, index=set_names, columns=set_names)


def compute_pairwise(
    set_names: list[str],
    inclusive_sizes: Mapping[str, int],
    pairwise_intersections: Mapping[tuple[str, str], int],
    universe_size: int,
) -> StatisticsResult:
    """Compute all five pairwise metric tables.

    Parameters
    ----------
    set_names : ordered list of set identifiers (e.g. ["SetA", "SetB"]).
    inclusive_sizes : map set name -> |set| (the inclusive count).
    pairwise_intersections : map (name_a, name_b) with name_a appearing earlier
        in set_names than name_b -> |set_a & set_b|. The order matters only for
        the long-form hypergeometric table (where set_a is always the
        earlier-listed set).
    universe_size : N for the hypergeometric test (total unique items across
        the dataset, NOT the number of rows when in aggregated mode).
    """
    pair_jaccard: dict[tuple[str, str], float] = {}
    pair_dice: dict[tuple[str, str], float] = {}
    pair_oc: dict[tuple[str, str], float] = {}
    pair_fe: dict[tuple[str, str], float] = {}

    rows: list[dict[str, object]] = []
    raw_p_values: list[float] = []

    for a, b in combinations(set_names, 2):
        ka = inclusive_sizes[a]
        kb = inclusive_sizes[b]
        inter = pairwise_intersections.get((a, b), pairwise_intersections.get((b, a), 0))

        pair_jaccard[(a, b)] = jaccard(ka, kb, inter)
        pair_dice[(a, b)] = dice(ka, kb, inter)
        pair_oc[(a, b)] = overlap_coefficient(ka, kb, inter)
        pair_fe[(a, b)] = fold_enrichment(universe_size, ka, kb, inter)

        expected = (ka * kb) / universe_size if universe_size > 0 else 0.0
        p_val = hypergeometric_p_value(universe_size, ka, kb, inter)
        raw_p_values.append(p_val)

        p_two = two_sided_fisher(universe_size, ka, kb, inter)
        union = ka + kb - inter
        jac_lo, jac_hi = jaccard_ci(inter, union)
        dice_lo, dice_hi = dice_ci(inter, ka, kb)

        rows.append({
            "set_a": a,
            "set_b": b,
            "intersection": inter,
            "expected": expected,
            "p_value": p_val,
            "p_two_sided": p_two,
            "jaccard_ci_low": jac_lo,
            "jaccard_ci_high": jac_hi,
            "dice_ci_low": dice_lo,
            "dice_ci_high": dice_hi,
        })

    # BH-FDR (per-pair) + Bonferroni FWER control (m = number of pairwise tests).
    m = len(raw_p_values)
    adjusted = bh_fdr(raw_p_values)
    for row, adj, raw_p in zip(rows, adjusted, raw_p_values, strict=True):
        row["p_adjusted"] = adj
        row["p_bonferroni"] = min(1.0, raw_p * m)
        row["significant"] = bool(adj < _THRESHOLD_SIGNIFICANT)
        row["highly_significant"] = bool(adj < _THRESHOLD_HIGHLY_SIGNIFICANT)

    hyp_dtypes = {
        "set_a": "string",
        "set_b": "string",
        "intersection": "int64",
        "expected": "float64",
        "p_value": "float64",
        "p_adjusted": "float64",
        "p_bonferroni": "float64",
        "p_two_sided": "float64",
        "jaccard_ci_low": "float64",
        "jaccard_ci_high": "float64",
        "dice_ci_low": "float64",
        "dice_ci_high": "float64",
        "significant": "bool",
        "highly_significant": "bool",
    }
    if rows:
        hyp_df = pd.DataFrame(rows).astype(hyp_dtypes)
    else:
        hyp_df = pd.DataFrame({col: pd.Series(dtype=dt) for col, dt in hyp_dtypes.items()})

    hyp_df = hyp_df.sort_values("p_value", kind="mergesort", ignore_index=True)

    return StatisticsResult(
        jaccard=_square_metric(set_names, pair_jaccard, diagonal_value=1.0),
        dice=_square_metric(set_names, pair_dice, diagonal_value=1.0),
        overlap_coefficient=_square_metric(set_names, pair_oc, diagonal_value=1.0),
        fold_enrichment=_square_metric(set_names, pair_fe, diagonal_value=float("nan")),
        hypergeometric=hyp_df,
    )
