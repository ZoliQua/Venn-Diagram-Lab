# Package index

## Loading data

Read CSV / TSV / GMT / GMX files into a `VennDataset`, or load one of
the five bundled samples.

- [`load_csv()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/load_csv.md)
  : Load a delimited file (CSV/TSV) into a \[\`VennDataset-class\`\]
- [`load_tsv()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/load_tsv.md)
  : Load a tab-separated file into a \[\`VennDataset-class\`\]
- [`load_gmt()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/load_gmt.md)
  : Load a GMT (Gene Matrix Transposed) file into a
  \[\`VennDataset-class\`\]
- [`load_gmx()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/load_gmx.md)
  : Load a GMX file (transposed GMT) into a \[\`VennDataset-class\`\]
- [`load_sample()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/load_sample.md)
  : Load a bundled sample dataset by name
- [`list_samples()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/list_samples.md)
  : List bundled sample dataset names
- [`list_models()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/list_models.md)
  : List all bundled Venn diagram models

## Analysis

Compute regions and pairwise statistics from a `VennDataset`.

- [`analyze()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/analyze.md)
  : Analyze a Venn diagram dataset
- [`statistics()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/statistics.md)
  : Lazy pairwise statistics for a RegionResult
- [`effective_universe()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/effective_universe.md)
  : Effective hypergeometric universe size for a RegionResult

## Rendering

Generate SVG, ggplot2-based UpSet / Network plots, and multi-page PDF
reports.

- [`render_venn_svg()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/render_venn_svg.md)
  : Render a RegionResult onto its model SVG and return the raw SVG
  string
- [`render_upset()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/render_upset.md)
  : Render an UpSet plot from a RegionResult
- [`render_network()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/render_network.md)
  : Render a force-directed network plot from a RegionResult
- [`to_pdf_report()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/to_pdf_report.md)
  : Compose a multi-page PDF report from a RegionResult

## TSV exports

Byte-equivalent TSV writers for region summaries, item-membership
matrices, and pairwise statistics tables.

- [`to_region_summary_tsv()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/to_region_summary_tsv.md)
  : Write the Region Summary TSV
- [`to_matrix_tsv()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/to_matrix_tsv.md)
  : Write the Item Matrix TSV
- [`to_statistics_tsv()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/to_statistics_tsv.md)
  : Write the pairwise Statistics TSV

## ggplot2 + broom integration

Embed venns in ggplot chains and convert results to tidyverse-friendly
tibbles.

- [`geom_venn()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/geom_venn.md)
  : Embed a rendered Venn diagram as a ggplot2 layer
- [`tidy(`*`<RegionResult>`*`)`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/tidy.RegionResult.md)
  : Tidy method for RegionResult (broom-compatible)
- [`glance(`*`<RegionResult>`*`)`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/glance.RegionResult.md)
  : Glance method for RegionResult (broom-compatible)
- [`augment(`*`<RegionResult>`*`)`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/augment.RegionResult.md)
  : Augment method for RegionResult (broom-compatible)

## Pairwise statistical helpers

Stateless functions for individual metrics. Useful for ad-hoc
calculations outside of
[`analyze()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/analyze.md).

- [`jaccard()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/jaccard.md)
  : Jaccard similarity index
- [`dice()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/dice.md)
  : Sorensen-Dice coefficient
- [`overlap_coefficient()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/overlap_coefficient.md)
  : Szymkiewicz-Simpson overlap coefficient
- [`hypergeometric_p_value()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/hypergeometric_p_value.md)
  : One-sided hypergeometric p-value (over-representation)
- [`fold_enrichment()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/fold_enrichment.md)
  : Fold enrichment (observed / expected ratio)
- [`bh_fdr()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/bh_fdr.md)
  : Benjamini-Hochberg FDR adjustment
- [`compute_pairwise()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/compute_pairwise.md)
  : Compute all 5 pairwise statistical tables

## Area-proportional helpers

Low-level geometry solvers behind `analyze(model = "proportional")`.

- [`solve_2set()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/solve_2set.md)
  : Area-proportional 2-set circle layout
- [`solve_3set()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/solve_3set.md)
  : Area-proportional 3-set circle layout (Wilkinson 2012-style
  triangulation)
- [`circle_intersection_area()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/circle_intersection_area.md)
  : Lens-shaped intersection area of two circles
- [`generate_proportional_svg()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/generate_proportional_svg.md)
  : Generate an area-proportional SVG for a 2- or 3-set RegionResult

## S4 classes

Result types returned by the loaders and analyzers.

- [`VennDataset-class`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/VennDataset-class.md)
  : VennDataset: in-memory representation of a Venn-diagram input
- [`RegionData-class`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/RegionData-class.md)
  : RegionData: one region of a Venn diagram
- [`RegionResult-class`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/RegionResult-class.md)
  : RegionResult: result of analyze()
- [`StatisticsResult-class`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/StatisticsResult-class.md)
  : StatisticsResult: container for pairwise statistical metric tables

## Package

- [`vdl_version()`](https://zoliqua.github.io/Venn-Diagram-Lab/r/reference/vdl_version.md)
  : Get the vennDiagramLab package version
