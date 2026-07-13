# Unit tests for the JSON number-rendering + serializer helpers, mirroring the
# executable spec in packages/core/src/__tests__/jsonExport.test.ts. These pin
# the cross-language byte contract independent of the full parity fixtures.

test_that(".format_json_number renders integers without a decimal point", {
    expect_identical(.format_json_number(2), "2")
    expect_identical(.format_json_number(0), "0")
    expect_identical(.format_json_number(20000L), "20000")
    expect_identical(.format_json_number(1.0), "1")     # whole-valued float
})

test_that(".format_json_number strips trailing zeros for fractional values", {
    expect_identical(.format_json_number(0.5), "0.5")
    expect_identical(.format_json_number(1 / 3), "0.333333")
    expect_identical(.format_json_number(2.000000), "2")
})

test_that(".format_json_number never emits scientific notation in [1e-6, 1e-4)", {
    # These are the boundary values the goldens contain (Bonferroni etc.).
    expect_identical(.format_json_number(0.000083), "0.000083")
    expect_identical(.format_json_number(0.000713), "0.000713")
    expect_identical(.format_json_number(0.00001), "0.00001")
    expect_identical(.format_json_number(0.000001), "0.000001")
})

test_that(".format_json_number rounds sub-5e-7 values to 0", {
    expect_identical(.format_json_number(0.0000001), "0")
    expect_identical(.format_json_number(0.0000004), "0")
})

test_that(".format_json_number rounds to 6 decimals", {
    expect_identical(.format_json_number(2 / 3), "0.666667")   # rounds up
    expect_identical(.format_json_number(0.471974), "0.471974")
    expect_identical(.format_json_number(0.64128), "0.64128")  # golden dice value
})

test_that(".serialize mirrors JSON.stringify(obj, null, 2) layout", {
    obj <- list(a = "x", n = 2L, arr = as.list(c("A", "B")), empty = list())
    expected <- paste(
        "{",
        "  \"a\": \"x\",",
        "  \"n\": 2,",
        "  \"arr\": [",
        "    \"A\",",
        "    \"B\"",
        "  ],",
        "  \"empty\": []",
        "}",
        sep = "\n")
    expect_identical(.serialize(obj, ""), expected)
})

test_that(".serialize renders a single-element string array as an array", {
    expect_identical(.serialize(as.list("A"), ""),
                     "[\n  \"A\"\n]")
})
