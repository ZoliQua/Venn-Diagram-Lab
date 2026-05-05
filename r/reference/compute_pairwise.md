# Compute all 5 pairwise statistical tables

Orchestrator that returns a \[\`StatisticsResult-class\`\] populated
with Jaccard, Dice, Overlap Coefficient, Fold Enrichment (square NxN
matrices) plus a long-form hypergeometric table with BH-FDR adjustment.

## Usage

``` r
compute_pairwise(
  set_names,
  inclusive_sizes,
  pairwise_intersections,
  universe_size
)
```

## Arguments

- set_names:

  Ordered character vector of set identifiers (e.g. c("A","B","C")).

- inclusive_sizes:

  Named integer vector of inclusive set sizes
  (\`names(inclusive_sizes)\` matches \`set_names\`).

- pairwise_intersections:

  Named list of pair intersection counts. Keys are "set_a\|set_b" with
  set_a appearing earlier in \`set_names\` than set_b.

- universe_size:

  Hypergeometric universe N (population size). Integer \>= 1.

## Value

A \[\`StatisticsResult-class\`\] object.

## Examples

``` r
compute_pairwise(
    set_names = c("A", "B"),
    inclusive_sizes = c(A = 10L, B = 8L),
    pairwise_intersections = list("A|B" = 5L),
    universe_size = 100L
)
#> An object of class "StatisticsResult"
#> Slot "jaccard":
#>           A         B
#> A 1.0000000 0.3846154
#> B 0.3846154 1.0000000
#> 
#> Slot "dice":
#>           A         B
#> A 1.0000000 0.5555556
#> B 0.5555556 1.0000000
#> 
#> Slot "overlap_coefficient":
#>       A     B
#> A 1.000 0.625
#> B 0.625 1.000
#> 
#> Slot "fold_enrichment":
#>      A    B
#> A   NA 6.25
#> B 6.25   NA
#> 
#> Slot "hypergeometric":
#>   set_a set_b intersection expected      p_value   p_adjusted significant
#> 1     A     B            5      0.8 0.0001636692 0.0001636692        TRUE
#>   highly_significant
#> 1               TRUE
#> 
```
