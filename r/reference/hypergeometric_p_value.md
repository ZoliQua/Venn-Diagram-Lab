# One-sided hypergeometric p-value (over-representation)

Computes P(X \>= k) where X ~ Hypergeometric(N, K, n). Returns 1.0 for
invalid inputs so the metric is safe to feed into BH-FDR without
filtering.

## Usage

``` r
hypergeometric_p_value(N, K, n, k)
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

Numeric in \[0, 1\].

## Details

Maps to R's \`phyper(k - 1, K, N - K, n, lower.tail = FALSE)\`. Note
that R's phyper parameter convention differs from Python's scipy: R uses
\`m\` for success-in-population and \`n\` for failure-in-population (=
N - K), where Python uses \`N\` for total population.

## Examples

``` r
hypergeometric_p_value(20000, 138, 581, 126)
#> [1] 6.751534e-184
```
