# venn-diagram-lab - Python package

[![CI](https://github.com/ZoliQua/Venn-Diagram-Lab/actions/workflows/python-test.yml/badge.svg)](https://github.com/ZoliQua/Venn-Diagram-Lab/actions/workflows/python-test.yml)
[![PyPI version](https://img.shields.io/pypi/v/venn-diagram-lab.svg?v=2)](https://pypi.org/project/venn-diagram-lab/)
[![Python versions](https://img.shields.io/pypi/pyversions/venn-diagram-lab.svg?v=2)](https://pypi.org/project/venn-diagram-lab/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DOI (Zenodo concept)](http://www.venndiagramlab.org/zenodo.19510813.svg)](https://doi.org/10.5281/zenodo.19510813)

Headless Python companion to the [Venn Diagram Lab web tool](https://www.venndiagramlab.org/). Build, render, and statistically analyse Venn / UpSet diagrams from CSV / TSV / GMT / GMX inputs — same 44 SVG models, same intersection/Jaccard/hypergeometric statistics, same PDF report layout — but in a notebook, a Snakemake rule, or a CI job, with no browser involved. You can integrate it in your programatic workflow.

> **Working in R?** The same analysis + rendering pipeline is available as a CRAN package: [`vennDiagramLab`](https://CRAN.R-project.org/package=vennDiagramLab) (`install.packages("vennDiagramLab")`). Source + docs: in the project's [`r/`](https://github.com/ZoliQua/Venn-Diagram-Lab/tree/main/r) folder · pkgdown site: <https://zoliqua.github.io/Venn-Diagram-Lab/r/>. The three implementations (web tool, Python, R) share the same SVG model library and produce byte-equivalent TSV outputs — see `tests/test_parity_with_webapp.py`.

## 1. Install

```bash
pip install venn-diagram-lab
```

That's it — all bundled SVG templates, sample datasets, and the `vdl` CLI ship with the wheel.

**System deps (cairosvg):** the PDF/PNG render path uses [cairosvg](https://cairosvg.org/), which needs the cairo native library. On Linux the wheel works out of the box once you have `libcairo2`. On macOS run `brew install cairo pango`. On Windows install the [GTK3 runtime](https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer) (cairo bundled). CI is currently Linux-only for this reason — see [`CHANGELOG.md`](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/python/CHANGELOG.md) "Known limitations".

For development (clone + editable):

```bash
git clone https://github.com/ZoliQua/Venn-Diagram-Lab.git
cd Venn-Diagram-Lab
python -m venv .venv && source .venv/bin/activate
python python/scripts/sync_data.py        # populates _data/ from the React side
pip install -e "python/[dev]"
```

### 1.1 Quickstart (30 seconds)

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

### 1.2 Complete User Guide

You can reach the complete [`USER GUIDE`](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/python/docs/USER_GUIDE.md) here in markdown format or downlad it as a [`PDF File`](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/python/docs/USER_GUIDE.pdf).

## 2. Loading your own data

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

## 3. Visualisations

| Method | Output | Best for |
|---|---|---|
| `result.render_venn()` | SVG (vector) | Publication; up to 9 sets via 44 bundled templates |
| `result.render_venn(model='proportional')` | SVG | Area-proportional; 2-3 sets only |
| `result.render_upset()` | matplotlib Figure | 5+ sets where Venn is hard to read |
| `result.render_network()` | matplotlib Figure | Pairwise relationships at a glance |
| `result.to_pdf_report(path)` | Multi-page PDF | One-shot publication-ready report |

All visualisation methods accept the same kwargs as the underlying `render.*` functions — see their docstrings for full reference.

`render_venn_svg` (and `result.render_venn(...)`) also accepts
`show_items=True` to display item identifiers inside each region,
`item_options={...}` for layout tuning, and `highlight=[...]` for a
spotlight mode that desaturates non-matching set shapes. The Region
accessors and Boolean DSL section below covers these in depth.

### 3.1. Matplotlib backend

Three SVG renderers have parallel matplotlib variants for users who want
to compose plots into their own subplot grids (paper figures, multi-panel
dashboards). The SVG variants stay byte-identical to the web tool's
output; the matplotlib variants return an `MplImage(fig, legend)` wrapper.

| Function | Mirrors | Use when |
|---|---|---|
| `render_venn_mpl(result, ax=None)` | `render_venn_svg` | You want a Venn in a `plt.subplots` grid. Supports 2/3/4-set classic + proportional; 5+ raises `IncompatibleModelError`. |
| `render_share_distribution_mpl(dataset, ax=None)` | `render_share_distribution_svg` | You want axis labels / grid / log scale on the share-distribution histogram. |
| `render_cluster_heatmap_mpl(result, ax=None, linkage=...)` | `render_cluster_heatmap_svg` | You want a colorbar + dendrograms on the cluster heatmap. |

CLI counterparts: `vdl render venn --backend mpl --out v.png`,
`vdl render share-dist --backend mpl --out s.png`,
`vdl render heatmap --backend mpl --cluster --out h.png`. The default
backend stays `svg`.

`SvgImage` exposes both `_repr_svg_()` and `_repr_mimebundle_()` Jupyter
hooks, so calling an `SvgImage` object directly in a notebook cell
renders inline without an explicit `display(SVG(...))` import.

## 4. Statistics and Charts

```python
stats = result.statistics       # lazy compute
print(stats.jaccard)            # square pandas DataFrame
print(stats.hypergeometric)     # long-form: pair, intersection, expected, p_value, p_adjusted, ...
```

`compute_pairwise` produces 5 metric tables: 
- Jaccard, 
- Sørensen-Dice, 
- Overlap Coefficient, 
- Fold Enrichment, and the 
- Hypergeometric long-f

### 4.1. Enrichment bar + lollipop charts

The webtool's Statistics panel shows the same pairwise data three ways (bar, lollipop, heatmap). Python exposes all three:

```python
from venn_diagram_lab import analyze, load_sample
from venn_diagram_lab.render.svg import (
    render_cluster_heatmap_svg,
    render_enrichment_bar_svg,
    render_enrichment_lollipop_svg,
)

result = analyze(load_sample("dataset_real_cancer_drivers_4"))

render_enrichment_bar_svg(result).save("bar.svg")
render_enrichment_lollipop_svg(result, metric="foldEnrichment").save("lollipop.svg")
render_cluster_heatmap_svg(result, linkage="average").save("heatmap.svg")
```

Both bar and lollipop accept `metric="neglog10fdr"` (default — bar height ∝ `-log10(BH-FDR)`) or `metric="foldEnrichment"` (bar height ∝ fold-enrichment over the universe). Significant pairs (`FDR<0.05`) fill with `#2e7d32`; non-significant with `#888888`. Markers `***`/`**`/`*` mark `FDR<0.001`/`<0.01`/`<0.05` respectively.

CLI:

```bash
vdl render bar --sample
vdl render lollipop --sample --metric foldEnrichment
```

### 4.2. Item Share Distribution + Cluster Heatmap

Two additional statistics surfaces complement the pairwise tables:

| Function | Purpose |
|---|---|
| `item_share_distribution(matrix)` | Histogram of how many sets each item belongs to (1, 2, ..., n) |
| `cluster_set_order(D, method="average")` | UPGMA / complete / single hierarchical linkage on a distance matrix; returns leaf order + dendrogram merges |
| `render_share_distribution_svg(dataset)` | SVG bar chart of the item-share distribution |
| `render_cluster_heatmap_svg(result, linkage="average")` | Pairwise-Jaccard heatmap with UPGMA-reordered axes and side dendrograms |

```python
from venn_diagram_lab import load_sample, analyze
from venn_diagram_lab.share_distribution import item_share_distribution
from venn_diagram_lab.render.svg import (
    render_share_distribution_svg,
    render_cluster_heatmap_svg,
)

ds = load_sample("dataset_real_cancer_drivers_4")
dist = item_share_distribution(ds.matrix)   # {1: 722, 2: 275, 3: 277, 4: 120}

img = render_share_distribution_svg(ds)
print(img.svg[:200])

result = analyze(ds)
heatmap = render_cluster_heatmap_svg(result, linkage="average")
print(heatmap.svg[:200])
```

Both renderers return the same `SvgImage` dataclass as `render_venn_svg`, so `.save("plot.svg" | "plot.png" | "plot.pdf")` works uniformly.

### 4.3. PDF and ZIP reports

`to_pdf_report` produces a multi-page PDF with the dataset overview,
Venn + UpSet on a single page, paginated statistics tables, an Item
Share Distribution page, an optional Cluster Heatmap page, and a
network panel with the significant pairwise edges. A *Credits and
Cite* footer closes the report.

```python
result.to_pdf_report("report.pdf", cluster_heatmap=True)
```

```bash
# or via CLI:
vdl report pdf --sample --cluster-heatmap
```

`vdl report zip` bundles everything in one archive: the PDF, four
SVGs (Venn, UpSet, Network, Share Distribution), three TSVs (regions,
matrix, statistics), a three-sheet `enrichment_statistics_{n}-sets.xlsx`
workbook (Jaccard, Sørensen-Dice, Intersection Enrichment), and a
`README.txt` with provenance + the *About This Report* methodology
section.

## 5. Region accessors and Boolean DSL

Four composable helpers for selecting items and regions inside an
analysed diagram. The accessors and the DSL chain naturally with the
renderers in the previous section.

```python
from venn_diagram_lab import (
    analyze, load_sample,
    intersection_items, exclusive_items, union_items,
    parse_region_expression, render_venn_svg,
)

res = analyze(load_sample("dataset_real_cancer_drivers_4"))

# Items in EVERY named set (regardless of other memberships).
intersection_items(res, ["Vogelstein", "COSMIC_CGC", "OncoKB"])

# Items in EXACTLY this combination (and no other set).
exclusive_items(res, ["Vogelstein", "COSMIC_CGC"])

# Items in ANY of the named sets (deduplicated).
union_items(res, ["Vogelstein", "COSMIC_CGC"])

# Boolean DSL -> sorted list of region bitmasks.
masks = parse_region_expression("A & B + B & C", n_sets=4)
# -> [3, 6, 7, 11, 14, 15]

# Spotlight: render the Venn with only the matching regions highlighted.
render_venn_svg(res, highlight=masks, show_items=True,
                item_options={"max_items_per_region": 8,
                              "truncate_long_names": 10}).save("spotlight.svg")
```

DSL grammar: atoms `A..I`, `&` intersection, `|` or `+` union, `~` or
`!` complement, parentheses for grouping. Precedence (highest first):
unary > intersection > union; binary operators are left-associative.

`render_venn_svg`'s `show_items=True` replaces the per-region count
text with the actual item identifiers as multi-line tspans inside the
existing `Count_*` text nodes. `item_options` keys (defaults):
`max_items_per_region=20`, `ncol_items=1`, `truncate_long_names=12`
(0 disables), `line_height=10`, `font_size=8`,
`show_counts_with_items=False`, `ellipsis="..."`. Regions exceeding
`max_items_per_region` show a trailing `"+N more"` line.

`highlight` accepts a sequence of region labels (`["AB", "ABC"]`) or
of region bitmasks (e.g. the output of `parse_region_expression`).
Sets that do not contribute to any highlighted region are desaturated
to `#cccccc` at 25% opacity.

CLI surface:

```bash
# Items in this exact combination.
vdl data items dataset_real_cancer_drivers_4 \
    --mode exclusive --sets A,B --out -

# DSL debug / validator.
vdl data regions --expr "A & B + B & C" --n-sets 4
# -> 3,6,7,11,14,15

# Spotlight render with DSL highlight.
vdl render venn --sample --show-items \
    --highlight-expr "A & B & ~C & ~D" --out /tmp/spot.svg
```

## 6. Export to TSV and JSON

The TSV/JSON files match the web tool's byte-for-byte.

```python
result.to_region_summary_tsv("regions.tsv")     # depth-sorted region table
result.to_matrix_tsv("matrix.tsv")               # one row per item with set membership
result.to_statistics_tsv("statistics.tsv")       # pairwise stats with FDR
result.to_one_vs_rest_tsv("one_vs_rest.tsv")     # each set vs. the union of all other sets
result.to_json("result.json")                    # full result + statistics as one JSON document
```

These match the React web tool's Export buttons exactly — including float formatting and spreadsheet-formula escaping. Byte-equivalence is enforced by the cross-package parity tests (`pytest python/tests/test_parity_with_webapp.py`) for all 5 bundled samples.

`to_statistics_tsv` columns: `Set_A, Set_B, Name_A, Name_B, Size_A, Size_B, Intersection,
Union, Jaccard, Overlap_Coeff, Dice, Expected, Fold_Enrichment, P_value, FDR, Bonferroni,
P_two_sided, Jaccard_CI_low, Jaccard_CI_high, Dice_CI_low, Dice_CI_high, Significant`.
`P_value` is the **one-sided** Fisher's exact over-representation p-value (same
hypergeometric test as before); `P_two_sided` is the **two-sided** Fisher's exact variant
of the same pair. `Bonferroni` is the FWER-adjusted p-value (`min(1, p * m)`, `m` = number
of pairwise tests), reported alongside the existing Benjamini-Hochberg `FDR` column.
`Jaccard_CI_low/high` and `Dice_CI_low/high` are analytic Wilson 95% confidence intervals.

`to_one_vs_rest_tsv` columns: `Set, Name, Size, Rest_Size, Intersection, Expected,
Fold_Enrichment, P_value, FDR, Bonferroni, Significant` — one row per input set, tested
against the union of all *other* sets via the same hypergeometric machinery as
`to_statistics_tsv`.

`to_json` (and the string-returning `to_json_str`) bundle the model id, set names,
universe size, every non-empty region (exclusive/inclusive counts + exclusive items),
single-set sizes, and the pairwise statistics array — including `bonferroni` and
`pTwoSided` — in one document, matching the web tool's "Full Result (JSON)" export and
the R `to_result_json()` byte-for-byte.

Note: these new columns/exports live in the **TSV/JSON export layer**, not in the PDF
report tables (`to_pdf_report`) — the PDF's Statistics pages keep their existing
Jaccard/Dice/OC/FE/P-value/FDR columns.

### 6.1. Cytoscape network export (GraphML / SIF)

```python
result.to_network_graphml("network.graphml")   # default metric: intersection
result.to_network_sif("network.sif", metric="jaccard")
```

`to_network_graphml(path, *, metric="intersection")` and `to_network_sif(path, *,
metric="intersection")` write the same force-directed set-relationship network as
`render_network()` (nodes = sets, edges = every pairwise overlap) in Cytoscape-compatible
formats. `metric` is one of `"intersection"` (default), `"jaccard"`,
`"fold_enrichment"`, `"overlap_coefficient"` and only changes the `weight` value written
for each edge — every pairwise edge is always included. String-returning variants
`to_network_graphml_str(metric=...)` / `to_network_sif_str(metric=...)` are also
available. Output is byte-identical to the web tool's Network-view "Export GraphML" /
"Export SIF" buttons, the npm `toNetworkGraphml` / `toNetworkSif`, and R's
`to_network_graphml()` / `to_network_sif()`.

## 7. Command-line interface

The wheel installs a `vdl` console script with a Typer-based subapp layout (commands are listed alphabetically in `vdl --help` and inside each subapp). Every subcommand has an extended `--help` page with a *How to try it* example block, and every dataset-consuming command accepts a
`--sample` flag that runs the demo on the bundled `dataset_real_cancer_drivers_4` fixture without a positional argument.

The full tree is discoverable in one shot via `vdl tree`. Below is the v2.2.2 catalog grouped by subapp:

### 7.1. Top-level shortcuts

| Command | Purpose |
|---|---|
| `vdl version` | Print the package version (single line, script-friendly). |
| `vdl list-models` | Rich table of the 44 bundled SVG models. |
| `vdl list-samples` | Rich table of bundled sample datasets. |
| `vdl share-dist <input> [--out F]` | Item Share Distribution histogram (shortcut for `vdl render share-dist`). |
| `vdl cluster <input> [--linkage M] [--out F]` | Cluster-rendered heatmap (shortcut for `vdl render heatmap --cluster`). |
| `vdl tree` | Print every command in the CLI as a tree. |
| `vdl about` | Short overview of Venn diagrams (abridged from the web tool's About dialog). |
| `vdl credits` | Authors, citation, and links (web tool / Zenodo / PyPI / CRAN). |
| `vdl analyze ...` | **Deprecated** (removed in v2.3) — Swiss-army analyzer; see migration hints. |
| `vdl render-sample ...` | **Deprecated** (removed in v2.3) — bundled-sample shortcut for the old `analyze`. |

### 7.2. `vdl render` — visual outputs

Each render command accepts `INPUT` (file path or bundled sample name) or
`--sample` for demo mode. Format is inferred from the `--out` extension
(`.svg` / `.png` / `.pdf`); default output is `<stem>__<kind>.svg` in CWD.

| Command | Purpose |
|---|---|
| `vdl render bar <input> [--metric M]` | Pairwise-enrichment bar chart (`-log10 FDR` or `foldEnrichment`). |
| `vdl render heatmap <input> [--cluster --linkage M]` | Pairwise Jaccard / FDR heatmap, optionally cluster-reordered. |
| `vdl render lollipop <input> [--metric M]` | Pairwise-enrichment lollipop chart (same metric set as `bar`). |
| `vdl render network <input>` | Force-directed set-relationship network. |
| `vdl render share-dist <input>` | Item Share Distribution histogram (item-membership counts per k). |
| `vdl render upset <input>` | UpSet plot for the dataset's intersection structure. |
| `vdl render venn <input>` | Venn diagram (44 SVG models + area-proportional 2/3-set). |
| `vdl render all <input> --output-dir D` | One-shot bundle: all five SVGs into one directory. |

### 7.3. `vdl export` — TSV / JSON / network table writers

Stdout pipe via `--out -` (text format only). All commands route through
the same `RegionResult` writer methods as the Python API.

| Command | Purpose |
|---|---|
| `vdl export region-summary <input>` | Per-region exclusive + inclusive counts + items. |
| `vdl export matrix <input>` | Binary item × set membership matrix. |
| `vdl export statistics <input>` | Pairwise Jaccard / Dice / OC / FE / hypergeometric / BH-FDR / Bonferroni / two-sided Fisher / Jaccard+Dice Wilson CIs. |
| `vdl export pairwise <input>` | Alias of `statistics` (common bioinformatics synonym). |
| `vdl export one-vs-rest <input>` | Each set vs. the union of all other sets (size / expected / fold-enrichment / P-value / FDR / Bonferroni). |
| `vdl export json <input>` | Full result + statistics as a single JSON document (`RegionResult.to_json`). |
| `vdl export graphml <input> [--metric M]` | Cytoscape GraphML network export (`RegionResult.to_network_graphml`). |
| `vdl export sif <input> [--metric M]` | Cytoscape SIF network export (`RegionResult.to_network_sif`). |

`--metric` for `graphml`/`sif` accepts `intersection` (default), `jaccard`,
`fold_enrichment`, or `overlap_coefficient` and only changes the edge `weight` value —
every pairwise edge is always written.

### 7.4. `vdl report` — multi-page bundles

| Command | Purpose |
|---|---|
| `vdl report pdf <input> [--cluster-heatmap] --out R.pdf` | Multi-page PDF report (mirrors the web tool's *Report PDF*). `--cluster-heatmap` appends the cluster-ordered Jaccard heatmap page. |
| `vdl report zip <input> --out R.zip` | Full bundle ZIP (4 SVGs + 3 TSVs + 1 XLSX + 1 PDF + README.txt). |

### 7.5. `vdl data` — data operations

| Command | Purpose |
|---|---|
| `vdl data convert <in> <out>` | Format conversion (TSV ⇄ CSV). |
| `vdl data describe <input>` | Quick summary (set count, item count, top regions). |
| `vdl data fit-model <input>` | Recommend a catalog-resident model name for the input's set count. |
| `vdl data lookup <input> <item>` | Find which Venn region(s) contain a given item (script-friendly Find Item). |
| `vdl data samples` | List bundled sample datasets. |
| `vdl data validate <input> [--text] [--strict]` | Schema check + data-quality scan (duplicate items, empty cells, case collisions); JSON by default, `--text` for colourised output. Exit 1 on errors (`--strict` promotes warnings to errors). |

Data-quality findings come from `analyze_data_quality(headers, rows, columns, file_type)`
(`from venn_diagram_lab.io import analyze_data_quality`) — a pure, read-only scan that
never mutates the input or folds item case; case collisions (e.g. `TP53` vs `tp53`) are
reported, not merged. `vdl data validate` folds its output into the `warnings` array by
default, or into `errors` (non-zero exit) under `--strict`.

### 7.6. `vdl model` — model catalog

| Command | Purpose |
|---|---|
| `vdl model list` | Names of the 44 bundled models. |
| `vdl model info <name>` | Set count, geometry family, display name for one model. |
| `vdl model svg <name> [--out F]` | Write the raw bundled SVG template (no substitution). |

### 7.7. `vdl workflow` — project helpers

| Command | Purpose |
|---|---|
| `vdl workflow init <dir>` | Scaffold `data/` + `output/` + sample `analysis.yaml`. |
| `vdl workflow bench <input>` | Per-stage timing (load / analyze / 5 renderers / total). |
| `vdl workflow run-from <cfg.yaml>` | Execute every step in a YAML config (`outputs: [{kind, out, …}]`). |

### 7.8. Examples

```bash
# Demo mode (no input file needed)
vdl render venn --sample
vdl render heatmap --sample --cluster --linkage average
vdl share-dist --sample
vdl report pdf --sample --out demo.pdf

# Real workflow
vdl data validate data/my_genes.tsv --text
vdl render all data/my_genes.tsv --output-dir output/
vdl export pairwise data/my_genes.tsv --out output/stats.tsv

# Config-driven batch run
vdl workflow init my_project/
edit my_project/analysis.yaml
vdl workflow run-from my_project/analysis.yaml

# Discovery
vdl tree                       # all 33 commands in one tree
vdl render --help              # subapp help (alphabetical)
vdl render venn --help         # extended help with "How to try it" examples
```

## 8. Notebook gallery

Twelve executable notebooks live under [`python/examples/`](https://github.com/ZoliQua/Venn-Diagram-Lab/tree/main/python/examples):

| # | Notebook | Topic |
|---|---|---|
| 01 | `01_quickstart.ipynb` | First analysis in 10 cells |
| 02 | `02_real_cancer_drivers.ipynb` | Biological walkthrough (cancer driver catalogs); v2.2.3 adds Item Share Distribution + Cluster Heatmap on the 4-catalog overlap |
| 03 | `03_proportional_diagrams.ipynb` | Area-proportional 2/3-set demos |
| 04 | `04_upset_vs_venn_vs_network.ipynb` | Choosing the right visualisation; v2.2.3 adds Cluster Heatmap as a 4th option + 4-row decision summary |
| 05 | `05_statistics_deep_dive.ipynb` | Jaccard / Dice / Hypergeometric / BH-FDR + v2.2.3 bar/lollipop/cluster-heatmap side-by-side |
| 06 | `06_pipeline_integration.ipynb` | Snakemake + Nextflow templates + `vdl workflow run-from` YAML config runner |
| 07 | `07_pdf_reports.ipynb` | Multi-page PDF reports, with `cluster_heatmap=True` opt-in |
| 08 | `08_custom_styling_and_export.ipynb` | lxml SVG post-processing + multi-format export |
| 09 | `09_cli_workflows.ipynb` | **New (v2.2.3)** — Drive the `vdl` CLI from Python notebooks via `subprocess`; demo of 6 representative commands + decision table |
| 10 | `10_enrichment_plots_comparison.ipynb` | **New (v2.2.3)** — Bar / Lollipop / Heatmap / Cluster Heatmap / Item Share Distribution side-by-side comparison + metric switching |
| 11 | `11_data_validation_and_lookup.ipynb` | **New (v2.2.3)** — Data-hygiene workflow: `vdl data validate` (JSON+text+strict), batch `vdl data lookup` over a gene list, `describe` / `fit-model` / `convert` |
| 12 | `12_region_accessors_and_dsl.ipynb` | Region accessors + Boolean DSL + spotlight render; composability chain (DSL → mask → highlight) + a CLI sub-tutorial via `subprocess.run` (`vdl data items` / `vdl data regions` / `vdl render venn --highlight-expr`) |

Each notebook is built from a `python/scripts/notebooks/_build_NN_*.py` script and executed nightly on CI to prevent bit-rot.

## 9. Bundled sample datasets

| Name | Sets | Items | Source |
|---|---|---|---|
| `dataset_real_cancer_drivers_4` | 4 | 1394 | Vogelstein / COSMIC CGC / OncoKB / IntOGen catalogs |
| `dataset_real_msigdb_cancer_pathways` | 5 | 777 | MSigDB Hallmark cancer pathways |
| `dataset_real_msigdb_immune_pathways` | 4 | 521 | MSigDB Hallmark immune pathways |
| `dataset_mock_gene_sets` | 6 | 97 | Synthetic for demos (trimmed in v2.1.1) |
| `dataset_mock_streaming_platforms` | 8 | 800 | TV/movie titles across 8 streaming services |

```python
from venn_diagram_lab import list_samples, load_sample
list_samples()
ds = load_sample("dataset_real_cancer_drivers_4")
```

## 10. Contributing

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

## 11. Versioning

Strict SemVer. Pre-1.0 minor bumps may include behavior changes; see [`CHANGELOG.md`](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/python/CHANGELOG.md).

## 12. License, Citation and Credits

MIT — see [`LICENSE`](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/python/LICENSE).

### 12.1. Citation

If you use this package in research, please cite the software using the Zenodo concept (all-versions) DOI — it always resolves to the latest archived release, so there is nothing to update per version:

```
Dul Z., Ölbei M., Thomas N. S. B., Si Ammour A., Csikász-Nagy A. (2026).
Venn Diagram Lab — interactive Venn / UpSet diagrams.
https://www.venndiagramlab.org/
DOI: 10.5281/zenodo.19510813 (concept, all versions)
```

[![DOI](http://www.venndiagramlab.org/zenodo.19510813.svg)](https://doi.org/10.5281/zenodo.19510813)

The R companion package also has a CRAN-minted DOI:
[`10.32614/CRAN.package.vennDiagramLab`](https://doi.org/10.32614/CRAN.package.vennDiagramLab).

See [`CITATION.cff`](https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/CITATION.cff) for machine-readable citation metadata.

### 12.2. See also

| Language| Platform |  Package / URL | Status |
|---|---|---|---|
| Typescript | Web | <https://www.venndiagramlab.org/> | live |
| Python | PyPi | [`venn-diagram-lab` on PyPI](https://pypi.org/project/venn-diagram-lab/) | live |
| R | CRAN | [`vennDiagramLab` on CRAN](https://CRAN.R-project.org/package=vennDiagramLab) | live |
| Node.js | npm | [`venn-diagram-lab` on npm](https://www.npmjs.com/package/venn-diagram-lab) | live |
| R | Bioconductor | [`vennDiagramLab` on Bioconductor](https://bioconductor.org/packages/vennDiagramLab) | submission pending |
