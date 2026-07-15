# Feature 4: data-quality warnings (R). See
# .superpowers/sdd/task-F4-r-report.md for the semantics writeup and the
# documented divergences from TS/Python (both driven by R's real loaders:
# no delimiter-splitting in aggregated mode; per-set-column duplicate
# scoring + blank-id row skip in binary mode).

test_that("aggregated: repeated item within a column is a duplicate", {
    headers <- c("SetA", "SetB")
    rows <- list(
        c("TP53", "X1"),
        c("TP53", "X2"),
        c("BRCA1", "X3")
    )
    report <- analyze_data_quality(headers, rows, mode = "aggregated")
    expect_length(report$duplicates_removed, 1L)
    dup <- report$duplicates_removed[[1L]]
    expect_equal(dup$column, 1L)
    expect_equal(dup$column_name, "SetA")
    expect_equal(dup$count, 1L)
    expect_equal(dup$examples, "TP53")
    expect_true(report$has_warnings)
})

test_that("aggregated: whitespace-only and empty cells are counted, not split", {
    headers <- c("SetA", "SetB")
    rows <- list(
        c("G1", "  "),
        c("", "G2"),
        c("G3", "G4")
    )
    report <- analyze_data_quality(headers, rows, mode = "aggregated")
    expect_equal(report$empty_cells_skipped, 2L)
    expect_length(report$duplicates_removed, 0L)
})

test_that("aggregated: whole cell is one item -- no delimiter splitting (R divergence)", {
    # Unlike TS (which splits on itemDelimiter), R's real
    # .aggregated_columns_to_dataset() has no splitting logic, so a
    # comma-containing cell is one literal item, not two.
    headers <- c("SetA")
    rows <- list(c("G1,G2"), c("G3"))
    report <- analyze_data_quality(headers, rows, mode = "aggregated")
    expect_length(report$duplicates_removed, 0L)
    expect_equal(report$empty_cells_skipped, 0L)
})

test_that("aggregated: TP53 vs tp53 across columns is a case collision, identity preserved", {
    headers <- c("SetA", "SetB")
    rows <- list(
        c("TP53", "other"),
        c("x", "tp53")
    )
    report <- analyze_data_quality(headers, rows, mode = "aggregated")
    expect_length(report$case_collisions, 1L)
    grp <- report$case_collisions[[1L]]
    expect_equal(grp$items, c("TP53", "tp53"))   # original case preserved, first-appearance order
    expect_true(report$has_warnings)
})

test_that("aggregated: clean data has no warnings", {
    headers <- c("SetA", "SetB")
    rows <- list(c("G1", "G3"), c("G2", "G4"))
    report <- analyze_data_quality(headers, rows, mode = "aggregated")
    expect_length(report$duplicates_removed, 0L)
    expect_equal(report$empty_cells_skipped, 0L)
    expect_length(report$case_collisions, 0L)
    expect_false(report$has_warnings)
})

test_that("binary: duplicate id truthy twice on the same set column is a duplicate", {
    headers <- c("item", "SetA", "SetB")
    rows <- list(
        c("g1", "1", "0"),
        c("g1", "1", "1"),
        c("g2", "0", "1")
    )
    report <- analyze_data_quality(headers, rows, mode = "binary", prefix_cols = 1L)
    expect_length(report$duplicates_removed, 1L)
    dup <- report$duplicates_removed[[1L]]
    expect_equal(dup$column, 2L)          # SetA is column 2 (1-based, after 1 prefix col)
    expect_equal(dup$column_name, "SetA")
    expect_equal(dup$count, 1L)
    expect_equal(dup$examples, "g1")
})

test_that("binary: same id truthy on different columns is NOT a duplicate (R per-column scoring)", {
    # Mirrors Python's documented divergence: R's loader stores membership
    # as one independent set() per target column (via unique()), so an id
    # that's truthy on SetA once and SetB once never collides -- no
    # information is silently lost by either column's unique().
    headers <- c("item", "SetA", "SetB")
    rows <- list(
        c("g1", "1", "0"),
        c("g1", "0", "1")
    )
    report <- analyze_data_quality(headers, rows, mode = "binary", prefix_cols = 1L)
    expect_length(report$duplicates_removed, 0L)
})

test_that("binary: blank identifier row is skipped entirely (not scored anywhere)", {
    headers <- c("item", "SetA", "SetB")
    rows <- list(
        c("g1", "1", "0"),
        c("  ", "1", "1"),     # blank id after trim -> skipped entirely
        c("g1", "1", "1")      # duplicate of g1 on SetA and SetB
    )
    report <- analyze_data_quality(headers, rows, mode = "binary", prefix_cols = 1L)
    # The blank-id row's cells ("1","1") are never scanned -- if they were,
    # SetB would show a duplicate from row 2 + row 3; since row 2 is
    # skipped, SetB has no duplicate (g1 appears truthy on SetB only once,
    # from row 3), and no empty cells are attributed to row 2 either.
    dup_cols <- vapply(report$duplicates_removed, function(d) d$column_name, character(1L))
    expect_true("SetA" %in% dup_cols)
    expect_false("SetB" %in% dup_cols)
    expect_equal(report$empty_cells_skipped, 0L)
})

test_that("binary: empty set-cells are counted only among non-blank-id rows", {
    headers <- c("item", "SetA", "SetB")
    rows <- list(
        c("g1", "", "1"),
        c("", "1", "1"),   # blank id -> entire row skipped, its blank cells don't count
        c("g2", "0", "")
    )
    report <- analyze_data_quality(headers, rows, mode = "binary", prefix_cols = 1L)
    expect_equal(report$empty_cells_skipped, 2L)   # g1/SetA and g2/SetB, not the blank-id row
})

test_that("binary: TP53 vs tp53 identifiers collide regardless of truthy column (R divergence)", {
    # R's item_order_seen is computed from ALL valid-id rows unconditionally
    # (not gated on any column being truthy), unlike TS's "contributing
    # rows only" gate -- so a case collision is reported even if one
    # spelling never appears truthy anywhere.
    headers <- c("item", "SetA", "SetB")
    rows <- list(
        c("TP53", "1", "0"),
        c("tp53", "0", "0")   # all-falsy row, still counted for case-collision scope
    )
    report <- analyze_data_quality(headers, rows, mode = "binary", prefix_cols = 1L)
    expect_length(report$case_collisions, 1L)
    expect_equal(report$case_collisions[[1L]]$items, c("TP53", "tp53"))
})

test_that("binary: clean data has no warnings", {
    headers <- c("item", "SetA", "SetB")
    rows <- list(c("g1", "1", "0"), c("g2", "0", "1"), c("g3", "1", "1"))
    report <- analyze_data_quality(headers, rows, mode = "binary", prefix_cols = 1L)
    expect_false(report$has_warnings)
})

test_that("item identity is never mutated -- original case preserved in examples/groups", {
    headers <- c("SetA")
    rows <- list(c("TP53"), c("TP53"), c("tp53"))
    report <- analyze_data_quality(headers, rows, mode = "aggregated")
    # Duplicate example keeps exact original casing.
    expect_equal(report$duplicates_removed[[1L]]$examples, "TP53")
    # Case-collision group keeps both original spellings, not a folded one.
    expect_setequal(report$case_collisions[[1L]]$items, c("TP53", "tp53"))
    expect_true(all(nchar(report$case_collisions[[1L]]$items) > 0))
})

test_that("validate_dataset() reads a file and emits an opt-in warning", {
    tmp <- tempfile(fileext = ".csv")
    on.exit(unlink(tmp))
    writeLines(c("Gene,SetA,SetB", "G1,1,0", "G1,1,1", "G2,0,1"), tmp)

    expect_warning(
        report <- validate_dataset(tmp, mode = "binary"),
        "Data quality"
    )
    expect_true(report$has_warnings)

    # warn = FALSE returns the same report silently.
    expect_no_warning(report2 <- validate_dataset(tmp, mode = "binary", warn = FALSE))
    expect_equal(report2, report)
})

test_that("validate_dataset() is silent for clean data", {
    tmp <- tempfile(fileext = ".csv")
    on.exit(unlink(tmp))
    writeLines(c("Gene,SetA,SetB", "G1,1,0", "G2,0,1", "G3,1,1"), tmp)

    expect_no_warning(report <- validate_dataset(tmp, mode = "binary"))
    expect_false(report$has_warnings)
})

test_that("load_csv() itself never warns (additive-only surfacing)", {
    tmp <- tempfile(fileext = ".csv")
    on.exit(unlink(tmp))
    writeLines(c("Gene,SetA,SetB", "G1,1,0", "G1,1,1", "G2,0,1"), tmp)
    expect_no_warning(ds <- load_csv(tmp, binary = TRUE))
    expect_s4_class(ds, "VennDataset")
})
