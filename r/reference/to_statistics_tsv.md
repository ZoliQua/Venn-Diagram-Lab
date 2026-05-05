# Write the pairwise Statistics TSV

Mirrors the React webapp's DataSummaryPanel "Export Statistics" button +
Python's \`RegionResult.to_statistics_tsv()\` byte-for-byte.

## Usage

``` r
to_statistics_tsv(result, path)

# S4 method for class 'RegionResult'
to_statistics_tsv(result, path)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- path:

  Destination file path.

## Value

Invisibly returns \`path\`.

## Details

Columns: Set_A, Set_B, Name_A, Name_B, Size_A, Size_B, Intersection,
Union, Jaccard, Overlap_Coeff, Dice, Expected, Fold_Enrichment, P_value,
FDR, Significant. Float formatting: \* Jaccard / Overlap_Coeff / Dice: 4
decimals via \[.js_to_fixed()\] \* Expected: 2 decimals \*
Fold_Enrichment: 3 decimals \* P_value / FDR: scientific (JS
toExponential(2)) if \`\< 0.001\`, else 6 decimals \* Significant: one
of \`"\*\*\*"\`, \`"\*\*"\`, \`"\*"\`, \`"ns"\` keyed off FDR thresholds
(0.001, 0.01, 0.05).

Rows are sorted by P_value ascending (matches the underlying
StatisticsResult).

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
to_statistics_tsv(result, tempfile(fileext = ".tsv"))
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
to_statistics_tsv(result, tempfile(fileext = ".tsv"))
# }
```
