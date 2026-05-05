# Statistics deep dive (Jaccard, Dice, hypergeometric, BH-FDR)

## Statistics deep dive

`vennDiagramLab` reports five pairwise metrics for every set pair plus a
multiple-testing correction. This vignette explains what each metric
means, when to prefer it, and how to reproduce the values that appear in
the web tool’s significance coloring.

``` r

library(vennDiagramLab)
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
stats <- statistics(result)
```

### The five metrics

For two sets `A` and `B` of sizes `|A|`, `|B|` with intersection
`|A ∩ B|` drawn from a universe of `N` items:

- **Jaccard** = `|A ∩ B| / |A ∪ B|`. Range `[0, 1]`. Symmetric.
- **Dice** = `2 |A ∩ B| / (|A| + |B|)`. Range `[0, 1]`. Symmetric.
  Always `>= Jaccard`; the two relate by `Dice = 2J / (1 + J)`.
- **Overlap coefficient** = `|A ∩ B| / min(|A|, |B|)`. Range `[0, 1]`.
  Equal to 1 when one set is contained in the other.
- **Hypergeometric p-value** — probability of observing `|A ∩ B|` or
  more shared items by chance, given `|A|`, `|B|`, and `N`. Tests over-
  representation.
- **Fold enrichment** = `(|A ∩ B| * N) / (|A| * |B|)`. The ratio of
  observed to expected intersection size under independence. `> 1` is
  over- representation.

### Compute one metric directly

The helpers are exported and stateless:

``` r

jaccard(size_a = 138, size_b = 581, intersection = 100)
#> [1] 0.1615509
dice(size_a = 138, size_b = 581, intersection = 100)
#> [1] 0.2781641
overlap_coefficient(size_a = 138, size_b = 581, intersection = 100)
#> [1] 0.7246377
hypergeometric_p_value(N = 20000, K = 138, n = 581, k = 100)
#> [1] 1.746271e-124
fold_enrichment(N = 20000, K = 138, n = 581, k = 100)
#> [1] 24.9445
```

The hypergeometric p-value is essentially zero: 100 shared genes out of
an expected `(138 * 581) / 20000 ≈ 4` is a 25× enrichment.

### All pairs at once

`statistics(result)` returns five tables (four square `NxN` matrices for
the ratio metrics + a long-form data.frame for the hypergeometric test):

``` r

stats@jaccard
#>            Vogelstein COSMIC_CGC    OncoKB   IntOGen
#> Vogelstein  1.0000000  0.2124789 0.1058158 0.1898148
#> COSMIC_CGC  0.2124789  1.0000000 0.4719740 0.4697337
#> OncoKB      0.1058158  0.4719740 1.0000000 0.3439077
#> IntOGen     0.1898148  0.4697337 0.3439077 1.0000000
```

``` r

head(stats@hypergeometric)
#>        set_a      set_b intersection expected       p_value    p_adjusted
#> 1 COSMIC_CGC     OncoKB          581 35.76055  0.000000e+00  0.000000e+00
#> 2 COSMIC_CGC    IntOGen          388 18.38865  0.000000e+00  0.000000e+00
#> 3     OncoKB    IntOGen          477 38.96115  0.000000e+00  0.000000e+00
#> 4 Vogelstein COSMIC_CGC          126  4.00890 6.751534e-184 1.012730e-183
#> 5 Vogelstein    IntOGen          123  4.36770 4.613517e-171 5.536220e-171
#> 6 Vogelstein     OncoKB          131  8.49390 3.131045e-151 3.131045e-151
#>   significant highly_significant
#> 1        TRUE               TRUE
#> 2        TRUE               TRUE
#> 3        TRUE               TRUE
#> 4        TRUE               TRUE
#> 5        TRUE               TRUE
#> 6        TRUE               TRUE
```

### BH-FDR adjustment

`stats@hypergeometric` already carries the BH-FDR-adjusted q-value
(`p_adjusted`) and a boolean `significant` (q \< 0.05) and
`highly_significant` (q \< 0.001). The adjustment uses
`stats::p.adjust(method = "BH")`:

``` r

raw_p <- stats@hypergeometric$p_value
adjusted <- bh_fdr(raw_p)
all.equal(adjusted, stats@hypergeometric$p_adjusted)
#> [1] TRUE
```

For unrelated p-values, BH-FDR is more permissive than Bonferroni and
more conservative than no correction:

``` r

toy_p <- c(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 0.9)
data.frame(
    raw            = toy_p,
    bonferroni     = pmin(toy_p * length(toy_p), 1),
    bh_fdr         = bh_fdr(toy_p)
)
#>     raw bonferroni     bh_fdr
#> 1 0.001      0.007 0.00700000
#> 2 0.005      0.035 0.01750000
#> 3 0.010      0.070 0.02333333
#> 4 0.050      0.350 0.08750000
#> 5 0.100      0.700 0.14000000
#> 6 0.500      1.000 0.58333333
#> 7 0.900      1.000 0.90000000
```

### broom-compatible long-form

[`broom::tidy()`](https://generics.r-lib.org/reference/tidy.html)
produces a tibble that’s pipeline-friendly (one row per pair, all
metrics in one frame, sorted by adjusted p-value):

``` r

broom::tidy(result)
#> # A tibble: 6 × 12
#>   set_a      set_b      intersection expected jaccard  dice overlap_coefficient
#>   <chr>      <chr>             <int>    <dbl>   <dbl> <dbl>               <dbl>
#> 1 COSMIC_CGC OncoKB              581    35.8    0.472 0.641               1    
#> 2 COSMIC_CGC IntOGen             388    18.4    0.470 0.639               0.668
#> 3 OncoKB     IntOGen             477    39.0    0.344 0.512               0.754
#> 4 Vogelstein COSMIC_CGC          126     4.01   0.212 0.350               0.913
#> 5 Vogelstein IntOGen             123     4.37   0.190 0.319               0.891
#> 6 Vogelstein OncoKB              131     8.49   0.106 0.191               0.949
#> # ℹ 5 more variables: fold_enrichment <dbl>, p_value <dbl>, p_adjusted <dbl>,
#> #   significant <lgl>, highly_significant <lgl>
```

### Reproducing the web tool’s coloring

The web tool colors significant pairs via the same `p_adjusted`
thresholds:

``` r

sig_table <- broom::tidy(result)
sig_table$colour <- ifelse(sig_table$highly_significant, "red",
                    ifelse(sig_table$significant,        "orange",
                                                          "grey"))
sig_table[, c("set_a", "set_b", "p_adjusted", "colour")]
#> # A tibble: 6 × 4
#>   set_a      set_b      p_adjusted colour
#>   <chr>      <chr>           <dbl> <chr> 
#> 1 COSMIC_CGC OncoKB      0         red   
#> 2 COSMIC_CGC IntOGen     0         red   
#> 3 OncoKB     IntOGen     0         red   
#> 4 Vogelstein COSMIC_CGC  1.01e-183 red   
#> 5 Vogelstein IntOGen     5.54e-171 red   
#> 6 Vogelstein OncoKB      3.13e-151 red
```

### What’s next

- [`vignette("v02_real_cancer_drivers")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v02_real_cancer_drivers.md)
  — see these stats in the context of a real biological analysis.
- [`vignette("v06_pipeline_integration")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v06_pipeline_integration.md)
  — feed
  [`broom::tidy()`](https://generics.r-lib.org/reference/tidy.html) into
  a downstream tidyverse pipeline.
