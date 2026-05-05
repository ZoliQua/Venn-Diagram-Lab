# Szymkiewicz-Simpson overlap coefficient

Computes \|A intersection B\| / min(\|A\|, \|B\|). Useful when one set
is much smaller than the other.

## Usage

``` r
overlap_coefficient(size_a, size_b, intersection)
```

## Arguments

- size_a:

  Inclusive size of set A (integer \>= 0).

- size_b:

  Inclusive size of set B (integer \>= 0).

- intersection:

  Inclusive intersection size \|A intersection B\|.

## Value

Numeric in \[0, 1\].

## Examples

``` r
overlap_coefficient(10, 5, 3)
#> [1] 0.6
```
