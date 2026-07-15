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
import type { VennResult, Delimiter } from './csvParser.ts';
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
import { generatePythonScript, generateRScript, generateNpmScript } from './scriptExport.ts';
import type { ScriptExportParams } from './scriptExport.ts';
import { APP_VERSION } from '../version.ts';
import { buildStatisticsWorkbook } from './statisticsWorkbook.ts';
export { formatP } from './statisticsWorkbook.ts';

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
  columnMapping: number[];
  fileType: 'binary' | 'aggregated';
  itemDelimiter: Delimiter;
  shapeColors: Record<string, string>;
  enrichmentMetric: 'neglog10fdr' | 'foldEnrichment';
  sessionJson?: string;
  proportionalAccuracy?: ProportionalAccuracy | null;
  enrichmentPlotSettings?: EnrichmentPlotSettings;
  onProgress?: (step: string, percent: number) => void;
  /** Where the data came from. 'file'/'sample' → a real local file the script can re-open;
   *  'paste'/'url' → no local file, data must be embedded inline. */
  sourceKind: 'file' | 'sample' | 'paste' | 'url';
  /** Whether the source file's first row is a header (mirrors the import dialog checkbox). */
  hasHeader: boolean;
  /** 0-based worksheet index for .xlsx sources. */
  sheetIndex: number;
  /** Column headers (already resolved). */
  headers: string[];
  /** The parsed data rows (post-import), used for inline embedding of paste/url sources. */
  rawData: string[][];
}

const STEP_COUNT = 9;
function progress(params: ZipReportParams, stepIndex: number, label: string): void {
  const pct = Math.round((stepIndex / STEP_COUNT) * 100);
  params.onProgress?.(label, pct);
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
  lines.push(`  analysis_script.py                      Reproducible Python script (venn-diagram-lab package)`);
  lines.push(`  analysis_script.R                       Reproducible R script (vennDiagramLab package)`);
  lines.push(`  analysis_script.mjs                     Reproducible Node.js/npm script (venn-diagram-lab package)`);
  lines.push(`  session.json                            Full Data-mode session (same format as Save Session)`);
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

  // 8. Analysis scripts (same output as the dedicated Python/R export buttons)
  progress(params, 7, 'Writing analysis scripts...');
  const scriptParams: ScriptExportParams = {
    filename: params.filename,
    fileType: params.fileType,
    delimiter: params.itemDelimiter,
    columnMapping: params.columnMapping,
    setNames: params.setNames,
    model: params.modelName,
    shapeColors: params.shapeColors,
    enrichmentMetric: params.enrichmentMetric,
    n,
    sourceKind: params.sourceKind,
    hasHeader: params.hasHeader,
    sheetIndex: params.sheetIndex,
    headers: params.headers,
    rawData: params.rawData,
  };
  zip.file('analysis_script.py', generatePythonScript(scriptParams));
  zip.file('analysis_script.R', generateRScript(scriptParams));
  zip.file('analysis_script.mjs', generateNpmScript(scriptParams));
  if (params.sessionJson) {
    zip.file('session.json', params.sessionJson);
  }

  // 9. Assemble zip
  progress(params, 8, 'Assembling zip...');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  progress(params, 9, 'Done.');
  return blob;
}
