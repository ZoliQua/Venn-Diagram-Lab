#!/usr/bin/env Rscript
# Sync bundled assets from the repo-root models/ and data/ directories into
# r/inst/extdata/. Run this before R CMD build / install so the wheel ships
# with the 44 SVG templates + 44 region JSONs + 5 sample datasets.
#
# Parallel to python/scripts/sync_data.py — same source files, same destination
# semantics. Both scripts can run independently; running one does not affect
# the other.
#
# Usage (from repo root or anywhere — the script walks up to find package.json):
#   Rscript r/data-raw/sync_data.R

# Sample dataset registry — keep in sync with python/src/venn_diagram_lab/samples.py
# AND scripts/generate-parity-fixtures.mts SAMPLES table.
SAMPLE_FILES <- c(
    "dataset_mock_gene_sets.csv",
    "dataset_mock_streaming_platforms.csv",
    "dataset_real_cancer_drivers_4.tsv",
    "dataset_real_msigdb_cancer_pathways.tsv",
    "dataset_real_msigdb_immune_pathways.tsv"
)

# Walk up from the current working directory until we find package.json (the
# monorepo root marker). Robust to invocation from any subdirectory.
find_repo_root <- function() {
    dir <- normalizePath(getwd())
    repeat {
        if (file.exists(file.path(dir, "package.json"))) {
            return(dir)
        }
        parent <- dirname(dir)
        if (parent == dir) {
            stop("Could not find repo root (package.json marker)")
        }
        dir <- parent
    }
}

repo_root <- find_repo_root()
cat("Repo root:", repo_root, "\n")

models_src <- file.path(repo_root, "models")
data_src <- file.path(repo_root, "data")
extdata_dest <- file.path(repo_root, "r", "inst", "extdata")

stopifnot(dir.exists(models_src), dir.exists(data_src))

# Ensure destination structure.
for (sub in c("models/svg", "models/json", "samples")) {
    dest <- file.path(extdata_dest, sub)
    dir.create(dest, recursive = TRUE, showWarnings = FALSE)
}

# Copy 44 SVGs.
svg_files <- list.files(file.path(models_src, "svg"), pattern = "\\.svg$", full.names = TRUE)
n_svg <- 0L
for (src in svg_files) {
    dest <- file.path(extdata_dest, "models", "svg", basename(src))
    file.copy(src, dest, overwrite = TRUE)
    n_svg <- n_svg + 1L
}
cat(sprintf("Copied %d SVG models -> r/inst/extdata/models/svg/\n", n_svg))

# Copy 44 JSON region files.
json_files <- list.files(file.path(models_src, "json"), pattern = "\\.json$", full.names = TRUE)
n_json <- 0L
for (src in json_files) {
    dest <- file.path(extdata_dest, "models", "json", basename(src))
    file.copy(src, dest, overwrite = TRUE)
    n_json <- n_json + 1L
}
cat(sprintf("Copied %d JSON region files -> r/inst/extdata/models/json/\n", n_json))

# Copy 5 sample datasets.
n_sample <- 0L
for (fname in SAMPLE_FILES) {
    src <- file.path(data_src, fname)
    if (!file.exists(src)) {
        stop(sprintf("Missing sample file: %s", src))
    }
    dest <- file.path(extdata_dest, "samples", fname)
    file.copy(src, dest, overwrite = TRUE)
    n_sample <- n_sample + 1L
}
cat(sprintf("Copied %d sample datasets -> r/inst/extdata/samples/\n", n_sample))

# ---------------------------------------------------------------------------
# Phase 2 addition: copy parity fixtures from python/tests/fixtures/expected/
# ---------------------------------------------------------------------------
parity_src <- file.path(repo_root, "python", "tests", "fixtures", "expected")
parity_dst <- file.path(repo_root, "r", "tests", "testthat", "fixtures", "parity")
if (!dir.exists(parity_src)) {
    warning("Python parity fixtures not found at: ", parity_src,
            " — parity tests will skip. Run `npm run fixtures:parity` from repo root first.")
} else {
    dir.create(parity_dst, recursive = TRUE, showWarnings = FALSE)
    fixture_files <- list.files(parity_src, pattern = "\\.tsv$", full.names = TRUE)
    file.copy(fixture_files, parity_dst, overwrite = TRUE)
    cat(sprintf("Copied %d parity fixtures -> r/tests/testthat/fixtures/parity/\n",
                length(fixture_files)))
}

cat("Done.\n")
