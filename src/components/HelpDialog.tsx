import type { AppMode } from '../App.tsx';

interface HelpDialogProps {
  isOpen: boolean;
  mode: AppMode;
  onClose: () => void;
}

const HELP: Record<AppMode, { title: string; sections: { heading: string; content: string }[] }> = {
  view: {
    title: 'View Mode — Help',
    sections: [
      { heading: 'Overview', content: 'Browse and explore 32 pre-built Venn diagram SVG models, from 2-set to 8-set, covering all major construction methods (Venn, Edwards, Anderson, Grünbaum, Bannier, Mamakani).' },
      { heading: 'Model Selection', content: 'Use the left sidebar dropdown to select a diagram. Models are grouped by set count (2–8).' },
      { heading: 'Layer View', content: 'Shows the original SVG with semi-transparent overlapping shapes. Hover over any point to detect which intersection region you are in. The right panel shows region details.' },
      { heading: 'Cut View', content: 'Renders pre-computed intersection region paths. Each region is a separate clickable SVG element. Hover to highlight, click to inspect.' },
      { heading: 'Region Interaction', content: 'Hover: panel shows region info in real-time. Click: locks the panel (LOCKED badge appears). Click another region to switch. Press Unlock to return to hover mode.' },
      { heading: 'Region List', content: 'Left sidebar lists all regions grouped by depth (Single, 2-way, 3-way...). Groups are collapsible. Click a region to highlight it.' },
      { heading: 'Zoom', content: 'Use the +/- buttons or Ctrl+Scroll to zoom. 1:1 resets to 100%.' },
    ],
  },
  edit: {
    title: 'Edit Mode — Help',
    sections: [
      { heading: 'Overview', content: 'Full SVG editor for Venn diagrams. Open existing models or custom SVG files, reposition text elements, edit content, and save.' },
      { heading: 'Opening Files', content: 'SELECT: choose from the built-in 32 models. OPEN CUSTOM: load any SVG file (validated against the Venn SVG format specification).' },
      { heading: 'Editing', content: 'Click any text element to select it. Drag to reposition. Double-click to edit text content. Use the right property panel to adjust position, font size, colors.' },
      { heading: 'Undo/Redo', content: 'Ctrl+Z to undo, Ctrl+Shift+Z or Ctrl+Y to redo. Up to 50 history steps.' },
      { heading: 'Validation', content: 'Toggle "Validate" in the toolbar to highlight Count texts that are in the wrong position (based on which shapes contain that point). Use "Report" for a full validation table.' },
      { heading: 'Grid', content: 'Toggle "Grid" to show a 50×50 grid overlay for precise positioning.' },
      { heading: 'Saving', content: 'Click Save to download the modified SVG. Use Restore to revert to the original state.' },
      { heading: 'Layer Tree', content: 'Left sidebar shows all elements organized by group (Shapes, Header, Names, Values, Sums, Bullets). Toggle visibility, reorder, add or remove elements.' },
    ],
  },
  data: {
    title: 'Data Mode — Help',
    sections: [
      { heading: 'Overview', content: 'Load CSV data with binary (0/1) columns, map them to Venn diagram sets, and calculate intersection counts. Visualize the results on any diagram model.' },
      { heading: '1. Data Source', content: 'Load Sample: loads the built-in streaming platforms dataset (800 titles × 8 platforms). Upload Custom: load your own CSV with binary columns.' },
      { heading: '2. Venn Diagram Model', content: 'Select a diagram model matching your data. All models from 2-set to your column count are available.' },
      { heading: '3. Column Mapping', content: 'Map CSV columns to Venn sets (A–H). Auto-detected binary columns are pre-filled. Use dropdowns to change assignments.' },
      { heading: 'Calculate', content: 'Computes exclusive counts (Count_X = rows with EXACTLY those sets) and inclusive totals (CountSUM_X = all rows containing set X).' },
      { heading: 'Clicking Regions', content: 'Click a region number: shows exclusive items. Click a Name label or CountSUM: shows inclusive (all) items for that set.' },
      { heading: 'View Options', content: 'Toggle Title, Names, Numbers visibility. Adjust Name font size with the slider. Switch between Layer and Cut views.' },
      { heading: 'Save', content: 'Save SVG button downloads the diagram with your calculated data filled in.' },
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
          {help.sections.map((s, i) => (
            <div key={i} className="help-section">
              <h3 className="help-heading">{s.heading}</h3>
              <p className="help-text">{s.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
