# Parity tests against the React webapp's golden TSV fixtures.
# Source of truth: python/tests/fixtures/expected/, synced into
# r/tests/testthat/fixtures/parity/ by r/data-raw/sync_data.R.
#
# Strategy mirrors python/tests/test_parity_with_webapp.py:
# * 5 datasets x 3 export kinds (region_summary, matrix, statistics) = 15 fixtures
# * 2 modes: structural (read.delim cell-by-cell) + strict byte-for-byte
# * dataset_mock_streaming_platforms is xfail-strict (R uses expect_failure):
#   the webapp's row-based loader treats duplicate "Dark Matter" rows as 2
#   distinct items, but the R/Python set-based loader dedupes to 1. Documented
#   in the Python module docstring; out-of-scope to reconcile.

PAIRS <- list(
    list(sample = "dataset_real_cancer_drivers_4",        model = "venn-4-set"),
    list(sample = "dataset_real_msigdb_immune_pathways",  model = "venn-4-set"),
    list(sample = "dataset_real_msigdb_cancer_pathways",  model = "venn-5-set-grunbaum"),
    list(sample = "dataset_mock_gene_sets",               model = "venn-6-set"),
    list(sample = "dataset_mock_streaming_platforms",     model = "venn-8-set")
)

DUPLICATE_TITLE_SAMPLES <- "dataset_mock_streaming_platforms"

WRITER_BY_KIND <- list(
    region_summary = "to_region_summary_tsv",
    matrix         = "to_matrix_tsv",
    statistics     = "to_statistics_tsv"
)

.parity_fixture_dir <- function() {
    testthat::test_path("fixtures", "parity")
}

.parity_fixture_path <- function(sample, model, kind) {
    file.path(.parity_fixture_dir(),
              sprintf("%s__%s__%s.tsv", sample, model, kind))
}

.skip_if_no_parity_fixtures <- function() {
    if (!dir.exists(.parity_fixture_dir())) {
        skip("Parity fixtures not synced. Run `Rscript r/data-raw/sync_data.R`.")
    }
}

.write_actual <- function(result, kind, path) {
    writer <- WRITER_BY_KIND[[kind]]
    do.call(writer, list(result = result, path = path))
}

.compute_result <- function(sample, model) {
    ds <- load_sample(sample)
    analyze(ds, model = model)
}

# --- Region Summary parity tests -------------------------------------------

for (pair in PAIRS) {
    local({
        sample <- pair$sample
        model  <- pair$model
        is_xfail <- sample %in% DUPLICATE_TITLE_SAMPLES

        test_that(sprintf("region_summary parity (dataframe): %s", sample), {
            .skip_if_no_parity_fixtures()
            fixture <- .parity_fixture_path(sample, model, "region_summary")
            skip_if_not(file.exists(fixture), paste("Missing fixture:", fixture))
            res <- .compute_result(sample, model)
            tmp <- tempfile(fileext = ".tsv"); on.exit(unlink(tmp))
            .write_actual(res, "region_summary", tmp)
            actual_df   <- read.delim(tmp,     sep = "\t", stringsAsFactors = FALSE,
                                       quote = "", colClasses = "character", check.names = FALSE)
            expected_df <- read.delim(fixture, sep = "\t", stringsAsFactors = FALSE,
                                       quote = "", colClasses = "character", check.names = FALSE)
            if (is_xfail) {
                expect_failure(expect_equal(actual_df, expected_df))
            } else {
                expect_equal(actual_df, expected_df)
            }
        })

        test_that(sprintf("region_summary parity (bytes): %s", sample), {
            .skip_if_no_parity_fixtures()
            fixture <- .parity_fixture_path(sample, model, "region_summary")
            skip_if_not(file.exists(fixture), paste("Missing fixture:", fixture))
            res <- .compute_result(sample, model)
            tmp <- tempfile(fileext = ".tsv"); on.exit(unlink(tmp))
            .write_actual(res, "region_summary", tmp)
            actual_bytes   <- readBin(tmp,     "raw", n = file.info(tmp)$size)
            expected_bytes <- readBin(fixture, "raw", n = file.info(fixture)$size)
            if (is_xfail) {
                expect_failure(expect_equal(actual_bytes, expected_bytes))
            } else {
                expect_equal(actual_bytes, expected_bytes,
                             info = sprintf("Byte mismatch for %s/region_summary", sample))
            }
        })
    })
}

# --- Matrix parity tests ---------------------------------------------------

for (pair in PAIRS) {
    local({
        sample <- pair$sample
        model  <- pair$model
        is_xfail <- sample %in% DUPLICATE_TITLE_SAMPLES

        test_that(sprintf("matrix parity (dataframe): %s", sample), {
            .skip_if_no_parity_fixtures()
            fixture <- .parity_fixture_path(sample, model, "matrix")
            skip_if_not(file.exists(fixture), paste("Missing fixture:", fixture))
            res <- .compute_result(sample, model)
            tmp <- tempfile(fileext = ".tsv"); on.exit(unlink(tmp))
            .write_actual(res, "matrix", tmp)
            actual_df   <- read.delim(tmp,     sep = "\t", stringsAsFactors = FALSE,
                                       quote = "", colClasses = "character", check.names = FALSE)
            expected_df <- read.delim(fixture, sep = "\t", stringsAsFactors = FALSE,
                                       quote = "", colClasses = "character", check.names = FALSE)
            if (is_xfail) {
                expect_failure(expect_equal(actual_df, expected_df))
            } else {
                expect_equal(actual_df, expected_df)
            }
        })

        test_that(sprintf("matrix parity (bytes): %s", sample), {
            .skip_if_no_parity_fixtures()
            fixture <- .parity_fixture_path(sample, model, "matrix")
            skip_if_not(file.exists(fixture), paste("Missing fixture:", fixture))
            res <- .compute_result(sample, model)
            tmp <- tempfile(fileext = ".tsv"); on.exit(unlink(tmp))
            .write_actual(res, "matrix", tmp)
            actual_bytes   <- readBin(tmp,     "raw", n = file.info(tmp)$size)
            expected_bytes <- readBin(fixture, "raw", n = file.info(fixture)$size)
            if (is_xfail) {
                expect_failure(expect_equal(actual_bytes, expected_bytes))
            } else {
                expect_equal(actual_bytes, expected_bytes,
                             info = sprintf("Byte mismatch for %s/matrix", sample))
            }
        })
    })
}

# --- Statistics parity tests -----------------------------------------------

for (pair in PAIRS) {
    local({
        sample <- pair$sample
        model  <- pair$model
        is_xfail <- sample %in% DUPLICATE_TITLE_SAMPLES

        test_that(sprintf("statistics parity (dataframe): %s", sample), {
            .skip_if_no_parity_fixtures()
            fixture <- .parity_fixture_path(sample, model, "statistics")
            skip_if_not(file.exists(fixture), paste("Missing fixture:", fixture))
            res <- .compute_result(sample, model)
            tmp <- tempfile(fileext = ".tsv"); on.exit(unlink(tmp))
            .write_actual(res, "statistics", tmp)
            actual_df   <- read.delim(tmp,     sep = "\t", stringsAsFactors = FALSE,
                                       quote = "", colClasses = "character", check.names = FALSE)
            expected_df <- read.delim(fixture, sep = "\t", stringsAsFactors = FALSE,
                                       quote = "", colClasses = "character", check.names = FALSE)
            if (is_xfail) {
                expect_failure(expect_equal(actual_df, expected_df))
            } else {
                expect_equal(actual_df, expected_df)
            }
        })

        test_that(sprintf("statistics parity (bytes): %s", sample), {
            .skip_if_no_parity_fixtures()
            fixture <- .parity_fixture_path(sample, model, "statistics")
            skip_if_not(file.exists(fixture), paste("Missing fixture:", fixture))
            res <- .compute_result(sample, model)
            tmp <- tempfile(fileext = ".tsv"); on.exit(unlink(tmp))
            .write_actual(res, "statistics", tmp)
            actual_bytes   <- readBin(tmp,     "raw", n = file.info(tmp)$size)
            expected_bytes <- readBin(fixture, "raw", n = file.info(fixture)$size)
            if (is_xfail) {
                expect_failure(expect_equal(actual_bytes, expected_bytes))
            } else {
                expect_equal(actual_bytes, expected_bytes,
                             info = sprintf("Byte mismatch for %s/statistics", sample))
            }
        })
    })
}
