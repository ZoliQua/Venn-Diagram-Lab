# Load a GMT (Gene Matrix Transposed) file into a \[\`VennDataset-class\`\]

Each line is one set:
\`set_name\<TAB\>description\<TAB\>item1\<TAB\>item2\<TAB\>...\`. Lines
with fewer than 3 tab-separated columns or empty set names are skipped.

## Usage

``` r
load_gmt(path)
```

## Arguments

- path:

  Path to the .gmt file.

## Value

A \[\`VennDataset-class\`\].

## Examples

``` r
tmp <- tempfile(fileext = ".gmt")
writeLines(c("SetA\tdesc\tGENE1\tGENE2\tGENE3",
             "SetB\tdesc\tGENE2\tGENE3\tGENE4"), tmp)
ds <- load_gmt(tmp)
ds@set_names
#> [1] "SetA" "SetB"
```
