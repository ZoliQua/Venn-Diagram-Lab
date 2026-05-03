test_that(".escape_spreadsheet_cell prefixes formula characters with single quote", {
    # Direct formula characters
    expect_equal(.escape_spreadsheet_cell("=SUM(A1)"), "'=SUM(A1)")
    expect_equal(.escape_spreadsheet_cell("+1"),       "'+1")
    expect_equal(.escape_spreadsheet_cell("-1"),       "'-1")
    expect_equal(.escape_spreadsheet_cell("@cmd"),     "'@cmd")
    # With leading whitespace (tab, space, CR)
    expect_equal(.escape_spreadsheet_cell("\t=A1"),    "'\t=A1")
    expect_equal(.escape_spreadsheet_cell(" =A1"),     "' =A1")
    expect_equal(.escape_spreadsheet_cell("\r=A1"),    "'\r=A1")
})

test_that(".escape_spreadsheet_cell leaves safe values unchanged", {
    expect_equal(.escape_spreadsheet_cell("hello"), "hello")
    expect_equal(.escape_spreadsheet_cell(""),       "")
    expect_equal(.escape_spreadsheet_cell("123"),    "123")
    expect_equal(.escape_spreadsheet_cell("a=b"),    "a=b")     # not at start
    expect_equal(.escape_spreadsheet_cell("foo bar"), "foo bar")
})

test_that(".js_to_fixed matches JS Number.prototype.toFixed for non-negative values", {
    # Common cases
    expect_equal(.js_to_fixed(1.5,   2), "1.50")
    expect_equal(.js_to_fixed(0.0,   2), "0.00")
    expect_equal(.js_to_fixed(123.456, 2), "123.46")
    expect_equal(.js_to_fixed(0.1,   4), "0.1000")

    # JS half-up tie break (Python with ROUND_HALF_UP gives the same)
    expect_equal(.js_to_fixed(0.03125, 4), "0.0313")    # JS rounds half up
    expect_equal(.js_to_fixed(0.5,     0), "1")          # JS half up

    # JS quirk: 2.795 stored as IEEE 754 is 2.7949999... so toFixed(2) = "2.79"
    expect_equal(.js_to_fixed(2.795, 2), "2.79")

    # Pseudo-statistics values
    expect_equal(.js_to_fixed(0.4720,  4), "0.4720")
    expect_equal(.js_to_fixed(35.7634, 2), "35.76")
    expect_equal(.js_to_fixed(16.247,  3), "16.247")
})

test_that(".js_to_fixed handles NaN", {
    expect_equal(.js_to_fixed(NaN, 2), "NaN")
})

test_that(".js_to_fixed handles digits = 0", {
    expect_equal(.js_to_fixed(3.7, 0), "4")
    expect_equal(.js_to_fixed(3.4, 0), "3")
    expect_equal(.js_to_fixed(0.5, 0), "1")
})

test_that(".js_to_exponential_2 matches JS Number.prototype.toExponential(2)", {
    # Zero
    expect_equal(.js_to_exponential_2(0),     "0.00e+0")
    expect_equal(.js_to_exponential_2(0.0),   "0.00e+0")

    # Positive exponents
    expect_equal(.js_to_exponential_2(1.23),       "1.23e+0")
    expect_equal(.js_to_exponential_2(123),        "1.23e+2")
    expect_equal(.js_to_exponential_2(1.234e10),   "1.23e+10")

    # Negative exponents (no zero-pad — key difference vs Python f"{x:.2e}")
    expect_equal(.js_to_exponential_2(0.001),       "1.00e-3")
    expect_equal(.js_to_exponential_2(1.23e-5),     "1.23e-5")
    expect_equal(.js_to_exponential_2(6.75e-184),   "6.75e-184")
})

test_that(".js_to_exponential_2 handles mantissa overflow on rounding", {
    # 9.999 rounds up to 10.00 -> normalise to 1.00e+next
    expect_equal(.js_to_exponential_2(9.999),       "1.00e+1")
})

test_that(".js_to_exponential_2 handles negative values", {
    expect_equal(.js_to_exponential_2(-1.23),       "-1.23e+0")
    expect_equal(.js_to_exponential_2(-1.23e-5),    "-1.23e-5")
})

test_that(".js_to_exponential_2 handles NaN", {
    expect_equal(.js_to_exponential_2(NaN), "NaN")
})

test_that("to_region_summary_tsv writes a 2-set toy result with correct header + rows", {
    ds <- methods::new("VennDataset",
        set_names = c("Alpha", "Beta"),
        items = list(Alpha = c("g1", "g2", "g3"), Beta = c("g3", "g4")),
        item_order = c("g1", "g2", "g3", "g4"),
        universe_size = 4L,
        source_path = NULL,
        format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".tsv")
    on.exit(unlink(tmp))
    to_region_summary_tsv(res, tmp)

    lines <- readLines(tmp, warn = FALSE)
    expect_equal(lines[1L],
                 "Region\tSets\tDepth\tExclusive_Count\tInclusive_Count\tExclusive_Pct\tItems")
    # Mask 1 = A only = {g1, g2}; depth 1; exclusive 2; inclusive 3
    expect_equal(lines[2L], "A\tAlpha\t1\t2\t3\t50.00\tg1;g2")
    # Mask 2 = B only = {g4}; depth 1; exclusive 1; inclusive 2
    expect_equal(lines[3L], "B\tBeta\t1\t1\t2\t25.00\tg4")
    # Mask 3 = AB = {g3}; depth 2; exclusive 1; inclusive 1
    expect_equal(lines[4L], "AB\tAlpha ∩ Beta\t2\t1\t1\t25.00\tg3")
    # No trailing newline
    raw <- readBin(tmp, "raw", n = file.info(tmp)$size)
    expect_false(raw[length(raw)] == as.raw(0x0a))
})

test_that("to_region_summary_tsv escapes formula-leading items + set names", {
    ds <- methods::new("VennDataset",
        set_names = c("=danger", "Beta"),
        items = list(`=danger` = c("=evil"), Beta = c("safe")),
        item_order = c("=evil", "safe"),
        universe_size = 2L,
        source_path = NULL,
        format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".tsv")
    on.exit(unlink(tmp))
    to_region_summary_tsv(res, tmp)

    lines <- readLines(tmp, warn = FALSE)
    # Set name "=danger" must be escape-prefixed in the Sets column
    expect_match(lines[2L], "'=danger", fixed = TRUE)
    # Item "=evil" must be escape-prefixed in the Items column
    expect_match(lines[2L], "'=evil",  fixed = TRUE)
})

test_that("to_matrix_tsv writes one row per item with set membership + region label", {
    ds <- methods::new("VennDataset",
        set_names = c("Alpha", "Beta"),
        items = list(Alpha = c("g1", "g2", "g3"), Beta = c("g3", "g4")),
        item_order = c("g1", "g2", "g3", "g4"),
        universe_size = 4L,
        source_path = NULL,
        format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".tsv")
    on.exit(unlink(tmp))
    to_matrix_tsv(res, tmp)

    lines <- readLines(tmp, warn = FALSE)
    expect_equal(lines[1L], "Item\tAlpha\tBeta\tRegion")
    # Mask 1 (A only): g1, g2 in item_order; mask 2 (B only): g4; mask 3 (AB): g3
    expect_equal(lines[2L], "g1\t1\t0\tA")
    expect_equal(lines[3L], "g2\t1\t0\tA")
    expect_equal(lines[4L], "g4\t0\t1\tB")
    expect_equal(lines[5L], "g3\t1\t1\tAB")
    expect_length(lines, 5L)
})

test_that("to_matrix_tsv escapes formula-leading set names + items", {
    ds <- methods::new("VennDataset",
        set_names = c("=danger", "Beta"),
        items = list(`=danger` = c("=evil"), Beta = c("safe")),
        item_order = c("=evil", "safe"),
        universe_size = 2L,
        source_path = NULL,
        format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".tsv")
    on.exit(unlink(tmp))
    to_matrix_tsv(res, tmp)

    lines <- readLines(tmp, warn = FALSE)
    expect_equal(lines[1L], "Item\t'=danger\tBeta\tRegion")   # set name escaped in header
    expect_match(lines[2L], "^'=evil\\t",  perl = TRUE)        # item escaped in row
})

test_that("to_statistics_tsv writes the 16-column header", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 100L,
        source_path = NULL,
        format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".tsv")
    on.exit(unlink(tmp))
    to_statistics_tsv(res, tmp)

    lines <- readLines(tmp, warn = FALSE)
    expect_equal(lines[1L], paste(c(
        "Set_A", "Set_B", "Name_A", "Name_B", "Size_A", "Size_B",
        "Intersection", "Union", "Jaccard", "Overlap_Coeff", "Dice",
        "Expected", "Fold_Enrichment", "P_value", "FDR", "Significant"
    ), collapse = "\t"))
    # 1 pair = 1 data row
    expect_length(lines, 2L)
})

test_that("to_statistics_tsv formats float columns with JS-style precision", {
    ds <- methods::new("VennDataset",
        set_names = c("A", "B"),
        items = list(A = c("g1", "g2"), B = c("g2", "g3")),
        item_order = c("g1", "g2", "g3"),
        universe_size = 100L,
        source_path = NULL,
        format = "csv"
    )
    res <- analyze(ds)
    tmp <- tempfile(fileext = ".tsv")
    on.exit(unlink(tmp))
    to_statistics_tsv(res, tmp)

    lines <- readLines(tmp, warn = FALSE)
    fields <- strsplit(lines[2L], "\t", fixed = TRUE)[[1L]]
    # Letters
    expect_equal(fields[1L], "A")
    expect_equal(fields[2L], "B")
    # Names
    expect_equal(fields[3L], "A")
    expect_equal(fields[4L], "B")
    # Size_A=2, Size_B=2, Intersection=1, Union=3
    expect_equal(fields[5L], "2"); expect_equal(fields[6L], "2")
    expect_equal(fields[7L], "1"); expect_equal(fields[8L], "3")
    # Jaccard / Overlap_Coeff / Dice = 4 decimals
    expect_match(fields[9L],  "^[0-9]+\\.[0-9]{4}$")
    expect_match(fields[10L], "^[0-9]+\\.[0-9]{4}$")
    expect_match(fields[11L], "^[0-9]+\\.[0-9]{4}$")
    # Expected = 2 decimals
    expect_match(fields[12L], "^[0-9]+\\.[0-9]{2}$")
    # Fold_Enrichment = 3 decimals
    expect_match(fields[13L], "^[0-9]+\\.[0-9]{3}$")
    # P_value / FDR: 6 decimals when >= 0.001 OR JS exponential when < 0.001
    expect_true(grepl("^[0-9]+\\.[0-9]{6}$", fields[14L]) ||
                grepl("^[0-9]+\\.[0-9]{2}e[-+][0-9]+$", fields[14L]))
    # Significant in {***, **, *, ns}
    expect_true(fields[16L] %in% c("***", "**", "*", "ns"))
})
