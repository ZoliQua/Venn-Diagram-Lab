# vennDiagramLab

R package companion to the [Venn Diagram Lab web
tool](https://www.venndiagramlab.org/) and the [Python
`venn-diagram-lab` package](https://pypi.org/project/venn-diagram-lab/).
Headless Venn / UpSet / Network diagram analysis and rendering for
bioinformaticians and biostatisticians who work natively in R.

- 44 SVG diagram models (2- to 9-set) from a dozen construction methods
  (Venn, Edwards, Anderson, Grünbaum, Bannier-Bodin, Carroll, Mamakani,
  SUMO).
- Area-proportional 2- and 3-set layouts via analytical and approximate
  solvers.
- UpSet plots (via `ComplexUpset`) and force-directed network views (via
  `ggraph` + `tidygraph`).
- Five pairwise statistical metrics (Jaccard, Dice, overlap coefficient,
  fold enrichment, hypergeometric) with BH-FDR adjustment.
- Multi-page PDF reports combining all views.
- `ggplot2` layer
  ([`geom_venn()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/geom_venn.md))
  and `broom`-compatible S3 methods (`tidy()` / `glance()` /
  `augment()`) for tidyverse + pipeline integration.
- Byte-equivalent TSV exports tested against the React webapp’s golden
  fixtures (single source of truth across web / Python / R).

## Install

### From CRAN (recommended once published)

``` r

install.packages("vennDiagramLab")
```

### From Bioconductor (alternate channel once published)

``` r

if (!require("BiocManager", quietly = TRUE))
    install.packages("BiocManager")
BiocManager::install("vennDiagramLab")
```

### Development version (GitHub)

``` r

install.packages("remotes")
remotes::install_github("ZoliQua/Venn-Diagram-Lab", subdir = "r")
```

## Quickstart

``` r

library(vennDiagramLab)

# Load a bundled dataset (4 cancer driver source catalogues)
ds     <- load_sample("dataset_real_cancer_drivers_4")
result <- analyze(ds)

# Render the Venn diagram as SVG
svg <- render_venn_svg(result, title = "Cancer driver overlap")
writeLines(svg, "cancer_drivers.svg")

# Or get a tidy summary
broom::tidy(result)

# Or generate a multi-page PDF report
to_pdf_report(result, "cancer_drivers.pdf")
```

See
[`vignette("v01_quickstart")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v01_quickstart.md)
for the full intro and
[`vignette()`](https://rdrr.io/r/utils/vignette.html) for the complete
eight-vignette gallery.

## Documentation

- Full reference + vignettes:
  <https://zoliqua.github.io/Venn-Diagram-Lab/r>
- Eight RMarkdown vignettes covering quickstart, biological
  walkthroughs, statistical interpretation, ggplot2 / pipeline
  integration, and PDF reports.

## Related projects

- Web tool (interactive viewer + editor + visual analysis):
  <https://www.venndiagramlab.org/>
- Python package (same byte-equivalent outputs, same statistics):
  <https://pypi.org/project/venn-diagram-lab/>
- Repository (monorepo): <https://github.com/ZoliQua/Venn-Diagram-Lab>

## Citation

If you use `vennDiagramLab` in published work, please cite:

    Dul Z., Ölbei M., Thomas N.S.B., Si Ammour A., Csikász-Nagy A. (2026).
    vennDiagramLab: Headless Venn diagram analysis and rendering.
    R package version 2.0.0. https://www.venndiagramlab.org/

`citation("vennDiagramLab")` returns a BibTeX entry once installed.

## License

MIT — see
[LICENSE](https://zoliqua.github.io/Venn-Diagram-Lab/r/LICENSE).
