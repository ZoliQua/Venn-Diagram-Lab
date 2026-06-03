# Items in the intersection of the named sets

Returns items that appear in every set listed in \`sets\`, regardless of
whether they also appear in other (unlisted) sets. For "items in this
specific combination only", see \[exclusive_items()\].

## Usage

``` r
intersection_items(result, sets)
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
intersection_items(res, c("A", "B"))   # "y"
#> [1] "y"
```
