import { describe, expect, it } from 'vitest';
import { ABOUT_SECTIONS } from '../src/report/about.ts';

describe('ABOUT_SECTIONS', () => {
  it('ends with a Credits and Cite section listing npm and all siblings', () => {
    const c = ABOUT_SECTIONS.at(-1)!;
    expect(c.title).toBe('Credits and Cite');
    for (const u of [
      'https://venndiagramlab.org/',
      'https://pypi.org/project/venn-diagram-lab/',
      'https://CRAN.R-project.org/package=vennDiagramLab',
      'https://www.npmjs.com/package/venn-diagram-lab',
      '10.5281/zenodo.19510813',
    ]) {
      expect(c.body).toContain(u);
    }
  });
});
