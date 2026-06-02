# Render the pairwise enrichment lollipop chart

Same data and significance scheme as \[render_enrichment_bar()\] but as
a stem-and-dot plot: a vertical line rises from the baseline to the
metric value, capped by a filled circle whose radius scales with
`sqrt(intersection / max_intersection)` (range 2.5–8 px).

## Usage

``` r
render_enrichment_lollipop(
  result,
  metric = c("neglog10fdr", "foldEnrichment"),
  width = 560L,
  height = 240L
)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\] from \[analyze()\].

- metric:

  Stem-height metric – \`"neglog10fdr"\` or \`"foldEnrichment"\`.

- width, height:

  Output SVG dimensions in pixels.

## Value

An \[\`SvgImage-class\`\] with \`content\`, \`width\`, \`height\`.

## Details

Pure string construction – no xml2.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
res <- analyze(ds)
img <- render_enrichment_lollipop(res)
nchar(slot(img, "content")) > 0
#> [1] TRUE
```
