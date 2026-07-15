# Write the one-vs-rest Enrichment TSV

Mirrors the React webapp's "Enrichment: one-vs-rest (TSV)" export
button + Python's \`RegionResult.to_one_vs_rest_tsv()\` byte-for-byte.

## Usage

``` r
to_one_vs_rest_tsv(result, path)

# S4 method for class 'RegionResult'
to_one_vs_rest_tsv(result, path)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- path:

  Destination file path.

## Value

Invisibly returns \`path\`.

## Details

Each set S is tested against the union of all OTHER sets. \`Rest_Size\`
is derived from \`U\` (the union of ALL sets = sum of exclusive counts
over every non-empty region), NOT from \[effective_universe()\] (\`N\`)
– see \[one_vs_rest_enrichment()\] for the full derivation. Float
formatting mirrors \[to_statistics_tsv()\] byte-for-byte:

Columns: Set, Name, Size, Rest_Size, Intersection, Expected,
Fold_Enrichment, P_value, FDR, Bonferroni, Significant. \* Expected: 2
decimals \* Fold_Enrichment: 3 decimals \* P_value / FDR / Bonferroni:
scientific (JS toExponential(2)) if \`\< 0.001\`, else 6 decimals \*
Significant: one of \`"\*\*\*"\`, \`"\*\*"\`, \`"\*"\`, \`"ns"\` keyed
off FDR thresholds (0.001, 0.01, 0.05).

Rows are sorted by P_value ascending (matches the underlying
\[one_vs_rest_enrichment()\] table).

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
to_one_vs_rest_tsv(result, tempfile(fileext = ".tsv"))
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
to_one_vs_rest_tsv(result, tempfile(fileext = ".tsv"))
# }
```
