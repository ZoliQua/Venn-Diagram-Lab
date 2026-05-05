# Effective hypergeometric universe size for a RegionResult

Returns the universe N consistent with the web tool. Binary CSV/TSV
datasets get \`dataset@universe_size\` (= csv.rows.length, includes
all-zero rows); aggregated/GMT/GMX datasets fall back to
\`length(item_order)\` (= \|union of items\|).

## Usage

``` r
effective_universe(result)

# S4 method for class 'RegionResult'
effective_universe(result)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

## Value

Integer, the universe size N.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
effective_universe(result)
#> [1] 10
# \donttest{
ds <- load_sample("dataset_real_cancer_drivers_4")
result <- analyze(ds)
effective_universe(result)   # 20000 for binary cancer drivers sample
#> [1] 20000
# }
```
