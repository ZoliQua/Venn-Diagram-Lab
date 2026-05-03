# TSV export helpers + 3 writer methods. Mirror Python's
# python/src/venn_diagram_lab/_tsv_escape.py and the 3 to_*_tsv methods on
# RegionResult in python/src/venn_diagram_lab/analysis.py byte-for-byte.
#
# Helpers are private (leading dot, @noRd). The three writer methods are
# exported as S4 generics + methods on RegionResult.

.FORMULA_PREFIX_RE <- "^[\t\r ]*[=+@-]"

#' @noRd
.escape_spreadsheet_cell <- function(value) {
    if (grepl(.FORMULA_PREFIX_RE, value, perl = FALSE)) {
        paste0("'", value)
    } else {
        value
    }
}

#' @noRd
# JS Number.prototype.toFixed(d): half-up rounding on the EXACT IEEE 754
# binary value. Python uses Decimal.quantize(..., ROUND_HALF_UP); R has no
# direct equivalent, so we use a two-step approach:
#
# 1. sprintf("%.{digits}f") replicates C printf rounding which operates on the
#    raw IEEE 754 double — e.g. 2.795 is stored as 2.7949999... so
#    sprintf("%.2f", 2.795) = "2.79", matching JS toFixed(2).
#
# 2. C printf uses banker rounding (half-to-even) for exact halves, but JS
#    rounds half-up. We detect exact halves via a 20-digit representation and
#    apply floor(x * scale + 0.5) / scale for those cases only.
#
# Only non-negative values are passed (counts, p-values, Jaccard, etc.).
.js_to_fixed <- function(value, digits) {
    if (is.nan(value)) return("NaN")

    # Step 1: let C printf handle IEEE 754 near-halves correctly.
    result <- sprintf(paste0("%.", digits, "f"), value)

    # Step 2: detect exact halves where banker rounding differs from JS half-up.
    high_prec <- sprintf("%.20f", value)
    dp <- regexpr("[.]", high_prec)
    if (dp > 0) {
        frac_part <- substring(high_prec, dp + 1)
        if (nchar(frac_part) >= digits + 1) {
            digit_at_half <- substring(frac_part, digits + 1, digits + 1)
            rest          <- substring(frac_part, digits + 2)
            is_exact_half <- (digit_at_half == "5") && (gsub("0", "", rest) == "")
            if (is_exact_half) {
                scale   <- 10 ^ digits
                rounded <- floor(value * scale + 0.5) / scale
                result  <- formatC(rounded, format = "f", digits = digits)
            }
        }
    }
    result
}

#' Write the Region Summary TSV
#'
#' Mirrors the React webapp's "Export Region Summary" button + Python's
#' `RegionResult.to_region_summary_tsv()` byte-for-byte.
#'
#' Columns: Region, Sets, Depth, Exclusive_Count, Inclusive_Count, Exclusive_Pct, Items.
#' Rows: every region (1..2^n - 1). Sorted by (Depth ASC, Region label ASC).
#' Items: semicolon-joined, ordered by `dataset@item_order`.
#' Cells starting with `=`/`+`/`-`/`@` (after optional leading whitespace) are
#' escape-prefixed with a single quote.
#'
#' @param result A [`RegionResult-class`].
#' @param path Destination file path.
#' @return Invisibly returns `path`.
#' @export
#' @examples
#' \dontrun{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' to_region_summary_tsv(result, "region_summary.tsv")
#' }
setGeneric("to_region_summary_tsv",
    function(result, path) standardGeneric("to_region_summary_tsv"))

#' @rdname to_region_summary_tsv
setMethod("to_region_summary_tsv", "RegionResult", function(result, path) {
    n <- length(result@dataset@set_names)
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_len(n)]
    names_by_letter <- setNames(result@dataset@set_names, letters_chars)
    item_order <- result@dataset@item_order
    order_index <- setNames(seq_along(item_order), item_order)
    total <- effective_universe(result)

    intersect_glue <- " \u2229 "   # SET INTERSECTION (Unicode escape keeps source pure ASCII)
    rows <- vector("list", bitwShiftL(1L, n) - 1L)
    for (mask in 1L:(bitwShiftL(1L, n) - 1L)) {
        label <- .label_for_bitmask(mask)
        depth <- sum(bitwAnd(mask, bitwShiftL(1L, 0L:(n - 1L))) != 0L)
        region <- result@regions[[as.character(mask)]]
        ex_count <- if (is.null(region)) 0L else length(region@exclusive_items)
        in_count <- if (is.null(region)) 0L else length(region@inclusive_items)
        pct <- if (total > 0) .js_to_fixed(ex_count / total * 100, 2) else "0.00"
        label_chars <- strsplit(label, "", fixed = TRUE)[[1L]]
        sets_col <- paste(
            vapply(label_chars,
                   function(c) .escape_spreadsheet_cell(names_by_letter[[c]]),
                   character(1L)),
            collapse = intersect_glue
        )
        items <- if (is.null(region)) character(0L) else region@exclusive_items
        if (length(items) > 0L) {
            ord <- order_index[items]
            ord[is.na(ord)] <- length(item_order) + 1L
            items <- items[order(ord)]
        }
        items_col <- paste(vapply(items, .escape_spreadsheet_cell, character(1L)),
                           collapse = ";")
        line <- paste(label, sets_col, as.character(depth),
                      as.character(ex_count), as.character(in_count),
                      pct, items_col, sep = "\t")
        rows[[mask]] <- list(depth = depth, label = label, line = line)
    }

    sort_key_depth <- vapply(rows, `[[`, integer(1L), "depth")
    sort_key_label <- vapply(rows, `[[`, character(1L), "label")
    ord <- order(sort_key_depth, sort_key_label)
    rows <- rows[ord]

    header <- "Region\tSets\tDepth\tExclusive_Count\tInclusive_Count\tExclusive_Pct\tItems"
    body <- vapply(rows, `[[`, character(1L), "line")
    out <- paste(c(header, body), collapse = "\n")
    cat(out, file = path)   # cat() does NOT add a trailing newline (matches Python's write_text)
    invisible(path)
})

#' Write the Item Matrix TSV
#'
#' Mirrors the React webapp's "Export Matrix" button + Python's
#' `RegionResult.to_matrix_tsv()` byte-for-byte.
#'
#' Columns: Item, <SetName1>, <SetName2>, ..., Region.
#' Rows: one per item. Iteration order: mask 1..(2^n - 1); within each mask,
#' items in `dataset@item_order`.
#'
#' @param result A [`RegionResult-class`].
#' @param path Destination file path.
#' @return Invisibly returns `path`.
#' @export
#' @examples
#' \dontrun{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' to_matrix_tsv(result, "matrix.tsv")
#' }
setGeneric("to_matrix_tsv",
    function(result, path) standardGeneric("to_matrix_tsv"))

#' @rdname to_matrix_tsv
setMethod("to_matrix_tsv", "RegionResult", function(result, path) {
    n <- length(result@dataset@set_names)
    item_order <- result@dataset@item_order
    order_index <- setNames(seq_along(item_order), item_order)

    header_cols <- c(
        "Item",
        vapply(result@dataset@set_names, .escape_spreadsheet_cell, character(1L)),
        "Region"
    )
    out_lines <- character()
    out_lines[1L] <- paste(header_cols, collapse = "\t")

    for (mask in 1L:(bitwShiftL(1L, n) - 1L)) {
        region <- result@regions[[as.character(mask)]]
        if (is.null(region) || length(region@exclusive_items) == 0L) next
        label <- .label_for_bitmask(mask)
        membership <- vapply(seq_len(n), function(i) {
            if (bitwAnd(mask, bitwShiftL(1L, i - 1L)) != 0L) "1" else "0"
        }, character(1L))
        items <- region@exclusive_items
        ord <- order_index[items]
        ord[is.na(ord)] <- length(item_order) + 1L
        items <- items[order(ord)]
        for (item in items) {
            row <- c(.escape_spreadsheet_cell(item), membership, label)
            out_lines <- c(out_lines, paste(row, collapse = "\t"))
        }
    }

    out <- paste(out_lines, collapse = "\n")
    cat(out, file = path)
    invisible(path)
})

#' Write the pairwise Statistics TSV
#'
#' Mirrors the React webapp's DataSummaryPanel "Export Statistics" button +
#' Python's `RegionResult.to_statistics_tsv()` byte-for-byte.
#'
#' Columns: Set_A, Set_B, Name_A, Name_B, Size_A, Size_B, Intersection, Union,
#' Jaccard, Overlap_Coeff, Dice, Expected, Fold_Enrichment, P_value, FDR, Significant.
#' Float formatting:
#' * Jaccard / Overlap_Coeff / Dice: 4 decimals via [.js_to_fixed()]
#' * Expected: 2 decimals
#' * Fold_Enrichment: 3 decimals
#' * P_value / FDR: scientific (JS toExponential(2)) if `< 0.001`, else 6 decimals
#' * Significant: one of `"***"`, `"**"`, `"*"`, `"ns"` keyed off FDR thresholds
#'   (0.001, 0.01, 0.05).
#'
#' Rows are sorted by P_value ascending (matches the underlying StatisticsResult).
#'
#' @param result A [`RegionResult-class`].
#' @param path Destination file path.
#' @return Invisibly returns `path`.
#' @export
#' @examples
#' \dontrun{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' to_statistics_tsv(result, "statistics.tsv")
#' }
setGeneric("to_statistics_tsv",
    function(result, path) standardGeneric("to_statistics_tsv"))

#' @rdname to_statistics_tsv
setMethod("to_statistics_tsv", "RegionResult", function(result, path) {
    stats_header <- paste(c(
        "Set_A", "Set_B", "Name_A", "Name_B", "Size_A", "Size_B",
        "Intersection", "Union", "Jaccard", "Overlap_Coeff", "Dice",
        "Expected", "Fold_Enrichment", "P_value", "FDR", "Significant"
    ), collapse = "\t")

    n <- length(result@dataset@set_names)
    if (n < .MIN_SETS_FOR_STATISTICS) {
        cat(stats_header, file = path)
        return(invisible(path))
    }

    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_len(n)]
    universe <- effective_universe(result)
    stats_table <- statistics(result)@hypergeometric   # sorted by p_value asc

    fmt_p <- function(x) {
        if (x < 0.001) .js_to_exponential_2(x) else .js_to_fixed(x, 6)
    }

    out_lines <- character()
    out_lines[1L] <- stats_header

    for (i in seq_len(nrow(stats_table))) {
        row <- stats_table[i, , drop = FALSE]
        a_name <- row$set_a
        b_name <- row$set_b
        a_letter <- letters_chars[match(a_name, result@dataset@set_names)]
        b_letter <- letters_chars[match(b_name, result@dataset@set_names)]
        size_a <- result@set_sizes[[a_name]]
        size_b <- result@set_sizes[[b_name]]
        inter <- as.integer(row$intersection)
        union_size <- size_a + size_b - inter
        jac <- jaccard(size_a, size_b, inter)
        oc <- overlap_coefficient(size_a, size_b, inter)
        dic <- dice(size_a, size_b, inter)
        expected <- as.numeric(row$expected)
        fe <- fold_enrichment(universe, size_a, size_b, inter)
        p_val <- as.numeric(row$p_value)
        fdr <- as.numeric(row$p_adjusted)

        sig_label <- if (fdr < 0.001) "***"
                     else if (fdr < 0.01) "**"
                     else if (fdr < 0.05) "*"
                     else "ns"

        out_lines <- c(out_lines, paste(
            a_letter, b_letter, a_name, b_name,
            as.character(size_a), as.character(size_b),
            as.character(inter), as.character(union_size),
            .js_to_fixed(jac, 4), .js_to_fixed(oc, 4), .js_to_fixed(dic, 4),
            .js_to_fixed(expected, 2), .js_to_fixed(fe, 3),
            fmt_p(p_val), fmt_p(fdr), sig_label,
            sep = "\t"
        ))
    }

    out <- paste(out_lines, collapse = "\n")
    cat(out, file = path)
    invisible(path)
})

#' @noRd
# JS Number.prototype.toExponential(2). Differences from R formatC:
# * R: "1.23e-05" (zero-padded 2-digit exponent)
# * JS: "1.23e-5"
# Mantissa rounding follows JS half-up (uses .js_to_fixed internally).
.js_to_exponential_2 <- function(value) {
    if (is.nan(value)) return("NaN")
    if (value == 0) return("0.00e+0")
    sign <- if (value < 0) "-" else ""
    abs_val <- abs(value)
    exp <- floor(log10(abs_val))
    mantissa_value <- abs_val / 10 ^ exp
    mantissa_str <- .js_to_fixed(mantissa_value, 2)
    # Mantissa overflow: 9.999 -> "10.00" -> renormalise to "1.00" + exp+1
    if (mantissa_str == "10.00") {
        mantissa_str <- "1.00"
        exp <- exp + 1
    }
    sign_exp <- if (exp >= 0) "+" else "-"
    sprintf("%s%se%s%d", sign, mantissa_str, sign_exp, abs(exp))
}
