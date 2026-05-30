.fixture_path <- function() {
    p <- system.file("extdata", "samples", "dataset_real_cancer_drivers_4.tsv",
                     package = "vennDiagramLab")
    if (!nzchar(p) || !file.exists(p)) {
        p <- file.path(testthat::test_path(), "..", "..", "..",
                       "data", "dataset_real_cancer_drivers_4.tsv")
    }
    p
}

.skip_if_no_fixture <- function() {
    testthat::skip_if_not(file.exists(.fixture_path()),
                          "cancer drivers fixture not synced into inst/extdata/samples/")
}

test_that("render_share_distribution returns SvgImage with N bars", {
    .skip_if_no_fixture()
    ds <- load_tsv(.fixture_path(), binary = TRUE, prefix_cols = 1L)
    img <- render_share_distribution(ds)
    expect_true(inherits(img, "SvgImage"))
    expect_match(slot(img, "content"), "^<svg xmlns")
    bar_n <- length(gregexpr('class="sd-bar"', slot(img, "content"), fixed = TRUE)[[1L]])
    expect_equal(bar_n, 4L)
})

test_that("render_share_distribution emits 480x280 viewBox", {
    .skip_if_no_fixture()
    ds <- load_tsv(.fixture_path(), binary = TRUE, prefix_cols = 1L)
    img <- render_share_distribution(ds)
    expect_equal(slot(img, "width"), 480L)
    expect_equal(slot(img, "height"), 280L)
    expect_match(slot(img, "content"), 'viewBox="0 0 480 280"', fixed = TRUE)
})

test_that("render_cluster_heatmap includes dendrogram groups", {
    .skip_if_no_fixture()
    ds <- load_tsv(.fixture_path(), binary = TRUE, prefix_cols = 1L)
    res <- analyze(ds)
    img <- render_cluster_heatmap(res, linkage = "average")
    expect_true(inherits(img, "SvgImage"))
    expect_true(grepl("hm-dendro-col", slot(img, "content"), fixed = TRUE))
    expect_true(grepl("hm-dendro-row", slot(img, "content"), fixed = TRUE))
})

test_that("render_cluster_heatmap respects show flags", {
    .skip_if_no_fixture()
    ds <- load_tsv(.fixture_path(), binary = TRUE, prefix_cols = 1L)
    res <- analyze(ds)
    img <- render_cluster_heatmap(res, linkage = "average",
                                  show_row_dendrogram = FALSE,
                                  show_col_dendrogram = TRUE)
    expect_false(grepl("hm-dendro-row", slot(img, "content"), fixed = TRUE))
    expect_true(grepl("hm-dendro-col", slot(img, "content"), fixed = TRUE))
})

test_that("render_cluster_heatmap emits Jaccard cell values on a 4-set fixture", {
    .skip_if_no_fixture()
    ds <- load_tsv(.fixture_path(), binary = TRUE, prefix_cols = 1L)
    res <- analyze(ds)
    img <- render_cluster_heatmap(res, linkage = "average")
    # 16 cells total (4x4); 4 diagonal + 12 off-diagonal.
    diag_n <- length(gregexpr('data-diag="true"', slot(img, "content"), fixed = TRUE)[[1L]])
    expect_equal(diag_n, 4L)
})
