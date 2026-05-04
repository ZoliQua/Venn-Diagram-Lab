# UpSet plot rendering via ComplexUpset (ggplot2-based). Data shaping mirrors
# python/src/venn_diagram_lab/render/upset.py; rendering uses ComplexUpset
# instead of matplotlib (idiomatic R; not a 1:1 port).
#
# All helpers private (leading dot, @noRd). Single public entry point:
# render_upset (Task A3).

#' @importFrom ggplot2 ggplot scale_fill_manual aes .data
#' @importFrom ComplexUpset upset upset_default_themes intersection_size
NULL

#' @noRd
.upset_data_from_region_result <- function(result) {
    n <- length(result@dataset@set_names)
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_len(n)]
    intersections <- list()
    for (region in result@regions) {
        size <- length(region@exclusive_items)
        if (size == 0L) next
        members <- letters_chars[region@set_indices + 1L]
        intersections <- c(intersections, list(
            list(members = members, size = as.integer(size), label = region@label)
        ))
    }
    list(sets = letters_chars, intersections = intersections)
}

#' @noRd
.sort_by_size <- function(data) {
    sizes <- vapply(data$intersections, function(x) x$size, integer(1L))
    data$intersections[order(sizes, decreasing = TRUE)]
}

#' @noRd
.sort_by_degree <- function(data) {
    degrees <- vapply(data$intersections, function(x) length(x$members), integer(1L))
    labels  <- vapply(data$intersections, function(x) x$label, character(1L))
    data$intersections[order(degrees, labels)]
}

#' @noRd
# Per-bar colors keyed by mode. Mirrors python _bar_colors:
# "custom" -> user-supplied named map, fallback "#cccccc"
# "heatmap" -> grDevices Reds palette interpolated by size (uniform -> "#888888")
# "depth" -> viridis palette interpolated by membership degree (uniform -> "#444444")
.bar_colors <- function(intersections, mode, custom) {
    if (mode == "custom") {
        custom <- if (is.null(custom)) character(0) else custom
        return(vapply(intersections, function(i) {
            v <- custom[i$label]
            if (length(v) == 0L || is.na(v)) "#cccccc" else v
        }, character(1L)))
    }
    if (mode == "heatmap") {
        sizes <- vapply(intersections, function(x) x$size, integer(1L))
        if (length(sizes) == 0L || max(sizes) == min(sizes)) {
            return(rep("#888888", length(intersections)))
        }
        # Reds palette via grDevices::colorRampPalette on a 5-stop Reds gradient.
        ramp <- grDevices::colorRampPalette(c("#FFF5F0", "#FCBBA1", "#FB6A4A", "#CB181D", "#67000D"))
        n_steps <- 256L
        palette <- ramp(n_steps)
        idx <- round((sizes - min(sizes)) / (max(sizes) - min(sizes)) * (n_steps - 1L)) + 1L
        return(palette[idx])
    }
    # depth: viridis on degree
    degrees <- vapply(intersections, function(x) length(x$members), integer(1L))
    if (length(degrees) == 0L || max(degrees) == min(degrees)) {
        return(rep("#444444", length(intersections)))
    }
    ramp <- grDevices::colorRampPalette(c("#440154", "#3B528B", "#21908C", "#5DC863", "#FDE725"))
    n_steps <- 256L
    palette <- ramp(n_steps)
    idx <- round((degrees - min(degrees)) / (max(degrees) - min(degrees)) * (n_steps - 1L)) + 1L
    palette[idx]
}

#' Render an UpSet plot from a RegionResult
#'
#' Builds a ComplexUpset ggplot showing intersection sizes (top bars), set
#' membership matrix (middle dot grid), and per-set sizes (left bars).
#' Idiomatic R port of Python `render_upset` -- same parameter contract, but
#' renders via ComplexUpset (ggplot2) instead of matplotlib (not a 1:1 port).
#'
#' @param result A [`RegionResult-class`].
#' @param max_columns Maximum number of intersections to display (default 20).
#'   Top-N by the active sort.
#' @param sort_by `"size"` (default -- descending) or `"degree"` (membership
#'   count ascending then alphabetical).
#' @param threshold Exclude intersections with size strictly below this value
#'   (default 0L = no filter).
#' @param color_mode `"depth"` (default -- viridis on degree), `"heatmap"`
#'   (Reds on size), or `"custom"` (use the `colors` mapping).
#' @param colors Named character vector mapping intersection LABELS (e.g.
#'   `"AB"`) to fill hex colors when `color_mode = "custom"`. Unspecified
#'   labels fall back to `"#cccccc"`.
#' @return A `ggplot` object (saveable via `ggplot2::ggsave()`).
#' @export
#' @examples
#' \dontrun{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' p <- render_upset(result, sort_by = "degree", color_mode = "heatmap")
#' ggplot2::ggsave("upset.png", p, width = 8, height = 5)
#' }
render_upset <- function(result,
                          max_columns = 20L,
                          sort_by = c("size", "degree"),
                          threshold = 0L,
                          color_mode = c("depth", "heatmap", "custom"),
                          colors = NULL) {
    sort_by    <- match.arg(sort_by)
    color_mode <- match.arg(color_mode)

    data <- .upset_data_from_region_result(result)
    sorter <- if (sort_by == "size") .sort_by_size else .sort_by_degree
    intersections <- sorter(data)
    if (threshold > 0L) {
        intersections <- intersections[
            vapply(intersections, function(x) x$size >= as.integer(threshold), logical(1L))
        ]
    }
    intersections <- head(intersections, max_columns)

    # Convert to ComplexUpset's expected long-form: one row per item, columns =
    # set names (boolean), plus a Region column for grouping. Since our items
    # are dedup'd per-region (exclusive_items), we expand each intersection
    # by its size: replicate the membership row `size` times.
    sets <- data$sets
    if (length(intersections) == 0L) {
        # Empty case: ComplexUpset requires at least one row. Build a 1-row
        # all-FALSE placeholder so the ggplot construction does not throw.
        df <- as.data.frame(matrix(FALSE, nrow = 1L, ncol = length(sets),
                                    dimnames = list(NULL, sets)))
        df$Region <- "(empty)"
    } else {
        rows <- list()
        for (i in seq_along(intersections)) {
            inter <- intersections[[i]]
            membership <- as.list(setNames(sets %in% inter$members, sets))
            membership$Region <- inter$label
            n_rows <- inter$size
            for (k in seq_len(n_rows)) {
                rows[[length(rows) + 1L]] <- membership
            }
        }
        df <- do.call(rbind.data.frame, c(rows, stringsAsFactors = FALSE))
    }

    bar_colors <- .bar_colors(intersections, mode = color_mode, custom = colors)
    label_to_color <- setNames(bar_colors, vapply(intersections, function(x) x$label, character(1L)))

    plot <- ComplexUpset::upset(
        df,
        intersect = sets,
        name = "Set membership",
        base_annotations = list(
            "Intersection size" = ComplexUpset::intersection_size(
                mapping = ggplot2::aes(fill = .data$Region)
            ) + ggplot2::scale_fill_manual(values = label_to_color, guide = "none")
        ),
        n_intersections = max_columns,
        sort_intersections_by = if (sort_by == "size") "cardinality" else "degree"
    )
    plot
}
