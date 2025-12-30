# Venn Diagram SVG Format Specification

Version: 3.0.0

This document describes the standardized SVG format used by all Venn diagram models in this project. Every SVG file in `models/svg/` follows this structure.

## File Structure

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- Created by Zoltan Dul in 2026 - free to use with MIT license. ... -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 700">

  <g id="Shapes">          <!-- Shape geometry -->
  </g>

  <g id="Texts">           <!-- All text elements -->
    <g id="Header">         <!-- Diagram title -->
    </g>
    <g id="Group_Names">    <!-- Set name labels -->
    </g>
    <g id="Group_Values">   <!-- Intersection count labels -->
    </g>
    <g id="Group_CountSums"> <!-- Set total count labels -->
    </g>
  </g>

  <g id="Group_Bullets">    <!-- Color legend dots -->
  </g>

</svg>
```

## Groups

### `Shapes` (required)

Contains the geometric shapes defining the Venn diagram sets.

| Element | ID Pattern | Tag | Description |
|---------|-----------|-----|-------------|
| Shape | `ShapeA`–`ShapeH` | `<path>`, `<circle>`, or `<ellipse>` | Set boundary, alphabetically ordered |

**Style attributes:**
- `opacity: 0.2` — semi-transparent fill
- `fill: #HEX` — standard color (see Color Mapping below)
- `stroke: #000000` — black outline
- `stroke-width: 2` or `3`
- `stroke-miterlimit: 10`

### `Texts` > `Header` (optional)

| Element | ID | Description |
|---------|------|-------------|
| Title | `Title` | Diagram title text (e.g., "Venn 5-set diagram") |

**Style:** `fill:#262262; font-family:'Tahoma'; font-size:14`

### `Texts` > `Group_Names` (required)

Set name labels positioned near each shape.

| Element | ID Pattern | Content | Description |
|---------|-----------|---------|-------------|
| Name | `NameA`–`NameH` | Default: `NameA`, `NameB`, ... | User-replaceable set labels |

**Style:** `fill:#262262; font-family:'Tahoma'; font-size:30`

### `Texts` > `Group_Values` (required)

Intersection region labels. Every non-empty subset of sets has a corresponding text element.

| Element | ID Pattern | Content | Description |
|---------|-----------|---------|-------------|
| Single | `Count_A`, `Count_B`, ... | `A`, `B`, ... | Single-set exclusive region |
| Pair | `Count_AB`, `Count_AC`, ... | `AB`, `AC`, ... | 2-way intersection |
| Triple | `Count_ABC`, `Count_ABD`, ... | `ABC`, `ABD`, ... | 3-way intersection |
| ... | ... | ... | Up to N-way |
| Full | `Count_ABCDE...` | `ABCDE...` | All-sets intersection |

**Count formula:** For an N-set diagram, there are **2^N − 1** Count elements.

| N-set | Count elements |
|-------|---------------|
| 2 | 3 |
| 3 | 7 |
| 4 | 15 |
| 5 | 31 |
| 6 | 63 |
| 7 | 127 |
| 8 | 255 |

**ID rules:**
- Letters are always UPPERCASE and alphabetically sorted: `Count_ABD` (not `Count_BDA`)
- The full intersection (all N sets) has `fill:#FFFFFF` (white text)
- All others have `fill:#262262` (dark blue)

**Style:** `font-family:'Tahoma'; text-anchor:middle`
- Font size varies by region complexity (larger for single sets, smaller for higher-order intersections)

### `Texts` > `Group_CountSums` (required)

Total count labels for each set, positioned near the set name.

| Element | ID Pattern | Content | Description |
|---------|-----------|---------|-------------|
| Sum | `CountSUM_A`–`CountSUM_H` | Default: `CountSUM_A`, ... | User-replaceable total labels |

**Style:** `fill:#262262; font-family:'Tahoma'; font-size:18; text-anchor:middle`

### `Group_Bullets` (optional)

Color legend circles, typically hidden (`display:none` on the group).

| Element | ID Pattern | Description |
|---------|-----------|-------------|
| Bullet | `BulletA`–`BulletH` | Small colored circle (r=6.9) |

**Style:** `opacity:0.2; fill:#HEX; stroke:#010101; stroke-width:2`

## Standard Color Mapping

Every shape letter has a fixed color, consistent across all files:

| Set | Hex | Color | CSS |
|-----|-----|-------|-----|
| A | `#FFF200` | Yellow | `fill:#FFF200` |
| B | `#2E3192` | Blue | `fill:#2E3192` |
| C | `#ED1C24` | Red | `fill:#ED1C24` |
| D | `#808285` | Grey | `fill:#808285` |
| E | `#3C2415` | Brown | `fill:#3C2415` |
| F | `#9E1F63` | Magenta | `fill:#9E1F63` |
| G | `#CA4B9B` | Pink | `fill:#CA4B9B` |
| H | `#21AED1` | Cyan | `fill:#21AED1` |

## Positioning

- All text elements use `transform="matrix(1 0 0 1 X Y)"` for positioning
- Non-identity matrices (rotation, scaling) are preserved in `transformExtra`
- Coordinates are in SVG user-space (typically 0–700 for both axes)

## ViewBox

Most diagrams use `viewBox="0 0 700 700"`. Exceptions:
- 7-set Grünbaum variants: `viewBox="0 0 930 850"`
- 8-set: `viewBox="0 0 1400 1400"`

## Author Comment

Every file includes this XML comment after the XML declaration:
```xml
<!-- Created by Zoltan Dul in 2026 - free to use with MIT license.
     Part of React Venn Diagram Analyzer -
     https://github.com/ZoliQua/React-Venn-Diagram-Analyser -
     SVG Version: 3.0.0 -->
```

## JSON Region Data (`models/json/`)

Pre-computed intersection region paths for the Cut View. Generated by `generate_region_js.py`.

```json
{
  "name": "Venn 3-set diagram",
  "n": 3,
  "sets": ["A", "B", "C"],
  "curves": ["<path d>", ...],
  "regions": ["", "<path d>", ...],
  "colors": { "A": "#FFF200", ... },
  "region_labels": { "A": [x, y], "AB": [x, y], ... },
  "set_names": { "A": "NameA", ... }
}
```

| Field | Description |
|-------|-------------|
| `name` | Diagram display name |
| `n` | Number of sets |
| `sets` | Array of set letters |
| `curves` | SVG path data for each shape boundary (origin-centered coordinates) |
| `regions` | SVG path data for each exclusive region (index = bitmask, `regions[0]` = empty) |
| `colors` | Standard color mapping per set letter |
| `region_labels` | Label positions (pixel coordinates, transformed via `(x-400)/7, (y-400)/7`) |
| `set_names` | Set name labels from the SVG |

**Region indexing:** Region index is a bitmask where bit `i` = set `i` is included.
- `regions[1]` = A only (bit 0)
- `regions[2]` = B only (bit 1)
- `regions[3]` = A ∩ B (bits 0+1)
- `regions[7]` = A ∩ B ∩ C (bits 0+1+2)

## Validation Rules

1. Every file must have exactly N Shape elements (ShapeA through ShapeN)
2. Every file must have exactly 2^N − 1 Count elements
3. Every file must have exactly N Name and CountSUM elements
4. Count element IDs must have alphabetically sorted letters
5. Shape colors must match the standard color mapping
6. The full intersection Count element must have white fill (#FFFFFF)
