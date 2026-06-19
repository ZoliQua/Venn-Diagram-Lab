import { describe, expect, it } from 'vitest';
import { analyzeCsvText, toVennSvg } from '../src/api.ts';
import { loadSampleText } from '../src/samples.ts';

describe('toVennSvg', () => {
  it('renders a 4-set sample into the venn-4-set template', () => {
    const result = analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4'));
    const svg = toVennSvg(result, 'venn-4-set');
    expect(svg).toContain('<svg');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).toContain(result.setNames[0]);
    const aOnly = result.venn.exclusive.get('A') ?? 0;
    expect(svg).toContain(`>${aOnly}<`);
  });

  it('throws for an unknown model', () => {
    const result = analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4'));
    expect(() => toVennSvg(result, 'nope')).toThrow(/model/i);
  });

  it('throws when model set count does not match data column count', () => {
    const result = analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4')); // 4 columns
    expect(() => toVennSvg(result, 'venn-3-set')).toThrow(/sets|count/i);
  });

  it('fills CountSUM per-set totals on a 6-set model', () => {
    const result = analyzeCsvText(loadSampleText('dataset_mock_gene_sets')); // 6 columns
    const svg = toVennSvg(result, 'venn-6-set');
    const sizeA = result.venn.inclusive.get('A') ?? 0;
    expect(sizeA).toBeGreaterThan(0);
    expect(new RegExp(`id="CountSUM_A"[^>]*>${sizeA}<`).test(svg)).toBe(true);
  });
});
