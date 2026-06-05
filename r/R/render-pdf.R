# Multi-page PDF report. Composes overview + venn/upset + statistics + network +
# about pages via grDevices::pdf + patchwork. Mirrors python's render/pdf.py
# byte-equivalent for footer text but uses R-idiomatic page composition (NOT a
# 1:1 port -- Python uses matplotlib PdfPages with manual axes; R uses grDevices
# pdf device with print() per page).

#' @importFrom ggplot2 ggplot aes theme_void theme element_text element_blank
#' @importFrom ggplot2 geom_text geom_blank labs ggtitle
#' @importFrom patchwork wrap_plots wrap_elements plot_annotation
#' @importFrom gridExtra tableGrob ttheme_minimal
#' @importFrom grid grid.text gpar rasterGrob unit
#' @importFrom rsvg rsvg_nativeraster
NULL

#' @noRd
# Format current UTC time as "D Month YYYY HH:MM:SS UTC" (no zero-padded day).
# Mirrors python _format_timestamp byte-for-byte for the footer string.
.format_pdf_timestamp <- function() {
    now <- Sys.time()
    day <- format(now, "%d", tz = "UTC")
    day <- sub("^0", "", day)
    sprintf("%s %s UTC", day, format(now, "%B %Y %H:%M:%S", tz = "UTC"))
}

#' @noRd
# Compose the per-page footer string. `total_pages` is computed by the
# orchestrator before any page is written.
.pdf_footer_text <- function(page_num, total_pages) {
    sprintf("vdl %s -- Generated %s -- page %d of %d",
            vdl_version(), .format_pdf_timestamp(), page_num, total_pages)
}

.PDF_PAGE_WIDTH  <- 11.0
.PDF_PAGE_HEIGHT <- 8.5
.PDF_NAME_FULL_MAX  <- 30L   # truncate to 30 chars + "*" footnote
.PDF_NAME_SHORT_MAX <- 10L   # short form: first 10 chars + " (X)"

#' @noRd
.short_name <- function(name, letter) {
    short <- if (nchar(name) > .PDF_NAME_SHORT_MAX) substr(name, 1L, .PDF_NAME_SHORT_MAX) else name
    sprintf("%s (%s)", short, letter)
}

#' @noRd
# Mirrors python _overview_metadata_rows. Returns list of c(label, value) pairs.
.overview_metadata_rows <- function(result) {
    n <- length(result@dataset@set_names)
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_len(n)]
    full_label <- paste(letters_chars, collapse = "")
    full_mask <- bitwShiftL(1L, n) - 1L
    core_region <- result@regions[[as.character(full_mask)]]
    core_count <- if (is.null(core_region)) 0L else length(core_region@exclusive_items)

    largest_label <- ""
    largest_count <- 0L
    empty_regions <- 0L
    filled_regions <- 0L
    for (mask in 1L:full_mask) {
        region <- result@regions[[as.character(mask)]]
        count <- if (is.null(region)) 0L else length(region@exclusive_items)
        if (count > largest_count) {
            largest_count <- count
            label_chars <- letters_chars[which(bitwAnd(mask, bitwShiftL(1L, 0L:(n - 1L))) != 0L)]
            largest_label <- paste(label_chars, collapse = "")
        }
        if (count == 0L) empty_regions <- empty_regions + 1L
        else filled_regions <- filled_regions + 1L
    }
    total_regions <- full_mask

    universe <- effective_universe(result)
    items_assigned <- sum(vapply(result@regions, function(r) length(r@exclusive_items), integer(1L)))

    source_path <- result@dataset@source_path
    source_file <- if (is.null(source_path)) "(in-memory)" else basename(source_path)

    source_data_rows <- if (!is.null(result@dataset@universe_size))
        as.integer(result@dataset@universe_size)
    else
        length(result@dataset@item_order)

    list(
        c("Date", .format_pdf_timestamp()),
        c("Source file", source_file),
        c("Source data rows", as.character(source_data_rows)),
        c("Background universe", as.character(universe)),
        c("Items assigned to Venn regions", as.character(items_assigned)),
        c("Number of sets", as.character(n)),
        c("Total regions", as.character(total_regions)),
        c(sprintf("Core intersection (%s)", full_label), as.character(core_count)),
        c("Largest exclusive region", sprintf("%s (%d)", largest_label, largest_count)),
        c("Filled regions", sprintf("%d / %d", filled_regions, total_regions)),
        c("Empty regions", sprintf("%d / %d", empty_regions, total_regions))
    )
}

#' @noRd
# Mirrors python _set_sizes_rows. Returns named list with $rows (list of 7-col vectors)
# and $truncated (character vector of truncated full-names for the footnote).
.set_sizes_rows <- function(result) {
    n <- length(result@dataset@set_names)
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_len(n)]
    inclusive_total <- sum(vapply(result@dataset@set_names,
                                   function(name) result@set_sizes[[name]],
                                   integer(1L)))

    rows <- list()
    truncated <- character()
    for (i in seq_len(n)) {
        name <- result@dataset@set_names[[i]]
        letter <- letters_chars[i]
        size <- result@set_sizes[[name]]
        only_mask <- bitwShiftL(1L, i - 1L)
        only_region <- result@regions[[as.character(only_mask)]]
        excl <- if (is.null(only_region)) 0L else length(only_region@exclusive_items)
        incl <- size - excl
        pct <- if (inclusive_total > 0L)
            sprintf("%.1f%%", size / inclusive_total * 100)
        else "0%"

        if (nchar(name) > .PDF_NAME_FULL_MAX) {
            full_display <- paste0(substr(name, 1L, .PDF_NAME_FULL_MAX), "*")
            truncated <- c(truncated, sprintf("%s: %s", letter, name))
        } else {
            full_display <- name
        }

        rows[[i]] <- c(
            letter, full_display, .short_name(name, letter),
            as.character(size), as.character(excl), as.character(incl), pct
        )
    }
    list(rows = rows, truncated = truncated)
}

#' @noRd
# Build the overview page (Page 1): Title + 11-row metadata + 7-col Set Sizes table.
.build_overview_page <- function(result, title = NULL) {
    page_title <- if (is.null(title)) "Venn Diagram Lab Report" else title

    metadata <- .overview_metadata_rows(result)
    metadata_df <- data.frame(
        Field = vapply(metadata, function(x) x[1L], character(1L)),
        Value = vapply(metadata, function(x) x[2L], character(1L)),
        stringsAsFactors = FALSE
    )

    sizes <- .set_sizes_rows(result)
    sizes_df <- data.frame(
        do.call(rbind, sizes$rows),
        stringsAsFactors = FALSE
    )
    colnames(sizes_df) <- c("Set", "Name", "Name (short)",
                              "Size", "Exclusive", "Inclusive", "%")

    metadata_grob <- gridExtra::tableGrob(
        metadata_df, rows = NULL,
        theme = gridExtra::ttheme_minimal(base_size = 9)
    )
    sizes_grob <- gridExtra::tableGrob(
        sizes_df, rows = NULL,
        theme = gridExtra::ttheme_minimal(base_size = 9)
    )

    title_plot <- ggplot2::ggplot() +
        ggplot2::geom_blank() +
        ggplot2::ggtitle(page_title) +
        ggplot2::theme_void() +
        ggplot2::theme(plot.title = ggplot2::element_text(
            size = 18, face = "bold", hjust = 0.5,
            margin = ggplot2::margin(t = 10, b = 10)
        ))

    patchwork::wrap_plots(
        title_plot,
        patchwork::wrap_elements(metadata_grob),
        patchwork::wrap_elements(sizes_grob),
        ncol = 1L,
        heights = c(0.10, 0.45, 0.45)
    )
}

.PDF_VENN_RASTER_WIDTH <- 800L

#' @noRd
# Build Page 2: rasterized venn (left) + UpSet ggplot (right).
.build_venn_upset_page <- function(result) {
    svg <- render_venn_svg(result)
    raster <- rsvg::rsvg_nativeraster(charToRaw(svg), width = .PDF_VENN_RASTER_WIDTH)
    venn_grob <- grid::rasterGrob(raster, interpolate = TRUE,
                                   width = grid::unit(1, "npc"),
                                   height = grid::unit(1, "npc"))

    upset_plot <- render_upset(result, max_columns = 20L)

    patchwork::wrap_plots(
        patchwork::wrap_elements(venn_grob),
        upset_plot,
        ncol = 2L,
        widths = c(1, 1)
    )
}

.SIG_VERY_THRESHOLD <- 0.001
.SIG_MID_THRESHOLD  <- 0.01
.SIG_THRESHOLD      <- 0.05

#' @noRd
.sig_label <- function(fdr) {
    if (fdr < .SIG_VERY_THRESHOLD) "***"
    else if (fdr < .SIG_MID_THRESHOLD) "**"
    else if (fdr < .SIG_THRESHOLD) "*"
    else "ns"
}

#' @noRd
# Format p-value: scientific (.js_to_exponential_2) for <0.001, else 6 decimals.
.fmt_pdf_p <- function(x) {
    if (x < .SIG_VERY_THRESHOLD) .js_to_exponential_2(x) else .js_to_fixed(x, 6L)
}

#' @noRd
# Build per-pair derived rows from the hypergeometric table. Returns list of named lists.
.pair_rows <- function(result) {
    set_names <- result@dataset@set_names
    universe <- effective_universe(result)
    stats_res <- statistics(result)
    hyp <- stats_res@hypergeometric
    n <- length(set_names)
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]][seq_len(n)]
    name_to_letter <- setNames(letters_chars, set_names)

    out <- list()
    for (i in seq_len(nrow(hyp))) {
        row <- hyp[i, , drop = FALSE]
        a <- row$set_a; b <- row$set_b
        size_a <- result@set_sizes[[a]]
        size_b <- result@set_sizes[[b]]
        inter <- as.integer(row$intersection)
        union_size <- size_a + size_b - inter
        jac <- jaccard(size_a, size_b, inter)
        oc  <- overlap_coefficient(size_a, size_b, inter)
        dic <- dice(size_a, size_b, inter)
        expected <- as.numeric(row$expected)
        fe <- fold_enrichment(universe, size_a, size_b, inter)
        p_val <- as.numeric(row$p_value)
        fdr <- as.numeric(row$p_adjusted)
        pair_label <- sprintf("%s - %s",
                               .short_name(a, name_to_letter[[a]]),
                               .short_name(b, name_to_letter[[b]]))
        out[[i]] <- list(
            pair = pair_label, intersection = inter, union = union_size,
            jaccard = jac, overlap = oc, dice = dic,
            expected = expected, fold_enrichment = fe,
            p_value = p_val, fdr = fdr, sig = .sig_label(fdr)
        )
    }
    out
}

#' @noRd
.pair_rows_to_jaccard_df <- function(rows) {
    data.frame(
        Pair = vapply(rows, function(r) r$pair, character(1L)),
        Intersection = vapply(rows, function(r) as.character(r$intersection), character(1L)),
        Union = vapply(rows, function(r) as.character(r$union), character(1L)),
        Jaccard = vapply(rows, function(r) .js_to_fixed(r$jaccard, 4L), character(1L)),
        Overlap_Coeff = vapply(rows, function(r) .js_to_fixed(r$overlap, 4L), character(1L)),
        stringsAsFactors = FALSE,
        check.names = FALSE
    )
}

#' @noRd
.pair_rows_to_dice_df <- function(rows) {
    data.frame(
        Pair = vapply(rows, function(r) r$pair, character(1L)),
        Dice = vapply(rows, function(r) .js_to_fixed(r$dice, 4L), character(1L)),
        stringsAsFactors = FALSE
    )
}

#' @noRd
.pair_rows_to_enrichment_df <- function(rows) {
    data.frame(
        Pair = vapply(rows, function(r) r$pair, character(1L)),
        Expected = vapply(rows, function(r) .js_to_fixed(r$expected, 2L), character(1L)),
        Fold_Enrichment = vapply(rows, function(r) .js_to_fixed(r$fold_enrichment, 3L), character(1L)),
        P_value = vapply(rows, function(r) .fmt_pdf_p(r$p_value), character(1L)),
        FDR = vapply(rows, function(r) .fmt_pdf_p(r$fdr), character(1L)),
        Significant = vapply(rows, function(r) r$sig, character(1L)),
        stringsAsFactors = FALSE,
        check.names = FALSE
    )
}

#' @noRd
.table_page <- function(title, df) {
    title_plot <- ggplot2::ggplot() + ggplot2::geom_blank() +
        ggplot2::ggtitle(title) + ggplot2::theme_void() +
        ggplot2::theme(plot.title = ggplot2::element_text(
            size = 14, face = "bold", hjust = 0.5,
            margin = ggplot2::margin(t = 8, b = 8)
        ))
    grob <- gridExtra::tableGrob(df, rows = NULL,
                                  theme = gridExtra::ttheme_minimal(base_size = 9))
    patchwork::wrap_plots(title_plot, patchwork::wrap_elements(grob),
                           ncol = 1L, heights = c(0.08, 0.92))
}

#' @noRd
.build_statistics_pages <- function(result) {
    rows <- .pair_rows(result)
    if (length(rows) == 0L) return(list())

    n <- length(result@dataset@set_names)
    if (n <= 4L) {
        # 1 page: stack all 3 tables
        all_df <- list(
            jaccard = .pair_rows_to_jaccard_df(rows),
            dice = .pair_rows_to_dice_df(rows),
            enrichment = .pair_rows_to_enrichment_df(rows)
        )
        title_plot <- ggplot2::ggplot() + ggplot2::geom_blank() +
            ggplot2::ggtitle("Pairwise statistics") + ggplot2::theme_void() +
            ggplot2::theme(plot.title = ggplot2::element_text(
                size = 16, face = "bold", hjust = 0.5,
                margin = ggplot2::margin(t = 8, b = 8)
            ))
        return(list(patchwork::wrap_plots(
            title_plot,
            patchwork::wrap_elements(gridExtra::tableGrob(
                all_df$jaccard, rows = NULL,
                theme = gridExtra::ttheme_minimal(base_size = 8)
            )),
            patchwork::wrap_elements(gridExtra::tableGrob(
                all_df$dice, rows = NULL,
                theme = gridExtra::ttheme_minimal(base_size = 8)
            )),
            patchwork::wrap_elements(gridExtra::tableGrob(
                all_df$enrichment, rows = NULL,
                theme = gridExtra::ttheme_minimal(base_size = 8)
            )),
            ncol = 1L, heights = c(0.06, 0.30, 0.20, 0.44)
        )))
    }
    # 5+ sets: 3 separate pages
    list(
        .table_page("Pairwise Jaccard / Overlap Coefficient",
                     .pair_rows_to_jaccard_df(rows)),
        .table_page("Pairwise Dice", .pair_rows_to_dice_df(rows)),
        .table_page("Pairwise Enrichment + FDR",
                     .pair_rows_to_enrichment_df(rows))
    )
}

#' @noRd
.build_network_page <- function(result) {
    title_plot <- ggplot2::ggplot() + ggplot2::geom_blank() +
        ggplot2::ggtitle("Set relationship network") + ggplot2::theme_void() +
        ggplot2::theme(plot.title = ggplot2::element_text(
            size = 16, face = "bold", hjust = 0.5,
            margin = ggplot2::margin(t = 8, b = 8)
        ))
    network_plot <- render_network(result)
    patchwork::wrap_plots(title_plot, network_plot,
                           ncol = 1L, heights = c(0.08, 0.92))
}

# ---------------------------------------------------------------------------
# About / Credits page (v2.2.3 -- mirrors the webtool's ABOUT_REPORT_SECTIONS
# and python's _ABOUT_SECTIONS byte-for-byte). 12 sections grouped into 3
# bands (intro, plots, statistics) plus a Credits & Cite footer. Titles
# render in bold; bodies in plain weight. Content auto-paginates across as
# many US Letter landscape pages as needed.
#
# All character literals are ASCII-safe via \u00xx escapes so the file
# survives R CMD check (UTF-8 lint) on every CRAN platform.
# ---------------------------------------------------------------------------

#' @noRd
# Each entry: list(title = "...", body = "...") -- empty body = group header.
.ABOUT_SECTIONS <- list(
    list(
        title = "Venn Diagram Lab",
        body = paste0(
            "Venn Diagram Lab is an interactive tool for visualizing set ",
            "relationships using Venn diagrams. It supports 2 to 9 overlapping ",
            "sets across 44 diagram models, covering all major construction ",
            "methods (Venn, Edwards, Anderson, Carroll, Bannier-Bodin, ",
            "Grunbaum, Mamakani, and SUMO-Venn). Users can import their own ",
            "datasets in CSV, TSV, GMT, or GMX format, map data columns to ",
            "diagram sets, and generate intersection counts automatically. The ",
            "tool calculates both exclusive counts (items belonging to exactly ",
            "one specific combination of sets) and inclusive counts (items ",
            "contained in every set of a given combination, regardless of ",
            "whether they also appear in other sets)."
        )
    ),
    list(title = "Plots", body = ""),
    list(
        title = "1. Venn Diagrams",
        body = paste0(
            "A Venn diagram displays all possible logical relations between a ",
            "finite collection of sets. Each set is represented as a closed ",
            "shape, and overlapping areas represent intersections -- items ",
            "that belong to multiple sets simultaneously. For n sets, there ",
            "are (2^n)-1 possible non-empty regions. The diagram allows ",
            "researchers to visually identify which items are shared between ",
            "groups, which are unique to a single group, and how extensively ",
            "the groups overlap. In this report, exclusive region counts are ",
            "shown: each item is counted exactly once, in the region ",
            "corresponding to its precise combination of set memberships."
        )
    ),
    list(
        title = "2. UpSet Plots",
        body = paste0(
            "An UpSet plot is a scalable alternative to Venn diagrams for ",
            "quantifying set intersections. Instead of overlapping shapes, it ",
            "uses a matrix layout: rows represent the sets, columns represent ",
            "specific intersections, and filled dots connected by lines ",
            "indicate which sets participate in each intersection. Vertical ",
            "bars above the matrix show the size (item count) of each ",
            "intersection, sorted by size in descending order. Horizontal ",
            "bars on the left show the total size of each set. UpSet plots ",
            "are particularly useful for more than 4 sets, where traditional ",
            "Venn diagrams become visually complex. This report shows the ",
            "top 20 intersections by size."
        )
    ),
    list(
        title = "3. Set Relationship Network",
        body = paste0(
            "The network diagram is a force-directed graph that visualizes ",
            "pairwise relationships between sets. Each node represents a ",
            "set, sized proportionally to its cardinality and colored with ",
            "the standard Venn color scheme. Edges connect pairs of sets ",
            "that share items, with edge thickness proportional to the ",
            "chosen weight metric (intersection count, Jaccard index, Fold ",
            "Enrichment, or Overlap Coefficient). Edge color indicates ",
            "statistical significance: green edges are significant ",
            "(FDR < 0.05), grey edges are not. The layout is computed using ",
            "a spring-embedder algorithm with repulsive forces between all ",
            "nodes and attractive forces along edges. This visualization is ",
            "especially useful for identifying clusters of related sets and ",
            "understanding the overall topology of set relationships at a ",
            "glance."
        )
    ),
    list(title = "Statistics", body = ""),
    list(
        title = "1. Pairwise Jaccard Index",
        body = paste0(
            "The Jaccard similarity index measures the overlap between two ",
            "sets as the ratio of their intersection size to their union ",
            "size: J(A,B) = |A inter B| / |A union B|. Values range from 0 ",
            "(no shared items) to 1 (identical sets). A Jaccard index above ",
            "0.7 suggests high similarity, while below 0.1 indicates very ",
            "little overlap. The Overlap Coefficient is a related measure: ",
            "OC(A,B) = |A inter B| / min(|A|, |B|), which is more useful ",
            "when one set is much smaller than the other."
        )
    ),
    list(
        title = "2. Sorensen-Dice Index",
        body = paste0(
            "The S\u00f8rensen-Dice coefficient is another similarity ",
            "measure, defined as D(A,B) = 2*|A inter B| / (|A| + |B|). It ",
            "gives more weight to shared items than the Jaccard index and ",
            "is widely used in ecological and bioinformatics studies. Like ",
            "Jaccard, values range from 0 to 1, with higher values ",
            "indicating greater similarity between sets."
        )
    ),
    list(
        title = "3. Intersection Enrichment (Hypergeometric Test)",
        body = paste0(
            "The hypergeometric test evaluates whether the observed overlap ",
            "between two sets is greater than expected by chance. Given a ",
            "total population of N items, where set A contains K items and ",
            "set B contains n items, the test calculates the probability of ",
            "observing k or more shared items under a random null model ",
            "(sampling without replacement). The Fold Enrichment (FE) is ",
            "the ratio of observed to expected overlap: ",
            "FE = (k/n) / (K/N). An FE > 1 indicates more overlap than ",
            "expected. The p-values are corrected for multiple testing ",
            "using the Benjamini-Hochberg False Discovery Rate (FDR) ",
            "method. Significance levels are marked as: *** (FDR < 0.001), ",
            "** (FDR < 0.01), * (FDR < 0.05), ns (not significant)."
        )
    ),
    list(
        title = "4. Bar chart",
        body = paste0(
            "The bar chart plots one vertical bar per pair of sets. Bar ",
            "height encodes -log10(FDR), so taller bars indicate more ",
            "significant over-representation. Bars are coloured green when ",
            "FDR < 0.05 and grey otherwise, and significance asterisks ",
            "above each bar mark the classical thresholds: * (FDR < 0.05), ",
            "** (FDR < 0.01), *** (FDR < 0.001). The bar chart is the most ",
            "direct visual summary of which pairwise overlaps survive ",
            "multiple-testing correction."
        )
    ),
    list(
        title = "5. Lollipop chart",
        body = paste0(
            "The lollipop chart shares the x-axis and colour coding with ",
            "the bar chart, but draws each pair as a thin stick topped by ",
            "a dot. The stick length still encodes -log10(FDR), while the ",
            "dot area is scaled by the observed intersection count. This ",
            "double encoding highlights pairs that are both statistically ",
            "significant and biologically sizeable: tall stick plus large ",
            "dot. Small dots on tall sticks identify small-but-significant ",
            "overlaps, while short sticks on large dots identify abundant ",
            "overlaps that are nevertheless consistent with chance."
        )
    ),
    list(
        title = "6. Heatmap",
        body = paste0(
            "The heatmap renders a symmetric n x n matrix of pairwise ",
            "-log10(FDR) values. Each cell is shaded from white (no ",
            "enrichment) to dark green (strong enrichment) according to a ",
            "linear colour scale shown in the legend on the right. The ",
            "diagonal is marked with an em-dash because a set is not ",
            "tested against itself. The matrix is symmetric: the cell ",
            "(A,B) and the cell (B,A) always share the same value. In the ",
            "interactive Data-mode panel the same heatmap can be switched ",
            "to display Fold Enrichment, using a white-to-purple scale ",
            "instead."
        )
    ),
    list(
        title = "7. Item Share Distribution",
        body = paste0(
            "For each set-membership count k = 1..N, the histogram shows ",
            "how many items belong to exactly k sets. A right-skewed ",
            "distribution indicates high redundancy across sets; a ",
            "left-skewed distribution indicates set-specific items ",
            "dominate. The accompanying breakdown table lists the exact ",
            "item count and percentage share for each membership level."
        )
    ),
    list(
        title = "8. Cluster Heatmap",
        body = paste0(
            "Rows and columns are reordered by hierarchical clustering on ",
            "1 - Jaccard distance. The default linkage is average (UPGMA); ",
            "single and complete linkage are also available. The ",
            "dendrograms above and to the left of the grid show the ",
            "cluster structure; closer joins indicate more similar set ",
            "composition. The Original / Cluster toggle in the Data-mode ",
            "panel controls which ordering is used in the live view and ",
            "in this PDF."
        )
    ),
    list(
        title = "Credits and Cite",
        body = paste0(
            "Venn Diagram Lab is developed and maintained by Zolt\u00e1n ",
            "Dul, M\u00e1rton \u00d6lbei, N. Shaun B. Thomas, Azeddine ",
            "Si Ammour, and Attila Csik\u00e1sz-Nagy. The tool is ",
            "open-source and free to use under the MIT License.\n\n",
            "Web tool:    https://venndiagramlab.org/\n",
            "GitHub:      https://github.com/ZoliQua/Venn-Diagram-Lab\n",
            "PyPI:        https://pypi.org/project/venn-diagram-lab/\n",
            "CRAN:        https://CRAN.R-project.org/package=vennDiagramLab\n",
            "Zenodo DOI:  10.5281/zenodo.19510813\n\n",
            "Citation:\n",
            "Dul Z., \u00d6lbei M., Thomas N.S.B., Si Ammour A., ",
            "Csik\u00e1sz-Nagy A. (2026). Venn Diagram Lab \u2014 ",
            "Headless Venn diagram analysis and rendering. ",
            "https://venndiagramlab.org/  doi:10.5281/zenodo.19510813"
        )
    )
)

# Wrap widths (in characters). Body is plain weight at the small font size
# we use on the About page; titles are bold and slightly larger.
.ABOUT_BODY_WRAP <- 92L
.ABOUT_TITLE_WRAP <- 80L
# Lines per page budget -- guards against over-stuffing a single page when
# the n=12 sections must paginate. A US Letter landscape ggplot canvas
# comfortably holds ~46 wrap lines at the chosen font size.
.ABOUT_LINES_PER_PAGE <- 46L

#' @noRd
# Wrap one paragraph at `width` characters, preserving explicit "\n"
# newlines as empty visual lines (so URL / citation blocks keep layout).
.wrap_about_paragraph <- function(text, width) {
    if (is.null(text) || !nzchar(text)) return(character())
    out <- character()
    for (raw in strsplit(text, "\n", fixed = TRUE)[[1L]]) {
        if (!nzchar(raw)) {
            out <- c(out, "")
        } else {
            wrapped <- strwrap(raw, width = width)
            if (length(wrapped) == 0L) wrapped <- ""
            out <- c(out, wrapped)
        }
    }
    out
}

#' @noRd
# Build per-page draw plans. Returns a list of pages; each page is a
# data.frame with columns: y (numeric, top-down line index), text, face
# ("bold" for titles, "plain" for body).
.about_pages_plan <- function() {
    pages <- list()
    current_lines <- list()  # each entry: list(text, face)
    flush <- function() {
        if (length(current_lines) == 0L) return(NULL)
        df <- data.frame(
            y = -seq_along(current_lines),
            text = vapply(current_lines, function(x) x$text, character(1L)),
            face = vapply(current_lines, function(x) x$face, character(1L)),
            stringsAsFactors = FALSE
        )
        pages[[length(pages) + 1L]] <<- df
        current_lines <<- list()
    }

    for (section in .ABOUT_SECTIONS) {
        title_lines <- .wrap_about_paragraph(section$title, .ABOUT_TITLE_WRAP)
        body_lines <- .wrap_about_paragraph(section$body, .ABOUT_BODY_WRAP)
        block_cost <- length(title_lines) + length(body_lines) + 1L  # +1 for gap

        if (length(current_lines) + block_cost > .ABOUT_LINES_PER_PAGE) {
            flush()
        }

        for (tl in title_lines) {
            current_lines[[length(current_lines) + 1L]] <-
                list(text = tl, face = "bold")
        }
        for (bl in body_lines) {
            current_lines[[length(current_lines) + 1L]] <-
                list(text = bl, face = "plain")
        }
        # Visual gap between sections.
        current_lines[[length(current_lines) + 1L]] <-
            list(text = "", face = "plain")
    }
    flush()
    pages
}

#' @noRd
# Render one About-page data.frame (from .about_pages_plan()) as a ggplot
# with two geom_text layers (bold for titles, plain for body).
.build_about_page_from_df <- function(df) {
    bold_df <- df[df$face == "bold", , drop = FALSE]
    plain_df <- df[df$face == "plain", , drop = FALSE]
    p <- ggplot2::ggplot() +
        ggplot2::xlim(c(0, 10)) +
        ggplot2::ylim(c(-.ABOUT_LINES_PER_PAGE - 2L, 0)) +
        ggplot2::ggtitle("About This Report") +
        ggplot2::theme_void() +
        ggplot2::theme(plot.title = ggplot2::element_text(
            size = 14, face = "bold", hjust = 0.5,
            margin = ggplot2::margin(t = 8, b = 8)
        ))
    if (nrow(plain_df) > 0L) {
        p <- p + ggplot2::geom_text(
            data = plain_df,
            ggplot2::aes(x = 0, y = .data$y, label = .data$text),
            fontface = "plain", size = 2.8, hjust = 0, vjust = 1,
            colour = "#3c3c3c"
        )
    }
    if (nrow(bold_df) > 0L) {
        p <- p + ggplot2::geom_text(
            data = bold_df,
            ggplot2::aes(x = 0, y = .data$y, label = .data$text),
            fontface = "bold", size = 3.2, hjust = 0, vjust = 1,
            colour = "#1f1f50"
        )
    }
    p
}

#' @noRd
# Public entry point used by to_pdf_report: returns a list of ggplots
# (one per page) suitable for `print()` in sequence.
.build_about_pages <- function() {
    pages_data <- .about_pages_plan()
    lapply(pages_data, .build_about_page_from_df)
}

#' @noRd
# Back-compat shim: returns only the first About page as a single ggplot.
# Kept for tests and any external callers that expected the v2.2.2 shape.
.build_about_page <- function() {
    .build_about_pages()[[1L]]
}

#' Compose a multi-page PDF report from a RegionResult
#'
#' Writes a US Letter landscape PDF with overview, venn+upset, statistics
#' tables, and (by default) network and methodology pages. Each page has a
#' footer with package version, generation timestamp, and page number.
#'
#' @param result A [`RegionResult-class`].
#' @param path Output PDF file path.
#' @param title Optional title override for the overview page.
#' @param include_network If `TRUE` (default), include the network page.
#' @param include_about If `TRUE` (default), include the methodology page.
#' @return Invisibly returns `NULL`. The PDF is written to `path`.
#' @export
#' @examples
#' \donttest{
#' if (getRversion() >= "4.6") {
#'   result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#'   to_pdf_report(result, tempfile(fileext = ".pdf"))
#' }
#' }
to_pdf_report <- function(result, path, title = NULL,
                           include_network = TRUE, include_about = TRUE) {
    .warn_if_oldrel_complex_upset()
    pages <- list()
    pages[[length(pages) + 1L]] <- .build_overview_page(result, title = title)
    pages[[length(pages) + 1L]] <- .build_venn_upset_page(result)
    stat_pages <- .build_statistics_pages(result)
    for (p in stat_pages) pages[[length(pages) + 1L]] <- p
    if (isTRUE(include_network)) {
        pages[[length(pages) + 1L]] <- .build_network_page(result)
    }
    if (isTRUE(include_about)) {
        for (ap in .build_about_pages()) {
            pages[[length(pages) + 1L]] <- ap
        }
    }

    total <- length(pages)
    grDevices::pdf(path, width = .PDF_PAGE_WIDTH, height = .PDF_PAGE_HEIGHT)
    on.exit(grDevices::dev.off(), add = TRUE)

    for (i in seq_along(pages)) {
        print(pages[[i]])
        # Overlay the footer on the just-rendered page (does NOT trigger a new page).
        grid::grid.text(
            .pdf_footer_text(page_num = i, total_pages = total),
            x = 0.5, y = 0.02,
            gp = grid::gpar(fontsize = 8, col = "#888888")
        )
    }
    invisible(NULL)
}
