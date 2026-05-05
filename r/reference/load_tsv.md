# Load a tab-separated file into a \[\`VennDataset-class\`\]

Equivalent to \`load_csv(path, binary = binary, delimiter = "\t",
prefix_cols = prefix_cols)\`.

## Usage

``` r
load_tsv(path, binary = TRUE, prefix_cols = 1L)
```

## Arguments

- path:

  Path to the file.

- binary:

  \`TRUE\` for binary 0/1 mode (default), \`FALSE\` for aggregated.

- prefix_cols:

  Number of leading metadata columns in binary mode (default 1). Ignored
  when \`binary = FALSE\`.

## Value

A \[\`VennDataset-class\`\].

## Examples

``` r
tmp <- tempfile(fileext = ".tsv")
writeLines(c("Gene\tSetA\tSetB", "G1\t1\t0", "G2\t1\t1", "G3\t0\t1"), tmp)
ds <- load_tsv(tmp, binary = TRUE)
ds@universe_size
#> [1] 3
```
