# Parity Fixtures — Generated from React webapp

**Do not edit by hand.** Regenerate via `npm run fixtures:parity` from the repo root.

**Webapp version:** 2.5.0 (commit 6e7dc87)
**Generated:** 2026-07-15T19:56:04.653Z

## Files

| Sample | Sets | Rows in source | Files |
|---|---|---|---|
| `dataset_real_cancer_drivers_4` | 4 | 20000 | `__venn-4-set__region_summary.tsv`, `__matrix.tsv`, `__statistics.tsv`, `__one_vs_rest.tsv`, `__result.json`, `__network.graphml`, `__network.sif` |
| `dataset_real_msigdb_immune_pathways` | 4 | 4384 | `__venn-4-set__region_summary.tsv`, `__matrix.tsv`, `__statistics.tsv`, `__one_vs_rest.tsv`, `__result.json`, `__network.graphml`, `__network.sif` |
| `dataset_real_msigdb_cancer_pathways` | 5 | 4384 | `__venn-5-set-grunbaum__region_summary.tsv`, `__matrix.tsv`, `__statistics.tsv`, `__one_vs_rest.tsv`, `__result.json`, `__network.graphml`, `__network.sif` |
| `dataset_mock_gene_sets` | 6 | 97 | `__venn-6-set__region_summary.tsv`, `__matrix.tsv`, `__statistics.tsv`, `__one_vs_rest.tsv`, `__result.json`, `__network.graphml`, `__network.sif` |
| `dataset_mock_streaming_platforms` | 8 | 800 | `__venn-8-set__region_summary.tsv`, `__matrix.tsv`, `__statistics.tsv`, `__one_vs_rest.tsv`, `__result.json`, `__network.graphml`, `__network.sif` |

## Regenerating

```bash
cd /Users/Zoli/Code/Orthologs/2-venn-diagram
npm run fixtures:parity
```

After regeneration, run `pytest python/tests/test_parity_with_webapp.py` to confirm Python output still matches.
