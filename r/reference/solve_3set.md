# Area-proportional 3-set circle layout (Wilkinson 2012-style triangulation)

Computes pairwise inter-center distances via bisection on the lens
intersection area, then places circle C via barycentric triangulation
against AB. Always sets \`is_approximate = TRUE\` because perfect
3-circle area-proportional fits don't always exist mathematically.

## Usage

``` r
solve_3set(regions)
```

## Arguments

- regions:

  Named list keyed by \`as.character(bitmask)\` (1..7) -\> exclusive
  count. Missing keys are treated as 0.

## Value

A named list with elements \`circles\` (length 3), \`error\` (always NaN
in v0.1), \`is_approximate\` (always TRUE).

## Details

Mirrors Python \`solve_3set\` byte-for-byte (including the \`error =
NaN\` deliberate sentinel - 3-set fit error is not measured in v0.1).

## Examples

``` r
solve_3set(list("1" = 100L, "2" = 80L, "3" = 30L,
                 "4" = 60L,  "5" = 20L, "6" = 15L, "7" = 5L))
#> $circles
#> $circles[[1]]
#> $circles[[1]]$cx
#> [1] 0
#> 
#> $circles[[1]]$cy
#> [1] 0
#> 
#> $circles[[1]]$r
#> [1] 7.024104
#> 
#> 
#> $circles[[2]]
#> $circles[[2]]$cx
#> [1] 8.589207
#> 
#> $circles[[2]]$cy
#> [1] 0
#> 
#> $circles[[2]]$r
#> [1] 6.432751
#> 
#> 
#> $circles[[3]]
#> $circles[[3]]$cx
#> [1] 4.368278
#> 
#> $circles[[3]]$cy
#> [1] 7.521945
#> 
#> $circles[[3]]$r
#> [1] 5.641896
#> 
#> 
#> 
#> $error
#> [1] NaN
#> 
#> $is_approximate
#> [1] TRUE
#> 
```
