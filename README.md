# Venn Diagram Lab

Interactive viewer and editor for Venn diagrams — from 2-set to 9-set, covering all known construction methods. Built with React, TypeScript, and Vite.

**Version:** 1.13.4 | **Models:** 44 SVG diagrams + proportional | **License:** MIT

## Features

### Four Modes

| Mode | Description |
|------|-------------|
| **Summary** | Gallery view of all 44 diagrams with SVG previews, grouped by set count, with publication references |
| **View** | Interactive diagram viewer with region detection. Four sub-modes: **Layer** (transparent overlapping shapes), **Cut** (pre-computed intersection regions), **UpSet** (UpSet plot), and **Network** (force-directed relationship graph) |
| **Edit** | Full SVG editor with drag-to-position, text editing, undo/redo, validation, and export |
| **Data** | Load CSV/TSV/GMT/GMX data, paste gene lists, fetch from URL, map columns to Venn sets (up to 9), auto-calculate on model selection, export as TSV/PDF |

### View Mode — Layer View
- Load any of the 44 SVG models from the dropdown
- Hover over the diagram to detect which intersection region you're in
- Region detection uses `SVGGeometryElement.isPointInFill()` hit-testing
- Right panel shows: region label, involved sets with colors, intersection expression
- Left panel shows: collapsible region list grouped by depth (Single, 2-way, 3-way, ...)

### View Mode — Cut View
- Renders **pre-computed intersection region paths** (generated via Shapely Boolean operations)
- Each of the 2^n - 1 regions is a separate SVG `<path>` element with direct mouse events
- Hover highlights the region, dims others, shows white outline and centered label
- Two color modes: **Depth** (dark-to-warm by intersection depth) and **Heatmap** (RdBu diverging scale by count values)

### View Mode — UpSet Plot
- **UpSet plot** visualization showing intersection sizes as vertical bars above a dot matrix
- Horizontal set size bars on the left, with trimmed set labels and size counts
- Hover highlights + tooltip (set names and count), click to lock selection
- Pagination: top 50 intersections shown, prev/next page controls
- Sort by intersection size (descending) or by degree (number of member sets)
- Color modes: **Depth** (blue-to-red by member count), **Heatmap**, or **Custom** single color
- Adjustable minimum count threshold filter

### View Mode — Network Diagram
- **Force-directed network graph** of pairwise set relationships
- Nodes sized by set cardinality, colored by standard Venn colors, draggable
- Edges weighted by: intersection count, Jaccard index, Fold Enrichment, or Overlap Coefficient
- Significance coloring: green (FDR<0.05), grey (not significant), red (under-represented)
- Click node → select set region; click edge → select intersection region in right panel
- Filters: significant edges only, minimum weight threshold
- Dark/White background toggle

### Edit Mode
- Open/Save SVG files
- Drag text elements to reposition
- Double-click to edit text content
- Property panel: position, font size, fill/stroke colors
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
- Grid overlay and validation checker
- Layer tree with visibility toggles
- ViewBox editor
- Shape move, rotate, and resize tools

### Data Mode
- Import CSV, TSV, or TXT files via configurable import dialog
- Two data formats: **Binary** (0/1 per cell) and **Aggregated** (item names per column)
- Configurable row/item delimiters, header detection, column selection, row filtering
- Per-set color picker, shape opacity slider, font controls for names and title
- **Auto-capped name font size** based on longest column name (16+ chars → 12 px, 20+ → 10 px, 24+ → 9 px, 28+ → 8 px); never increases a smaller user setting
- Cut View with **Heatmap** color mode (customizable 3-point color scale + legend position)
- Collapsible sidebar sections (File Info, Model, Column Mapping, View, Export)
- Right panel toggle: **Properties** (region info, items, unlock) / **Statistics** (Jaccard, Dice, enrichment)
- Selected region style: configurable highlight color for hovered/selected count values
- **Area-proportional diagrams** (2-3 sets): computed circle layout where sizes match your data, with accuracy display
- Visual model browser after data import — shows compatible diagram models filtered by set count
- Auto-calculate on model selection (no manual Calculate button needed)
- **Find Item** search: global cross-region search with match highlighting and region navigation
- **In-region filter**: filter items within a selected region with highlighted matches
- **Copy region items to clipboard** (alongside Export); single-letter regions get separate buttons for Exclusive and All Items incl. intersections
- UpSet Plot sub-mode available after calculation (max 20 intersections in print export)
- **Enrichment Plots**: collapsible section with Bar, Lollipop, and Heatmap plots of the pairwise hypergeometric results; metric toggle (−log₁₀(FDR) vs Fold Enrichment); per-plot SVG export
- **Plot editor**: click any enrichment plot thumbnail to open a dedicated editor in the left sidebar (colours, fonts, background, visibility toggles). Per-plot style state; Back to Diagram returns to the previous view
- Statistical Methods reference built into the Help dialog (Jaccard, Dice, Overlap Coefficient, hypergeometric enrichment, Fold Enrichment, Benjamini–Hochberg FDR)
- Export: **SVG / PNG / JPG** image export + **Regions Summary TSV** + **Item Matrix TSV**
- **Report PDF**: Multi-page A4 report with data overview, pie chart, Venn diagram, UpSet plot, Network diagram with significant edges, full statistical tables (Jaccard, Dice, Enrichment), three enrichment plots, and methodology explanations
- **Full Report (zip)**: single download bundling the PDF, TSVs, standalone SVGs, a 3-sheet Excel workbook (`enrichment_statistics_{n}-sets.xlsx`), the three enrichment stat SVGs, and a `README.txt` with provenance + the full *About This Report* text. 0–100% progress bar in the dialog
- Export individual region items via right panel
- Sample datasets: binary (streaming platforms, cancer drivers, MSigDB hallmark collections) and aggregated (gene sets)
- Supports up to **9 sets** (A through I)
- TSV exports escape spreadsheet-style formula prefixes in exported text cells while preserving the in-app values

### Summary Mode
- Dialog gallery of all 44 diagrams
- SVG previews rendered inline
- Grouped by set count (2-set through 9-set)
- Source references linked to publication PDFs (multi-line labels supported)

### About Venn Diagrams
- Welcome-screen dialog introducing the history, definition, and later mathematical development of Venn diagrams
- Three tabbed sections with long-form explanatory text
- Custom in-app explanatory SVG illustrations plus a retained primary-source image from Venn's 1880 paper
- References section with clickable local PDF links in the built app

### Guided Tour
- Fourth welcome-screen card alongside View / Edit / Data
- **12-step coach-mark walkthrough** of Data mode using the pre-loaded Cancer Drivers sample (COSMIC, OncoKB, IntOGen, Vogelstein) on a 4-set Edwards diagram
- Covers: Open → File Info → Model → Column Mapping → View cycle (Layer / Cut / UpSet / Network) → Properties with the full ABCD intersection selected → Statistics tab → Enrichment Plots card (auto-cycles Bar → Lollipop → Heatmap, then scrolls to the pairwise stats tables) → Plot editor highlighted on the Heatmap → Report PDF / Full Report (zip)
- **Replay** button on the two auto-cycle steps (View cycle, Plot editor cycle)
- Progress dots, Back / Skip / Next + keyboard (←/→/Enter/ESC) navigation; ESC always exits safely to the welcome screen
- Also launchable from the Help dialog in any mode (*Getting Started → Start the tour*)
- 9 unobtrusive `data-tour="..."` DOM anchors make tour selectors stable across future UI refactors

## Security Notes

- `index.html` defines a restrictive Content Security Policy that keeps the current GA consent loader, local assets, and `blob:` / `data:` export paths working.
- Data-mode TSV exports escape leading spreadsheet formula prefixes (`=`, `+`, `-`, `@`) in text cells to reduce Excel/LibreOffice formula execution risk.

## Project Structure

```
├── src/                       React + TypeScript source code
│   ├── App.tsx                Main app component (4 modes)
│   ├── version.ts             Version constant
│   ├── models.ts              44-model catalog + fetch utilities
│   ├── components/            UI components
│   │   ├── Toolbar.tsx        Top bar (mode switcher, zoom, tools, Report PDF / Full Report (zip))
│   │   ├── Canvas.tsx         SVG rendering + interaction
│   │   ├── CutViewCanvas.tsx  Region-based rendering (Cut View)
│   │   ├── UpsetPlot.tsx      UpSet plot SVG rendering
│   │   ├── NetworkPlot.tsx    Force-directed network graph
│   │   ├── EnrichmentPlots.tsx       Enrichment plots card (right panel thumbnails)
│   │   ├── EnrichmentPlotEditor.tsx  Left-sidebar plot style editor
│   │   ├── EnrichmentPlotCanvas.tsx  Central canvas in plot-edit mode
│   │   ├── PdfReportDialog.tsx       PDF report generation dialog
│   │   ├── ZipReportDialog.tsx       Full zip bundle dialog (PDF + TSVs + SVGs + XLSX)
│   │   ├── TourOverlay.tsx           Guided tour overlay (coach marks + progress)
│   │   ├── PasteImportDialog.tsx     Paste gene lists import
│   │   ├── UrlImportDialog.tsx       URL data import with validation
│   │   ├── SampleDataDialog.tsx      Sample dataset selector
│   │   ├── ViewerSidebar.tsx         Model selector + region list
│   │   ├── ViewerInfoPanel.tsx       Region info display (Properties tab)
│   │   ├── DataSummaryPanel.tsx      Statistics tab (Overview + Enrichment Plots + pairwise tables)
│   │   ├── SummaryDialog.tsx         Gallery dialog + SOURCES table
│   │   ├── AboutVennDialog.tsx       Educational welcome-screen dialog
│   │   ├── WelcomeDialog.tsx         Welcome screen (View / Edit / Data / Tour cards)
│   │   ├── HelpDialog.tsx            Mode-specific Help (with Start-tour button)
│   │   ├── Sidebar.tsx               Editor layer tree
│   │   ├── PropertyPanel.tsx         Editor property editor
│   │   └── ...                       Other editor components
│   ├── hooks/                 React hooks
│   │   ├── useSvgDocument.ts  Document state + undo/redo
│   │   ├── useRegionDetection.ts Hit-testing + label-based detection
│   │   ├── useZoomPan.ts      Zoom & pan
│   │   └── ...
│   ├── parser/                SVG parser & serializer
│   ├── utils/                 Shared utilities
│   │   ├── hitTest.ts         Shape containment detection
│   │   ├── regions.ts         Region enumeration (2^n - 1 subsets)
│   │   ├── csvParser.ts       CSV/TSV parser, binary & aggregated Venn calculation
│   │   ├── exportData.ts      TSV export (Region Summary + Item Matrix)
│   │   ├── upsetData.ts       UpSet data conversion + sorting
│   │   ├── pdfReport.ts       PDF report generation (jsPDF, lazy-loaded)
│   │   ├── zipReport.ts       Full zip bundle builder (jszip + exceljs, lazy-loaded)
│   │   ├── reportArtefacts.ts Shared SVG artefact builder (PDF + zip)
│   │   ├── aboutReport.ts     ABOUT_REPORT_SECTIONS (shared by PDF last page and zip README)
│   │   ├── statistics.ts      Pairwise Jaccard / Dice / hypergeometric + BH FDR
│   │   ├── enrichmentPlotSvg.ts    Bar / Lollipop / Heatmap SVG generators (style-aware)
│   │   ├── enrichmentPlotStyle.ts  EnrichmentPlotStyle type + DEFAULT_PLOT_STYLE
│   │   ├── tourSteps.ts       Declarative TOUR_STEPS + TourAction union
│   │   ├── tourMock.ts        Tour dataset config (Cancer Drivers sample)
│   │   ├── svgToImage.ts      SVG-to-PNG capture utility
│   │   ├── upsetSvgBuilder.ts Print-optimized UpSet SVG builder
│   │   ├── networkData.ts     Network data model + force layout algorithm
│   │   ├── networkSvgBuilder.ts Print-optimized Network SVG builder
│   │   ├── proportionalLayout.ts Area-proportional circle solver (2/3-set)
│   │   ├── proportionalModel.ts  VennDocument generator for proportional
│   │   └── proportionalRegions.ts Cut View region paths for proportional
│   └── __tests__/             Test suites
│       ├── aboutVennContent.test.ts About dialog content consistency tests
│       ├── exportData.test.ts  TSV export hardening tests
├── models/
│   ├── svg/                   44 SVG Venn diagram models
│   └── json/                  44 JSON pre-computed region data
├── public/about-venn/         Custom educational SVG/PNG assets for the About dialog
├── publications/              Research papers (PDF)
├── samples/                   Source SVG samples for model generation
├── *.py                       Python utility scripts
├── data/                      Sample datasets (CSV)
├── CHANGELOG.md               Version history
├── VENN-DIAGRAM-SVG-SPECIFICATION.md  SVG format specification
├── VENN-DIGARAM-PROJECT-STRUCTURE.md  Standard color mapping & project info
└── package.json               Node.js project

## SVG Format

All 44 models use a standardized SVG structure. See [VENN-DIAGRAM-SVG-SPECIFICATION.md](VENN-DIAGRAM-SVG-SPECIFICATION.md) for the full specification.

**Key elements:**
- `<g id="Shapes">` — Shape geometry (`ShapeA`-`ShapeI`)
- `<g id="ShapesExtras">` — Extra shapes for Euler diagrams (`ShapeA2`, `ShapeB2`, ...)
- `<g id="Group_Values">` — Intersection count labels (`Count_A`, `Count_AB`, ..., `Count_ABCDEFGHI`)
- `<g id="Group_Names">` — Set name labels (`NameA`-`NameI`)
- `<g id="Group_CountSums">` — Set total labels
- `<g id="Group_Bullets">` — Color legend circles

**Region count:** 2^n - 1 (3 for 2-set, 7 for 3-set, 15 for 4-set, ..., 511 for 9-set)

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

## Diagram Models

### 2-Set (3 regions)
| File | Type | Source |
|------|------|--------|
| `venn-2-set.svg` | Classic two-circle | Venn, 1880 |
| `venn-2a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-2e-set-carroll-triangle.svg` | Carroll triangle | Carroll, 2000 |
| `venn-2e-set-rectangle.svg` | Rectangle layout | — |

### 3-Set (7 regions)
| File | Type | Source |
|------|------|--------|
| `venn-3-set.svg` | Classic three-circle | Venn, 1880 |
| `venn-3a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-3b-set-anderson.svg` | Anderson construction | Anderson, 1988 |
| `venn-3e-set-rectangles.svg` | Rectangles | — |
| `venn-3e-set-rectangle-curved.svg` | Curved rectangles | — |
| `venn-3e-set-carroll-triangle.svg` | Carroll triangle | Carroll, 2000 |

### 4-Set (15 regions)
| File | Type | Source |
|------|------|--------|
| `venn-4-set.svg` | Classic overlapping ellipses | Venn, 1880 |
| `venn-4a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-4b-set-anderson.svg` | Anderson construction | Anderson, 1988 |
| `venn-4e-set-euler.svg` | Euler diagram variant | — |
| `venn-4e-set-rectangle.svg` | Rectangle layout | — |
| `venn-4e-set-carroll-triangle.svg` | Carroll triangle | Carroll, 2000 |
| `venn-4f-set.svg` | Original Venn construction | Venn, 1880 |

### 5-Set (31 regions)
| File | Type | Source |
|------|------|--------|
| `venn-5-set-grunbaum.svg` | Grunbaum ellipse | Grunbaum, 1984 |
| `venn-5a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-5b-set-anderson.svg` | Anderson construction | Anderson, 1988 |
| `venn-5d-set-bannier.svg` | Bannier-Bodin variant | Bannier & Bodin, 2017 |
| `venn-5e-set.svg` | Organic/freeform | — |
| `venn-5e-set-carroll-triangle.svg` | Carroll triangle | Carroll, 2000 |
| `venn-5e-set-euler.svg` | Euler diagram (21/31 regions) | — |
| `venn-5f-set.svg` | Original Venn construction | Venn, 1880 |

### 6-Set (63 regions)
| File | Type | Source |
|------|------|--------|
| `venn-6-set.svg` | SUMO-Venn construction | SUMO-Venn |
| `venn-6a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-6b-set-anderson.svg` | Anderson construction | Anderson, 1988 |
| `venn-6d-set-bannier.svg` | Bannier-Bodin variant | Bannier & Bodin, 2017 |
| `venn-6e-set-carroll-triangle.svg` | Carroll triangle | Carroll, 2000 |

### 7-Set (127 regions)
| File | Type | Source |
|------|------|--------|
| `venn-7-set-grunbaum.svg` | Grunbaum construction | Grunbaum, 1992 |
| `venn-7a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-7c-set-adelaide.svg` | Adelaide symmetric | Edwards, 1996; Mamakani et al., 2012 |
| `venn-7d-set-bannier.svg` | Bannier-Bodin variant | Bannier & Bodin, 2017 |
| `venn-7e-set-adelaide.svg` | Adelaide variant | Edwards, 1996; Mamakani et al., 2012 |
| `venn-7e-set-hamilton.svg` | Hamilton variant | Edwards, 1996; Mamakani et al., 2012 |
| `venn-7e-set-manawatu.svg` | Manawatu variant | Edwards, 1996; Mamakani et al., 2012 |
| `venn-7e-set-massey.svg` | Massey variant | Edwards, 1996; Mamakani et al., 2012 |
| `venn-7e-set-palmerston-north.svg` | Palmerston North variant | Edwards, 1996; Mamakani et al., 2012 |
| `venn-7e-set-victoria.svg` | Victoria variant | Edwards, 1996; Mamakani et al., 2012 |

### 8-Set (255 regions)
| File | Type | Source |
|------|------|--------|
| `venn-8-set.svg` | SUMO-Venn construction | SUMO-Venn |
| `venn-8a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-8d-set-bannier.svg` | Bannier-Bodin variant | Bannier & Bodin, 2017 |

### 9-Set (511 regions)
| File | Type | Source |
|------|------|--------|
| `venn-9a-set-edwards.svg` | Edwards construction | Edwards, 1996 |

## Publications

| File | Reference |
|------|-----------|
| `Venn-1880.pdf` | Venn, J. (1880). *On the Diagrammatic and Mechanical Representation of Propositions and Reasonings.* |
| `Grunbaum-1984.pdf` | Grunbaum, B. (1984). *The construction of Venn diagrams.* |
| `Grunbaum-1992.pdf` | Grunbaum, B. (1992). *Venn diagrams and independent families of sets.* |
| `Anderson-1988.pdf` | Anderson, I. (1988). *Combinatorics of Finite Sets.* |
| `Anderson-and-Cleaver-1965.pdf` | Anderson, I. & Cleaver (1965). *Venn type diagrams for arguments of n terms.* |
| `Edwards-1996.pdf` | Edwards, A.W.F. (1996). *Seven-set Venn diagrams with rotational and polar symmetry.* |
| `Caroll-2000.pdf` | Carroll, C. (2000). *Venn diagrams using convex polygons.* |
| `Mamakani-et-al-2012.pdf` | Mamakani, K. et al. (2012). *New roses: simple symmetric Venn diagrams.* |
| `Mamakani-and-Ruskey-2012.pdf` | Mamakani, K. & Ruskey, F. (2012). *A new rose: the first simple symmetric 11-Venn diagram.* |
| `Bannier-and-Bodin-2017.pdf` | Bannier, D. & Bodin, A. (2017). *Venn diagram constructions for higher set counts.* |
| `Griggs-et-al-2004.pdf` | Griggs, J. et al. (2004). *Venn diagrams and symmetric chain decompositions.* |
| `Farrokhi-lecture-2023.pdf` | Farrokhi, M. (2023). *Lecture notes on Venn diagram constructions.* |

## Python Scripts

| Script | Description |
|--------|-------------|
| `generate_region_json.py` | Generate JSON region data from SVG models (Shapely Boolean ops) |
| `svg_rotate_labels.py` | Cyclic label rotation with color & sort support |
| `svg_generate_tests.py` | Generate test SVG files |
| `svg_normalize_after_illustrator.py` | Normalize SVGs after Illustrator export |
| `svg_center_texts.py` | Center text elements in SVGs |

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/ZoliQua/React-Venn-Diagram-Lab.git
cd React-Venn-Diagram-Lab
npm install
```

### Development

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build -> dist/
npm run preview    # Preview production build
npm run test       # Run test suite (vitest)
npm run test:watch # Watch mode
npm run lint       # ESLint
```

### JSON Region Generation

```bash
python generate_region_json.py                     # Generate missing JSONs only
python generate_region_json.py --all               # Regenerate all JSONs
python generate_region_json.py venn-3e-set-rectangles  # Specific diagram
```

Requires Python 3 with `shapely` installed.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 |
| Language | TypeScript 5.9 |
| Build | Vite 8 |
| Testing | Vitest 4 (622 tests) |
| Styling | Custom CSS (dark + light theme) |
| SVG | Native DOM API |
| PDF export | jsPDF (lazy-loaded) |
| Zip / Excel export | jszip + exceljs (lazy-loaded) |
| Region computation | Python + Shapely |

No external UI libraries — pure React + custom CSS. Heavy export libraries (jsPDF, jszip, exceljs) are lazy-loaded on demand so the main bundle stays lean.

## Author

**Zoltan Dul**

## License

MIT — free to use. See SVG file headers for details.
