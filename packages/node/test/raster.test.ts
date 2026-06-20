import { describe, expect, it } from 'vitest';
import { analyzeCsvText, toNetworkSvg } from '../src/api.ts';
import { loadSampleText } from '../src/samples.ts';
import { svgToPng, svgToPdf } from '../src/raster.ts';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('svgToPng', () => {
  it('rasterizes an SVG string to a valid PNG', () => {
    const svg = toNetworkSvg(analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4')));
    const png = svgToPng(svg);
    expect(Buffer.from(png.subarray(0, 4)).equals(PNG_MAGIC)).toBe(true);
    expect(png.length).toBeGreaterThan(1000);
  });

  it('respects a fitWidth option (larger width => more bytes)', () => {
    const svg = toNetworkSvg(analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4')));
    const small = svgToPng(svg, { fitWidth: 300 });
    const large = svgToPng(svg, { fitWidth: 1200 });
    expect(large.length).toBeGreaterThan(small.length);
  });
});

describe('svgToPdf', () => {
  it('produces a valid single-page PDF embedding the rendered figure', async () => {
    const svg = toNetworkSvg(analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4')));
    const pdf = await svgToPdf(svg);
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
