# RegionData: one region of a Venn diagram

Returned as elements of \`RegionResult@regions\`. Bitmask convention:
bit \`i\` set means "in set with index \`i\`" in \`dataset@set_names\`.

## Slots

- `bitmask`:

  Region bitmask (1 to 2^n - 1).

- `label`:

  Human-readable label like \`"AB"\` or \`"ABC"\`.

- `set_indices`:

  Integer vector of 0-based set indices in this region.

- `set_names`:

  Names of the sets in this region.

- `exclusive_items`:

  Items present in exactly these sets.

- `inclusive_items`:

  Items present in at least these sets.
