import { describe, it, expect } from 'vitest';
import {
  buildEnrichmentBarSvg,
  buildEnrichmentLollipopSvg,
  buildEnrichmentHeatmapSvg,
  metricValue,
  metricLabel,
} from '../utils/enrichmentPlotSvg.ts';
import type { PairwiseStat } from '../utils/statistics.ts';

const fixture: PairwiseStat[] = [
  {
    a: 'A', b: 'B', label: 'AB', nameA: 'Set A', nameB: 'Set B',
    sizeA: 100, sizeB: 100, intersection: 50, union: 150,
    jaccard: 0.333, overlapCoeff: 0.5, dice: 0.5,
    expected: 10, foldEnrichment: 5, pValue: 1e-20, fdr: 1e-18,
    significant: true, highlySignificant: true,
  },
  {
    a: 'A', b: 'C', label: 'AC', nameA: 'Set A', nameB: 'Set C',
    sizeA: 100, sizeB: 80, intersection: 5, union: 175,
    jaccard: 0.028, overlapCoeff: 0.06, dice: 0.056,
    expected: 8, foldEnrichment: 0.625, pValue: 0.9, fdr: 0.9,
    significant: false, highlySignificant: false,
  },
  {
    a: 'B', b: 'C', label: 'BC', nameA: 'Set B', nameB: 'Set C',
    sizeA: 100, sizeB: 80, intersection: 80, union: 100,
    jaccard: 0.8, overlapCoeff: 1.0, dice: 0.888,
    expected: 10, foldEnrichment: 8, pValue: 0, fdr: 0,
    significant: true, highlySignificant: true,
  },
];

function countMatches(haystack: string, pattern: RegExp): number {
  return (haystack.match(pattern) ?? []).length;
}

describe('metricValue', () => {
  it('computes -log10(FDR) with a finite floor for fdr=0', () => {
    const v = metricValue(fixture[2], 'neglog10fdr');
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(100);
    expect(v).toBeLessThanOrEqual(300);
  });

  it('computes -log10(FDR) for small fdr values', () => {
    const v = metricValue(fixture[0], 'neglog10fdr');
    expect(v).toBeGreaterThan(17);
    expect(v).toBeLessThan(19);
  });

  it('returns foldEnrichment unchanged', () => {
    expect(metricValue(fixture[0], 'foldEnrichment')).toBe(5);
    expect(metricValue(fixture[1], 'foldEnrichment')).toBe(0.625);
  });
});

describe('metricLabel', () => {
  it('gives a distinct label per metric', () => {
    expect(metricLabel('neglog10fdr')).not.toEqual(metricLabel('foldEnrichment'));
    expect(metricLabel('foldEnrichment')).toContain('Fold');
  });
});

describe('buildEnrichmentBarSvg', () => {
  it('produces an SVG string with svg root and viewBox', () => {
    const svg = buildEnrichmentBarSvg(fixture, { metric: 'neglog10fdr' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('contains at least one <rect> per pair plus background', () => {
    const svg = buildEnrichmentBarSvg(fixture, { metric: 'neglog10fdr' });
    const rectCount = countMatches(svg, /<rect\b/g);
    expect(rectCount).toBeGreaterThanOrEqual(fixture.length + 1);
  });

  it('renders the x-axis label for every pair', () => {
    const svg = buildEnrichmentBarSvg(fixture, { metric: 'neglog10fdr' });
    for (const s of fixture) {
      expect(svg).toContain(`>${s.label}<`);
    }
  });

  it('draws non-significant bars with the neutral color and significant bars with the green color', () => {
    const svg = buildEnrichmentBarSvg(fixture, { metric: 'neglog10fdr' });
    expect(svg).toContain('#2e7d32');
    expect(svg).toContain('#888888');
  });

  it('handles an empty input without throwing', () => {
    const svg = buildEnrichmentBarSvg([], { metric: 'neglog10fdr' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('No pairs to plot');
  });
});

describe('buildEnrichmentLollipopSvg', () => {
  it('produces an SVG with stick lines and dot circles', () => {
    const svg = buildEnrichmentLollipopSvg(fixture, { metric: 'neglog10fdr' });
    expect(svg.startsWith('<svg')).toBe(true);
    const lineCount = countMatches(svg, /<line\b/g);
    const circleCount = countMatches(svg, /<circle\b/g);
    expect(lineCount).toBeGreaterThanOrEqual(fixture.length);
    expect(circleCount).toBeGreaterThanOrEqual(fixture.length);
  });

  it('renders the x-axis label for every pair under the foldEnrichment metric too', () => {
    const svg = buildEnrichmentLollipopSvg(fixture, { metric: 'foldEnrichment' });
    for (const s of fixture) {
      expect(svg).toContain(`>${s.label}<`);
    }
  });
});

describe('buildEnrichmentHeatmapSvg', () => {
  const letters = ['A', 'B', 'C'];
  const names = ['Set A', 'Set B', 'Set C'];

  it('produces an SVG with at least n*n data cells plus background', () => {
    const svg = buildEnrichmentHeatmapSvg(fixture, letters, names, { metric: 'neglog10fdr' });
    expect(svg.startsWith('<svg')).toBe(true);
    const rectCount = countMatches(svg, /<rect\b/g);
    expect(rectCount).toBeGreaterThanOrEqual(letters.length * letters.length + 1);
  });

  it('marks exactly n diagonal cells with data-diag="true"', () => {
    const svg = buildEnrichmentHeatmapSvg(fixture, letters, names, { metric: 'neglog10fdr' });
    const diagCount = countMatches(svg, /data-diag="true"/g);
    expect(diagCount).toBe(letters.length);
  });

  it('renders trimmed labels containing the set letter', () => {
    const svg = buildEnrichmentHeatmapSvg(fixture, letters, names, { metric: 'neglog10fdr' });
    for (const l of letters) {
      expect(svg).toContain(`(${l})`);
    }
  });

  it('is symmetric: AB (row 0, col 1) and BA (row 1, col 0) cells share the same fill', () => {
    const svg = buildEnrichmentHeatmapSvg(fixture, letters, names, { metric: 'neglog10fdr' });
    // Heatmap layout constants (see enrichmentPlotSvg.ts): gridX=110, gridY=60, cellSize=36.
    const xAB = 110 + 1 * 36; // col 1
    const yAB = 60 + 0 * 36;  // row 0
    const xBA = 110 + 0 * 36; // col 0
    const yBA = 60 + 1 * 36;  // row 1
    const matchAB = new RegExp(`<rect x="${xAB}" y="${yAB}" width="36" height="36" fill="([^"]+)"`);
    const matchBA = new RegExp(`<rect x="${xBA}" y="${yBA}" width="36" height="36" fill="([^"]+)"`);
    const ab = svg.match(matchAB);
    const ba = svg.match(matchBA);
    expect(ab).not.toBeNull();
    expect(ba).not.toBeNull();
    expect(ab![1]).toEqual(ba![1]);
  });

  it('handles an empty set list without throwing', () => {
    const svg = buildEnrichmentHeatmapSvg([], [], [], { metric: 'neglog10fdr' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('No sets');
  });
});
