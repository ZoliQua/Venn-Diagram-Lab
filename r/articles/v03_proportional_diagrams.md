# Area-proportional 2/3-set diagrams

## Area-proportional 2/3-set diagrams

A standard Venn diagram divides the plane into all possible regions of
equal visual weight, regardless of how many items each region holds. An
area-proportional Venn instead **scales each region’s area to its
size**, making the picture itself a quantitative summary.

This vignette covers when to use proportional layouts, how to generate
them, and the low-level helpers (`solve_2set`, `solve_3set`,
`circle_intersection_area`) that drive them.

``` r

library(vennDiagramLab)
```

### When to use proportional

| Set count | Proportional supported? | Caveats |
|----|----|----|
| 2 | yes (exact) | always achievable with two circles |
| 3 | yes (approximate) | three-circle constraints rarely admit an exact solution; `is_approximate = TRUE` |
| 4+ | no | use a layered Venn or an UpSet plot instead |

For 4+ sets, `analyze(ds, model = "proportional")` raises a clear error.

### A 2-set example

We construct a small toy dataset directly (no file IO):

``` r

ds_2 <- methods::new("VennDataset",
    set_names     = c("A", "B"),
    items         = list(A = paste0("g", 1:30), B = paste0("g", 21:50)),
    item_order    = paste0("g", 1:50),
    universe_size = 100L,
    source_path   = NULL,
    format        = "csv"
)

result_2 <- analyze(ds_2, model = "proportional")
result_2@model
#> [1] "proportional"
result_2@is_approximate
#> [1] FALSE
```

`is_approximate` is `FALSE` for 2 sets — the analytical solution always
matches the input cardinalities exactly.

``` r

svg_2 <- render_venn_svg(result_2)
nchar(svg_2)
#> [1] 1716
```

### A 3-set example

``` r

ds_3 <- methods::new("VennDataset",
    set_names     = c("A", "B", "C"),
    items         = list(
        A = paste0("g", 1:40),
        B = paste0("g", 21:60),
        C = paste0("g", 41:80)
    ),
    item_order    = paste0("g", 1:80),
    universe_size = 100L,
    source_path   = NULL,
    format        = "csv"
)

result_3 <- analyze(ds_3, model = "proportional")
result_3@model
#> [1] "proportional"
result_3@is_approximate
#> [1] TRUE
```

For 3 sets, `is_approximate = TRUE` — the solver minimises a residual
rather than solving exactly. Inspect `result_3@regions` to see the
actual region sizes the layout achieves.

``` r

svg_3 <- render_venn_svg(result_3)
nchar(svg_3)
#> [1] 2724
```

### Low-level helpers

If you only need the geometry (no SVG output), use the solvers directly.

#### `circle_intersection_area(r1, r2, d)`

The lens-shaped intersection area of two circles with radii `r1`, `r2`
and center distance `d`.

``` r

circle_intersection_area(r1 = 1, r2 = 1, d = 1)         # ≈ 1.228
#> [1] 1.22837
circle_intersection_area(r1 = 1, r2 = 1, d = 0)         # 1 circle inside the other -> pi*r^2
#> [1] 3.141593
circle_intersection_area(r1 = 1, r2 = 1, d = 2)         # touching at one point -> 0
#> [1] 0
```

#### `solve_2set(a_only, b_only, ab)`

Returns `r1`, `r2`, `d` (radii + center distance) for an exact 2-set
proportional layout.

``` r

geom_2 <- solve_2set(a_only = 20, b_only = 20, ab = 10)
geom_2
#> $circles
#> $circles[[1]]
#> $circles[[1]]$cx
#> [1] -1.709782
#> 
#> $circles[[1]]$cy
#> [1] 0
#> 
#> $circles[[1]]$r
#> [1] 3.090194
#> 
#> 
#> $circles[[2]]
#> $circles[[2]]$cx
#> [1] 1.709782
#> 
#> $circles[[2]]$cy
#> [1] 0
#> 
#> $circles[[2]]$r
#> [1] 3.090194
#> 
#> 
#> 
#> $error
#> [1] 1.45336e-10
#> 
#> $is_approximate
#> [1] FALSE
```

#### `solve_3set(regions)`

Returns approximate radii and center positions for a 3-set proportional
layout. Input is a named list keyed by bitmask (1..7), where the keys
represent exclusive regions: 1=A only, 2=B only, 3=AB, 4=C only, 5=AC,
6=BC, 7=ABC.

``` r

geom_3 <- solve_3set(list("1" = 20L, "2" = 20L, "4" = 20L,
                           "3" = 5L,  "5" = 5L,  "6" = 5L, "7" = 2L))
str(geom_3)
#> List of 3
#>  $ circles       :List of 3
#>   ..$ :List of 3
#>   .. ..$ cx: num 0
#>   .. ..$ cy: num 0
#>   .. ..$ r : num 3.19
#>   ..$ :List of 3
#>   .. ..$ cx: num 4.26
#>   .. ..$ cy: num 0
#>   .. ..$ r : num 3.19
#>   ..$ :List of 3
#>   .. ..$ cx: num 2.13
#>   .. ..$ cy: num 3.69
#>   .. ..$ r : num 3.19
#>  $ error         : num NaN
#>  $ is_approximate: logi TRUE
```

### What’s next

- [`vignette("v01_quickstart")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v01_quickstart.md)
  — basic usage if you skipped here directly.
- [`vignette("v04_upset_vs_venn_vs_network")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v04_upset_vs_venn_vs_network.md)
  — alternatives for 4+ sets.
- [`vignette("v08_custom_styling_and_export")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v08_custom_styling_and_export.md)
  — post-render SVG tweaks.
