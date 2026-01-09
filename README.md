# Venn Diagram Lab

Interactive viewer and editor for Venn diagrams — from 2-set to 8-set, covering all known construction methods. Built with React, TypeScript, and Vite.

**Version:** 1.7.0 | **Models:** 39 SVG diagrams | **License:** MIT

## Features

### Three Modes

| Mode | Description |
|------|-------------|
| **Summary** | Gallery view of all 39 diagrams with SVG previews, grouped by set count, with publication references |
| **View** | Interactive diagram viewer with region detection. Two sub-modes: **Layer** (transparent overlapping shapes) and **Cut** (pre-computed intersection regions from JSON data) |
| **Edit** | Full SVG editor with drag-to-position, text editing, undo/redo, validation, and export |
| **Data** | Load CSV/TSV data (binary or aggregated), map columns to Venn sets, calculate intersections, export results as TSV |

### View Mode — Layer View
- Load any of the 39 SVG models from the dropdown
- Hover over the diagram to detect which intersection region you're in
- Region detection uses `SVGGeometryElement.isPointInFill()` hit-testing
- Right panel shows: region label, involved sets with colors, intersection expression
- Left panel shows: collapsible region list grouped by depth (Single, 2-way, 3-way, ...)

### View Mode — Cut View
- Renders **pre-computed intersection region paths** (generated via Shapely Boolean operations)
- Each of the 2^n - 1 regions is a separate SVG `<path>` element with direct mouse events
- Hover highlights the region, dims others, shows white outline and centered label
- Two color modes: **Depth** (dark-to-warm by intersection depth) and **Heatmap** (RdBu diverging scale by count values)

### Edit Mode
- Open/Save SVG files
- Drag text elements to reposition
- Double-click to edit text content
- Property panel: position, font size, fill/stroke colors
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
- Grid overlay and validation checker
- Layer tree with visibility toggles
- ViewBox editor

### Data Mode
- Import CSV, TSV, or TXT files via configurable import dialog
- Two data formats: **Binary** (0/1 per cell) and **Aggregated** (item names per column)
- Configurable row/item delimiters, header detection, column selection, row filtering
- Per-set color picker, shape opacity slider, font controls for names and title
- Cut View with **Heatmap** color mode (customizable 3-point color scale + legend position)
- Collapsible sidebar sections (File Info, Model, Column Mapping, View, Export)
- Right panel toggle: **Properties** (region info, items, unlock) / **Statistics** (Jaccard, Dice, enrichment)
- Selected region style: configurable highlight color for hovered/selected count values
- Export: **SVG / PNG / JPG** image export + **Regions Summary TSV** + **Item Matrix TSV**
- Export individual region items via right panel
- Sample datasets: binary (streaming platforms) and aggregated (gene sets)

### Summary Mode
- Dialog gallery of all 39 diagrams
- SVG previews rendered inline
- Grouped by set count (2-set through 8-set)
- Source references linked to publication PDFs

## Project Structure

```
├── src/                       React + TypeScript source code
│   ├── App.tsx                Main app component (3 modes)
│   ├── version.ts             Version constant
│   ├── models.ts              39-model catalog + fetch utilities
│   ├── components/            UI components
│   │   ├── Toolbar.tsx        Top bar (mode switcher, zoom, tools)
│   │   ├── Canvas.tsx         SVG rendering + interaction
│   │   ├── CutViewCanvas.tsx  Region-based rendering (Cut View)
│   │   ├── ViewerSidebar.tsx  Model selector + region list
│   │   ├── ViewerInfoPanel.tsx Region info display
│   │   ├── SummaryDialog.tsx  Gallery dialog + SOURCES table
│   │   ├── Sidebar.tsx        Editor layer tree
│   │   ├── PropertyPanel.tsx  Editor property editor
│   │   └── ...                Other editor components
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
│   │   └── exportData.ts      TSV export (Region Summary + Item Matrix)
│   └── __tests__/             Test suites (443 tests)
├── models/
│   ├── svg/                   39 SVG Venn diagram models
│   └── json/                  39 JSON pre-computed region data
├── publications/              Research papers (PDF)
├── samples/                   Source SVG samples for model generation
├── *.py                       Python utility scripts
├── data/                      Sample datasets (CSV)
├── CHANGELOG.md               Version history
├── VENN-DIAGRAM-SVG-SPECIFICATION.md  SVG format specification
├── VENN-DIGARAM-PROJECT-STRUCTURE.md  Standard color mapping & project info
└── package.json               Node.js project
```

## SVG Format

All 39 models use a standardized SVG structure. See [VENN-DIAGRAM-SVG-SPECIFICATION.md](VENN-DIAGRAM-SVG-SPECIFICATION.md) for the full specification.

**Key elements:**
- `<g id="Shapes">` — Shape geometry (`ShapeA`-`ShapeH`)
- `<g id="Group_Values">` — Intersection count labels (`Count_A`, `Count_AB`, ..., `Count_ABCDEFGH`)
- `<g id="Group_Names">` — Set name labels (`NameA`-`NameH`)
- `<g id="Group_CountSums">` — Set total labels
- `<g id="Group_Bullets">` — Color legend circles

**Region count:** 2^n - 1 (3 for 2-set, 7 for 3-set, 15 for 4-set, ..., 255 for 8-set)

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

## Diagram Models

### 2-Set (3 regions)
| File | Type | Source |
|------|------|--------|
| `venn-2-set.svg` | Classic two-circle | Venn, 1880 |
| `venn-2a-set-edwards.svg` | Edwards construction | Edwards, 1996 |

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
| `venn-7c-set-adelaide.svg` | Adelaide symmetric | Mamakani et al., 2012 |
| `venn-7d-set-bannier.svg` | Bannier-Bodin variant | Bannier & Bodin, 2017 |
| `venn-7e-set-adelaide.svg` | Adelaide variant | Mamakani et al., 2012 |
| `venn-7e-set-hamilton.svg` | Hamilton variant | Mamakani et al., 2012 |
| `venn-7e-set-manawatu.svg` | Manawatu variant | Mamakani et al., 2012 |
| `venn-7e-set-massey.svg` | Massey variant | Mamakani et al., 2012 |
| `venn-7e-set-palmerston-north.svg` | Palmerston North variant | Mamakani et al., 2012 |
| `venn-7e-set-victoria.svg` | Victoria variant | Mamakani et al., 2012 |

### 8-Set (255 regions)
| File | Type | Source |
|------|------|--------|
| `venn-8-set.svg` | SUMO-Venn construction | SUMO-Venn |
| `venn-8d-set-bannier.svg` | Bannier-Bodin variant | Bannier & Bodin, 2017 |

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
| Testing | Vitest 4 |
| Styling | Custom CSS (dark theme) |
| SVG | Native DOM API |
| Region computation | Python + Shapely |

No external UI libraries — pure React + custom CSS.

## Author

**Zoltan Dul**

## License

MIT — free to use. See SVG file headers for details.
