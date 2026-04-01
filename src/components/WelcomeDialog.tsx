import { useState } from 'react';
import { APP_NAME, APP_VERSION } from '../version.ts';
import type { AppMode } from '../App.tsx';
import { AboutVennDialog } from './AboutVennDialog.tsx';

interface WelcomeDialogProps {
  isOpen: boolean;
  onSelectMode: (mode: AppMode) => void;
  onSummary: () => void;
  onStartTour?: () => void;
}

export function WelcomeDialog({ isOpen, onSelectMode, onSummary, onStartTour }: WelcomeDialogProps) {
  const [showCredits, setShowCredits] = useState(false);
  const [showAboutVenn, setShowAboutVenn] = useState(false);

  if (!isOpen) return null;

  if (showAboutVenn) {
    return <AboutVennDialog isOpen={showAboutVenn} onClose={() => setShowAboutVenn(false)} />;
  }

  if (showCredits) {
    return (
      <div className="dialog-overlay">
        <div className="welcome-dialog credits-dialog">
          <h1 className="welcome-title">Credits</h1>

          <div className="credits-content">
            <div className="credits-section">
              <h3 className="credits-section-title">Authors</h3>

              <div className="credits-person">
                <img className="credits-photo" src="./credits/zoltan_pics.jpeg" alt="Zoltan Dul" />
                <div className="credits-person-info">
                  <div className="credits-name">Dr. Zoltan Dul, PhD</div>
                  <div className="credits-role">Researcher, Dentist</div>
                  <div className="credits-role">Former PhD student @ King's College London</div>
                </div>
              </div>

              <div className="credits-person">
                <img className="credits-photo" src="./credits/shaun_pics.jpeg" alt="Shaun Thomas" />
                <div className="credits-person-info">
                  <div className="credits-name">Prof. N. Shaun B. Thomas</div>
                  <div className="credits-role">Cell Cycle & Epigenetics Team, Division of Cancer Studies</div>
                  <div className="credits-role">King's College London</div>
                </div>
              </div>

              <div className="credits-person">
                <img className="credits-photo" src="./credits/attila_pics.jpg" alt="Attila Csikasz-Nagy" />
                <div className="credits-person-info">
                  <div className="credits-name">Dr. Attila Csikasz-Nagy</div>
                  <div className="credits-role">Csikasz-Nagy Group, Randall Division of Cell and Molecular Biophysics</div>
                  <div className="credits-role">King's College London</div>
                </div>
              </div>

              <div className="credits-person">
                <img className="credits-photo" src="./credits/azeddine_pics.jpg" alt="Azeddine Si Ammour" />
                <div className="credits-person-info">
                  <div className="credits-name">Dr. Azeddine Si Ammour</div>
                  <div className="credits-role">Genomics and Biology of Fruit Crop</div>
                  <div className="credits-role">Fondazione Edmund Mach, San Michele all'Adige</div>
                </div>
              </div>
            </div>

            <div className="credits-section">
              <h3 className="credits-section-title">Contact</h3>
              <div className="credits-contact">
                <a href="mailto:zoltan.dul@gmail.com">zoltan.dul@gmail.com</a>
              </div>
            </div>
          </div>

          <button className="btn welcome-summary-btn" onClick={() => setShowCredits(false)}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-overlay">
      <div className="welcome-dialog">
        <h1 className="welcome-title">{APP_NAME}</h1>
        <p className="welcome-subtitle">v{APP_VERSION}</p>

        <p className="welcome-about">A collection of 44 Venn diagram SVG models from 2-set to 9-set, based on constructions by Venn, Edwards, Anderson, Grünbaum, Bannier &amp; Bodin, and others. View diagrams interactively, edit their SVG structure, or load your own data to visualize set intersections.</p>

        <div className="welcome-modes">
          <button className="welcome-mode-card" onClick={() => onSelectMode('view')}>
            <div className="welcome-mode-icon">👁</div>
            <div className="welcome-mode-name">View</div>
            <div className="welcome-mode-desc">Browse and explore our Venn diagram models with interactive region detection</div>
          </button>

          <button className="welcome-mode-card" onClick={() => onSelectMode('edit')}>
            <div className="welcome-mode-icon">✏️</div>
            <div className="welcome-mode-name">Edit</div>
            <div className="welcome-mode-desc">Open, modify, and save SVG Venn diagrams with full editing tools</div>
          </button>

          <button className="welcome-mode-card" onClick={() => onSelectMode('data')}>
            <div className="welcome-mode-icon">📊</div>
            <div className="welcome-mode-name">Data</div>
            <div className="welcome-mode-desc">Load your data to map columns to sets, and calculate Venn intersections</div>
          </button>

          {onStartTour && (
            <button className="welcome-mode-card welcome-mode-card-tour" onClick={onStartTour}>
              <div className="welcome-mode-icon">🧭</div>
              <div className="welcome-mode-name">Tour</div>
              <div className="welcome-mode-desc">Take a 90-second guided tour through Data mode using a sample dataset</div>
            </button>
          )}
        </div>

        <div className="welcome-bottom-buttons">
          <button className="btn welcome-summary-btn" onClick={() => setShowAboutVenn(true)}>
            About Venn Diagrams
          </button>
          <button className="btn welcome-summary-btn" onClick={onSummary}>
            List all Venn Diagram Models
          </button>
          <button className="btn welcome-summary-btn" onClick={() => setShowCredits(true)}>
            Credits
          </button>
        </div>
      </div>
    </div>
  );
}
