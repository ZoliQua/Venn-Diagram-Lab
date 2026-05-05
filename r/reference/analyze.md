# Analyze a Venn diagram dataset

Compute the Venn region map for a \[\`VennDataset-class\`\] and bind it
to a model.

## Usage

``` r
analyze(dataset, model = "auto")
```

## Arguments

- dataset:

  A \[\`VennDataset-class\`\] (from one of the \`load\_\*\` functions).

- model:

  Model identifier. \`"auto"\` picks the canonical model for the
  dataset's set count (alphabetical first match), e.g. 4 sets -\>
  \`venn-4-set\`. \`"proportional"\` requests an area-proportional
  layout (only supports 2-3 sets, added in Phase 3). Otherwise pass an
  explicit name from \[list_models()\].

## Value

A \[\`RegionResult-class\`\] with the per-region item membership, set
sizes, and (lazily) \`statistics(result)\`.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
result@model
#> [1] "venn-2-set"
# \donttest{
ds <- load_sample("dataset_real_cancer_drivers_4")
result <- analyze(ds, model = "auto")
result@model
#> [1] "venn-4-set"
# }
```
