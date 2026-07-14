# Parity tests for the one-vs-rest enrichment TSV against the React webapp's
# golden fixtures. Source of truth: python/tests/fixtures/expected/*__one_vs_rest.tsv,
# synced into r/tests/testthat/fixtures/parity/*__ovr.tsv by r/data-raw/sync_data.R.
#
# Mirrors the structure of test-parity-with-webapp.R (dataframe + strict byte
# modes; dataset_mock_streaming_platforms is xfail-strict for the same
# duplicate-title-row reason documented there and in the Python module
# docstring).

PAIRS <- list(
    list(sample = "dataset_real_cancer_drivers_4",        model = "venn-4-set"),
    list(sample = "dataset_real_msigdb_immune_pathways",  model = "venn-4-set"),
    list(sample = "dataset_real_msigdb_cancer_pathways",  model = "venn-5-set-grunbaum"),
    list(sample = "dataset_mock_gene_sets",               model = "venn-6-set"),
    list(sample = "dataset_mock_streaming_platforms",     model = "venn-8-set")
)

DUPLICATE_TITLE_SAMPLES <- "dataset_mock_streaming_platforms"

.parity_fixture_dir <- function() {
    testthat::test_path("fixtures", "parity")
}

.short_sample <- function(s) {
    sub("^dataset_", "", s)
}

.short_model <- function(m) {
    if (m == "venn-5-set-grunbaum") return("v5g")
    sub("^venn-(\\d+)-set$", "v\\1", m)
}

.ovr_fixture_path <- function(sample, model) {
    file.path(.parity_fixture_dir(),
              sprintf("%s__%s__ovr.tsv", .short_sample(sample), .short_model(model)))
}

.skip_if_no_parity_fixtures <- function() {
    if (!dir.exists(.parity_fixture_dir())) {
        skip("Parity fixtures not synced. Run `Rscript r/data-raw/sync_data.R`.")
    }
}

.compute_result <- function(sample, model) {
    ds <- load_sample(sample)
    analyze(ds, model = model)
}

for (pair in PAIRS) {
    local({
        sample <- pair$sample
        model  <- pair$model
        is_xfail <- sample %in% DUPLICATE_TITLE_SAMPLES

        test_that(sprintf("one_vs_rest parity (dataframe): %s", sample), {
            skip_on_cran()
            .skip_if_no_parity_fixtures()
            fixture <- .ovr_fixture_path(sample, model)
            skip_if_not(file.exists(fixture), paste("Missing fixture:", fixture))
            res <- .compute_result(sample, model)
            tmp <- tempfile(fileext = ".tsv"); on.exit(unlink(tmp))
            to_one_vs_rest_tsv(res, tmp)
            # read.delim's "incomplete final line" warning is a harmless R
            # buffering quirk triggered by these particular fixture sizes/no
            # trailing newline (by design — see .write_bytes); it does not
            # indicate a data problem, so it is suppressed here.
            actual_df   <- suppressWarnings(read.delim(tmp,     sep = "\t", stringsAsFactors = FALSE,
                                       quote = "", colClasses = "character", check.names = FALSE))
            expected_df <- suppressWarnings(read.delim(fixture, sep = "\t", stringsAsFactors = FALSE,
                                       quote = "", colClasses = "character", check.names = FALSE))
            if (is_xfail) {
                expect_failure(expect_equal(actual_df, expected_df))
            } else {
                expect_equal(actual_df, expected_df)
            }
        })

        test_that(sprintf("one_vs_rest parity (bytes): %s", sample), {
            skip_on_cran()
            .skip_if_no_parity_fixtures()
            fixture <- .ovr_fixture_path(sample, model)
            skip_if_not(file.exists(fixture), paste("Missing fixture:", fixture))
            res <- .compute_result(sample, model)
            tmp <- tempfile(fileext = ".tsv"); on.exit(unlink(tmp))
            to_one_vs_rest_tsv(res, tmp)
            actual_bytes   <- readBin(tmp,     "raw", n = file.info(tmp)$size)
            expected_bytes <- readBin(fixture, "raw", n = file.info(fixture)$size)
            if (is_xfail) {
                expect_failure(expect_equal(actual_bytes, expected_bytes))
            } else {
                expect_equal(actual_bytes, expected_bytes,
                             info = sprintf("Byte mismatch for %s/one_vs_rest", sample))
            }
        })
    })
}
