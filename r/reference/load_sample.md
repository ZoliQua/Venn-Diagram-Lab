# Load a bundled sample dataset by name

Sample datasets ship inside the package under \`inst/extdata/samples/\`
and cover biological (cancer drivers, MSigDB pathways) and mock
(streaming platforms, gene sets) use cases. Use \[list_samples()\] to
enumerate.

## Usage

``` r
load_sample(name)
```

## Arguments

- name:

  Sample identifier from \[list_samples()\].

## Value

A \[\`VennDataset-class\`\] with the appropriate format and mode
applied.

## Examples

``` r
ds <- load_sample("dataset_mock_gene_sets")
length(ds@set_names)
#> [1] 6
# \donttest{
ds <- load_sample("dataset_real_cancer_drivers_4")
analyze(ds)@model
#> [1] "venn-4-set"
# }
```
