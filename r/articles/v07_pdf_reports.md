# PDF reports

## PDF reports

[`to_pdf_report()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/to_pdf_report.md)
produces a multi-page US-Letter-landscape PDF combining the venn
diagram, UpSet plot, statistics tables, network view, and a methodology
page — equivalent to the web tool’s “Generate Report” button.

``` r

library(vennDiagramLab)
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
```

### Generating the report

Save to a temporary file (vignettes shouldn’t write into the package
directory):

``` r

out <- tempfile(fileext = ".pdf")
to_pdf_report(result, path = out, title = "Cancer driver overlap")
#> Warning: Using `size` aesthetic for lines was deprecated in ggplot2 3.4.0.
#> ℹ Please use `linewidth` instead.
#> ℹ The deprecated feature was likely used in the ComplexUpset package.
#>   Please report the issue at
#>   <https://github.com/krassowski/complex-upset/issues>.
#> This warning is displayed once per session.
#> Call `lifecycle::last_lifecycle_warnings()` to see where this warning was
#> generated.
file.exists(out)
#> [1] TRUE
file.size(out)   # bytes
#> [1] 120553
```

(The chunk above is gated on `R >= 4.6` because the report embeds an
UpSet panel via `ComplexUpset`, whose CRAN release (1.3.3) is
incompatible with `ggplot2 >= 4.0` on older R. See
[`?vennDiagramLab::to_pdf_report`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/to_pdf_report.md)
for context and workarounds.)

### What the report contains

By default, every report has 5 page types:

1.  **Overview** — metadata (timestamp, dataset, set count) + set-size
    table.
2.  **Venn + UpSet** — rasterized venn (left) + UpSet plot (right).
3.  **Statistics** — Jaccard / Dice / Hypergeometric tables (per-page on
    7+ sets).
4.  **Network** — set-relationship graph + significant edges list.
5.  **About** — methodology notes (Venn / UpSet / Network / metric
    definitions).

Pages 4 (network) and 5 (about) can be turned off:

``` r

to_pdf_report(result, "venn_only.pdf",
              include_network = FALSE,
              include_about   = FALSE)
```

### What’s next

- [`vignette("v02_real_cancer_drivers")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v02_real_cancer_drivers.md)
  — see the analysis that feeds the report.
- [`vignette("v08_custom_styling_and_export")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v08_custom_styling_and_export.md)
  — multi-format export beyond PDF (SVG, PNG).
