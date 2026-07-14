"""Tests for venn_diagram_lab.statistics."""

from __future__ import annotations

import math

import pytest

from venn_diagram_lab.statistics import (
    StatisticsResult,
    bh_fdr,
    compute_pairwise,
    dice,
    dice_ci,
    fold_enrichment,
    hypergeometric_p_value,
    jaccard,
    jaccard_ci,
    log_choose,
    one_vs_rest_enrichment,
    overlap_coefficient,
    two_sided_fisher,
    wilson_interval,
)


class TestJaccard:
    def test_basic(self) -> None:
        # |A| = 30, |B| = 20, |A & B| = 10 -> |A | B| = 40 -> J = 10/40 = 0.25
        assert jaccard(size_a=30, size_b=20, intersection=10) == pytest.approx(0.25)

    def test_identical_sets(self) -> None:
        assert jaccard(size_a=10, size_b=10, intersection=10) == pytest.approx(1.0)

    def test_disjoint(self) -> None:
        assert jaccard(size_a=5, size_b=5, intersection=0) == pytest.approx(0.0)

    def test_both_empty(self) -> None:
        # Convention from web tool: union == 0 -> 0.0 (no division)
        assert jaccard(size_a=0, size_b=0, intersection=0) == 0.0


class TestDice:
    def test_basic(self) -> None:
        # 2 * 10 / (30 + 20) = 0.4
        assert dice(size_a=30, size_b=20, intersection=10) == pytest.approx(0.4)

    def test_identical_sets(self) -> None:
        assert dice(size_a=10, size_b=10, intersection=10) == pytest.approx(1.0)

    def test_both_empty(self) -> None:
        assert dice(size_a=0, size_b=0, intersection=0) == 0.0


class TestOverlapCoefficient:
    def test_basic(self) -> None:
        # min(30, 20) = 20 -> 10 / 20 = 0.5
        assert overlap_coefficient(size_a=30, size_b=20, intersection=10) == pytest.approx(0.5)

    def test_full_subset(self) -> None:
        # If A is a subset of B, overlap coefficient = 1.0
        assert overlap_coefficient(size_a=5, size_b=20, intersection=5) == pytest.approx(1.0)

    def test_one_empty(self) -> None:
        assert overlap_coefficient(size_a=0, size_b=10, intersection=0) == 0.0


class TestHypergeometricPValue:
    """Mirror src/__tests__/statistics.test.ts assertions to maintain web-tool parity."""

    def test_expected_intersection_p_around_half(self) -> None:
        # N=100, K=50, n=50, k=25 -> expected = 25, p ~ 0.5
        p = hypergeometric_p_value(N=100, K=50, n=50, k=25)
        assert 0.3 < p < 0.7  # noqa: PLR2004

    def test_strong_enrichment_tiny_p(self) -> None:
        # N=1000, K=100, n=100, k=50 -> expected 10, observed 50
        p = hypergeometric_p_value(N=1000, K=100, n=100, k=50)
        assert p < 0.001  # noqa: PLR2004

    def test_invalid_inputs_return_one(self) -> None:
        assert hypergeometric_p_value(N=0, K=0, n=0, k=0) == 1.0
        assert hypergeometric_p_value(N=-1, K=10, n=10, k=5) == 1.0

    def test_zero_overlap_p_around_one(self) -> None:
        p = hypergeometric_p_value(N=100, K=50, n=50, k=0)
        assert p == pytest.approx(1.0, abs=0.05)

    def test_complete_overlap_tiny_p(self) -> None:
        p = hypergeometric_p_value(N=100, K=10, n=10, k=10)
        assert p < 0.001  # noqa: PLR2004

    def test_k_exceeds_min_returns_one(self) -> None:
        # k > min(K, n) is impossible -> return 1.0 (no enrichment claim)
        assert hypergeometric_p_value(N=100, K=10, n=10, k=11) == 1.0


class TestFoldEnrichment:
    def test_five_x(self) -> None:
        # N=1000, K=100, n=100, k=50 -> expected 10 -> FE = 5.0
        assert fold_enrichment(N=1000, K=100, n=100, k=50) == pytest.approx(5.0)

    def test_no_enrichment_is_one(self) -> None:
        assert fold_enrichment(N=100, K=50, n=50, k=25) == pytest.approx(1.0)

    def test_zero_denominators(self) -> None:
        assert fold_enrichment(N=0, K=10, n=10, k=5) == 0.0
        assert fold_enrichment(N=100, K=0, n=10, k=0) == 0.0
        assert fold_enrichment(N=100, K=10, n=0, k=0) == 0.0


class TestBhFdr:
    """Mirror src/__tests__/statistics.test.ts BH adjustments."""

    def test_simple_example(self) -> None:
        # Mirrors the TS test exactly:
        # raw = [0.01, 0.04, 0.03] -> adjusted (with monotonicity) = [0.03, 0.04, 0.04]
        adj = bh_fdr([0.01, 0.04, 0.03])
        assert adj[0] == pytest.approx(0.03)
        assert adj[1] == pytest.approx(0.04)
        assert adj[2] == pytest.approx(0.04)

    def test_empty(self) -> None:
        assert bh_fdr([]) == []

    def test_single_value_unchanged(self) -> None:
        adj = bh_fdr([0.05])
        assert adj == [pytest.approx(0.05)]

    def test_clipped_to_one(self) -> None:
        adj = bh_fdr([0.8, 0.9])
        assert all(p <= 1.0 for p in adj)

    def test_preserves_input_order(self) -> None:
        # adjusted[i] corresponds to ps[i] (not sorted order)
        ps = [0.5, 0.001, 0.2]
        adj = bh_fdr(ps)
        assert adj[1] < adj[2] < adj[0]


class TestComputePairwise:
    """Mirror the TS pairwiseStatistics behaviour (square Jaccard/Dice/OC/FE; long-form hypergeom)."""  # noqa: E501

    def _two_set_input(self) -> dict[str, object]:
        # |A| = 30 (inclusive), |B| = 20, |A & B| = 10, N (universe) = 40
        return dict(
            set_names=["SetA", "SetB"],
            inclusive_sizes={"SetA": 30, "SetB": 20},
            pairwise_intersections={("SetA", "SetB"): 10},
            universe_size=40,
        )

    def test_returns_statistics_result(self) -> None:
        result = compute_pairwise(**self._two_set_input())
        assert isinstance(result, StatisticsResult)

    def test_jaccard_dataframe_shape_and_values(self) -> None:
        result = compute_pairwise(**self._two_set_input())
        df = result.jaccard
        assert list(df.index) == ["SetA", "SetB"]
        assert list(df.columns) == ["SetA", "SetB"]
        assert df.loc["SetA", "SetA"] == pytest.approx(1.0)
        assert df.loc["SetA", "SetB"] == pytest.approx(0.25)
        assert df.loc["SetB", "SetA"] == pytest.approx(0.25)  # symmetric

    def test_dice_diagonal_one(self) -> None:
        result = compute_pairwise(**self._two_set_input())
        assert result.dice.loc["SetA", "SetA"] == pytest.approx(1.0)
        assert result.dice.loc["SetA", "SetB"] == pytest.approx(0.4)

    def test_overlap_coefficient(self) -> None:
        result = compute_pairwise(**self._two_set_input())
        assert result.overlap_coefficient.loc["SetA", "SetB"] == pytest.approx(0.5)

    def test_fold_enrichment_off_diagonal(self) -> None:
        result = compute_pairwise(**self._two_set_input())
        # FE(SetA, SetB) = (10 * 40) / (30 * 20) = 0.6667
        assert result.fold_enrichment.loc["SetA", "SetB"] == pytest.approx(0.6667, abs=1e-3)

    def test_hypergeometric_long_form_columns(self) -> None:
        result = compute_pairwise(**self._two_set_input())
        df = result.hypergeometric
        assert list(df.columns) == [
            "set_a", "set_b", "intersection", "expected",
            "p_value", "p_two_sided",
            "jaccard_ci_low", "jaccard_ci_high", "dice_ci_low", "dice_ci_high",
            "p_adjusted", "p_bonferroni", "significant", "highly_significant",
        ]
        assert len(df) == 1  # C(2, 2) = 1 pair
        row = df.iloc[0]
        assert row["set_a"] == "SetA"
        assert row["set_b"] == "SetB"
        assert row["intersection"] == 10  # noqa: PLR2004
        assert row["expected"] == pytest.approx(15.0)  # (30 * 20) / 40 = 15
        assert 0.0 <= row["p_value"] <= 1.0
        # pandas stores bool columns as np.bool_; verify it is a boolean-valued scalar
        assert row["significant"] in (True, False)

    def test_three_set_pair_count(self) -> None:
        result = compute_pairwise(
            set_names=["A", "B", "C"],
            inclusive_sizes={"A": 10, "B": 10, "C": 10},
            pairwise_intersections={
                ("A", "B"): 5, ("A", "C"): 5, ("B", "C"): 5,
            },
            universe_size=20,
        )
        assert result.jaccard.shape == (3, 3)
        assert len(result.hypergeometric) == 3  # noqa: PLR2004  # C(3, 2) = 3

    def test_hypergeometric_sorted_by_p_value(self) -> None:
        """Long-form table is sorted by p_value ascending (matches web tool)."""
        # Construct three pairs with deliberately different p-values
        result = compute_pairwise(
            set_names=["A", "B", "C"],
            inclusive_sizes={"A": 100, "B": 100, "C": 100},
            pairwise_intersections={
                ("A", "B"): 90,   # very strong overlap -> tiny p
                ("A", "C"): 50,   # moderate -> medium p
                ("B", "C"): 10,   # weak -> large p
            },
            universe_size=100,
        )
        p_values = list(result.hypergeometric["p_value"])
        assert p_values == sorted(p_values), f"Expected ascending p_values, got {p_values}"

    def test_reverse_order_pairwise_key(self) -> None:
        """compute_pairwise accepts (b, a) keys when set_names is [a, b]."""
        result = compute_pairwise(
            set_names=["SetA", "SetB"],
            inclusive_sizes={"SetA": 30, "SetB": 20},
            pairwise_intersections={("SetB", "SetA"): 10},  # reversed!
            universe_size=40,
        )
        # Same answer as the canonical-order key test
        assert result.jaccard.loc["SetA", "SetB"] == pytest.approx(0.25)
        assert result.hypergeometric.iloc[0]["intersection"] == 10  # noqa: PLR2004

    def test_bonferroni_min_one_times_m(self) -> None:
        """Bonferroni = min(1, p * m), m = number of pairwise tests (C(3, 2) = 3)."""
        result = compute_pairwise(
            set_names=["A", "B", "C"],
            inclusive_sizes={"A": 100, "B": 100, "C": 100},
            pairwise_intersections={
                ("A", "B"): 90, ("A", "C"): 50, ("B", "C"): 10,
            },
            universe_size=100,
        )
        df = result.hypergeometric
        for _, row in df.iterrows():
            expected = min(1.0, float(row["p_value"]) * 3)
            assert row["p_bonferroni"] == pytest.approx(expected)
            assert row["p_bonferroni"] <= 1.0

    def test_new_columns_present(self) -> None:
        result = compute_pairwise(**self._two_set_input())
        row = result.hypergeometric.iloc[0]
        # inter=10, union=40 -> Jaccard Wilson CI = wilson_interval(10, 40)
        assert row["jaccard_ci_low"] == pytest.approx(0.14187118639096302)
        assert row["jaccard_ci_high"] == pytest.approx(0.40193961420768026)
        # inter=10, sizeA+sizeB=50 -> dice_ci(10, 30, 20)
        assert row["dice_ci_low"] == pytest.approx(0.2248750003155222)
        assert row["dice_ci_high"] == pytest.approx(0.6607421186445084)
        assert 0.0 <= row["p_two_sided"] <= 1.0


class TestOneVsRestEnrichment:
    """Mirror the TS oneVsRestEnrichment behaviour (see task-F6-ts-report.md).

    Critical property under test: ``rest_size`` is derived from ``union_size``
    (U, sum of exclusive counts over every non-empty region), NOT from
    ``universe_size`` (N). Using N there was the original bug — it forced the
    observed ``k`` to the hypergeometric support minimum, degenerating every
    p-value to 1.0.
    """

    def _hand_case(self) -> dict[str, object]:
        # 3-set case with region exclusive counts:
        #   only-A=10, only-B=15, only-C=15, AB=3, AC=2, BC=3, ABC=2 -> U=50
        # inclusive sizes: K_A = 10+3+2+2=17, K_B = 15+3+3+2=23, K_C = 15+2+3+2=22
        # universe_size (N) = 1000, 20x larger than U -- proves rest_size must
        # use U, not N (if it used N, k would sit at the support minimum and
        # every p-value would degenerate to 1.0).
        return dict(
            set_names=["A", "B", "C"],
            inclusive_sizes={"A": 17, "B": 23, "C": 22},
            exclusive_only_sizes={"A": 10, "B": 15, "C": 15},
            union_size=50,
            universe_size=1000,
        )

    def test_rest_size_uses_union_not_universe(self) -> None:
        df = one_vs_rest_enrichment(**self._hand_case())
        row_a = df[df["name"] == "A"].iloc[0]
        # rest_size = union_size(50) - excl_A(10) = 40, NOT universe_size(1000) - excl_A.
        assert row_a["rest_size"] == 40  # noqa: PLR2004
        assert row_a["intersection"] == 7  # k = K_A(17) - excl_A(10)  # noqa: PLR2004
        assert row_a["expected"] == pytest.approx(17 * 40 / 1000)

    def test_enriched_set_gets_meaningful_non_one_p_value(self) -> None:
        """K=17 successes drawn as k=7 out of n=40 from N=1000 is a strong,
        genuinely-informative over-representation (expected ~0.68) -- not the
        degenerate p=1.0 the union-vs-universe bug produced for every set."""
        df = one_vs_rest_enrichment(**self._hand_case())
        row_a = df[df["name"] == "A"].iloc[0]
        assert 0.0 < row_a["p_value"] < 0.001  # noqa: PLR2004

    def test_universe_equals_union_gives_honest_p_near_one(self) -> None:
        """Aggregated mode: universe_size == union_size (no background to
        enrich against). k falls to the hypergeometric support minimum for
        every set, so p == 1.0 exactly for all -- an honest result (per
        task-F6-ts-report.md), not a bug."""
        df = one_vs_rest_enrichment(
            set_names=["A", "B"],
            inclusive_sizes={"A": 10, "B": 10},
            exclusive_only_sizes={"A": 5, "B": 5},
            union_size=15,  # only-A(5) + only-B(5) + AB(5) = 15
            universe_size=15,
        )
        for p in df["p_value"]:
            assert p == pytest.approx(1.0)

    def test_sorted_by_p_value_ascending(self) -> None:
        df = one_vs_rest_enrichment(**self._hand_case())
        p_values = list(df["p_value"])
        assert p_values == sorted(p_values)

    def test_bonferroni_min_one_times_m(self) -> None:
        """Bonferroni = min(1, p * m), m = number of sets tested (n = 3)."""
        df = one_vs_rest_enrichment(**self._hand_case())
        for _, row in df.iterrows():
            expected = min(1.0, float(row["p_value"]) * 3)
            assert row["p_bonferroni"] == pytest.approx(expected)
            assert row["p_bonferroni"] <= 1.0

    def test_columns_present(self) -> None:
        df = one_vs_rest_enrichment(**self._hand_case())
        assert list(df.columns) == [
            "name", "size", "rest_size", "intersection", "expected",
            "fold_enrichment", "p_value", "p_adjusted", "p_bonferroni",
            "significant",
        ]
        assert len(df) == 3  # noqa: PLR2004


class TestLogChoose:
    """log_choose ports statistics.ts logChoose (explicit-loop, not gammaln)."""

    def test_basic(self) -> None:
        # C(5, 2) = 10 -> log(10)
        assert log_choose(5, 2) == pytest.approx(2.302585092994046)

    def test_edges(self) -> None:
        assert log_choose(10, 0) == 0.0
        assert log_choose(10, 10) == 0.0

    def test_out_of_range(self) -> None:
        assert log_choose(5, 6) == -math.inf
        assert log_choose(5, -1) == -math.inf


class TestTwoSidedFisher:
    """Manual log-space port of statistics.ts twoSidedFisher (NOT scipy.fisher_exact)."""

    def test_reference_value(self) -> None:
        # Spec reference: twoSidedFisher(20, 8, 6, 5) = 700/38760 = 0.01805985552115583
        assert two_sided_fisher(20, 8, 6, 5) == pytest.approx(0.01805985552115583, abs=1e-15)

    def test_invalid_inputs_return_one(self) -> None:
        assert two_sided_fisher(0, 0, 0, 0) == 1.0
        assert two_sided_fisher(-1, 8, 6, 5) == 1.0

    def test_out_of_support_returns_one(self) -> None:
        # k outside [max(0, K+n-N) .. min(K, n)] -> 1.0
        assert two_sided_fisher(20, 8, 6, 7) == 1.0

    def test_clamped_to_unit_interval(self) -> None:
        p = two_sided_fisher(100, 50, 50, 25)
        assert 0.0 <= p <= 1.0


class TestWilsonInterval:
    def test_reference_value(self) -> None:
        low, high = wilson_interval(10, 40)
        assert low == pytest.approx(0.14187118639096302, abs=1e-15)
        assert high == pytest.approx(0.40193961420768026, abs=1e-15)

    def test_zero_trials(self) -> None:
        assert wilson_interval(0, 0) == (0.0, 0.0)
        assert wilson_interval(5, -1) == (0.0, 0.0)

    def test_bounds_clamped(self) -> None:
        low, high = wilson_interval(40, 40)  # phat = 1.0
        assert 0.0 <= low <= 1.0
        assert 0.0 <= high <= 1.0


class TestJaccardAndDiceCI:
    def test_jaccard_ci(self) -> None:
        low, high = jaccard_ci(10, 40)
        assert low == pytest.approx(0.14187118639096302, abs=1e-15)
        assert high == pytest.approx(0.40193961420768026, abs=1e-15)

    def test_jaccard_ci_zero_union(self) -> None:
        assert jaccard_ci(0, 0) == (0.0, 0.0)

    def test_dice_ci_reference(self) -> None:
        # dice_ci(10, 20, 30): inter=10, sizeA+sizeB=50
        low, high = dice_ci(10, 20, 30)
        assert low == pytest.approx(0.2248750003155222, abs=1e-15)
        assert high == pytest.approx(0.6607421186445084, abs=1e-15)

    def test_dice_ci_zero_denominator(self) -> None:
        assert dice_ci(0, 0, 0) == (0.0, 0.0)

    def test_dice_ci_bounds_clamped_to_one(self) -> None:
        low, high = dice_ci(10, 5, 5)  # 2*wilson bounds can exceed 1 -> clamped
        assert low <= 1.0
        assert high <= 1.0
