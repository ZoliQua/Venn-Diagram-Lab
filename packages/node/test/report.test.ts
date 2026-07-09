import { describe, expect, it } from 'vitest';
import { analyzeCsvText } from '../src/api.ts';
import { loadSampleText } from '../src/samples.ts';
import { listSamples } from '../src/samples.ts';
import { listVennModels } from '../src/vennTemplate.ts';
import { renderPdfReport } from '../src/report/report.ts';

describe('renderPdfReport', () => {
  it('exposes a real sample + matching 4-set model to render', () => {
    expect(listSamples()).toContain('dataset_real_cancer_drivers_4');
    expect(listVennModels()).toContain('venn-4-set.svg');
  });

  it('renders a multi-page PDF report from a sample dataset', async () => {
    const result = analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4'));
    const pdf = await renderPdfReport(result, { title: 'Test', vennModel: 'venn-4-set' });

    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
    // Multi-page with embedded PNG figures — comfortably above 5 KB.
    expect(pdf.length).toBeGreaterThan(5000);
  });

  it('works without opts (defaults a model by set count)', async () => {
    const result = analyzeCsvText(loadSampleText('dataset_real_cancer_drivers_4'));
    const pdf = await renderPdfReport(result);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
  });
});
