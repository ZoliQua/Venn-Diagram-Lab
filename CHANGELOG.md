# Changelog

All notable changes to the Venn Diagram Lab project.

## v2.2.1 — 2026-05-28 — Branding: new 3-circle favicon, PWA manifest, welcome-screen logo

Patch release rolling out the new visual identity.

### Favicons & PWA

- **`public/favicon.svg`** replaced with a clean 3-circle Venn icon
  (translucent blue / orange / green, 512×512 viewBox, soft drop-shadow).
- **Raster fallbacks added**: `favicon.ico`, `favicon-16x16.png`,
  `favicon-32x32.png`, plus `apple-touch-icon.png` (180×180) for the iOS
  home screen and `android-chrome-{192,512}.png` for Android.
- **`public/site.webmanifest`** added — minimal PWA manifest declaring
  name, short_name, icons, `theme_color: #1E88E5`, `background_color:
  #ffffff`, `display: standalone`. Picked up by the Lighthouse PWA
  audit and Android home-screen install.
- **`index.html`** updated with the matching `<link>` and `<meta>` tags;
  CSP is unchanged and still covers the new local assets.

### Welcome screen

- **Framed logo next to the title** on `WelcomeDialog.tsx`
  (`venndiagramlab-logo-no-text.png` at 36×36 with a subtle border +
  shadow). Title row uses a new `.welcome-title-row` flex container so
  the logo and title stay vertically centred and balanced.
- Full-text logo (`venndiagramlab-logo.png`) added to `public/` for
  future use (about / press / README).

### Tooling

- **`package-lock.json`** — drops the `@rolldown/binding-darwin-x64`
  entry (host machine moved to Apple Silicon; the arm64 binding is
  resolved as an optional dep on install).

## v2.2.0 — 2026-05-19 — R companion dialog restructured to match Python; Python citation card added

Frontend minor release. Restructures the R companion dialog so its tab
layout mirrors the Python one (Overview · Install & Quickstart · Features
· Links), and adds a third citation card for the Python companion package
between the Zenodo software card and the Manuscript card.

### `CompanionPackageDialog` — R tab restructure

- **Roadmap tab removed.** The Phase 0-9 history is captured in
  `r/NEWS.md` and `r/RELEASE.md`; surfacing it in the dialog was
  duplicative now that CRAN is live and the development is no longer
  in flight.
- **`Preview & Install` tab renamed to `Install & Quickstart`**, matching
  the Python tab's label so both companion dialogs read the same.
- **New `Features` tab** with a five-group `companion-feature-board`
  (Visualization · Analysis & Statistics · Reports & Export · Tidyverse
  & Pipelines · Documentation & QA), mirroring the Python `Features` tab
  structure. Calls out the R-specific touchpoints: `ComplexUpset` for
  UpSet, `ggraph` + `tidygraph` for the network view, `geom_venn()`
  ggplot2 layer, broom S3 methods, the 8-vignette gallery, the pkgdown
  reference site, and the 590+ multi-OS test matrix.
- **Final R tab order:** Overview · Install & Quickstart · Features ·
  Links — identical to the Python tab order (minus the Python-only
  `Notebooks` tab; R uses vignettes, referenced from Install).

### `CompanionPackageDialog` — R Overview tab cleanup

- **CRAN-state callout removed from Overview.** Both the original
  "Not yet on CRAN or Bioconductor" warn callout (from v2.1.0) and its
  v2.1.1 "Live on CRAN since 2026-05-18" replacement are gone. The
  install path is surfaced on the `Install & Quickstart` tab; the link
  cards live on the `Links` tab. Overview now leads with the package
  description + What-you-get grid + badges and nothing else.
- **What-you-get cells lost their `Phase N ✓` status pills.** The pills
  pointed at a Roadmap that no longer exists; the labels are now plain
  ("Analysis" instead of "Analysis  Phase 1 ✓").

### `CompanionPackageDialog` — R Install & Quickstart tab

- Final callout copy now points readers at `Install & Quickstart` (was
  `Preview & Install`) and drops the dangling `Roadmap` reference.

### `CitationDialog` — Python companion citation card

- **New `pypackage` `CitationKind`** with `CARD_TITLE` / `CARD_STATUS`
  entries. Card title: "Python companion package (PyPI)". Status pill:
  "Citable today".
- **Python card APA + BibTeX** generated from new
  `PY_PACKAGE_APA` / `PY_PACKAGE_BIBTEX` constants. Version pinned to
  `2.0.3` via the new `PY_PACKAGE_VERSION` constant (matches
  `python/src/venn_diagram_lab/version.py`). URL points at PyPI;
  `doi` field uses the project's Zenodo concept DOI as the archival
  identifier since PyPI does not mint per-package DOIs.
- **Card placement:** the four cards are now Software (Zenodo concept
  DOI) → R companion (CRAN) → Python companion (PyPI) → Manuscript,
  matching the user's instruction to slot both package citations
  between the Zenodo software DOI and the journal entry.
- **`R_PACKAGE_VERSION` constant added** alongside `PY_PACKAGE_VERSION`
  so both companion versions are bumped in one place per release.
- **"Which to cite?" closing callout** updated to mention the Python
  card alongside the R card.

### Internals

- `src/version.ts`: `APP_VERSION` 2.1.1 → 2.2.0; `APP_RELEASE_DATE`
  2026-05-16 → 2026-05-19. The bump is +0.1 because the dialog tab
  layout is a visible structural change (per the SemVer policy in
  `CLAUDE.md`).

## v2.1.1 — 2026-05-16 — Companion R package on CRAN: dialogs updated; citation DOI switched to concept

Frontend patch release reflecting that the R companion package `vennDiagramLab`
went live on CRAN as `2.0.5` on 2026-05-18 (after a multi-iteration submission
cycle — see `r/NEWS.md`). The dialog text was holding the "submission in
progress" narrative from v2.1.0; this release replaces it with the live CRAN
install path and a CRAN-minted DOI, and migrates the project's citation DOI
to the Zenodo concept (all-versions) DOI so end-users never need to update
references per release.

### `CompanionPackageDialog` — R tab

- **Default install source flipped from `github` to `cran`.** First-time
  viewers now see `install.packages("vennDiagramLab")` instead of the
  `remotes::install_github(...)` fallback.
- **Tab labels updated:** "From CRAN (live)" / "From GitHub (HEAD)" /
  "From Bioconductor (pending)" — was "From GitHub (today)" /
  "From CRAN (pending)" / "From Bioconductor (pending)".
- **CRAN panel:** new install code block, CRAN-live date (2026-05-18),
  current version (2.0.5), platform/binary note, and the CRAN-minted DOI
  link `10.32614/CRAN.package.vennDiagramLab`.
- **GitHub panel:** retains the `remotes::install_github(..., subdir = "r")`
  command but reframes it as "development HEAD" with the new `ref =
  "r-v2.0.5"` pinning hint.
- **Bioconductor panel:** simplified to "awaiting moderation" — the old
  4–8 week review estimate is removed since the queue is non-deterministic.
- **Verify-the-install snippet** updated from `'2.0.0'` to `'2.0.5'`.
- **Overview tab:** badges flipped from "Feature complete · v2.0.0" +
  "CRAN + Bioconductor pending" to "On CRAN · v2.0.5" + "Bioconductor in
  moderation"; the warn callout downgraded to an informational callout
  describing the live-CRAN state.
- **Roadmap tab:** the "In progress — Manual submission" row was split.
  CRAN row is now ✓ (with the v2.0.1 → v2.0.5 iteration history); the
  Bioconductor row remains in progress.
- **Links tab:** CRAN card promoted to a primary `LinkCard` (was a
  disabled placeholder), new CRAN-DOI card, GitHub card demoted from
  primary, release tag link bumped from `r-v2.0.0` to `r-v2.0.5`.

### `CompanionPackageDialog` — Python tab

- **Overview badge:** `Stable · v2.0.0` → `Stable · v2.0.3` (matches
  `python/src/venn_diagram_lab/version.py`).
- **Install-verify snippet:** `# 2.0.0` → `# 2.0.3`.

### `CitationDialog`

- **Software DOI switched** from the per-version Zenodo deposit
  `10.5281/zenodo.20000599` to the Zenodo concept DOI
  `10.5281/zenodo.19510813` — this resolves to the latest archived
  release and never needs to be updated per version. Software card title
  updated to "Software (Zenodo concept DOI)".
- **New R companion package citation card** with the CRAN-minted DOI
  `10.32614/CRAN.package.vennDiagramLab`, APA + BibTeX entries for
  `vennDiagramLab 2.0.5`.
- **`CitationKind` union extended** with `'rpackage'`; lookup tables
  `CARD_TITLE` and `CARD_STATUS` cover all three kinds. Subtitle copy
  per-kind, DOI link per-kind.
- **Closing callout** rewritten as a three-way "Which to cite?" guide
  (Zenodo for project-wide; CRAN R DOI for R-specific reproducibility;
  manuscript when accepted).

### `WelcomeDialog`

- R-package button subtitle updated from `vennDiagramLab · CRAN +
  Bioconductor pending` to `vennDiagramLab · on CRAN`. Bioconductor
  status is now surfaced inside the `CompanionPackageDialog` instead.

### Internals

- `src/version.ts`: `APP_VERSION` 2.1.0 → 2.1.1; `APP_RELEASE_DATE`
  2026-05-07 → 2026-05-16.

### Companion package side (separate release tracks)

- **R package** `vennDiagramLab 2.0.5` published on CRAN 2026-05-18 — see
  `r/NEWS.md` for the per-iteration story (Windows CRLF fix, 10-minute
  checktime budget, DESCRIPTION single-quoting, CITATION pre-install
  parsing fix). The v2.0.1 → v2.0.5 commits are already on `main`.
- **Python package** `venn-diagram-lab 2.0.3` on PyPI (unchanged in this
  frontend release).

## v2.1.0 — 2026-05-07 — Welcome screen rework + companion / citation dialogs wired in

Frontend minor release. Wires in the orphan-shipped `CompanionPackageDialog` and `CitationDialog` components from v2.0.x, completes the welcome-screen UX overhaul, and hardens the production build for the credits photos.

### Welcome screen

- **Credits dialog rewritten** to follow the manuscript author order (Dul → Ölbei → Thomas → Si Ammour → Csikász-Nagy), with inline ORCID iD links (official green badge SVG) for the 4 authors who have one, refreshed affiliations matching `manuscript.tex`, and Márton Ölbei added with `credits/marton_pics.jpeg`. Csikász-Nagy's third affiliation (Cytocast Hungary Kft.) is rendered as a clickable accent-coloured link.
- **Three new welcome-screen button rows**, each separated by a faint horizontal gradient separator:
  1. *(existing row)* About Venn Diagrams · List all Venn Diagram Models · Credits
  2. **Python Package** (🐍 venn-diagram-lab · on PyPI) · **R Package** (R logo · vennDiagramLab · CRAN + Bioconductor pending) — open the `CompanionPackageDialog` with the matching `kind`.
  3. **GitHub Repository** (anchor → ZoliQua/Venn-Diagram-Lab) · **How to cite ...** (📄 manuscript under publication) — open the GitHub repo or the `CitationDialog`.
- **Welcome footer** added at the bottom: small, faint `vX.Y.Z · Last updated YYYY-MM-DD`. The version subtitle previously sitting under the title is removed; this gives the page a cleaner top, with the metadata living unobtrusively at the bottom.
- New `APP_RELEASE_DATE` constant in `src/version.ts` drives the footer date.

### Initial-screen Close button (View / Edit / Data)

- `Toolbar.tsx`: the *Close* button is now always shown in **View** mode (previously hidden until a model was loaded) and always enabled in **Edit** / **Data** modes (previously disabled until a doc / dataset was loaded).
- `App.tsx`: `onClose` and `handleDataClose` short-circuit on the initial screen — pressing *Close* with nothing loaded returns to the welcome dialog instead of being a no-op.

### Production build

- `vite.config.ts`: production builds now copy `credits/*.{jpg,jpeg,png}` to `dist/credits/`. In dev the images resolve via `server.fs.allow: ['.']`; without this copy step the deployed site would 404 on every author photo.

### Internals

- `src/version.ts`: `APP_VERSION` 2.0.0 → 2.1.0; new `APP_RELEASE_DATE = '2026-05-07'`.
- `src/editor.css`: ~700 lines of new styles for the welcome separators / footer / companion + meta buttons / Credits ORCID, plus the styles for the previously orphan-shipped `CompanionPackageDialog` and `CitationDialog` components (all the timeline / OS-toggle / quickstart / link / notebook / feature-board / status-pill / etc. classes).

No breaking changes; `App.tsx` callers / mode wiring are unchanged.



## 2026-05-06 — Pre-submission feedback patches (Python v2.0.3 + R v2.0.1)

Patch round bundling pre-submission test feedback from Marci. No frontend / web tool changes — the React app stays on v2.0.0.

### Python (`venn-diagram-lab` v2.0.2 → v2.0.3)

- **Fixed: `render_upset` and `render_network` no longer double-render in Jupyter notebooks.** Both now `plt.close(fig)` before returning to detach from `pyplot`'s state machine; `MplImage._repr_png_` is the only display path.
- **Fixed: `render_upset` y-axis matrix shows real set names instead of letter ids.** y-tick labels now render as `"A — Vogelstein"` (letter preserved for x-axis intersection cross-reference, real name added for readability).
- **Added: `MplImage.legend`** field (`Mapping[str, str]`, default empty) — letter → real-name dict populated by `render_upset` and `render_network`. Programmatic consumers can resolve `"AB"`-style intersection labels back to set names without re-deriving the alphabet.
- **Improved:** `load_gmt` / `load_gmx` >9-set error messages explain the bundled-template rationale + point at the issue tracker for the planned >9-set UpSet-only path (deferred to v2.1).
- 5 new regression tests; full suite now 335 passing + 6 xfailed.

### R (`vennDiagramLab` v2.0.0 → v2.0.1)

- **Fixed: `analyze()` no longer fails with `"no file found"` after `remotes::install_github(..., subdir = "r")`.** Root cause: the bundled 44 SVG templates, 44 region JSONs, and 5 sample datasets under `r/inst/extdata/` were gitignored — the local developer populated them via `Rscript r/data-raw/sync_data.R` before `R CMD build`, so CRAN / Bioconductor tarballs would have shipped them, but `install_github` builds from the git tree and the data was absent. Fix: track the synced data files in git (root `.gitignore` updated). `r/data-raw/sync_data.R` remains the single source of truth; regenerate + commit on every release.
- **Improved:** internal `.models_json_dir()` swapped its cryptic `mustWork = TRUE` error for an actionable message walking the user through the clone + sync + `R CMD INSTALL` workflow as a defensive fallback.
- All 592 R testthat tests still pass.

## v2.0.0 — 2026-05-02 — first unified PyPI release

### Frontend
- Version bumped to 2.0.0 (matches the new unified frontend+python release line).
- No functional changes from v1.14.0; this version exists to mark the
  cross-platform release boundary.

### Python (initial PyPI release as `venn-diagram-lab` 2.0.0)
- **Available on PyPI: `pip install venn-diagram-lab`** — first public
  publication of the headless Python companion.
- Version jump 0.9.0 → 2.0.0 to align with the unified frontend release
  per spec section 10.3 (the "v0" series was alpha-only, never published
  to PyPI; v2.0.0 is the first public Python release).
- Development Status: Production/Stable (was Beta in v0.9.0).
- Distribution: wheel (universal py3) + sdist; LICENSE, README, CHANGELOG
  bundled. Trusted Publisher OIDC workflow (`.github/workflows/python-publish.yml`)
  handles uploads with no long-lived tokens.
- 3-OS CI matrix restored (Linux, macOS, Windows × Python 3.10/3.11/3.12);
  cairosvg native deps resolved on hosted runners (macOS via
  `DYLD_FALLBACK_LIBRARY_PATH`, Windows via `pip install pycairo`).
- Build config: replaced `force-include` (which broke `python -m build`'s
  wheel-from-sdist flow) with hatch `artifacts` directive. CI runs
  `python python/scripts/sync_data.py` before `build` to populate `_data/`.
- Operator runbook at `python/RELEASE.md` documents the per-release
  checklist (PyPI Trusted Publisher registration, Zenodo-GitHub integration,
  TestPyPI dry-run, real release, post-release DOI update).
- Zenodo DOI auto-minted on the v2.0.0 GitHub release; CITATION.cff
  updated post-release to reference the new deposit.

## v1.14.0 — 2026-05-01

### Frontend
- **Repository renamed** from `React-Venn-Diagram-Lab` to `Venn-Diagram-Lab` to better reflect monorepo structure (web tool + Python package). All internal URLs and 44 SVG comment headers updated accordingly. GitHub redirects from the old URL automatically.
- No functional changes to the web application.

### Python (alpha — not on PyPI)
- 2026-05-01 (0.1.0): Phase 0 -- package skeleton (pyproject.toml, version.py, sync_data.py, smoke tests, CI workflow). No functional code.
- 2026-05-01 (0.2.0): Phase 1 -- Core. New modules: io (load_csv/tsv/gmt/gmx + Dataset), statistics (jaccard, dice, overlap_coefficient, hypergeometric, BH-FDR, fold_enrichment, StatisticsResult, compute_pairwise), analysis (analyze, RegionResult, RegionData, list_models, ModelInfo), samples (load_sample, list_samples). Public API exposed via venn_diagram_lab.__init__. ~100 unit + integration tests, ported from the web tool's csvParser/statistics test suites for numerical parity.
- 2026-05-02 (0.3.0): Phase 2 -- Render-1. New module `render/svg.py` with `SvgImage` dataclass + `render_venn_svg(result, **opts)` that templates the 44 bundled model SVGs (Count_*, CountSUM_*, NameA-I, Title, Bullet*/Shape* colors). `SvgImage.save(path)` auto-detects `.svg` / `.png` / `.pdf` (cairosvg). New `RegionResult.render_venn(**opts)` delegate. ~45 tests including all-44-models smoke + render-then-reparse round-trip.
- 2026-05-02 (0.4.0): Phase 3 -- Render-2. New module `render/image.py` with `MplImage` matplotlib container (save .png/.pdf/.svg, _repr_png_ for Jupyter). `render/upset.py` (3-panel UpSet plot with sort_by/threshold/color_mode kwargs). `render/network.py` (force-directed network via networkx spring_layout, edge metrics: intersection/jaccard/fold_enrichment/overlap_coefficient, significance coloring, node_color_map). `proportional.py` (area-proportional 2-set analytical solver + 3-set triangulation, `analyze(model='proportional')` integration, `is_approximate` flag for 3-set, `IncompatibleModelError` at render time for 4+ set). New `RegionResult.render_upset()` and `render_network()` delegates. ~60 new tests (210+ total).
- 2026-05-02 (0.5.0): Phase 4 -- Render-3. New module `render/pdf.py` with `render_pdf_report(result, path, *, title, include_network, include_about)` and `RegionResult.to_pdf_report(path, **opts)` delegate. Multi-page report: data overview + venn/upset + statistics tables (Jaccard/Dice/Hypergeometric+FDR coloring) + significant-edges network + methodology page. PDF assembly via matplotlib `PdfPages`; venn embedding via cairosvg PNG -> imshow. Per-page footer with vdl version + UTC timestamp + page N of M. ~12 new tests. Phase 3 follow-ups bundled: tight_layout warning fix, dropped unused `_CONVERGENCE_TARGET`, `solve_3set` returns nan error, type-annotated render-function `result` parameters.
- 2026-05-02 (0.6.0): Phase 5 -- CLI. New module `cli.py` exposing a Typer `app` for the `vdl` console script (entry point declared in pyproject.toml since Phase 0). Commands: `vdl version`, `vdl list-models`, `vdl list-samples`, `vdl analyze <input> [--model] [--mode] [--format] [--output-dir] [--venn|--upset|--network|--pdf|--statistics-tsv PATH]`, `vdl render-sample <name>`. Auto-detects input format (csv/tsv/gmt/gmx) from extension; `--output-dir` writes the full bundle (venn.svg + upset.png + network.png + report.pdf + statistics.tsv). Error path catches `VennDiagramError` and exits with status 1. ~16 new tests via Typer's CliRunner + 2 subprocess integration tests confirming the console-script entry point.
- 2026-05-02 (0.7.0): Phase 6 -- Notebook gallery. 8 detailed Jupyter notebooks under `python/examples/` (01_quickstart, 02_real_cancer_drivers, 03_proportional_diagrams, 04_upset_vs_venn_vs_network, 05_statistics_deep_dive, 06_pipeline_integration with Snakemake + Nextflow side files, 07_pdf_reports, 08_custom_styling_and_export). Each notebook is generated from a `python/scripts/notebooks/_build_NN_*.py` build script using `nbformat`. Pytest harness `test_notebooks.py` re-executes every notebook via `nbconvert` (marked `@slow`). New CI workflow `python-notebook-test.yml` runs the harness on push/PR + daily cron across Python 3.10/3.11/3.12. Added `ipykernel` and `nbformat` to [dev] extras.
- 2026-05-02 (0.9.0): Phase 8 -- Polish + docs. Mypy strict clean across all 16 source files (24 carryover errors from Phases 2-7 fixed: typed `_SAMPLE_REGISTRY` via `_SampleMeta` TypedDict; dropped 11 unused `# type: ignore` comments; typed all CLI helpers and PDF table builders; typed `RegionResult.render_*` and `to_*_tsv` methods so the PDF report chain no longer hits `[no-untyped-call]`). Full `python/README.md` rewrite (~190 lines, pip-page quality with badges, quickstart, CLI reference, notebook index, sample-dataset table). Docstring sweep across all 25 public-API symbols in Google style (8 headline get Args/Returns/Example blocks; 17 get accurate one-liners + Args/Returns or Attributes). New `python/CHANGELOG.md` + `python/LICENSE` so the wheel ships self-contained docs. CI (`python-test.yml` + `python-notebook-test.yml`) now triggers on `feature/**` branches in addition to `main`, closing the gap that let mypy errors accumulate silently through Phases 2-7. Bumped Development Status classifier to `4 - Beta`. **No new features**, no public-API changes.
- 2026-05-02 (0.8.0): Phase 7 -- Parity tests vs React webapp. New `RegionResult.to_region_summary_tsv(path)`, `to_matrix_tsv(path)`, `to_statistics_tsv(path)` writers producing byte-identical output to the webapp's three Export buttons (Region Summary / Item Matrix / Statistics). `Dataset.item_order: tuple[str, ...]` field added (immutable, default `()`), populated by all 4 loaders + `from_dict` to mirror JS Set/Map insertion-order semantics. `Dataset.universe_size: int | None` field added; binary CSV/TSV loaders populate it with the raw row count to match the webapp's `csv.rows.length` (the React app's biologically-correct hypergeometric N). Cascading bug fix: `RegionResult.statistics` now uses `dataset.universe_size` when set, fixing too-significant p-values on bundled biological samples (notebook 05's worked example shifted from 2.2x to 31x enrichment because N corrected from 1394 → 20000). New private module `_tsv_escape.py` with `escape_spreadsheet_cell` (mirrors `exportData.ts` formula-prefix regex) and `js_to_exponential_2` / `js_to_fixed` helpers (mirror JS `Number.prototype` methods using `decimal.Decimal` + `ROUND_HALF_UP` so floats round byte-identically). Pre-1.0 behavior change: CLI `--statistics-tsv` now emits the full pairwise format instead of the hypergeometric-only long-form (callers needing the old format can do `result.statistics.hypergeometric.to_csv(path, sep='\t', index=False)`). New test module `test_parity_with_webapp.py` (5 samples × 3 export kinds × DataFrame + raw-byte comparisons = 30 tests, 24 PASS + 6 xfail-strict for the streaming_platforms duplicate-Title row-vs-set data-model divergence). Fixture generator at `scripts/generate-parity-fixtures.mts` (Node + tsx, `npm run fixtures:parity`) imports the actual webapp TS code so fixtures regenerate deterministically. 322 fast tests pass; ruff clean; coverage 97%.

## [1.13.5] — 2026-04-12

### Fixed
- **PDF report overview wording**: replaced the ambiguous `Total items in the file` label with separate rows for source data rows, background universe, and items assigned to Venn regions. This prevents aggregated GMT/GMX/paste imports from reporting the longest padded column as an item count.
- **Summary dialog set range**: updated the gallery subtitle from `2-set to 8-set` to `2-set to 9-set`.
- **Carroll publication filename consistency**: standardized the Carroll 2000 publication filename and updated all in-app and README links.
- **Release metadata consistency**: aligned `src/version.ts`, `package.json`, `package-lock.json`, `README.md`, and `CITATION.cff` to version `1.13.5`.

### Changed
- **Generated model provenance**: repository-generated models without external publications are now explicitly labelled as `Generated (no external source)` in the gallery and README model table. Edwards 8-set and 9-set models are labelled `Generated based on Edwards, 1989` to reflect their construction-from-principle origin.
- **Publication reproducibility documentation**: added a README section with the reviewed environment, verification commands, and an archival GitHub release / DOI workflow.

## [1.13.4] — 2026-04-10

### Fixed
- **Hypergeometric background universe (aggregated imports)**: the `DataSummaryPanel`, `PdfReportDialog`, and `ZipReportDialog` all received `totalItems` as `testCsvData.rows.length`. For binary-matrix imports this equalled one row per unique item, which is correct. For aggregated imports (paste, GMT, GMX), `parseGmt` pads the CSV rows with empty cells up to the largest gene set size, so `rows.length` reflected the *longest column*, not the *union of all unique items*. All pairwise hypergeometric p-values, fold enrichments, and the FDR correction were consequently computed with a biased N. The `VennResult` interface now exposes a `totalUniqueItems` field populated by both calculation paths (binary: equals row count; aggregated: equals the union of unique items across all sets). `App.tsx` consumes this value wherever background universe is required.

### Added
- **Max name length slider** (Data mode, `4. View → Group names and numbers`): new slider directly under *Font type* lets the user cap the displayed group names to between 16 characters and the length of the longest mapped column name. Truncation happens from the tail with a single-character ellipsis (`…`); the returned string is exactly the configured length. The slider drags live (updates `NameX` text content directly, no full recalculation). The font-size auto-cap (17/20/24/28-char thresholds) now uses the *displayed* length, so shortening a name relaxes the cap. When all mapped columns are ≤ 16 characters the slider is disabled. Reset to Defaults / Close clears the override back to full names.
- New helper `src/utils/truncateName.ts` with 6 dedicated tests (no-op, truncation with ellipsis, idempotence, edge cases for non-positive / non-finite `maxChars`, exact 16-char cap).
- **LICENSE file** at the repository root (MIT, 2024-2026 Zoltan Dul).
- **Sample dataset references** in the `Load Sample Data` dialog: MSigDB Hallmark datasets now cite Liberzon et al. 2015 (Cell Syst); the cancer driver dataset cites its four primary sources (COSMIC CGC, OncoKB, IntOGen, Vogelstein et al. 2013).
- 4 additional tests in `csvParser.test.ts` covering `VennResult.totalUniqueItems` for binary mode, aggregated mode (clean), aggregated mode with padding, and aggregated mode with multi-item cells.

### Changed
- **Tour description** — "90-second" phrasing replaced with "short" in the welcome card, the Help dialog call-to-action, and the first tour step. The actual tour length (~2 minutes for readers who finish every step) is no longer implied to be shorter than it is.
- `README.md` and `CITATION.cff` bumped to 1.13.4.

## [1.13.2] — 2026-04-09

### Fixed
- **Rotate Shape tool in Edit mode**: the `onToggleRotateShapes` handler incorrectly called `setRotateShapes(false)` as its third action, cancelling the toggle it had just issued. The rotate tool was consequently impossible to activate. Third action now correctly resets `setResizeShapes(false)` for mutual exclusion.
- **Help dialog — Data mode staleness**: the Column Mapping note referred to the v1.9.x 14 px auto-scaling rule; updated to document the v1.10.1 per-length cap (17-19 → 12 px, 20-23 → 10 px, 24-27 → 9 px, 28+ → 8 px). Export and Toolbar subgroups now document Report PDF and Full Report (zip) separately. Properties subgroup now documents the Copy button and the per-list button pairs on single-letter regions.
- **Help dialog — Main option** documented in all three modes.
- **Fold Enrichment range** in Statistical Methods corrected: there is no fixed upper bound; the range shown previously implied an incorrect theoretical maximum of N.
- **About This Report — inclusive count definition** rephrased: "all items in a given set" was accurate only for single-letter region labels. Replaced by "items contained in every set of a given combination, regardless of whether they also appear in other sets."

### Changed
- `README.md` version bumped to 1.13.2.
- `CITATION.cff` version bumped from 1.9.6 (2026-04-11) to 1.13.2 (2026-04-22).

## [1.13.1] — 2026-04-05

### Added
- **Main option** in the toolbar mode dropdown (🏠 Main): available in every mode and returns to the welcome screen without resetting the dataset or the SVG being edited.
- **Edit mode empty state** now mirrors Data mode: left and right panels are hidden when no SVG is loaded, and two large cards take the centre of the canvas — **Select Model** (pick one of the 44 built-in Venn diagrams) and **Open Custom SVG** (upload your own) — each with a descriptive subtitle.

## [1.13.0] — 2026-04-03

### Added
- **Guided Tour**: new fourth welcome-screen card (alongside View / Edit / Data). Launches a 12-step coach-mark walkthrough of Data mode using the pre-loaded Cancer Drivers sample (COSMIC, OncoKB, IntOGen, Vogelstein) on a 4-set Edwards diagram.
  - Covers: Open toolbar button → File Info → Venn diagram model → Column Mapping → View switcher (auto-cycles Cut / UpSet / Network / Layer) → Properties panel with the ABCD full intersection selected → Statistics tab → Enrichment Plots card (auto-cycles Bar → Lollipop → Heatmap, then scrolls to the pairwise stats tables) → Plot editor highlighted while the Heatmap stays active → Report PDF / Full Report (zip).
  - Every step highlights the real UI element via a box-shadow cutout ring; progress dots, Back / Skip / Next + ESC exits safely.
  - **Replay button** on the two auto-cycle steps (View cycle, Plot editor cycle).
  - `right-top` tooltip placement anchors the card near the top of the viewport on tall or bottom-positioned targets (readable on short browser windows).
- **Tour from Help**: all three Help dialogs (View / Edit / Data) now show a *Getting Started → Start the tour* button at the top. Help closes and the tour launches without interrupting the user.
- **Data-tour anchors**: unobtrusive `data-tour="..."` attributes on 9 UI elements (toolbar, sidebar sections, right-panel tabs, enrichment plots card, plot editor, stats tables) so the tour has stable selectors across future refactors.
- **Sidebar `forceOpen` prop** and **DataSummaryPanel `forceEnrichmentPlotsOpen` prop**: tour-only overrides that keep sidebar/right-panel sections open while a step needs them visible; normal user state is untouched.
- **Font-size 16 px auto-applied** on tour start so the 4-set Edwards labels render clearly out of the box.

### Notes
- The tour bypasses the CsvImportDialog flow (direct `parseCsvWithDelimiter` + state seed) so every step lands in a known configuration.
- Finish / Skip / ESC all route through `handleTourFinish` → `handleDataClose` → welcome screen. No partial state can remain.
- No new npm dependencies; the overlay is a local ~220-line component.

## [1.12.0] — 2026-04-02

### Added
- **Full Report (zip) export** (Data mode): new toolbar button next to *Report PDF*. Downloads a single zip archive named `venn_report_{baseName}.zip` containing everything at the archive root:
  - `venn_report_{n}-sets.pdf` — the full multi-page PDF report (identical to the standalone *Report PDF* output).
  - `regions_summary.tsv`, `items_matrix.tsv` — the Region Summary and Item Matrix TSVs (plain UTF-8, no BOM).
  - `venn_diagram_{n}-sets.svg`, `upset_plot_{n}-sets.svg`, `venn_network_{n}-sets.svg` — standalone diagram SVGs.
  - `enrichment_statistics_{n}-sets.xlsx` — Excel workbook with three sheets (Pairwise Jaccard, Sorensen-Dice, Intersection Enrichment). Each sheet has its own sort (Jaccard desc / Dice desc / FDR asc), bold frozen header row, and auto-sized columns.
  - `stat_bar_chart.svg`, `stat_lollipop_chart.svg`, `stat_heatmap_chart.svg` — the three enrichment plots using default styling (matches the PDF).
  - `README.txt` — provenance info (timestamp, app version, source filename, set count, set names, list of files) followed by the full *About This Report* text from the PDF.
- **Progress indicator**: the zip report dialog shows a live percentage bar (0–100%) plus step description; the user sees the tool is working throughout the multi-step bundle build.
- **Shared helpers**:
  - `src/utils/reportArtefacts.ts` — `buildReportArtefacts()` / `prepareVennSvgForPdf()`, single source of truth for every SVG that goes into either the PDF or the zip.
  - `src/utils/aboutReport.ts` — `ABOUT_REPORT_SECTIONS`, the About-This-Report content, now consumed by both the PDF last page and the zip README.
- Lazy-loaded deps: `jszip` and `exceljs` are only fetched when the user clicks *Full Report (zip)*.

### Changed
- **Toolbar labels**: `Report` → `Report PDF`; new `Full Report (zip)` button next to it.
- **`PdfReportDialog`** refactored to use `buildReportArtefacts()` — PDF output remains byte-identical to v1.11.0.

### Dependencies
- `jszip ^3.10` (MIT) — zip archive assembly
- `exceljs ^4.4` (MIT) — xlsx workbook writer

## [1.11.0] — 2026-04-01

### Added
- **Clickable enrichment plots (Data mode)**: The three enrichment plots in the right-panel `Statistics → Enrichment Plots` section are now clickable. Clicking any plot opens a dedicated plot editor.
- **Enrichment plot editor** (left sidebar): Replaces the `4. View` section while editing. Controls include significance / non-significance colour pickers, heatmap gradient endpoints (low / FDR-high / FE-high), font size slider (6–16), font family dropdown, background toggle (white / dark), and visibility toggles for axis label, pair labels, significance markers and legend. A **Back to Diagram** button returns to the previous view; the edited plot's style is preserved while the dataset is loaded.
- **Responsive plot canvas**: While a plot is being edited, the main canvas shows the plot at a large responsive size (aspect preserved, scales with available width).
- **Per-plot style state**: Bar, lollipop and heatmap keep independent style settings; switching between them inside the editor preserves each plot's customisations.
- **New module `enrichmentPlotStyle.ts`**: centralised `EnrichmentPlotStyle` type, `DEFAULT_PLOT_STYLE` (bit-for-bit v1.10.1 values), `createDefaultPlotSettings()`.
- Tests: 13 new `enrichmentPlotSvg.test.ts` cases covering custom colours, visibility toggles, gradient customisation and font-size scaling; new `enrichmentPlotStyle.test.ts` (6 tests) for defaults.

### Changed
- **Metric toggle lifted to App-level state**: `−log₁₀(FDR)` / `Fold Enrichment` selection is now shared between the right-panel plots and the editor sidebar (single source of truth).
- **Close (Data mode)**: now also resets plot-editor state (`plotEditState`, metric, per-plot style) to their defaults.
- **Help — Data mode Statistics**: new line documenting the plot editor workflow.

### Notes
- Style customisations live in React state only (no localStorage).
- **PDF export unchanged** — the report always uses `DEFAULT_PLOT_STYLE` for the three enrichment plots and therefore reproduces v1.10.1 output byte-for-byte. Exposing customisations in the PDF is intentionally deferred to a future release.
- `EnrichmentPlotOptions.style` is optional; callers that do not pass it (including the PDF pipeline) get the defaults and therefore keep previous behaviour.

## [1.10.1] — 2026-03-31

### Fixed
- **PDF Bar / Lollipop chart — y-axis label readability**: removed the top centered `−log₁₀(FDR)` title that occasionally overlapped significance asterisks above tall bars. The side y-axis label is now the sole metric marker (bold, 10 px, x = 14), consistently readable regardless of the data range.
- **PDF Enrichment section headings — character spacing**: simplified `Bar chart — −log₁₀(FDR)` and similar to just `Bar chart`, `Lollipop chart`, `Heatmap`. This also removes the jsPDF helvetica kerning issue with subscript / minus unicode characters.
- **PDF Heatmap — top metric title visibility**: column and row axis labels reduced from 9 px to 7 px, and `topLabelH` raised from 60 to 82, so the rotated axis labels no longer collide with the `−log₁₀(FDR)` title above.

### Added
- **Data mode — auto-cap name font size**: when the longest column name exceeds 16 characters, the Group-names font size is capped to 12 px (17–19 chars), 10 px (20–23), 9 px (24–27), or 8 px (≥28). Applies uniformly to all names; never increases a smaller user setting.
- **PDF Methodology — Enrichment plots**: `About This Report` now documents the three enrichment plots under the Statistics section as entries `4. Bar chart`, `5. Lollipop chart`, `6. Heatmap`, each with its own paragraph explaining encoding, colour scale, and interpretation.

### Changed
- **PDF page title**: `Enrichment Visualisations` → `Statistics: Enrichment Visualisations` to reflect that the plots visualise the pairwise statistics.

## [1.10.0] — 2026-03-30

### Added
- **Enrichment Plots (Data mode)**: New collapsible "Enrichment Plots" section in the statistics panel, showing three complementary visualisations of the pairwise hypergeometric results:
  - **Bar chart**: one bar per pair, coloured green when FDR < 0.05 and grey otherwise; significance markers (`*`, `**`, `***`) above the bars.
  - **Lollipop chart**: stick length encodes the chosen metric, dot area encodes the intersection count.
  - **Heatmap**: symmetric n×n matrix; diagonal is empty (em-dash) because a set is not tested against itself.
- **Metric toggle**: switch all three plots between `−log₁₀(FDR)` (default) and `Fold Enrichment`.
- **Per-plot SVG export**: every enrichment plot has an "Export SVG" button that downloads the plot as a standalone SVG file.
- **PDF Report — Enrichment Visualisations page**: all three plots appear on a dedicated page between the Statistics tables and the Methodology section (PDF variant fixed to `−log₁₀(FDR)`).
- **Tests — `enrichmentPlotSvg.test.ts`**: 16 tests covering metric computation, FDR=0 numerical floor, SVG structure, per-pair labels, heatmap symmetry and diagonal marking.

### Changed
- **Help — Data mode Statistics**: new line documenting the Enrichment Plots section and its export buttons.
- **PDF Methodology**: added a paragraph explaining the three enrichment plots.

## [1.9.7] — 2026-03-29

### Added
- **Copy region items to clipboard**: New "Copy" button next to "Export" in the region info panel. Copies the region's items as newline-separated text to the system clipboard. A short status message confirms the action.
- **Help — Statistical Methods section**: View mode and Data mode Help dialogs now document the statistical measures used in Data mode (Jaccard index, Sørensen–Dice coefficient, Szymkiewicz–Simpson overlap coefficient, hypergeometric enrichment test, fold enrichment, Benjamini–Hochberg FDR). Each entry shows name, formula, short description, and value range.

### Changed
- **Region export label**: The "Export Region Items" button label shortened to "Export" to accommodate the new "Copy" button next to it.

## [1.9.5] — 2026-03-27

### Added
- **Single set accuracy** in Proportional Accuracy display: A, B, C individual accuracy percentages now shown alongside pairwise (AB, AC, BC) and triple (ABC) values in sidebar and PDF report
- **ABC triple accuracy in sidebar**: The triple intersection accuracy now displays between pairwise and Overall rows with color-coded percentage

### Fixed
- **PDF Report crash on proportional models**: Fixed "SVG image load failed" error caused by duplicate `viewBox` attribute in `rawSvgAttrs` and double-wrapped XML comment in generated SVG
- **ABC region label placement**: The full intersection (ABC) count label now placed at the geometric center of the three circle centers instead of grid-sampled edge position
- **Grid sampling resolution**: Proportional model centroid sampling increased from 60x60 to 120x120 for better label placement accuracy

### Changed
- **Overall accuracy formula**: Now averages all components (single A/B/C + pairwise AB/AC/BC + triple ABC) instead of only pairwise values
- **Welcome dialog text**: Removed "CSV" reference, updated button labels

## [1.9.4] — 2026-03-26

### Added
- **PDF Report — Proportional accuracy**: When area-proportional model is active, the PDF now shows pairwise and overall accuracy percentages below the Venn diagram image
- **3-set triple intersection accuracy**: `solve3SetLayout` now computes the triple intersection area via grid sampling (200x200) and reports it in the accuracy display
- **Proportional solver unit tests**: 15 tests covering `circleIntersectionArea`, `solve2SetLayout`, `solve3SetLayout` (disjoint, containment, normal overlap, symmetry, triple accuracy, canvas bounds)
- **Reset to Defaults button**: In Data mode sidebar, restores all visual settings (font sizes, colors, opacity, hover color, visibility toggles) to their original values
- **Help — About Venn Diagrams**: Welcome screen "About Venn Diagrams" button now mentioned in View mode help
- **Help — Data mode additions**: Move Names/Numbers, Ctrl+Z undo, and Reset to Defaults documented

### Changed
- **Sidebar width**: 260px → 290px for better readability
- **Proportional model info**: ModelInfo now shows correct "Venn type: N sets", "Form: area-proportional", "Regions: N regions" for `__proportional__` models
- **Computed Models section**: Always visible in model browser (not just ≤3 sets), title "Computed Models (2 or 3 sets)", uses first 3 columns when >3 available
- **Help corrections**: View mode "Summary" section updated with current button labels; Edit mode shape references verified for 9-set; Data mode column mapping section expanded
- **Welcome dialog text updates**: "CSV data" → "data", "44 Venn diagram" → "our Venn diagram", "View All 44" → "List all Venn Diagram Models"

## [1.9.3] — 2026-03-24

### Added
- **About Venn Diagrams dialog** on the welcome screen
  - New button placed before "View All 44 Diagram Models"
  - Three tabbed sections covering historical background, formal definition, and later research directions
  - Source-backed references section with clickable local PDF links
- **Custom About visuals** in `public/about-venn/`
  - Repo-native explanatory SVG illustrations replace lecture slide screenshots for the main educational graphics
  - Primary-source image from Venn's 1880 paper retained
- **About dialog content tests**: `aboutVennContent.test.ts` validates section/reference consistency and prose coverage

### Changed
- **Build output now includes publication PDFs**: Vite copy step exports `publications/*.pdf` into `dist/publications` so the About dialog references open correctly in the built app
- **About dialog typography/layout** refined for longer prose blocks, cleaner paragraph spacing, improved quote separation, and a lighter Key Takeaways block
- **Welcome dialog** now includes an educational entry point in addition to model browsing and credits

## [1.9.2] — 2026-01-22

### Added
- **Google Analytics 4 integration** with cookie consent banner (GDPR compliant)
  - Consent banner at bottom: Accept/Decline with localStorage persistence
  - GA4 script only loads after user accepts; no tracking on decline
  - Event tracking: mode switch, view switch, calculate, PDF export, image export
- **Data mode text move tools**: "Move" row in Group Names & Numbers section
  - Move Names: drag Name labels to reposition
  - Move Numbers: drag Count and CountSUM labels to reposition
  - Mutually exclusive toggles; cursor changes to 'move' on draggable elements
- **Sample dataset format badges**: BINARY (blue) or AGGREGATED (green) badge on each sample dataset card
  - Selecting an aggregated dataset auto-sets the file type in CsvImportDialog
- **Help menus updated**: All three mode help pages reflect v1.8-1.9 features (UpSet, Network, proportional, 4 import methods, item search, PDF report, theme toggle, etc.)
- **PDF Report — Significant edges**: Listed below the Network diagram with Jaccard values
- **PDF Report — Network explanation**: "Set Relationship Network" section added to About This Report
- **PDF Report — Section-only titles**: Empty-text sections render title only (no blank space)
- **TSV export hardening tests**: dedicated regression coverage for spreadsheet formula escaping in `exportData.test.ts`

### Changed
- **Dark mode as default**: OS preference check removed; always starts in dark mode unless user explicitly chose light
- **Bullet opacity**: updateShapeStyle now also searches bullets; opacity slider syncs shapes + bullets
- **Welcome dialog**: Data mode description updated ("Load your data to map columns...")
- **Content Security Policy**: `index.html` now defines a restrictive CSP that still permits GA consent loading and `blob:` / `data:` export flows
- **TSV export safety**: Region Summary and Item Matrix exports now escape spreadsheet formula prefixes in exported text cells without changing the in-app values

## [1.9.1] — 2026-01-20

### Added
- **Area-Proportional Venn Diagrams**: Data-driven circle layout for 2 and 3 sets
  - Circle radii proportional to set sizes, distances computed via binary search for exact intersection areas
  - Available in Model Browser ("Computed Models" section with COMPUTED badge) and sidebar dropdown
  - Layer View: legend with bullets, names, and SUM counts in bottom-left corner
  - Cut View: 2-set analytical arc paths; 3-set grid-sampled contour paths (400x400 resolution, ~200-point polygons)
  - Proportional Accuracy display in sidebar (pairwise %, overall, warning if <80%)
  - Auto-switch to standard model when n > 3 with notification
- **Auto-recalculate on column change**: Swapping columns in the 3. COLUMN MAPPING section automatically recalculates the diagram
- **Bullet opacity sync**: Opacity slider now affects both shape and bullet opacity
- **`loadDoc()` method**: New `useSvgDocument` hook method to load pre-built VennDocument objects directly

### Changed
- **Proportional legend layout**: Names, SUM counts, and bullets positioned in bottom-left legend (not above circles)
- **SUM count position**: Dynamically positioned after the longest set name

## [1.9.0] — 2026-01-19

### Added
- **Network Diagram**: 4th visualization mode — force-directed network graph of pairwise set relationships
  - Nodes sized by set cardinality, colored by standard Venn colors
  - Edges weighted by intersection size, Jaccard index, Fold Enrichment, or Overlap Coefficient
  - Force-directed layout with normalized weights and boundary clamping (no node clipping)
  - Interactive: hover tooltips (intersection, Jaccard, FE, FDR), click node/edge to select region in right panel
  - Filters: "Sig. only (FDR<0.05)" toggle, minimum edge weight slider
  - Show/hide: edge values, node sizes toggle buttons
  - Drag & move nodes (ON by default), positions persist during session
  - Network tab in View and Data mode sidebars with full controls
  - Network diagram in PDF report (own page, print-optimized SVG)
- **Background toggle**: Dark/White background selector for Cut View, UpSet Plot, and Network Diagram
- **SVG export fix**: SVG export now saves the currently visible view (Cut/UpSet/Network SVG from DOM) instead of always exporting the Venn diagram document model

### Changed
- **Force layout**: Normalized edge weights (0-1 range), stronger center gravity, dynamic ideal distance — stable for any count values
- **Edge rendering**: Minimum 0.5px stroke width for any non-zero intersection, concrete hex colors instead of CSS variables in SVG
- **Selection on view switch**: Region selection clears automatically when switching between Layer/Cut/UpSet/Network
- **Background click**: Clicking empty area in Network view clears region selection

## [1.8.7] — 2026-01-18

### Added
- **Region Item Search**: Two complementary search modes in the right panel (Data mode):
  - **Find Item (global)**: Collapsible search bar at the top — searches across all regions, shows matching regions with color dots, set names, match count, and up to 5 matching items with highlighted text. Click a result to select the region on the diagram.
  - **In-region filter**: Search bar within each region's items list (appears when >10 items) — filters items with highlighted matches, increases display limit from 50 to 200 when filtering.
- **Data Import Cards**: Data mode welcome screen redesigned with 4 large cards in a 2x2 grid, each with icon, title, and description (Load Sample Data, Upload Custom File, Paste Lists, Load from URL).
- **Data Model Browser**: After loading data, the canvas shows a visual model browser (like View mode) filtered to compatible set counts, with title "Select Venn Diagram Model" and subtitle "for your dataset". Clicking a model triggers auto-calculate.
- **Credits photos**: Profile pictures for all 4 authors displayed as circular thumbnails (64x64px) in the Credits dialog.
- **Auto font-size reduction**: In Data mode, if any set name exceeds 8 characters, the Name font-size is automatically reduced to 14px.

### Changed
- **Model selection in Data mode**: "2. VENN DIAGRAM MODEL" section hidden from sidebar until a model is selected; replaced by the visual model browser in the canvas area.

## [1.8.6] — 2026-01-17

### Added
- **Light/Dark theme toggle**: Sun/moon button in toolbar with `data-theme` attribute system. 15 new semantic CSS variables, full light theme override. Persisted to localStorage, defaults to OS preference.

### Fixed
- **10 TypeScript strict errors** that broke Vercel builds: unused imports/variables, ViewStyle type mismatch.

### Changed
- **~55 hardcoded CSS colors** replaced with semantic CSS variables across editor.css and 5 TSX components.

## [1.8.5] — 2026-01-16

### Added
- **Paste Import Dialog** (`PasteImportDialog.tsx`): Paste gene/item lists directly from clipboard into 2-9 labeled textareas with per-set name input, color indicators, delimiter selector (newline/comma/tab/space with auto-detect), real-time item counts, and total unique items. Generates aggregated CsvData, bypassing the CSV Import Dialog.
- **URL Import Dialog** (`UrlImportDialog.tsx`): Fetch data from any HTTP/HTTPS URL with a 5-step validation pipeline (URL format, protocol, file extension, fetch with 30s timeout and 50MB limit, content format detection). Shows validation checklist with status icons and a 5-line preview. CORS errors produce a clear user message. Routes fetched data to CsvImportDialog.
- **Import buttons**: "Paste Lists" and "Load from URL" added to Welcome screen (4 buttons with flex-wrap), Data Open dialog (5 buttons), alongside existing "Load Sample Data" and "Upload Custom File"
- **PDF Report — About This Report**: Last page with methodology explanations for Venn diagrams, UpSet plots, Jaccard Index, Sorensen-Dice Index, and Hypergeometric Enrichment test
- **PDF Report — Footnotes**: Truncated set names in Set Sizes table marked with asterisk (*), full names listed in a footnote below the table

### Changed
- **PDF Venn diagram**: Title hidden, Name elements set to 16px for cleaner print output
- **PDF font**: Switched from Times to Helvetica for consistent character spacing and better Unicode rendering
- **PDF Set Sizes table**: "Name (full)" renamed to "Name", trimmed to 30 characters
- **Sample datasets renamed**: Files prefixed with `dataset_real_` (real data) and `dataset_mock_` (test data) for clarity

## [1.8.4] — 2026-01-14

### Added
- **Sample Data Dialog**: "Load Sample Data" now opens a selection dialog with 5 curated datasets:
  - 3 real datasets: MSigDB Hallmark Cancer pathways, MSigDB Immune signaling, Cancer drivers (COSMIC/OncoKB/IntOGen/Vogelstein)
  - 2 test/mock datasets: Mock gene sets, Mock streaming platforms
  - Each entry shows name, description, and reference placeholder (for real datasets)
  - Dataset selection proceeds directly to the CSV Import Dialog

## [1.8.3] — 2026-01-14

### Changed
- **SVG centering**: Canvas is now centered in all three modes (View, Edit, Data) using flexbox alignment
- **Auto-calculate**: Removed the Calculate button from Data mode; calculation triggers automatically when a Venn Diagram model is selected
- **Column Mapping hidden**: Column Mapping section only appears after selecting a model, not immediately after file import
- **Canvas prompt text**: When data is loaded but no model selected, canvas shows "Please select a Venn Diagram model from the left panel" instead of "Load your data"
- **Column name trimming**: Column headers in Data mode dropdown trimmed to 32 characters with ellipsis
- **PDF Report refinements**: Name (full) column widened to 60mm with 32-character trim; Set Size column narrowed

## [1.8.2] — 2026-01-13

### Fixed
- **SVG format fixes**: Edwards 8a/9a SVGs — removed duplicate `Tahoma, Tahoma` font-family (766 fixes) and stripped `px` units from font-size (695 fixes)
- **Test cleanup**: SVG format tests now filter only `venn*.svg` files (excludes non-diagram SVGs like `names-bar.svg`); Euler diagrams allow fewer Count elements than 2^n-1; file count assertion corrected to 44
- **9-set Data mode**: Extended all set letter references from `ABCDEFGH` to `ABCDEFGHI` across csvParser, exportData, statistics, DataSummaryPanel, TestSidebar, and App; initial column mapping limit raised from 8 to 9; added I color (#F7941E)
- **SVG centering**: Canvas now centered in all three modes (View, Edit, Data)
- **Column mapping names**: Trimmed to 32 characters with ellipsis in Data mode dropdown
- **Auto-calculate**: Removed Calculate button; calculation triggers automatically on model selection

## [1.8.1] — 2026-01-12

### Added
- **PDF Report generation**: Report button in Data mode toolbar generates a multi-page A4 PDF
  - Page 1: Data Overview (timestamp, file info, region stats), Set Sizes pie chart (pastel colors) + table with Exclusive/Inclusive columns
  - Page 2: Venn Diagram image + UpSet Plot image (print-optimized, white background, max 20 columns)
  - Page 3+: Pairwise Jaccard Index, Sørensen-Dice Index, Intersection Enrichment tables with significance coloring
  - Footer on all pages with version and page numbers
  - 7-8-9 set diagrams: each statistics table on its own page
- **jsPDF dependency**: Lazy-loaded as separate chunk (~400KB), only downloaded when Report is clicked
- **SVG capture utility** (`svgToImage.ts`): Reusable SVG-to-PNG converter for PDF embedding
- **UpSet SVG builder** (`upsetSvgBuilder.ts`): Generates print-ready UpSet plot SVG strings from data

## [1.8.0] — 2026-01-11

### Added
- **UpSet Plot visualization**: New sub-mode tab alongside Layer and Cut in both View and Data modes
  - Pure SVG rendering with matrix dots, vertical intersection bars, horizontal set size bars
  - Hover highlight with tooltip (set names ∩ count), click to lock selection
  - Pagination: top 50 intersections per page with prev/next controls
  - Sort modes: by intersection size (descending) or by degree (set membership count)
  - Color modes: depth-based, heatmap (3-point diverging scale), custom single color
  - Adjustable minimum count threshold filter
  - Zoom support via existing zoom controls
- **UpSet data utilities** (`upsetData.ts`): Converter functions from RegionData (View mode) and VennResult (Data mode)

## [1.7.1] — 2026-01-10

### Added
- **5 new diagram models**: `venn-2e-set-rectangle.svg`, `venn-5e-set-euler.svg` (21/31 Euler), `venn-8a-set-edwards.svg` (255 regions), `venn-9a-set-edwards.svg` (511 regions), `venn-2e-set-carroll-triangle.svg`; total models: 44 (was 39)
- **9-set support**: Edwards 9-set diagram with 511 regions, extending set range from 2-8 to 2-9
- **ShapesExtras support**: parser, serializer, and Canvas now handle `<g id="ShapesExtras">` with `ShapeX2` elements for Euler diagrams (e.g. `venn-4e-set-euler.svg`)
- **`generate_region_json.py`**: standalone Python script for generating JSON region data from SVGs using Shapely Boolean operations; supports `--all`, specific names, and auto-detect missing; handles `<polygon>` elements and chained `translate()` transforms
- **Multi-line source labels**: SOURCES labels with `\n` now render as line breaks in Summary and View gallery
- **Standard color I (Orange)**: `#F7941E` added for 9th set

### Changed
- **SVG comment header**: updated to "React Venn Diagram Lab Module" with new GitHub URL across all 44 SVGs
- **`text-anchor:middle`**: enforced on all Count_ and CountSUM_ text elements across all SVG models (488 fixes)
- **Group_Values sort order**: all SVGs sorted by (character count, alphabetical) — single chars first, then pairs, etc.
- **Model count**: 39 → 44 updated in HelpDialog, WelcomeDialog, tests, and SummaryDialog
- **Set range**: "2-set to 8-set" → "2-set to 9-set" in all UI text
- **README**: updated with 44 models, 9-set section, ShapesExtras documentation, new publications

### Fixed
- **`generate_region_json.py` transform handling**: circles with chained `translate()` transforms (used in Euler diagrams) now correctly compute cumulative offsets for Shapely region detection
- **Source label rendering in App.tsx**: View mode gallery now uses `renderLabel()` for multi-line source labels (was only applied in SummaryDialog)

## [1.7.0] — 2026-01-09

### Added
- **DataSummaryPanel**: right-side statistics panel in Data mode with 6 collapsible sections: Overview, Set Sizes, Pairwise Jaccard Index, Sorensen-Dice Index, Intersection Enrichment (hypergeometric test + BH-FDR), Export Statistics
- **Statistics utility** (`statistics.ts`): `logChoose`, `hypergeometricPValue`, `foldEnrichment`, `adjustPValues` (Benjamini-Hochberg), `pairwiseStatistics`
- **Statistics tests** (`statistics.test.ts`): 21 tests for all statistics functions
- **Right panel toggle**: Properties / Statistics switcher at top of right panel (Data mode, after Calculate)
- **Collapsible sidebar sections**: all 5 Data mode sections (File Info, Model, Column Mapping, View, Export) now collapsible with ▾/▸ toggle
- **Venn model info**: selected model shows Venn type, form, and region count below the dropdown
- **Selected region style**: configurable hover/highlight color for count values via color picker
- **Heatmap customization**: 3-point color picker (Low, Mid, High) and legend position selector (4 corners)
- **SVG/PNG/JPG export in sidebar**: Export section with image export buttons + descriptive hint texts
- **Cut View locked region**: locked selection persists when moving mouse away; visual highlight stays
- **Cut View background click**: clicking empty area in Cut View unlocks the selection
- **Layer View background click**: clicking outside shapes unlocks the selection
- **Data mode sidebar scrolling**: overflow-y auto for long content
- **Subheading style**: new `sidebar-subsection-title` CSS class for Group names, Diagram Title, Color mode, Selected region style
- **Welcome → Summary → model select**: now correctly closes Welcome dialog and enters View mode

### Changed
- **4. View section restructured**: "Show elements" removed; Names/SUM Numbers toggles moved into "Group names and numbers"; Title toggle moved into "Diagram Title"
- **Help dialog restructured**: hierarchical 2-level format with heading (blue, bold) and subheading (indented with left border) across all 3 modes
- **Export section reordered**: SVG/PNG/JPG first with hint text, then Regions Summary / Item Matrix TSV with hint text
- **Data → Edit mode switch**: `markSaved()` called to prevent false MODIFIED state
- **Data mode switch**: diagram cleared only when no CSV data is loaded
- **Export PNG/JPG buttons removed from Properties panel** (moved to sidebar Export section)
- **SummaryDialog card click**: no longer calls `onClose` (prevented Welcome from reopening)

### Fixed
- **Welcome dialog persisting after model select from Summary**: `setWelcomeOpen(false)` was missing in `onSelectModel`; `onClose` was reopening Welcome via `summaryFromWelcome` flag
- **Cut View hover overriding locked region**: introduced `lockedIndex` computed from `lockedLabel` prop; `activeIndex` prioritizes lock over hover
- **Data → Edit false MODIFIED**: mode switch now marks current state as saved

## [1.5.1] — 2026-01-07

### Added
- **Credits page**: accessible from Welcome dialog, lists all authors with affiliations and contact email
- **Welcome dialog**: "Credits" button next to "View All 39 Diagram Models"

### Changed
- **SVG model comments**: updated GitHub URL to React-Venn-Diagram-Lab across all 39 SVG files
- **README**: removed emojis, updated Paper.js → Shapely references, refreshed project structure and Python scripts list, updated git clone URL
- **Python scripts renamed**: `center_texts.py` → `svg_center_texts.py`, `generate_tests.py` → `svg_generate_tests.py`, `normalize_after_illustrator.py` → `svg_normalize_after_illustrator.py`, `rotate_labels.py` → `svg_rotate_labels.py`
- **Documentation renamed**: `VENN-DIAGRAM-SVG.md` → `VENN-DIAGRAM-SVG-SPECIFICATION.md`, `VENN_PROJECT.md` → `VENN-DIGARAM-PROJECT-STRUCTURE.md`
- **SummaryDialog**: added Carroll 2000 source references
- **.gitignore**: added `CLAUDE.md`

### Removed
- `fix_edwards_shapes.py` and `unify_svgs.py` scripts (no longer needed)

## [1.6.0] — 2026-01-08

### Added
- **CSV Import Dialog** (`CsvImportDialog.tsx`): 5-section import wizard appearing after file selection
  - 1. File Type: Binary (0/1) or Aggregated (item names per column)
  - 2. Delimiters: configurable row delimiter (comma/semicolon/tab/space) + item delimiter for aggregated mode
  - 3. Header: toggle "First row is header" with custom header name inputs
  - 4. Data Columns: Select All / Deselect All buttons, checkbox per column with preview table (5 rows)
  - 5. Data Rows: Import All or Import Selected with row number and skip row specification (supports ranges like `1,3,5-10`)
- **Aggregated CSV support**: `calculateVennCountsFromAggregated()` — each column is a set, items in cells define membership, intersections computed via bitmask
- **Delimiter auto-detection**: `detectDelimiter()` heuristic for comma/semicolon/tab/space
- **Binary/Aggregated validation**: strict column validation before import
- **CSV parser tests**: 31 new tests in `csvParser.test.ts` covering all parser functions
- **Sample aggregated dataset**: `data/dataset_gene_sets.csv` — 600 rows, 6 pathway columns with gene names
- **File format support**: Upload Custom File now accepts `.csv`, `.tsv`, `.txt`
- **Cut View Heatmap**: RdBu diverging color scale (#2166AC → #F7F7F7 → #B2182B) based on count values
  - Color mode toggle (Depth / Heatmap) in Cut View sidebar
  - Legend bar with min/max values
  - Auto-switches to Heatmap after Calculate
  - Zero-count regions rendered in grey
- **Data export** (`exportData.ts`):
  - Regions Summary TSV: Region, Sets, Depth, Exclusive/Inclusive Count, Percentage, Items
  - Item Matrix TSV: per-item binary membership + region label
  - BOM-prefixed UTF-8 for Excel compatibility
- **Export section** in Data sidebar: "Regions Summary (TSV)" and "Item Matrix (TSV)" buttons
- **Export Region Items**: button in right panel to download selected region's items as text file
- **Export as PNG / Export as JPG**: image export with 2x retina quality, white background, clean (no selection highlights)
- **Data mode toolbar**: Open (dialog with Load Sample Data / Upload Custom File), Save (SVG), Close (reset to empty)
- **Data Open dialog**: choice between sample and custom file upload

### Changed
- **Data mode empty state**: "Load your data to get started" with "Load Sample Data" / "Upload Custom File" buttons
- **Import dialog title**: "Import Custom Dataset: {filename}"
- **Data sidebar section numbering**: 1. File Info, 2. Model, 3. Column Mapping, 4. View, 5. Export
- **Data sidebar File Info**: shows Format (Binary/Aggregated) instead of generic CSV
- **Font type controls**: label and dropdown on single row (inline layout)
- **Model selection for aggregated**: uses original column list (not binary detection), supports switching between larger/smaller models without losing columns
- **VennResult state**: full result preserved for export (replaces separate vennCounts state)

### Fixed
- **Aggregated model selector**: `maxSets` now correctly computed from `columnMapping.length` for aggregated mode (was using `getBinaryColumns` which returned 0)
- **Model switch column reset**: `onSelectModel` now slices from original import columns instead of current mapping, allowing switch back to larger models
- **`compatibleModelsBySet` memo**: dependency array includes `fileType` and `binaryColumns.length` for correct reactivity

## [1.5.0] — 2026-01-06

### Added
- **7 new Carroll diagram models**: 3-set rectangles, 3-set rectangle curved, 3–6 set Carroll triangle constructions (Carroll, 2000) — total now 39 models
- **Pre-computed region JSON data** for all 7 new models
- **Carroll 2000 publication** PDF reference
- **`generate_region_json.py`** script for generating region JSON from SVG models
- **Edit mode — Open button** in toolbar: opens SummaryDialog in select mode with "Open Custom SVG" option
- **Edit mode — Tools panel** on right side: TOOLS section above Properties with Shapes and Text subheaders
- **Shape tools** (right panel): Move, Rotate, Resize — mutually exclusive toggle buttons for shape manipulation
- **Text tools** (right panel): Move (default on), Rotate, Resize — mutually exclusive toggle buttons for text manipulation
- **Rotate Shapes mode**: drag to rotate shapes around their center, angle tooltip at cursor (e.g. `+45.3°`), `grab` cursor
- **Resize Shapes mode**: drag to scale shapes from center, percentage tooltip at cursor (e.g. `120%`), `nwse-resize` cursor
- **Text Rotate**: horizontal drag to rotate text around visual center (1px = 1°), angle tooltip at cursor
- **Text Resize**: vertical drag to change font size (10px = 1pt), size tooltip at cursor (e.g. `18px`)
- **Bullet (BulletX) elements**: now movable with Move Shapes tool (updates cx/cy), and interactive with Rotate/Resize tools
- **Data mode — Open/Save/Close buttons** in toolbar: Open shows dialog with "Load Sample CSV" / "Open Custom CSV", Save exports SVG, Close resets to empty state
- **Data mode — Open CSV dialog**: choice between sample and custom CSV file
- **Data mode — empty state**: centered "Load Sample" / "Upload Custom" buttons, sidebar and right panel hidden
- **Data mode — Show elements header**: above Title/Names/Numbers toggles
- **Data mode — Group names section**: Font-size slider with px value + Font type dropdown (Tahoma, Arial, Sans-serif, Monospace, Roboto)
- **Data mode — Diagram Title section**: Font-size slider with px value + Font type dropdown
- **`clearDoc()` method** in useSvgDocument hook: properly clears document and history state
- **`isModified` / `markSaved()`** in useSvgDocument: history-based modification tracking (replaces manual `hasUnsavedEdits` state)
- **MODIFIED badge**: yellow badge next to "File Info" in Edit sidebar, appears when document has unsaved changes, disappears on undo to saved state

### Changed
- **Mode selector**: "Test" renamed to "Data" everywhere (AppMode type, WelcomeDialog, HelpDialog, Toolbar)
- **Welcome dialog**: added program description, removed redundant instruction text, model count updated to 39
- **Summary dialog**: "Open Custom SVG" button in header when in select mode, header buttons layout
- **Edit sidebar**: removed SVG FILE section (Select/Open Custom buttons), file operations moved to toolbar Open button
- **Data sidebar**: removed Data Source section (moved to central empty state), section numbering updated (1–4)
- **Toolbar**: Move/Rotate/Resize Shapes buttons moved from toolbar to right-side Tools panel
- **Model catalog**: expanded from 32 to 39 models with Carroll constructions
- **Help dialog**: updated model counts (32 → 39 in View and Edit sections)
- **Test files**: updated model count assertions

### Fixed
- **Text drag not detected as modification**: `useDrag.onPointerUp` was parsing `transform="translate()"` regex on text elements that use `x`/`y` attributes — `onDragEnd` was never called. Fixed: compute final position from pointer delta
- **Click-to-select falsely marking as modified**: added 0.5px threshold in `useDrag.onPointerUp` — click without movement no longer pushes to history
- **Unsaved changes detection**: replaced manual `hasUnsavedEdits` state with `useSvgDocument.isModified` (compares history index to saved index). All edit operations now automatically tracked via undo history
- **Data mode Close**: properly resets all state using `clearDoc()` instead of loading empty SVG
- **LayerTree duplicate title**: removed redundant "Layers" title inside LayerTree component (already shown by parent collapsible header)
- **Text Rotate**: uses visual bounding box center (not baseline x/y) and horizontal drag (1px = 1°) instead of atan2 from click point
- **Text Resize**: modifies SVG `style` attribute directly instead of DOM inline style, preventing initial size jump on click

## [1.4.0] — 2026-01-04

### Added
- **Mode dropdown**: Mode selector replaced with a single dropdown button showing active mode icon + name, click to switch between 👁 View, ✏️ Edit, 📊 Data
- **Summary icon**: Summary view moved to ☰ icon button next to ? in toolbar right
- **View mode model browser**: Empty View state shows full model gallery inline (Summary-style cards grouped by set count), sidebar and right panel hidden until model selected
- **Welcome dialog about text**: Short program description added above mode selector cards
- **Welcome instruction text**: "Please select a function to get started" above mode cards
- **Shape colors in Data mode**: Color picker per set (A–H) in Column Mapping section
- **Shape opacity slider**: Adjustable shape opacity (5–100%) in Data mode Column Mapping
- **File Info section in Data mode**: Separate section with CSV metadata (filename, type, columns, binary, rows) + Download button
- **Move Shapes mode (Edit)**: Toolbar toggle to drag-reposition shapes with transform updates
- **Font family selector (Edit)**: Font type dropdown in PropertyPanel (Tahoma, Arial, sans-serif, monospace, Roboto)
- **Collapsible sections**: File Info, Layers (Edit sidebar), Region Statistics (Edit) now collapsible with ▾/▸ toggle
- **Edit empty state**: Two buttons — Select Model + Open Custom

### Changed
- **Renamed**: "React Venn Diagram Modifier" → "Venn Diagram Lab" across all files
- **Renamed**: Test mode → Data mode everywhere (AppMode type, WelcomeDialog, HelpDialog, Toolbar)
- **ViewerInfoPanel**: Uses live shape colors from doc instead of hardcoded SHAPE_COLORS
- **SelectionRect**: Uses screen rect + inverse CTM for correct bounds on transformed elements
- **Data mode section numbering**: 1. Data Source, 2. File Info, 3. Model, 4. Column Mapping, 5. View

### Fixed
- **Unsaved changes confirm**: Now triggers on all edit operations (PropertyPanel changes, sidebar toggles, element moves, visibility changes) — not just drag and text edit
- **Summary dialog from Welcome**: Close returns to Welcome dialog instead of falling through to View mode

## [1.3.0] — 2026-01-01

### Added
- **Welcome dialog**: mode selector (View/Edit/Test) with icons on startup
- **Help dialog** ("?" button): context-sensitive help for each mode
- **SVG validation dialog**: checks file against VENN-DIAGRAM-SVG.md spec on Open Custom
- **Select from library**: opens Summary dialog in select mode for Edit
- **Restore button**: reverts to original SVG state in Edit mode
- **Summary select mode**: different header for Edit file selection

### Changed
- Edit sidebar: FILE → SVG FILE, Open → Select + Open Custom, Save + Restore buttons
- Removed Open/Save from top toolbar (available in sidebar)
- SummaryDialog supports `selectMode` prop for Edit file selection

## [1.2.0] — 2026-01-01

### Added
- Region lock/unlock: click to lock panel, Unlock button to release
- LOCKED badge on selected region panel
- Name/CountSUM click: locks panel with inclusive data (total + all items)
- Name font-size slider in Test mode (8–48px)
- Save SVG button in right panel (Test + Layer view)
- Bottom toolbar: filename + cursor position (x, y)
- Title/Names/Numbers toggle buttons (checkbox-free)
- Grid/Validate as toggle buttons (checkbox-free)
- Unsaved changes confirm dialog when switching from Edit mode

### Fixed
- CSV parser handles quoted fields (commas in titles)
- CSV parser handles \r\n line endings (Peacock column detection)
- Region click lock: uses ref to avoid stale closures
- Shape/text click propagation in readOnly mode
- Items list: exclusive items match Count values
- Name/CountSUM click shows inclusive Value (CountSUM)
- Validation uses ID-based comparison (works with numeric content)
- PropertyPanel expectedLettersFromId: A-G → A-H
- Model selector shows all models 2–N sets (not just exact match)
- 8-set diagrams start at 60% zoom
- CSS --bg-hover variable defined
- renderText useCallback missing deps fixed
- allShapeIds wrapped in useMemo

### Changed
- Data source buttons: "Load Sample" / "Upload Custom" in one row
- "Diagram Model" → "Venn Diagram Model"
- "Calculate Venn Diagram" → "Calculate"
- Bigger toolbar (54px), buttons, panels, dots, fonts
- App padding (10px margins)
- Resizable sidebar (260px, horizontal resize)
- Centered canvas in View/Test mode

## [1.1.0] — 2025-12-31

### Added
- **Test mode**: Load CSV data, map columns to Venn sets, calculate intersection counts
- Sample dataset: `data/dataset_streaming_platforms.csv` (603 titles, 8 platforms)
- TestSidebar component: data source, model selection, column mapping, calculate button
- CSV parser utility (`csvParser.ts`): parse, binary column detection, Venn count calculation
- Layer/Cut view toggle in Test mode
- Auto-detection of binary columns from CSV
- Column name → set name mapping (NameA, NameB, ... replaced with column headers)
- Vite config copies `data/*.csv` to dist/

### Changed
- Mode selector: View / Edit / Test (was View / Edit)
- AppMode type extended with 'test'

## [1.0.2] — 2025-12-30

### Fixed
- Bug: `renderText` useCallback missing deps (`showValidation`, `invalidIds`)
- Bug: CSS `--bg-hover` variable missing from `:root` — region hover bg was broken
- Bug: `expectedLettersFromId` in PropertyPanel used `[A-G]` instead of `[A-H]` (8-set broken)
- Perf: `allShapeIds` in `useRegionDetection` now `useMemo`'d (was recreated every render)
- Repo URL updated to React-Venn-Diagram-Modul

## [1.0.1] — 2025-12-30

### Added
- Test suite: 342 tests across 4 suites (regions, hitTest, models, SVG format)
- `VENN-DIAGRAM-SVG.md` — SVG format specification document
- Vitest as test runner (`npm test`)
- Comprehensive README with all features, models, tests, and installation

### Changed
- CLAUDE.md updated with versioning rules

## [1.0.0] — 2025-12-30

### Added
- **Summary mode**: Dialog with all 32 diagrams grouped by set count, SVG previews, source references
- **App title bar**: "React Venn Diagram Modifier" centered header
- **Mode selector**: View / Edit / Summary modes with label
- **Version display**: Bottom-right version indicator
- **Collapsible panels**: Region groups and Info section in viewer sidebar
- **Resizable panels**: Dynamic left/right panel widths

### Changed
- Centered canvas in View mode
- Larger buttons, dots, and panel fonts
- Info section moved above Regions in sidebar

## [0.9.0] — 2025-12-29

### Fixed
- Cut View labels: hidden by default, shown centered on hover
- Info panel works in Cut View via label-based region detection

## [0.8.0] — 2025-12-28

### Added
- Pre-computed region paths from venn7 generator (JSON format)
- CutViewCanvas renders real SVG paths per region

### Changed
- Reorganized `models/` into `models/svg/` and `models/json/`
- Copied `generate_region_js.py` generator script

## [0.7.0] — 2025-12-27

### Added
- Cut View intersection overlay (clip-path based, single overlay on hover)

### Fixed
- Cut View: removed masks (SVG masks don't affect hit testing)
- Z-ordering for region exclusivity

## [0.6.0] — 2025-12-22

### Added
- Cut View mode (SVG clip-path + mask approach — later replaced)
- Layer/Cut view toggle in ViewerSidebar

## [0.5.0] — 2025-12-20

### Added
- Unified app at project root (migrated from `editor/`)
- Viewer mode with interactive region detection (`isPointInFill`)
- ViewerSidebar: model selector (32 SVGs) + region list
- ViewerInfoPanel: region info with set colors
- Mode switcher (View / Edit) in Toolbar
- Canvas `readOnly` mode for viewer

## [0.4.0] — 2025-12-19

### Changed
- README updated with correct diagram sources (Venn 1880, SUMO-Venn)

## [0.3.0] — 2025-12-18

### Added
- `venn-5f-set.svg` and `venn-4f-set.svg` models
- VENN-INFO.md reference links
- Python utility scripts (center_texts, fix_edwards, transform_7setc, unify_svgs)

### Changed
- Standardized font-family to `'Tahoma'` across all 32 SVGs
- Removed `px` units from font-size values
- Added author comment to `venn-4e-set-euler.svg` and `venn-8-set.svg`
- Fixed title mismatch in `venn-6b-set-anderson.svg`
- README rewritten in English with literature overview and model catalog

## [0.2.0] — 2025-12-16

### Added
- `rotate_labels.py`: cyclic label rotation with color and sort support
- `VENN_PROJECT.md`: standard color mapping reference (A–H)

### Fixed
- Standardized Shape D color (`#58595B` → `#808285`) in 6 files
- Standardized Shape G color (`#F7941E` → `#CA4B9B`) in `venn-7a-set-edwards.svg`

## [0.1.0] — 2025-12-08

### Added
- Initial project setup: README.md
- SVG Venn diagram editor (React + TypeScript + Vite)
- 32 SVG Venn diagram models (2–8 sets)
- Research publications
- Python scripts (generate_tests, normalize_after_illustrator)
- `.gitignore`
