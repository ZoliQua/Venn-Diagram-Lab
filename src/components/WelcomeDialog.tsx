import { APP_NAME, APP_VERSION } from '../version.ts';
import type { AppMode } from '../App.tsx';

interface WelcomeDialogProps {
  isOpen: boolean;
  onSelectMode: (mode: AppMode) => void;
  onSummary: () => void;
}

export function WelcomeDialog({ isOpen, onSelectMode, onSummary }: WelcomeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="welcome-dialog">
        <h1 className="welcome-title">{APP_NAME}</h1>
        <p className="welcome-subtitle">v{APP_VERSION}</p>

        <p className="welcome-about">A collection of 32 Venn diagram SVG models from 2-set to 8-set, based on constructions by Venn, Edwards, Anderson, Grünbaum, Bannier &amp; Bodin, and others. View diagrams interactively, edit their SVG structure, or load your own CSV data to visualize set intersections.</p>

        <p className="welcome-instruction">Please select a function to get started</p>

        <div className="welcome-modes">
          <button className="welcome-mode-card" onClick={() => onSelectMode('view')}>
            <div className="welcome-mode-icon">👁</div>
            <div className="welcome-mode-name">View</div>
            <div className="welcome-mode-desc">Browse and explore 32 Venn diagram models with interactive region detection</div>
          </button>

          <button className="welcome-mode-card" onClick={() => onSelectMode('edit')}>
            <div className="welcome-mode-icon">✏️</div>
            <div className="welcome-mode-name">Edit</div>
            <div className="welcome-mode-desc">Open, modify, and save SVG Venn diagrams with full editing tools</div>
          </button>

          <button className="welcome-mode-card" onClick={() => onSelectMode('data')}>
            <div className="welcome-mode-icon">📊</div>
            <div className="welcome-mode-name">Data</div>
            <div className="welcome-mode-desc">Load CSV data, map columns to sets, and calculate Venn intersections</div>
          </button>
        </div>

        <button className="btn welcome-summary-btn" onClick={onSummary}>
          View All 32 Diagram Models
        </button>
      </div>
    </div>
  );
}
