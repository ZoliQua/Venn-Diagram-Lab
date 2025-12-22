interface ToolbarProps {
  filename: string | null;
  zoom: number;
  showGrid: boolean;
  onOpen: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  showValidation: boolean;
  onToggleGrid: () => void;
  onToggleValidation: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReport: () => void;
}

export function Toolbar({
  filename,
  zoom,
  showGrid,
  onOpen,
  onSave,
  onZoomIn,
  onZoomOut,
  showValidation,
  onZoomReset,
  onToggleGrid,
  onToggleValidation,
  onUndo,
  onRedo,
  onReport,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="btn btn-toolbar" onClick={onOpen} title="Open SVG file">
          Open
        </button>
        <button className="btn btn-toolbar" onClick={onSave} title="Save (Ctrl+S)" disabled={!filename}>
          Save
        </button>
        <span className="toolbar-sep" />
        <button className="btn btn-toolbar" onClick={onUndo} title="Undo (Ctrl+Z)">
          Undo
        </button>
        <button className="btn btn-toolbar" onClick={onRedo} title="Redo (Ctrl+Shift+Z)">
          Redo
        </button>
        <span className="toolbar-sep" />
        <button className="btn btn-toolbar" onClick={onReport} title="Validation Report" disabled={!filename}>
          Report
        </button>
      </div>
      <div className="toolbar-center">
        {filename && <span className="toolbar-filename">{filename}</span>}
      </div>
      <div className="toolbar-right">
        <label className="toolbar-grid-toggle">
          <input type="checkbox" checked={showGrid} onChange={onToggleGrid} />
          Grid
        </label>
        <label className={`toolbar-grid-toggle ${showValidation ? 'toolbar-validate-active' : ''}`}>
          <input type="checkbox" checked={showValidation} onChange={onToggleValidation} />
          Validate
        </label>
        <span className="toolbar-sep" />
        <button className="btn btn-toolbar btn-sm" onClick={onZoomOut} title="Zoom out">
          -
        </button>
        <span className="toolbar-zoom">{Math.round(zoom * 100)}%</span>
        <button className="btn btn-toolbar btn-sm" onClick={onZoomIn} title="Zoom in">
          +
        </button>
        <button className="btn btn-toolbar btn-sm" onClick={onZoomReset} title="Reset zoom">
          1:1
        </button>
      </div>
    </div>
  );
}
