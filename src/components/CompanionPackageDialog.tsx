import { useEffect, useState } from 'react';
import {
  COMPANION_CARD_PANELS,
  COMPANION_DETAIL_PANELS,
  type CompanionKind,
  type DetailPanel,
} from './companionDetailPanels.ts';

interface CompanionPackageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  kind: CompanionKind;
}

type TabId = 'overview' | 'install' | 'notebooks' | 'features' | 'links';

interface TabSpec {
  id: TabId;
  label: string;
}

const PYTHON_TABS: TabSpec[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'install', label: 'Install & Quickstart' },
  { id: 'notebooks', label: 'Notebooks' },
  { id: 'features', label: 'Features' },
  { id: 'links', label: 'Links' },
];

const R_TABS: TabSpec[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'install', label: 'Install & Quickstart' },
  { id: 'features', label: 'Features' },
  { id: 'links', label: 'Links' },
];

const NODE_TABS: TabSpec[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'install', label: 'Install & Quickstart' },
  { id: 'features', label: 'Features' },
  { id: 'links', label: 'Links' },
];

const REPO_BASE = 'https://github.com/ZoliQua/Venn-Diagram-Lab';
const NB_BASE_GITHUB = `${REPO_BASE}/blob/main/python/examples`;
const NB_BASE_NBVIEWER = 'https://nbviewer.org/github/ZoliQua/Venn-Diagram-Lab/blob/main/python/examples';
const NB_BASE_COLAB = 'https://colab.research.google.com/github/ZoliQua/Venn-Diagram-Lab/blob/main/python/examples';

interface NotebookEntry {
  num: string;
  file: string;
  title: string;
  length: 'short' | 'medium' | 'long';
  description: string;
}

const NOTEBOOKS: NotebookEntry[] = [
  {
    num: '01',
    file: '01_quickstart.ipynb',
    title: 'Quickstart',
    length: 'short',
    description: 'First analysis in ~10 cells: import, load a sample, analyze, render, save.',
  },
  {
    num: '02',
    file: '02_real_cancer_drivers.ipynb',
    title: 'Real Cancer Drivers',
    length: 'long',
    description: 'Full walkthrough of the 4-database cancer driver gene comparison case study.',
  },
  {
    num: '03',
    file: '03_proportional_diagrams.ipynb',
    title: 'Area-Proportional Diagrams',
    length: 'medium',
    description: 'Analytical 2-set and Wilkinson-style 3-set proportional layouts.',
  },
  {
    num: '04',
    file: '04_upset_vs_venn_vs_network.ipynb',
    title: 'UpSet vs. Venn vs. Network',
    length: 'medium',
    description: 'Picking the right visualization based on set count and overlap density.',
  },
  {
    num: '05',
    file: '05_statistics_deep_dive.ipynb',
    title: 'Statistics Deep Dive',
    length: 'long',
    description: 'Jaccard, Sørensen-Dice, hypergeometric enrichment, BH-FDR correction in detail.',
  },
  {
    num: '06',
    file: '06_pipeline_integration.ipynb',
    title: 'Pipeline Integration',
    length: 'medium',
    description: 'Drop-in usage in Snakemake and Nextflow rules; CLI vs. library trade-offs.',
  },
  {
    num: '07',
    file: '07_pdf_reports.ipynb',
    title: 'PDF Reports',
    length: 'short',
    description: 'Multi-page report generation matching the web tool’s exporter.',
  },
  {
    num: '08',
    file: '08_custom_styling_and_export.ipynb',
    title: 'Custom Styling & Export',
    length: 'long',
    description: 'Custom rendering, lxml post-processing, multi-format SVG / PNG / PDF export.',
  },
  {
    num: '09',
    file: '09_cli_workflows.ipynb',
    title: 'CLI Workflows from Python',
    length: 'medium',
    description: 'Drive the vdl CLI via subprocess: tree discovery, render, export, validate, workflow run-from, report zip.',
  },
  {
    num: '10',
    file: '10_enrichment_plots_comparison.ipynb',
    title: 'Enrichment Plot Families',
    length: 'medium',
    description: 'All 5 plots side-by-side: bar, lollipop, heatmap, cluster heatmap, item share distribution.',
  },
  {
    num: '11',
    file: '11_data_validation_and_lookup.ipynb',
    title: 'Data Validation & Item Lookup',
    length: 'medium',
    description: 'The vdl data subapp: validate (+ strict), describe, lookup, fit-model, convert — data-hygiene workflow.',
  },
  {
    num: '12',
    file: '12_region_accessors_and_dsl.ipynb',
    title: 'Region Accessors & Boolean DSL',
    length: 'medium',
    description: 'Three region-membership accessors, the Boolean DSL parser, spotlight rendering, and a CLI sub-tutorial via subprocess.',
  },
];

function PythonLogo() {
  return (
    <svg viewBox="0 0 110 110" width="44" height="44" aria-hidden="true" className="companion-logo-svg">
      <defs>
        <linearGradient id="pyBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#387EB8" />
          <stop offset="100%" stopColor="#366994" />
        </linearGradient>
        <linearGradient id="pyYellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE052" />
          <stop offset="100%" stopColor="#FFC331" />
        </linearGradient>
      </defs>
      <path
        fill="url(#pyBlue)"
        d="M54.9 2.7c-26.1 0-24.4 11.3-24.4 11.3l0 11.7 24.9 0 0 3.5-34.7 0c0 0-16.7-1.9-16.7 24.2 0 26.1 14.6 25.2 14.6 25.2l8.7 0 0-12.2c0 0-.5-14.6 14.4-14.6l24.7 0c0 0 13.9.2 13.9-13.4l0-22.5c0 0 2.1-13.2-25.4-13.2zm-13.7 7.9c2.5 0 4.4 2 4.4 4.4 0 2.5-2 4.4-4.4 4.4-2.5 0-4.4-2-4.4-4.4 0-2.5 2-4.4 4.4-4.4z"
      />
      <path
        fill="url(#pyYellow)"
        d="M55.6 107.3c26.1 0 24.4-11.3 24.4-11.3l0-11.7-24.9 0 0-3.5 34.7 0c0 0 16.7 1.9 16.7-24.2 0-26.1-14.6-25.2-14.6-25.2l-8.7 0 0 12.2c0 0 .5 14.6-14.4 14.6l-24.7 0c0 0-13.9-.2-13.9 13.4l0 22.5c0 0-2.1 13.2 25.4 13.2zm13.7-7.9c-2.5 0-4.4-2-4.4-4.4 0-2.5 2-4.4 4.4-4.4 2.5 0 4.4 2 4.4 4.4 0 2.5-2 4.4-4.4 4.4z"
      />
    </svg>
  );
}

function RLogo() {
  return (
    <svg viewBox="0 0 100 80" width="44" height="44" aria-hidden="true" className="companion-logo-svg">
      <defs>
        <linearGradient id="rBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CBCED0" />
          <stop offset="100%" stopColor="#84838B" />
        </linearGradient>
        <linearGradient id="rRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#276DC3" />
          <stop offset="100%" stopColor="#1A4F8B" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="40" rx="48" ry="30" fill="url(#rBlue)" />
      <ellipse cx="50" cy="40" rx="36" ry="20" fill="#fff" />
      <path
        fill="url(#rRed)"
        d="M30 65 L30 18 L55 18 C68 18 75 24 75 32 C75 40 68 44 60 44 L48 44 L70 65 L57 65 L40 44 L40 65 Z M40 25 L40 38 L52 38 C58 38 62 35 62 32 C62 28 58 25 52 25 Z"
      />
    </svg>
  );
}

function NodeLogo() {
  return (
    <svg viewBox="0 0 80 80" width="44" height="44" aria-hidden="true" className="companion-logo-svg">
      <defs>
        <linearGradient id="ndGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#57A846" />
          <stop offset="100%" stopColor="#3D8B37" />
        </linearGradient>
        <linearGradient id="ndDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#333333" />
          <stop offset="100%" stopColor="#1A1A1A" />
        </linearGradient>
      </defs>
      {/* Hexagon background */}
      <polygon points="40,4 73,22 73,58 40,76 7,58 7,22" fill="url(#ndGreen)" />
      {/* npm-style squares representing the node logo mark */}
      <rect x="17" y="30" width="46" height="20" fill="url(#ndDark)" rx="2" />
      <rect x="23" y="36" width="8" height="14" fill="url(#ndGreen)" rx="1" />
      <rect x="36" y="36" width="8" height="8" fill="url(#ndGreen)" rx="1" />
      <rect x="49" y="36" width="8" height="14" fill="url(#ndGreen)" rx="1" />
    </svg>
  );
}

interface LinkCardProps {
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  variant?: 'primary' | 'default';
}

function LinkCard({ icon, title, subtitle, href, cta, variant = 'default' }: LinkCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`companion-link-card ${variant === 'primary' ? 'companion-link-card-primary' : ''}`}
    >
      <span className="companion-link-card-icon" aria-hidden="true">{icon}</span>
      <span className="companion-link-card-body">
        <span className="companion-link-card-title">{title}</span>
        <span className="companion-link-card-subtitle">{subtitle}</span>
      </span>
      <span className="companion-link-card-cta">
        {cta}
        <span className="companion-link-card-arrow" aria-hidden="true">↗</span>
      </span>
    </a>
  );
}

function NotebookCard({ entry }: { entry: NotebookEntry }) {
  const githubUrl = `${NB_BASE_GITHUB}/${entry.file}`;
  const nbviewerUrl = `${NB_BASE_NBVIEWER}/${entry.file}`;
  const colabUrl = `${NB_BASE_COLAB}/${entry.file}`;
  return (
    <div className="companion-notebook-card">
      <div className="companion-notebook-card-header">
        <span className="companion-notebook-num">{entry.num}</span>
        <span className="companion-notebook-title">{entry.title}</span>
        <span className={`companion-notebook-length companion-notebook-length-${entry.length}`}>{entry.length}</span>
      </div>
      <p className="companion-notebook-desc">{entry.description}</p>
      <div className="companion-notebook-actions">
        <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="companion-notebook-action">
          <span aria-hidden="true">{'\u{1F4D6}'}</span> GitHub
        </a>
        <a href={nbviewerUrl} target="_blank" rel="noopener noreferrer" className="companion-notebook-action">
          <span aria-hidden="true">{'\u{1F441}'}</span> nbviewer
        </a>
        <a
          href={colabUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="companion-notebook-action companion-notebook-action-colab"
          title="Run interactively in Google Colab"
        >
          <span aria-hidden="true">{'\u{1F680}'}</span> Colab
        </a>
      </div>
    </div>
  );
}

type OS = 'macos' | 'linux' | 'windows';

const OS_LABELS: Record<OS, string> = {
  macos: 'macOS',
  linux: 'Linux',
  windows: 'Windows',
};

const CAIRO_CMD: Record<OS, string> = {
  macos: 'brew install cairo pango',
  linux: 'sudo apt install libcairo2          # Debian / Ubuntu\n# or:\nsudo dnf install cairo                # Fedora / RHEL',
  windows: '# Install the GTK3 runtime (bundles cairo):\n# https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer',
};

function CodeBlock({ label, children }: { label?: string; children: React.ReactNode }) {
  if (!label) {
    return <pre className="companion-code"><code>{children}</code></pre>;
  }
  return (
    <div className="companion-code-block">
      <div className="companion-code-block-label">{label}</div>
      <pre className="companion-code companion-code-bare"><code>{children}</code></pre>
    </div>
  );
}

type OpenPanel = (panel: DetailPanel) => void;

/** Clickable Overview-tab feature cell that opens its code panel. */
function FeatureCellButton({
  category,
  panel,
  icon,
  title,
  children,
  onOpen,
}: {
  category: string;
  panel: DetailPanel;
  icon: string;
  title: React.ReactNode;
  children: React.ReactNode;
  onOpen: OpenPanel;
}) {
  return (
    <button
      type="button"
      className="companion-feature-cell companion-feature-cell-button"
      data-category={category}
      onClick={() => onOpen(panel)}
    >
      <div className="companion-feature-cell-icon" aria-hidden="true">{icon}</div>
      <div className="companion-feature-cell-text">
        <div className="companion-feature-cell-title">{title}</div>
        <div className="companion-feature-cell-desc">{children}</div>
      </div>
      <span className="companion-feature-cell-cta" aria-hidden="true">{'</>'}</span>
    </button>
  );
}

/**
 * Features-tab group header. When `panel` is given it renders as a button that
 * opens the category-level code panel; otherwise it stays a plain header
 * (used for "Documentation & QA", whose header has no category panel — its
 * individual cards are still clickable).
 */
function FeatureGroupHeader({
  title,
  count,
  panel,
  onOpen,
}: {
  title: string;
  count: string;
  panel?: DetailPanel;
  onOpen: OpenPanel;
}) {
  const inner = (
    <>
      <span className="companion-feature-group-marker" aria-hidden="true" />
      <span className="companion-feature-group-title">{title}</span>
      <span className="companion-feature-group-count">{count}</span>
      {panel && (
        <span className="companion-feature-group-cta" aria-hidden="true">{'</> code'}</span>
      )}
    </>
  );

  if (!panel) {
    return <div className="companion-feature-group-header">{inner}</div>;
  }

  return (
    <button
      type="button"
      className="companion-feature-group-header companion-feature-group-header-button"
      onClick={() => onOpen(panel)}
    >
      {inner}
    </button>
  );
}

/**
 * Features-tab feature card. When `panel` is given the whole card is a button
 * that opens its own per-card code panel; otherwise it renders as a plain card.
 */
function FeatureCard({
  panel,
  icon,
  title,
  desc,
  wide,
  onOpen,
}: {
  panel?: DetailPanel;
  icon: React.ReactNode;
  title: React.ReactNode;
  desc: React.ReactNode;
  wide?: boolean;
  onOpen: OpenPanel;
}) {
  const cls = `companion-feature-card${wide ? ' companion-feature-card-wide' : ''}`;
  const body = (
    <>
      <div className="companion-feature-card-icon">{icon}</div>
      <div className="companion-feature-card-body">
        <div className="companion-feature-card-title">{title}</div>
        <div className="companion-feature-card-desc">{desc}</div>
      </div>
    </>
  );

  if (!panel) {
    return <div className={cls}>{body}</div>;
  }

  return (
    <button type="button" className={`${cls} companion-feature-card-button`} onClick={() => onOpen(panel)}>
      {body}
      <span className="companion-feature-card-cta" aria-hidden="true">{'</>'}</span>
    </button>
  );
}

/** Focused modal showing runnable snippets for one feature card or category. */
function CompanionDetailModal({ panel, onClose }: { panel: DetailPanel; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const paragraphs = panel.blurb.split('\n\n');

  return (
    <div className="companion-detail-overlay" onClick={onClose}>
      <div
        className="companion-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${panel.title} — code examples`}
        onClick={e => e.stopPropagation()}
      >
        <div className="companion-detail-header">
          <h2 className="companion-detail-title">{panel.title}</h2>
          <button className="companion-detail-close" onClick={onClose} aria-label="Close code panel">
            {'×'}
          </button>
        </div>
        <div className="companion-detail-blurb">
          {paragraphs.map((para, i) => <p key={i}>{para}</p>)}
        </div>
        <div className="companion-detail-blocks">
          {panel.blocks.map((block, i) => (
            <CodeBlock key={i} label={block.label}>{block.code}</CodeBlock>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstallQuickstartTab() {
  const [os, setOs] = useState<OS>('macos');

  return (
    <div className="companion-section">
      <div className="companion-install-intro">
        <p className="companion-paragraph">
          From a clean Python environment to your first rendered Venn diagram in
          about a minute. The wheel ships with everything you need for SVG
          output; cairo is only required for PDF / PNG.
        </p>
      </div>

      <div className="companion-install-board">

        <div className="companion-install-step">
          <div className="companion-install-step-num">1</div>
          <div className="companion-install-step-body">
            <div className="companion-install-step-title">Create a virtual environment <span className="companion-install-step-tag">recommended</span></div>
            <p className="companion-install-step-hint">Keeps your project's dependencies isolated from the system Python.</p>
            <CodeBlock label="Shell">{`python -m venv .venv
source .venv/bin/activate          # Linux / macOS
.venv\\Scripts\\activate            # Windows`}</CodeBlock>
          </div>
        </div>

        <div className="companion-install-step">
          <div className="companion-install-step-num">2</div>
          <div className="companion-install-step-body">
            <div className="companion-install-step-title">Install from PyPI</div>
            <p className="companion-install-step-hint">
              The wheel bundles all 44 SVG templates, the five sample datasets,
              and the <code>vdl</code> CLI — no extra setup needed for SVG-only
              workflows.
            </p>
            <CodeBlock label="Shell">pip install venn-diagram-lab</CodeBlock>
          </div>
        </div>

        <div className="companion-install-step">
          <div className="companion-install-step-num">3</div>
          <div className="companion-install-step-body">
            <div className="companion-install-step-title">Install cairo <span className="companion-install-step-tag companion-install-step-tag-optional">optional · only for PDF / PNG</span></div>
            <p className="companion-install-step-hint">
              The PDF and PNG render paths use{' '}
              <a href="https://cairosvg.org/" target="_blank" rel="noopener noreferrer" className="companion-link">cairosvg</a>,
              which links to the cairo C library. Skip this step if you only
              need SVG output.
            </p>
            <div className="companion-install-os-toggle" role="tablist" aria-label="Operating system">
              {(['macos', 'linux', 'windows'] as OS[]).map(o => (
                <button
                  key={o}
                  role="tab"
                  aria-selected={os === o}
                  className={`companion-install-os-btn ${os === o ? 'companion-install-os-btn-active' : ''}`}
                  onClick={() => setOs(o)}
                >
                  {OS_LABELS[o]}
                </button>
              ))}
            </div>
            <CodeBlock label={`Shell · ${OS_LABELS[os]}`}>{CAIRO_CMD[os]}</CodeBlock>
          </div>
        </div>

        <div className="companion-install-step companion-install-step-verify">
          <div className="companion-install-step-num companion-install-step-num-check" aria-hidden="true">{'✓'}</div>
          <div className="companion-install-step-body">
            <div className="companion-install-step-title">Verify the install</div>
            <CodeBlock label="Shell">{`python -c "import venn_diagram_lab as vdl; print(vdl.__version__)"
# 2.0.3`}</CodeBlock>
          </div>
        </div>

      </div>

      <div className="companion-section-divider">
        <span className="companion-section-divider-label">Quickstart paths</span>
      </div>
      <p className="companion-paragraph">
        Three common entry points. Pick the one that matches how your data
        arrives.
      </p>

      <div className="companion-quickstart-grid">

        <div className="companion-quickstart-card" data-quickstart="sample">
          <div className="companion-quickstart-card-header">
            <span className="companion-quickstart-card-badge">30-second</span>
            <h4 className="companion-quickstart-card-title">Bundled sample → Venn + PDF</h4>
          </div>
          <p className="companion-quickstart-card-desc">
            Five curated samples ship with the package — no external files
            needed.
          </p>
          <CodeBlock label="Python">{`from venn_diagram_lab import load_sample, analyze

result = analyze(load_sample("dataset_real_cancer_drivers_4"))
print(result.set_sizes)
# {'Vogelstein': 138, 'COSMIC_CGC': 581,
#  'OncoKB': 1231, 'IntOGen': 633}

result.render_venn().save("cancer_drivers.svg")
result.to_pdf_report("cancer_drivers_report.pdf")`}</CodeBlock>
        </div>

        <div className="companion-quickstart-card" data-quickstart="data">
          <div className="companion-quickstart-card-header">
            <span className="companion-quickstart-card-badge">Your data</span>
            <h4 className="companion-quickstart-card-title">Load CSV / TSV / GMT / GMX / dict</h4>
          </div>
          <p className="companion-quickstart-card-desc">
            Four file formats plus an in-memory dict path — same web tool
            input parity.
          </p>
          <CodeBlock label="Python">{`from venn_diagram_lab import (
    load_csv, load_gmt, load_gmx,
    Dataset, analyze,
)

# Binary 0/1 matrix (one column per set)
ds = load_csv("genes_binary.csv", binary=True)

# Aggregated form (column = set, cells = items)
ds = load_csv("pathways.csv", binary=False)

# Gene Matrix Transposed
ds = load_gmt("hallmark.gmt")

# In-memory
ds = Dataset.from_dict({
    "Set A": ["x", "y", "z"],
    "Set B": ["y", "z", "w"],
})

result = analyze(ds)`}</CodeBlock>
        </div>

        <div className="companion-quickstart-card" data-quickstart="cli">
          <div className="companion-quickstart-card-header">
            <span className="companion-quickstart-card-badge">CLI</span>
            <h4 className="companion-quickstart-card-title">One-shot from the shell</h4>
          </div>
          <p className="companion-quickstart-card-desc">
            No Python session required — built with Typer + Rich for nice help
            output and progress bars.
          </p>
          <CodeBlock label="Shell">{`vdl analyze data.csv --output report.pdf
vdl render data.csv --model edwards-4 \\
    --output venn.svg
vdl --help`}</CodeBlock>
        </div>

      </div>

      <div className="companion-callout">
        <strong>Next:</strong> open the <em>Notebooks</em> tab for twelve
        ready-to-run examples (Quickstart, real cancer driver case study,
        statistics deep-dive, pipeline integration, CLI workflows, plot
        comparison, data validation), or jump to{' '}
        <em>Features</em> for a full breakdown of what's available.
      </div>

    </div>
  );
}

function PythonContent({ activeTab, onOpen }: { activeTab: TabId; onOpen: OpenPanel }) {
  const CAT = COMPANION_DETAIL_PANELS.python;
  const CARD = COMPANION_CARD_PANELS.python;

  if (activeTab === 'overview') {
    return (
      <div className="companion-section">
        <p className="companion-paragraph">
          <strong>venn-diagram-lab</strong> is the headless Python companion to the
          Venn Diagram Lab web tool. It builds, renders, and statistically analyses
          Venn / UpSet diagrams from CSV / TSV / GMT / GMX inputs — using the same
          44 SVG templates, the same intersection / Jaccard / hypergeometric
          statistics, and the same multi-page PDF report layout as the browser app,
          but driven entirely from Python.
        </p>
        <p className="companion-paragraph">
          The package is designed for environments where opening a browser is not
          an option: Jupyter notebooks, Snakemake and Nextflow rules, GitHub
          Actions / GitLab CI jobs, and headless server-side rendering. Outputs
          are <em>byte-equivalent</em> to the web tool's TSV exports — every
          release is parity-tested against the React app, so a notebook and the
          browser produce the same files.
        </p>

        <h3 className="companion-h3">What you get <span className="companion-h3-hint">— click a card for code</span></h3>
        <div className="companion-feature-grid">
          <FeatureCellButton category="analysis" panel={CAT.analysis} icon={'\u{1F4C2}'} title="Analysis" onOpen={onOpen}>
            Load CSV / TSV / GMT / GMX. Compute set sizes, all 2<sup>n</sup>−1 intersections.
          </FeatureCellButton>
          <FeatureCellButton category="stats" panel={CAT.stats} icon={'\u{1F9EE}'} title="Statistics" onOpen={onOpen}>
            Jaccard, Sørensen-Dice, hypergeometric enrichment, BH-FDR correction.
          </FeatureCellButton>
          <FeatureCellButton category="viz" panel={CAT.viz} icon={'\u{1F3A8}'} title="Visualization" onOpen={onOpen}>
            44 SVG templates, area-proportional 2/3-set, UpSet, force-directed network, matplotlib backend.
          </FeatureCellButton>
          <FeatureCellButton category="export" panel={CAT.export} icon={'\u{1F4C4}'} title={<>Reports &amp; Export</>} onOpen={onOpen}>
            Multi-page PDF report; SVG / PNG / TSV exports (parity-tested vs. webapp).
          </FeatureCellButton>
        </div>

        <div className="companion-badges">
          <span className="companion-badge companion-badge-stable">Stable · v2.0.3</span>
          <span className="companion-badge">Python ≥ 3.10</span>
          <span className="companion-badge">12 example notebooks</span>
          <span className="companion-badge">MIT License</span>
        </div>
      </div>
    );
  }

  if (activeTab === 'install') {
    return <InstallQuickstartTab />;
  }

  if (activeTab === 'notebooks') {
    return (
      <div className="companion-section">
        <p className="companion-paragraph">
          Twelve self-contained Jupyter notebooks ship in the
          <code>python/examples/</code> directory of the repository. Each is
          fully reproducible — pick the closest match to your task and adapt.
          All twelve are CI-tested via <code>nbconvert --execute</code> on every
          pull request.
        </p>
        <p className="companion-note">
          Each card has three open paths: <strong>GitHub</strong> renders the
          notebook with full output inline, <strong>nbviewer</strong> gives a
          cleaner read-only view, and <strong>Colab</strong> opens the notebook
          in Google Colab so you can run it interactively in the browser.
        </p>

        <div className="companion-notebook-grid">
          {NOTEBOOKS.map(nb => <NotebookCard key={nb.num} entry={nb} />)}
        </div>

        <div className="companion-callout">
          <strong>Running in Colab:</strong> Colab does not have
          <code>venn-diagram-lab</code> preinstalled, so add a first cell with
          <code>!pip install venn-diagram-lab -q</code> before the imports — then
          everything else runs as-is.
        </div>

        <div className="companion-callout">
          <strong>Running locally?</strong>{' '}
          <code>pip install venn-diagram-lab jupyter</code>, then{' '}
          <code>jupyter notebook python/examples/01_quickstart.ipynb</code>.
        </div>
      </div>
    );
  }

  if (activeTab === 'features') {
    return (
      <div className="companion-section">
        <div className="companion-feature-board">

          <div className="companion-feature-group" data-category="viz">
            <FeatureGroupHeader title="Visualization" count="5 modes" panel={CAT.viz} onOpen={onOpen} />
            <div className="companion-feature-cards">
              <FeatureCard panel={CARD['py-viz-templates']} icon={'\u{1F3A8}'} title="44 SVG templates"
                desc="Every model from the web tool, 2-set to 9-set, bundled in the wheel." onOpen={onOpen} />
              <FeatureCard panel={CARD['py-viz-proportional']} icon={'\u{2696}\u{FE0F}'} title="Area-proportional"
                desc="Analytical 2-set bisection + Wilkinson 2012-style 3-set triangulation." onOpen={onOpen} />
              <FeatureCard panel={CARD['py-viz-upset']} icon={'\u{1F4CA}'} title="UpSet plots"
                desc="matplotlib backend with configurable column ordering and pagination." onOpen={onOpen} />
              <FeatureCard panel={CARD['py-viz-network']} icon={'\u{1F578}\u{FE0F}'} title="Force-directed network"
                desc="NetworkX layout with pairwise edge weighting (count / Jaccard / FE / OC)." onOpen={onOpen} />
              <FeatureCard panel={CARD['py-viz-matplotlib']} icon={'\u{1F4D0}'} title="Matplotlib backend"
                desc="render_venn_mpl / render_share_distribution_mpl / render_cluster_heatmap_mpl + vdl --backend {svg,mpl}." onOpen={onOpen} />
            </div>
          </div>

          <div className="companion-feature-group" data-category="stats">
            <FeatureGroupHeader title="Analysis" count="parity-tested" panel={CAT.stats} onOpen={onOpen} />
            <div className="companion-feature-cards companion-feature-cards-single">
              <FeatureCard panel={CARD['py-stats-methods']} wide icon={'\u{1F9EE}'} title="Statistical methods"
                desc={(
                  <>
                    Set sizes, all 2<sup>n</sup>−1 intersections, Jaccard,
                    Sørensen-Dice, Simpson overlap, hypergeometric enrichment with
                    Benjamini-Hochberg FDR correction. Same algorithms and
                    rounding as the web tool.
                  </>
                )} onOpen={onOpen} />
            </div>
          </div>

          <div className="companion-feature-group" data-category="export">
            <FeatureGroupHeader title="Reports & Export" count="3 formats" panel={CAT.export} onOpen={onOpen} />
            <div className="companion-feature-cards">
              <FeatureCard panel={CARD['py-export-pdf']} icon={'\u{1F4C4}'} title="Multi-page PDF report"
                desc="Same layout as the web tool's exporter — overview, diagrams, statistics, methodology." onOpen={onOpen} />
              <FeatureCard panel={CARD['py-export-tsv']} icon={'\u{1F4CB}'} title="Byte-equivalent TSV"
                desc="Region summary + item matrix writers, parity-tested against the React app." onOpen={onOpen} />
              <FeatureCard panel={CARD['py-export-image']} icon={'\u{1F5BC}\u{FE0F}'} title={<>SVG &amp; PNG output</>}
                desc="Vector SVG via the bundled templates; PNG via cairosvg for raster pipelines." onOpen={onOpen} />
            </div>
          </div>

          <div className="companion-feature-group" data-category="tooling">
            <FeatureGroupHeader title="Developer Tooling" count="3 surfaces" panel={CAT.tooling} onOpen={onOpen} />
            <div className="companion-feature-cards">
              <FeatureCard panel={CARD['py-tool-cli']} icon={'\u{2328}\u{FE0F}'} title={<>Typer CLI <code>vdl</code></>}
                desc="One-shot analyses on the command line; built with Typer + Rich." onOpen={onOpen} />
              <FeatureCard panel={CARD['py-tool-notebooks']} icon={'\u{1F4D3}'} title="8 tested notebooks"
                desc="Quickstart, case studies, stats deep-dive, pipeline integration; CI-executed." onOpen={onOpen} />
              <FeatureCard panel={CARD['py-tool-ci']} icon={'\u{2705}'} title="Multi-OS CI"
                desc="Linux · macOS · Windows × Python 3.10 / 3.11 / 3.12 — green on every release." onOpen={onOpen} />
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="companion-section">
      <div className="companion-link-grid">
        <LinkCard
          icon={'\u{1F4E6}'}
          title="PyPI"
          subtitle="pypi.org/project/venn-diagram-lab"
          cta="Install"
          variant="primary"
          href="https://pypi.org/project/venn-diagram-lab/"
        />
        <LinkCard
          icon={'\u{1F4BB}'}
          title="GitHub Repository"
          subtitle="ZoliQua/Venn-Diagram-Lab"
          cta="Source"
          href={REPO_BASE}
        />
        <LinkCard
          icon={'\u{1F4D6}'}
          title="Documentation"
          subtitle="python/ README on GitHub"
          cta="Read"
          href={`${REPO_BASE}/tree/main/python#readme`}
        />
        <LinkCard
          icon={'\u{1F4DD}'}
          title="Changelog"
          subtitle="python/CHANGELOG.md"
          cta="History"
          href={`${REPO_BASE}/blob/main/python/CHANGELOG.md`}
        />
        <LinkCard
          icon={'\u{1F41B}'}
          title="Issues & Feature Requests"
          subtitle="GitHub issue tracker"
          cta="Report"
          href={`${REPO_BASE}/issues`}
        />
        <LinkCard
          icon={'\u{1F4D2}'}
          title="Example Notebooks"
          subtitle="python/examples/ — 12 notebooks"
          cta="Browse"
          href={`${REPO_BASE}/tree/main/python/examples`}
        />
      </div>
    </div>
  );
}

type RInstallSource = 'github' | 'cran' | 'bioconductor';

function RInstallTab() {
  const [src, setSrc] = useState<RInstallSource>('cran');

  return (
    <div className="companion-section">
      <div className="companion-install-intro">
        <p className="companion-paragraph">
          <strong>vennDiagramLab 2.0.5 is on CRAN</strong> — just <code>install.packages("vennDiagramLab")</code>
          and you are ready to go. The Bioconductor submission is in
          moderation; CRAN is the recommended install channel.
          The GitHub install path remains available for the development HEAD.
        </p>
      </div>

      <div className="companion-install-board">

        <div className="companion-install-step">
          <div className="companion-install-step-num">1</div>
          <div className="companion-install-step-body">
            <div className="companion-install-step-title">Install R 4.2 or newer</div>
            <p className="companion-install-step-hint">
              Available from{' '}
              <a href="https://www.r-project.org/" target="_blank" rel="noopener noreferrer" className="companion-link">r-project.org</a>{' '}
              or via your platform's package manager.
            </p>
            <CodeBlock label="Shell">{`# macOS
brew install r

# Debian / Ubuntu
sudo apt install r-base`}</CodeBlock>
          </div>
        </div>

        <div className="companion-install-step">
          <div className="companion-install-step-num">2</div>
          <div className="companion-install-step-body">
            <div className="companion-install-step-title">
              Install vennDiagramLab
              <span className={`companion-install-step-tag ${src === 'bioconductor' ? 'companion-install-step-tag-optional' : ''}`}>
                {src === 'cran' && 'recommended · live on CRAN'}
                {src === 'github' && 'development HEAD'}
                {src === 'bioconductor' && 'pending · awaiting Bioc moderation'}
              </span>
            </div>
            <p className="companion-install-step-hint">
              Three install paths. CRAN is the default for end users; GitHub
              gives you the latest unreleased commit; Bioconductor is queued
              for moderation but not yet live.
            </p>
            <div className="companion-install-os-toggle" role="tablist" aria-label="Install source">
              <button
                role="tab"
                aria-selected={src === 'cran'}
                className={`companion-install-os-btn ${src === 'cran' ? 'companion-install-os-btn-active' : ''}`}
                onClick={() => setSrc('cran')}
              >
                From CRAN (live)
              </button>
              <button
                role="tab"
                aria-selected={src === 'github'}
                className={`companion-install-os-btn ${src === 'github' ? 'companion-install-os-btn-active' : ''}`}
                onClick={() => setSrc('github')}
              >
                From GitHub (HEAD)
              </button>
              <button
                role="tab"
                aria-selected={src === 'bioconductor'}
                className={`companion-install-os-btn ${src === 'bioconductor' ? 'companion-install-os-btn-active' : ''}`}
                onClick={() => setSrc('bioconductor')}
              >
                From Bioconductor (pending)
              </button>
            </div>
            {src === 'cran' && (
              <>
                <CodeBlock label="R Console · CRAN">{`install.packages("vennDiagramLab")`}</CodeBlock>
                <p className="companion-note">
                  Live on CRAN as of <strong>2026-05-18</strong> (current
                  version: <strong>2.0.5</strong>). Pre-built binaries are
                  available for the three current major Windows / macOS / Linux
                  R versions; pass <code>type = "source"</code> for the source
                  tarball. CRAN-minted DOI:{' '}
                  <a href="https://doi.org/10.32614/CRAN.package.vennDiagramLab" target="_blank" rel="noopener noreferrer" className="companion-link">
                    10.32614/CRAN.package.vennDiagramLab
                  </a>.
                </p>
              </>
            )}
            {src === 'github' && (
              <>
                <CodeBlock label="R Console · GitHub">{`# install.packages("remotes")
remotes::install_github(
  "ZoliQua/Venn-Diagram-Lab",
  subdir = "r"
)`}</CodeBlock>
                <p className="companion-note">
                  Pulls the current <code>main</code> branch HEAD — useful if
                  you need a fix that has not made it into a CRAN release yet.
                  Pin a release tag with <code>ref = "r-v2.0.5"</code> for
                  reproducibility.
                </p>
              </>
            )}
            {src === 'bioconductor' && (
              <>
                <pre className="companion-code companion-code-pending"><code>{`if (!require("BiocManager", quietly = TRUE))
    install.packages("BiocManager")

BiocManager::install("vennDiagramLab")`}</code></pre>
                <p className="companion-note">
                  Submitted via the{' '}
                  <a href="https://github.com/Bioconductor/Contributions/issues" target="_blank" rel="noopener noreferrer" className="companion-link">
                    Bioconductor / Contributions
                  </a>{' '}
                  issue tracker; awaiting moderation. The package is tagged
                  with <code>biocViews: Visualization, GeneSetEnrichment,
                  Software</code>. Until accepted, use <em>From CRAN</em>.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="companion-install-step companion-install-step-verify">
          <div className="companion-install-step-num companion-install-step-num-check" aria-hidden="true">{'✓'}</div>
          <div className="companion-install-step-body">
            <div className="companion-install-step-title">Verify the install</div>
            <CodeBlock label="R Console">{`library(vennDiagramLab)
packageVersion("vennDiagramLab")
# [1] '2.0.5'

vdl_version()
# [1] "2.0.5"`}</CodeBlock>
          </div>
        </div>

      </div>

      <div className="companion-section-divider">
        <span className="companion-section-divider-label">Quickstart paths</span>
      </div>
      <p className="companion-paragraph">
        Three usage patterns matching the Python companion. All functions
        below ship in v2.0.0 and are exercised by the 8 RMarkdown vignettes
        bundled in the package — open them with{' '}
        <code>browseVignettes("vennDiagramLab")</code>.
      </p>

      <div className="companion-quickstart-grid">

        <div className="companion-quickstart-card" data-quickstart="sample">
          <div className="companion-quickstart-card-header">
            <span className="companion-quickstart-card-badge">30-second</span>
            <h4 className="companion-quickstart-card-title">Bundled sample → full workflow</h4>
          </div>
          <p className="companion-quickstart-card-desc">
            Five curated samples ship with the package. The block below
            produces a Venn SVG, an UpSet plot, a network plot, and a
            multi-page PDF report from one dataset.
          </p>
          <CodeBlock label="R">{`library(vennDiagramLab)
library(ggplot2)

ds <- load_sample("dataset_real_cancer_drivers_4")
result <- analyze(ds)
result@set_sizes
# Vogelstein  COSMIC_CGC      OncoKB     IntOGen
#        138         581        1231         633

# Venn diagram (returns SVG character — write to file)
writeLines(render_venn_svg(result), "cancer.svg")

# UpSet plot (returns ggplot)
ggsave("upset.png",   render_upset(result),   width = 8, height = 5)

# Force-directed network (returns ggraph / ggplot)
ggsave("network.png", render_network(result, edge_metric = "jaccard"))

# Multi-page PDF report
to_pdf_report(result, path = "cancer_drivers_report.pdf")

# Byte-equivalent TSV exports (parity-tested vs. webapp)
to_region_summary_tsv(result, "summary.tsv")
to_matrix_tsv(result,         "items.tsv")
to_statistics_tsv(result,     "stats.tsv")`}</CodeBlock>
        </div>

        <div className="companion-quickstart-card" data-quickstart="data">
          <div className="companion-quickstart-card-header">
            <span className="companion-quickstart-card-badge">Your data</span>
            <h4 className="companion-quickstart-card-title">Load CSV / TSV / GMT / GMX</h4>
          </div>
          <p className="companion-quickstart-card-desc">
            Same four input formats as the Python package and the web tool —
            byte-equivalent parsing.
          </p>
          <CodeBlock label="R">{`library(vennDiagramLab)

# CSV — binary 0/1 matrix (one column per set)
ds <- load_csv("genes_binary.csv", binary = TRUE)

# CSV — aggregated (column = set, cells = items)
ds <- load_csv("pathways.csv", binary = FALSE)

# TSV variants
ds <- load_tsv("genes_binary.tsv", binary = TRUE)

# Gene Matrix (Transposed)
ds <- load_gmt("hallmark.gmt")
ds <- load_gmx("hallmark.gmx")

result <- analyze(ds)               # picks a model automatically
result <- analyze(ds, model = "edwards-4")   # or pin a specific model`}</CodeBlock>
        </div>

        <div className="companion-quickstart-card" data-quickstart="cli">
          <div className="companion-quickstart-card-header">
            <span className="companion-quickstart-card-badge">tidyverse</span>
            <h4 className="companion-quickstart-card-title">ggplot2 layer + broom integration</h4>
          </div>
          <p className="companion-quickstart-card-desc">
            <code>geom_venn()</code> drops a Venn straight into a ggplot stack;
            <code>tidy()</code> / <code>glance()</code> / <code>augment()</code>
            give long-format region tables for downstream piping.
          </p>
          <CodeBlock label="R">{`library(vennDiagramLab)
library(ggplot2)
library(broom)

result <- analyze(load_sample("dataset_real_cancer_drivers_4"))

# ggplot2 layer (R >= 4.6 for ComplexUpset compatibility)
ggplot() +
  geom_venn(data = result) +
  theme_void() +
  ggtitle("Cancer driver overlap (4 sources)")

# broom: long-format region table for downstream piping
tidy(result)      # one row per region
glance(result)    # one-row summary (n_sets, n_items, ...)
augment(result)   # item-level membership matrix`}</CodeBlock>
        </div>

      </div>

      <div className="companion-callout">
        <strong>Release status:</strong> <code>vennDiagramLab 2.0.5</code> is
        on CRAN (published 2026-05-18) and is the recommended install
        channel. The Bioconductor submission is still in moderation on the{' '}
        <a href="https://github.com/Bioconductor/Contributions/issues" target="_blank" rel="noopener noreferrer" className="companion-link">
          Contributions
        </a>{' '}
        tracker; the package is bioc-compatible (BiocCheck WARNING-clean,
        biocViews set) but the queue is non-deterministic.
      </div>
    </div>
  );
}

function RContent({ activeTab, onOpen }: { activeTab: TabId; onOpen: OpenPanel }) {
  const CAT = COMPANION_DETAIL_PANELS.r;
  const CARD = COMPANION_CARD_PANELS.r;

  if (activeTab === 'overview') {
    return (
      <div className="companion-section">
        <p className="companion-paragraph">
          <strong>vennDiagramLab</strong> is the R companion to the Venn
          Diagram Lab web tool and to the Python <code>venn-diagram-lab</code>
          package. It is feature-complete and provides headless Venn /
          UpSet / network diagram analysis and rendering for bioinformaticians
          and biostatisticians who work natively in R — same 44 SVG models,
          same statistics, byte-equivalent TSV exports, plus first-class
          integration with ggplot2 (<code>geom_venn()</code>), broom
          (<code>tidy()</code> / <code>glance()</code> / <code>augment()</code>),
          tidygraph, and ComplexUpset.
        </p>
        <p className="companion-paragraph">
          The package ships with 8 RMarkdown vignettes executed on every
          R&nbsp;CMD&nbsp;check, a pkgdown documentation site, full
          BiocCheck WARNING-clean output, and a 590+ test suite (90+ parity
          tests against the web tool's exports).{' '}
          <strong>The package is on CRAN</strong>{' '}
          install with <code>install.packages("vennDiagramLab")</code>, or
          see the <em>Install &amp; Quickstart</em> tab for the GitHub-HEAD
          and Bioconductor paths.
        </p>

        <h3 className="companion-h3">What you get <span className="companion-h3-hint">— click a card for code</span></h3>
        <div className="companion-feature-grid">
          <FeatureCellButton category="analysis" panel={CAT.analysis} icon={'\u{1F4C2}'} title="Analysis" onOpen={onOpen}>
            Load CSV / TSV / GMT / GMX, four S4 classes, <code>analyze()</code>
            computes set sizes and all 2<sup>n</sup>−1 intersections.
          </FeatureCellButton>
          <FeatureCellButton category="stats" panel={CAT.stats} icon={'\u{1F9EE}'} title="Statistics" onOpen={onOpen}>
            Jaccard, Sørensen-Dice, overlap coefficient, hypergeometric
            p-values, fold enrichment, BH-FDR — JS-style float parity with
            the web tool.
          </FeatureCellButton>
          <FeatureCellButton category="viz" panel={CAT.viz} icon={'\u{1F3A8}'} title="Visualization" onOpen={onOpen}>
            44 SVG templates via xml2, area-proportional 2/3-set, UpSet
            via ComplexUpset, force-directed network via ggraph + tidygraph,
            ggplot2 <code>geom_venn()</code> layer.
          </FeatureCellButton>
          <FeatureCellButton category="export" panel={CAT.export} icon={'\u{1F4C4}'} title={<>Reports &amp; Export</>} onOpen={onOpen}>
            Multi-page PDF report via <code>grDevices::pdf</code> +
            patchwork; byte-equivalent TSV writers (region summary, item
            matrix, statistics) parity-tested against the web tool.
          </FeatureCellButton>
        </div>

        <div className="companion-badges">
          <span className="companion-badge companion-badge-stable">On CRAN · v2.0.5</span>
          <span className="companion-badge companion-badge-pending">Bioconductor in moderation</span>
          <span className="companion-badge">R ≥ 4.2</span>
          <span className="companion-badge">8 vignettes</span>
          <span className="companion-badge">590+ tests</span>
          <span className="companion-badge">MIT License</span>
        </div>
      </div>
    );
  }

  if (activeTab === 'install') {
    return <RInstallTab />;
  }

  if (activeTab === 'features') {
    return (
      <div className="companion-section">
        <div className="companion-feature-board">

          <div className="companion-feature-group" data-category="viz">
            <FeatureGroupHeader title="Visualization" count="4 modes" panel={CAT.viz} onOpen={onOpen} />
            <div className="companion-feature-cards">
              <FeatureCard panel={CARD['r-viz-templates']} icon={'\u{1F3A8}'} title="44 SVG templates"
                desc={<>Every model from the web tool, 2-set to 9-set, bundled in the CRAN tarball. <code>render_venn_svg()</code> templates them via <code>xml2</code>.</>} onOpen={onOpen} />
              <FeatureCard panel={CARD['r-viz-proportional']} icon={'\u{2696}\u{FE0F}'} title="Area-proportional"
                desc={<>Analytical 2-set + approximate 3-set via <code>solve_2set()</code> / <code>solve_3set()</code> / <code>generate_proportional_svg()</code>.</>} onOpen={onOpen} />
              <FeatureCard panel={CARD['r-viz-upset']} icon={'\u{1F4CA}'} title="UpSet plots"
                desc={<><code>render_upset()</code> via <code>ComplexUpset</code>; depth / heatmap / custom color modes; size / degree sort; threshold cutoffs.</>} onOpen={onOpen} />
              <FeatureCard panel={CARD['r-viz-network']} icon={'\u{1F578}\u{FE0F}'} title="Force-directed network"
                desc={<><code>render_network()</code> via <code>ggraph</code> + <code>tidygraph</code>; 4 edge metrics (intersection / Jaccard / fold enrichment / overlap coefficient).</>} onOpen={onOpen} />
            </div>
          </div>

          <div className="companion-feature-group" data-category="stats">
            <FeatureGroupHeader title="Analysis & Statistics" count="parity-tested" panel={CAT.stats} onOpen={onOpen} />
            <div className="companion-feature-cards companion-feature-cards-single">
              <FeatureCard panel={CARD['r-stats-s4']} wide icon={'\u{1F9EE}'} title="S4 result types + stateless metric helpers"
                desc={(
                  <>
                    Four S4 classes (<code>VennDataset</code>,
                    <code>RegionData</code>, <code>RegionResult</code>,
                    <code>StatisticsResult</code>) carry the input, the
                    enumerated regions, and the pairwise stats.
                    <code>analyze()</code> resolves the model and computes
                    set sizes + all 2<sup>n</sup>−1 intersections. Stateless
                    helpers — <code>jaccard()</code>, <code>dice()</code>,
                    <code>overlap_coefficient()</code>, <code>fold_enrichment()</code>,
                    <code>hypergeometric_p_value()</code>, <code>bh_fdr()</code>,
                    <code>compute_pairwise()</code> — produce the same
                    numbers as the web tool (JS-style float parity).
                  </>
                )} onOpen={onOpen} />
            </div>
          </div>

          <div className="companion-feature-group" data-category="export">
            <FeatureGroupHeader title="Reports & Export" count="3 formats" panel={CAT.export} onOpen={onOpen} />
            <div className="companion-feature-cards">
              <FeatureCard panel={CARD['r-export-pdf']} icon={'\u{1F4C4}'} title="Multi-page PDF report"
                desc={<><code>to_pdf_report()</code> via <code>grDevices::pdf</code> + <code>patchwork</code> — same layout as the web tool's exporter (overview · venn + UpSet · statistics · network · methodology).</>} onOpen={onOpen} />
              <FeatureCard panel={CARD['r-export-tsv']} icon={'\u{1F4CB}'} title="Byte-equivalent TSV"
                desc={<><code>to_region_summary_tsv()</code> · <code>to_matrix_tsv()</code> · <code>to_statistics_tsv()</code> — 12 byte-parity tests against shared Python golden fixtures.</>} onOpen={onOpen} />
              <FeatureCard panel={CARD['r-export-image']} icon={'\u{1F5BC}\u{FE0F}'} title={<>SVG &amp; PNG output</>}
                desc={<>Vector SVG via the bundled templates; PNG via <code>rsvg</code> + <code>ggsave()</code> for raster pipelines.</>} onOpen={onOpen} />
            </div>
          </div>

          <div className="companion-feature-group" data-category="tooling">
            <FeatureGroupHeader title="Tidyverse & Pipelines" count="2 integrations" panel={CAT.tidyverse} onOpen={onOpen} />
            <div className="companion-feature-cards">
              <FeatureCard panel={CARD['r-tid-ggplot']} icon={'\u{1F4DC}'} title="ggplot2 layer"
                desc={<><code>geom_venn()</code> drops a venn straight into a <code>ggplot</code> stack. Compose with themes, titles, and other layers.</>} onOpen={onOpen} />
              <FeatureCard panel={CARD['r-tid-broom']} icon={'\u{1F9F9}'} title="broom S3 methods"
                desc={<><code>tidy()</code> / <code>glance()</code> / <code>augment()</code> on <code>RegionResult</code> return tibbles ready for <code>dplyr</code> / <code>targets</code> / <code>drake</code> pipelines.</>} onOpen={onOpen} />
            </div>
          </div>

          <div className="companion-feature-group" data-category="tooling">
            <FeatureGroupHeader title="Documentation & QA" count="3 surfaces" onOpen={onOpen} />
            <div className="companion-feature-cards">
              <FeatureCard panel={CARD['r-doc-vignettes']} icon={'\u{1F4D3}'} title="8 vignettes"
                desc={<>Quickstart, real cancer drivers, proportional, UpSet vs. venn vs. network, statistics deep-dive, broom + dplyr + targets, PDF reports, custom styling. Open via <code>browseVignettes()</code>.</>} onOpen={onOpen} />
              <FeatureCard panel={CARD['r-doc-pkgdown']} icon={'\u{1F4DA}'} title="pkgdown reference site"
                desc="Full function reference + rendered vignette gallery, published with pkgdown." onOpen={onOpen} />
              <FeatureCard panel={CARD['r-doc-ci']} icon={'\u{2705}'} title="Multi-OS CI · 590+ tests"
                desc="R CMD check matrix: Linux release / devel / oldrel × macOS × Windows. BiocCheck WARNING-clean. Vignettes executed on every push." onOpen={onOpen} />
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="companion-section">
      <div className="companion-link-grid">
        <LinkCard
          icon={'\u{1F4E6}'}
          title="CRAN — vennDiagramLab"
          subtitle="CRAN.R-project.org/package=vennDiagramLab"
          cta="Install"
          variant="primary"
          href="https://CRAN.R-project.org/package=vennDiagramLab"
        />
        <div className="companion-link-card companion-link-card-disabled" title="Submitted — awaiting Bioconductor moderation">
          <span className="companion-link-card-icon" aria-hidden="true">{'\u{1F9EC}'}</span>
          <span className="companion-link-card-body">
            <span className="companion-link-card-title">Bioconductor <span className="companion-link-pending">(pending)</span></span>
            <span className="companion-link-card-subtitle">bioconductor.org/packages/vennDiagramLab</span>
          </span>
          <span className="companion-link-card-cta">Soon</span>
        </div>
        <LinkCard
          icon={'\u{1F517}'}
          title="DOI · 10.32614/CRAN.package.vennDiagramLab"
          subtitle="CRAN-minted DOI for the R package"
          cta="DOI"
          href="https://doi.org/10.32614/CRAN.package.vennDiagramLab"
        />
        <LinkCard
          icon={'\u{1F4BB}'}
          title="GitHub — r/ subdirectory"
          subtitle="ZoliQua/Venn-Diagram-Lab"
          cta="Source"
          href={`${REPO_BASE}/tree/main/r`}
        />
        <LinkCard
          icon={'\u{1F310}'}
          title="pkgdown documentation site"
          subtitle="zoliqua.github.io/Venn-Diagram-Lab/r"
          cta="Browse"
          href="https://zoliqua.github.io/Venn-Diagram-Lab/r/"
        />
        <LinkCard
          icon={'\u{1F4D6}'}
          title="README"
          subtitle="r/README.md"
          cta="Read"
          href={`${REPO_BASE}/blob/main/r/README.md`}
        />
        <LinkCard
          icon={'\u{1F4DD}'}
          title="NEWS / Changelog"
          subtitle="r/NEWS.md"
          cta="History"
          href={`${REPO_BASE}/blob/main/r/NEWS.md`}
        />
        <LinkCard
          icon={'\u{1F4DA}'}
          title="Vignettes (8 RMarkdown)"
          subtitle="r/vignettes/"
          cta="Examples"
          href={`${REPO_BASE}/tree/main/r/vignettes`}
        />
        <LinkCard
          icon={'\u{1F516}'}
          title="Release tag r-v2.0.5"
          subtitle="GitHub release notes"
          cta="Release"
          href={`${REPO_BASE}/releases/tag/r-v2.0.5`}
        />
        <LinkCard
          icon={'\u{1F41B}'}
          title="Issues & Feature Requests"
          subtitle="GitHub issue tracker"
          cta="Report"
          href={`${REPO_BASE}/issues`}
        />
      </div>
    </div>
  );
}

function NodeInstallTab() {
  return (
    <div className="companion-section">
      <div className="companion-install-intro">
        <p className="companion-paragraph">
          From a clean Node.js 18+ environment to your first rendered Venn
          diagram in under a minute. The package ships ESM + CJS builds,
          TypeScript declarations, all 44 SVG templates, five sample datasets,
          and the <code>vdl</code> CLI — no extra setup needed for SVG-only
          workflows.
        </p>
      </div>

      <div className="companion-install-board">

        <div className="companion-install-step">
          <div className="companion-install-step-num">1</div>
          <div className="companion-install-step-body">
            <div className="companion-install-step-title">Install from npm</div>
            <p className="companion-install-step-hint">
              Installs the library, the bundled assets, and the{' '}
              <code>vdl</code> CLI binary. Requires Node.js 18 or newer.
            </p>
            <CodeBlock label="Shell">npm install venn-diagram-lab</CodeBlock>
          </div>
        </div>

        <div className="companion-install-step companion-install-step-verify">
          <div className="companion-install-step-num companion-install-step-num-check" aria-hidden="true">{'✓'}</div>
          <div className="companion-install-step-body">
            <div className="companion-install-step-title">Verify the install</div>
            <CodeBlock label="Shell">{`npx vdl --version
# 2.4.0`}</CodeBlock>
          </div>
        </div>

      </div>

      <div className="companion-section-divider">
        <span className="companion-section-divider-label">Quickstart paths</span>
      </div>
      <p className="companion-paragraph">
        Three common entry points. Pick the one that matches how your data
        arrives.
      </p>

      <div className="companion-quickstart-grid">

        <div className="companion-quickstart-card" data-quickstart="sample">
          <div className="companion-quickstart-card-header">
            <span className="companion-quickstart-card-badge">30-second</span>
            <h4 className="companion-quickstart-card-title">Bundled sample → TSV + SVG + PNG</h4>
          </div>
          <p className="companion-quickstart-card-desc">
            Five curated datasets ship inside the package — no external files
            needed.
          </p>
          <CodeBlock label="TypeScript">{`import { writeFileSync } from 'node:fs';
import {
  loadSampleText,
  analyzeCsvText,
  toRegionSummaryTsv,
  toVennSvg,
  svgToPng,
} from 'venn-diagram-lab';

const result = analyzeCsvText(
  loadSampleText('dataset_real_cancer_drivers_4')
);
// result.setNames → ['Vogelstein', 'COSMIC_CGC', 'OncoKB', 'IntOGen']

writeFileSync('summary.tsv', toRegionSummaryTsv(result), 'utf8');

const svg = toVennSvg(result, 'venn-4-set');
writeFileSync('venn.svg', svg, 'utf8');

const png = svgToPng(svg, { fitWidth: 1200 });
writeFileSync('venn.png', png);`}</CodeBlock>
        </div>

        <div className="companion-quickstart-card" data-quickstart="data">
          <div className="companion-quickstart-card-header">
            <span className="companion-quickstart-card-badge">Your data</span>
            <h4 className="companion-quickstart-card-title">Load CSV / TSV / GMT / GMX</h4>
          </div>
          <p className="companion-quickstart-card-desc">
            Four input formats, same auto-detection as the web tool — binary
            0/1 matrix or aggregated (column = set, cells = items).
          </p>
          <CodeBlock label="TypeScript">{`import { readFileSync } from 'node:fs';
import {
  analyzeCsvText,
  analyzeGmtText,
  analyzeGmxText,
  toRegionSummaryTsv,
  toMatrixTsv,
  toStatisticsTsv,
} from 'venn-diagram-lab';

// CSV / TSV — auto-detects binary vs. aggregated
const result = analyzeCsvText(
  readFileSync('genes.tsv', 'utf8')
);

// GMT / GMX gene-set formats
const gmtResult = analyzeGmtText(readFileSync('hallmark.gmt', 'utf8'));
const gmxResult = analyzeGmxText(readFileSync('hallmark.gmx', 'utf8'));

// Export all three TSVs
writeFileSync('summary.tsv',    toRegionSummaryTsv(result), 'utf8');
writeFileSync('items.tsv',      toMatrixTsv(result),        'utf8');
writeFileSync('statistics.tsv', toStatisticsTsv(result),    'utf8');`}</CodeBlock>
        </div>

        <div className="companion-quickstart-card" data-quickstart="cli">
          <div className="companion-quickstart-card-header">
            <span className="companion-quickstart-card-badge">CLI</span>
            <h4 className="companion-quickstart-card-title">One-shot from the shell</h4>
          </div>
          <p className="companion-quickstart-card-desc">
            No Node session required — <code>vdl</code> ships with the package
            and covers all analysis and render surfaces.
          </p>
          <CodeBlock label="Shell">{`# Use without a global install
npx vdl analyze genes.tsv
npx vdl render venn genes.tsv --model venn-4-set --out venn.svg

# Or install globally
npm install -g venn-diagram-lab
vdl render network genes.tsv --metric jaccard --out network.png
vdl --help`}</CodeBlock>
        </div>

      </div>

      <div className="companion-callout">
        <strong>Next:</strong> jump to the <em>Features</em> tab for a full
        breakdown of every render kind, export format, and CLI flag, or visit
        the <em>Links</em> tab for the npm page and the full User Guide.
      </div>

    </div>
  );
}

function NodeContent({ activeTab, onOpen }: { activeTab: TabId; onOpen: OpenPanel }) {
  const CAT = COMPANION_DETAIL_PANELS.node;
  const CARD = COMPANION_CARD_PANELS.node;

  if (activeTab === 'overview') {
    return (
      <div className="companion-section">
        <p className="companion-paragraph">
          <strong>venn-diagram-lab</strong> is the headless Node.js/TypeScript
          companion to the Venn Diagram Lab web tool. It shares the same core
          analysis math, the same 44 SVG templates, and a byte-equivalent TSV
          export contract with the web tool and with the Python and R companion
          packages — but runs entirely in Node.js without a browser.
        </p>
        <p className="companion-paragraph">
          The package ships ESM + CJS builds with full TypeScript type
          declarations, making it a drop-in for TypeScript scripts, CI jobs,
          and server-side pipelines. Outputs are <em>byte-identical</em> to the
          web tool's TSV exports — every release is parity-tested across all
          four surfaces, so a Node script and the browser produce the same
          files. Requires Node.js ≥ 18.
        </p>

        <h3 className="companion-h3">What you get <span className="companion-h3-hint">— click a card for code</span></h3>
        <div className="companion-feature-grid">
          <FeatureCellButton category="analysis" panel={CAT.analysis} icon={'\u{1F4C2}'} title="Analysis" onOpen={onOpen}>
            Load CSV / TSV / GMT / GMX. Compute set sizes, all 2<sup>n</sup>−1 intersections, auto-detect binary vs. aggregated mode.
          </FeatureCellButton>
          <FeatureCellButton category="stats" panel={CAT.stats} icon={'\u{1F9EE}'} title="Statistics" onOpen={onOpen}>
            Pairwise Jaccard, Dice, fold enrichment, hypergeometric p-values with BH-FDR — byte-equivalent to the web tool.
          </FeatureCellButton>
          <FeatureCellButton category="viz" panel={CAT.viz} icon={'\u{1F3A8}'} title="Visualization" onOpen={onOpen}>
            7 SVG renderers: 44 templates, area-proportional 2/3-set, UpSet, network, share-dist, enrichment bar & lollipop.
          </FeatureCellButton>
          <FeatureCellButton category="export" panel={CAT.export} icon={'\u{1F4C4}'} title={<>Reports &amp; Export</>} onOpen={onOpen}>
            Byte-equivalent TSV exports + PNG (sync) and single-page PDF (async) via svgToPng / svgToPdf.
          </FeatureCellButton>
        </div>

        <div className="companion-badges">
          <span className="companion-badge companion-badge-stable">Stable · v2.4.0</span>
          <span className="companion-badge">Node ≥ 18</span>
          <span className="companion-badge">ESM + CJS + TS types</span>
          <span className="companion-badge">MIT License</span>
        </div>
      </div>
    );
  }

  if (activeTab === 'install') {
    return <NodeInstallTab />;
  }

  if (activeTab === 'features') {
    return (
      <div className="companion-section">
        <div className="companion-feature-board">

          <div className="companion-feature-group" data-category="viz">
            <FeatureGroupHeader title="Visualization" count="7 renderers" panel={CAT.viz} onOpen={onOpen} />
            <div className="companion-feature-cards">
              <FeatureCard panel={CARD['nd-viz-templates']} icon={'\u{1F3A8}'} title="44 SVG templates"
                desc="Every model from the web tool, 2-set to 9-set, bundled in the npm package. toVennSvg() fills them with counts and names." onOpen={onOpen} />
              <FeatureCard panel={CARD['nd-viz-proportional']} icon={'\u{2696}\u{FE0F}'} title="Area-proportional"
                desc="toProportionalSvg() draws circles scaled to region sizes. Analytical 2-set layout; approximate 3-set." onOpen={onOpen} />
              <FeatureCard panel={CARD['nd-viz-upset']} icon={'\u{1F4CA}'} title="UpSet plots"
                desc="toUpsetSvg() — print-optimized matrix + intersection bars, up to 20 columns." onOpen={onOpen} />
              <FeatureCard panel={CARD['nd-viz-network']} icon={'\u{1F578}\u{FE0F}'} title="Force-directed network"
                desc="toNetworkSvg() — pairwise edge weighting: intersection, jaccard, foldEnrichment, overlapCoeff." onOpen={onOpen} />
              <FeatureCard panel={CARD['nd-viz-raster']} icon={'\u{1F5BC}\u{FE0F}'} title={<>PNG &amp; PDF output</>}
                desc="svgToPng() (sync) and svgToPdf() (async) — rasterize any SVG render with fitWidth scaling." onOpen={onOpen} />
            </div>
          </div>

          <div className="companion-feature-group" data-category="stats">
            <FeatureGroupHeader title="Analysis & Statistics" count="parity-tested" panel={CAT.stats} onOpen={onOpen} />
            <div className="companion-feature-cards companion-feature-cards-single">
              <FeatureCard panel={CARD['nd-stats-methods']} wide icon={'\u{1F9EE}'} title="Statistical methods"
                desc={(
                  <>
                    Set sizes, all 2<sup>n</sup>−1 intersections, pairwise
                    Jaccard, Sørensen-Dice, fold enrichment, hypergeometric
                    p-values with Benjamini-Hochberg FDR correction. Same
                    algorithms and rounding as the web tool.
                  </>
                )} onOpen={onOpen} />
            </div>
          </div>

          <div className="companion-feature-group" data-category="export">
            <FeatureGroupHeader title="Export" count="3 TSV + raster" panel={CAT.export} onOpen={onOpen} />
            <div className="companion-feature-cards">
              <FeatureCard panel={CARD['nd-export-tsv']} icon={'\u{1F4CB}'} title="Byte-equivalent TSV"
                desc="toRegionSummaryTsv · toMatrixTsv · toStatisticsTsv — identical bytes to the web tool's Export buttons." onOpen={onOpen} />
              <FeatureCard panel={CARD['nd-export-png']} icon={'\u{1F4F7}'} title="PNG (sync)"
                desc="svgToPng(svg, { fitWidth? }) — synchronous, returns Uint8Array via @resvg/resvg-js." onOpen={onOpen} />
              <FeatureCard panel={CARD['nd-export-pdf']} icon={'\u{1F4C4}'} title="PDF (async, single-page)"
                desc="svgToPdf(svg, { fitWidth? }) — async Promise<Uint8Array>; page sized to SVG dimensions." onOpen={onOpen} />
            </div>
          </div>

          <div className="companion-feature-group" data-category="tooling">
            <FeatureGroupHeader title="Developer Tooling" count="2 surfaces" panel={CAT.tooling} onOpen={onOpen} />
            <div className="companion-feature-cards">
              <FeatureCard panel={CARD['nd-tool-cli']} icon={'\u{2328}\u{FE0F}'} title={<>CLI <code>vdl</code></>}
                desc="Bundled binary: analyze + 7 render kinds; .svg/.png/.pdf inferred from --out extension." onOpen={onOpen} />
              <FeatureCard panel={CARD['nd-tool-types']} icon={'\u{1F4D0}'} title="TypeScript types & ESM/CJS"
                desc="Full type declarations + ESM and CJS builds; works in import and require() environments (Node ≥ 18)." onOpen={onOpen} />
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="companion-section">
      <div className="companion-link-grid">
        <LinkCard
          icon={'\u{1F4E6}'}
          title="npm — venn-diagram-lab"
          subtitle="npmjs.com/package/venn-diagram-lab"
          cta="Install"
          variant="primary"
          href="https://www.npmjs.com/package/venn-diagram-lab"
        />
        <LinkCard
          icon={'\u{1F4BB}'}
          title="GitHub — packages/node"
          subtitle="ZoliQua/Venn-Diagram-Lab · packages/node"
          cta="Source"
          href={`${REPO_BASE}/tree/main/packages/node`}
        />
        <LinkCard
          icon={'\u{1F4D6}'}
          title="User Guide"
          subtitle="packages/node/user-guide/USER_GUIDE.md"
          cta="Read"
          href={`${REPO_BASE}/blob/main/packages/node/user-guide/USER_GUIDE.md`}
        />
        <LinkCard
          icon={'\u{1F4D2}'}
          title="README"
          subtitle="packages/node/README.md"
          cta="Read"
          href={`${REPO_BASE}/blob/main/packages/node/README.md`}
        />
        <LinkCard
          icon={'\u{1F41B}'}
          title="Issues & Feature Requests"
          subtitle="GitHub issue tracker"
          cta="Report"
          href={`${REPO_BASE}/issues`}
        />
      </div>
    </div>
  );
}

export function CompanionPackageDialog({ isOpen, onClose, kind }: CompanionPackageDialogProps) {
  const tabs = kind === 'python' ? PYTHON_TABS : kind === 'r' ? R_TABS : NODE_TABS;
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [detailPanel, setDetailPanel] = useState<DetailPanel | null>(null);

  if (!isOpen) return null;

  const title = kind === 'python' ? 'Python Package' : kind === 'r' ? 'R Package' : 'Node Package';
  const packageName = kind === 'python' ? 'venn-diagram-lab' : kind === 'r' ? 'vennDiagramLab' : 'venn-diagram-lab';
  const tagline = kind === 'python'
    ? 'Headless Venn diagram analysis & rendering for Python'
    : kind === 'r'
      ? 'Headless Venn diagram analysis & rendering for R'
      : 'Headless Node.js/TypeScript companion — venn-diagram-lab · on npm';

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="welcome-dialog companion-dialog" onClick={e => e.stopPropagation()}>
        <div className="companion-header">
          <div className="companion-header-icon">
            {kind === 'python' ? <PythonLogo /> : kind === 'r' ? <RLogo /> : <NodeLogo />}
          </div>
          <div className="companion-header-text">
            <h1 className="welcome-title companion-title">{title}: {packageName}</h1>
            <p className="companion-subtitle">{tagline}</p>
          </div>
          <button className="btn welcome-summary-btn companion-close-btn" onClick={onClose}>Close</button>
        </div>

        <div className="companion-tabs" role="tablist" aria-label={`${title} sections`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={tab.id === activeTab}
              className={`companion-tab ${tab.id === activeTab ? 'companion-tab-active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setDetailPanel(null); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="companion-body">
          {kind === 'python'
            ? <PythonContent activeTab={activeTab} onOpen={setDetailPanel} />
            : kind === 'r'
              ? <RContent activeTab={activeTab} onOpen={setDetailPanel} />
              : <NodeContent activeTab={activeTab} onOpen={setDetailPanel} />}
        </div>

        {detailPanel && (
          <CompanionDetailModal panel={detailPanel} onClose={() => setDetailPanel(null)} />
        )}
      </div>
    </div>
  );
}
