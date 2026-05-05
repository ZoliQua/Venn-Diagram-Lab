# Benjamini-Hochberg FDR adjustment

Wraps \`stats::p.adjust(p, method = "BH")\`. Returns adjusted p-values
in the same order as the input. Empty input -\> empty output.

## Usage

``` r
bh_fdr(p_values)
```

## Arguments

- p_values:

  Numeric vector of raw p-values in \[0, 1\].

## Value

Numeric vector of adjusted p-values, same length as input.

## Examples

``` r
bh_fdr(c(0.001, 0.01, 0.05, 0.5))
#> [1] 0.00400000 0.02000000 0.06666667 0.50000000
```
