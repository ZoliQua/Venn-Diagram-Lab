# Changelog

All notable changes to the Venn Diagram Lab project.

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
- Initial project setup: CLAUDE.md, README.md
- SVG Venn diagram editor (React + TypeScript + Vite)
- 32 SVG Venn diagram models (2–8 sets)
- Research publications
- Python scripts (generate_tests, normalize_after_illustrator)
- `.gitignore`
