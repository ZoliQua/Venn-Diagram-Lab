test_that(".format_pdf_timestamp produces UTC timestamp without leading zero on day", {
    skip_on_cran()
    ts <- .format_pdf_timestamp()
    # Format: "D Month YYYY HH:MM:SS UTC" (1- or 2-digit day, no leading zero)
    expect_match(ts, "^[1-9][0-9]? [A-Z][a-z]+ [0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2} UTC$",
                 perl = TRUE)
})

test_that(".pdf_footer_text formats vdl version + timestamp + page numbers", {
    skip_on_cran()
    footer <- .pdf_footer_text(page_num = 2L, total_pages = 5L)
    # Should contain version, "Generated", "page 2 of 5"
    expect_match(footer, "vdl ", fixed = TRUE)
    expect_match(footer, "Generated", fixed = TRUE)
    expect_match(footer, "page 2 of 5", fixed = TRUE)
})

test_that(".overview_metadata_rows returns 11 (label, value) pairs", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = "test.csv", format = "csv"
    )
    res <- analyze(ds)
    rows <- .overview_metadata_rows(res)
    expect_type(rows, "list")
    expect_length(rows, 11L)
    # Each row is c(label, value)
    expect_equal(length(rows[[1L]]), 2L)
    # Date row
    expect_equal(rows[[1L]][1L], "Date")
    # Source file row
    expect_match(rows[[2L]][2L], "test.csv", fixed = TRUE)
    # Number of sets
    expect_equal(rows[[6L]][1L], "Number of sets")
    expect_equal(rows[[6L]][2L], "2")
})

test_that(".set_sizes_rows returns one row per set with 7 columns", {
    skip_on_cran()
    ds <- methods::new("VennDataset",
        set_names = c("Alpha", "Beta"),
        items = list(Alpha = c("g1", "g2"), Beta = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    out <- .set_sizes_rows(res)
    expect_named(out, c("rows", "truncated"))
    expect_length(out$rows, 2L)
    # Each row has 7 cols: Set, Name, Name (short), Size, Exclusive, Inclusive, %
    expect_equal(length(out$rows[[1L]]), 7L)
    expect_equal(out$rows[[1L]][1L], "A")        # letter
    expect_equal(out$rows[[1L]][2L], "Alpha")    # full name
})

test_that(".build_overview_page returns a patchwork/ggplot composition", {
    skip_on_cran()
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    page <- .build_overview_page(res)
    expect_true(inherits(page, "ggplot") || inherits(page, "patchwork"))
})

test_that(".build_venn_upset_page returns a patchwork composition", {
    skip_on_cran()
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    page <- .build_venn_upset_page(res)
    expect_true(inherits(page, "ggplot") || inherits(page, "patchwork"))
})

test_that(".pair_rows returns one row per pair with derived stats", {
    skip_on_cran()
    ds <- methods::new("VennDataset",
        set_names = c("A", "B", "C"),
        items = list(A = c("x", "y"), B = c("y", "z"), C = c("z", "w")),
        item_order = c("x", "y", "z", "w"),
        universe_size = 100L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    rows <- .pair_rows(res)
    # 3 pairs (n choose 2)
    expect_length(rows, 3L)
    # Each row has 11 fields
    expect_named(rows[[1L]], c("pair", "intersection", "union", "jaccard",
                                "overlap", "dice", "expected", "fold_enrichment",
                                "p_value", "fdr", "sig"))
})

test_that(".sig_label returns ***/**/*/ns based on FDR thresholds", {
    skip_on_cran()
    expect_equal(.sig_label(0.0005), "***")
    expect_equal(.sig_label(0.005),  "**")
    expect_equal(.sig_label(0.04),   "*")
    expect_equal(.sig_label(0.5),    "ns")
})

test_that(".build_statistics_pages returns at least one ggplot/patchwork", {
    skip_on_cran()
    ds <- methods::new("VennDataset",
        set_names = c("A", "B", "C"),
        items = list(A = c("x", "y"), B = c("y", "z"), C = c("z", "w")),
        item_order = c("x", "y", "z", "w"),
        universe_size = 100L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    pages <- .build_statistics_pages(res)
    expect_type(pages, "list")
    expect_true(length(pages) >= 1L)
    expect_true(all(vapply(pages,
        function(p) inherits(p, "ggplot") || inherits(p, "patchwork"),
        logical(1L))))
})

test_that(".build_network_page returns a ggplot/patchwork", {
    skip_on_cran()
    ds <- methods::new("VennDataset",
        set_names = c("A", "B", "C"),
        items = list(A = c("x", "y"), B = c("y", "z"), C = c("z", "w")),
        item_order = c("x", "y", "z", "w"),
        universe_size = 100L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    page <- .build_network_page(res)
    expect_true(inherits(page, "ggplot") || inherits(page, "patchwork"))
})

test_that(".build_about_page returns a ggplot containing methodology text", {
    skip_on_cran()
    page <- .build_about_page()
    expect_true(inherits(page, "ggplot"))
})

test_that(".build_about_pages returns a non-empty list of ggplots", {
    skip_on_cran()
    pages <- .build_about_pages()
    expect_type(pages, "list")
    expect_true(length(pages) >= 1L)
    expect_true(all(vapply(pages, function(p) inherits(p, "ggplot"),
                            logical(1L))))
})

test_that(".ABOUT_SECTIONS includes the v2.2.3 Credits and Cite footer", {
    titles <- vapply(.ABOUT_SECTIONS, function(s) s$title, character(1L))
    expect_true("Credits and Cite" %in% titles)
    expect_true("Venn Diagram Lab" %in% titles)
    expect_true("Plots" %in% titles)
    expect_true("Statistics" %in% titles)
    credits <- .ABOUT_SECTIONS[[which(titles == "Credits and Cite")]]
    # Body must mention the Zenodo DOI verbatim.
    expect_true(grepl("10.5281/zenodo.19510813", credits$body, fixed = TRUE))
    # Body must mention the web tool URL.
    expect_true(grepl("venndiagramlab.org", credits$body, fixed = TRUE))
})

test_that("to_pdf_report PDF text contains the Credits and Cite section", {
    skip_on_cran()
    skip_if_not_installed("pdftools")
    skip_if(getRversion() < "4.6", "PDF integration tests require R >= 4.6 (patchwork+ComplexUpset+ggplot2 interaction breaks on older R)")
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".pdf")
    on.exit(unlink(tmp))
    to_pdf_report(res, tmp)
    text <- paste(pdftools::pdf_text(tmp), collapse = "\n")
    expect_match(text, "Credits and Cite", fixed = TRUE)
    expect_match(text, "10.5281/zenodo.19510813", fixed = TRUE)
})

# ---------------------------------------------------------------------------
# to_pdf_report integration tests (C1)
# ---------------------------------------------------------------------------

test_that("to_pdf_report writes a PDF file at the given path", {
    skip_on_cran()
    skip_if_not_installed("pdftools")
    skip_if(getRversion() < "4.6", "PDF integration tests require R >= 4.6 (patchwork+ComplexUpset+ggplot2 interaction breaks on older R)")
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".pdf")
    on.exit(unlink(tmp))
    to_pdf_report(res, tmp)
    expect_true(file.exists(tmp))
    expect_gt(file.info(tmp)$size, 1000L)
})

test_that("to_pdf_report produces a PDF with expected page count", {
    skip_on_cran()
    skip_if_not_installed("pdftools")
    skip_if(getRversion() < "4.6", "PDF integration tests require R >= 4.6 (patchwork+ComplexUpset+ggplot2 interaction breaks on older R)")
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".pdf")
    on.exit(unlink(tmp))
    to_pdf_report(res, tmp)
    info <- pdftools::pdf_info(tmp)
    # Default: overview + venn+upset + statistics(1, n<=4) + network + about (1+ pages).
    # v2.2.3 unified About+Credits text may paginate to 2-3 pages, so allow >= 5.
    expect_gte(info$pages, 5L)
})

test_that("to_pdf_report omits network/about pages when flags are FALSE", {
    skip_on_cran()
    skip_if_not_installed("pdftools")
    skip_if(getRversion() < "4.6", "PDF integration tests require R >= 4.6 (patchwork+ComplexUpset+ggplot2 interaction breaks on older R)")
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".pdf")
    on.exit(unlink(tmp))
    to_pdf_report(res, tmp, include_network = FALSE, include_about = FALSE)
    info <- pdftools::pdf_info(tmp)
    # overview + venn+upset + statistics = 3 pages
    expect_equal(info$pages, 3L)
})

test_that("to_pdf_report PDF text contains the footer 'page 1 of'", {
    skip_on_cran()
    skip_if_not_installed("pdftools")
    skip_if(getRversion() < "4.6", "PDF integration tests require R >= 4.6 (patchwork+ComplexUpset+ggplot2 interaction breaks on older R)")
    ds <- methods::new("VennDataset",
        set_names = c("Alpha", "Beta"),
        items = list(Alpha = c("g1", "g2"), Beta = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 3L, source_path = NULL, format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".pdf")
    on.exit(unlink(tmp))
    to_pdf_report(res, tmp)
    text <- pdftools::pdf_text(tmp)
    page1 <- text[1L]
    expect_match(page1, "page 1 of", fixed = TRUE)
    expect_match(page1, "vdl ", fixed = TRUE)
    expect_match(page1, "Generated", fixed = TRUE)
    # Set names rendered on overview page
    expect_match(page1, "Alpha", fixed = TRUE)
})

test_that("to_pdf_report works on bundled cancer drivers sample", {
    skip_on_cran()
    skip_if_not_installed("pdftools")
    skip_if(getRversion() < "4.6", "PDF integration tests require R >= 4.6 (patchwork+ComplexUpset+ggplot2 interaction breaks on older R)")
    skip_if_not(file.exists(system.file("extdata", "samples",
                                          "dataset_real_cancer_drivers_4.tsv",
                                          package = "vennDiagramLab")),
                "extdata/samples not synced")
    res <- analyze(load_sample("dataset_real_cancer_drivers_4"))
    tmp <- tempfile(fileext = ".pdf")
    on.exit(unlink(tmp))
    to_pdf_report(res, tmp)
    info <- pdftools::pdf_info(tmp)
    # 4 sets: overview + venn+upset + statistics(1) + network + about (1+ pages).
    # v2.2.3 unified About+Credits text may paginate to 2-3 pages, so allow >= 5.
    expect_gte(info$pages, 5L)
})
