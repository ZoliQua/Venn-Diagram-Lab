# Tidy method for RegionResult (broom-compatible)

Returns a long-form table with one row per ordered set pair, combining
the five pairwise statistical metrics (Jaccard, Dice, overlap
coefficient, fold enrichment, hypergeometric p-value + BH-FDR-adjusted
q-value). Pair ordering is \`(set_a, set_b)\` with \`set_a\` appearing
earlier in \`result@dataset@set_names\`.

## Usage

``` r
# S3 method for class 'RegionResult'
tidy(x, ...)
```

## Arguments

- x:

  A \[\`RegionResult-class\`\].

- ...:

  Unused (broom convention).

## Value

A tibble (or data.frame if \`tibble\` is not installed) with columns
\`set_a\`, \`set_b\`, \`intersection\`, \`expected\`, \`jaccard\`,
\`dice\`, \`overlap_coefficient\`, \`fold_enrichment\`, \`p_value\`,
\`p_adjusted\`, \`significant\`, \`highly_significant\`. One row per
unordered pair, so \`n\*(n-1)/2\` rows for an \`n\`-set dataset.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
if (requireNamespace("broom", quietly = TRUE)) broom::tidy(result)
#> # A tibble: 1 × 12
#>   set_a set_b intersection expected jaccard  dice overlap_coefficient
#>   <chr> <chr>        <int>    <dbl>   <dbl> <dbl>               <dbl>
#> 1 A     B                1      0.4   0.333   0.5                 0.5
#> # ℹ 5 more variables: fold_enrichment <dbl>, p_value <dbl>, p_adjusted <dbl>,
#> #   significant <lgl>, highly_significant <lgl>
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
broom::tidy(result)
#> # A tibble: 6 × 12
#>   set_a      set_b      intersection expected jaccard  dice overlap_coefficient
#>   <chr>      <chr>             <int>    <dbl>   <dbl> <dbl>               <dbl>
#> 1 COSMIC_CGC OncoKB              581    35.8    0.472 0.641               1    
#> 2 COSMIC_CGC IntOGen             388    18.4    0.470 0.639               0.668
#> 3 OncoKB     IntOGen             477    39.0    0.344 0.512               0.754
#> 4 Vogelstein COSMIC_CGC          126     4.01   0.212 0.350               0.913
#> 5 Vogelstein IntOGen             123     4.37   0.190 0.319               0.891
#> 6 Vogelstein OncoKB              131     8.49   0.106 0.191               0.949
#> # ℹ 5 more variables: fold_enrichment <dbl>, p_value <dbl>, p_adjusted <dbl>,
#> #   significant <lgl>, highly_significant <lgl>
# }
```
