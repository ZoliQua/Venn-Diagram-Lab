import { useState, useRef, useEffect } from 'react';
import { APP_NAME, APP_VERSION } from '../version.ts';

import type { AppMode } from '../App.tsx';

const MODE_LABELS: Record<AppMode, string> = {
  view: '👁 View',
  edit: '✏️ Edit',
  data: '📊 Data',
};

interface ToolbarProps {
  mode: AppMode;
  onSetMode: (mode: AppMode) => void;
  onSummary: () => void;
  filename: string | null;
  zoom: number;
  showGrid: boolean;
  onHelp: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  showValidation: boolean;
  moveShapes: boolean;
  onToggleGrid: () => void;
  onToggleValidation: () => void;
  onToggleMoveShapes: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReport: () => void;
}

export function Toolbar({
  mode, onSetMode, onSummary,
  filename, zoom, showGrid,
  onHelp, moveShapes, onToggleMoveShapes,
  onZoomIn, onZoomOut, onZoomReset,
  showValidation,
  onToggleGrid, onToggleValidation,
  onUndo, onRedo, onReport,
}: ToolbarProps) {
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!modeDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modeDropdownOpen]);

  return (
    <div className="toolbar">
      <span className="toolbar-app-title">{APP_NAME}</span>
      <div className="toolbar-left">
        <div className="mode-dropdown" ref={dropdownRef}>
          <button
            className="btn btn-toolbar btn-mode-dropdown"
            onClick={() => setModeDropdownOpen(o => !o)}
          >
            {MODE_LABELS[mode]} ▾
          </button>
          {modeDropdownOpen && (
            <div className="mode-dropdown-menu">
              {(Object.keys(MODE_LABELS) as AppMode[]).map(m => (
                <button
                  key={m}
                  className={`mode-dropdown-item ${m === mode ? 'mode-dropdown-active' : ''}`}
                  onClick={() => { onSetMode(m); setModeDropdownOpen(false); }}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          )}
        </div>
        {mode === 'edit' && (
          <>
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
            <button className={`btn btn-toolbar ${moveShapes ? 'btn-mode-active' : ''}`} onClick={onToggleMoveShapes}>Move Shapes</button>
            <span className="toolbar-sep" />
          </>
        )}
        <button className="btn btn-toolbar btn-sm" onClick={onZoomOut}>-</button>
        <span className="toolbar-zoom">{Math.round(zoom * 100)}%</span>
        <button className="btn btn-toolbar btn-sm" onClick={onZoomIn}>+</button>
        <button className="btn btn-toolbar btn-sm" onClick={onZoomReset}>1:1</button>
        <button className="btn btn-toolbar btn-sm" onClick={onSummary} title="All diagrams">☰</button>
        <button className="btn btn-toolbar btn-sm" onClick={onHelp} title="Help">?</button>
        <span className="toolbar-version">v{APP_VERSION}</span>
      </div>
    </div>
  );
}
