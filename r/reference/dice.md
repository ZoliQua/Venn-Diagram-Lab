# Sorensen-Dice coefficient

Computes 2 \* \|A intersection B\| / (\|A\| + \|B\|). Returns 0 if both
sets are empty (matches web tool convention).

## Usage

``` r
dice(size_a, size_b, intersection)
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
dice(10, 10, 5)
#> [1] 0.5
```
