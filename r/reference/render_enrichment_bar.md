# Render the pairwise enrichment bar chart

One bar per pairwise statistic, ordered by \`(set_a_index,
set_b_index)\`. Bar height is proportional to the chosen \`metric\`:

- \`"neglog10fdr"\` (default): \\-\log\_{10}\\(BH-FDR), floor 1e-300.

- \`"foldEnrichment"\`: \\(k \cdot N) / (K \cdot n)\\ from
  \[StatisticsResult-class\]'s \`fold_enrichment\` slot.

## Usage

``` r
render_enrichment_bar(
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

  Bar-height metric – \`"neglog10fdr"\` or \`"foldEnrichment"\`.

- width, height:

  Output SVG dimensions in pixels.

## Value

An \[\`SvgImage-class\`\] with \`content\`, \`width\`, \`height\`.

## Details

Bars use `#2e7d32` for significant pairs (FDR \< 0.05) and `#888888`
otherwise. Significance markers \`\*\*\*\` (\< 0.001), \`\*\*\` (\<
0.01), and \`\*\` (\< 0.05) appear above each bar.

Pure string construction – no xml2.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
res <- analyze(ds)
img <- render_enrichment_bar(res)
nchar(slot(img, "content")) > 0
#> [1] TRUE
```
