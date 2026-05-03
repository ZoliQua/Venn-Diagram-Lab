# This file is the standard testthat entry point. R CMD check runs it via
# tools::testInstalledPackage(). Tests live under tests/testthat/test-*.R and
# follow the testthat 3rd-edition conventions (Config/testthat/edition: 3 in
# DESCRIPTION).

library(testthat)
library(vennDiagramLab)

test_check("vennDiagramLab")
