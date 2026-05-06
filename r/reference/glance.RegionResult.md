# Glance method for RegionResult (broom-compatible)

Returns a 1-row tibble summarizing the analysis: number of sets, number
of non-empty regions, total unique items, hypergeometric universe size,
resolved model name, whether the layout is approximate (proportional
3-set), and the count of statistically significant / highly significant
pairs (FDR-adjusted q \< 0.05 / \< 0.001).

## Usage

``` r
# S3 method for class 'RegionResult'
glance(x, ...)
```

## Arguments

- x:

  A \[\`RegionResult-class\`\].

- ...:

  Unused (broom convention).

## Value

A 1-row tibble (or data.frame fallback) with columns: \`n_sets\`,
\`n_regions\`, \`n_items\`, \`universe_size\`, \`model\`,
\`is_approximate\`, \`n_significant\`, \`n_highly_significant\`.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
if (requireNamespace("broom", quietly = TRUE)) broom::glance(result)
#> # A tibble: 1 × 8
#>   n_sets n_regions n_items universe_size model      is_approximate n_significant
#>    <int>     <int>   <int>         <int> <chr>      <lgl>                  <int>
#> 1      2         3       3            10 venn-2-set FALSE                      0
#> # ℹ 1 more variable: n_highly_significant <int>
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
broom::glance(result)
#> # A tibble: 1 × 8
#>   n_sets n_regions n_items universe_size model      is_approximate n_significant
#>    <int>     <int>   <int>         <int> <chr>      <lgl>                  <int>
#> 1      4        15   20000         20000 venn-4-set FALSE                      6
#> # ℹ 1 more variable: n_highly_significant <int>
# }
```
