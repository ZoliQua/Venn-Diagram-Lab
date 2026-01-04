# 🔵🟡🔴 Venn Diagram Lab

Interactive viewer and editor for Venn diagrams — from 2-set to 8-set, covering all known construction methods. Built with React, TypeScript, and Vite.

**Version:** 1.3.0 | **Models:** 32 SVG diagrams | **License:** MIT

## ✨ Features

### Three Modes

| Mode | Description |
|------|-------------|
| **Summary** | Gallery view of all 32 diagrams with SVG previews, grouped by set count, with publication references |
| **View** | Interactive diagram viewer with region detection. Two sub-modes: **Layer** (transparent overlapping shapes) and **Cut** (pre-computed intersection regions from JSON data) |
| **Edit** | Full SVG editor with drag-to-position, text editing, undo/redo, validation, and export |

### View Mode — Layer View
- Load any of the 32 SVG models from the dropdown
- Hover over the diagram to detect which intersection region you're in
- Region detection uses `SVGGeometryElement.isPointInFill()` hit-testing
- Right panel shows: region label, involved sets with colors, intersection expression
- Left panel shows: collapsible region list grouped by depth (Single, 2-way, 3-way, ...)

### View Mode — Cut View
- Renders **pre-computed intersection region paths** (generated via Paper.js Boolean operations)
- Each of the 2ⁿ − 1 regions is a separate SVG `<path>` element with direct mouse events
- Hover highlights the region, dims others, shows white outline and centered label
- Color scheme: dark-to-warm interpolation by intersection depth
- Based on the [nhthn/venn7](https://github.com/nhthn/venn7) approach

### Edit Mode
- Open/Save SVG files
- Drag text elements to reposition
- Double-click to edit text content
- Property panel: position, font size, fill/stroke colors
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
- Grid overlay and validation checker
- Layer tree with visibility toggles
- ViewBox editor

### Summary Mode
- Dialog gallery of all 32 diagrams
- SVG previews rendered inline
- Grouped by set count (2-set through 8-set)
- Source references linked to publication PDFs

## 📂 Project Structure

```
├── 📁 src/                   React + TypeScript source code
│   ├── App.tsx               Main app component (3 modes)
│   ├── version.ts            Version constant
│   ├── models.ts             32-model catalog + fetch utilities
│   ├── 📁 components/        UI components
│   │   ├── Toolbar.tsx       Top bar (mode switcher, zoom, tools)
│   │   ├── Canvas.tsx        SVG rendering + interaction
│   │   ├── CutViewCanvas.tsx Region-based rendering (Cut View)
│   │   ├── ViewerSidebar.tsx Model selector + region list
│   │   ├── ViewerInfoPanel.tsx Region info display
│   │   ├── SummaryDialog.tsx Gallery dialog
│   │   ├── Sidebar.tsx       Editor layer tree
│   │   ├── PropertyPanel.tsx Editor property editor
│   │   └── ...               Other editor components
│   ├── 📁 hooks/             React hooks
│   │   ├── useSvgDocument.ts Document state + undo/redo
│   │   ├── useRegionDetection.ts Hit-testing + label-based detection
│   │   ├── useZoomPan.ts     Zoom & pan
│   │   └── ...
│   ├── 📁 parser/            SVG parser & serializer
│   ├── 📁 utils/             Shared utilities
│   │   ├── hitTest.ts        Shape containment detection
│   │   └── regions.ts        Region enumeration (2^n − 1 subsets)
│   └── 📁 __tests__/         Test suites
├── 📁 models/
│   ├── 📁 svg/               32 SVG Venn diagram models
│   └── 📁 json/              32 JSON pre-computed region data
├── 📁 publications/          Research papers (PDF)
├── 🐍 *.py                   Python utility scripts
├── CHANGELOG.md              Version history
├── VENN-DIAGRAM-SVG.md       SVG format specification
├── VENN_PROJECT.md            Standard color mapping
└── package.json              Node.js project
```

## 🧬 SVG Format

All 32 models use a standardized SVG structure. See [VENN-DIAGRAM-SVG.md](VENN-DIAGRAM-SVG.md) for the full specification.

**Key elements:**
- `<g id="Shapes">` — Shape geometry (`ShapeA`–`ShapeH`)
- `<g id="Group_Values">` — Intersection count labels (`Count_A`, `Count_AB`, ..., `Count_ABCDEFGH`)
- `<g id="Group_Names">` — Set name labels (`NameA`–`NameH`)
- `<g id="Group_CountSums">` — Set total labels

**Region count:** 2ⁿ − 1 (3 for 2-set, 7 for 3-set, 15 for 4-set, ..., 255 for 8-set)

### Standard Color Mapping

| Set | Color | Hex |
|-----|-------|-----|
| A | 🟡 Yellow | `#FFF200` |
| B | 🔵 Blue | `#2E3192` |
| C | 🔴 Red | `#ED1C24` |
| D | ⚪ Grey | `#808285` |
| E | 🟤 Brown | `#3C2415` |
| F | 🟣 Magenta | `#9E1F63` |
| G | 💗 Pink | `#CA4B9B` |
| H | 🩵 Cyan | `#21AED1` |

## 🧬 Diagram Models

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

### 4-Set (15 regions)
| File | Type | Source |
|------|------|--------|
| `venn-4-set.svg` | Classic overlapping ellipses | Venn, 1880 |
| `venn-4a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-4b-set-anderson.svg` | Anderson construction | Anderson, 1988 |
| `venn-4e-set-euler.svg` | Euler diagram variant | Euler |
| `venn-4f-set.svg` | Original Venn construction | Venn, 1880 |

### 5-Set (31 regions)
| File | Type | Source |
|------|------|--------|
| `venn-5-set-grunbaum.svg` | Grünbaum ellipse | Grünbaum, 1984 |
| `venn-5a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-5b-set-anderson.svg` | Anderson construction | Anderson, 1988 |
| `venn-5d-set-bannier.svg` | Bannier–Bodin variant | Bannier & Bodin, 2017 |
| `venn-5e-set.svg` | Organic/freeform | — |
| `venn-5f-set.svg` | Original Venn construction | Venn, 1880 |

### 6-Set (63 regions)
| File | Type | Source |
|------|------|--------|
| `venn-6-set.svg` | SUMO-Venn construction | [SUMO-Venn](https://angiogenesis.dkfz.de/oncoexpress/software/sumo/venn.htm) |
| `venn-6a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-6b-set-anderson.svg` | Anderson construction | Anderson, 1988 |
| `venn-6d-set-bannier.svg` | Bannier–Bodin variant | Bannier & Bodin, 2017 |

### 7-Set (127 regions)
| File | Type | Source |
|------|------|--------|
| `venn-7-set-grunbaum.svg` | Grünbaum construction | Grünbaum, 1992 |
| `venn-7a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-7c-set-adelaide.svg` | Adelaide symmetric | Mamakani et al., 2012 |
| `venn-7d-set-bannier.svg` | Bannier–Bodin variant | Bannier & Bodin, 2017 |
| `venn-7e-set-adelaide.svg` | Adelaide variant | Mamakani et al., 2012 |
| `venn-7e-set-hamilton.svg` | Hamilton variant | Mamakani et al., 2012 |
| `venn-7e-set-manawatu.svg` | Manawatu variant | Mamakani et al., 2012 |
| `venn-7e-set-massey.svg` | Massey variant | Mamakani et al., 2012 |
| `venn-7e-set-palmerston-north.svg` | Palmerston North variant | Mamakani et al., 2012 |
| `venn-7e-set-victoria.svg` | Victoria variant | Mamakani et al., 2012 |

### 8-Set (255 regions)
| File | Type | Source |
|------|------|--------|
| `venn-8-set.svg` | SUMO-Venn construction | [SUMO-Venn](https://angiogenesis.dkfz.de/oncoexpress/software/sumo/venn.htm) |
| `venn-8d-set-bannier.svg` | Bannier–Bodin variant | Bannier & Bodin, 2017 |

## 📚 Publications

| File | Reference |
|------|-----------|
| `Venn-1880.pdf` | Venn, J. (1880). *On the Diagrammatic and Mechanical Representation of Propositions and Reasonings.* |
| `Grunbaum-1984.pdf` | Grünbaum, B. (1984). *The construction of Venn diagrams.* |
| `Grunbaum-1992.pdf` | Grünbaum, B. (1992). *Venn diagrams and independent families of sets.* |
| `Anderson-1988.pdf` | Anderson, I. (1988). *Combinatorics of Finite Sets.* |
| `Edwards-1996.pdf` | Edwards, A.W.F. (1996). *Seven-set Venn diagrams with rotational and polar symmetry.* |
| `Mamakani-et-al-2012.pdf` | Mamakani, K. et al. (2012). *New roses: simple symmetric Venn diagrams.* |
| `Bannier-and-Bodin-2017.pdf` | Bannier, D. & Bodin, A. (2017). *Venn diagram constructions for higher set counts.* |

## 🐍 Python Scripts

| Script | Description |
|--------|-------------|
| `rotate_labels.py` | Cyclic label rotation with color & sort support |
| `generate_region_js.py` | Generate region paths from SVG (Paper.js Boolean ops) |
| `generate_tests.py` | Generate test SVG files |
| `normalize_after_illustrator.py` | Normalize SVGs after Illustrator export |
| `unify_svgs.py` | Unify SVG structure across files |
| `center_texts.py` | Center text elements in SVGs |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/ZoliQua/React-Venn-Diagram-Modul.git
cd React-Venn-Diagram-Analyser/2-venn-diagram
npm install
```

### Development

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm run test       # Run test suite (vitest)
npm run test:watch # Watch mode
npm run lint       # ESLint
```

### Tests

The project includes 342 tests across 4 test suites:

| Suite | Tests | Description |
|-------|-------|-------------|
| `regions.test.ts` | 8 | Region enumeration (2^n − 1 subsets, sorting, labels) |
| `hitTest.test.ts` | 7 | Shape ID parsing, Count ID parsing |
| `models.test.ts` | 5 | Model catalog integrity, SVG/JSON file existence |
| `svgFormat.test.ts` | 322 | SVG format validation across all 32 files (structure, colors, fonts) |

```bash
npm test
# ✓ 4 test files | 342 tests passed
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 |
| Language | TypeScript 5.9 |
| Build | Vite 8 |
| Testing | Vitest 4 |
| Styling | Custom CSS (dark theme) |
| SVG | Native DOM API |

No external UI libraries — pure React + custom CSS.

## 👤 Author

**Zoltán Dul**

## 📄 License

MIT — free to use. See SVG file headers for details.
