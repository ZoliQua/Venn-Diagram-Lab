# scripts/

Tooling that doesn't ship in the wheel or the React build, but is committed for
reproducibility.

## `bio_validation.py`

Independent biological validation of the statistics pipeline. Recomputes every
pairwise statistic (Jaccard, Dice, overlap coefficient, fold enrichment,
hypergeometric p-value, BH-FDR) for all 5 bundled samples with a reference
implementation built only on `math.lgamma` + stdlib `csv` — neither scipy nor
the package's own code is used for reference values. Also asserts
set-theoretic invariants (exclusive regions sum to the union, inclusive =
sum over supersets, universe semantics per mode) and biological plausibility
(cancer-driver catalogs must over-overlap, canonical pan-cancer drivers must
sit in the 4-way intersection, related Hallmark pathways must be enriched,
depleted pairs must stay non-significant).

### When to run

* After modifying statistics / parsing code in any of the three implementations.
* After adding or replacing a bundled sample dataset.

### How

```bash
python3 scripts/bio_validation.py
```

Exit code 0 = all checks passed, 1 = at least one failure (details on stdout).

## `generate-parity-fixtures.mts`

Regenerates the golden TSV fixtures used by
`python/tests/test_parity_with_webapp.py`. Imports the actual webapp TS modules
(`src/utils/csvParser.ts`, `src/utils/exportData.ts`, `src/utils/statistics.ts`)
so the fixtures are exactly what the live web tool would emit if you clicked
"Export Region Summary" / "Export Matrix" / "Export Statistics" on each
bundled sample.

### When to run

* After modifying `csvParser.ts`, `exportData.ts`, or `statistics.ts`.
* After adding or replacing a bundled sample in `python/src/venn_diagram_lab/_data/samples/`.
* After updating the `SAMPLES` table inside the script itself.

### How

```bash
npm run fixtures:parity
```

Then re-run the parity test suite to confirm Python still matches:

```bash
.venv/bin/pytest python/tests/test_parity_with_webapp.py -v
```

If the parity tests now fail, decide whether the webapp change was intentional
(update Python to match) or accidental (revert the webapp change).
