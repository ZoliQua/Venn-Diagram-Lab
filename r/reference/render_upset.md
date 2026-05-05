# Render an UpSet plot from a RegionResult

Builds a ComplexUpset ggplot showing intersection sizes (top bars), set
membership matrix (middle dot grid), and per-set sizes (left bars).
Idiomatic R port of Python \`render_upset\` – same parameter contract,
but renders via ComplexUpset (ggplot2) instead of matplotlib (not a 1:1
port).

## Usage

``` r
render_upset(
  result,
  max_columns = 20L,
  sort_by = c("size", "degree"),
  threshold = 0L,
  color_mode = c("depth", "heatmap", "custom"),
  colors = NULL
)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- max_columns:

  Maximum number of intersections to display (default 20). Top-N by the
  active sort.

- sort_by:

  \`"size"\` (default – descending) or \`"degree"\` (membership count
  ascending then alphabetical).

- threshold:

  Exclude intersections with size strictly below this value (default 0L
  = no filter).

- color_mode:

  \`"depth"\` (default – viridis on degree), \`"heatmap"\` (Reds on
  size), or \`"custom"\` (use the \`colors\` mapping).

- colors:

  Named character vector mapping intersection LABELS (e.g. \`"AB"\`) to
  fill hex colors when \`color_mode = "custom"\`. Unspecified labels
  fall back to \`"#cccccc"\`.

## Value

A \`ggplot\` object (saveable via \`ggplot2::ggsave()\`).

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
if (getRversion() >= "4.6") {
  p <- render_upset(result)
  inherits(p, "ggplot")
}
#> Warning: Using `size` aesthetic for lines was deprecated in ggplot2 3.4.0.
#> ℹ Please use `linewidth` instead.
#> ℹ The deprecated feature was likely used in the ComplexUpset package.
#>   Please report the issue at
#>   <https://github.com/krassowski/complex-upset/issues>.
#> [1] TRUE
# \donttest{
if (getRversion() >= "4.6") {
  result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
  p <- render_upset(result, sort_by = "degree", color_mode = "heatmap")
  ggplot2::ggsave(tempfile(fileext = ".png"), p, width = 8, height = 5)
}
# }
```
