# venn-diagram-lab — Example Notebooks

Eleven Jupyter notebooks demonstrating common use cases. Each is fully
self-contained: pick the closest match to your task and adapt.

| # | Notebook | Length | Topics |
|---|---|---|---|
| 01 | `01_quickstart.ipynb` | short | First analysis in 10 cells |
| 02 | `02_real_cancer_drivers.ipynb` | long | Cancer-drivers walkthrough + v2.2.3 share distribution / cluster heatmap |
| 03 | `03_proportional_diagrams.ipynb` | medium | Area-proportional 2-3 set diagrams |
| 04 | `04_upset_vs_venn_vs_network.ipynb` | medium | Picking the right visualization (Venn / UpSet / Network / Cluster heatmap) |
| 05 | `05_statistics_deep_dive.ipynb` | long | Jaccard / Dice / Hypergeometric / BH-FDR |
| 06 | `06_pipeline_integration.ipynb` | medium | Snakemake + Nextflow + `vdl workflow run-from` YAML |
| 07 | `07_pdf_reports.ipynb` | short | Multi-page PDF reports |
| 08 | `08_custom_styling_and_export.ipynb` | long | Custom rendering, lxml post-processing, multi-format export |
| 09 | `09_cli_workflows.ipynb` | medium | `vdl` CLI from Python via `subprocess` (tree, help, render, export, validate, workflow, zip) |
| 10 | `10_enrichment_plots_comparison.ipynb` | medium | All 5 enrichment plot families side-by-side: bar / lollipop / heatmap / cluster heatmap / share distribution |
| 11 | `11_data_validation_and_lookup.ipynb` | medium | `vdl data` subapp: validate (+ strict), describe, lookup, fit-model, convert |

## Building / re-running

The notebooks are generated from build scripts at
`python/scripts/notebooks/_build_NN_<topic>.py`. To regenerate one:

```bash
python python/scripts/notebooks/_build_01_quickstart.py
jupyter nbconvert --to notebook --execute --inplace python/examples/01_quickstart.ipynb
```

The CI workflow `.github/workflows/python-notebook-test.yml` runs all 11
notebooks via `nbconvert --execute` on every PR.
