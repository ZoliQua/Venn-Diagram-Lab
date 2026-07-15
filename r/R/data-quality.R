# Data-quality analysis (Feature 4). Pure, read-only companion to the
# loaders in io.R (.binary_columns_to_dataset / .aggregated_columns_to_dataset).
# Mirrors those functions' *actual* parsing/dedup behaviour so the reported
# counts describe what R's own loaders silently do, rather than TS/Python
# behaviour R doesn't have. See task-F4-r-report.md for the full semantics
# writeup and the documented divergences from TS/Python.

#' Analyze a parsed table for data-quality issues
#'
#' Read-only, pure companion to [`.binary_columns_to_dataset()`] /
#' [`.aggregated_columns_to_dataset()`]. Runs the *same* scanning rules those
#' loaders use internally (including their real dedup-via-`unique()` and
#' blank-identifier-row skipping) and reports what would be silently
#' collapsed or skipped, instead of collapsing/skipping it. It never mutates
#' `headers`/`rows`, never lower-cases an item before recording it, and never
#' calls into `VennDataset` construction -- a purely descriptive pass.
#'
#' ## Mirroring R's real loader behaviour (not TS/Python byte-parity)
#'
#' * **Aggregated mode**: like [`.aggregated_columns_to_dataset()`], a whole
#'   trimmed cell is treated as *one* item -- there is no delimiter-splitting
#'   in R's real loader, so none happens here either.
#' * **Binary mode**: like [`.binary_columns_to_dataset()`], only column 1 is
#'   read as the item identifier (any extra `prefix_cols` beyond the first
#'   are metadata the loader itself never reads). Rows whose identifier is
#'   blank after trimming are skipped **entirely** -- not scored for
#'   duplicates, case collisions, or empty cells -- exactly mirroring
#'   `valid_idx` in `.binary_columns_to_dataset()`. Duplicates are scored
#'   **per set column** (mirroring the loader's own `unique()` applied
#'   independently to each set's truthy identifiers), not as one flat
#'   id-column entry -- R has no "row contributes if any column is truthy"
#'   concept the way the TS array-based loader does, so unlike TS/Python,
#'   ALL non-blank-id rows count toward case-collision scope regardless of
#'   whether any of their set cells are truthy (this matches
#'   `item_order_seen <- unique(item_ids[valid_idx])`, which is computed
#'   before/independent of the truthy test).
#'
#' @param headers Character vector of column headers (as returned by
#'   `.parse_table()$headers`).
#' @param rows List of character vectors, one per data row (as returned by
#'   `.parse_table()$rows`).
#' @param mode `"binary"` (default) or `"aggregated"`.
#' @param prefix_cols Number of leading metadata columns in binary mode
#'   (default 1). Only column 1 is ever read as the item identifier,
#'   matching `.binary_columns_to_dataset()`. Ignored when
#'   `mode = "aggregated"`.
#' @return A list with:
#'   * `duplicates_removed` -- list of `list(column, column_name, count,
#'     examples)` entries, one per column that has duplicates (columns
#'     without duplicates are omitted). `column` is the 1-based index into
#'     `headers`. `examples` holds up to 5 item strings, each captured at
#'     its 2nd occurrence, in encounter order.
#'   * `empty_cells_skipped` -- single integer count of blank cells found
#'     while scanning (scope depends on mode; see divergences above).
#'   * `case_collisions` -- list of `list(items = character())` entries,
#'     each holding 2+ distinct case-sensitive spellings that share a
#'     lower-cased form, in first-appearance order. Purely descriptive:
#'     item identity is never folded or merged anywhere in this function.
#'   * `has_warnings` -- `TRUE` if any of the above found something.
#' @export
#' @examples
#' headers <- c("Gene", "SetA", "SetB")
#' rows <- list(c("g1", "1", "0"), c("g1", "1", "1"), c("", "1", "0"))
#' report <- analyze_data_quality(headers, rows, mode = "binary")
#' report$has_warnings
analyze_data_quality <- function(headers, rows, mode = c("binary", "aggregated"),
                                  prefix_cols = 1L) {
    mode <- match.arg(mode)
    if (mode == "binary") {
        .analyze_quality_binary(headers, rows, prefix_cols = as.integer(prefix_cols))
    } else {
        .analyze_quality_aggregated(headers, rows)
    }
}

#' @noRd
.new_quality_report <- function(duplicates_removed = list(), empty_cells_skipped = 0L,
                                 case_collisions = list()) {
    list(
        duplicates_removed = duplicates_removed,
        empty_cells_skipped = as.integer(empty_cells_skipped),
        case_collisions = case_collisions,
        has_warnings = length(duplicates_removed) > 0L ||
            empty_cells_skipped > 0L ||
            length(case_collisions) > 0L
    )
}

#' Group case-insensitive duplicate identities, first-appearance order
#'
#' `items_in_order` must already be in the natural scan order (row-major)
#' from which candidate identities were first encountered. Groups are
#' emitted in the order their first-seen spelling appeared; each group's
#' `items` preserve original case and first-appearance order within the
#' group. Exact-duplicate spellings (identical case, seen more than once)
#' do not add a second entry to the group.
#' @noRd
.case_collision_groups <- function(items_in_order) {
    if (length(items_in_order) == 0L) return(list())
    lower <- tolower(items_in_order)
    seen_keys <- character()
    group_items <- list()   # key -> character vector, first-appearance order
    for (i in seq_along(items_in_order)) {
        key <- lower[i]
        val <- items_in_order[i]
        if (!(key %in% seen_keys)) {
            seen_keys <- c(seen_keys, key)
            group_items[[key]] <- val
        } else if (!(val %in% group_items[[key]])) {
            group_items[[key]] <- c(group_items[[key]], val)
        }
    }
    out <- list()
    for (key in seen_keys) {
        vals <- group_items[[key]]
        if (length(vals) >= 2L) out[[length(out) + 1L]] <- list(items = vals)
    }
    out
}

#' Duplicate-occurrence scoring within one column's item stream
#'
#' `items_in_order` = the (already-filtered-to-relevant-rows) sequence of
#' item strings for one column, in row order, case-sensitive, exact match.
#' Returns `list(count, examples)`; `count = 0` means no duplicates (caller
#' should omit the column's entry entirely in that case).
#' @noRd
.duplicate_scan <- function(items_in_order) {
    if (length(items_in_order) == 0L) return(list(count = 0L, examples = character()))
    occurrences <- table(items_in_order)
    dup_items <- names(occurrences)[occurrences > 1L]
    if (length(dup_items) == 0L) return(list(count = 0L, examples = character()))
    count <- sum(occurrences[dup_items] - 1L)

    examples <- character()
    seen_once <- character()
    for (val in items_in_order) {
        if (length(examples) >= 5L) break
        if (val %in% dup_items) {
            if (val %in% seen_once) {
                if (!(val %in% examples)) examples <- c(examples, val)
            } else {
                seen_once <- c(seen_once, val)
            }
        }
    }
    list(count = as.integer(count), examples = examples)
}

#' @noRd
.analyze_quality_aggregated <- function(headers, rows) {
    n_sets <- length(headers)
    mat <- .rows_to_matrix(rows, n_sets)
    mat[] <- trimws(mat)

    empty_cells_skipped <- sum(!nzchar(mat))

    duplicates_removed <- list()
    for (j in seq_len(n_sets)) {
        col <- mat[, j]
        col <- col[nzchar(col)]
        scan <- .duplicate_scan(col)
        if (scan$count > 0L) {
            col_name <- if (j <= length(headers) && nzchar(headers[j])) headers[j] else sprintf("Column %d", j)
            duplicates_removed[[length(duplicates_removed) + 1L]] <- list(
                column = j,
                column_name = col_name,
                count = scan$count,
                examples = scan$examples
            )
        }
    }

    # Case-collision candidates: union across all columns, row-major
    # (row-outer, column-inner) order -- matches item_order/"seen" in
    # .aggregated_columns_to_dataset().
    row_major <- as.vector(t(mat))
    row_major <- row_major[nzchar(row_major)]
    case_collisions <- .case_collision_groups(unique(row_major))

    .new_quality_report(duplicates_removed, empty_cells_skipped, case_collisions)
}

#' @noRd
.analyze_quality_binary <- function(headers, rows, prefix_cols = 1L) {
    n_cols <- length(headers)
    if (n_cols <= prefix_cols) {
        return(.new_quality_report())
    }
    set_names <- headers[(prefix_cols + 1L):n_cols]
    n_sets <- length(set_names)

    mat <- .rows_to_matrix(rows, n_cols)
    item_ids <- trimws(mat[, 1L])
    valid_idx <- which(nzchar(item_ids))
    valid_ids <- item_ids[valid_idx]

    set_cells <- mat[, (prefix_cols + 1L):n_cols, drop = FALSE]
    vcells <- set_cells[valid_idx, , drop = FALSE]   # valid rows x sets, raw (untrimmed) strings
    vcells_trimmed <- trimws(vcells)                 # trimws()/tolower() preserve matrix dims

    empty_cells_skipped <- sum(!nzchar(vcells_trimmed))

    lc <- tolower(vcells_trimmed)
    truthy_mat <- matrix(lc %in% .TRUTHY, nrow = length(valid_idx), ncol = n_sets)

    duplicates_removed <- list()
    for (j in seq_len(n_sets)) {
        col_ids <- valid_ids[truthy_mat[, j]]
        scan <- .duplicate_scan(col_ids)
        if (scan$count > 0L) {
            col_index <- prefix_cols + j
            col_name <- if (nzchar(set_names[j])) set_names[j] else sprintf("Column %d", col_index)
            duplicates_removed[[length(duplicates_removed) + 1L]] <- list(
                column = col_index,
                column_name = col_name,
                count = scan$count,
                examples = scan$examples
            )
        }
    }

    # Case-collision candidates: every distinct non-blank identifier among
    # valid-id rows, regardless of whether it's truthy on any set column --
    # matches item_order_seen <- unique(item_ids[valid_idx]) in
    # .binary_columns_to_dataset(), which is computed unconditionally.
    case_collisions <- .case_collision_groups(unique(valid_ids))

    .new_quality_report(duplicates_removed, empty_cells_skipped, case_collisions)
}

#' Load a CSV/TSV file and report data-quality issues, with an opt-in warning
#'
#' Convenience wrapper around [`analyze_data_quality()`] that reads and
#' parses a file the same way [`load_csv()`] does (auto-detecting the
#' delimiter unless overridden), **without** building a `VennDataset`. This
#' is the opt-in surface for data-quality feedback: [`load_csv()`] /
#' [`load_tsv()`] themselves never emit warnings and are unchanged by this
#' function's existence.
#'
#' @inheritParams analyze_data_quality
#' @param path Path to the file.
#' @param delimiter Explicit delimiter override. `NULL` auto-detects, same
#'   as [`load_csv()`].
#' @param warn If `TRUE` (default) and the report has any findings, emits a
#'   single `warning()` summarizing the counts. Set `FALSE` to only get the
#'   returned report silently.
#' @return The `analyze_data_quality()` report list, returned in addition to
#'   (not instead of) any `warning()` raised.
#' @export
#' @examples
#' tmp <- tempfile(fileext = ".csv")
#' writeLines(c("Gene,SetA,SetB", "G1,1,0", "G1,1,1", "G2,0,1"), tmp)
#' report <- validate_dataset(tmp, mode = "binary")
#' report$has_warnings
validate_dataset <- function(path, mode = c("binary", "aggregated"),
                              delimiter = NULL, prefix_cols = 1L, warn = TRUE) {
    mode <- match.arg(mode)
    txt_src <- .read_text(path)
    delim <- if (is.null(delimiter)) .detect_delimiter(txt_src$text) else delimiter
    parsed <- .parse_table(txt_src$text, delim)
    report <- analyze_data_quality(parsed$headers, parsed$rows, mode = mode,
                                    prefix_cols = as.integer(prefix_cols))

    if (isTRUE(warn) && report$has_warnings) {
        parts <- character()
        if (length(report$duplicates_removed) > 0L) {
            dup_total <- sum(vapply(report$duplicates_removed, function(d) d$count, integer(1L)))
            parts <- c(parts, sprintf("%d duplicate item occurrence(s) across %d column(s)",
                                       dup_total, length(report$duplicates_removed)))
        }
        if (report$empty_cells_skipped > 0L) {
            parts <- c(parts, sprintf("%d empty cell(s)", report$empty_cells_skipped))
        }
        if (length(report$case_collisions) > 0L) {
            parts <- c(parts, sprintf("%d case-collision group(s)", length(report$case_collisions)))
        }
        warning(sprintf("Data quality: %s (in '%s')", paste(parts, collapse = "; "), path),
                call. = FALSE)
    }

    report
}
