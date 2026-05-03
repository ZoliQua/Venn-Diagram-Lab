test_that("vdl_version returns a character string", {
    v <- vdl_version()
    expect_type(v, "character")
    expect_length(v, 1L)
    expect_match(v, "^[0-9]+\\.[0-9]+")
})

test_that("vdl_version matches DESCRIPTION", {
    expected <- as.character(utils::packageVersion("vennDiagramLab"))
    expect_identical(vdl_version(), expected)
})
