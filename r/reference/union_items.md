# Items in the union of the named sets

Returns items that appear in ANY of the sets listed in \`sets\`.
Equivalent to \`unique(c(items_in_A, items_in_B, ...))\`.

## Usage

``` r
union_items(result, sets)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\] from \[analyze()\].

- sets:

  Character vector of set letters (\`"A"\`, \`"B"\`, ...) or display
  names (values from \`result@dataset@set_names\`). May mix both.

## Value

A character vector of item IDs (deduplicated, first-seen order).

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B", "C"),
    items = list(A = c("x", "y"), B = c("y", "z"), C = c("z", "w")),
    item_order = c("x", "y", "z", "w"),
    universe_size = 10L, source_path = NULL, format = "csv")
res <- analyze(ds)
union_items(res, c("A", "B"))   # "x", "y", "z"
#> [1] "x" "y" "z"
```
