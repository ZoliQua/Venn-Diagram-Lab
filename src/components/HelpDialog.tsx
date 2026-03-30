import type { AppMode } from '../App.tsx';
import { METHODS_HELP } from './methodsHelpContent.ts';

interface HelpDialogProps {
  isOpen: boolean;
  mode: AppMode;
  onClose: () => void;
}

interface HelpItem {
  content: string;
}

interface HelpGroup {
  heading: string;
  items?: HelpItem[];
  subgroups?: { heading: string; items: HelpItem[] }[];
}

interface HelpPage {
  title: string;
  groups: HelpGroup[];
}

const HELP: Record<AppMode, HelpPage> = {
  view: {
    title: 'View Mode — Help',
    groups: [
      {
        heading: 'Overview',
        items: [
          { content: 'Browse and explore 44 pre-built Venn diagram SVG models, from 2-set to 9-set, covering constructions by Venn (1880), Edwards (1996), Anderson (1988), Grünbaum (1984, 1992), Bannier & Bodin (2017), Mamakani et al. (2012), and Carroll (2000).' },
          { content: 'When no model is selected, the full model gallery is shown. Click any diagram card to load it.' },
        ],
      },
      {
        heading: 'Diagram Navigation',
        subgroups: [
          {
            heading: 'Model Selection',
            items: [
              { content: 'Once a model is loaded, the left sidebar shows a dropdown to switch between models, grouped by set count (2–9).' },
              { content: 'Below the dropdown, all regions are listed by depth (Single, 2-way, 3-way, etc.). Click a region name to highlight it.' },
            ],
          },
          {
            heading: 'Zoom & Pan',
            items: [
              { content: 'Use +/- buttons, mouse scroll wheel (Ctrl+Scroll), or keyboard arrows. The 1:1 button resets to 100%.' },
            ],
          },
        ],
      },
      {
        heading: 'View Modes',
        subgroups: [
          {
            heading: 'Layer View',
            items: [
              { content: 'Default view. Shows the original SVG with semi-transparent overlapping shapes.' },
              { content: 'Hover over any point to detect which intersection region you are in using isPointInFill() hit-testing.' },
              { content: 'The right panel shows region details: label, involved sets with color dots, intersection expression, and count value.' },
            ],
          },
          {
            heading: 'Cut View',
            items: [
              { content: 'Renders pre-computed intersection region paths (generated via Shapely Boolean operations).' },
              { content: 'Each of the 2^n - 1 regions is a separate clickable SVG path element.' },
              { content: 'Hover highlights the region, dims others, shows a white outline and a centered label.' },
              { content: 'Two color modes: Depth (dark-to-warm by intersection depth) and Heatmap (3-point diverging scale).' },
              { content: 'Dark/White background toggle available.' },
            ],
          },
          {
            heading: 'UpSet Plot',
            items: [
              { content: 'UpSet plot visualization showing intersection sizes as vertical bars above a dot matrix.' },
              { content: 'Horizontal set size bars on the left. Hover highlights + tooltip with set names and count.' },
              { content: 'Sort by intersection size (descending) or by degree (number of member sets).' },
              { content: 'Color modes: Depth, Heatmap, or Custom single color. Adjustable minimum count threshold.' },
              { content: 'Pagination: top 50 intersections shown, prev/next page controls. Dark/White background toggle.' },
            ],
          },
          {
            heading: 'Network View',
            items: [
              { content: 'Force-directed network graph of pairwise set relationships.' },
              { content: 'Nodes sized by set cardinality, colored by standard Venn colors. Draggable (Move Nodes ON by default).' },
              { content: 'Edges weighted by: intersection count, Jaccard index, Fold Enrichment, or Overlap Coefficient.' },
              { content: 'Significance coloring: green (FDR<0.05), grey (not significant), red (under-represented).' },
              { content: 'Click node to select set region; click edge to select intersection region in right panel.' },
              { content: 'Filters: significant edges only toggle, minimum weight slider. Dark/White background toggle.' },
            ],
          },
        ],
      },
      {
        heading: 'Region Interaction',
        items: [
          { content: 'Hover: the right panel shows region info in real-time.' },
          { content: 'Click: locks the panel on that region (LOCKED badge appears). Click another region to switch.' },
          { content: 'Click on empty background (outside shapes) to unlock. The Unlock button also clears the selection.' },
          { content: 'Selection clears automatically when switching between Layer/Cut/UpSet/Network views.' },
        ],
      },
      {
        heading: 'About Venn Diagrams',
        items: [
          { content: 'Click "About Venn Diagrams" on the welcome screen to open an educational dialog with the history, formal definition, and later mathematical development of Venn diagrams, including source-backed references.' },
        ],
      },
      {
        heading: 'Theme',
        items: [
          { content: 'Click the sun/moon button (☀/☾) in the toolbar to toggle between dark and light mode. Preference is saved to localStorage.' },
        ],
      },
      {
        heading: 'Summary & Credits',
        items: [
          { content: 'Click "List all Venn Diagram Models" on the welcome screen or the ☰ icon in the toolbar to open the full gallery with SVG previews, grouped by set count, with source publication links.' },
          { content: 'Click "Credits" on the welcome screen to see the authors with profile photos and affiliations.' },
        ],
      },
    ],
  },
  edit: {
    title: 'Edit Mode — Help',
    groups: [
      {
        heading: 'Overview',
        items: [
          { content: 'Full SVG editor for Venn diagrams. Open built-in models or custom SVG files, manipulate shapes and text elements, and export.' },
          { content: 'All changes are tracked with undo/redo history. The MODIFIED badge indicates unsaved changes.' },
        ],
      },
      {
        heading: 'Opening Files',
        items: [
          { content: 'Click "Open" in the toolbar to browse the 44 built-in models, or click "Open Custom SVG" to load your own file.' },
          { content: 'Custom files are validated against the Venn SVG specification. A validation dialog reports any issues.' },
        ],
      },
      {
        heading: 'Shape Tools',
        subgroups: [
          {
            heading: 'Move',
            items: [{ content: 'Drag any shape (ShapeA–I) or bullet (BulletA–I) to reposition. Updates the transform attribute with translate().' }],
          },
          {
            heading: 'Rotate',
            items: [{ content: 'Drag on a shape to rotate it around its center. A tooltip shows the angle (e.g. +45.3°). Cursor changes to grab.' }],
          },
          {
            heading: 'Resize',
            items: [{ content: 'Drag on a shape to scale from its center. Moving away enlarges, toward shrinks. Tooltip shows percentage (e.g. 120%).' }],
          },
        ],
      },
      {
        heading: 'Text Tools',
        subgroups: [
          {
            heading: 'Move (default)',
            items: [{ content: 'Drag text elements to reposition. A 0.5px threshold prevents accidental moves from clicks.' }],
          },
          {
            heading: 'Rotate',
            items: [{ content: 'Drag horizontally to rotate text around its visual center. 1 pixel = 1 degree. Tooltip shows angle.' }],
          },
          {
            heading: 'Resize',
            items: [{ content: 'Drag vertically to change font size. Up = larger, down = smaller. 10px = 1pt. Tooltip shows size in pixels.' }],
          },
        ],
      },
      {
        heading: 'Editing',
        subgroups: [
          {
            heading: 'Selection & Content',
            items: [
              { content: 'Click any element to select it. Double-click text to edit content. Press Escape to deselect.' },
              { content: 'The right Property panel shows position, font size, font family, text anchor, fill/stroke colors.' },
            ],
          },
          {
            heading: 'Undo / Redo',
            items: [{ content: 'Ctrl+Z to undo, Ctrl+Shift+Z or Ctrl+Y to redo. Up to 50 history steps. Ctrl+S to save.' }],
          },
          {
            heading: 'Grid & Validation',
            items: [
              { content: 'Grid: 50×50 overlay for precise positioning. Validate: highlights Count texts in wrong positions.' },
              { content: 'Report: detailed validation table of all elements.' },
            ],
          },
        ],
      },
      {
        heading: 'Left Sidebar',
        subgroups: [
          {
            heading: 'File Info',
            items: [{ content: 'Filename, Venn type, form. Save and Restore buttons. MODIFIED badge when unsaved changes exist.' }],
          },
          {
            heading: 'Layer Tree',
            items: [{ content: 'All SVG elements by group: Shapes, Header, Names, Values, Sums, Bullets. Toggle visibility, reorder, add/remove.' }],
          },
          {
            heading: 'Region Statistics',
            items: [{ content: 'Expected vs. found regions by character length. Add missing count texts.' }],
          },
        ],
      },
    ],
  },
  data: {
    title: 'Data Mode — Help',
    groups: [
      {
        heading: 'Overview',
        items: [
          { content: 'Load data, map columns to Venn diagram sets (up to 9), and visualize results with Layer, Cut, UpSet, and Network views.' },
          { content: 'Supports CSV, TSV, TXT, GMT, and GMX formats in Binary (0/1) or Aggregated (item names) mode.' },
          { content: 'Includes statistical analysis: Jaccard, Dice, hypergeometric enrichment, and PDF report generation.' },
        ],
      },
      {
        heading: 'Data Import',
        subgroups: [
          {
            heading: 'Four Import Methods',
            items: [
              { content: 'Load Sample Data: choose from 5 curated datasets (3 real biological + 2 mock test datasets).' },
              { content: 'Upload Custom File: CSV, TSV, TXT, GMT, or GMX format with configurable import options.' },
              { content: 'Paste Lists: paste gene/item lists into 2–9 textareas with per-set names and delimiter auto-detect.' },
              { content: 'Load from URL: fetch data from any HTTP/HTTPS URL with 5-step validation, preview, and CORS handling.' },
            ],
          },
          {
            heading: 'Import Dialog',
            items: [
              { content: '1. File Type — Binary (0/1) or Aggregated (item names per column).' },
              { content: '2. Delimiters — Row delimiter (comma/semicolon/tab/space) + item delimiter for aggregated mode.' },
              { content: '3. Header — Toggle first row as header; custom name inputs when off.' },
              { content: '4. Data Columns — Select All/Deselect All, checkbox per column, 5-row preview table.' },
              { content: '5. Data Rows — Import All or Selected (row numbers + skip rows, supports ranges like 1,3,5-10).' },
            ],
          },
          {
            heading: 'Data Formats',
            items: [
              { content: 'Binary: each row = an item, selected columns have 0/1 values.' },
              { content: 'Aggregated: each column = a set with item names. Items in multiple columns create intersections.' },
              { content: 'GMT (Gene Matrix Transposed): each row = one gene set (tab-delimited). Auto-detected from .gmt extension.' },
              { content: 'GMX (Gene Matrix): each column = one gene set (tab-delimited). Auto-detected from .gmx extension.' },
            ],
          },
        ],
      },
      {
        heading: 'Model Selection',
        subgroups: [
          {
            heading: 'Model Browser',
            items: [
              { content: 'After loading data, a visual model browser shows compatible diagrams filtered by your set count.' },
              { content: 'Click any model card to select it — calculation starts automatically.' },
            ],
          },
          {
            heading: 'Area-Proportional Models',
            items: [
              { content: 'For 2–3 sets: a special "Area-Proportional" computed model (COMPUTED badge) where circle sizes match your data.' },
              { content: 'Available both in the model browser and in the sidebar dropdown.' },
              { content: 'Proportional Accuracy display in sidebar: pairwise percentages and overall accuracy. Warning if <80%.' },
              { content: 'For 4+ sets: auto-switches to a standard fixed model with a notification.' },
            ],
          },
          {
            heading: 'Sidebar Dropdown',
            items: [
              { content: 'The "2. VENN DIAGRAM MODEL" dropdown lets you switch models after initial selection.' },
              { content: 'Includes area-proportional options for 2–3 sets at the top of the list.' },
            ],
          },
        ],
      },
      {
        heading: 'Column Mapping & Calculation',
        items: [
          { content: '3. COLUMN MAPPING: map columns to sets A–I with color pickers and dropdowns. Names trimmed to 32 characters.' },
          { content: 'Shape and bullet opacity slider (synced).' },
          { content: 'Calculation is automatic: triggers on model selection and column changes. No manual Calculate button needed.' },
          { content: 'Long set names (>8 characters) automatically reduce the name font size to 14px.' },
          { content: 'Move Names / Move Numbers: drag text labels to reposition them on the diagram. Use Ctrl+Z to undo moves.' },
          { content: 'Reset to Defaults: button at the bottom of the View section restores all visual settings (fonts, colors, opacity) to their original values.' },
        ],
      },
      {
        heading: '4. View Options',
        subgroups: [
          {
            heading: 'Layer / Cut / UpSet / Network',
            items: [
              { content: 'Four visualization modes available after calculation. Each has its own settings panel.' },
              { content: 'Layer: transparent overlapping shapes. Cut: pre-computed colored regions.' },
              { content: 'UpSet: matrix dot plot with bars. Network: force-directed graph with draggable nodes.' },
            ],
          },
          {
            heading: 'Cut View Settings',
            items: [
              { content: 'Color mode: Depth or Heatmap (customizable 3-point color scale + legend position).' },
              { content: 'Dark/White background toggle.' },
            ],
          },
          {
            heading: 'UpSet Settings',
            items: [
              { content: 'Sort by size or degree. Color mode: Depth, Heatmap, or Custom. Min. count threshold slider.' },
              { content: 'Dark/White background toggle.' },
            ],
          },
          {
            heading: 'Network Settings',
            items: [
              { content: 'Edge weight: Count, Jaccard, Fold Enrichment, or Overlap Coefficient.' },
              { content: 'Filter: Significant only (FDR<0.05). Show/hide: Edge values, Node sizes. Min. edge weight slider.' },
              { content: 'Move Nodes toggle (ON by default). Dark/White background toggle.' },
            ],
          },
          {
            heading: 'Layer View Settings',
            items: [
              { content: 'Show/hide Names and SUM Numbers. Adjust font size (8–48px) and font family.' },
              { content: 'Diagram Title: show/hide, font size, font family.' },
              { content: 'Selected region style: configurable highlight color.' },
            ],
          },
        ],
      },
      {
        heading: 'Right Panel',
        subgroups: [
          {
            heading: 'Find Item (Global Search)',
            items: [
              { content: 'Collapsible search bar at the top — searches across all regions for a gene/item name.' },
              { content: 'Shows matching regions with color dots, set names, match count, and up to 5 matching items with highlighted text.' },
              { content: 'Click a result to navigate to that region on the diagram.' },
            ],
          },
          {
            heading: 'Properties',
            items: [
              { content: 'Region info: label, sets, expression, value. Exclusive and inclusive item lists.' },
              { content: 'In-region filter: search bar appears when >10 items, filters with highlighted matches.' },
              { content: 'Save SVG and Unlock buttons. Export Region Items for selected region.' },
            ],
          },
          {
            heading: 'Statistics',
            items: [
              { content: 'Overview: total items, sets, regions, core intersection, largest exclusive, empty regions.' },
              { content: 'Set Sizes: table sorted by size descending with percentages.' },
              { content: 'Pairwise Jaccard Index: intersection, union, Jaccard, Overlap Coefficient. Color-coded.' },
              { content: 'Sorensen-Dice Index: Dice coefficient for each pair.' },
              { content: 'Intersection Enrichment: hypergeometric test, fold enrichment, p-value, FDR (Benjamini-Hochberg). Significance markers.' },
              { content: 'Enrichment Plots: bar, lollipop and heatmap visualisations of the hypergeometric FDR (or Fold Enrichment) across all pairs. Per-plot SVG export.' },
              { content: 'Export Statistics (TSV): all pairwise statistics in one file.' },
            ],
          },
        ],
      },
      {
        heading: '5. Export',
        items: [
          { content: 'SVG: exports the currently active view (Layer, Cut, UpSet, or Network diagram).' },
          { content: 'PNG / JPG: diagram export at 2× retina quality with white background.' },
          { content: 'Regions Summary (TSV): all 2^n-1 regions with counts, percentages, and item lists.' },
          { content: 'Item Matrix (TSV): per-item binary membership table with region labels.' },
          { content: 'Report (PDF): multi-page A4 report with data overview, pie chart, set sizes table, Venn diagram, UpSet plot, Network diagram, statistics tables, and methodology explanations.' },
          { content: 'All TSV files are BOM-prefixed UTF-8 for Excel compatibility.' },
        ],
      },
      {
        heading: 'Toolbar',
        items: [
          { content: 'Open: dialog with Load Sample Data, Upload Custom File, Paste Lists, Load from URL.' },
          { content: 'Save: downloads diagram as SVG with calculated data (active view).' },
          { content: 'Close: resets all data and returns to empty starting state.' },
          { content: 'Report: generates and downloads a multi-page PDF report (requires calculated data).' },
          { content: 'Theme: sun/moon button toggles dark/light mode. Preference is saved.' },
        ],
      },
    ],
  },
};

export function HelpDialog({ isOpen, mode, onClose }: HelpDialogProps) {
  if (!isOpen) return null;
  const help = HELP[mode];

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="help-dialog" onClick={e => e.stopPropagation()}>
        <div className="help-header">
          <h2 className="help-title">{help.title}</h2>
          <button className="btn btn-toolbar" onClick={onClose}>Close</button>
        </div>
        <div className="help-content">
          {help.groups.map((group, gi) => (
            <div key={gi} className="help-group">
              <h3 className="help-heading">{group.heading}</h3>
              {group.items?.map((item, ii) => (
                <p key={ii} className="help-text">{item.content}</p>
              ))}
              {group.subgroups?.map((sub, si) => (
                <div key={si} className="help-subgroup">
                  <h4 className="help-subheading">{sub.heading}</h4>
                  {sub.items.map((item, ii) => (
                    <p key={ii} className="help-text">{item.content}</p>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {mode !== 'edit' && (
            <div className="help-group">
              <h3 className="help-heading">Statistical Methods</h3>
              <p className="help-text">
                Venn Diagram Lab computes the following similarity and enrichment measures for every pair of sets in Data mode.
                The same values are included in the exported TSV statistics and the PDF report.
              </p>
              {METHODS_HELP.map(method => (
                <div key={method.id} className="help-method-entry">
                  <h4 className="help-subheading">{method.name}</h4>
                  <code className="help-formula">{method.formula}</code>
                  <p className="help-text">{method.description}</p>
                  {method.range && <p className="help-text help-range">Range: {method.range}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
