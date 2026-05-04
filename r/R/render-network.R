# Network plot rendering via ggraph + tidygraph (ggplot2-based). Data shaping
# mirrors python/src/venn_diagram_lab/render/network.py; rendering uses ggraph
# instead of networkx + matplotlib (idiomatic R; not a 1:1 port).
#
# All helpers private (leading dot, @noRd). Single public entry point:
# render_network (Task B2).

#' @importFrom ggplot2 ggplot aes scale_size_continuous theme_void
#' @importFrom tidygraph tbl_graph
#' @importFrom ggraph ggraph create_layout geom_edge_link geom_node_point geom_node_text scale_edge_colour_manual
NULL

.NETWORK_FE_CAP <- 20.0
.NETWORK_EDGE_COLOR_SIG <- "#2E3192"
.NETWORK_EDGE_COLOR_NONSIG <- "#bbbbbb"
.NETWORK_NODE_COLOR <- "#FFF200"
.NETWORK_NODE_EDGE_COLOR <- "#444444"
.NETWORK_EDGE_WIDTH_BASE <- 1.0
.NETWORK_EDGE_WIDTH_SCALE <- 5.0
.NETWORK_DEFAULT_SIG_THRESHOLD <- 0.05

#' @noRd
.weight_for_metric <- function(metric, intersection, jaccard, fold_enrichment, overlap_coefficient) {
    if (metric == "intersection") return(as.numeric(intersection))
    if (metric == "jaccard")      return(jaccard)
    if (metric == "fold_enrichment") return(min(fold_enrichment, .NETWORK_FE_CAP))
    if (metric == "overlap_coefficient") return(overlap_coefficient)
    stop(sprintf("Unknown edge_metric '%s'. Allowed: intersection, jaccard, fold_enrichment, overlap_coefficient.", metric))
}

#' @noRd
.build_network_data <- function(result, metric = "intersection") {
    n <- length(result@dataset@set_names)
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_len(n)]
    sizes <- result@set_sizes
    max_size <- max(c(1L, sizes))

    nodes <- list()
    for (i in seq_len(n)) {
        name <- result@dataset@set_names[[i]]
        size <- sizes[[name]]
        radius <- 12 + sqrt(size / max_size) * 22
        nodes[[i]] <- list(id = letters_chars[i], label = name, size = as.integer(size), radius = radius)
    }

    stats <- statistics(result)
    hyp <- stats@hypergeometric
    name_to_letter <- setNames(letters_chars, result@dataset@set_names)

    edges <- list()
    for (i in seq_len(nrow(hyp))) {
        row <- hyp[i, , drop = FALSE]
        a_name <- row$set_a
        b_name <- row$set_b
        a_letter <- name_to_letter[[a_name]]
        b_letter <- name_to_letter[[b_name]]
        inter <- as.integer(row$intersection)
        jac <- stats@jaccard[a_name, b_name]
        fe  <- stats@fold_enrichment[a_name, b_name]
        oc  <- stats@overlap_coefficient[a_name, b_name]
        dic <- stats@dice[a_name, b_name]
        p_val <- as.numeric(row$p_value)
        p_adj <- as.numeric(row$p_adjusted)
        weight <- .weight_for_metric(metric, inter, jac, fe, oc)
        edges[[length(edges) + 1L]] <- list(
            source = a_letter, target = b_letter, weight = weight,
            intersection = inter, jaccard = jac, fold_enrichment = fe,
            overlap_coefficient = oc, dice = dic,
            p_value = p_val, p_adjusted = p_adj,
            significant = isTRUE(row$significant),
            name_a = a_name, name_b = b_name
        )
    }

    list(nodes = nodes, edges = edges)
}

#' Render a force-directed network plot from a RegionResult
#'
#' Builds a ggraph plot where nodes are sets (sized by inclusive cardinality)
#' and edges are pairwise overlaps (thickness proportional to the chosen
#' metric; blue for FDR-significant edges below `significance_threshold`,
#' grey otherwise). Layout uses the deterministic `stress` algorithm from
#' graphlayouts.
#'
#' Idiomatic R port of Python `render_network` -- same parameter contract,
#' but renders via ggraph + tidygraph instead of networkx + matplotlib.
#'
#' @param result A [`RegionResult-class`].
#' @param edge_metric One of `"intersection"`, `"jaccard"`,
#'   `"fold_enrichment"` (capped at 20.0), `"overlap_coefficient"`.
#' @param seed Random seed for the layout (default 42L). Layout is
#'   deterministic for the `stress` algorithm regardless, but the seed is
#'   set before layout for cross-version safety.
#' @param significance_threshold FDR p_adjusted threshold below which edges
#'   are colored as significant (default 0.05).
#' @param node_color_map Optional named character vector mapping letters
#'   (`"A"`, `"B"`, ...) to fill hex colors. Unspecified letters default to
#'   yellow (`"#FFF200"`).
#' @return A `ggplot` (ggraph subclass).
#' @export
#' @examples
#' \dontrun{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' p <- render_network(result, edge_metric = "jaccard")
#' ggplot2::ggsave("network.png", p, width = 7, height = 7)
#' }
render_network <- function(result,
                            edge_metric = "intersection",
                            seed = 42L,
                            significance_threshold = 0.05,
                            node_color_map = NULL) {
    data <- .build_network_data(result, metric = edge_metric)

    nodes_df <- data.frame(
        name   = vapply(data$nodes, function(n) n$id,    character(1L)),
        label  = vapply(data$nodes, function(n) n$label, character(1L)),
        size   = vapply(data$nodes, function(n) n$size,  integer(1L)),
        radius = vapply(data$nodes, function(n) n$radius, numeric(1L)),
        stringsAsFactors = FALSE
    )

    if (length(data$edges) == 0L) {
        edges_df <- data.frame(
            from = character(0), to = character(0),
            weight = numeric(0), significant = logical(0),
            stringsAsFactors = FALSE
        )
    } else {
        edges_df <- data.frame(
            from   = vapply(data$edges, function(e) e$source, character(1L)),
            to     = vapply(data$edges, function(e) e$target, character(1L)),
            weight = vapply(data$edges, function(e) e$weight, numeric(1L)),
            significant = vapply(data$edges,
                                  function(e) e$p_adjusted < significance_threshold,
                                  logical(1L)),
            stringsAsFactors = FALSE
        )
        max_w <- max(c(1, edges_df$weight))
        edges_df$edge_width <- .NETWORK_EDGE_WIDTH_BASE +
            .NETWORK_EDGE_WIDTH_SCALE * (edges_df$weight / max_w)
    }

    # Per-letter node color override
    nodes_df$node_color <- vapply(nodes_df$name, function(letter) {
        v <- if (is.null(node_color_map)) NA_character_ else node_color_map[letter]
        if (is.na(v)) .NETWORK_NODE_COLOR else v
    }, character(1L))

    g <- tidygraph::tbl_graph(nodes = nodes_df, edges = edges_df, directed = FALSE)
    set.seed(seed)
    layout <- ggraph::create_layout(g, layout = "stress")

    plot <- ggraph::ggraph(layout)
    if (length(data$edges) > 0L) {
        plot <- plot +
            ggraph::geom_edge_link(
                ggplot2::aes(width = .data$edge_width,
                             colour = .data$significant),
                show.legend = FALSE
            ) +
            ggraph::scale_edge_colour_manual(
                values = c(`TRUE` = .NETWORK_EDGE_COLOR_SIG,
                            `FALSE` = .NETWORK_EDGE_COLOR_NONSIG)
            )
    }
    plot <- plot +
        ggraph::geom_node_point(
            ggplot2::aes(size = .data$radius),
            fill = nodes_df$node_color,
            color = .NETWORK_NODE_EDGE_COLOR,
            shape = 21L,
            show.legend = FALSE
        ) +
        ggplot2::scale_size_continuous(range = c(8, 24)) +
        ggraph::geom_node_text(ggplot2::aes(label = .data$label),
                                size = 3.5, vjust = -1.5) +
        ggplot2::theme_void()

    plot
}
