import { useState } from 'react';
import { APP_NAME, APP_VERSION, APP_RELEASE_DATE } from '../version.ts';
import type { AppMode } from '../App.tsx';
import { AboutVennDialog } from './AboutVennDialog.tsx';
import { CompanionPackageDialog } from './CompanionPackageDialog.tsx';
import { CitationDialog } from './CitationDialog.tsx';

interface WelcomeDialogProps {
  isOpen: boolean;
  onSelectMode: (mode: AppMode) => void;
  onSummary: () => void;
  onStartTour?: () => void;
}

const REPO_URL = 'https://github.com/ZoliQua/Venn-Diagram-Lab';

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true" className="welcome-github-mark">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function OrcidLink({ id, name }: { id: string; name: string }) {
  return (
    <a
      href={`https://orcid.org/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="credits-orcid"
      aria-label={`ORCID iD for ${name}`}
      title={`ORCID: ${id}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" aria-hidden="true">
        <path fill="#A6CE39" d="M256 128c0 70.7-57.3 128-128 128S0 198.7 0 128 57.3 0 128 0s128 57.3 128 128z" />
        <path fill="#FFF" d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7C191.7 111.2 178 93 148 93h-23.7v79.4zM88.7 56.8c0 5.5-4.5 10.1-10.1 10.1s-10.1-4.6-10.1-10.1c0-5.6 4.5-10.1 10.1-10.1s10.1 4.6 10.1 10.1z" />
      </svg>
    </a>
  );
}

export function WelcomeDialog({ isOpen, onSelectMode, onSummary, onStartTour }: WelcomeDialogProps) {
  const [showCredits, setShowCredits] = useState(false);
  const [showAboutVenn, setShowAboutVenn] = useState(false);
  const [companionDialog, setCompanionDialog] = useState<'python' | 'r' | null>(null);
  const [showCitation, setShowCitation] = useState(false);

  if (!isOpen) return null;

  if (showAboutVenn) {
    return <AboutVennDialog isOpen={showAboutVenn} onClose={() => setShowAboutVenn(false)} />;
  }

  if (companionDialog) {
    return (
      <CompanionPackageDialog
        isOpen={true}
        onClose={() => setCompanionDialog(null)}
        kind={companionDialog}
      />
    );
  }

  if (showCitation) {
    return <CitationDialog isOpen={true} onClose={() => setShowCitation(false)} />;
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
                <img className="credits-photo" src="./credits/zoltan_pics.jpeg" alt="Zoltán Dul" />
                <div className="credits-person-info">
                  <div className="credits-name">
                    Dr. Zoltán Dul, PhD
                    <OrcidLink id="0000-0002-9523-3450" name="Zoltán Dul" />
                  </div>
                  <div className="credits-role">Department of Haematological Medicine</div>
                  <div className="credits-role">Randall Centre for Cell and Molecular Biophysics</div>
                  <div className="credits-role">King's College London, United Kingdom</div>
                </div>
              </div>

              <div className="credits-person">
                <img className="credits-photo" src="./credits/marton_pics.jpeg" alt="Márton Ölbei" />
                <div className="credits-person-info">
                  <div className="credits-name">
                    Dr. Márton Ölbei
                    <OrcidLink id="0000-0002-4903-6237" name="Márton Ölbei" />
                  </div>
                  <div className="credits-role">Faculty of Medicine, Department of Metabolism, Digestion and Reproduction</div>
                  <div className="credits-role">Imperial College London, United Kingdom</div>
                </div>
              </div>

              <div className="credits-person">
                <img className="credits-photo" src="./credits/shaun_pics.jpeg" alt="N. Shaun B. Thomas" />
                <div className="credits-person-info">
                  <div className="credits-name">Prof. N. Shaun B. Thomas</div>
                  <div className="credits-role">Department of Haematological Medicine</div>
                  <div className="credits-role">King's College London, United Kingdom</div>
                </div>
              </div>

              <div className="credits-person">
                <img className="credits-photo" src="./credits/azeddine_pics.jpg" alt="Azeddine Si Ammour" />
                <div className="credits-person-info">
                  <div className="credits-name">
                    Dr. Azeddine Si Ammour
                    <OrcidLink id="0000-0002-5504-4444" name="Azeddine Si Ammour" />
                  </div>
                  <div className="credits-role">Research and Innovation Centre, Fondazione Edmund Mach</div>
                  <div className="credits-role">San Michele all'Adige, Italy</div>
                </div>
              </div>

              <div className="credits-person">
                <img className="credits-photo" src="./credits/attila_pics.jpg" alt="Attila Csikász-Nagy" />
                <div className="credits-person-info">
                  <div className="credits-name">
                    Dr. Attila Csikász-Nagy
                    <OrcidLink id="0000-0002-2919-5601" name="Attila Csikász-Nagy" />
                  </div>
                  <div className="credits-role">Randall Centre for Cell and Molecular Biophysics, King's College London</div>
                  <div className="credits-role">Faculty of Information Technology and Bionics, Pázmány Péter Catholic University, Budapest</div>
                  <div className="credits-role">
                    <a href="https://cytocast.com" target="_blank" rel="noopener noreferrer" className="credits-affil-link">
                      Cytocast Hungary Kft.
                    </a>
                    , Budapest, Hungary
                  </div>
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
        <div className="welcome-title-row">
          <div className="welcome-logo-frame">
            <img
              className="welcome-logo"
              src="./venndiagramlab-logo-no-text.png"
              alt="Venn Diagram Lab logo"
            />
          </div>
          <h1 className="welcome-title">{APP_NAME}</h1>
        </div>

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
              <div className="welcome-mode-desc">Take a short guided tour through Data mode using a sample dataset</div>
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

        <div className="welcome-section-separator" aria-hidden="true" />

        <div className="welcome-bottom-buttons welcome-companion-buttons">
          <button
            className="btn welcome-summary-btn welcome-companion-btn"
            onClick={() => setCompanionDialog('python')}
          >
            <span className="welcome-companion-btn-icon" aria-hidden="true">{'\u{1F40D}'}</span>
            <span className="welcome-companion-btn-text">
              <span className="welcome-companion-btn-title">Python Package</span>
              <span className="welcome-companion-btn-sub">venn-diagram-lab · on PyPI</span>
            </span>
          </button>
          <button
            className="btn welcome-summary-btn welcome-companion-btn"
            onClick={() => setCompanionDialog('r')}
          >
            <span className="welcome-companion-btn-icon welcome-companion-btn-icon-r" aria-hidden="true">R</span>
            <span className="welcome-companion-btn-text">
              <span className="welcome-companion-btn-title">R Package</span>
              <span className="welcome-companion-btn-sub">vennDiagramLab · on CRAN</span>
            </span>
          </button>
        </div>

        <div className="welcome-section-separator" aria-hidden="true" />

        <div className="welcome-bottom-buttons welcome-meta-buttons">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn welcome-summary-btn welcome-meta-btn welcome-github-link"
          >
            <GitHubMark />
            <span className="welcome-meta-btn-text">
              <span className="welcome-meta-btn-title">GitHub Repository</span>
              <span className="welcome-meta-btn-sub">ZoliQua/Venn-Diagram-Lab ↗</span>
            </span>
          </a>
          <button
            className="btn welcome-summary-btn welcome-meta-btn"
            onClick={() => setShowCitation(true)}
          >
            <span className="welcome-meta-btn-icon" aria-hidden="true">{'\u{1F4C4}'}</span>
            <span className="welcome-meta-btn-text">
              <span className="welcome-meta-btn-title">How to cite ...</span>
              <span className="welcome-meta-btn-sub">Manuscript under publication</span>
            </span>
          </button>
        </div>

        <div className="welcome-footer">
          v{APP_VERSION} · Last updated {APP_RELEASE_DATE} ·{' '}
          <a
            href="https://github.com/ZoliQua/Venn-Diagram-Lab/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="welcome-footer-link"
          >
            CHANGELOG
          </a>
        </div>
      </div>
    </div>
  );
}
