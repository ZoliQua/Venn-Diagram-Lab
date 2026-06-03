# Parse a Boolean region expression into bitmasks

Translates an expression like \`"A & B + !C"\` into a sorted integer
vector of region bitmasks (each \`1..2^n_sets - 1\`). The output is
intended for composition with \[render_venn_svg()\] (\`highlight =
...\`) and with the region-accessor family in user code.

## Usage

``` r
parse_region_expression(expr, n_sets)
```

## Arguments

- expr:

  Character scalar; a Boolean expression in the grammar above.

- n_sets:

  Integer; number of sets in the diagram (2..9).

## Value

Sorted integer vector of region bitmasks. Empty integer vector when the
expression is satisfiable by no region (e.g. \`"A & ~A"\`).

## Details

Grammar:

- \`A\`, \`B\`, ..., \`I\` — set atoms (uppercase ASCII).

- \`&\` — intersection.

- \`\|\` or \`+\` — union.

- \`~\` or \`!\` — complement (unary, against \`1..2^n_sets - 1\`).

- \`(\`, \`)\` — grouping.

Precedence (highest first): \`~ !\`, \`&\`, \`\| +\`. Binary operators
are left-associative.

## Examples

``` r
parse_region_expression("A & B", n_sets = 3L)        # c(3L, 7L)
#> [1] 3 7
parse_region_expression("A + B", n_sets = 3L)        # c(1, 2, 3, 5, 6, 7)
#> [1] 1 2 3 5 6 7
parse_region_expression("A & ~B", n_sets = 3L)       # c(1L, 5L)
#> [1] 1 5
parse_region_expression("(A | B) & C", n_sets = 3L)  # c(5L, 6L, 7L)
#> [1] 5 6 7
```
