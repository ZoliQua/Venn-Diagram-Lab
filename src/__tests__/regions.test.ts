import { describe, it, expect } from 'vitest';
import { getAllRegions } from '../utils/regions.ts';
import type { VennDocument } from '../types.ts';

function makeDoc(n: number): VennDocument {
  const letters = 'ABCDEFGH'.slice(0, n).split('');
  const shapes = letters.map(l => ({
    id: `Shape${l}`,
    tagName: 'circle',
    attributes: { cx: '0', cy: '0', r: '50' },
    style: `fill:#FFF200`,
  }));

  // Generate all 2^n - 1 count texts
  const values: { id: string; x: number; y: number; content: string; style: string }[] = [];
  for (let mask = 1; mask < (1 << n); mask++) {
    const label = letters.filter((_, i) => mask & (1 << i)).join('');
    values.push({ id: `Count_${label}`, x: 0, y: 0, content: label, style: '' });
  }

  return {
    filename: `test-${n}-set.svg`,
    rawSvgAttrs: '',
    viewBox: { x: 0, y: 0, w: 700, h: 700 },
    comment: '',
    shapes,
    texts: { header: null, names: [], values, sums: [] },
    bullets: [],
    meta: { headerHidden: false, bulletsHidden: false, hiddenIds: new Set(), hiddenGroups: new Set() },
  };
}

describe('getAllRegions', () => {
  it('generates 3 regions for 2-set', () => {
    const regions = getAllRegions(makeDoc(2));
    expect(regions).toHaveLength(3);
    expect(regions.map(r => r.label)).toEqual(['A', 'B', 'AB']);
  });

  it('generates 7 regions for 3-set', () => {
    const regions = getAllRegions(makeDoc(3));
    expect(regions).toHaveLength(7);
    const labels = regions.map(r => r.label);
    expect(labels).toContain('A');
    expect(labels).toContain('AB');
    expect(labels).toContain('ABC');
  });

  it('generates 31 regions for 5-set', () => {
    const regions = getAllRegions(makeDoc(5));
    expect(regions).toHaveLength(31);
  });

  it('generates 127 regions for 7-set', () => {
    const regions = getAllRegions(makeDoc(7));
    expect(regions).toHaveLength(127);
  });

  it('generates 255 regions for 8-set', () => {
    const regions = getAllRegions(makeDoc(8));
    expect(regions).toHaveLength(255);
  });

  it('sorts by depth then alphabetically', () => {
    const regions = getAllRegions(makeDoc(3));
    const labels = regions.map(r => r.label);
    // Singles first, then pairs, then triple
    expect(labels.indexOf('A')).toBeLessThan(labels.indexOf('AB'));
    expect(labels.indexOf('AB')).toBeLessThan(labels.indexOf('ABC'));
    // Within same depth, alphabetical
    expect(labels.indexOf('A')).toBeLessThan(labels.indexOf('B'));
    expect(labels.indexOf('AB')).toBeLessThan(labels.indexOf('AC'));
  });

  it('detects hasCountText correctly', () => {
    const regions = getAllRegions(makeDoc(3));
    for (const r of regions) {
      expect(r.hasCountText).toBe(true);
    }
  });

  it('labels are always alphabetically sorted', () => {
    const regions = getAllRegions(makeDoc(5));
    for (const r of regions) {
      const sorted = r.label.split('').sort().join('');
      expect(r.label).toBe(sorted);
    }
  });
});
