# Render a force-directed network plot from a RegionResult

Builds a ggraph plot where nodes are sets (sized by inclusive
cardinality) and edges are pairwise overlaps (thickness proportional to
the chosen metric; blue for FDR-significant edges below
\`significance_threshold\`, grey otherwise). Layout uses the
deterministic \`stress\` algorithm from graphlayouts.

## Usage

``` r
render_network(
  result,
  edge_metric = "intersection",
  seed = 42L,
  significance_threshold = 0.05,
  node_color_map = NULL
)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- edge_metric:

  One of \`"intersection"\`, \`"jaccard"\`, \`"fold_enrichment"\`
  (capped at 20.0), \`"overlap_coefficient"\`.

- seed:

  Retained for API compatibility; currently unused. The \`stress\`
  layout algorithm is fully deterministic and does not rely on a random
  seed.

- significance_threshold:

  FDR p_adjusted threshold below which edges are colored as significant
  (default 0.05).

- node_color_map:

  Optional named character vector mapping letters (\`"A"\`, \`"B"\`,
  ...) to fill hex colors. Unspecified letters default to yellow
  (\`"#FFF200"\`).

## Value

A \`ggplot\` (ggraph subclass).

## Details

Idiomatic R port of Python \`render_network\` – same parameter contract,
but renders via ggraph + tidygraph instead of networkx + matplotlib.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
p <- render_network(result)
#> Warning: data length [3] is not a sub-multiple or multiple of the number of rows [2]
inherits(p, "ggplot")
#> [1] TRUE
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
p <- render_network(result, edge_metric = "jaccard")
ggplot2::ggsave(tempfile(fileext = ".png"), p, width = 7, height = 7)
# }
```
