// @vitest-environment jsdom
// Security regression tests: SVG builder attribute escaping, session-import
// style sanitization, loadSvg attribute whitelist, saveSvg XML escaping.
import { describe, it, expect } from 'vitest';
import { buildShareDistributionSvg } from '../utils/shareDistributionSvgBuilder.ts';
import { buildEnrichmentBarSvg } from '../utils/enrichmentPlotSvg.ts';
import { sanitizeEnrichmentPlotSettings, sanitizePlotStyle } from '../utils/session.ts';
import { DEFAULT_PLOT_STYLE } from '../utils/enrichmentPlotStyle.ts';
import { loadSvg } from '../parser/loadSvg.ts';
import { saveSvg } from '../parser/saveSvg.ts';
import type { PairwiseStat } from '../utils/statistics.ts';

const PAYLOAD = '"/><image href=x onerror=alert(1)>';

describe('SVG plot builders escape style attributes', () => {
  it('shareDistribution: fontFamily cannot break out of the attribute', () => {
    const svg = buildShareDistributionSvg(new Map([[1, 5], [2, 3]]), {
      style: {
        background: 'white', fontSize: 11, fontFamily: PAYLOAD,
        gradientLow: '#ffe4b5', gradientHigh: '#7e14ff',
        showPercent: false, showAxisLabel: true, logScale: false,
      },
    });
    // The payload may appear as inert escaped text, but never raw.
    expect(svg).not.toContain(PAYLOAD);
    expect(svg).toContain('&quot;/&gt;&lt;image');
  });

  it('enrichment bar: fontFamily and sigColor are escaped', () => {
    const stat: PairwiseStat = {
      a: 'A', b: 'B', label: 'AB', nameA: 'A', nameB: 'B',
      sizeA: 10, sizeB: 10, intersection: 5, union: 15,
      jaccard: 0.33, overlapCoeff: 0.5, dice: 0.5, expected: 5,
      foldEnrichment: 1, pValue: 0.5, fdr: 0.5, bonferroni: 1, pTwoSided: 1,
      jaccardCiLow: 0, jaccardCiHigh: 1, diceCiLow: 0, diceCiHigh: 1,
      feCiLow: 0, feCiHigh: 1,
    };
    const svg = buildEnrichmentBarSvg([stat], {
      metric: 'foldEnrichment',
      style: { ...DEFAULT_PLOT_STYLE, fontFamily: PAYLOAD, sigColor: PAYLOAD },
    });
    expect(svg).not.toContain(PAYLOAD);
    expect(svg).toContain('&quot;/&gt;&lt;image');
  });
});

describe('sanitizeEnrichmentPlotSettings', () => {
  it('falls back to defaults for malicious or malformed fields', () => {
    const out = sanitizeEnrichmentPlotSettings({
      bar: { ...DEFAULT_PLOT_STYLE, fontFamily: PAYLOAD, fontSize: 'huge' as unknown as number },
      heatmap: { ...DEFAULT_PLOT_STYLE, sigColor: 'url(javascript:x)' },
    });
    expect(out.bar.fontFamily).toBe(DEFAULT_PLOT_STYLE.fontFamily);
    expect(out.bar.fontSize).toBe(DEFAULT_PLOT_STYLE.fontSize);
    expect(out.heatmap.sigColor).toBe(DEFAULT_PLOT_STYLE.sigColor);
    // Untouched valid fields survive.
    expect(out.bar.showLegend).toBe(DEFAULT_PLOT_STYLE.showLegend);
    // Missing plot kinds get full defaults.
    expect(out.lollipop).toEqual(DEFAULT_PLOT_STYLE);
  });

  it('accepts legitimate font families and colors', () => {
    const style = sanitizePlotStyle({
      ...DEFAULT_PLOT_STYLE,
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      sigColor: '#2e7d32',
      nsColor: 'rgb(10, 20, 30)',
      fontSize: 14,
    });
    expect(style.fontFamily).toBe("'Segoe UI', Tahoma, sans-serif");
    expect(style.sigColor).toBe('#2e7d32');
    expect(style.nsColor).toBe('rgb(10, 20, 30)');
    expect(style.fontSize).toBe(14);
  });

  it('clamps out-of-range numbers', () => {
    const style = sanitizePlotStyle({ ...DEFAULT_PLOT_STYLE, fontSize: 5000, dendrogramFraction: 7 });
    expect(style.fontSize).toBe(72);
    expect(style.dendrogramFraction).toBe(1);
  });
});

describe('loadSvg attribute whitelist', () => {
  it('drops event handlers and href from shapes and the root element', () => {
    const malicious = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="alert(1)">
<g id="Shapes">
<circle id="ShapeA" cx="30" cy="50" r="20" style="fill:#FFF200" onclick="alert(2)" href="javascript:alert(3)"/>
</g>
<g id="Texts"><g id="Group_Values"><text id="Count_A" transform="matrix(1 0 0 1 30 50)" style="">1</text></g></g>
</svg>`;
    const doc = loadSvg('evil.svg', malicious);
    expect(doc.rawSvgAttrs).not.toContain('onload');
    expect(doc.shapes[0].attributes).toEqual({ cx: '30', cy: '50', r: '20' });
    // Round-trip: the exported SVG must not carry executable markup.
    const out = saveSvg(doc);
    expect(out).not.toContain('onload');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('javascript:');
  });
});

describe('saveSvg XML escaping', () => {
  it('escapes quotes and angle brackets in attribute values and comments', () => {
    const doc = loadSvg('t.svg', `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<g id="Shapes">
<path id="ShapeA" d="M0 0 L10 10" style="fill:red"/>
</g>
</svg>`);
    // Simulate a single-quoted source attribute carrying a double quote.
    doc.shapes[0].attributes['d'] = 'M0 0" onload="alert(1)';
    doc.comment = 'x --> <script>alert(1)</script>';
    const out = saveSvg(doc);
    expect(out).not.toContain('" onload="');
    expect(out).toContain('&quot;');
    // The '--' sequence is neutralized so the comment cannot break out; the
    // remaining markup sits inert inside the XML comment.
    expect(out).not.toContain('x --> <script>');
  });
});

describe('loadSvg tag whitelist', () => {
  it('drops non-shape elements (script, foreignObject) under #Shapes', () => {
    const malicious = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<g id="Shapes">
<script id="ShapeA">alert(1)</script>
<circle id="ShapeB" cx="50" cy="50" r="20" style="fill:#2E3192"/>
</g>
</svg>`;
    const doc = loadSvg('evil.svg', malicious);
    expect(doc.shapes).toHaveLength(1);
    expect(doc.shapes[0].id).toBe('ShapeB');
    expect(saveSvg(doc)).not.toContain('<script');
  });
});

describe('session customUniverse validation', () => {
  it('isSessionCompatible rejects non-numeric or out-of-range customUniverse', async () => {
    const { isSessionCompatible } = await import('../utils/session.ts');
    const base = {
      version: '1', mode: 'data',
      data: {
        csvData: { headers: ['a'], rows: [] },
        filename: 'x.csv', fileType: 'binary', model: 'm', columnMapping: [1], originalColumns: [1],
        heatmapColors: { low: '#fff', mid: '#888', high: '#000' },
        shapeColors: {}, enrichmentPlotSettings: {},
        shapeOpacity: 0.2, nameFontSize: 12,
      },
    };
    expect(isSessionCompatible(base as never)).toBe(true);
    expect(isSessionCompatible({ ...base, data: { ...base.data, customUniverse: 20000 } } as never)).toBe(true);
    expect(isSessionCompatible({ ...base, data: { ...base.data, customUniverse: '20000' } } as never)).toBe(false);
    expect(isSessionCompatible({ ...base, data: { ...base.data, customUniverse: -5 } } as never)).toBe(false);
    expect(isSessionCompatible({ ...base, data: { ...base.data, customUniverse: Infinity } } as never)).toBe(false);
  });
});
