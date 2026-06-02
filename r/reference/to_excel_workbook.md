# Write a 3-sheet Excel workbook matching the webtool's ZIP bundle

Sheets:

- `Jaccard` – NxN matrix of Jaccard indices.

- `Sorensen-Dice` (the actual sheet title uses the o-with-stroke
  character) – NxN matrix of Dice coefficients.

- `Enrichment` – long-form (`set_a`, `set_b`, `intersection`, `union`,
  `expected`, `fold_enrichment`, `p_value`, `fdr`, `significant`).

## Usage

``` r
to_excel_workbook(result, path)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\] from \[analyze()\].

- path:

  Output xlsx file path.

## Value

Invisibly returns \`NULL\`.

## Details

Mirrors the Python \`to_excel_workbook()\` byte-for-byte in sheet
titles, column order, and 4-decimal numeric formatting. Uses openxlsx
(pure R, no Java dependency).

## Examples

``` r
# \donttest{
ds <- load_sample("dataset_real_cancer_drivers_4")
res <- analyze(ds)
to_excel_workbook(res, tempfile(fileext = ".xlsx"))
# }
```
