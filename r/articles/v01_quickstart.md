# Quickstart

## Quickstart

Five steps to your first Venn diagram with `vennDiagramLab`.

### 1. Load the package

``` r

library(vennDiagramLab)
```

### 2. Pick a bundled sample

The package ships five sample datasets (3 biological, 2 mock).

``` r

list_samples()
#> [1] "dataset_mock_gene_sets"              "dataset_mock_streaming_platforms"   
#> [3] "dataset_real_cancer_drivers_4"       "dataset_real_msigdb_cancer_pathways"
#> [5] "dataset_real_msigdb_immune_pathways"
```

### 3. Load it as a `VennDataset`

[`load_sample()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/load_sample.md)
returns an S4 `VennDataset` with deduplicated set members and first-seen
item ordering (matching the web tool’s CSV semantics).

``` r

ds <- load_sample("dataset_real_cancer_drivers_4")
ds@set_names
#> [1] "Vogelstein" "COSMIC_CGC" "OncoKB"     "IntOGen"
vapply(ds@items, length, integer(1L))   # set sizes
#> Vogelstein COSMIC_CGC     OncoKB    IntOGen 
#>        138        581       1231        633
```

### 4. Analyze

[`analyze()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/analyze.md)
resolves the model, enumerates regions, and returns a `RegionResult`.
With `model = "auto"` (the default), it picks the canonical SVG model
for the dataset’s set count.

``` r

result <- analyze(ds)
result@model
#> [1] "venn-4-set"
length(result@regions)   # number of non-empty regions
#> [1] 15
```

### 5. Render

``` r

svg <- render_venn_svg(result)
nchar(svg)        # SVG length in bytes
#> [1] 6464
substr(svg, 1, 80)
#> [1] "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Created by Zoltan Dul in 2026 - free"
```

To save the SVG:

``` r

writeLines(svg, "cancer_drivers.svg")
```

### What’s next

- [`vignette("v02_real_cancer_drivers")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v02_real_cancer_drivers.md)
  — full walkthrough with custom names, colors, and biological
  interpretation.
- [`vignette("v04_upset_vs_venn_vs_network")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v04_upset_vs_venn_vs_network.md)
  — choose the right visualization per set count.
- [`vignette("v05_statistics_deep_dive")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v05_statistics_deep_dive.md)
  — Jaccard, Dice, hypergeometric, BH-FDR with worked examples.
- [`vignette("v07_pdf_reports")`](https://zoliqua.github.io/Venn-Diagram-Lab/r/articles/v07_pdf_reports.md)
  — generate publication-ready multi-page PDFs.
