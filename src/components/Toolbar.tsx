import { APP_NAME, APP_VERSION } from '../version.ts';

import type { AppMode } from '../App.tsx';

interface ToolbarProps {
  mode: AppMode;
  onSetMode: (mode: AppMode) => void;
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
      <span className="toolbar-app-title">{APP_NAME}</span>
      <div className="toolbar-left">
        <span className="toolbar-mode-label">Mode:</span>
        <div className="toolbar-mode-switcher">
          <button className={`btn btn-toolbar btn-mode ${mode === 'view' ? 'btn-mode-active' : ''}`} onClick={() => onSetMode('view')}>View</button>
          <button className={`btn btn-toolbar btn-mode ${mode === 'edit' ? 'btn-mode-active' : ''}`} onClick={() => onSetMode('edit')}>Edit</button>
          <button className={`btn btn-toolbar btn-mode ${mode === 'test' ? 'btn-mode-active' : ''}`} onClick={() => onSetMode('test')}>Test</button>
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
      <div className="toolbar-center" />
      <div className="toolbar-right">
        {mode === 'edit' && (
          <>
            <button className={`btn btn-toolbar ${showGrid ? 'btn-mode-active' : ''}`} onClick={onToggleGrid}>Grid</button>
            <button className={`btn btn-toolbar ${showValidation ? 'btn-mode-active' : ''}`} onClick={onToggleValidation}>Validate</button>
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
