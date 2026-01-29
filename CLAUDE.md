# CLAUDE.md — Venn Diagram Lab

## Project Overview

Venn Diagram Lab — interactive viewer, editor, and data visualization tool for Venn diagrams. 44 SVG models (2-set to 9-set) covering all major construction methods, with interactive region detection (Layer/Cut/UpSet views), a full SVG editor, CSV/TSV/GMT/GMX data import (file, paste, URL), statistical analysis, PDF report generation, and light/dark theme support.

**Repository:** https://github.com/ZoliQua/React-Venn-Diagram-Lab
**Tech stack:** React 19 + TypeScript 5.9 + Vite 8 + Vitest 4
**Version file:** `src/version.ts` (currently 1.9.2)

## Recent Notes

- `index.html` now contains a restrictive Content Security Policy. Keep GA consent loading, local assets, and `blob:` / `data:` export flows working when modifying it.
- `src/utils/exportData.ts` escapes spreadsheet-style formula prefixes in TSV text cells. Preserve that hardening when changing export behavior.

## Strict Rules

### 1. Scientific Rigor
- **Do NOT hallucinate data.** If unsure, flag it and ask.
- **Always ask** when uncertain about a decision.
- **Plan first, then execute.** Write a plan before non-trivial changes.
- **Verify everything.** Read a file before referencing it.
- **Write and run tests.** Anything marked DONE must be tested and working.
- **No placeholder/stub code.**

### 2. Commit Rules
- All commits go under the user's name only (Zoltan Dul).
- Claude does NOT appear as co-author in commits.
- Only commit when explicitly asked.

### 3. Version Tracking
- **Strict SemVer.**
- Major feature / UI change: **+0.1** bump (e.g. 1.7.0 -> 1.8.0)
- Bugfix / text fix: **+0.0.1** bump (e.g. 1.7.0 -> 1.7.1)
- Version lives in `src/version.ts`, must be updated before each commit.
- Changes must be recorded in `CHANGELOG.md`.

### 4. Code Quality
- Do not "fix" code without reading it first.
- Do not expand scope without justification.

## Directory Structure

```
2-venn-diagram/
├── src/                        React + TypeScript source
│   ├── App.tsx                 Main component (View/Edit/Data/Summary modes)
│   ├── version.ts              Version constant (APP_VERSION, APP_NAME)
│   ├── models.ts               44-model catalog (MODEL_LIST) + fetch utilities
│   ├── components/
│   │   ├── Toolbar.tsx          Top bar (mode switcher, zoom, tools, theme toggle)
│   │   ├── Canvas.tsx           SVG rendering + mouse interaction
│   │   ├── CutViewCanvas.tsx    Pre-computed region rendering (Cut View)
│   │   ├── UpsetPlot.tsx        UpSet plot SVG rendering component
│   │   ├── NetworkPlot.tsx      Force-directed network graph (drag & move, click select)
│   │   ├── ViewerSidebar.tsx    Model selector dropdown + region list
│   │   ├── ViewerInfoPanel.tsx  Region info + item search (global Find Item + in-region filter)
│   │   ├── SummaryDialog.tsx    Gallery dialog + SOURCES publication table
│   │   ├── WelcomeDialog.tsx    Welcome screen + Credits with author photos
│   │   ├── HelpDialog.tsx       Help content for each mode
│   │   ├── CsvImportDialog.tsx  CSV/TSV import with format detection
│   │   ├── PasteImportDialog.tsx Paste gene lists directly (2-9 textareas)
│   │   ├── UrlImportDialog.tsx  URL import with 5-step validation pipeline
│   │   ├── SampleDataDialog.tsx Sample dataset selector (5 curated datasets)
│   │   ├── PdfReportDialog.tsx  PDF report generation dialog
│   │   ├── DataSummaryPanel.tsx Statistics panel (Jaccard, Dice, enrichment)
│   │   ├── Sidebar.tsx          Editor layer tree
│   │   ├── PropertyPanel.tsx    Editor property editor
│   │   ├── TestSidebar.tsx      Data mode sidebar (file info, model, column mapping, view settings, export)
│   │   └── ...
│   ├── hooks/
│   │   ├── useSvgDocument.ts    Document state + undo/redo
│   │   ├── useRegionDetection.ts Hit-testing + label-based detection
│   │   └── useZoomPan.ts        Zoom & pan
│   ├── parser/                  SVG parser & serializer
│   ├── utils/
│   │   ├── hitTest.ts           Shape containment detection
│   │   ├── regions.ts           Region enumeration (2^n - 1 subsets)
│   │   ├── csvParser.ts         CSV/TSV/GMT/GMX parser, binary & aggregated Venn calculation
│   │   ├── statistics.ts        Statistical tests (Jaccard, Dice, hypergeometric, BH-FDR)
│   │   ├── exportData.ts        TSV export (Region Summary + Item Matrix)
│   │   ├── upsetData.ts         UpSet data conversion + sorting utilities
│   │   ├── upsetSvgBuilder.ts   Print-optimized UpSet SVG string builder (max 20 cols)
│   │   ├── networkData.ts       Network data model + force-directed layout algorithm
│   │   ├── networkSvgBuilder.ts Print-optimized Network SVG string builder
│   │   ├── proportionalLayout.ts Area-proportional circle solver (2/3-set binary search)
│   │   ├── proportionalModel.ts  VennDocument generator for proportional diagrams
│   │   ├── proportionalRegions.ts Cut View region paths (analytical 2-set, grid-sampled 3-set)
│   │   ├── pdfReport.ts         PDF report generation (jsPDF, lazy-loaded ~400KB chunk)
│   │   └── svgToImage.ts        SVG-to-PNG capture utility
│   └── __tests__/
│       ├── exportData.test.ts  TSV export hardening tests
│       ├── models.test.ts       Model catalog integrity (44 models)
│       ├── svgFormat.test.ts    SVG format validation (venn*.svg only, Euler exception)
│       ├── regions.test.ts      Region enumeration logic
│       ├── hitTest.test.ts      Shape/Count ID parsing
│       ├── csvParser.test.ts    CSV parser tests
│       └── statistics.test.ts   Statistical function tests
├── models/
│   ├── svg/                     44 SVG Venn diagram models
│   └── json/                    44 JSON pre-computed region data
├── credits/                     Author profile photos (4 images)
├── data/                        Sample datasets (3 real + 2 mock, prefixed dataset_real_/dataset_mock_)
├── samples/                     Source SVG samples used for model generation
├── publications/                Research papers (PDF)
├── article/                     Implementation plans (markdown)
├── public/                      Static assets
├── *.py                         Python utility scripts
├── CHANGELOG.md                 Version history
├── VENN-DIAGRAM-SVG-SPECIFICATION.md  SVG format specification
├── VENN-DIGARAM-PROJECT-STRUCTURE.md  Standard color mapping & project info
├── package.json                 Node.js project config
├── vite.config.ts               Vite build config
└── index.html                   HTML entry point
```

## Key Architecture Decisions

### Four Modes
- **Summary** — Gallery of all 44 diagrams, grouped by set count, with publication references
- **View** — Interactive viewer with three sub-modes:
  - **Layer View** — transparent overlapping shapes, `isPointInFill()` hit-testing
  - **Cut View** — pre-computed region paths from JSON, direct mouse events per region; two color modes: Depth and Heatmap
  - **UpSet View** — UpSet plot visualization with matrix dots, intersection bars, set size bars, pagination (top 50), sort by size/degree, color modes (depth/heatmap/custom), threshold filter
  - **Network View** — Force-directed network graph: nodes = sets (sized by cardinality), edges = pairwise intersections (weighted by count/Jaccard/FE/OC), significance coloring, drag & move, click to select region
- **Edit** — Full SVG editor with drag, text editing, shape move/rotate/resize, undo/redo, validation, export
- **Data** — 4 import methods (sample datasets, file upload, paste lists, URL import), visual model browser filtered by set count, area-proportional computed models (2-3 sets), auto-calculate on model/column change, column-to-set mapping (up to 9 sets), UpSet plot, statistical analysis (Jaccard, Dice, hypergeometric), PDF report, item search (global + in-region), image/data export

### Theme System
- Light/dark mode via `data-theme` attribute on `<html>`
- ~30 CSS variables in `:root` (backgrounds, text, borders, semantic colors, significance)
- `:root[data-theme="light"]` block overrides all variables
- Toggle button (☀/☾) in toolbar, persisted to `localStorage`, defaults to OS `prefers-color-scheme`

### Data Import Methods
1. **Sample Data** — `SampleDataDialog` with 5 curated datasets (3 real biological + 2 mock)
2. **File Upload** — CSV, TSV, TXT, GMT, GMX via `CsvImportDialog` with format detection
3. **Paste Lists** — `PasteImportDialog` with 2-9 textareas, delimiter auto-detect, generates aggregated CsvData
4. **URL Import** — `UrlImportDialog` with 5-step validation (URL, protocol, extension, fetch, content), preview, CORS handling

### PDF Report (Data mode)
- jsPDF lazy-loaded (~400KB separate chunk)
- Page 1: Data Overview (timestamp, file, items, regions), Set Sizes pie chart + table (with Exclusive/Inclusive), footnotes for truncated names
- Page 2: Venn Diagram image (title hidden, names at 16px) + UpSet Plot image (max 20 cols, print-optimized white bg)
- Page 3+: Statistics tables (Jaccard, Dice, Enrichment with FDR coloring); 7-8-9 sets: each table on own page
- Network page: Set Relationship Network image + significant edges list with Jaccard values
- Last page: "About This Report" methodology explanations (Venn, UpSet, Network, Jaccard, Dice, Enrichment)

### Item Search (Data mode)
- **Find Item (global)**: Collapsible section at top of right panel, searches across all regions' exclusive items, shows matching regions with color dots, set names, match count, and up to 5 matching items with highlighted text. Click to navigate to region.
- **In-region filter**: Search bar appears when >10 items in a region, filters with highlighted matches, limit increased from 50 to 200 when filtering.

### Model System
- `src/models.ts` contains `MODEL_LIST` array — the single source of truth for all 44 models
- SVGs served from `models/svg/`, JSONs from `models/json/`
- `SummaryDialog.tsx` has a `SOURCES` record mapping filenames to publication references
- When adding a new model, update: `MODEL_LIST`, `SOURCES` (if applicable), tests, and all hardcoded model counts in UI text

### SVG Format (all 44 models follow this)
Every model SVG must contain these groups:
- `<g id="Shapes">` — shapes named `ShapeA` through `ShapeI`
- `<g id="ShapesExtras">` (optional) — additional shapes for Euler diagrams (`ShapeX2`)
- `<g id="Texts">` containing:
  - `<g id="Header">` with `<text id="Title">`
  - `<g id="Group_Names">` with `NameA`, `NameB`, etc.
  - `<g id="Group_Values">` with `Count_A`, `Count_AB`, ..., `Count_ABCDEFGHI`
  - `<g id="Group_CountSums">` (optional, 6+ set models)
- `<g id="Group_Bullets">` with colored circles `BulletA`, `BulletB`, etc.

Shape types used: `<circle>`, `<ellipse>`, `<rect>`, `<path>`, `<polygon>`

### Group_Values Sorting Order
Text elements within Group_Values must be sorted:
1. Single characters first: A, B, C, ...
2. Then two-character combinations: AB, AC, AD, ...
3. Then three-character, etc.
4. Within same length: alphabetical order

### Standard Color Mapping
| Set | Color | Hex |
|-----|-------|-----|
| A | Yellow | `#FFF200` |
| B | Blue | `#2E3192` |
| C | Red | `#ED1C24` |
| D | Grey | `#808285` |
| E | Brown | `#3C2415` |
| F | Magenta | `#9E1F63` |
| G | Pink | `#CA4B9B` |
| H | Cyan | `#21AED1` |
| I | Orange | `#F7941E` |

### SVG Comment Header
All SVGs use this exact comment:
```
<!-- Created by Zoltan Dul in 2026 - free to use with MIT license. Part of React Venn Diagram Lab Module - https://github.com/ZoliQua/React-Venn-Diagram-Lab - SVG Version: 3.0.0 -->
```

## JSON Region Data

Each SVG has a matching JSON in `models/json/` with pre-computed region boundaries.

**JSON structure:**
```json
{
  "name": "Diagram name",
  "n": 3,
  "sets": ["A", "B", "C"],
  "curves": ["M ... Z", ...],
  "regions": ["", "M ... Z", ...],
  "colors": {"A": "#FFF200", ...},
  "region_labels": {"A": [196.2, 357.7], ...},
  "set_names": {"A": "NameA", ...}
}
```

- `curves`: shape boundaries as SVG path strings in normalized coordinates ([-50, 50] range, Y-flipped)
- `regions`: array indexed by bitmask (0=exterior empty, 1=last set only, 2=second-to-last set only, 3=both, ...)
- `region_labels`: centroid positions in SVG pixel coordinates

**Generation:** `python generate_region_json.py` uses Shapely for Boolean intersection/difference operations.

## Adding a New Model — Checklist

1. Create SVG in `models/svg/` following the standard format
2. Run `python generate_region_json.py <name>` to create matching JSON
3. Add entry to `MODEL_LIST` in `src/models.ts` (sorted by set count)
4. Add `SOURCES` entry in `src/components/SummaryDialog.tsx` if publication exists
5. Update model count in:
   - `src/components/WelcomeDialog.tsx` (3 places)
   - `src/components/HelpDialog.tsx` (2 places)
   - `src/__tests__/models.test.ts` (2 places)
   - `src/__tests__/svgFormat.test.ts` (1 place)
   - Or better: grep for the old count number across `src/`
6. Run `npm test` to verify

## Python Scripts

| Script | Purpose |
|--------|---------|
| `generate_region_json.py` | Generate JSON region data from SVGs (Shapely). Supports `--all`, specific names, or auto-detect missing |
| `svg_rotate_labels.py` | Cyclic label rotation with color & sort support |
| `svg_normalize_after_illustrator.py` | Normalize SVGs after Illustrator export |
| `svg_center_texts.py` | Center text elements in SVGs |
| `svg_generate_tests.py` | Generate test SVG files |

## Construction Methods

| Method | Sets | Key property |
|--------|------|-------------|
| Venn (1880) | 2-5 | Classic circles/ellipses |
| Edwards (1996) | 2-9 | Cogwheel curves, all regions guaranteed |
| Anderson (1988) | 3-6 | Rectangles + U-shapes + comb paths |
| Grunbaum (1984/1992) | 5, 7 | Ellipses (5-set) and complex curves (7-set) |
| Bannier & Bodin (2017) | 5-8 | Rectangles + Z-shapes + combs, scalable to 8+ |
| Carroll (2000) | 3-6 | Triangular polygon arrangements |
| Mamakani et al. (2012) | 7 | Rosette symmetric curves (Adelaide, Hamilton, etc.) |
| SUMO-Venn | 6, 8 | Organic freeform curves |
