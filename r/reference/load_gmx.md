# Load a GMX file (transposed GMT) into a \[\`VennDataset-class\`\]

Row 0 = set names, row 1 = descriptions, rows 2+ = items column-aligned.

## Usage

``` r
load_gmx(path)
```

## Arguments

- path:

  Path to the .gmx file.

## Value

A \[\`VennDataset-class\`\].

## Examples

``` r
tmp <- tempfile(fileext = ".gmx")
writeLines(c("SetA\tSetB",
             "desc_A\tdesc_B",
             "GENE1\tGENE2",
             "GENE2\tGENE3"), tmp)
ds <- load_gmx(tmp)
length(ds@items)
#> [1] 2
```
