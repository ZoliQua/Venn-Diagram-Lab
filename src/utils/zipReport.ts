/**
 * Zip bundle report generator (v1.12.0).
 *
 * Produces a single `.zip` that contains the full PDF report plus every
 * artefact the dedicated export buttons would give (TSVs, SVGs, XLSX) —
 * all in the zip root, matching the filename convention agreed with Zoli.
 *
 * jszip and exceljs are lazy-imported so the main bundle stays lean; the
 * libraries are fetched only when the user clicks "Report (zip)".
 */
import type { VennDocument } from '../types.ts';
import type { VennResult } from './csvParser.ts';
import type { ProportionalAccuracy } from './proportionalLayout.ts';
import type { PairwiseStat } from './statistics.ts';
import type { EnrichmentPlotSettings } from './enrichmentPlotStyle.ts';
import { pairwiseStatistics } from './statistics.ts';
import { exportRegionSummaryTsv, exportMatrixTsv } from './exportData.ts';
import { buildReportArtefacts } from './reportArtefacts.ts';
import { DEFAULT_SHARE_DIST_STYLE } from './shareDistributionSvgBuilder.ts';
import { svgStringToDataUrl } from './svgToImage.ts';
import { generatePdfReport } from './pdfReport.ts';
import { ABOUT_REPORT_SECTIONS } from './aboutReport.ts';
import { APP_VERSION } from '../version.ts';

export interface ZipReportParams {
  doc: VennDocument;
  vennResult: VennResult;
  n: number;
  setNames: string[];
  totalItems: number;
  totalFileRows: number;
  filename: string;
  title: string;
  modelName: string;
  proportionalAccuracy?: ProportionalAccuracy | null;
  enrichmentPlotSettings?: EnrichmentPlotSettings;
  onProgress?: (step: string, percent: number) => void;
}

const STEP_COUNT = 8;
function progress(params: ZipReportParams, stepIndex: number, label: string): void {
  const pct = Math.round((stepIndex / STEP_COUNT) * 100);
  params.onProgress?.(label, pct);
}

function sigLabel(fdr: number): number | string {
  if (fdr < 0.001) return '***';
  if (fdr < 0.01) return '**';
  if (fdr < 0.05) return '*';
  return 'ns';
}

function buildReadme(params: ZipReportParams, stats: PairwiseStat[]): string {
  const now = new Date();
  const iso = now.toISOString();
  const n = params.n;
  const baseName = params.filename.replace(/\.[^.]+$/, '');

  const lines: string[] = [];
  lines.push('Venn Diagram Lab \u2014 Report Bundle');
  lines.push('==========================================');
  lines.push('');
  lines.push(`Generated       : ${iso}`);
  lines.push(`App version     : v${APP_VERSION}`);
  lines.push(`Source file     : ${params.filename}`);
  lines.push(`Title           : ${params.title}`);
  lines.push(`Model           : ${params.modelName || '(not recorded)'}`);
  lines.push(`Number of sets  : ${n}`);
  lines.push(`Pairs tested    : ${stats.length}`);
  lines.push(`Total items     : ${params.totalItems}`);
  lines.push(`Source rows     : ${params.totalFileRows}`);
  lines.push('');
  lines.push('Set names:');
  const letters = 'ABCDEFGHI'.slice(0, n).split('');
  for (let i = 0; i < n; i++) {
    lines.push(`  ${letters[i]}  ${params.setNames[i] ?? '(unnamed)'}`);
  }
  lines.push('');
  lines.push('Files in this bundle (all at the zip root):');
  lines.push('-------------------------------------------');
  lines.push(`  venn_report_${n}-sets.pdf             Multi-page PDF report`);
  lines.push(`  regions_summary.tsv                     Per-region exclusive + inclusive counts + item lists`);
  lines.push(`  items_matrix.tsv                        Per-item binary set-membership matrix`);
  lines.push(`  venn_diagram_${n}-sets.svg            Venn diagram (as shown on screen)`);
  lines.push(`  upset_plot_${n}-sets.svg              UpSet plot`);
  lines.push(`  venn_network_${n}-sets.svg            Force-directed set relationship network`);
  lines.push(`  enrichment_statistics_${n}-sets.xlsx  Workbook: Pairwise Jaccard / Sorensen-Dice / Intersection Enrichment`);
  lines.push(`  stat_bar_chart.svg                      Enrichment bar chart (\u2212log10(FDR))`);
  lines.push(`  stat_lollipop_chart.svg                 Enrichment lollipop chart (stick = \u2212log10(FDR), dot = intersection)`);
  lines.push(`  stat_heatmap_chart.svg                  Pairwise \u2212log10(FDR) heatmap`);
  lines.push(`  README.txt                              This file`);
  lines.push('');
  lines.push(`Zip root filename: venn_report_${baseName}.zip`);
  lines.push('');
  lines.push('');
  lines.push('About This Report');
  lines.push('==========================================');
  lines.push('');
  for (const section of ABOUT_REPORT_SECTIONS) {
    lines.push(section.title);
    lines.push('-'.repeat(section.title.length));
    if (section.text) {
      const wrapped = wrap(section.text, 100);
      for (const w of wrapped) lines.push(w);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** Simple word-wrap — preserves words, targets ~width chars per line. */
function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let buf = '';
  for (const w of words) {
    if (!buf) { buf = w; continue; }
    if (buf.length + 1 + w.length > width) {
      out.push(buf);
      buf = w;
    } else {
      buf += ' ' + w;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function formatP(p: number): string {
  if (p < 0.001) return p.toExponential(2);
  return p.toFixed(4);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function buildStatisticsWorkbook(stats: PairwiseStat[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = `Venn Diagram Lab v${APP_VERSION}`;
  wb.created = new Date();

  // Sheet 1 — Pairwise Jaccard (sorted by Jaccard desc)
  const s1 = wb.addWorksheet('Pairwise Jaccard');
  s1.addRow(['Pair', 'Name A', 'Name B', 'Size A', 'Size B', 'Intersection', 'Union', 'Jaccard', 'Overlap Coeff']);
  const jacSorted = [...stats].sort((a, b) => b.jaccard - a.jaccard);
  for (const s of jacSorted) {
    s1.addRow([s.label, s.nameA, s.nameB, s.sizeA, s.sizeB, s.intersection, s.union,
      Number(s.jaccard.toFixed(4)), Number(s.overlapCoeff.toFixed(4))]);
  }

  // Sheet 2 — Sorensen-Dice (sorted by Dice desc)
  const s2 = wb.addWorksheet('Sorensen-Dice');
  s2.addRow(['Pair', 'Name A', 'Name B', 'Dice']);
  const diceSorted = [...stats].sort((a, b) => b.dice - a.dice);
  for (const s of diceSorted) {
    s2.addRow([s.label, s.nameA, s.nameB, Number(s.dice.toFixed(4))]);
  }

  // Sheet 3 — Intersection Enrichment (sorted by FDR asc)
  const s3 = wb.addWorksheet('Intersection Enrichment');
  s3.addRow(['Pair', 'Name A', 'Name B', 'Size A', 'Size B', 'Intersection', 'Expected', 'Fold Enrichment', 'p-value', 'FDR', 'Significance']);
  const fdrSorted = [...stats].sort((a, b) => a.fdr - b.fdr);
  for (const s of fdrSorted) {
    s3.addRow([s.label, s.nameA, s.nameB, s.sizeA, s.sizeB, s.intersection,
      Number(s.expected.toFixed(2)), Number(s.foldEnrichment.toFixed(3)),
      formatP(s.pValue), formatP(s.fdr), sigLabel(s.fdr)]);
  }

  // Styling — header row bold + frozen
  for (const sheet of [s1, s2, s3]) {
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.alignment = { vertical: 'middle' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    // Column widths
    sheet.columns?.forEach(col => {
      let max = 10;
      col?.eachCell?.({ includeEmpty: false }, cell => {
        const len = String(cell.value ?? '').length;
        if (len > max) max = len;
      });
      if (col) col.width = Math.min(max + 2, 40);
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function generateZipReport(params: ZipReportParams): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const n = params.n;

  // 1. Build all SVG artefacts in one pass
  progress(params, 0, 'Rendering Venn diagram...');
  const pairwiseStats = pairwiseStatistics(params.vennResult, n, params.totalItems, params.setNames);
  const art = buildReportArtefacts({
    doc: params.doc,
    vennResult: params.vennResult,
    n,
    setNames: params.setNames,
    totalItems: params.totalItems,
    pairwiseStats,
  });

  // Convert to PNG dataURLs for PDF embedding
  const vennImage = await svgStringToDataUrl(art.vennSvgPrepared);

  progress(params, 1, 'Rendering UpSet plot...');
  const upsetImage = await svgStringToDataUrl(art.upsetSvg);

  progress(params, 2, 'Rendering Network diagram...');
  const networkImage = await svgStringToDataUrl(art.networkSvg);

  progress(params, 3, 'Rendering enrichment plots...');
  const enrichmentBar = await svgStringToDataUrl(art.enrichmentBarSvg);
  const enrichmentLollipop = await svgStringToDataUrl(art.enrichmentLollipopSvg);
  const enrichmentHeatmap = await svgStringToDataUrl(art.enrichmentHeatmapSvg);

  // 2. Build PDF
  progress(params, 4, 'Building PDF...');
  const pdfBlob = await generatePdfReport({
    title: params.title,
    filename: params.filename,
    vennResult: params.vennResult,
    n,
    setNames: params.setNames,
    totalItems: params.totalItems,
    totalFileRows: params.totalFileRows,
    vennImageDataUrl: vennImage.dataUrl,
    vennImageWidth: vennImage.width,
    vennImageHeight: vennImage.height,
    upsetImageDataUrl: upsetImage.dataUrl,
    upsetImageWidth: upsetImage.width,
    upsetImageHeight: upsetImage.height,
    networkImageDataUrl: networkImage.dataUrl,
    networkImageWidth: networkImage.width,
    networkImageHeight: networkImage.height,
    enrichmentBarDataUrl: enrichmentBar.dataUrl,
    enrichmentBarWidth: enrichmentBar.width,
    enrichmentBarHeight: enrichmentBar.height,
    enrichmentLollipopDataUrl: enrichmentLollipop.dataUrl,
    enrichmentLollipopWidth: enrichmentLollipop.width,
    enrichmentLollipopHeight: enrichmentLollipop.height,
    enrichmentHeatmapDataUrl: enrichmentHeatmap.dataUrl,
    enrichmentHeatmapWidth: enrichmentHeatmap.width,
    enrichmentHeatmapHeight: enrichmentHeatmap.height,
    modelName: params.modelName,
    proportionalAccuracy: params.proportionalAccuracy,
    heatmapStyle: params.enrichmentPlotSettings?.heatmap,
    heatmapMetric: 'neglog10fdr',
    shareDistributionStyle: params.enrichmentPlotSettings ? {
      ...DEFAULT_SHARE_DIST_STYLE,
      background: params.enrichmentPlotSettings.shareDistribution.background,
      fontSize: params.enrichmentPlotSettings.shareDistribution.fontSize,
      fontFamily: params.enrichmentPlotSettings.shareDistribution.fontFamily,
      showAxisLabel: params.enrichmentPlotSettings.shareDistribution.showAxisLabel,
    } : undefined,
  });
  zip.file(`venn_report_${n}-sets.pdf`, pdfBlob);

  // 3. TSVs (no BOM — plain UTF-8)
  progress(params, 5, 'Writing TSV files...');
  const regionsTsv = exportRegionSummaryTsv(params.vennResult, n, params.setNames, params.totalItems);
  const matrixTsv = exportMatrixTsv(params.vennResult, n, params.setNames);
  zip.file('regions_summary.tsv', regionsTsv);
  zip.file('items_matrix.tsv', matrixTsv);

  // 4. Diagram SVGs
  zip.file(`venn_diagram_${n}-sets.svg`, art.vennSvgStandalone);
  zip.file(`upset_plot_${n}-sets.svg`, art.upsetSvg);
  zip.file(`venn_network_${n}-sets.svg`, art.networkSvg);

  // 5. Enrichment stat SVGs
  zip.file('stat_bar_chart.svg', art.enrichmentBarSvg);
  zip.file('stat_lollipop_chart.svg', art.enrichmentLollipopSvg);
  zip.file('stat_heatmap_chart.svg', art.enrichmentHeatmapSvg);

  // 6. XLSX workbook
  progress(params, 6, 'Building statistics workbook...');
  const xlsxBlob = await buildStatisticsWorkbook(pairwiseStats);
  zip.file(`enrichment_statistics_${n}-sets.xlsx`, xlsxBlob);

  // 7. README
  zip.file('README.txt', buildReadme(params, pairwiseStats));

  // 8. Assemble zip
  progress(params, 7, 'Assembling zip...');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  progress(params, 8, 'Done.');
  return blob;
}
