# RegionResult: result of analyze()

Bundles the input dataset, chosen model, region map, set sizes, and a
lazy \[\`StatisticsResult-class\`\] accessible via
\`statistics(result)\`.

## Slots

- `dataset`:

  The input \[\`VennDataset-class\`\].

- `model`:

  Resolved model name (e.g. \`"venn-4-set"\` or \`"proportional"\`).

- `regions`:

  Named list keyed by \`as.character(bitmask)\`, each value a
  \[\`RegionData-class\`\]. Only non-empty regions are stored (sparse
  for high set counts with few overlaps).

- `set_sizes`:

  Named integer vector: set name -\> inclusive size.

- `is_approximate`:

  \`TRUE\` for the proportional 3-set layout where exact areas can't be
  achieved with circles.
