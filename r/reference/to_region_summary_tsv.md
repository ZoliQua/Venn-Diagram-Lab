# Write the Region Summary TSV

Mirrors the React webapp's "Export Region Summary" button + Python's
\`RegionResult.to_region_summary_tsv()\` byte-for-byte.

## Usage

``` r
to_region_summary_tsv(result, path)

# S4 method for class 'RegionResult'
to_region_summary_tsv(result, path)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- path:

  Destination file path.

## Value

Invisibly returns \`path\`.

## Details

Columns: Region, Sets, Depth, Exclusive_Count, Inclusive_Count,
Exclusive_Pct, Items. Rows: every region (1..2^n - 1). Sorted by (Depth
ASC, Region label ASC). Items: semicolon-joined, ordered by
\`dataset@item_order\`. Cells starting with \`=\`/\`+\`/\`-\`/\`@\`
(after optional leading whitespace) are escape-prefixed with a single
quote.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
to_region_summary_tsv(result, tempfile(fileext = ".tsv"))
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
to_region_summary_tsv(result, tempfile(fileext = ".tsv"))
# }
```
