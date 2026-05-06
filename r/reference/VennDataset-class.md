# VennDataset: in-memory representation of a Venn-diagram input

Returned by the \`load\_\*()\` family and consumed by \[analyze()\].
Holds the deduplicated set members, first-seen item ordering for
byte-equivalent TSV output, and source metadata (path, format, optional
hypergeometric universe size).

## Slots

- `set_names`:

  Ordered character vector of set identifiers (length 2-9).

- `items`:

  Named list (\`names(items) == set_names\`) of character vectors, each
  containing the deduplicated members of the corresponding set.

- `item_order`:

  First-seen insertion order of all items across all sets, matching JS
  Set/Map semantics. Used by TSV writers (Phase 2) for byte-equivalent
  output to the web tool.

- `universe_size`:

  Hypergeometric universe N (population size) from the source file, when
  known. Binary CSV/TSV loaders set this to the row count (matching the
  web tool's \`csv.rows.length\`); other formats leave it \`NULL\`,
  signaling "compute as length(item_order)" downstream.

- `source_path`:

  Original file path if loaded from disk; \`NULL\` for in-memory
  datasets.

- `format`:

  Source format: one of \`"csv"\`, \`"tsv"\`, \`"gmt"\`, \`"gmx"\`.
