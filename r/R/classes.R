#' StatisticsResult: container for pairwise statistical metric tables
#'
#' Returned by [compute_pairwise()] and (lazily) by `statistics()` on a
#' `RegionResult`. Holds five tables:
#'
#' @slot jaccard NxN named matrix of Jaccard indices.
#' @slot dice NxN named matrix of Sorensen-Dice coefficients.
#' @slot overlap_coefficient NxN named matrix of Szymkiewicz-Simpson overlap coefficients.
#' @slot fold_enrichment NxN named matrix of fold-enrichment values.
#' @slot hypergeometric Long-form data.frame (one row per set pair) with columns:
#'   set_a, set_b, intersection, expected, p_value, p_adjusted, significant,
#'   highly_significant.
#' @export
#' @rdname StatisticsResult-class
setClass("StatisticsResult",
    representation(
        jaccard             = "matrix",
        dice                = "matrix",
        overlap_coefficient = "matrix",
        fold_enrichment     = "matrix",
        hypergeometric      = "data.frame"
    )
)

#' VennDataset: in-memory representation of a Venn-diagram input
#'
#' Returned by the `load_*()` family and consumed by [analyze()]. Holds the
#' deduplicated set members, first-seen item ordering for byte-equivalent TSV
#' output, and source metadata (path, format, optional hypergeometric universe
#' size).
#'
#' @slot set_names Ordered character vector of set identifiers (length 2-9).
#' @slot items Named list (`names(items) == set_names`) of character vectors,
#'   each containing the deduplicated members of the corresponding set.
#' @slot item_order First-seen insertion order of all items across all sets,
#'   matching JS Set/Map semantics. Used by TSV writers (Phase 2) for
#'   byte-equivalent output to the web tool.
#' @slot universe_size Hypergeometric universe N (population size) from the
#'   source file, when known. Binary CSV/TSV loaders set this to the row count
#'   (matching the web tool's `csv.rows.length`); other formats leave it
#'   `NULL`, signaling "compute as length(item_order)" downstream.
#' @slot source_path Original file path if loaded from disk; `NULL` for
#'   in-memory datasets.
#' @slot format Source format: one of `"csv"`, `"tsv"`, `"gmt"`, `"gmx"`.
#' @export
#' @rdname VennDataset-class
setClass("VennDataset",
    representation(
        set_names     = "character",
        items         = "list",
        item_order    = "character",
        universe_size = "ANY",
        source_path   = "ANY",
        format        = "character"
    ),
    validity = function(object) {
        n <- length(object@set_names)
        if (n < 2L || n > 9L)
            return("set_names must have between 2 and 9 entries")
        if (!setequal(names(object@items), object@set_names))
            return("items names must match set_names")
        if (!object@format %in% c("csv", "tsv", "gmt", "gmx"))
            return("format must be one of csv/tsv/gmt/gmx")
        if (!is.null(object@universe_size) && !is.integer(object@universe_size))
            return("universe_size must be integer or NULL")
        TRUE
    }
)

#' RegionData: one region of a Venn diagram
#'
#' Returned as elements of `RegionResult@regions`. Bitmask convention: bit `i`
#' set means "in set with index `i`" in `dataset@set_names`.
#'
#' @slot bitmask Region bitmask (1 to 2^n - 1).
#' @slot label Human-readable label like `"AB"` or `"ABC"`.
#' @slot set_indices Integer vector of 0-based set indices in this region.
#' @slot set_names Names of the sets in this region.
#' @slot exclusive_items Items present in exactly these sets.
#' @slot inclusive_items Items present in at least these sets.
#' @export
#' @rdname RegionData-class
setClass("RegionData",
    representation(
        bitmask          = "integer",
        label            = "character",
        set_indices      = "integer",
        set_names        = "character",
        exclusive_items  = "character",
        inclusive_items  = "character"
    )
)

#' SvgImage: wrapper for rendered SVG output
#'
#' Returned by [render_share_distribution()] and [render_cluster_heatmap()].
#' Mirrors the Python `SvgImage` dataclass so cross-package parity tests can
#' use a uniform attribute name (`content`). Note that
#' [render_venn_svg()] still returns a plain `character` for backward
#' compatibility with the v2.0.x public API; the new plot renderers return
#' `SvgImage` so callers can introspect explicit `width` / `height` extents.
#'
#' @slot content The SVG document as a string.
#' @slot width Pixel width of the rendered SVG.
#' @slot height Pixel height of the rendered SVG.
#' @export
#' @rdname SvgImage-class
setClass("SvgImage",
    representation(
        content = "character",
        width   = "integer",
        height  = "integer"
    )
)

#' RegionResult: result of analyze()
#'
#' Bundles the input dataset, chosen model, region map, set sizes, and a
#' lazy [`StatisticsResult-class`] accessible via `statistics(result)`.
#'
#' @slot dataset The input [`VennDataset-class`].
#' @slot model Resolved model name (e.g. `"venn-4-set"` or `"proportional"`).
#' @slot regions Named list keyed by `as.character(bitmask)`, each value a
#'   [`RegionData-class`]. Only non-empty regions are stored (sparse for
#'   high set counts with few overlaps).
#' @slot set_sizes Named integer vector: set name -> inclusive size.
#' @slot is_approximate `TRUE` for the proportional 3-set layout where exact
#'   areas can't be achieved with circles.
#' @export
#' @rdname RegionResult-class
setClass("RegionResult",
    representation(
        dataset        = "VennDataset",
        model          = "character",
        regions        = "list",
        set_sizes      = "integer",
        is_approximate = "logical"
    )
)
