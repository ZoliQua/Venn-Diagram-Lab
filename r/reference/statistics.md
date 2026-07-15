# Lazy pairwise statistics for a RegionResult

Computes (and on subsequent calls re-computes) the
\[\`StatisticsResult-class\`\] for the pairwise metric tables. R has no
built-in \`cached_property\` equivalent for S4 slots, so this is
recomputed each call. Cache externally via \`stats \<-
statistics(result)\` if you need to access it many times.

## Usage

``` r
statistics(result)

# S4 method for class 'RegionResult'
statistics(result)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

## Value

A \[\`StatisticsResult-class\`\].

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
stats <- statistics(result)
stats@jaccard["A", "B"]
#> [1] 0.3333333
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
stats <- statistics(result)
stats@jaccard
#>            Vogelstein COSMIC_CGC    OncoKB   IntOGen
#> Vogelstein  1.0000000  0.2124789 0.1058158 0.1898148
#> COSMIC_CGC  0.2124789  1.0000000 0.4719740 0.4697337
#> OncoKB      0.1058158  0.4719740 1.0000000 0.3439077
#> IntOGen     0.1898148  0.4697337 0.3439077 1.0000000
stats@hypergeometric
#>        set_a      set_b intersection expected       p_value    p_adjusted
#> 1 COSMIC_CGC     OncoKB          581 35.76055  0.000000e+00  0.000000e+00
#> 2 COSMIC_CGC    IntOGen          388 18.38865  0.000000e+00  0.000000e+00
#> 3     OncoKB    IntOGen          477 38.96115  0.000000e+00  0.000000e+00
#> 4 Vogelstein COSMIC_CGC          126  4.00890 6.751534e-184 1.012730e-183
#> 5 Vogelstein    IntOGen          123  4.36770 4.613517e-171 5.536220e-171
#> 6 Vogelstein     OncoKB          131  8.49390 3.131045e-151 3.131045e-151
#>    p_bonferroni   p_two_sided jaccard_ci_low jaccard_ci_high dice_ci_low
#> 1  0.000000e+00  0.000000e+00     0.44421721       0.4999052   0.5990989
#> 2  0.000000e+00  0.000000e+00     0.43591694       0.5038306   0.5879544
#> 3  0.000000e+00  0.000000e+00     0.31937120       0.3693065   0.4732154
#> 4 4.050920e-183 6.751534e-184     0.18145970       0.2471993   0.2984018
#> 5 2.768110e-170 4.613517e-171     0.16148266       0.2218030   0.2707664
#> 6 1.878627e-150 3.131045e-151     0.08988361       0.1241868   0.1624396
#>   dice_ci_high significant highly_significant
#> 1    0.6849796        TRUE               TRUE
#> 2    0.6927402        TRUE               TRUE
#> 3    0.5523979        TRUE               TRUE
#> 4    0.4094753        TRUE               TRUE
#> 5    0.3741177        TRUE               TRUE
#> 6    0.2248469        TRUE               TRUE
# }
```
