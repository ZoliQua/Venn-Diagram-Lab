# Pipeline integration (targets / drake)

## Pipeline integration

`vennDiagramLab` is library-first and tidyverse-friendly. The
`broom`-compatible S3 methods on `RegionResult` make it trivial to plug
into `targets` / `drake` workflows or any pipeline that expects tidy
data.

``` r

library(vennDiagramLab)
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
```

### broom methods

Three methods convert a `RegionResult` to a tibble at three different
levels of aggregation:

- `tidy(result)` — one row per set pair, all five pairwise metrics
- `glance(result)` — one row, headline numbers
- `augment(result)` — one row per item, set-membership flags + region
  label

``` r

broom::glance(result)
#> # A tibble: 1 × 8
#>   n_sets n_regions n_items universe_size model      is_approximate n_significant
#>    <int>     <int>   <int>         <int> <chr>      <lgl>                  <int>
#> 1      4        15   20000         20000 venn-4-set FALSE                      6
#> # ℹ 1 more variable: n_highly_significant <int>
head(broom::tidy(result))
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
head(broom::augment(result))
#> # A tibble: 6 × 6
#>   item  Vogelstein COSMIC_CGC OncoKB IntOGen region_label
#>   <chr> <lgl>      <lgl>      <lgl>  <lgl>   <chr>       
#> 1 A1CF  FALSE      FALSE      TRUE   FALSE   C           
#> 2 AAMP  FALSE      FALSE      TRUE   FALSE   C           
#> 3 ABCB1 FALSE      FALSE      TRUE   FALSE   C           
#> 4 ABCC3 FALSE      FALSE      TRUE   FALSE   C           
#> 5 ABCC4 FALSE      FALSE      FALSE  TRUE    D           
#> 6 ABI1  FALSE      TRUE       TRUE   FALSE   BC
```

### Combining with dplyr

If you want to filter to only the highly significant pairs:

``` r

broom::tidy(result) |>
    dplyr::filter(highly_significant) |>
    dplyr::arrange(dplyr::desc(jaccard)) |>
    dplyr::select(set_a, set_b, intersection, jaccard, p_adjusted)
#> # A tibble: 6 × 5
#>   set_a      set_b      intersection jaccard p_adjusted
#>   <chr>      <chr>             <int>   <dbl>      <dbl>
#> 1 COSMIC_CGC OncoKB              581   0.472  0        
#> 2 COSMIC_CGC IntOGen             388   0.470  0        
#> 3 OncoKB     IntOGen             477   0.344  0        
#> 4 Vogelstein COSMIC_CGC          126   0.212  1.01e-183
#> 5 Vogelstein IntOGen             123   0.190  5.54e-171
#> 6 Vogelstein OncoKB              131   0.106  3.13e-151
```

Or count items per region:

``` r

broom::augment(result) |>
    dplyr::count(region_label, sort = TRUE)
#> # A tibble: 11 × 2
#>    region_label     n
#>    <chr>        <int>
#>  1 ""           18606
#>  2 "C"            559
#>  3 "BCD"          268
#>  4 "BC"           187
#>  5 "D"            156
#>  6 "ABCD"         120
#>  7 "CD"            86
#>  8 "A"              7
#>  9 "ABC"            6
#> 10 "ACD"            3
#> 11 "AC"             2
```

### targets pipeline (sketch)

A simple `_targets.R` file:

``` r

library(targets)

list(
    tar_target(ds,        load_sample("dataset_real_cancer_drivers_4")),
    tar_target(result,    analyze(ds)),
    tar_target(stats_df,  broom::tidy(result)),
    tar_target(genes_df,  broom::augment(result)),
    tar_target(venn_svg,  render_venn_svg(result)),
    tar_target(venn_path,
               { writeLines(venn_svg, "venn.svg"); "venn.svg" },
               format = "file")
)
```

Run with `targets::tar_make()`. Each step caches independently, so
re-running after only changing the sort order in a downstream report
does not re-run the analysis.

### Caching tip

`statistics(result)` recomputes on every call (no S4 lazy-property
equivalent). If you call it many times, cache it once:

``` r

stats <- statistics(result)
str(stats@jaccard, max.level = 1)
#>  num [1:4, 1:4] 1 0.212 0.106 0.19 0.212 ...
#>  - attr(*, "dimnames")=List of 2
```

Inside a `targets` pipeline, this is a non-issue because
`tar_target(stats, statistics(result))` caches it for you.

### What’s next

- [`vignette("v05_statistics_deep_dive")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v05_statistics_deep_dive.md)
  — what the metrics in
  [`broom::tidy()`](https://generics.r-lib.org/reference/tidy.html)
  actually mean.
- [`vignette("v07_pdf_reports")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v07_pdf_reports.md)
  — turning a result into a PDF artefact for a pipeline.
