# Write the Cytoscape GraphML network export

Mirrors the React webapp's "GraphML" Cytoscape export button + Python's
\`to_network_graphml()\` byte-for-byte. Nodes are sets (id = letter,
label = set name, size = inclusive cardinality); edges are ALL pairwise
overlaps (weight = the \`intersection\` metric by default) carrying
jaccard, foldEnrichment, overlapCoeff, dice, pValue, fdr, and
significant attributes. Node/edge order and numeric rendering are pinned
– see \`packages/core/src/networkExport.ts\` for the parity contract.

## Usage

``` r
to_network_graphml(result, path)

# S4 method for class 'RegionResult'
to_network_graphml(result, path)
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
to_network_graphml(result, tempfile(fileext = ".graphml"))
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
to_network_graphml(result, tempfile(fileext = ".graphml"))
# }
```
