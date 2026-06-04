# Changelog — venn-diagram-lab (Python package)

The Python package's history is co-developed with the React web tool. The
authoritative full history lives at the repo-root [`CHANGELOG.md`][root]
under the `## v1.14.0 — 2026-05-01` and later sections; this file
summarises the Python-only changes.

[root]: https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/CHANGELOG.md

## v2.2.3 — 2026-05-31 — Enrichment bar + lollipop + data lookup + PDF/ZIP report parity

- New `render_enrichment_bar_svg(result, metric=...)` and
  `render_enrichment_lollipop_svg(result, metric=...)` — close the 3-card
  Statistics-panel gap with the webtool (bar + lollipop + heatmap).
- Two metrics supported per renderer: `"neglog10fdr"` (default) and
  `"foldEnrichment"`; significance palette and markers match
  `DEFAULT_PLOT_STYLE` from `src/utils/enrichmentPlotStyle.ts`.
- New CLI commands `vdl render bar` and `vdl render lollipop` (alphabetical
  position in the catalog table; epilogs follow the same shape as the
  other render subcommands).
- New `vdl data lookup <INPUT> <ITEM>` — script-friendly equivalent of the
  webtool's Find Item global search; prints every region containing the
  item with its set composition and exclusive-item count.
- **PDF report:** new **Item Share Distribution** page (histogram + per-bin
  table + explanation), always present between the Statistics tables and
  the Network page — mirrors the webtool's v2.2.2 PDF addition.
- **PDF report:** new opt-in `cluster_heatmap=True` parameter on
  `render_pdf_report` / `RegionResult.to_pdf_report` (CLI: `vdl report pdf
  --cluster-heatmap`). Appends the cluster-ordered Jaccard heatmap page,
  mirroring the webtool's `axisOrder=cluster` toggle.
- **ZIP bundle:** now ships `enrichment_statistics_{n}-sets.xlsx` (3-sheet
  Excel workbook: Jaccard / Sørensen-Dice / Enrichment, via the new
  `venn_diagram_lab.report.to_excel_workbook`) and a `README.txt` carrying
  provenance + the full *About This Report* methodology text.
- Direct dep `openpyxl >= 3.1` added (previously transitive via pandas).
- Tests +13 (`tests/test_cli_render.py`, `tests/test_cli_data.py`,
  `tests/test_cli_report.py`); ruff + mypy clean; full suite 460 passing.

## v2.2.2 — 2026-05-31 — Item Share Distribution + Cluster Heatmap

- New `item_share_distribution(matrix)` returning a per-membership-count
  item-total dict.
- New `cluster_set_order(D, method=...)` and `render_cluster_heatmap_svg(...)`
  for UPGMA / complete / single linkage on a 1 − Jaccard distance matrix.
- New `render_share_distribution_svg(dataset)` for the histogram.
- Mirrors webtool v2.2.2 and R v2.2.2 (cross-package parity tests in CI).

## v2.0.3 — 2026-05-06 — Pre-submission feedback fixes (Marci)

Patch release addressing the three Python bugs surfaced during pre-submission testing of the v2.0.2 wheel.

### Fixed

- **`render_upset` and `render_network` no longer double-render in Jupyter notebooks.** Both render functions now call `plt.close(fig)` immediately before wrapping the Figure in `MplImage`. This detaches the figure from `pyplot`'s state machine, so the IPython inline backend no longer auto-displays it in addition to `MplImage._repr_png_`. SVG renders (`render_venn_svg`) were never affected — they don't go through matplotlib.
- **`render_upset` y-axis matrix now shows real set names, not just internal letter ids.** Previously the y-tick labels displayed the internal `"A"`, `"B"`, … abbreviations; the dataset's `set_names` (e.g. `"Vogelstein"`) were thrown away. The y-tick labels now render as `f"{letter} — {name}"` (e.g. `"A — Vogelstein"`), preserving the letter for cross-reference with the x-axis intersection labels (`"AB"`, `"ABC"`) while making the set identities directly readable. Long names may overflow the left panel; trim them upstream if that is a concern.
- **`load_gmt` / `load_gmx` >9-set error messages are now actionable.** The terse "max supported is 9. Filter the file before loading." message is replaced with one that explains the bundled-template rationale (44 templates cover 2-9 sets) and points at the roadmap issue tracker for a future >9-set UpSet-only path.

### Added

- **`MplImage.legend`**: a frozen `Mapping[str, str]` field (default empty) carrying the `letter -> real_name` mapping that the renderer used internally. `render_upset` and `render_network` populate it from `result.dataset.set_names`. Programmatic consumers (notebooks, downstream tools) can use it to resolve `"AB"`-style intersection labels back to real set names without re-deriving the letter alphabet themselves.

### Tests

- Five new regression tests: `MplImage.legend` populated, y-tick labels include real names, figure detached from `pyplot.get_fignums()`. Suite is now 335 passing + 6 xfailed.

### Known follow-ups (deferred to v2.1)

- Marci also asked for the *deep* fix: `load_gmt` / `load_gmx` accepting >9 sets so that `render_upset` can be called on them via an `analyze()`-bypassing path. That's an architecture refactor (a new `upset_data_from_dataset()` that doesn't require region computation) and lands as a feature in the next minor release. The error-message improvement above is a pure patch-release bridge.

No breaking API changes.

## v2.0.2 — 2026-05-03 — Cache-bust PyPI badges in README

Patch release. Adds `?v=2` query string to the `pypi/v/` and `pypi/pyversions/` shields.io badge URLs so PyPI's Camo image proxy fetches the freshly-published badge instead of the stale "package or version not found" image cached when v2.0.0 was first uploaded.

No code changes. No public-API changes.

## v2.0.1 — 2026-05-03 — Citation + DOI in PyPI page README

Patch release. Embeds the v2.0.0 Zenodo DOI ([10.5281/zenodo.20000599](https://doi.org/10.5281/zenodo.20000599)) into the package README so the PyPI project page renders the correct citation block + DOI badge. (The v2.0.0 wheel was built before Zenodo minted the DOI, so its METADATA shipped a placeholder line.)

No code changes. No public-API changes.

## v2.0.0 — 2026-05-03 — first PyPI release

First public PyPI release of the headless Python companion. See the root [`CHANGELOG.md`][root] v2.0.0 section for the full feature list (mypy strict clean, 3-OS CI, OIDC trusted publisher workflow, etc.).

## v0.9.0 — 2026-05-02 (Phase 8: Polish + docs)

### Cleanup
- Mypy strict clean across all 16 source files (24 carryover errors from
  Phases 2-7 fixed: typed `_SAMPLE_REGISTRY` via `_SampleMeta` TypedDict;
  dropped 11 unused `# type: ignore` comments; typed all CLI helpers
  (`_load_dataset`, `_print_summary`, `_write_outputs`, `_emit_outputs`);
  typed PDF helpers (`_build_table_axes`, `_draw_*_table`) and added safe
  cast around `cairosvg.svg2png`'s untyped return; typed
  `RegionResult.render_*` and `to_*_tsv` methods so PDF report no longer
  hits `[no-untyped-call]`).
- `_SAMPLE_REGISTRY` cross-references the fixture-generator's `SAMPLES`
  table for future maintainers.

### Docs
- Full README rewrite (`python/README.md`): Phase 0 stub → ~190-line
  pip-page README with badges, install, quickstart, full CLI reference,
  notebook-gallery index, sample-dataset table, contributing guide.
- Docstring sweep on all 25 public-API symbols in Google style. Headline
  functions (`analyze`, `load_csv` / `load_tsv` / `load_gmt` / `load_gmx`,
  `load_sample`, `list_samples`, `RegionResult`) get full Args/Returns/Example
  blocks. Remaining 17 get accurate one-line summaries + Args/Returns or
  Attributes sections.
- Per-package CHANGELOG (this file) + `python/LICENSE` so the wheel ships a
  self-contained doc bundle.

### CI
- `.github/workflows/python-test.yml` now triggers on push to
  `feature/**` (in addition to `main`), so future feature branches get
  coverage before merge. Closes the gap that let mypy errors
  accumulate silently through Phases 2-7.
- Matrix restricted to ubuntu-latest only (was 3 OS × 3 Python). macOS +
  Windows runners both hit cairosvg's `libcairo` runtime lookup failure
  even after `brew install cairo pango` / pip install. The package works
  on those platforms locally with the right system deps; CI gap is the
  hosted runner's `ctypes.util.find_library()` can't find the bundled
  dylib/dll. Phase 9 (PyPI release) will revisit — likely via `pycairo`
  Python dep or explicit `DYLD_LIBRARY_PATH` setup.

### Behavior
- No new features. No breaking changes (the `_SampleMeta` TypedDict is
  private). Public API unchanged from v0.8.0.

## Earlier (Phases 0-7)

See the root [`CHANGELOG.md`][root] for the per-phase summaries from
v0.1.0 (Phase 0 skeleton) through v0.8.0 (Phase 7 parity tests + universe
correctness fix).

## Known limitations

- **CI is Linux-only** as of v0.9.0. macOS + Windows hosted runners can't
  resolve cairosvg's libcairo at runtime even with system deps installed.
  Local development on macOS/Windows works with the right deps
  (`brew install cairo pango` / GTK3 runtime). Phase 9 (PyPI release)
  must solve or document this so end users on those platforms get
  working PDF/PNG renders.
- `dataset_mock_streaming_platforms` parity test xfailed (strict): the
  source CSV has duplicate "Dark Matter" Title rows. The webapp's
  row-based loader counts them separately; Python's set-based
  `Dataset.items` deduplicates. Reconciling requires either a Python
  data-model refactor or an upstream CSV edit; deferred past v1.0.
- Sphinx/MkDocs documentation site is deferred past v1.0; for now the
  README + docstrings + notebook gallery are the documentation surface.
- `pytest-mpl` visual-regression tests for the renderers are deferred to
  v0.2+ to avoid font-rendering false positives across OSes.
