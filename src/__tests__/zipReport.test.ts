import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateZipReport, formatP } from '../utils/zipReport.ts';
import type { ZipReportParams } from '../utils/zipReport.ts';
import type { VennDocument } from '../types.ts';
import type { VennResult } from '../utils/csvParser.ts';

const capturedFiles: Array<{ name: string; content: unknown }> = [];

vi.mock('jszip', () => ({
  default: class MockJSZip {
    file(name: string, content: unknown) {
      capturedFiles.push({ name, content });
      return this;
    }
    async generateAsync() {
      return new Blob(['mock-zip']);
    }
  },
}));

vi.mock('exceljs', () => ({
  default: {
    Workbook: class MockWorkbook {
      creator = '';
      created = new Date();
      xlsx = { writeBuffer: async () => new ArrayBuffer(8) };
      addWorksheet() {
        return {
          addRow: vi.fn(),
          getRow: () => ({ font: {}, alignment: {} }),
          views: [],
          columns: [],
        };
      }
    },
  },
}));

vi.mock('../utils/pdfReport.ts', () => ({
  generatePdfReport: vi.fn(async () => new Blob(['pdf'])),
}));

vi.mock('../utils/svgToImage.ts', () => ({
  svgStringToDataUrl: vi.fn(async () => ({
    dataUrl: 'data:image/png;base64, MOCK',
    width: 100,
    height: 100,
  })),
}));

vi.mock('../utils/reportArtefacts.ts', () => ({
  buildReportArtefacts: vi.fn(() => ({
    vennSvgPrepared: '<svg/>',
    vennSvgStandalone: '<svg/>',
    upsetSvg: '<svg/>',
    networkSvg: '<svg/>',
    enrichmentBarSvg: '<svg/>',
    enrichmentLollipopSvg: '<svg/>',
    enrichmentHeatmapSvg: '<svg/>',
  })),
}));

const baseDoc: VennDocument = {
  filename: 'test.svg',
  rawSvgAttrs: '',
  viewBox: { x: 0, y: 0, w: 100, h: 100 },
  comment: '',
  shapes: [],
  shapesExtras: [],
  texts: { header: null, names: [], values: [], sums: [] },
  bullets: [],
  meta: { headerHidden: false, bulletsHidden: false, hiddenIds: new Set(), hiddenGroups: new Set() },
};

const baseResult: VennResult = {
  inclusive: new Map([['A', 5], ['B', 4], ['AB', 2]]),
  exclusive: new Map([['A', 3], ['B', 2], ['AB', 2]]),
  inclusiveItems: new Map(),
  exclusiveItems: new Map([['A', ['a1', 'a2', 'a3']], ['B', ['b1', 'b2']], ['AB', ['ab1', 'ab2']]]),
  totalUniqueItems: 7,
};

const baseParams: ZipReportParams = {
  doc: baseDoc,
  vennResult: baseResult,
  n: 2,
  setNames: ['Group A', 'Group B'],
  totalItems: 7,
  totalFileRows: 10,
  filename: 'my_data.tsv',
  title: 'Test Report',
  modelName: 'venn-2-set.svg',
  columnMapping: [0, 1],
  fileType: 'binary',
  itemDelimiter: ',',
  shapeColors: { A: '#FFF200', B: '#2E3192' },
  enrichmentMetric: 'neglog10fdr',
  sourceKind: 'file',
  hasHeader: true,
  sheetIndex: 0,
  headers: ['Group A', 'Group B'],
  rawData: [['item1', '1', '0'], ['item2', '0', '1'], ['item3', '1', '1']],
};

describe('generateZipReport', () => {
  beforeEach(() => {
    capturedFiles.length = 0;
  });

  it('includes the new analysis scripts and session file in the zip', async () => {
    await generateZipReport({
      ...baseParams,
      sessionJson: JSON.stringify({ version: '1', savedAt: 'now' }),
    });

    const names = capturedFiles.map(f => f.name);
    expect(names).toContain('analysis_script.py');
    expect(names).toContain('analysis_script.R');
    expect(names).toContain('analysis_script.mjs');
    expect(names).toContain('session.json');
  });

  it('omits session.json when sessionJson is not provided', async () => {
    await generateZipReport(baseParams);
    const names = capturedFiles.map(f => f.name);
    expect(names).toContain('analysis_script.py');
    expect(names).toContain('analysis_script.R');
    expect(names).toContain('analysis_script.mjs');
    expect(names).not.toContain('session.json');
  });

  it('writes analysis scripts using the current source filename and model', async () => {
    await generateZipReport({
      ...baseParams,
      filename: 'dataset_real_cancer_drivers_4.tsv',
      modelName: 'edwards-4',
    });

    const py = capturedFiles.find(f => f.name === 'analysis_script.py')?.content as string;
    const r = capturedFiles.find(f => f.name === 'analysis_script.R')?.content as string;
    expect(py).toContain('dataset_real_cancer_drivers_4.tsv');
    expect(py).toContain('edwards-4');
    expect(r).toContain('dataset_real_cancer_drivers_4.tsv');
    expect(r).toContain('edwards-4');
  });

  it('threads paste import provenance into the bundled Python script (no file re-open, data embedded inline)', async () => {
    await generateZipReport({
      ...baseParams,
      sourceKind: 'paste',
      hasHeader: false,
      headers: ['Group A', 'Group B'],
      rawData: [['item1', '1', '0'], ['item2', '0', '1'], ['item3', '1', '1']],
    });

    const py = capturedFiles.find(f => f.name === 'analysis_script.py')?.content as string;
    const r = capturedFiles.find(f => f.name === 'analysis_script.R')?.content as string;
    const js = capturedFiles.find(f => f.name === 'analysis_script.mjs')?.content as string;

    expect(py).not.toContain('open(FILE');
    expect(py).toContain('rows = [');
    expect(py).toContain('item1');

    expect(r).not.toContain('readLines(FILE');
    expect(r).toContain('item1');

    expect(js).toContain('item1');
  });

  it('keeps legacy zip contents unchanged', async () => {
    await generateZipReport(baseParams);
    const names = capturedFiles.map(f => f.name);
    expect(names).toContain('venn_report_2-sets.pdf');
    expect(names).toContain('regions_summary.tsv');
    expect(names).toContain('items_matrix.tsv');
    expect(names).toContain('venn_diagram_2-sets.svg');
    expect(names).toContain('upset_plot_2-sets.svg');
    expect(names).toContain('venn_network_2-sets.svg');
    expect(names).toContain('enrichment_statistics_2-sets.xlsx');
    expect(names).toContain('stat_bar_chart.svg');
    expect(names).toContain('stat_lollipop_chart.svg');
    expect(names).toContain('stat_heatmap_chart.svg');
    expect(names).toContain('README.txt');
  });
});

describe('zipReport formatP (display-only)', () => {
  it('floors an exact-zero p-value to the underflow annotation', () => {
    expect(formatP(0)).toBe('< 1e-300');
  });

  it('keeps the existing scientific-notation format for small nonzero p', () => {
    expect(formatP(5e-20)).toBe((5e-20).toExponential(2));
  });

  it('keeps the existing fixed format for p >= 0.001', () => {
    expect(formatP(0.0234)).toBe((0.0234).toFixed(4));
  });
});
