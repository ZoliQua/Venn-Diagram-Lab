import type { AppMode } from '../App.tsx';

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
          { content: 'Browse and explore 39 pre-built Venn diagram SVG models, from 2-set to 8-set, covering constructions by Venn (1880), Edwards (1996), Anderson (1988), Grünbaum (1984, 1992), Bannier & Bodin (2017), Mamakani et al. (2012), and Carroll (2000).' },
          { content: 'When no model is selected, the full model gallery is shown. Click any diagram card to load it.' },
        ],
      },
      {
        heading: 'Diagram Navigation',
        subgroups: [
          {
            heading: 'Model Selection',
            items: [
              { content: 'Once a model is loaded, the left sidebar shows a dropdown to switch between models, grouped by set count (2–8).' },
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
        ],
      },
      {
        heading: 'Summary',
        items: [
          { content: 'Click the ☰ icon in the toolbar to open the Summary dialog showing all 39 models with SVG previews, grouped by set count, with links to source publications.' },
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
          { content: 'Click "Open" in the toolbar to browse the 39 built-in models, or click "Open Custom SVG" to load your own file.' },
          { content: 'Custom files are validated against the Venn SVG specification. A validation dialog reports any issues.' },
        ],
      },
      {
        heading: 'Shape Tools',
        subgroups: [
          {
            heading: 'Move',
            items: [{ content: 'Drag any shape (ShapeA–H) or bullet (BulletA–H) to reposition. Updates the transform attribute with translate().' }],
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
          { content: 'Load tabular data (CSV, TSV, or TXT), map columns to Venn diagram sets, calculate intersection counts, and visualize results.' },
          { content: 'Supports Binary (0/1 per cell) and Aggregated (item names per column) formats.' },
          { content: 'Includes statistical analysis: Jaccard, Dice, hypergeometric enrichment, and data export.' },
        ],
      },
      {
        heading: 'Data Import',
        subgroups: [
          {
            heading: 'Getting Started',
            items: [{ content: 'Click "Load Sample Data" for a demo or "Upload Custom File" for your own data. Use the Open button in the toolbar.' }],
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
              { content: 'Binary: each row = an item, selected columns have 0/1 values. Program counts items per intersection region.' },
              { content: 'Aggregated: each column = a set with item names. Items in multiple columns create intersections.' },
            ],
          },
        ],
      },
      {
        heading: 'Sidebar Sections',
        subgroups: [
          {
            heading: '1. File Info',
            items: [{ content: 'Filename, format, column/row count. Download File button. All sections are collapsible.' }],
          },
          {
            heading: '2. Venn Diagram Model',
            items: [{ content: 'Select model (2-set to 8-set). Shows Venn type, form, and region count. Switching models preserves column mapping.' }],
          },
          {
            heading: '3. Column Mapping',
            items: [{ content: 'Map columns to sets A–H with color pickers and dropdowns. Shape opacity slider. Calculate button.' }],
          },
        ],
      },
      {
        heading: '4. View Options',
        subgroups: [
          {
            heading: 'Layer / Cut View',
            items: [{ content: 'Layer: transparent overlapping shapes with count labels. Cut: pre-computed intersection region paths.' }],
          },
          {
            heading: 'Heatmap (Cut View)',
            items: [
              { content: 'Depth: colors by intersection depth. Heatmap: RdBu diverging scale by count values.' },
              { content: 'Customize 3 color anchor points (Low, Mid, High) and legend position (4 corners).' },
            ],
          },
          {
            heading: 'Group Names & Numbers',
            items: [{ content: 'Show/hide Names and SUM Numbers. Adjust font size (8–48px) and font family.' }],
          },
          {
            heading: 'Diagram Title',
            items: [{ content: 'Show/hide title. Adjust font size and font family independently.' }],
          },
          {
            heading: 'Selected Region Style',
            items: [{ content: 'Change the highlight color for hovered/selected count values on the diagram.' }],
          },
        ],
      },
      {
        heading: 'Right Panel',
        subgroups: [
          {
            heading: 'Properties',
            items: [
              { content: 'Region info: label, sets, expression, value. Exclusive and inclusive item lists.' },
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
              { content: 'Export Statistics (TSV): all pairwise statistics in one file.' },
            ],
          },
        ],
      },
      {
        heading: '5. Export',
        items: [
          { content: 'Regions Summary (TSV): all 2^n-1 regions with counts, percentages, and item lists.' },
          { content: 'Item Matrix (TSV): per-item binary membership table with region labels.' },
          { content: 'SVG / PNG / JPG: diagram export. PNG/JPG at 2× retina quality with white background.' },
          { content: 'All TSV files are BOM-prefixed UTF-8 for Excel compatibility.' },
        ],
      },
      {
        heading: 'Toolbar',
        items: [
          { content: 'Open: dialog with "Load Sample Data" / "Upload Custom File".' },
          { content: 'Save: downloads diagram as SVG with calculated data.' },
          { content: 'Close: resets all data and returns to empty starting state.' },
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
        </div>
      </div>
    </div>
  );
}
