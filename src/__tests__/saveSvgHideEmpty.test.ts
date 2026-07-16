import { describe, it, expect } from 'vitest';
import { saveSvg } from '../parser/saveSvg.ts';
import type { VennDocument } from '../parser/saveSvg.ts';

function buildDoc(): VennDocument {
  return {
    filename: 'test.svg',
    rawSvgAttrs: 'xmlns="http://www.w3.org/2000/svg" width="100" height="100"',
    viewBox: { x: 0, y: 0, w: 100, h: 100 },
    comment: 'test doc',
    shapes: [
      { id: 'ShapeA', tagName: 'circle', attributes: { cx: '10', cy: '10', r: '5' }, style: '' },
    ],
    shapesExtras: [],
    texts: {
      header: null,
      names: [],
      values: [
        { id: 'Count_A', x: 1, y: 1, content: '0', style: '' },
        { id: 'Count_AB', x: 2, y: 2, content: '5', style: '' },
      ],
      sums: [],
    },
    bullets: [],
    meta: {
      headerHidden: false,
      bulletsHidden: false,
      hiddenIds: new Set(),
      hiddenGroups: new Set(),
    },
  };
}

describe('saveSvg hideEmptyCounts option', () => {
  it('omits zero-value Count_ texts when hideEmptyCounts is true', () => {
    const doc = buildDoc();
    const out = saveSvg(doc, { hideEmptyCounts: true });
    expect(out).not.toContain('id="Count_A"');
    expect(out).toContain('id="Count_AB"');
  });

  it('keeps both Count_ texts by default (no option)', () => {
    const doc = buildDoc();
    const out = saveSvg(doc);
    expect(out).toContain('id="Count_A"');
    expect(out).toContain('id="Count_AB"');
  });

  it('keeps both Count_ texts when hideEmptyCounts is explicitly false', () => {
    const doc = buildDoc();
    const out = saveSvg(doc, { hideEmptyCounts: false });
    expect(out).toContain('id="Count_A"');
    expect(out).toContain('id="Count_AB"');
  });

  it('produces byte-identical output with and without the option object when nothing is hidden', () => {
    const doc = buildDoc();
    doc.texts.values = [{ id: 'Count_AB', x: 2, y: 2, content: '5', style: '' }];
    const withOpt = saveSvg(doc, { hideEmptyCounts: true });
    const withoutOpt = saveSvg(doc);
    expect(withOpt).toBe(withoutOpt);
  });
});
