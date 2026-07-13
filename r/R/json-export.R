# Full Venn result + statistics JSON export. Mirrors the webapp's
# packages/core/src/jsonExport.ts (exportResultJson / formatJsonNumber) and
# python/src/venn_diagram_lab/_json_export.py + analysis.py::to_json_str
# BYTE-FOR-BYTE.
#
# The number-rendering rule and serializer layout are the cross-language
# contract; every number is emitted through .format_json_number (pure string
# manipulation on a fixed 6-decimal string) so R never falls back to
# scientific notation (which format()/as.character()/sprintf("%g") would do
# in the [1e-6, 1e-4) range, e.g. "8.3e-05"). The goldens contain such
# values (Bonferroni 0.000083, 0.000713), which must render as fixed decimals.

.JSON_DECIMALS <- 6L

#' @noRd
# Render a number exactly like the TS formatJsonNumber(v):
#   1. Integer-valued -> the integer string ("2", "0", "20000").
#   2. Otherwise s = .js_to_fixed(v, 6) (fixed 6-decimal string), strip trailing
#      zeros; if it then ends with ".", drop the "." ("0.500000" -> "0.5",
#      "2.000000" -> "2", "0.000083" -> "0.000083").
# Never emits scientific notation; never parses the string back to a numeric.
.format_json_number <- function(v) {
    if (is.na(v)) return("null")
    # Guard zero first: sprintf("%.0f", -0) yields "-0" in R, but JS String(-0)
    # and Python str(int(-0.0)) both yield "0" -> normalise to keep byte-parity.
    if (v == 0) return("0")
    if (v == round(v)) {
        # Integer-valued double -> plain integer string, no scientific notation.
        return(sprintf("%.0f", v))
    }
    s <- .js_to_fixed(v, .JSON_DECIMALS)
    if (grepl(".", s, fixed = TRUE)) {
        s <- sub("0+$", "", s)     # strip trailing zeros
        s <- sub("[.]$", "", s)    # drop a now-trailing decimal point
    }
    s
}

#' @noRd
# JSON string escaping matching JS JSON.stringify: escape backslash and double
# quote, plus the control characters with named/unicode escapes. `/` is NOT
# escaped; non-ASCII is kept literal (matches ensure_ascii=False / JS).
.json_str <- function(s) {
    s <- gsub("\\", "\\\\", s, fixed = TRUE)   # backslash FIRST
    s <- gsub("\"", "\\\"", s, fixed = TRUE)
    s <- gsub("\b", "\\b", s, fixed = TRUE)
    s <- gsub("\f", "\\f", s, fixed = TRUE)
    s <- gsub("\n", "\\n", s, fixed = TRUE)
    s <- gsub("\r", "\\r", s, fixed = TRUE)
    s <- gsub("\t", "\\t", s, fixed = TRUE)
    paste0("\"", s, "\"")
}

#' @noRd
# Deterministic serializer mirroring JSON.stringify(value, null, 2) byte layout,
# EXCEPT numbers go through .format_json_number. Representation contract:
#   * named list (all names non-empty)     -> JSON object (insertion order)
#   * unnamed list                         -> JSON array
#   * length-1 character                   -> JSON string
#   * numeric / integer scalar             -> number via .format_json_number
#   * logical scalar                       -> true / false
# Arrays of strings must be passed as unnamed lists (e.g. as.list(chr_vec)) so a
# single-element array renders as ["A"], not a bare "A".
.serialize <- function(value, indent = "") {
    if (is.list(value)) {
        nm <- names(value)
        is_object <- !is.null(nm) && length(value) > 0L && all(nzchar(nm))
        if (is_object) {
            inner <- paste0(indent, "  ")
            items <- vapply(seq_along(value), function(i) {
                paste0(inner, .json_str(nm[i]), ": ",
                       .serialize(value[[i]], inner))
            }, character(1L))
            return(paste0("{\n", paste(items, collapse = ",\n"), "\n", indent, "}"))
        }
        if (length(value) == 0L) return("[]")
        inner <- paste0(indent, "  ")
        items <- vapply(value, function(v) {
            paste0(inner, .serialize(v, inner))
        }, character(1L))
        return(paste0("[\n", paste(items, collapse = ",\n"), "\n", indent, "]"))
    }
    if (is.logical(value)) return(if (isTRUE(value)) "true" else "false")
    if (is.character(value)) return(.json_str(value))
    if (is.numeric(value)) return(.format_json_number(value))
    stop("Cannot serialize value of class ", class(value)[1L])
}

#' @noRd
# Build the `statistics` array (list of stat objects) for .result_json_string.
# Same per-pair computation and p-value-ascending ordering as
# to_statistics_tsv(), but emitted as JSON objects with the pinned key order.
.statistics_json <- function(result, letters_chars) {
    n <- length(result@dataset@set_names)
    if (n < .MIN_SETS_FOR_STATISTICS) return(list())

    universe <- effective_universe(result)
    stats_table <- statistics(result)@hypergeometric   # sorted by p_value asc

    out <- vector("list", nrow(stats_table))
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
        fdr <- as.numeric(row$p_adjusted)

        sig_label <- if (fdr < 0.001) "***"
                     else if (fdr < 0.01) "**"
                     else if (fdr < 0.05) "*"
                     else "ns"

        out[[i]] <- list(
            a              = a_letter,
            b              = b_letter,
            jaccard        = jaccard(size_a, size_b, inter),
            dice           = dice(size_a, size_b, inter),
            overlapCoeff   = overlap_coefficient(size_a, size_b, inter),
            intersection   = inter,
            union          = union_size,
            expected       = as.numeric(row$expected),
            foldEnrichment = fold_enrichment(universe, size_a, size_b, inter),
            pValue         = as.numeric(row$p_value),
            fdr            = fdr,
            bonferroni     = as.numeric(row$p_bonferroni),
            pTwoSided      = as.numeric(row$p_two_sided),
            significant    = sig_label
        )
    }
    out
}

#' @noRd
# Assemble the canonical JSON string for a RegionResult. Schema + key order are
# pinned to match exportResultJson / to_json_str byte-for-byte.
.result_json_string <- function(result) {
    n <- length(result@dataset@set_names)
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_len(n)]
    set_names <- result@dataset@set_names
    item_order <- result@dataset@item_order
    order_index <- setNames(seq_along(item_order), item_order)

    set_names_obj <- setNames(as.list(set_names), letters_chars)

    regions <- list()
    for (mask in 1L:(bitwShiftL(1L, n) - 1L)) {
        set_letters <- letters_chars[
            bitwAnd(mask, bitwShiftL(1L, 0L:(n - 1L))) != 0L]
        label <- paste(set_letters, collapse = "")
        depth <- length(set_letters)
        region <- result@regions[[as.character(mask)]]
        ex_items <- if (is.null(region)) character(0L) else region@exclusive_items
        in_count <- if (is.null(region)) 0L else length(region@inclusive_items)
        if (length(ex_items) > 0L) {
            ord <- order_index[ex_items]
            ord[is.na(ord)] <- length(item_order) + 1L
            ex_items <- ex_items[order(ord)]
        }
        regions[[length(regions) + 1L]] <- list(
            depth = depth,
            label = label,
            obj = list(
                label          = label,
                sets           = as.list(set_letters),
                depth          = depth,
                exclusiveCount = length(ex_items),
                inclusiveCount = in_count,
                exclusiveItems = as.list(ex_items)
            )
        )
    }
    # Sort by depth ascending, then label ascending (ASCII).
    depths <- vapply(regions, `[[`, integer(1L), "depth")
    labels <- vapply(regions, `[[`, character(1L), "label")
    regions <- regions[order(depths, labels, method = "radix")]
    regions_json <- lapply(regions, `[[`, "obj")

    set_sizes_obj <- setNames(
        as.list(as.integer(result@set_sizes[set_names])),
        letters_chars)

    obj <- list(
        schemaVersion = "1",
        model         = result@model,
        setNames      = set_names_obj,
        universeSize  = as.integer(effective_universe(result)),
        regions       = regions_json,
        setSizes      = set_sizes_obj,
        statistics    = .statistics_json(result, letters_chars)
    )
    .serialize(obj, "")
}

#' Write the full Venn result + statistics as canonical JSON
#'
#' Mirrors the React webapp's "Full Result (JSON)" export
#' (`exportResultJson`, `packages/core/src/jsonExport.ts`) and Python's
#' `RegionResult.to_json()` byte-for-byte.
#'
#' Schema (key order PINNED):
#' ```
#' {
#'   "schemaVersion": "1",
#'   "model": "<model id>",
#'   "setNames": { "A": "...", ... },
#'   "universeSize": <int>,
#'   "regions": [
#'     { "label", "sets": [...], "depth": <int>,
#'       "exclusiveCount": <int>, "inclusiveCount": <int>,
#'       "exclusiveItems": [...] }, ...
#'   ],
#'   "setSizes": { "A": <int>, ... },
#'   "statistics": [
#'     { "a", "b", "jaccard", "dice", "overlapCoeff",
#'       "intersection", "union", "expected", "foldEnrichment",
#'       "pValue", "fdr", "bonferroni", "pTwoSided",
#'       "significant": "***" | "**" | "*" | "ns" }, ...
#'   ]
#' }
#' ```
#'
#' `regions` covers all `2^n - 1` non-empty subsets, sorted by depth ascending
#' then label ascending (ASCII); `exclusiveItems` preserves the dataset item
#' order. `statistics` is sorted by p-value ascending, with `significant`
#' rendered as the FDR star label. Every number is emitted through a shared
#' number-rendering rule (fixed 6-decimal, trailing zeros stripped, never
#' scientific) so the bytes match the webapp and Python exports. No trailing
#' newline is written.
#'
#' @param result A [`RegionResult-class`].
#' @param path Destination file path.
#' @return Invisibly returns `path`.
#' @export
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' to_result_json(result, tempfile(fileext = ".json"))
#' \donttest{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' to_result_json(result, tempfile(fileext = ".json"))
#' }
setGeneric("to_result_json",
    function(result, path) standardGeneric("to_result_json"))

#' @rdname to_result_json
setMethod("to_result_json", "RegionResult", function(result, path) {
    .write_bytes(.result_json_string(result), path)
    invisible(path)
})
