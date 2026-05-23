import { describe, it, expect } from 'vitest';
import { buildShareDistributionSvg, DEFAULT_SHARE_DIST_STYLE } from '../utils/shareDistributionSvgBuilder.ts';

describe('buildShareDistributionSvg', () => {
  it('returns an SVG string with one bar per bin', () => {
    const dist = new Map<number, number>([[1, 187], [2, 268], [3, 86], [4, 120]]);
    const svg = buildShareDistributionSvg(dist, { style: DEFAULT_SHARE_DIST_STYLE });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    const bars = svg.match(/<rect[^>]+class="sd-bar"/g) ?? [];
    expect(bars.length).toBe(4);
    expect(svg).toContain('>1 set<');
    expect(svg).toContain('>2 sets<');
    expect(svg).toContain('>3 sets<');
    expect(svg).toContain('>4 sets<');
    expect(svg).toContain('>187<');
    expect(svg).toContain('>268<');
  });

  it('renders empty bins as zero-height bars but still labeled', () => {
    const dist = new Map<number, number>([[1, 5], [2, 0], [3, 0], [4, 3]]);
    const svg = buildShareDistributionSvg(dist, { style: DEFAULT_SHARE_DIST_STYLE });
    expect(svg).toContain('>2 sets<');
    expect(svg).toContain('>3 sets<');
    const zeros = svg.match(/>0</g) ?? [];
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it('respects showPercent option', () => {
    const dist = new Map<number, number>([[1, 50], [2, 50]]);
    const svg = buildShareDistributionSvg(dist, {
      style: { ...DEFAULT_SHARE_DIST_STYLE, showPercent: true },
    });
    expect(svg).toContain('50%');
  });
});
