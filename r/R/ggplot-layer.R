# ggplot2 layer for embedding a rendered Venn diagram in a ggplot.
# Mirrors the rasterization pipeline in r/R/render-pdf.R:192-197 --
# render_venn_svg() -> rsvg::rsvg_nativeraster() -> grid::rasterGrob().
#
# All helpers private (leading dot, @noRd). Single public entry point:
# geom_venn (Phase 6).

#' @importFrom ggplot2 annotation_custom coord_fixed
#' @importFrom methods is
NULL

.GEOM_VENN_DEFAULT_WIDTH <- 800L

#' @noRd
# Convert a RegionResult to a grid::rasterGrob via the existing SVG pipeline.
.venn_to_grob <- function(result, width_px = .GEOM_VENN_DEFAULT_WIDTH) {
    svg <- render_venn_svg(result)
    raster <- rsvg::rsvg_nativeraster(charToRaw(svg), width = as.integer(width_px))
    grid::rasterGrob(raster, interpolate = TRUE,
                     width = grid::unit(1, "npc"),
                     height = grid::unit(1, "npc"))
}

#' Embed a rendered Venn diagram as a ggplot2 layer
#'
#' Returns a list of ggplot2 layers that draw `data` (a [`RegionResult-class`])
#' as a rasterized Venn diagram on a unit-square coordinate system, ready to
#' compose with other ggplot2 elements (titles, themes, additional
#' annotations).
#'
#' This is a NEW capability -- the Python package has no equivalent. It uses
#' the same rasterization pipeline as [to_pdf_report()]: render the SVG via
#' [render_venn_svg()], rasterize via `rsvg::rsvg_nativeraster()`, and wrap
#' as a `grid::rasterGrob()` inside `ggplot2::annotation_custom()`.
#'
#' @param mapping Accepted for ggplot2 layer-signature consistency. Currently
#'   ignored (the Venn diagram is rendered from `data`, not from aesthetic
#'   mappings). Reserved for a future Stat-based extension.
#' @param data A [`RegionResult-class`] (required). The Venn diagram to embed.
#' @param stat Accepted for signature consistency; currently ignored.
#' @param position Accepted for signature consistency; currently ignored.
#' @param width_px Raster width in pixels (default 800). Larger values give
#'   sharper output at the cost of memory.
#' @param ... Forwarded to `ggplot2::annotation_custom()` (e.g. `xmin`,
#'   `xmax`, `ymin`, `ymax` to position the venn on a non-unit coordinate
#'   system).
#' @return A list of ggplot2 layers: an `annotation_custom` carrying the
#'   rasterized Venn, a `geom_blank` establishing `[0, 1] x [0, 1]` limits,
#'   and a `coord_fixed(ratio = 1)` so the diagram remains square. Note that
#'   `coord_fixed` will override any coordinate system the user has already
#'   added; add `geom_venn()` before other coord layers to avoid a warning.
#' @export
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' if (getRversion() >= "4.6") {
#'   p <- ggplot2::ggplot() + geom_venn(data = result) + ggplot2::theme_void()
#'   inherits(p, "ggplot")
#' }
#' \donttest{
#' if (getRversion() >= "4.6") {
#'   result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#'   library(ggplot2)
#'   ggplot() +
#'       geom_venn(data = result) +
#'       theme_void() +
#'       ggtitle("Cancer driver overlap (4 sources)")
#' }
#' }
geom_venn <- function(mapping = NULL,
                      data = NULL,
                      stat = "identity",
                      position = "identity",
                      ...,
                      width_px = .GEOM_VENN_DEFAULT_WIDTH) {
    if (is.null(data) || !methods::is(data, "RegionResult")) {
        stop("geom_venn() requires `data` to be a RegionResult ",
             "(from analyze()). Got: ",
             if (is.null(data)) "NULL" else class(data)[[1L]],
             call. = FALSE)
    }

    grob <- .venn_to_grob(data, width_px = width_px)

    # Build annotation_custom call with defaults, allowing ... to override xmin/xmax/ymin/ymax.
    # We use do.call + dedup-by-name (keep last) instead of `annotation_custom(..., ...)`
    # so that a user-supplied xmin in ... wins over our default without triggering R's
    # "formal argument matched by multiple actual arguments" error.
    ann_args <- list(grob = grob, xmin = 0, xmax = 1, ymin = 0, ymax = 1)
    ann_args <- c(ann_args, list(...))
    ann_args <- ann_args[!duplicated(names(ann_args), fromLast = TRUE)]

    list(
        do.call(ggplot2::annotation_custom, ann_args),
        ggplot2::geom_blank(
            data = data.frame(.x = c(0, 1), .y = c(0, 1)),
            mapping = ggplot2::aes(x = .data$.x, y = .data$.y),
            inherit.aes = FALSE
        ),
        ggplot2::coord_fixed(ratio = 1)
    )
}
