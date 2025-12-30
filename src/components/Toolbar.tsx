import { APP_NAME, APP_VERSION } from '../version.ts';

interface ToolbarProps {
  mode: 'view' | 'edit';
  onSetMode: (mode: 'view' | 'edit') => void;
  onSummary: () => void;
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
  mode, onSetMode, onSummary,
  filename, zoom, showGrid,
  onOpen, onSave,
  onZoomIn, onZoomOut, onZoomReset,
  showValidation,
  onToggleGrid, onToggleValidation,
  onUndo, onRedo, onReport,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-app-title">{APP_NAME}</span>
        <span className="toolbar-sep" />
        <span className="toolbar-mode-label">Mode:</span>
        <div className="toolbar-mode-switcher">
          <button className={`btn btn-toolbar btn-mode ${mode === 'view' ? 'btn-mode-active' : ''}`} onClick={() => onSetMode('view')}>View</button>
          <button className={`btn btn-toolbar btn-mode ${mode === 'edit' ? 'btn-mode-active' : ''}`} onClick={() => onSetMode('edit')}>Edit</button>
        </div>
        <button className="btn btn-toolbar" onClick={onSummary} title="Show all diagrams">Summary</button>
        {mode === 'edit' && (
          <>
            <span className="toolbar-sep" />
            <button className="btn btn-toolbar" onClick={onOpen}>Open</button>
            <button className="btn btn-toolbar" onClick={onSave} disabled={!filename}>Save</button>
            <span className="toolbar-sep" />
            <button className="btn btn-toolbar" onClick={onUndo}>Undo</button>
            <button className="btn btn-toolbar" onClick={onRedo}>Redo</button>
            <span className="toolbar-sep" />
            <button className="btn btn-toolbar" onClick={onReport} disabled={!filename}>Report</button>
          </>
        )}
      </div>
      <div className="toolbar-center">
        {filename && <span className="toolbar-filename">{filename}</span>}
      </div>
      <div className="toolbar-right">
        {mode === 'edit' && (
          <>
            <label className="toolbar-grid-toggle">
              <input type="checkbox" checked={showGrid} onChange={onToggleGrid} />
              Grid
            </label>
            <label className={`toolbar-grid-toggle ${showValidation ? 'toolbar-validate-active' : ''}`}>
              <input type="checkbox" checked={showValidation} onChange={onToggleValidation} />
              Validate
            </label>
            <span className="toolbar-sep" />
          </>
        )}
        <button className="btn btn-toolbar btn-sm" onClick={onZoomOut}>-</button>
        <span className="toolbar-zoom">{Math.round(zoom * 100)}%</span>
        <button className="btn btn-toolbar btn-sm" onClick={onZoomIn}>+</button>
        <button className="btn btn-toolbar btn-sm" onClick={onZoomReset}>1:1</button>
        <span className="toolbar-version">v{APP_VERSION}</span>
      </div>
    </div>
  );
}
