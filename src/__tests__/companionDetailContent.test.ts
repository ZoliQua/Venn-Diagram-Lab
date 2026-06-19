import { describe, expect, it } from 'vitest';
import {
  COMPANION_CARD_PANELS,
  COMPANION_DETAIL_PANELS,
  getCardPanel,
  getDetailPanel,
  type DetailKey,
} from '../components/companionDetailPanels.ts';

// Card ids referenced by FeatureCard panels in CompanionPackageDialog.tsx.
const PYTHON_CARD_IDS = [
  'py-viz-templates', 'py-viz-proportional', 'py-viz-upset', 'py-viz-network',
  'py-viz-matplotlib',
  'py-stats-methods',
  'py-export-pdf', 'py-export-tsv', 'py-export-image',
  'py-tool-cli', 'py-tool-notebooks', 'py-tool-ci',
];
const R_CARD_IDS = [
  'r-viz-templates', 'r-viz-proportional', 'r-viz-upset', 'r-viz-network',
  'r-stats-s4',
  'r-export-pdf', 'r-export-tsv', 'r-export-image',
  'r-tid-ggplot', 'r-tid-broom',
  'r-doc-vignettes', 'r-doc-pkgdown', 'r-doc-ci',
];
const NODE_CARD_IDS = [
  'nd-viz-templates', 'nd-viz-proportional', 'nd-viz-upset', 'nd-viz-network', 'nd-viz-raster',
  'nd-stats-methods',
  'nd-export-tsv', 'nd-export-png', 'nd-export-pdf',
  'nd-tool-cli', 'nd-tool-types',
];

// Keys wired to clickable cells/groups in CompanionPackageDialog.tsx.
const PYTHON_KEYS: DetailKey[] = ['analysis', 'stats', 'viz', 'export', 'tooling'];
const R_KEYS: DetailKey[] = ['analysis', 'stats', 'viz', 'export', 'tidyverse'];
const NODE_KEYS: DetailKey[] = ['analysis', 'stats', 'viz', 'export', 'tooling'];

describe('COMPANION_DETAIL_PANELS', () => {
  it('exposes a python, r, and node panel set', () => {
    expect(Object.keys(COMPANION_DETAIL_PANELS).sort()).toEqual(['node', 'python', 'r']);
  });

  it('defines every key the dialog can open', () => {
    for (const key of PYTHON_KEYS) {
      expect(getDetailPanel('python', key)).toBeDefined();
    }
    for (const key of R_KEYS) {
      expect(getDetailPanel('r', key)).toBeDefined();
    }
    for (const key of NODE_KEYS) {
      expect(getDetailPanel('node', key)).toBeDefined();
    }
  });

  it('keeps every panel self-consistent (key matches, prose + code present)', () => {
    for (const kind of ['python', 'r', 'node'] as const) {
      for (const [key, panel] of Object.entries(COMPANION_DETAIL_PANELS[kind])) {
        expect(panel.key).toBe(key);
        expect(panel.title.length).toBeGreaterThan(0);
        expect(panel.blurb.length).toBeGreaterThan(40);
        expect(panel.blocks.length).toBeGreaterThanOrEqual(1);
        for (const block of panel.blocks) {
          expect(block.label.length).toBeGreaterThan(0);
          expect(block.code.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('grounds the Python snippets in real public API symbols', () => {
    const code = (key: DetailKey) =>
      getDetailPanel('python', key)!.blocks.map(b => b.code).join('\n');

    expect(code('analysis')).toContain('analyze(');
    expect(code('analysis')).toContain('exclusive_items(');
    expect(code('analysis')).toContain('parse_region_expression(');
    expect(code('stats')).toContain('result.statistics');
    expect(code('stats')).toContain('hypergeometric_p_value(');
    expect(code('viz')).toContain('render_venn(');
    expect(code('viz')).toContain('generate_proportional_svg(');
    expect(code('export')).toContain('to_pdf_report(');
    expect(code('export')).toContain('to_region_summary_tsv(');
    expect(code('tooling')).toContain('vdl ');
    expect(code('tooling')).toContain('list_models(');
  });

  it('grounds the R snippets in real exported symbols', () => {
    const code = (key: DetailKey) =>
      getDetailPanel('r', key)!.blocks.map(b => b.code).join('\n');

    expect(code('analysis')).toContain('analyze(');
    expect(code('analysis')).toContain('@set_sizes');
    expect(code('analysis')).toContain('intersection_items(');
    expect(code('stats')).toContain('statistics(result)');
    expect(code('stats')).toContain('bh_fdr(');
    expect(code('viz')).toContain('render_venn_svg(');
    expect(code('viz')).toContain('render_network(');
    expect(code('export')).toContain('to_pdf_report(');
    expect(code('export')).toContain('to_excel_workbook(');
    expect(code('tidyverse')).toContain('geom_venn(');
    expect(code('tidyverse')).toContain('tidy(result)');
  });

  it('returns undefined for keys not defined for a kind', () => {
    // 'tidyverse' is R-only; 'tooling' is Python + Node but not R.
    expect(getDetailPanel('r', 'tooling')).toBeUndefined();
    expect(getDetailPanel('python', 'tidyverse')).toBeUndefined();
    expect(getDetailPanel('node', 'tidyverse')).toBeUndefined();
  });
});

describe('COMPANION_CARD_PANELS (per-card Features panels)', () => {
  it('defines every card id wired into the dialog', () => {
    for (const id of PYTHON_CARD_IDS) {
      expect(getCardPanel('python', id), id).toBeDefined();
    }
    for (const id of R_CARD_IDS) {
      expect(getCardPanel('r', id), id).toBeDefined();
    }
    for (const id of NODE_CARD_IDS) {
      expect(getCardPanel('node', id), id).toBeDefined();
    }
  });

  it('has no extra/orphan card panels beyond the wired ids', () => {
    expect(Object.keys(COMPANION_CARD_PANELS.python).sort()).toEqual([...PYTHON_CARD_IDS].sort());
    expect(Object.keys(COMPANION_CARD_PANELS.r).sort()).toEqual([...R_CARD_IDS].sort());
    expect(Object.keys(COMPANION_CARD_PANELS.node).sort()).toEqual([...NODE_CARD_IDS].sort());
  });

  it('keeps every card panel rich: longer prose + a runnable block', () => {
    for (const kind of ['python', 'r', 'node'] as const) {
      for (const [id, panel] of Object.entries(COMPANION_CARD_PANELS[kind])) {
        expect(panel.title.length, id).toBeGreaterThan(0);
        expect(panel.blurb.length, id).toBeGreaterThan(80);
        expect(panel.blocks.length, id).toBeGreaterThanOrEqual(1);
        for (const block of panel.blocks) {
          expect(block.label.length, id).toBeGreaterThan(0);
          if (block.label === 'Shell') {
            // Shell snippets are command invocations (command + args), not calls.
            expect(block.code.trim().split(/\s+/).length, id).toBeGreaterThan(1);
          } else {
            // Code snippets must contain at least one function call "name(".
            expect(/[A-Za-z_][\w.]*\(/.test(block.code), id).toBe(true);
          }
        }
      }
    }
  });

  it('grounds a few card snippets in their headline function', () => {
    const py = (id: string) => getCardPanel('python', id)!.blocks.map(b => b.code).join('\n');
    const r = (id: string) => getCardPanel('r', id)!.blocks.map(b => b.code).join('\n');
    const nd = (id: string) => getCardPanel('node', id)!.blocks.map(b => b.code).join('\n');

    expect(py('py-viz-templates')).toContain('list_models(');
    expect(py('py-viz-upset')).toContain('render_upset(');
    expect(py('py-tool-cli')).toContain('vdl ');
    expect(r('r-viz-proportional')).toContain('solve_2set(');
    expect(r('r-tid-broom')).toContain('augment(result)');
    expect(r('r-doc-vignettes')).toContain('browseVignettes(');

    expect(nd('nd-viz-templates')).toContain('listVennModels(');
    expect(nd('nd-viz-templates')).toContain('toVennSvg(');
    expect(nd('nd-viz-upset')).toContain('toUpsetSvg(');
    expect(nd('nd-viz-network')).toContain('toNetworkSvg(');
    expect(nd('nd-viz-raster')).toContain('svgToPng(');
    expect(nd('nd-export-tsv')).toContain('toRegionSummaryTsv(');
    expect(nd('nd-export-pdf')).toContain('svgToPdf(');
    expect(nd('nd-tool-cli')).toContain('vdl ');
    expect(nd('nd-tool-types')).toContain('analyzeCsvText(');
  });
});
