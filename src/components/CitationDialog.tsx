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

const ZENODO_DOI = '10.5281/zenodo.20000599';
const ZENODO_URL = `https://doi.org/${ZENODO_DOI}`;
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
  url       = {${ZENODO_URL}}
}`;

type CitationKind = 'manuscript' | 'software';
type CitationFormat = 'apa' | 'bibtex';

interface CitationCardProps {
  kind: CitationKind;
  citations: Record<CitationFormat, string>;
}

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

  const isManuscript = kind === 'manuscript';

  return (
    <div className="citation-card" data-kind={kind}>
      <div className="citation-card-header">
        <div className="citation-card-heading">
          <h3 className="citation-card-title">
            {isManuscript ? 'Manuscript' : 'Software (Zenodo)'}
          </h3>
          <span className={`citation-status ${isManuscript ? 'citation-status-pending' : 'citation-status-citable'}`}>
            {isManuscript ? 'Under review' : 'Citable today'}
          </span>
        </div>
        <p className="citation-card-subtitle">
          {isManuscript
            ? `Submitted to ${TARGET_JOURNAL}. Citation will be updated upon acceptance.`
            : `Software DOI for the v${APP_VERSION} release on Zenodo. Use this when citing the tool itself.`}
        </p>
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
        {!isManuscript && (
          <a
            href={ZENODO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="citation-doi-link"
          >
            {ZENODO_DOI} ↗
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
            kind="manuscript"
            citations={{ apa: MANUSCRIPT_APA, bibtex: MANUSCRIPT_BIBTEX }}
          />

          <div className="companion-callout">
            <strong>Once the paper is published</strong> this dialog will switch
            to the journal citation (volume / issue / page numbers and DOI). For
            reproducibility today, cite the <em>Software (Zenodo)</em> entry —
            it pins the exact released version. Watch{' '}
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
