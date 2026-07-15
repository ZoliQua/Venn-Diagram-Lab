# Load a CSV/TSV file and report data-quality issues, with an opt-in warning

Convenience wrapper around \[\`analyze_data_quality()\`\] that reads and
parses a file the same way \[\`load_csv()\`\] does (auto-detecting the
delimiter unless overridden), \*\*without\*\* building a
\`VennDataset\`. This is the opt-in surface for data-quality feedback:
\[\`load_csv()\`\] / \[\`load_tsv()\`\] themselves never emit warnings
and are unchanged by this function's existence.

## Usage

``` r
validate_dataset(
  path,
  mode = c("binary", "aggregated"),
  delimiter = NULL,
  prefix_cols = 1L,
  warn = TRUE
)
```

## Arguments

- path:

  Path to the file.

- mode:

  \`"binary"\` (default) or \`"aggregated"\`.

- delimiter:

  Explicit delimiter override. \`NULL\` auto-detects, same as
  \[\`load_csv()\`\].

- prefix_cols:

  Number of leading metadata columns in binary mode (default 1). Only
  column 1 is ever read as the item identifier, matching
  \`.binary_columns_to_dataset()\`. Ignored when \`mode =
  "aggregated"\`.

- warn:

  If \`TRUE\` (default) and the report has any findings, emits a single
  \`warning()\` summarizing the counts. Set \`FALSE\` to only get the
  returned report silently.

## Value

The \`analyze_data_quality()\` report list, returned in addition to (not
instead of) any \`warning()\` raised.

## Examples

``` r
tmp <- tempfile(fileext = ".csv")
writeLines(c("Gene,SetA,SetB", "G1,1,0", "G1,1,1", "G2,0,1"), tmp)
report <- validate_dataset(tmp, mode = "binary")
#> Warning: Data quality: 1 duplicate item occurrence(s) across 1 column(s) (in '/tmp/Rtmpn1TTVe/file1bb41dba1a45.csv')
report$has_warnings
#> [1] TRUE
```
