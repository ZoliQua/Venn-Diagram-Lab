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

.ABOUT_TEXT <- paste0(
    "About this report\n",
    "\n",
    "Venn diagrams visualise overlap between sets. Each region represents a unique\n",
    "combination of set memberships; the count is the number of items present in\n",
    "exactly that combination.\n",
    "\n",
    "UpSet plots are an alternative to large-N Venn diagrams. The dot matrix shows\n",
    "set membership; bars on top show intersection sizes (in this report, the top\n",
    "20 by default).\n",
    "\n",
    "The set-relationship network represents sets as nodes (sized by inclusive\n",
    "cardinality) and pairwise overlaps as edges (thickness proportional to the\n",
    "chosen metric; blue for FDR-significant edges, grey otherwise).\n",
    "\n",
    "Pairwise statistics:\n",
    "  Jaccard index  = |A intersect B| / |A union B|\n",
    "  Sorensen-Dice  = 2 * |A intersect B| / (|A| + |B|)\n",
    "  Overlap coeff. = |A intersect B| / min(|A|, |B|)\n",
    "  Fold enrichment= (k * N) / (K * n)  where k=intersection, N=universe, K/n=set sizes\n",
    "  Hypergeometric p-value: probability of observing >= k overlap by chance under\n",
    "    Hypergeometric(N, K, n).\n",
    "  FDR: Benjamini-Hochberg step-up adjustment of the p-values.\n",
    "  Significance: *** if FDR < 0.001, ** if < 0.01, * if < 0.05, ns otherwise.\n",
    "\n",
    "Generated by vennDiagramLab (https://github.com/ZoliQua/Venn-Diagram-Lab)."
)

#' @noRd
.build_about_page <- function() {
    df <- data.frame(x = 0, y = 0, label = .ABOUT_TEXT, stringsAsFactors = FALSE)
    ggplot2::ggplot(df, ggplot2::aes(x = .data$x, y = .data$y)) +
        ggplot2::geom_text(ggplot2::aes(label = .data$label),
                            family = "mono", size = 3, hjust = 0, vjust = 1) +
        ggplot2::xlim(c(0, 10)) + ggplot2::ylim(c(-30, 1)) +
        ggplot2::theme_void()
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
        pages[[length(pages) + 1L]] <- .build_about_page()
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
