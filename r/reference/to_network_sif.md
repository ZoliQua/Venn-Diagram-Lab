# Write the Cytoscape SIF network export

Mirrors the React webapp's "SIF" Cytoscape export button + Python's
\`to_network_sif()\` byte-for-byte. One line per edge (in edge order),
tab-separated: source letter, the literal interaction type \`overlap\`,
then target letter. Isolated nodes (degree 0) are emitted as lone
single-token lines after all edges, in node order.

## Usage

``` r
to_network_sif(result, path)

# S4 method for class 'RegionResult'
to_network_sif(result, path)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- path:

  Destination file path.

## Value

Invisibly returns \`path\`.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
to_network_sif(result, tempfile(fileext = ".sif"))
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
to_network_sif(result, tempfile(fileext = ".sif"))
# }
```
