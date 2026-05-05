# List all bundled Venn diagram models

Returns metadata for the 44 bundled SVG model templates plus the
\`proportional\` synthetic generator (added in Phase 3). Read from JSON
region files in \`inst/extdata/models/json/\`.

## Usage

``` r
list_models()
```

## Value

A \`data.frame\` with columns \`name\` (filename stem), \`set_count\`
(2-9), and \`display_name\` (from the JSON \`name\` field). Sorted by
\`(set_count, name)\`.

## Examples

``` r
head(list_models())
#>                           name set_count               display_name
#> 1                   venn-2-set         2         Venn 2-set diagram
#> 2          venn-2a-set-edwards         2 Edwards-Venn 2-set diagram
#> 3 venn-2e-set-carroll-triangle         2 Carroll Venn 2-set diagram
#> 4        venn-2e-set-rectangle         2         Venn 2-set diagram
#> 5                   venn-3-set         3         Venn 3-set diagram
#> 6          venn-3a-set-edwards         3 Edwards-Venn 3-set diagram
```
