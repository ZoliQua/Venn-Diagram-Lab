# Area-proportional 2-set circle layout

Solves for two circles whose areas equal \`a_only + ab\` and \`b_only +
ab\` and whose intersection area equals \`ab\`, by analytical bisection
on the inter-center distance. Always exact (returns \`is_approximate =
FALSE\`).

## Usage

``` r
solve_2set(a_only, b_only, ab)
```

## Arguments

- a_only:

  Items in A only (integer \>= 0).

- b_only:

  Items in B only (integer \>= 0).

- ab:

  Items in A intersection B (integer \>= 0).

## Value

A named list with elements:

- circles:

  Length-2 list of \`list(cx, cy, r)\` named lists.

- error:

  Relative error of the achieved area fit (typically \< 1e-4).

- is_approximate:

  Always \`FALSE\` for 2-set.

## Details

Mirrors Python \`solve_2set\` byte-for-byte.

## Examples

``` r
solve_2set(a_only = 30L, b_only = 30L, ab = 10L)
#> $circles
#> $circles[[1]]
#> $circles[[1]]$cx
#> [1] -2.264784
#> 
#> $circles[[1]]$cy
#> [1] 0
#> 
#> $circles[[1]]$r
#> [1] 3.568248
#> 
#> 
#> $circles[[2]]
#> $circles[[2]]$cx
#> [1] 2.264784
#> 
#> $circles[[2]]$cy
#> [1] 0
#> 
#> $circles[[2]]$r
#> [1] 3.568248
#> 
#> 
#> 
#> $error
#> [1] 1.185185e-12
#> 
#> $is_approximate
#> [1] FALSE
#> 
```
