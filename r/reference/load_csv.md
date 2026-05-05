# Load a delimited file (CSV/TSV) into a \[\`VennDataset-class\`\]

Supports two layouts: \* Binary mode (default): one row per item, with
0/1 columns marking membership in each set. The first \`prefix_cols\`
columns are item metadata; remaining columns are sets. \* Aggregated
mode (\`binary = FALSE\`): each column is a set, and cells contain item
identifiers. Empty cells are ignored.

## Usage

``` r
load_csv(path, binary = TRUE, delimiter = NULL, prefix_cols = 1L)
```

## Arguments

- path:

  Path to the file.

- binary:

  \`TRUE\` for binary 0/1 mode (default), \`FALSE\` for aggregated.

- delimiter:

  Explicit delimiter override. \`NULL\` auto-detects from \`,\`, \`;\`,
  tab, and space.

- prefix_cols:

  Number of leading metadata columns in binary mode (default 1). Ignored
  when \`binary = FALSE\`.

## Value

A \[\`VennDataset-class\`\].

## Examples

``` r
tmp <- tempfile(fileext = ".csv")
writeLines(c("Gene,SetA,SetB", "G1,1,0", "G2,1,1", "G3,0,1"), tmp)
ds <- load_csv(tmp, binary = TRUE)
ds@set_names
#> [1] "SetA" "SetB"
```
