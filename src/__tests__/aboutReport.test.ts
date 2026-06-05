import { describe, it, expect } from 'vitest';
import { ABOUT_REPORT_SECTIONS } from '../utils/aboutReport.ts';

describe('ABOUT_REPORT_SECTIONS', () => {
  it('is a non-empty array', () => {
    expect(ABOUT_REPORT_SECTIONS.length).toBeGreaterThan(0);
  });

  it('starts with the top-level tool description', () => {
    expect(ABOUT_REPORT_SECTIONS[0].title).toBe('Venn Diagram Lab');
    expect(ABOUT_REPORT_SECTIONS[0].text.length).toBeGreaterThan(100);
  });

  it('contains both group headers (Plots, Statistics)', () => {
    const titles = ABOUT_REPORT_SECTIONS.map(s => s.title);
    expect(titles).toContain('Plots');
    expect(titles).toContain('Statistics');
    // Group headers have empty body text
    const plots = ABOUT_REPORT_SECTIONS.find(s => s.title === 'Plots')!;
    const stats = ABOUT_REPORT_SECTIONS.find(s => s.title === 'Statistics')!;
    expect(plots.text).toBe('');
    expect(stats.text).toBe('');
  });

  it('documents all three plot types', () => {
    const titles = ABOUT_REPORT_SECTIONS.map(s => s.title);
    expect(titles).toContain('1. Venn Diagrams');
    expect(titles).toContain('2. UpSet Plots');
    expect(titles).toContain('3. Set Relationship Network');
  });

  it('documents all three statistics entries and the three enrichment plots', () => {
    const titles = ABOUT_REPORT_SECTIONS.map(s => s.title);
    expect(titles).toContain('1. Pairwise Jaccard Index');
    expect(titles).toContain('2. Sorensen-Dice Index');
    expect(titles).toContain('3. Intersection Enrichment (Hypergeometric Test)');
    expect(titles).toContain('4. Bar chart');
    expect(titles).toContain('5. Lollipop chart');
    expect(titles).toContain('6. Heatmap');
  });

  it('gives every non-header section a substantial body (>200 chars)', () => {
    for (const section of ABOUT_REPORT_SECTIONS) {
      if (section.text) {
        expect(section.text.length).toBeGreaterThan(200);
      }
    }
  });

  it('ends with a Credits and Cite section carrying the Zenodo DOI', () => {
    const last = ABOUT_REPORT_SECTIONS[ABOUT_REPORT_SECTIONS.length - 1];
    expect(last.title).toBe('Credits and Cite');
    expect(last.text).toContain('10.5281/zenodo.19510813');
    expect(last.text).toContain('venndiagramlab.org');
  });
});
