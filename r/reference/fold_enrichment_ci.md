# Approximate 95% confidence interval for the fold enrichment

Log-scale Wald interval. Only k is random (K/N is the fixed population
fraction), so with p_hat = k/n: SE(log FE) = SE(log p_hat),
approximately sqrt(1/k - 1/n) by the delta method. A Jeffreys-style
continuity correction (k+0.5 successes, n+1 trials) keeps the interval
finite at k = 0. Bounds are exponentiated back. Byte-parity port of the
TypeScript \`foldEnrichmentCI\` (packages/core/src/statistics.ts);
coverage is validated by Monte Carlo under the null in
scripts/bio_validation.py.

## Usage

``` r
fold_enrichment_ci(N, K, n, k)
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

Numeric length-2 vector \`c(low, high)\` (\>= 0).

## Examples

``` r
fold_enrichment_ci(20000, 138, 581, 126)
#> [1] 27.00011 36.75119
```
