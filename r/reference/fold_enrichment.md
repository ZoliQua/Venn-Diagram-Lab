# Fold enrichment (observed / expected ratio)

Computes (k \* N) / (K \* n). Returns 0.0 if any denominator is zero
(matches web tool convention).

## Usage

``` r
fold_enrichment(N, K, n, k)
```

## Arguments

- N:

  Population size (total items in the universe). Integer \>= 1.

- K:

  Number of success states in the population (e.g. inclusive \|A\|).
  Integer \>= 0.

- n:

  Number of draws (e.g. inclusive \|B\|). Integer \>= 0.

- k:

  Observed successes (e.g. \|A intersection B\|). Integer \>= 0.

## Value

Numeric (\>= 0; can exceed 1 for over-representation).

## Examples

``` r
fold_enrichment(20000, 138, 581, 126)
#> [1] 31.43007
```
