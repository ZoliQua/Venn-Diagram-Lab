# Broom-compatible S3 methods for RegionResult.
# All three methods (tidy/glance/augment) are registered via
# @exportS3Method so `broom` stays in Suggests, never Imports.
# Returns tibble when `tibble` is installed, plain data.frame otherwise.

#' @noRd
.as_tibble_safe <- function(df) {
    if (requireNamespace("tibble", quietly = TRUE)) {
        return(tibble::as_tibble(df))
    }
    df
}

#' Tidy method for RegionResult (broom-compatible)
#'
#' Returns a long-form table with one row per ordered set pair, combining the
#' five pairwise statistical metrics (Jaccard, Dice, overlap coefficient,
#' fold enrichment, hypergeometric p-value + BH-FDR-adjusted q-value).
#' Pair ordering is `(set_a, set_b)` with `set_a` appearing earlier in
#' `result@dataset@set_names`.
#'
#' @param x A [`RegionResult-class`].
#' @param ... Unused (broom convention).
#' @return A tibble (or data.frame if `tibble` is not installed) with columns
#'   `set_a`, `set_b`, `intersection`, `expected`, `jaccard`, `dice`,
#'   `overlap_coefficient`, `fold_enrichment`, `p_value`, `p_adjusted`,
#'   `significant`, `highly_significant`. One row per unordered pair, so
#'   `n*(n-1)/2` rows for an `n`-set dataset.
#' @exportS3Method broom::tidy
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' if (requireNamespace("broom", quietly = TRUE)) broom::tidy(result)
#' \donttest{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' broom::tidy(result)
#' }
tidy.RegionResult <- function(x, ...) {
    stats <- statistics(x)
    hyp <- stats@hypergeometric

    if (nrow(hyp) == 0L) {
        # n < 2: empty statistics. Return zero-row tibble with the full
        # schema so downstream code can rbind safely.
        empty <- data.frame(
            set_a               = character(0),
            set_b               = character(0),
            intersection        = integer(0),
            expected            = numeric(0),
            jaccard             = numeric(0),
            dice                = numeric(0),
            overlap_coefficient = numeric(0),
            fold_enrichment     = numeric(0),
            p_value             = numeric(0),
            p_adjusted          = numeric(0),
            significant         = logical(0),
            highly_significant  = logical(0),
            stringsAsFactors    = FALSE
        )
        return(.as_tibble_safe(empty))
    }

    # Pull (a, b) cell from each square matrix and align it with the
    # hypergeometric long-form table.
    n_pairs <- nrow(hyp)
    j_vals  <- numeric(n_pairs)
    d_vals  <- numeric(n_pairs)
    oc_vals <- numeric(n_pairs)
    fe_vals <- numeric(n_pairs)
    for (i in seq_len(n_pairs)) {
        a <- hyp$set_a[i]
        b <- hyp$set_b[i]
        j_vals[i]  <- stats@jaccard[a, b]
        d_vals[i]  <- stats@dice[a, b]
        oc_vals[i] <- stats@overlap_coefficient[a, b]
        fe_vals[i] <- stats@fold_enrichment[a, b]
    }

    out <- data.frame(
        set_a               = hyp$set_a,
        set_b               = hyp$set_b,
        intersection        = hyp$intersection,
        expected            = hyp$expected,
        jaccard             = j_vals,
        dice                = d_vals,
        overlap_coefficient = oc_vals,
        fold_enrichment     = fe_vals,
        p_value             = hyp$p_value,
        p_adjusted          = hyp$p_adjusted,
        significant         = hyp$significant,
        highly_significant  = hyp$highly_significant,
        stringsAsFactors    = FALSE
    )
    .as_tibble_safe(out)
}

#' Glance method for RegionResult (broom-compatible)
#'
#' Returns a 1-row tibble summarizing the analysis: number of sets, number of
#' non-empty regions, total unique items, hypergeometric universe size,
#' resolved model name, whether the layout is approximate (proportional
#' 3-set), and the count of statistically significant / highly significant
#' pairs (FDR-adjusted q < 0.05 / < 0.001).
#'
#' @param x A [`RegionResult-class`].
#' @param ... Unused (broom convention).
#' @return A 1-row tibble (or data.frame fallback) with columns: `n_sets`,
#'   `n_regions`, `n_items`, `universe_size`, `model`, `is_approximate`,
#'   `n_significant`, `n_highly_significant`.
#' @exportS3Method broom::glance
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' if (requireNamespace("broom", quietly = TRUE)) broom::glance(result)
#' \donttest{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' broom::glance(result)
#' }
glance.RegionResult <- function(x, ...) {
    stats <- statistics(x)
    hyp <- stats@hypergeometric
    n_sig  <- if (nrow(hyp) > 0L) sum(hyp$significant, na.rm = TRUE) else 0L
    n_hsig <- if (nrow(hyp) > 0L) sum(hyp$highly_significant, na.rm = TRUE) else 0L

    out <- data.frame(
        n_sets               = length(x@dataset@set_names),
        n_regions            = length(x@regions),
        n_items              = length(x@dataset@item_order),
        universe_size        = effective_universe(x),
        model                = x@model,
        is_approximate       = x@is_approximate,
        n_significant        = as.integer(n_sig),
        n_highly_significant = as.integer(n_hsig),
        stringsAsFactors     = FALSE
    )
    .as_tibble_safe(out)
}

#' Augment method for RegionResult (broom-compatible)
#'
#' Returns one row per item in the dataset's universe, with boolean columns
#' indicating set membership and a `region_label` column naming the exact
#' region (e.g. `"A"`, `"AB"`, `"ABC"`) the item belongs to. Item ordering
#' follows `dataset@item_order` (first-seen across all sets, JS Set/Map
#' semantics).
#'
#' Region labels use the package's positional letter convention (A-I),
#' matching the labels in `RegionResult@regions` and the bundled SVG models,
#' regardless of the dataset's `set_names`.
#'
#' @param x A [`RegionResult-class`].
#' @param ... Unused (broom convention).
#' @return A tibble (or data.frame fallback) with `nrow(out) == length(x@dataset@item_order)`
#'   and columns: `item` (character), one logical column per set (named after
#'   the set), `region_label` (character).
#' @exportS3Method broom::augment
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' if (requireNamespace("broom", quietly = TRUE)) broom::augment(result)
#' \donttest{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' broom::augment(result)
#' }
augment.RegionResult <- function(x, ...) {
    items <- x@dataset@item_order
    set_names <- x@dataset@set_names

    # Build the set-membership matrix in one pass: for each set, which items
    # are members? Then transpose so rows = items, cols = sets.
    mem_cols <- lapply(set_names, function(s) items %in% x@dataset@items[[s]])
    names(mem_cols) <- set_names

    # Region label per item: concatenate set letters whose membership is TRUE,
    # following the .LETTERS_VDL ordering used elsewhere in the package.
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_along(set_names)]
    membership_matrix <- do.call(cbind, mem_cols)   # nrow = length(items), ncol = length(set_names)
    region_labels <- apply(membership_matrix, 1, function(row) {
        paste(letters_chars[row], collapse = "")
    })

    out <- data.frame(
        item = items,
        stringsAsFactors = FALSE
    )
    for (s in set_names) out[[s]] <- mem_cols[[s]]
    out$region_label <- region_labels

    .as_tibble_safe(out)
}
