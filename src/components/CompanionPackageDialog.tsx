import { useState } from 'react';

interface CompanionPackageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  kind: 'python' | 'r';
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
        <strong>Next:</strong> open the <em>Notebooks</em> tab for eleven
        ready-to-run examples (Quickstart, real cancer driver case study,
        statistics deep-dive, pipeline integration, CLI workflows, plot
        comparison, data validation), or jump to{' '}
        <em>Features</em> for a full breakdown of what's available.
      </div>

    </div>
  );
}

function PythonContent({ activeTab }: { activeTab: TabId }) {
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

        <h3 className="companion-h3">What you get</h3>
        <div className="companion-feature-grid">
          <div className="companion-feature-cell" data-category="analysis">
            <div className="companion-feature-cell-icon" aria-hidden="true">{'\u{1F4C2}'}</div>
            <div className="companion-feature-cell-text">
              <div className="companion-feature-cell-title">Analysis</div>
              <div className="companion-feature-cell-desc">
                Load CSV / TSV / GMT / GMX. Compute set sizes, all 2<sup>n</sup>−1 intersections.
              </div>
            </div>
          </div>
          <div className="companion-feature-cell" data-category="stats">
            <div className="companion-feature-cell-icon" aria-hidden="true">{'\u{1F9EE}'}</div>
            <div className="companion-feature-cell-text">
              <div className="companion-feature-cell-title">Statistics</div>
              <div className="companion-feature-cell-desc">
                Jaccard, Sørensen-Dice, hypergeometric enrichment, BH-FDR correction.
              </div>
            </div>
          </div>
          <div className="companion-feature-cell" data-category="viz">
            <div className="companion-feature-cell-icon" aria-hidden="true">{'\u{1F3A8}'}</div>
            <div className="companion-feature-cell-text">
              <div className="companion-feature-cell-title">Visualization</div>
              <div className="companion-feature-cell-desc">
                44 SVG templates, area-proportional 2/3-set, UpSet, force-directed network.
              </div>
            </div>
          </div>
          <div className="companion-feature-cell" data-category="export">
            <div className="companion-feature-cell-icon" aria-hidden="true">{'\u{1F4C4}'}</div>
            <div className="companion-feature-cell-text">
              <div className="companion-feature-cell-title">Reports &amp; Export</div>
              <div className="companion-feature-cell-desc">
                Multi-page PDF report; SVG / PNG / TSV exports (parity-tested vs. webapp).
              </div>
            </div>
          </div>
        </div>

        <div className="companion-badges">
          <span className="companion-badge companion-badge-stable">Stable · v2.0.3</span>
          <span className="companion-badge">Python ≥ 3.10</span>
          <span className="companion-badge">11 example notebooks</span>
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
          Eleven self-contained Jupyter notebooks ship in the
          <code>python/examples/</code> directory of the repository. Each is
          fully reproducible — pick the closest match to your task and adapt.
          All eleven are CI-tested via <code>nbconvert --execute</code> on every
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
            <div className="companion-feature-group-header">
              <span className="companion-feature-group-marker" aria-hidden="true" />
              <span className="companion-feature-group-title">Visualization</span>
              <span className="companion-feature-group-count">4 modes</span>
            </div>
            <div className="companion-feature-cards">
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F3A8}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">44 SVG templates</div>
                  <div className="companion-feature-card-desc">Every model from the web tool, 2-set to 9-set, bundled in the wheel.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{2696}\u{FE0F}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Area-proportional</div>
                  <div className="companion-feature-card-desc">Analytical 2-set bisection + Wilkinson 2012-style 3-set triangulation.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F4CA}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">UpSet plots</div>
                  <div className="companion-feature-card-desc">matplotlib backend with configurable column ordering and pagination.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F578}\u{FE0F}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Force-directed network</div>
                  <div className="companion-feature-card-desc">NetworkX layout with pairwise edge weighting (count / Jaccard / FE / OC).</div>
                </div>
              </div>
            </div>
          </div>

          <div className="companion-feature-group" data-category="stats">
            <div className="companion-feature-group-header">
              <span className="companion-feature-group-marker" aria-hidden="true" />
              <span className="companion-feature-group-title">Analysis</span>
              <span className="companion-feature-group-count">parity-tested</span>
            </div>
            <div className="companion-feature-cards companion-feature-cards-single">
              <div className="companion-feature-card companion-feature-card-wide">
                <div className="companion-feature-card-icon">{'\u{1F9EE}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Statistical methods</div>
                  <div className="companion-feature-card-desc">
                    Set sizes, all 2<sup>n</sup>−1 intersections, Jaccard,
                    Sørensen-Dice, Simpson overlap, hypergeometric enrichment with
                    Benjamini-Hochberg FDR correction. Same algorithms and
                    rounding as the web tool.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="companion-feature-group" data-category="export">
            <div className="companion-feature-group-header">
              <span className="companion-feature-group-marker" aria-hidden="true" />
              <span className="companion-feature-group-title">Reports &amp; Export</span>
              <span className="companion-feature-group-count">3 formats</span>
            </div>
            <div className="companion-feature-cards">
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F4C4}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Multi-page PDF report</div>
                  <div className="companion-feature-card-desc">Same layout as the web tool's exporter — overview, diagrams, statistics, methodology.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F4CB}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Byte-equivalent TSV</div>
                  <div className="companion-feature-card-desc">Region summary + item matrix writers, parity-tested against the React app.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F5BC}\u{FE0F}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">SVG &amp; PNG output</div>
                  <div className="companion-feature-card-desc">Vector SVG via the bundled templates; PNG via cairosvg for raster pipelines.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="companion-feature-group" data-category="tooling">
            <div className="companion-feature-group-header">
              <span className="companion-feature-group-marker" aria-hidden="true" />
              <span className="companion-feature-group-title">Developer Tooling</span>
              <span className="companion-feature-group-count">3 surfaces</span>
            </div>
            <div className="companion-feature-cards">
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{2328}\u{FE0F}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Typer CLI <code>vdl</code></div>
                  <div className="companion-feature-card-desc">One-shot analyses on the command line; built with Typer + Rich.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F4D3}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">8 tested notebooks</div>
                  <div className="companion-feature-card-desc">Quickstart, case studies, stats deep-dive, pipeline integration; CI-executed.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{2705}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Multi-OS CI</div>
                  <div className="companion-feature-card-desc">Linux · macOS · Windows × Python 3.10 / 3.11 / 3.12 — green on every release.</div>
                </div>
              </div>
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
          subtitle="python/examples/ — 11 notebooks"
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

function RContent({ activeTab }: { activeTab: TabId }) {
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

        <h3 className="companion-h3">What you get</h3>
        <div className="companion-feature-grid">
          <div className="companion-feature-cell" data-category="analysis">
            <div className="companion-feature-cell-icon" aria-hidden="true">{'\u{1F4C2}'}</div>
            <div className="companion-feature-cell-text">
              <div className="companion-feature-cell-title">Analysis</div>
              <div className="companion-feature-cell-desc">
                Load CSV / TSV / GMT / GMX, four S4 classes, <code>analyze()</code>
                computes set sizes and all 2<sup>n</sup>−1 intersections.
              </div>
            </div>
          </div>
          <div className="companion-feature-cell" data-category="stats">
            <div className="companion-feature-cell-icon" aria-hidden="true">{'\u{1F9EE}'}</div>
            <div className="companion-feature-cell-text">
              <div className="companion-feature-cell-title">Statistics</div>
              <div className="companion-feature-cell-desc">
                Jaccard, Sørensen-Dice, overlap coefficient, hypergeometric
                p-values, fold enrichment, BH-FDR — JS-style float parity with
                the web tool.
              </div>
            </div>
          </div>
          <div className="companion-feature-cell" data-category="viz">
            <div className="companion-feature-cell-icon" aria-hidden="true">{'\u{1F3A8}'}</div>
            <div className="companion-feature-cell-text">
              <div className="companion-feature-cell-title">Visualization</div>
              <div className="companion-feature-cell-desc">
                44 SVG templates via xml2, area-proportional 2/3-set, UpSet
                via ComplexUpset, force-directed network via ggraph + tidygraph,
                ggplot2 <code>geom_venn()</code> layer.
              </div>
            </div>
          </div>
          <div className="companion-feature-cell" data-category="export">
            <div className="companion-feature-cell-icon" aria-hidden="true">{'\u{1F4C4}'}</div>
            <div className="companion-feature-cell-text">
              <div className="companion-feature-cell-title">Reports &amp; Export</div>
              <div className="companion-feature-cell-desc">
                Multi-page PDF report via <code>grDevices::pdf</code> +
                patchwork; byte-equivalent TSV writers (region summary, item
                matrix, statistics) parity-tested against the web tool.
              </div>
            </div>
          </div>
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
            <div className="companion-feature-group-header">
              <span className="companion-feature-group-marker" aria-hidden="true" />
              <span className="companion-feature-group-title">Visualization</span>
              <span className="companion-feature-group-count">4 modes</span>
            </div>
            <div className="companion-feature-cards">
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F3A8}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">44 SVG templates</div>
                  <div className="companion-feature-card-desc">Every model from the web tool, 2-set to 9-set, bundled in the CRAN tarball. <code>render_venn_svg()</code> templates them via <code>xml2</code>.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{2696}\u{FE0F}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Area-proportional</div>
                  <div className="companion-feature-card-desc">Analytical 2-set + approximate 3-set via <code>solve_2set()</code> / <code>solve_3set()</code> / <code>generate_proportional_svg()</code>.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F4CA}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">UpSet plots</div>
                  <div className="companion-feature-card-desc"><code>render_upset()</code> via <code>ComplexUpset</code>; depth / heatmap / custom color modes; size / degree sort; threshold cutoffs.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F578}\u{FE0F}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Force-directed network</div>
                  <div className="companion-feature-card-desc"><code>render_network()</code> via <code>ggraph</code> + <code>tidygraph</code>; 4 edge metrics (intersection / Jaccard / fold enrichment / overlap coefficient).</div>
                </div>
              </div>
            </div>
          </div>

          <div className="companion-feature-group" data-category="stats">
            <div className="companion-feature-group-header">
              <span className="companion-feature-group-marker" aria-hidden="true" />
              <span className="companion-feature-group-title">Analysis &amp; Statistics</span>
              <span className="companion-feature-group-count">parity-tested</span>
            </div>
            <div className="companion-feature-cards companion-feature-cards-single">
              <div className="companion-feature-card companion-feature-card-wide">
                <div className="companion-feature-card-icon">{'\u{1F9EE}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">S4 result types + stateless metric helpers</div>
                  <div className="companion-feature-card-desc">
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
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="companion-feature-group" data-category="export">
            <div className="companion-feature-group-header">
              <span className="companion-feature-group-marker" aria-hidden="true" />
              <span className="companion-feature-group-title">Reports &amp; Export</span>
              <span className="companion-feature-group-count">3 formats</span>
            </div>
            <div className="companion-feature-cards">
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F4C4}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Multi-page PDF report</div>
                  <div className="companion-feature-card-desc"><code>to_pdf_report()</code> via <code>grDevices::pdf</code> + <code>patchwork</code> — same layout as the web tool's exporter (overview · venn + UpSet · statistics · network · methodology).</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F4CB}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Byte-equivalent TSV</div>
                  <div className="companion-feature-card-desc"><code>to_region_summary_tsv()</code> · <code>to_matrix_tsv()</code> · <code>to_statistics_tsv()</code> — 12 byte-parity tests against shared Python golden fixtures.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F5BC}\u{FE0F}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">SVG &amp; PNG output</div>
                  <div className="companion-feature-card-desc">Vector SVG via the bundled templates; PNG via <code>rsvg</code> + <code>ggsave()</code> for raster pipelines.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="companion-feature-group" data-category="tooling">
            <div className="companion-feature-group-header">
              <span className="companion-feature-group-marker" aria-hidden="true" />
              <span className="companion-feature-group-title">Tidyverse &amp; Pipelines</span>
              <span className="companion-feature-group-count">2 integrations</span>
            </div>
            <div className="companion-feature-cards">
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F4DC}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">ggplot2 layer</div>
                  <div className="companion-feature-card-desc"><code>geom_venn()</code> drops a venn straight into a <code>ggplot</code> stack. Compose with themes, titles, and other layers.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F9F9}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">broom S3 methods</div>
                  <div className="companion-feature-card-desc"><code>tidy()</code> / <code>glance()</code> / <code>augment()</code> on <code>RegionResult</code> return tibbles ready for <code>dplyr</code> / <code>targets</code> / <code>drake</code> pipelines.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="companion-feature-group" data-category="tooling">
            <div className="companion-feature-group-header">
              <span className="companion-feature-group-marker" aria-hidden="true" />
              <span className="companion-feature-group-title">Documentation &amp; QA</span>
              <span className="companion-feature-group-count">3 surfaces</span>
            </div>
            <div className="companion-feature-cards">
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F4D3}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">8 vignettes</div>
                  <div className="companion-feature-card-desc">Quickstart, real cancer drivers, proportional, UpSet vs. venn vs. network, statistics deep-dive, broom + dplyr + targets, PDF reports, custom styling. Open via <code>browseVignettes(&quot;vennDiagramLab&quot;)</code>.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{1F4DA}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">pkgdown reference site</div>
                  <div className="companion-feature-card-desc">Full function reference + rendered vignette gallery at <a href="https://zoliqua.github.io/Venn-Diagram-Lab/r/" target="_blank" rel="noopener noreferrer" className="companion-link">zoliqua.github.io/Venn-Diagram-Lab/r/</a>.</div>
                </div>
              </div>
              <div className="companion-feature-card">
                <div className="companion-feature-card-icon">{'\u{2705}'}</div>
                <div className="companion-feature-card-body">
                  <div className="companion-feature-card-title">Multi-OS CI · 590+ tests</div>
                  <div className="companion-feature-card-desc">R CMD check matrix: Linux release / devel / oldrel × macOS × Windows. BiocCheck WARNING-clean. Vignettes executed on every push.</div>
                </div>
              </div>
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

export function CompanionPackageDialog({ isOpen, onClose, kind }: CompanionPackageDialogProps) {
  const tabs = kind === 'python' ? PYTHON_TABS : R_TABS;
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (!isOpen) return null;

  const title = kind === 'python' ? 'Python Package' : 'R Package';
  const packageName = kind === 'python' ? 'venn-diagram-lab' : 'vennDiagramLab';
  const tagline = kind === 'python'
    ? 'Headless Venn diagram analysis & rendering for Python'
    : 'Headless Venn diagram analysis & rendering for R';

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="welcome-dialog companion-dialog" onClick={e => e.stopPropagation()}>
        <div className="companion-header">
          <div className="companion-header-icon">
            {kind === 'python' ? <PythonLogo /> : <RLogo />}
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
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="companion-body">
          {kind === 'python'
            ? <PythonContent activeTab={activeTab} />
            : <RContent activeTab={activeTab} />}
        </div>
      </div>
    </div>
  );
}
