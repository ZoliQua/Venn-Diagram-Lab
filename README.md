# 🔵🟡🔴 Venn Diagram Models & Editor

Create, edit, and visualize Venn diagrams with data — from 2-set to 8-set, covering all known construction methods.

## 📖 A Brief History of Venn Diagrams

**John Venn** introduced his eponymous diagrams in 1880 (*"On the Diagrammatic and Mechanical Representation of Propositions and Reasonings"*), building upon Euler's earlier circle diagrams. While Venn's original work handled up to 4 sets elegantly with circles, the geometric challenge of representing all possible intersections grows exponentially — a diagram with *n* sets must contain exactly 2ⁿ − 1 distinct non-empty regions.

**Branko Grünbaum** (1975, 1984, 1992) proved that convex Venn diagrams exist for all prime *n* and established foundational results on symmetric constructions. His 5-set diagram using ellipses remains one of the most widely used forms.

**Anthony Edwards** (1996) introduced a systematic construction method ("cogwheel" approach) that scales to any number of sets by progressively subdividing regions, producing diagrams sometimes called *Edwards-Venn diagrams*.

**Ian Anderson** extended Edwards' work with alternative constructions for higher-order diagrams, while **Bannier and Bodin** (2017) developed further variants that improve region legibility at 5–8 sets.

For 7-set diagrams, a rich family of rotationally symmetric constructions exists — named after New Zealand cities (*Adelaide*, *Hamilton*, *Massey*, *Victoria*, *Manawatu*, *Palmerston North*) — catalogued by **Mamakani et al.** (2012) and based on the combinatorial properties of symmetric simple Venn diagrams.

## 📂 Project Structure

```
├── 📁 models/          32 SVG Venn diagram models (2–8 sets)
├── 📁 publications/    Research papers and R package sources
├── 📁 editor/          Interactive SVG editor (React + TypeScript + Vite)
└── 🐍 *.py             Python utility scripts
```

## 🧬 Diagram Models (`models/`)

All models use a standardized SVG structure with consistent element IDs (`ShapeA`–`ShapeH`, `Count_*`, `NameA`–`NameH`, `CountSUM_*`) and a uniform color scheme.

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

### 2-Set Diagrams (3 regions)

| File | Type | Source |
|------|------|--------|
| `venn-2-set.svg` | Classic two-circle | Venn, 1880 |
| `venn-2a-set-edwards.svg` | Edwards construction | Edwards, 1996 |

### 3-Set Diagrams (7 regions)

| File | Type | Source |
|------|------|--------|
| `venn-3-set.svg` | Classic three-circle | Venn, 1880 |
| `venn-3a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-3b-set-anderson.svg` | Anderson construction | Anderson, 1988 |

### 4-Set Diagrams (15 regions)

| File | Type | Source |
|------|------|--------|
| `venn-4-set.svg` | Classic overlapping ellipses | Venn, 1880 |
| `venn-4a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-4b-set-anderson.svg` | Anderson construction | Anderson, 1988 |
| `venn-4e-set-euler.svg` | Euler diagram variant | Euler |
| `venn-4f-set.svg` | Original Venn construction | Venn, 1880 |

### 5-Set Diagrams (31 regions)

| File | Type | Source |
|------|------|--------|
| `venn-5-set-grunbaum.svg` | Grünbaum ellipse | Grünbaum, 1984 |
| `venn-5a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-5b-set-anderson.svg` | Anderson construction | Anderson, 1988 |
| `venn-5d-set-bannier.svg` | Bannier–Bodin variant | Bannier & Bodin, 2017 |
| `venn-5e-set.svg` | Organic/freeform | — |
| `venn-5f-set.svg` | Original Venn construction | Venn, 1880 |

### 6-Set Diagrams (63 regions)

| File | Type | Source |
|------|------|--------|
| `venn-6-set.svg` | SUMO-Venn construction | [SUMO-Venn](https://angiogenesis.dkfz.de/oncoexpress/software/sumo/venn.htm) |
| `venn-6a-set-edwards.svg` | Edwards construction | Edwards, 1996 |
| `venn-6b-set-anderson.svg` | Anderson construction | Anderson, 1988 |
| `venn-6d-set-bannier.svg` | Bannier–Bodin variant | Bannier & Bodin, 2017 |

### 7-Set Diagrams (127 regions)

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

### 8-Set Diagrams (255 regions)

| File | Type | Source |
|------|------|--------|
| `venn-8-set.svg` | SUMO-Venn construction | [SUMO-Venn](https://angiogenesis.dkfz.de/oncoexpress/software/sumo/venn.htm) |
| `venn-8d-set-bannier.svg` | Bannier–Bodin variant | Bannier & Bodin, 2017 |

## 📚 Publications (`publications/`)

Research papers included in this repository:

| File | Reference |
|------|-----------|
| `Venn-1880.pdf` | Venn, J. (1880). *On the Diagrammatic and Mechanical Representation of Propositions and Reasonings.* |
| `Grunbaum-1984.pdf` | Grünbaum, B. (1984). *The construction of Venn diagrams.* |
| `Grunbaum-1992.pdf` | Grünbaum, B. (1992). *Venn diagrams and independent families of sets.* |
| `Anderson-and-Cleaver-1965.pdf` | Anderson, I. & Cleaver, F. (1965). *Venn type diagrams for arguments of n terms.* |
| `Anderson-1988.pdf` | Anderson, I. (1988). *Combinatorics of Finite Sets* — Venn diagram constructions. |
| `Edwards-1996.pdf` | Edwards, A.W.F. (1996). *Seven-set Venn diagrams with rotational and polar symmetry.* |
| `Griggs-et-al-2004.pdf` | Griggs, J. et al. (2004). *Venn diagrams and symmetric chain decompositions.* |
| `Mamakani-et-al-2012.pdf` | Mamakani, K. et al. (2012). *New roses: simple symmetric Venn diagrams with 11 and 13 curves.* |
| `Bannier-and-Bodin-2017.pdf` | Bannier, D. & Bodin, A. (2017). *Venn diagram constructions for higher set counts.* |
| `Farrokhi-lecture-2023.pdf` | Farrokhi, M. (2023). *Lecture notes on Venn diagrams.* |
| `venn_1.11.tar.gz` | R `venn` package v1.11 source |
| `venn_1.12.tar.gz` | R `venn` package v1.12 source |

## 🐍 Python Scripts

| Script | Description |
|--------|-------------|
| `rotate_labels.py` | Cyclic label rotation with color & sort support |
| `generate_tests.py` | Generate test SVG files |
| `normalize_after_illustrator.py` | Normalize SVGs after Illustrator export |
| `unify_svgs.py` | Unify SVG structure across files |
| `center_texts.py` | Center text elements in SVGs |
| `transform_7setc.py` | Transform 7-set Venn diagram variants |
| `fix_edwards_shapes.py` | Fix Edwards Venn diagram shapes |

## ✏️ Editor

Interactive SVG Venn diagram editor built with React + TypeScript + Vite.

```bash
cd editor
npm install
npm run dev
```

## 👤 Author

**Zoltán Dul**

## 📄 License

MIT — free to use. See author comment in SVG files for details.
