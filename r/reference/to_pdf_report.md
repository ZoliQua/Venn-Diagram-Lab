# Compose a multi-page PDF report from a RegionResult

Writes a US Letter landscape PDF with overview, venn+upset, statistics
tables, and (by default) network and methodology pages. Each page has a
footer with package version, generation timestamp, and page number.

## Usage

``` r
to_pdf_report(
  result,
  path,
  title = NULL,
  include_network = TRUE,
  include_about = TRUE
)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- path:

  Output PDF file path.

- title:

  Optional title override for the overview page.

- include_network:

  If \`TRUE\` (default), include the network page.

- include_about:

  If \`TRUE\` (default), include the methodology page.

## Value

Invisibly returns \`NULL\`. The PDF is written to \`path\`.

## Examples

``` r
# \donttest{
if (getRversion() >= "4.6") {
  result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
  to_pdf_report(result, tempfile(fileext = ".pdf"))
}
# }
```
