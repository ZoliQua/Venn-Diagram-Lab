# Generate an area-proportional SVG for a 2- or 3-set RegionResult

Circle sizes and inter-circle distances are solved analytically (2-set,
exact) or by triangulation (3-set, approximate) so that overlap areas
match the requested intersection counts. The returned SVG matches the
44-model schema: ShapeA-I, NameA-I, Count\_\*, CountSUM\_\*, Bullet\*
elements are all present and addressable via xml2.

## Usage

``` r
generate_proportional_svg(
  result,
  width = .PROP_DEFAULT_WIDTH,
  height = .PROP_DEFAULT_HEIGHT
)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- width:

  Canvas width in pixels (default 600).

- height:

  Canvas height in pixels (default 600).

## Value

A \`character\` (length 1) with the raw SVG.

## Examples

``` r
tmp <- tempfile(fileext = ".tsv")
writeLines(c("Gene\tSetA\tSetB",
             "GENE1\t1\t0",
             "GENE2\t1\t1",
             "GENE3\t0\t1"), tmp)
ds  <- load_tsv(tmp, binary = TRUE)
res <- analyze(ds, model = "proportional")
svg <- generate_proportional_svg(res)
nchar(svg) > 0
#> [1] TRUE
```
