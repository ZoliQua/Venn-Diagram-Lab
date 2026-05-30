# Item Share Distribution and Cluster Heatmap SVG renderers.
#
# Mirrors:
#   python/src/venn_diagram_lab/render/svg.py
#     - render_share_distribution_svg
#     - render_cluster_heatmap_svg
#
# Pure string construction (no xml2) so the output stays byte-stable
# across R versions and matches the webtool's PDF embed.

# ---- Shared constants and helpers -------------------------------------------

#' @noRd
.SD_WIDTH        <- 480L
#' @noRd
.SD_HEIGHT       <- 280L
#' @noRd
.SD_MARGIN_TOP   <- 30L
#' @noRd
.SD_MARGIN_RIGHT <- 20L
#' @noRd
.SD_MARGIN_BOT   <- 40L
#' @noRd
.SD_MARGIN_LEFT  <- 50L
#' @noRd
.SD_GRAD_LOW     <- "#ffe4b5"
#' @noRd
.SD_GRAD_HIGH    <- "#7e14ff"

#' @noRd
# Linear interpolation between two `#RRGGBB` colors, returning `rgb(R,G,B)`.
# Mirrors the webtool's tier-gradient helper and Python `_lerp_hex` byte-for-byte
# (rounded integer channels).
.lerp_hex <- function(a, b, t) {
    ar <- strtoi(substr(a, 2L, 3L), 16L)
    ag <- strtoi(substr(a, 4L, 5L), 16L)
    ab <- strtoi(substr(a, 6L, 7L), 16L)
    br <- strtoi(substr(b, 2L, 3L), 16L)
    bg <- strtoi(substr(b, 4L, 5L), 16L)
    bb <- strtoi(substr(b, 6L, 7L), 16L)
    sprintf("rgb(%d,%d,%d)",
            round(ar + (br - ar) * t),
            round(ag + (bg - ag) * t),
            round(ab + (bb - ab) * t))
}

#' @noRd
# Build a binary item-by-set matrix from a `VennDataset`.
#
# Uses `dataset@item_order` as the row order when populated; otherwise falls
# back to the first-seen union of items across sets. Mirrors Python
# `_dataset_to_binary_matrix` (rows = items, cols = sets, cells in {0, 1}).
.dataset_to_binary_matrix <- function(dataset) {
    set_names <- dataset@set_names
    rows <- dataset@item_order
    if (length(rows) == 0L) {
        seen <- character()
        for (name in set_names) {
            for (item in dataset@items[[name]]) {
                if (!item %in% seen) seen <- c(seen, item)
            }
        }
        rows <- seen
    }
    n_rows <- length(rows)
    n_cols <- length(set_names)
    m <- matrix(0L, nrow = n_rows, ncol = n_cols,
                dimnames = list(NULL, set_names))
    if (n_rows == 0L) return(m)
    row_idx <- setNames(seq_along(rows), rows)
    for (j in seq_len(n_cols)) {
        for (item in dataset@items[[set_names[j]]]) {
            i <- row_idx[[item]]
            if (!is.null(i)) m[i, j] <- 1L
        }
    }
    m
}

# ---- Item Share Distribution renderer ---------------------------------------

#' Render the Item Share Distribution histogram
#'
#' Vertical bar chart with N bars (k = 1..N), tier-gradient fill from
#' \code{#ffe4b5} (k=1) to \code{#7e14ff} (k=N). Mirrors the webtool's
#' \code{buildShareDistributionSvg} layout (480x280 viewBox, Tahoma
#' typography, \code{sd-bar} CSS class on every rect) so downstream CSS,
#' PDF embed, and cross-package parity assertions can key on the same
#' structure.
#'
#' Pure string construction -- no \pkg{xml2} -- so the output is byte-stable.
#'
#' @param dataset A [`VennDataset-class`].
#' @param style Optional named list of style overrides (reserved for v2.3+;
#'   currently ignored).
#' @return An [`SvgImage-class`] with `content`, `width = 480`, `height = 280`.
#' @examples
#' \donttest{
#' ds <- load_sample("dataset_real_cancer_drivers_4")
#' img <- render_share_distribution(ds)
#' nchar(slot(img, "content")) > 0
#' }
#' @export
render_share_distribution <- function(dataset, style = NULL) {
    matrix <- .dataset_to_binary_matrix(dataset)
    dist <- item_share_distribution(matrix)

    width <- .SD_WIDTH
    height <- .SD_HEIGHT
    plot_w <- width - .SD_MARGIN_LEFT - .SD_MARGIN_RIGHT
    plot_h <- height - .SD_MARGIN_TOP - .SD_MARGIN_BOT

    n_bins <- length(dist)
    max_v <- if (n_bins == 0L) 1L else max(dist, 1L)
    bar_w <- if (n_bins > 0L) plot_w / n_bins * 0.7 else 0
    bar_gap <- if (n_bins > 0L) plot_w / n_bins * 0.3 else 0

    parts <- character()
    parts[length(parts) + 1L] <- sprintf(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">',
        width, height, width, height)
    parts[length(parts) + 1L] <- sprintf(
        '<rect width="%d" height="%d" fill="#ffffff"/>', width, height)
    parts[length(parts) + 1L] <- sprintf(
        paste0('<text x="%g" y="%d" text-anchor="middle" fill="#333" ',
               'font-family="Tahoma,sans-serif" font-size="12">',
               'Item Share Distribution</text>'),
        width / 2, .SD_MARGIN_TOP - 12L)

    if (n_bins > 0L) {
        keys <- as.integer(names(dist))
        ord <- order(keys)
        for (idx in seq_along(ord)) {
            i <- ord[idx]
            k <- keys[i]
            v <- as.integer(dist[i])
            t <- if (n_bins > 1L) (idx - 1L) / (n_bins - 1L) else 0
            fill <- .lerp_hex(.SD_GRAD_LOW, .SD_GRAD_HIGH, t)
            x <- .SD_MARGIN_LEFT + (idx - 1L) * (bar_w + bar_gap) + bar_gap / 2
            y_top <- .SD_MARGIN_TOP + plot_h * (1 - v / max_v)
            h <- (.SD_MARGIN_TOP + plot_h) - y_top
            parts[length(parts) + 1L] <- sprintf(
                '<rect class="sd-bar" x="%.2f" y="%.2f" width="%.2f" height="%.2f" fill="%s"/>',
                x, y_top, bar_w, h, fill)
            parts[length(parts) + 1L] <- sprintf(
                paste0('<text x="%.2f" y="%.2f" text-anchor="middle" fill="#333" ',
                       'font-family="Tahoma,sans-serif" font-size="11">%d</text>'),
                x + bar_w / 2, y_top - 4, v)
            tick <- if (k == 1L) "1 set" else sprintf("%d sets", k)
            parts[length(parts) + 1L] <- sprintf(
                paste0('<text x="%.2f" y="%.2f" text-anchor="middle" fill="#333" ',
                       'font-family="Tahoma,sans-serif" font-size="11">%s</text>'),
                x + bar_w / 2, .SD_MARGIN_TOP + plot_h + 16, tick)
        }
    }

    parts[length(parts) + 1L] <- sprintf(
        paste0('<line x1="%d" x2="%d" y1="%d" y2="%d" ',
               'stroke="#333" stroke-width="1"/>'),
        .SD_MARGIN_LEFT, .SD_MARGIN_LEFT + plot_w,
        .SD_MARGIN_TOP + plot_h, .SD_MARGIN_TOP + plot_h)
    parts[length(parts) + 1L] <- "</svg>"

    methods::new("SvgImage",
                 content = paste0(parts, collapse = ""),
                 width   = as.integer(width),
                 height  = as.integer(height))
}

# ---- Cluster Heatmap renderer -----------------------------------------------
#
# Mirrors the cluster-aware path of src/utils/enrichmentPlotSvg.ts
# (buildEnrichmentHeatmapSvg) restricted to the Jaccard similarity matrix.
# Distance D = 1 - Jaccard feeds cluster_set_order, then leaf-order permutes
# both axes and L-shaped dendrograms are drawn in the `hm-dendro-col` and
# `hm-dendro-row` groups expected by downstream styling and PDF capture.

#' @noRd
.HM_CELL                 <- 36L
#' @noRd
.HM_LEFT_LABEL_W         <- 110L
#' @noRd
.HM_TOP_LABEL_H          <- 82L
#' @noRd
.HM_PAD_R                <- 14L
#' @noRd
.HM_PAD_T                <- 20L
#' @noRd
.HM_PAD_B                <- 18L
#' @noRd
.HM_GRAD_LOW             <- "#ffffff"
#' @noRd
.HM_GRAD_HIGH            <- "#0072B2"
#' @noRd
.HM_MIN_SETS             <- 2L
#' @noRd
.HM_NAME_TRIM            <- 10L
#' @noRd
.HM_TEXT_LIGHT_THRESHOLD <- 0.55

#' @noRd
# Return D = 1 - Jaccard for cluster_set_order, diagonal zeroed and
# symmetrized. Mirrors Python `_jaccard_distance_matrix`.
.jaccard_distance_matrix <- function(result) {
    stats_res <- statistics(result)
    jacc <- stats_res@jaccard
    n <- length(result@dataset@set_names)
    if (length(jacc) == 0L || n < .HM_MIN_SETS) {
        return(matrix(0, nrow = n, ncol = n))
    }
    D <- 1 - jacc
    diag(D) <- 0
    (D + t(D)) / 2
}

#' Render a cluster-ordered Jaccard similarity heatmap
#'
#' Mirrors the webtool's cluster-aware \code{buildEnrichmentHeatmapSvg} path.
#' Distance \code{D = 1 - Jaccard} is fed to [cluster_set_order()]; the
#' resulting \code{leaf_order} permutes both axes, and merge heights drive
#' the L-shaped overlays emitted under \code{<g class="hm-dendro-col">}
#' (top band) and \code{<g class="hm-dendro-row">} (left band).
#'
#' Pure string construction -- no \pkg{xml2}.
#'
#' @param result A [`RegionResult-class`] from [analyze()].
#' @param linkage Linkage method passed to [cluster_set_order()]:
#'   one of \code{"average"} (UPGMA, default), \code{"complete"},
#'   \code{"single"}.
#' @param show_row_dendrogram Logical, default \code{TRUE}. When \code{FALSE},
#'   the row band is omitted from layout entirely (no reserved gap).
#' @param show_col_dendrogram Logical, default \code{TRUE}. Same semantics
#'   for the column band.
#' @param dendrogram_fraction Fraction of the grid extent reserved per
#'   dendrogram band (default \code{0.12}, minimum effective height 20
#'   pixels). Matches the webtool's \code{dendrogramFraction} option.
#' @param style Optional named list of style overrides (reserved for v2.3+;
#'   currently ignored).
#' @return An [`SvgImage-class`] with `content`, `width`, `height` set from
#'   the computed layout extents.
#' @examples
#' \donttest{
#' ds <- load_sample("dataset_real_cancer_drivers_4")
#' res <- analyze(ds)
#' img <- render_cluster_heatmap(res, linkage = "average")
#' nchar(slot(img, "content")) > 0
#' }
#' @export
render_cluster_heatmap <- function(result,
                                   linkage = c("average", "complete", "single"),
                                   show_row_dendrogram = TRUE,
                                   show_col_dendrogram = TRUE,
                                   dendrogram_fraction = 0.12,
                                   style = NULL) {
    linkage <- match.arg(linkage)

    set_names <- result@dataset@set_names
    n_sets <- length(set_names)
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_len(n_sets)]

    D <- .jaccard_distance_matrix(result)
    cluster <- cluster_set_order(D, linkage = linkage)
    order_1b <- if (length(cluster$leaf_order) == n_sets) cluster$leaf_order else seq_len(n_sets)
    merges <- cluster$merges

    band_requested <- isTRUE(show_row_dendrogram) || isTRUE(show_col_dendrogram)
    dendro_px <- if (band_requested) {
        max(20L, as.integer(round(n_sets * .HM_CELL * dendrogram_fraction)))
    } else 0L
    dendro_col_h <- if (isTRUE(show_col_dendrogram) && dendro_px > 0L) dendro_px + 6L else 0L
    dendro_row_w <- if (isTRUE(show_row_dendrogram) && dendro_px > 0L) dendro_px + 6L else 0L

    grid_x <- .HM_LEFT_LABEL_W + dendro_row_w
    grid_y <- .HM_TOP_LABEL_H + dendro_col_h
    grid_w <- n_sets * .HM_CELL
    grid_h <- n_sets * .HM_CELL

    width <- grid_x + grid_w + .HM_PAD_R
    height <- grid_y + grid_h + .HM_PAD_B

    parts <- character()
    parts[length(parts) + 1L] <- sprintf(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">',
        width, height, width, height)
    parts[length(parts) + 1L] <- sprintf(
        '<rect width="%d" height="%d" fill="#ffffff"/>', width, height)
    parts[length(parts) + 1L] <- sprintf(
        paste0('<text x="%g" y="%d" fill="#555" font-family="Tahoma,sans-serif" ',
               'font-size="10" text-anchor="middle">Jaccard similarity</text>'),
        grid_x + grid_w / 2, .HM_PAD_T)

    parts <- .append_hm_labels(parts, set_names, letters_chars,
                                order_1b, grid_x, grid_y, n_sets)
    parts <- .append_hm_cells(parts, statistics(result)@jaccard,
                               order_1b, grid_x, grid_y, n_sets)
    parts <- .append_hm_dendrograms(parts,
                                     merges = merges,
                                     order_1b = order_1b,
                                     n_sets = n_sets,
                                     grid_x = grid_x,
                                     grid_y = grid_y,
                                     dendro_px = dendro_px,
                                     dendro_col_h = dendro_col_h,
                                     dendro_row_w = dendro_row_w,
                                     show_row = isTRUE(show_row_dendrogram),
                                     show_col = isTRUE(show_col_dendrogram))

    parts[length(parts) + 1L] <- "</svg>"

    methods::new("SvgImage",
                 content = paste0(parts, collapse = ""),
                 width   = as.integer(width),
                 height  = as.integer(height))
}

#' @noRd
.append_hm_labels <- function(parts, set_names, set_letters, order_1b,
                              grid_x, grid_y, n_sets) {
    trim_name <- function(name) {
        if (nchar(name) > .HM_NAME_TRIM) substr(name, 1L, .HM_NAME_TRIM) else name
    }
    trimmed <- vapply(seq_len(n_sets),
                      function(i) sprintf("%s (%s)", trim_name(set_names[i]), set_letters[i]),
                      character(1L))

    for (c in seq_len(n_sets)) {
        ci <- order_1b[c]
        cx <- grid_x + (c - 1L) * .HM_CELL + .HM_CELL / 2
        cy <- grid_y - 6
        parts[length(parts) + 1L] <- sprintf(
            paste0('<text x="%g" y="%g" fill="#222" font-family="Tahoma,sans-serif" ',
                   'font-size="7" text-anchor="start" ',
                   'transform="rotate(-45 %g %g)">%s</text>'),
            cx, cy, cx, cy, trimmed[ci])
    }
    for (r in seq_len(n_sets)) {
        ri <- order_1b[r]
        ly <- grid_y + (r - 1L) * .HM_CELL + .HM_CELL / 2
        parts[length(parts) + 1L] <- sprintf(
            paste0('<text x="%g" y="%g" fill="#222" ',
                   'font-family="Tahoma,sans-serif" font-size="7" text-anchor="end">',
                   '%s</text>'),
            grid_x - 6, ly + 3, trimmed[ri])
    }
    parts
}

#' @noRd
.append_hm_cells <- function(parts, jacc, order_1b, grid_x, grid_y, n_sets) {
    scale_max <- 1.0  # Jaccard is in [0, 1].
    has_jacc <- length(jacc) > 0L
    for (r in seq_len(n_sets)) {
        ri <- order_1b[r]
        for (c in seq_len(n_sets)) {
            ci <- order_1b[c]
            x <- grid_x + (c - 1L) * .HM_CELL
            y <- grid_y + (r - 1L) * .HM_CELL
            if (ri == ci) {
                parts[length(parts) + 1L] <- sprintf(
                    paste0('<rect data-diag="true" x="%g" y="%g" ',
                           'width="%d" height="%d" fill="#eeeeee" ',
                           'stroke="#e8e8e8" stroke-width="0.8"/>'),
                    x, y, .HM_CELL, .HM_CELL)
                parts[length(parts) + 1L] <- sprintf(
                    paste0('<text x="%g" y="%g" fill="#555" ',
                           'font-family="Tahoma,sans-serif" font-size="9" ',
                           'text-anchor="middle">\u2014</text>'),
                    x + .HM_CELL / 2, y + .HM_CELL / 2 + 3)
                next
            }
            v <- if (has_jacc) as.numeric(jacc[ri, ci]) else 0
            t <- if (scale_max > 0) v / scale_max else 0
            t_clamped <- max(0, min(1, t))
            fill <- .lerp_hex(.HM_GRAD_LOW, .HM_GRAD_HIGH, t_clamped)
            parts[length(parts) + 1L] <- sprintf(
                paste0('<rect x="%g" y="%g" width="%d" height="%d" ',
                       'fill="%s" stroke="#e8e8e8" stroke-width="0.8"/>'),
                x, y, .HM_CELL, .HM_CELL, fill)
            text_color <- if (t > .HM_TEXT_LIGHT_THRESHOLD) "#ffffff" else "#222"
            parts[length(parts) + 1L] <- sprintf(
                paste0('<text x="%g" y="%g" fill="%s" ',
                       'font-family="Tahoma,sans-serif" font-size="8" ',
                       'text-anchor="middle">%.2f</text>'),
                x + .HM_CELL / 2, y + .HM_CELL / 2 + 3, text_color, v)
        }
    }
    parts
}

#' @noRd
# Emit `<g class="hm-dendro-col">` and/or `<g class="hm-dendro-row">` overlays.
# `merges` is a data.frame with columns left, right, height, size (0-based ids,
# matching cluster_set_order's webtool/Python convention).
.append_hm_dendrograms <- function(parts, merges, order_1b, n_sets,
                                   grid_x, grid_y, dendro_px,
                                   dendro_col_h, dendro_row_w,
                                   show_row, show_col) {
    if (!(show_row || show_col) || n_sets < .HM_MIN_SETS || nrow(merges) == 0L) {
        return(parts)
    }

    max_height <- max(merges$height, 0)
    if (max_height <= 0) max_height <- 1
    stroke <- "#555"

    # `order_1b` maps visual column -> original index (1-based). For Python
    # parity we need the inverse: original index (0-based) -> visual position.
    # Then internal-node positions are means of their children's positions.
    visual_pos <- integer(n_sets)
    for (vi in seq_len(n_sets)) {
        visual_pos[order_1b[vi]] <- vi - 1L  # 0-based visual position
    }

    positions_by_id <- vector("list", n_sets + nrow(merges))
    for (k in seq_len(n_sets)) {
        positions_by_id[[k]] <- as.numeric(visual_pos[k])
    }
    merge_pos <- numeric(nrow(merges))
    for (mi in seq_len(nrow(merges))) {
        l_id <- merges$left[mi]   # 0-based id
        r_id <- merges$right[mi]
        l_pos <- positions_by_id[[l_id + 1L]]
        r_pos <- positions_by_id[[r_id + 1L]]
        positions_by_id[[n_sets + mi]] <- c(l_pos, r_pos)
        l_mean <- if (length(l_pos) == 0L) 0 else mean(l_pos)
        r_mean <- if (length(r_pos) == 0L) 0 else mean(r_pos)
        merge_pos[mi] <- (l_mean + r_mean) / 2
    }

    node_pos <- function(node_id) {
        if (node_id < n_sets) return(visual_pos[node_id + 1L])
        merge_pos[node_id - n_sets + 1L]
    }
    node_height <- function(node_id) {
        if (node_id < n_sets) return(0)
        merges$height[node_id - n_sets + 1L]
    }

    if (show_col && dendro_col_h > 0L) {
        band_top <- .HM_PAD_T + 6
        band_bottom <- band_top + dendro_px
        parts[length(parts) + 1L] <- sprintf(
            '<g class="hm-dendro-col" stroke="%s" stroke-width="1" fill="none">',
            stroke)
        for (mi in seq_len(nrow(merges))) {
            l_id <- merges$left[mi]; r_id <- merges$right[mi]
            x_left <- grid_x + node_pos(l_id) * .HM_CELL + .HM_CELL / 2
            x_right <- grid_x + node_pos(r_id) * .HM_CELL + .HM_CELL / 2
            y_left_child <- band_bottom - (node_height(l_id) / max_height) *
                (band_bottom - band_top)
            y_right_child <- band_bottom - (node_height(r_id) / max_height) *
                (band_bottom - band_top)
            y_merge <- band_bottom - (merges$height[mi] / max_height) *
                (band_bottom - band_top)
            parts[length(parts) + 1L] <- sprintf(
                '<line x1="%g" y1="%g" x2="%g" y2="%g"/>',
                x_left, y_left_child, x_left, y_merge)
            parts[length(parts) + 1L] <- sprintf(
                '<line x1="%g" y1="%g" x2="%g" y2="%g"/>',
                x_right, y_right_child, x_right, y_merge)
            parts[length(parts) + 1L] <- sprintf(
                '<line x1="%g" y1="%g" x2="%g" y2="%g"/>',
                x_left, y_merge, x_right, y_merge)
        }
        parts[length(parts) + 1L] <- "</g>"
    }

    if (show_row && dendro_row_w > 0L) {
        left_pad <- 6
        band_left <- left_pad
        band_right <- left_pad + dendro_px
        parts[length(parts) + 1L] <- sprintf(
            '<g class="hm-dendro-row" stroke="%s" stroke-width="1" fill="none">',
            stroke)
        for (mi in seq_len(nrow(merges))) {
            l_id <- merges$left[mi]; r_id <- merges$right[mi]
            y_top <- grid_y + node_pos(l_id) * .HM_CELL + .HM_CELL / 2
            y_bot <- grid_y + node_pos(r_id) * .HM_CELL + .HM_CELL / 2
            x_left_child <- band_right - (node_height(l_id) / max_height) *
                (band_right - band_left)
            x_right_child <- band_right - (node_height(r_id) / max_height) *
                (band_right - band_left)
            x_merge <- band_right - (merges$height[mi] / max_height) *
                (band_right - band_left)
            parts[length(parts) + 1L] <- sprintf(
                '<line x1="%g" y1="%g" x2="%g" y2="%g"/>',
                x_left_child, y_top, x_merge, y_top)
            parts[length(parts) + 1L] <- sprintf(
                '<line x1="%g" y1="%g" x2="%g" y2="%g"/>',
                x_right_child, y_bot, x_merge, y_bot)
            parts[length(parts) + 1L] <- sprintf(
                '<line x1="%g" y1="%g" x2="%g" y2="%g"/>',
                x_merge, y_top, x_merge, y_bot)
        }
        parts[length(parts) + 1L] <- "</g>"
    }

    parts
}
