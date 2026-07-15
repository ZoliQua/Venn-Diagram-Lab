# Write the full Venn result + statistics as canonical JSON

Mirrors the React webapp's "Full Result (JSON)" export
(\`exportResultJson\`, \`packages/core/src/jsonExport.ts\`) and Python's
\`RegionResult.to_json()\` byte-for-byte.

## Usage

``` r
to_result_json(result, path)

# S4 method for class 'RegionResult'
to_result_json(result, path)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\].

- path:

  Destination file path.

## Value

Invisibly returns \`path\`.

## Details

Schema (key order PINNED): “\` "schemaVersion": "1", "model": "\<model
id\>", "setNames": "A": "...", ... , "universeSize": \<int\>, "regions":
\[ "label", "sets": \[...\], "depth": \<int\>, "exclusiveCount":
\<int\>, "inclusiveCount": \<int\>, "exclusiveItems": \[...\] , ... \],
"setSizes": "A": \<int\>, ... , "statistics": \[ "a", "b", "jaccard",
"dice", "overlapCoeff", "intersection", "union", "expected",
"foldEnrichment", "pValue", "fdr", "bonferroni", "pTwoSided",
"significant": "\*\*\*" \| "\*\*" \| "\*" \| "ns" , ... \] “\`

\`regions\` covers all \`2^n - 1\` non-empty subsets, sorted by depth
ascending then label ascending (ASCII); \`exclusiveItems\` preserves the
dataset item order. \`statistics\` is sorted by p-value ascending, with
\`significant\` rendered as the FDR star label. Every number is emitted
through a shared number-rendering rule (fixed 6-decimal, trailing zeros
stripped, never scientific) so the bytes match the webapp and Python
exports. No trailing newline is written.

## Examples

``` r
ds <- methods::new("VennDataset",
    set_names = c("A", "B"),
    items = list(A = c("x", "y"), B = c("y", "z")),
    item_order = c("x", "y", "z"),
    universe_size = 10L, source_path = NULL, format = "csv")
result <- analyze(ds)
to_result_json(result, tempfile(fileext = ".json"))
# \donttest{
result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
to_result_json(result, tempfile(fileext = ".json"))
# }
```
