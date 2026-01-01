# Changelog

All notable changes to the React Venn Diagram Modifier project.

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
- Initial project setup: CLAUDE.md, README.md
- SVG Venn diagram editor (React + TypeScript + Vite)
- 32 SVG Venn diagram models (2–8 sets)
- Research publications
- Python scripts (generate_tests, normalize_after_illustrator)
- `.gitignore`
