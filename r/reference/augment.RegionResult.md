# Augment method for RegionResult (broom-compatible)

Returns one row per item in the dataset's universe, with boolean columns
indicating set membership and a \`region_label\` column naming the exact
region (e.g. \`"A"\`, \`"AB"\`, \`"ABC"\`) the item belongs to. Item
ordering follows \`dataset@item_order\` (first-seen across all sets, JS
Set/Map semantics).

## Usage

``` r
# S3 method for class 'RegionResult'
augment(x, ...)
```

## Arguments

- x:

  A \[\`RegionResult-class\`\].

- ...:

  Unused (broom convention).

## Value

A tibble (or data.frame fallback) with \`nrow(out) ==
length(x@dataset@item_order)\` and columns: \`item\` (character), one
logical column per set (named after the set), \`region_label\`
(character).

## Details

Region labels use the package's positional letter convention (A-I),
matching the labels in \`RegionResult@regions\` and the bundled SVG
models, regardless of the dataset's \`set_names\`.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
if (requireNamespace("broom", quietly = TRUE)) broom::augment(result)
#> # A tibble: 3 × 4
#>   item  A     B     region_label
#>   <chr> <lgl> <lgl> <chr>       
#> 1 x     TRUE  FALSE A           
#> 2 y     TRUE  TRUE  AB          
#> 3 z     FALSE TRUE  B           
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
broom::augment(result)
#> # A tibble: 20,000 × 6
#>    item     Vogelstein COSMIC_CGC OncoKB IntOGen region_label
#>    <chr>    <lgl>      <lgl>      <lgl>  <lgl>   <chr>       
#>  1 A1CF     FALSE      FALSE      TRUE   FALSE   C           
#>  2 AAMP     FALSE      FALSE      TRUE   FALSE   C           
#>  3 ABCB1    FALSE      FALSE      TRUE   FALSE   C           
#>  4 ABCC3    FALSE      FALSE      TRUE   FALSE   C           
#>  5 ABCC4    FALSE      FALSE      FALSE  TRUE    D           
#>  6 ABI1     FALSE      TRUE       TRUE   FALSE   BC          
#>  7 ABL1     TRUE       TRUE       TRUE   TRUE    ABCD        
#>  8 ABL2     FALSE      TRUE       TRUE   TRUE    BCD         
#>  9 ABRAXAS1 FALSE      FALSE      TRUE   FALSE   C           
#> 10 ACACA    FALSE      FALSE      TRUE   FALSE   C           
#> # ℹ 19,990 more rows
# }
```
