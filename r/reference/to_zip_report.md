# Write a Full Report ZIP bundle

Bundles the multi-page PDF report alongside the supporting SVGs (Venn,
UpSet, Network, Share Distribution), TSVs (Region Summary, Item Matrix,
Statistics), the 3-sheet xlsx workbook, and a README.txt provenance
header into a single ZIP. Mirrors the webtool's \*Download Everything\*
button and Python's `vdl report zip`.

## Usage

``` r
to_zip_report(result, path, include_share = TRUE, include_cluster = FALSE)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\] from \[analyze()\].

- path:

  Output \`.zip\` file path.

- include_share:

  Passed through to \[to_pdf_report()\] (default \`TRUE\`).

- include_cluster:

  Passed through to \[to_pdf_report()\] (default \`FALSE\`).

## Value

Invisibly returns \`NULL\`. The ZIP is written to \`path\`.

## Examples

``` r
# \donttest{
if (getRversion() >= "4.6") {
  ds <- load_sample("dataset_real_cancer_drivers_4")
  res <- analyze(ds)
  to_zip_report(res, tempfile(fileext = ".zip"))
}
# }
```
