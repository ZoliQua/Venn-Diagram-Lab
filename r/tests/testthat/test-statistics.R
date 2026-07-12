test_that("jaccard returns intersection / union", {
    expect_equal(jaccard(10, 10, 5), 5 / 15)
    expect_equal(jaccard(10, 0, 0), 0)
    expect_equal(jaccard(5, 5, 5), 1.0)         # identical sets
    expect_equal(jaccard(0, 0, 0), 0)            # empty/empty -> 0 (web tool convention)
})

test_that("dice returns 2*intersection / (size_a + size_b)", {
    expect_equal(dice(10, 10, 5), 10 / 20)
    expect_equal(dice(5, 5, 5), 1.0)
    expect_equal(dice(0, 0, 0), 0)
    expect_equal(dice(10, 0, 0), 0)
})

test_that("overlap_coefficient returns intersection / min(size_a, size_b)", {
    expect_equal(overlap_coefficient(10, 5, 3), 3 / 5)
    expect_equal(overlap_coefficient(5, 10, 3), 3 / 5)   # symmetric
    expect_equal(overlap_coefficient(5, 5, 5), 1.0)       # identical
    expect_equal(overlap_coefficient(0, 5, 0), 0)         # one empty
})

test_that("hypergeometric_p_value computes P(X >= k) correctly", {
    # 4 of 50 success, drew 10, observed 3 -> upper-tail p
    # Hand-verified against R: phyper(2, 4, 46, 10, lower.tail = FALSE)
    expect_equal(
        hypergeometric_p_value(50, 4, 10, 3),
        phyper(2, 4, 50 - 4, 10, lower.tail = FALSE),
        tolerance = 1e-12
    )
    # Strong overlap: full population = full success
    expect_equal(hypergeometric_p_value(100, 100, 100, 100), 1.0, tolerance = 1e-12)
    # No overlap possible: k > min(K, n) -> 1.0
    expect_equal(hypergeometric_p_value(100, 5, 5, 6), 1.0)
    # Invalid inputs return 1.0 (safe for downstream BH-FDR)
    expect_equal(hypergeometric_p_value(0, 10, 10, 5), 1.0)
    expect_equal(hypergeometric_p_value(100, -1, 10, 5), 1.0)
})

test_that("fold_enrichment returns observed / expected ratio", {
    # k * N / (K * n) = 5 * 100 / (10 * 10) = 5.0
    expect_equal(fold_enrichment(100, 10, 10, 5), 5.0)
    # Underrepresented: k=1, K*n/N = 1.0 -> FE = 1.0
    expect_equal(fold_enrichment(100, 10, 10, 1), 1.0)
    # Edge cases return 0
    expect_equal(fold_enrichment(0, 10, 10, 5), 0)
    expect_equal(fold_enrichment(100, 0, 10, 5), 0)
    expect_equal(fold_enrichment(100, 10, 0, 5), 0)
})

test_that("bh_fdr matches stats::p.adjust(method='BH')", {
    p <- c(0.001, 0.008, 0.01, 0.02, 0.5)
    expect_equal(bh_fdr(p), stats::p.adjust(p, method = "BH"))
    # Empty input -> empty output
    expect_equal(bh_fdr(numeric(0)), numeric(0))
    # Single element passes through
    expect_equal(bh_fdr(0.05), 0.05)
})

test_that("compute_pairwise produces all 5 metric tables for 3 sets", {
    set_names <- c("A", "B", "C")
    inclusive_sizes <- c(A = 10L, B = 8L, C = 6L)
    pairwise_inter <- list("A|B" = 5L, "A|C" = 3L, "B|C" = 2L)
    # Helper to convert list-keyed pairs to the (a, b) -> int format used internally.
    # We use "A|B" (pipe-separated) as the key encoding for tests.
    res <- compute_pairwise(
        set_names = set_names,
        inclusive_sizes = inclusive_sizes,
        pairwise_intersections = pairwise_inter,
        universe_size = 100L
    )

    expect_s4_class(res, "StatisticsResult")
    # Square metric tables: 3x3 named matrix
    expect_equal(dim(res@jaccard), c(3, 3))
    expect_equal(rownames(res@jaccard), set_names)
    expect_equal(colnames(res@jaccard), set_names)
    expect_equal(res@jaccard["A", "A"], 1.0)   # diagonal
    expect_equal(res@jaccard["A", "B"], jaccard(10, 8, 5), tolerance = 1e-12)
    # Hypergeometric long-form table: 3 pairs (n choose 2)
    expect_equal(nrow(res@hypergeometric), 3L)
    expect_setequal(colnames(res@hypergeometric),
                    c("set_a", "set_b", "intersection", "expected",
                      "p_value", "p_adjusted", "p_bonferroni", "p_two_sided",
                      "jaccard_ci_low", "jaccard_ci_high",
                      "dice_ci_low", "dice_ci_high",
                      "significant", "highly_significant"))
})

test_that(".two_sided_fisher matches the log-space point-mass reference", {
    # Reference (verified vs TS + Python): (N=20, K=8, n=6, k=5) -> 700/38760.
    expect_equal(.two_sided_fisher(20, 8, 6, 5), 700 / 38760, tolerance = 1e-12)
    # Invalid / out-of-support inputs return 1.0 (matches web tool convention).
    expect_equal(.two_sided_fisher(0, 8, 6, 5), 1.0)
    expect_equal(.two_sided_fisher(20, 8, 6, -1), 1.0)
    # k above the support upper bound min(K, n) -> 1.0.
    expect_equal(.two_sided_fisher(20, 8, 6, 7), 1.0)
    # Result is always clamped to [0, 1].
    p <- .two_sided_fisher(100, 40, 30, 12)
    expect_true(p >= 0 && p <= 1)
})

test_that(".log_choose matches lchoose but via the manual TS summation loop", {
    expect_equal(.log_choose(20, 6), lchoose(20, 6), tolerance = 1e-12)
    expect_equal(.log_choose(10, 0), 0)
    expect_equal(.log_choose(10, 10), 0)
    expect_equal(.log_choose(5, 6), -Inf)   # k > n
    expect_equal(.log_choose(5, -1), -Inf)  # k < 0
})

test_that(".wilson_interval matches the shared reference bounds", {
    # Reference (verified vs TS + Python): wilsonInterval(10, 40).
    ci <- .wilson_interval(10, 40)
    expect_equal(ci[1L], 0.14187118639096302, tolerance = 1e-12)
    expect_equal(ci[2L], 0.40193961420768026, tolerance = 1e-12)
    # Zero / negative trials -> c(0, 0).
    expect_equal(.wilson_interval(0, 0), c(0, 0))
    expect_equal(.wilson_interval(5, -1), c(0, 0))
    # Bounds clamped to [0, 1].
    ci_full <- .wilson_interval(40, 40)
    expect_true(all(ci_full >= 0 & ci_full <= 1))
})

test_that(".jaccard_ci and .dice_ci match the shared reference bounds", {
    # Jaccard CI at inter=10, union=40 equals wilsonInterval(10, 40).
    expect_equal(.jaccard_ci(10, 40), .wilson_interval(10, 40))
    # Reference (verified vs TS + Python): diceCI(inter=10, sizeA=20, sizeB=30).
    dci <- .dice_ci(10, 20, 30)
    expect_equal(dci[1L], 0.2248750003155222, tolerance = 1e-12)
    expect_equal(dci[2L], 0.6607421186445084, tolerance = 1e-12)
    # Dice bounds are the Wilson bounds x2, clamped to [0, 1].
    expect_equal(.dice_ci(0, 0, 0), c(0, 0))
    expect_true(all(.dice_ci(25, 30, 20) <= 1))
})

test_that("compute_pairwise Bonferroni = min(1, p * m)", {
    res <- compute_pairwise(
        set_names = c("A", "B", "C"),
        inclusive_sizes = c(A = 10L, B = 8L, C = 6L),
        pairwise_intersections = list("A|B" = 5L, "A|C" = 3L, "B|C" = 2L),
        universe_size = 100L
    )
    hyp <- res@hypergeometric
    m <- nrow(hyp)   # number of pairwise tests
    expect_equal(hyp$p_bonferroni, pmin(1, hyp$p_value * m), tolerance = 1e-12)
})

test_that("compute_pairwise handles n=2 (1 pair)", {
    res <- compute_pairwise(
        set_names = c("X", "Y"),
        inclusive_sizes = c(X = 100L, Y = 50L),
        pairwise_intersections = list("X|Y" = 25L),
        universe_size = 1000L
    )
    expect_equal(dim(res@jaccard), c(2, 2))
    expect_equal(nrow(res@hypergeometric), 1L)
    # fold_enrichment diagonal is NA_real_ (a set is not "enriched" against itself).
    expect_true(is.na(res@fold_enrichment["X", "X"]))
    expect_true(is.na(res@fold_enrichment["Y", "Y"]))
    # Symmetry of off-diagonal entries.
    expect_equal(res@jaccard["X", "Y"], res@jaccard["Y", "X"])
})
