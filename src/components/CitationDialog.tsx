import { useState } from 'react';
import { APP_VERSION } from '../version.ts';

interface CitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAPER_TITLE = 'Venn Diagram Lab: a comprehensive browser-based platform for interactive Venn diagram visualization and statistical analysis';

const AUTHORS_DISPLAY = 'Zoltán Dul, Márton Ölbei, N. Shaun B. Thomas, Azeddine Si Ammour, Attila Csikász-Nagy';

const AUTHORS_APA = 'Dul, Z., Ölbei, M., Thomas, N. S. B., Si Ammour, A., & Csikász-Nagy, A.';

const AUTHORS_BIBTEX = "Dul, Zolt{\\'{a}}n and {\\\"O}lbei, M{\\'{a}}rton and Thomas, N. Shaun B. and Si Ammour, Azeddine and Csik{\\'{a}}sz-Nagy, Attila";

// Zenodo concept (all-versions) DOI — auto-resolves to the latest archived
// release of the project, regardless of which surface (web, Python, R) the
// reader cares about. We deliberately do NOT point at a per-version DOI so
// this string never needs to be updated per release.
const ZENODO_DOI = '10.5281/zenodo.19510813';
const ZENODO_URL = `https://doi.org/${ZENODO_DOI}`;
// Companion R package CRAN-minted DOI (separate from the Zenodo concept above).
const CRAN_R_DOI = '10.32614/CRAN.package.vennDiagramLab';
const CRAN_R_URL = `https://doi.org/${CRAN_R_DOI}`;
// Companion Python package — PyPI has no per-package DOI, so the version is
// cited with the PyPI URL and the project's Zenodo concept DOI as the
// archival identifier.
const PYPI_URL = 'https://pypi.org/project/venn-diagram-lab/';
const PY_PACKAGE_VERSION = '2.0.3';
const R_PACKAGE_VERSION  = '2.0.5';
const TARGET_JOURNAL = 'BMC Bioinformatics';

const MANUSCRIPT_APA = `${AUTHORS_APA} (2026). ${PAPER_TITLE}. Manuscript submitted for publication, ${TARGET_JOURNAL}.`;

const MANUSCRIPT_BIBTEX = `@article{dul2026venndiagramlab,
  title   = {${PAPER_TITLE}},
  author  = {${AUTHORS_BIBTEX}},
  year    = {2026},
  journal = {${TARGET_JOURNAL}},
  note    = {Manuscript submitted for publication}
}`;

const SOFTWARE_APA = `${AUTHORS_APA} (2026). Venn Diagram Lab (v${APP_VERSION}) [Computer software]. Zenodo. ${ZENODO_URL}`;

const SOFTWARE_BIBTEX = `@software{venndiagramlab_${APP_VERSION.replace(/\./g, '_')},
  title     = {Venn Diagram Lab},
  author    = {${AUTHORS_BIBTEX}},
  version   = {${APP_VERSION}},
  year      = {2026},
  publisher = {Zenodo},
  doi       = {${ZENODO_DOI}},
  url       = {${ZENODO_URL}},
  note      = {Concept DOI — resolves to the latest archived version}
}`;

const R_PACKAGE_APA = `${AUTHORS_APA} (2026). vennDiagramLab: Headless Venn diagram analysis and rendering (R package version ${R_PACKAGE_VERSION}). CRAN. ${CRAN_R_URL}`;

const R_PACKAGE_BIBTEX = `@Manual{vennDiagramLab_R,
  title     = {vennDiagramLab: Headless Venn diagram analysis and rendering},
  author    = {${AUTHORS_BIBTEX}},
  year      = {2026},
  note      = {R package version ${R_PACKAGE_VERSION}},
  url       = {https://CRAN.R-project.org/package=vennDiagramLab},
  doi       = {${CRAN_R_DOI}}
}`;

const PY_PACKAGE_APA = `${AUTHORS_APA} (2026). venn-diagram-lab: Headless Venn diagram analysis and rendering (Python package version ${PY_PACKAGE_VERSION}) [Computer software]. PyPI. ${PYPI_URL}`;

const PY_PACKAGE_BIBTEX = `@Manual{venn_diagram_lab_python,
  title     = {venn-diagram-lab: Headless Venn diagram analysis and rendering},
  author    = {${AUTHORS_BIBTEX}},
  year      = {2026},
  note      = {Python package version ${PY_PACKAGE_VERSION}},
  url       = {${PYPI_URL}},
  doi       = {${ZENODO_DOI}}
}`;

type CitationKind = 'manuscript' | 'software' | 'rpackage' | 'pypackage';
type CitationFormat = 'apa' | 'bibtex';

interface CitationCardProps {
  kind: CitationKind;
  citations: Record<CitationFormat, string>;
}

const CARD_TITLE: Record<CitationKind, string> = {
  manuscript: 'Manuscript',
  software:   'Software (Zenodo concept DOI)',
  rpackage:   'R companion package (CRAN)',
  pypackage:  'Python companion package (PyPI)',
};

const CARD_STATUS: Record<CitationKind, { label: string; cls: string }> = {
  manuscript: { label: 'Under review',   cls: 'citation-status-pending' },
  software:   { label: 'Citable today',  cls: 'citation-status-citable' },
  rpackage:   { label: 'Citable today',  cls: 'citation-status-citable' },
  pypackage:  { label: 'Citable today',  cls: 'citation-status-citable' },
};

function CitationCard({ kind, citations }: CitationCardProps) {
  const [format, setFormat] = useState<CitationFormat>('apa');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citations[format]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard write rejected; silently keep label as-is.
    }
  };

  let subtitle: string;
  switch (kind) {
    case 'manuscript':
      subtitle = `Submitted to ${TARGET_JOURNAL}. Citation will be updated upon acceptance.`;
      break;
    case 'rpackage':
      subtitle = `CRAN-minted DOI for the vennDiagramLab R package (version ${R_PACKAGE_VERSION}). Cite this when reproducibility of an R-side analysis specifically matters.`;
      break;
    case 'pypackage':
      subtitle = `PyPI URL for the venn-diagram-lab Python package (version ${PY_PACKAGE_VERSION}). Cite this when reproducibility of a Python-side / CLI analysis specifically matters; the doi field points at the Zenodo concept archive.`;
      break;
    default:
      subtitle = `Zenodo concept (all-versions) DOI for Venn Diagram Lab. Auto-resolves to the latest archived release — never needs to be updated per version. Currently v${APP_VERSION}.`;
  }

  return (
    <div className="citation-card" data-kind={kind}>
      <div className="citation-card-header">
        <div className="citation-card-heading">
          <h3 className="citation-card-title">{CARD_TITLE[kind]}</h3>
          <span className={`citation-status ${CARD_STATUS[kind].cls}`}>{CARD_STATUS[kind].label}</span>
        </div>
        <p className="citation-card-subtitle">{subtitle}</p>
      </div>

      <div className="citation-format-toggle" role="tablist" aria-label="Citation format">
        <button
          role="tab"
          aria-selected={format === 'apa'}
          className={`citation-format-btn ${format === 'apa' ? 'citation-format-btn-active' : ''}`}
          onClick={() => setFormat('apa')}
        >
          APA
        </button>
        <button
          role="tab"
          aria-selected={format === 'bibtex'}
          className={`citation-format-btn ${format === 'bibtex' ? 'citation-format-btn-active' : ''}`}
          onClick={() => setFormat('bibtex')}
        >
          BibTeX
        </button>
      </div>

      <pre className="citation-block"><code>{citations[format]}</code></pre>

      <div className="citation-card-actions">
        <button className="citation-copy-btn" onClick={handleCopy}>
          {copied ? `${'✓'} Copied` : `${'⧉'} Copy citation`}
        </button>
        {kind === 'software' && (
          <a
            href={ZENODO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="citation-doi-link"
          >
            {ZENODO_DOI} ↗
          </a>
        )}
        {kind === 'rpackage' && (
          <a
            href={CRAN_R_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="citation-doi-link"
          >
            {CRAN_R_DOI} ↗
          </a>
        )}
        {kind === 'pypackage' && (
          <a
            href={PYPI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="citation-doi-link"
          >
            pypi.org/project/venn-diagram-lab ↗
          </a>
        )}
      </div>
    </div>
  );
}

export function CitationDialog({ isOpen, onClose }: CitationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="welcome-dialog citation-dialog" onClick={e => e.stopPropagation()}>
        <div className="companion-header">
          <div className="companion-header-icon citation-header-icon" aria-hidden="true">
            {'\u{1F4C4}'}
          </div>
          <div className="companion-header-text">
            <h1 className="welcome-title companion-title">How to cite Venn Diagram Lab</h1>
            <p className="companion-subtitle">
              The accompanying manuscript is currently under publication. Until
              it is accepted, please cite the software DOI on Zenodo.
            </p>
          </div>
          <button className="btn welcome-summary-btn companion-close-btn" onClick={onClose}>Close</button>
        </div>

        <div className="citation-status-banner">
          <span className="citation-status-banner-icon" aria-hidden="true">{'\u{1F4F0}'}</span>
          <div className="citation-status-banner-text">
            <strong>Under publication · {TARGET_JOURNAL}</strong>
            <span className="citation-status-banner-sub">
              {PAPER_TITLE}
            </span>
            <span className="citation-status-banner-authors">{AUTHORS_DISPLAY}</span>
          </div>
        </div>

        <div className="companion-body">
          <CitationCard
            kind="software"
            citations={{ apa: SOFTWARE_APA, bibtex: SOFTWARE_BIBTEX }}
          />
          <div className="citation-card-spacer" />
          <CitationCard
            kind="rpackage"
            citations={{ apa: R_PACKAGE_APA, bibtex: R_PACKAGE_BIBTEX }}
          />
          <div className="citation-card-spacer" />
          <CitationCard
            kind="pypackage"
            citations={{ apa: PY_PACKAGE_APA, bibtex: PY_PACKAGE_BIBTEX }}
          />
          <div className="citation-card-spacer" />
          <CitationCard
            kind="manuscript"
            citations={{ apa: MANUSCRIPT_APA, bibtex: MANUSCRIPT_BIBTEX }}
          />

          <div className="companion-callout">
            <strong>Which to cite?</strong> Use the <em>Software (Zenodo
            concept DOI)</em> for the project as a whole — it always points
            at the latest archived release, so the reference never goes
            stale. Add the <em>R companion package (CRAN)</em> or
            <em> Python companion package (PyPI)</em> entry if your analysis
            ran specifically against one of those packages. Once the
            manuscript is accepted, this dialog will switch the primary
            citation to the journal entry (volume / issue / page numbers and
            DOI). Watch{' '}
            <a
              href="https://github.com/ZoliQua/Venn-Diagram-Lab/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="companion-link"
            >
              GitHub releases
            </a>{' '}
            for updates.
          </div>
        </div>
      </div>
    </div>
  );
}
