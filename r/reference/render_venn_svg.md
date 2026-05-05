# Render a RegionResult onto its model SVG and return the raw SVG string

Loads the bundled SVG template for \`result@model\` (or the explicit
\`model\` override), walks the DOM via xml2 to overwrite text content
(\`Name\*\`, \`Count\_\*\`, \`CountSUM\_\*\`, \`Title\`) and inline
\`fill:\` colors (\`Shape\*\`, \`Shape\*2\` for Euler extras,
\`Bullet\*\`), and serialises back to a string.

## Usage

``` r
render_venn_svg(
  result,
  model = NULL,
  set_names = NULL,
  colors = NULL,
  title = NULL,
  show_names = TRUE,
  show_counts = TRUE
)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- model:

  Optional model id override (filename stem). Default =
  \`result@model\`.

- set_names:

  Optional named character vector mapping letters (\`"A"\`, \`"B"\`,
  ...) to display names. Unspecified letters fall back to
  \`result@dataset@set_names\`.

- colors:

  Optional named character vector mapping letters to fill hex colors.
  Applies to \`BulletX\`, \`ShapeX\`, and \`ShapeX2\` (Euler extra
  shapes).

- title:

  Optional title override. If \`NULL\`, the template's default title
  text is preserved.

- show_names:

  If \`FALSE\`, blanks every \`NameA-I\` element.

- show_counts:

  If \`FALSE\`, blanks every \`Count\_\*\` and \`CountSUM\_\*\` element.

## Value

A \`character\` (length 1) with the raw SVG.

## Details

For \`model = "proportional"\`, delegates to
\[generate_proportional_svg()\].

Mirrors Python \`render_venn_svg\` byte-for-byte except for: (a) the
return type is \`character\` instead of an \`SvgImage\` wrapper class;
(b) xml2 may emit slightly different whitespace/attribute ordering than
lxml. Functional content (text, fill colors, structure) is identical.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
svg <- render_venn_svg(result)
nchar(svg) > 0
#> [1] TRUE
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
svg <- render_venn_svg(result)
nchar(svg) > 0
#> [1] TRUE
# }
```
