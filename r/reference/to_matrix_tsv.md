# Write the Item Matrix TSV

Mirrors the React webapp's "Export Matrix" button + Python's
\`RegionResult.to_matrix_tsv()\` byte-for-byte.

## Usage

``` r
to_matrix_tsv(result, path)

# S4 method for class 'RegionResult'
to_matrix_tsv(result, path)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- path:

  Destination file path.

## Value

Invisibly returns \`path\`.

## Details

Columns: Item, \<SetName1\>, \<SetName2\>, ..., Region. Rows: one per
item. Iteration order: mask 1..(2^n - 1); within each mask, items in
\`dataset@item_order\`.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
to_matrix_tsv(result, tempfile(fileext = ".tsv"))
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
to_matrix_tsv(result, tempfile(fileext = ".tsv"))
# }
```
