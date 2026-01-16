# Changelog

All notable changes to the Venn Diagram Lab project.

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
