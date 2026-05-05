# Jaccard similarity index

Computes \|A intersection B\| / \|A union B\|. Matches the web tool's
convention of returning 0 when both sets are empty (NaN-safe).

## Usage

``` r
jaccard(size_a, size_b, intersection)
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
jaccard(10, 10, 5)
#> [1] 0.3333333
jaccard(0, 0, 0)
#> [1] 0
```
