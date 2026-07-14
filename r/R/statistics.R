#' Jaccard similarity index
#'
#' Computes |A intersection B| / |A union B|. Matches the web tool's convention
#' of returning 0 when both sets are empty (NaN-safe).
#'
#' @param size_a Inclusive size of set A (integer >= 0).
#' @param size_b Inclusive size of set B (integer >= 0).
#' @param intersection Inclusive intersection size |A intersection B|.
#' @return Numeric in [0, 1].
#' @export
#' @examples
#' jaccard(10, 10, 5)
#' jaccard(0, 0, 0)
jaccard <- function(size_a, size_b, intersection) {
    union_size <- size_a + size_b - intersection
    if (union_size <= 0) return(0)
    intersection / union_size
}

#' Sorensen-Dice coefficient
#'
#' Computes 2 * |A intersection B| / (|A| + |B|). Returns 0 if both sets are
#' empty (matches web tool convention).
#'
#' @inheritParams jaccard
#' @return Numeric in [0, 1].
#' @export
#' @examples
#' dice(10, 10, 5)
dice <- function(size_a, size_b, intersection) {
    denom <- size_a + size_b
    if (denom <= 0) return(0)
    (2 * intersection) / denom
}

#' Szymkiewicz-Simpson overlap coefficient
#'
#' Computes |A intersection B| / min(|A|, |B|). Useful when one set is much
#' smaller than the other.
#'
#' @inheritParams jaccard
#' @return Numeric in [0, 1].
#' @export
#' @examples
#' overlap_coefficient(10, 5, 3)
overlap_coefficient <- function(size_a, size_b, intersection) {
    denom <- min(size_a, size_b)
    if (denom <= 0) return(0)
    intersection / denom
}

#' One-sided hypergeometric p-value (over-representation)
#'
#' Computes P(X >= k) where X ~ Hypergeometric(N, K, n). Returns 1.0 for
#' invalid inputs so the metric is safe to feed into BH-FDR without filtering.
#'
#' Maps to R's `phyper(k - 1, K, N - K, n, lower.tail = FALSE)`. Note that R's
#' phyper parameter convention differs from Python's scipy: R uses `m` for
#' success-in-population and `n` for failure-in-population (= N - K), where
#' Python uses `N` for total population.
#'
#' @param N Population size (total items in the universe). Integer >= 1.
#' @param K Number of success states in the population (e.g. inclusive |A|). Integer >= 0.
#' @param n Number of draws (e.g. inclusive |B|). Integer >= 0.
#' @param k Observed successes (e.g. |A intersection B|). Integer >= 0.
#' @return Numeric in [0, 1].
#' @export
#' @examples
#' hypergeometric_p_value(20000, 138, 581, 126)
hypergeometric_p_value <- function(N, K, n, k) {
    if (N < 1 || K < 0 || n < 0 || k < 0) return(1.0)
    K_clipped <- min(K, N)
    n_clipped <- min(n, N)
    if (k > min(K_clipped, n_clipped)) return(1.0)
    p <- stats::phyper(k - 1, K_clipped, N - K_clipped, n_clipped, lower.tail = FALSE)
    min(max(p, 0.0), 1.0)
}

#' Fold enrichment (observed / expected ratio)
#'
#' Computes (k * N) / (K * n). Returns 0.0 if any denominator is zero
#' (matches web tool convention).
#'
#' @inheritParams hypergeometric_p_value
#' @return Numeric (>= 0; can exceed 1 for over-representation).
#' @export
#' @examples
#' fold_enrichment(20000, 138, 581, 126)
fold_enrichment <- function(N, K, n, k) {
    if (N == 0 || K == 0 || n == 0) return(0)
    (k * N) / (K * n)
}

#' Benjamini-Hochberg FDR adjustment
#'
#' Wraps `stats::p.adjust(p, method = "BH")`. Returns adjusted p-values in the
#' same order as the input. Empty input -> empty output.
#'
#' @param p_values Numeric vector of raw p-values in [0, 1].
#' @return Numeric vector of adjusted p-values, same length as input.
#' @export
#' @examples
#' bh_fdr(c(0.001, 0.01, 0.05, 0.5))
bh_fdr <- function(p_values) {
    if (length(p_values) == 0) return(numeric(0))
    stats::p.adjust(p_values, method = "BH")
}

#' One-vs-rest enrichment: each set tested against the union of all OTHER sets
#'
#' Ported byte-for-byte from the web tool's `oneVsRestEnrichment`
#' (`packages/core/src/statistics.ts`) / Python's `one_vs_rest_enrichment`
#' (`venn_diagram_lab.statistics`). For each set S, "rest" is the union of the
#' inclusive members of all *other* sets, derived purely from region counts:
#'
#' * `U` (`union_size`) = union of ALL sets = sum of the exclusive counts over
#'   every one of the `2^n - 1` region labels (items in >= 1 set). Binary mode:
#'   `U` <= the dataset's row-count universe (rows may belong to no set).
#'   Aggregated mode: `U` == universe.
#' * `K` = `inclusive_sizes[[name]]` (inclusive size of S)
#' * `excl_S` = `exclusive_only_sizes[[name]]` (items only in S), 0 if absent
#' * `rest_size` = `U - excl_S` (items in >= 1 non-S set)
#' * `k` = `K - excl_S` (S items also in >= 1 other set)
#' * `N` (`universe_size`) = sampling universe for the hypergeometric test
#'
#' **Critical:** `rest_size` is derived from `union_size` (U), NOT from
#' `universe_size` (N). This is what makes the test meaningful: in binary
#' mode N > U, so the observed `k` sits above the hypergeometric support
#' minimum and the p-value is informative. When N == U (aggregated mode,
#' universe equals union) the p-value is ~1 -- mathematically honest ("no
#' background to enrich against"), not a bug. See
#' `.superpowers/sdd/task-F6-ts-report.md` for the full derivation.
#'
#' Uses the same hypergeometric machinery as [compute_pairwise()].
#' Benjamini-Hochberg FDR is computed over the `n` one-vs-rest tests (one per
#' set); Bonferroni = `min(1, p * n)`. Returned rows are sorted by p-value
#' ascending (stable), matching the pairwise convention.
#'
#' @param set_names Ordered character vector of set identifiers.
#' @param inclusive_sizes Named integer vector: set name -> inclusive size (K).
#' @param exclusive_only_sizes Named integer vector: set name -> items present
#'   in exactly that set alone (the single-set region's exclusive count,
#'   excl_S). Names missing from this vector default to 0.
#' @param union_size U: union of ALL sets (sum of exclusive counts over every
#'   non-empty region, including multi-set regions).
#' @param universe_size N: the hypergeometric sampling universe (same value
#'   [compute_pairwise()] receives as `universe_size`).
#' @return A data.frame with columns `name, size, rest_size, intersection,
#'   expected, fold_enrichment, p_value, p_adjusted, p_bonferroni, significant`,
#'   sorted by `p_value` ascending.
#' @export
#' @examples
#' one_vs_rest_enrichment(
#'     set_names = c("A", "B"),
#'     inclusive_sizes = c(A = 10L, B = 8L),
#'     exclusive_only_sizes = c(A = 5L, B = 3L),
#'     union_size = 13L,
#'     universe_size = 100L
#' )
one_vs_rest_enrichment <- function(set_names, inclusive_sizes, exclusive_only_sizes,
                                    union_size, universe_size) {
    rows_name         <- character()
    rows_size         <- integer()
    rows_rest_size    <- integer()
    rows_intersection <- integer()
    rows_expected     <- numeric()
    rows_fe           <- numeric()
    rows_p_value      <- numeric()

    for (name in set_names) {
        k_size <- as.integer(inclusive_sizes[[name]])
        excl_s <- if (name %in% names(exclusive_only_sizes)) {
            as.integer(exclusive_only_sizes[[name]])
        } else {
            0L
        }
        rest_size <- union_size - excl_s
        k <- k_size - excl_s

        expected <- if (universe_size > 0) (k_size * rest_size) / universe_size else 0
        fe <- fold_enrichment(universe_size, k_size, rest_size, k)
        p_val <- hypergeometric_p_value(universe_size, k_size, rest_size, k)

        rows_name         <- c(rows_name, name)
        rows_size         <- c(rows_size, k_size)
        rows_rest_size    <- c(rows_rest_size, rest_size)
        rows_intersection <- c(rows_intersection, k)
        rows_expected     <- c(rows_expected, expected)
        rows_fe           <- c(rows_fe, fe)
        rows_p_value      <- c(rows_p_value, p_val)
    }

    # BH-FDR + Bonferroni FWER control (m = number of sets tested).
    m <- length(rows_p_value)
    adjusted <- bh_fdr(rows_p_value)
    p_bonferroni <- pmin(1, rows_p_value * m)
    significant <- adjusted < 0.05

    df <- data.frame(
        name             = rows_name,
        size             = rows_size,
        rest_size        = rows_rest_size,
        intersection     = rows_intersection,
        expected         = rows_expected,
        fold_enrichment  = rows_fe,
        p_value          = rows_p_value,
        p_adjusted       = adjusted,
        p_bonferroni     = p_bonferroni,
        significant      = significant,
        stringsAsFactors = FALSE
    )
    # Sort by p_value ascending (shell sort — stable for named vectors, deterministic;
    # matches compute_pairwise's sort convention).
    df <- df[order(df$p_value, method = "shell"), , drop = FALSE]
    rownames(df) <- NULL
    df
}

# Internal: exact 97.5% normal quantile — shared with web/Python so all surfaces
# produce byte-identical Wilson score intervals.
.Z_WILSON <- 1.959963984540054

#' @noRd
# Overflow-safe log binomial coefficient log(C(n, k)). Manual summation loop
# sum(log(n - i) - log(i + 1)) ported byte-for-byte from the web tool's
# ``logChoose`` (statistics.ts) and Python's ``log_choose`` — deliberately NOT
# ``lchoose()``, so the floating-point arithmetic matches the TS source exactly
# and downstream .js_to_* formatting produces identical bytes.
.log_choose <- function(n, k) {
    if (k > n || k < 0) return(-Inf)
    if (k == 0 || k == n) return(0)
    kk <- min(k, n - k)
    result <- 0
    for (i in 0:(kk - 1L)) {
        result <- result + log(n - i) - log(i + 1)
    }
    result
}

#' @noRd
# Two-sided Fisher's exact test for the 2x2 table derived from (N, K, n, k).
# Manual log-space point-mass port of the web tool's ``twoSidedFisher``: sums
# every hypergeometric point mass P(X=i) over the support
# i in [max(0, K+n-N) .. min(K, n)] whose log-probability is <= logP_obs + 1e-7
# (a log-space tie tolerance). Result clamped to [0, 1]. Deliberately does NOT
# call stats::fisher.test (its tie convention may differ and break byte parity).
.two_sided_fisher <- function(N, K, n, k) {
    if (N < 1 || K < 0 || n < 0 || k < 0) return(1.0)
    K <- min(K, N)
    n <- min(n, N)
    lo <- max(0, K + n - N)
    hi <- min(K, n)
    if (k < lo || k > hi) return(1.0)
    log_denom <- .log_choose(N, n)
    log_p_obs <- .log_choose(K, k) + .log_choose(N - K, n - k) - log_denom
    tol <- 1e-7
    p <- 0
    for (i in lo:hi) {
        log_p <- .log_choose(K, i) + .log_choose(N - K, n - i) - log_denom
        if (log_p <= log_p_obs + tol) {
            p <- p + exp(log_p)
        }
    }
    min(max(p, 0.0), 1.0)
}

#' @noRd
# Wilson score 95% CI for a proportion phat = x / nn. Returns c(low, high)
# clamped to [0, 1]. Zero/negative trials -> c(0, 0). Ported from the web tool's
# ``wilsonInterval`` (statistics.ts) / Python's ``wilson_interval``.
.wilson_interval <- function(x, nn) {
    if (nn <= 0) return(c(0.0, 0.0))
    phat <- x / nn
    z2 <- .Z_WILSON * .Z_WILSON
    denom <- 1 + z2 / nn
    center <- (phat + z2 / (2 * nn)) / denom
    half <- (.Z_WILSON * sqrt((phat * (1 - phat)) / nn + z2 / (4 * nn * nn))) / denom
    low <- min(max(center - half, 0.0), 1.0)
    high <- min(max(center + half, 0.0), 1.0)
    c(low, high)
}

#' @noRd
# Wilson 95% CI for the Jaccard index J = inter / union (proportion, union trials).
.jaccard_ci <- function(intersection, union_size) {
    .wilson_interval(intersection, union_size)
}

#' @noRd
# Wilson 95% CI for the Dice coefficient D = 2*inter / (size_a + size_b): treats
# p = inter / (size_a + size_b) as a proportion, then multiplies both bounds by 2
# (clamped to [0, 1]). Denominator 0 -> c(0, 0).
.dice_ci <- function(intersection, size_a, size_b) {
    nn <- size_a + size_b
    lohi <- .wilson_interval(intersection, nn)
    c(min(2 * lohi[1L], 1.0), min(2 * lohi[2L], 1.0))
}

# Internal: build a square N x N named matrix from (set_a, set_b) -> value entries.
.square_metric <- function(set_names, pair_values, diagonal_value) {
    n <- length(set_names)
    m <- matrix(diagonal_value, nrow = n, ncol = n,
                dimnames = list(set_names, set_names))
    for (key in names(pair_values)) {
        parts <- strsplit(key, "|", fixed = TRUE)[[1]]
        a <- parts[1L]; b <- parts[2L]
        m[a, b] <- pair_values[[key]]
        m[b, a] <- pair_values[[key]]
    }
    m
}

#' Compute all 5 pairwise statistical tables
#'
#' Orchestrator that returns a [`StatisticsResult-class`] populated with
#' Jaccard, Dice, Overlap Coefficient, Fold Enrichment (square NxN matrices)
#' plus a long-form hypergeometric table with BH-FDR adjustment.
#'
#' @param set_names Ordered character vector of set identifiers (e.g. c("A","B","C")).
#' @param inclusive_sizes Named integer vector of inclusive set sizes (`names(inclusive_sizes)` matches `set_names`).
#' @param pairwise_intersections Named list of pair intersection counts. Keys are
#'   "set_a|set_b" with set_a appearing earlier in `set_names` than set_b.
#' @param universe_size Hypergeometric universe N (population size). Integer >= 1.
#' @return A [`StatisticsResult-class`] object.
#' @export
#' @examples
#' compute_pairwise(
#'     set_names = c("A", "B"),
#'     inclusive_sizes = c(A = 10L, B = 8L),
#'     pairwise_intersections = list("A|B" = 5L),
#'     universe_size = 100L
#' )
compute_pairwise <- function(set_names, inclusive_sizes, pairwise_intersections, universe_size) {
    pair_jaccard <- list()
    pair_dice    <- list()
    pair_oc      <- list()
    pair_fe      <- list()

    rows_set_a           <- character()
    rows_set_b           <- character()
    rows_intersection    <- integer()
    rows_expected        <- numeric()
    rows_p_value         <- numeric()
    rows_p_two_sided     <- numeric()
    rows_jaccard_ci_low  <- numeric()
    rows_jaccard_ci_high <- numeric()
    rows_dice_ci_low     <- numeric()
    rows_dice_ci_high    <- numeric()

    pairs <- utils::combn(set_names, 2, simplify = FALSE)
    for (pair in pairs) {
        a <- pair[1L]; b <- pair[2L]
        ka <- inclusive_sizes[[a]]
        kb <- inclusive_sizes[[b]]
        # Look up the intersection count under "a|b" or fall back to "b|a".
        key_ab <- paste(a, b, sep = "|")
        key_ba <- paste(b, a, sep = "|")
        inter <- pairwise_intersections[[key_ab]]
        if (is.null(inter)) inter <- pairwise_intersections[[key_ba]]
        if (is.null(inter)) inter <- 0L
        inter <- as.integer(inter)

        pair_jaccard[[key_ab]] <- jaccard(ka, kb, inter)
        pair_dice[[key_ab]]    <- dice(ka, kb, inter)
        pair_oc[[key_ab]]      <- overlap_coefficient(ka, kb, inter)
        pair_fe[[key_ab]]      <- fold_enrichment(universe_size, ka, kb, inter)

        expected <- if (universe_size > 0) (ka * kb) / universe_size else 0
        p_val <- hypergeometric_p_value(universe_size, ka, kb, inter)

        p_two <- .two_sided_fisher(universe_size, ka, kb, inter)
        union_size <- ka + kb - inter
        jac_ci  <- .jaccard_ci(inter, union_size)
        dice_ci <- .dice_ci(inter, ka, kb)

        rows_set_a           <- c(rows_set_a, a)
        rows_set_b           <- c(rows_set_b, b)
        rows_intersection    <- c(rows_intersection, inter)
        rows_expected        <- c(rows_expected, expected)
        rows_p_value         <- c(rows_p_value, p_val)
        rows_p_two_sided     <- c(rows_p_two_sided, p_two)
        rows_jaccard_ci_low  <- c(rows_jaccard_ci_low, jac_ci[1L])
        rows_jaccard_ci_high <- c(rows_jaccard_ci_high, jac_ci[2L])
        rows_dice_ci_low     <- c(rows_dice_ci_low, dice_ci[1L])
        rows_dice_ci_high    <- c(rows_dice_ci_high, dice_ci[2L])
    }

    adjusted <- bh_fdr(rows_p_value)
    significant        <- adjusted < 0.05
    highly_significant <- adjusted < 0.001
    # Bonferroni FWER control: min(1, p * m), m = number of pairwise tests.
    m <- length(rows_p_value)
    p_bonferroni <- pmin(1, rows_p_value * m)

    hyp <- data.frame(
        set_a              = rows_set_a,
        set_b              = rows_set_b,
        intersection       = rows_intersection,
        expected           = rows_expected,
        p_value            = rows_p_value,
        p_adjusted         = adjusted,
        p_bonferroni       = p_bonferroni,
        p_two_sided        = rows_p_two_sided,
        jaccard_ci_low     = rows_jaccard_ci_low,
        jaccard_ci_high    = rows_jaccard_ci_high,
        dice_ci_low        = rows_dice_ci_low,
        dice_ci_high       = rows_dice_ci_high,
        significant        = significant,
        highly_significant = highly_significant,
        stringsAsFactors   = FALSE
    )
    # Sort by p_value ascending (shell sort — stable for named vectors, deterministic).
    hyp <- hyp[order(hyp$p_value, method = "shell"), , drop = FALSE]
    rownames(hyp) <- NULL

    methods::new("StatisticsResult",
        jaccard             = .square_metric(set_names, pair_jaccard, diagonal_value = 1.0),
        dice                = .square_metric(set_names, pair_dice,    diagonal_value = 1.0),
        overlap_coefficient = .square_metric(set_names, pair_oc,      diagonal_value = 1.0),
        fold_enrichment     = .square_metric(set_names, pair_fe,      diagonal_value = NA_real_),
        hypergeometric      = hyp
    )
}
