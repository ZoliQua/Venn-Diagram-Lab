# venn-diagram-lab

[![CI](https://github.com/ZoliQua/Venn-Diagram-Lab/actions/workflows/python-test.yml/badge.svg)](https://github.com/ZoliQua/Venn-Diagram-Lab/actions/workflows/python-test.yml)
[![PyPI version](https://img.shields.io/pypi/v/venn-diagram-lab.svg)](https://pypi.org/project/venn-diagram-lab/)
[![Python versions](https://img.shields.io/pypi/pyversions/venn-diagram-lab.svg)](https://pypi.org/project/venn-diagram-lab/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Headless Python companion to the [Venn Diagram Lab web tool](https://www.venndiagramlab.org/).
Build, render, and statistically analyse Venn / UpSet diagrams from CSV / TSV / GMT / GMX
inputs — same 44 SVG models, same intersection/Jaccard/hypergeometric statistics, same PDF report
layout — but in a notebook, a Snakemake rule, or a CI job, with no browser involved.

## Install

```bash
pip install venn-diagram-lab
```

That's it — all bundled SVG templates, sample datasets, and the `vdl` CLI ship with the wheel.

**System deps (cairosvg):** the PDF/PNG render path uses [cairosvg](https://cairosvg.org/), which needs the cairo native library. On Linux the wheel works out of the box once you have `libcairo2`. On macOS run `brew install cairo pango`. On Windows install the [GTK3 runtime](https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer) (cairo bundled). CI is currently Linux-only for this reason — see [`CHANGELOG.md`](CHANGELOG.md) "Known limitations".

For development (clone + editable):

```bash
git clone https://github.com/ZoliQua/Venn-Diagram-Lab.git
cd Venn-Diagram-Lab
python -m venv .venv && source .venv/bin/activate
python python/scripts/sync_data.py        # populates _data/ from the React side
pip install -e "python/[dev]"
```

## Quickstart (30 seconds)

```python
from venn_diagram_lab import load_sample, analyze

result = analyze(load_sample("dataset_real_cancer_drivers_4"))
print(result.set_sizes)
# {'Vogelstein': 138, 'COSMIC_CGC': 581, 'OncoKB': 1231, 'IntOGen': 633}

# Render the Venn diagram
result.render_venn().save("cancer_drivers.svg")

# Or a full multi-page PDF report
result.to_pdf_report("cancer_drivers_report.pdf")
```

## Loading your own data

```python
from venn_diagram_lab import load_csv, load_tsv, load_gmt, load_gmx, Dataset, analyze

# Binary 0/1 columns
ds = load_csv("genes.csv", binary=True)

# Aggregated (each column = a set, cells = item names)
ds = load_csv("pathways.csv", binary=False)

# GMT (one set per line)
ds = load_gmt("hallmark.gmt")

# In-memory dict
ds = Dataset.from_dict({
    "Set A": ["x", "y", "z"],
    "Set B": ["y", "z", "w"],
})

result = analyze(ds)
```

## Visualisations

| Method | Output | Best for |
|---|---|---|
| `result.render_venn()` | SVG (vector) | Publication; up to 9 sets via 44 bundled templates |
| `result.render_venn(model='proportional')` | SVG | Area-proportional; 2-3 sets only |
| `result.render_upset()` | matplotlib Figure | 5+ sets where Venn is hard to read |
| `result.render_network()` | matplotlib Figure | Pairwise relationships at a glance |
| `result.to_pdf_report(path)` | Multi-page PDF | One-shot publication-ready report |

All visualisation methods accept the same kwargs as the underlying `render.*` functions — see their docstrings for full reference.

## Statistics

```python
stats = result.statistics       # lazy compute
print(stats.jaccard)            # square pandas DataFrame
print(stats.hypergeometric)     # long-form: pair, intersection, expected, p_value, p_adjusted, ...
```

`compute_pairwise` produces 5 metric tables: Jaccard, Sørensen-Dice, Overlap Coefficient, Fold Enrichment, and the hypergeometric long-form (with Benjamini-Hochberg FDR correction).

## Export to TSV (matches the web tool byte-for-byte)

```python
result.to_region_summary_tsv("regions.tsv")     # depth-sorted region table
result.to_matrix_tsv("matrix.tsv")              # one row per item with set membership
result.to_statistics_tsv("statistics.tsv")      # pairwise stats with FDR
```

These match the React web tool's three Export buttons exactly — including float formatting and spreadsheet-formula escaping. The Phase 7 parity tests (`pytest python/tests/test_parity_with_webapp.py`) prove this for all 5 bundled samples.

## Command-line interface

The wheel installs a `vdl` console script:

| Command | Purpose |
|---|---|
| `vdl version` | Print the package version |
| `vdl list-models` | Table of the 44 bundled SVG models |
| `vdl list-samples` | Table of bundled sample datasets |
| `vdl analyze <input> [--model M] [--mode binary\|aggregated] [--format csv\|tsv\|gmt\|gmx] [--output-dir D] [--venn FILE] [--upset FILE] [--network FILE] [--pdf FILE] [--statistics-tsv FILE]` | Main entry point: load, analyse, optionally write outputs |
| `vdl render-sample <name> [...same output flags...]` | Bundled-sample shortcut |

Without any output flags, both commands print a Rich-styled summary table. With `--output-dir`, all five outputs (svg, png upset, png network, pdf, tsv) are written.

## Notebook gallery

Eight executable notebooks live under [`python/examples/`](https://github.com/ZoliQua/Venn-Diagram-Lab/tree/main/python/examples):

| # | Notebook | Topic |
|---|---|---|
| 01 | `01_quickstart.ipynb` | First analysis in 10 cells |
| 02 | `02_real_cancer_drivers.ipynb` | Biological walkthrough (cancer driver catalogs) |
| 03 | `03_proportional_diagrams.ipynb` | Area-proportional 2/3-set demos |
| 04 | `04_upset_vs_venn_vs_network.ipynb` | Choosing the right visualisation |
| 05 | `05_statistics_deep_dive.ipynb` | Jaccard / Dice / Hypergeometric / BH-FDR |
| 06 | `06_pipeline_integration.ipynb` | Snakemake + Nextflow templates |
| 07 | `07_pdf_reports.ipynb` | Multi-page PDF reports |
| 08 | `08_custom_styling_and_export.ipynb` | lxml SVG post-processing + multi-format export |

Each notebook is built from a `python/scripts/notebooks/_build_NN_*.py` script and executed nightly on CI to prevent bit-rot.

## Bundled sample datasets

| Name | Sets | Items | Source |
|---|---|---|---|
| `dataset_real_cancer_drivers_4` | 4 | 1394 | Vogelstein / COSMIC CGC / OncoKB / IntOGen catalogs |
| `dataset_real_msigdb_cancer_pathways` | 5 | 777 | MSigDB Hallmark cancer pathways |
| `dataset_real_msigdb_immune_pathways` | 4 | 521 | MSigDB Hallmark immune pathways |
| `dataset_mock_gene_sets` | 6 | 3288 | Synthetic for demos |
| `dataset_mock_streaming_platforms` | 8 | 800 | TV/movie titles across 8 streaming services |

```python
from venn_diagram_lab import list_samples, load_sample
list_samples()
ds = load_sample("dataset_real_cancer_drivers_4")
```

## Contributing

The repo monorepos the React web tool and this Python package. After cloning:

```bash
cd Venn-Diagram-Lab
python -m venv .venv && source .venv/bin/activate
python python/scripts/sync_data.py
pip install -e "python/[dev]"
pytest python/tests/ -q
```

Run the slow notebook suite (~3 min):

```bash
pytest python/tests/test_notebooks.py -m slow
```

Regenerate the parity-test fixtures (requires Node 20+):

```bash
npm install
npm run fixtures:parity
```

Conventional commit prefixes used: `feat(python):`, `fix(python):`, `chore(python):`, `docs(python):`, `test(python):`.

## Versioning

Strict SemVer. Pre-1.0 minor bumps may include behavior changes; see [`CHANGELOG.md`](CHANGELOG.md).

## License

MIT — see [`LICENSE`](LICENSE).

## Citation

If you use this package in research, please cite:

```
Dul Z., Ölbei M., Thomas N. S. B., Si Ammour A., Csikász-Nagy A. (2026).
Venn Diagram Lab — interactive Venn / UpSet diagrams (v2.0.0).
https://www.venndiagramlab.org/
DOI: 10.5281/zenodo.20000599
```

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20000599.svg)](https://doi.org/10.5281/zenodo.20000599)

See [`CITATION.cff`](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/CITATION.cff) for machine-readable citation metadata.
