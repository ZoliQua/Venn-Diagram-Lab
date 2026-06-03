# Items exclusive to a specific set combination

Returns items in EXACTLY the combination of sets listed in \`sets\` —
that is, in every set in \`sets\` AND in none of the other sets in the
dataset.

## Usage

``` r
exclusive_items(result, sets)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\] from \[analyze()\].

- sets:

  Character vector of set letters (\`"A"\`, \`"B"\`, ...) or display
  names (values from \`result@dataset@set_names\`). May mix both.

## Value

A character vector of item IDs. Empty character if none.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B", "C"),
    items = list(A = c("x", "y"), B = c("y", "z"), C = c("z", "w")),
    item_order = c("x", "y", "z", "w"),
    universe_size = 10L, source_path = NULL, format = "csv")
res <- analyze(ds)
exclusive_items(res, c("A", "B"))   # "y"  (in A and B, not in C)
#> [1] "y"
```
