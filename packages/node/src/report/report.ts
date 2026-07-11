import { pairwiseStatistics, type EdgeWeightMetric, type PairwiseStat } from '@venn-diagram-lab/core';
import type { AnalyzeResult } from '../api.ts';
import {
  toEnrichmentBarSvg,
  toEnrichmentLollipopSvg,
  toNetworkSvg,
  toShareDistributionSvg,
  toUpsetSvg,
  toVennSvg,
} from '../api.ts';
import { listVennModels, loadVennTemplate } from '../vennTemplate.ts';
import { svgToPng } from '../raster.ts';
import { ABOUT_SECTIONS } from './about.ts';
import { ReportDoc } from './layout.ts';

const LETTERS = 'ABCDEFGHI';

/** Content width in points (must match ReportDoc: PAGE_WIDTH 612 - 2*MARGIN 50). */
const CONTENT_WIDTH = 512;

/** Render width in px used when rasterising figures before embedding. */
const RASTER_WIDTH = 1200;

export interface RenderPdfReportOptions {
  /** Report title, shown in the Data Overview block. Default "Data Report". */
  title?: string;
  /** Source-file label, shown in the Data Overview block. */
  model?: string;
  /** Venn model filename (".svg" optional). If omitted, a bundled model whose set count matches the data is chosen. */
  vennModel?: string;
}

/** Read a PNG's pixel width/height from its IHDR chunk (big-endian, fixed offsets). */
function pngSize(png: Uint8Array): { w: number; h: number } {
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { w: dv.getUint32(16), h: dv.getUint32(20) };
}

/** Pick a bundled Venn model whose set count equals `n` (prefers the canonical `venn-N-set.svg`). */
function defaultModel(n: number): string {
  const models = listVennModels();
  const canonical = `venn-${n}-set.svg`;
  if (models.includes(canonical)) return canonical;
  for (const m of models) {
    const template = loadVennTemplate(m);
    if ((template.match(/id="Name[A-I]"/g) ?? []).length === n) return m;
  }
  throw new Error(`No bundled Venn model matches ${n} sets.`);
}

/** p-value / FDR formatting — mirrors the web report's formatP. */
export function formatP(p: number): string {
  if (p === 0) return '< 1e-300';
  if (p < 0.001) return p.toExponential(1);
  return p.toFixed(4);
}

/** Significance stars — mirrors the web report's sigLabel. */
function sigLabel(fdr: number): string {
  if (fdr < 0.001) return '***';
  if (fdr < 0.01) return '**';
  if (fdr < 0.05) return '*';
  return 'ns';
}

/** Truncate a label to `max` chars (ellipsis) so it fits a fixed table column. */
function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Compose the full multi-page PDF report for an analysis result.
 *
 * Mirrors the web report (`src/utils/pdfReport.ts`) page-for-page: Data
 * Overview + Set Sizes, Venn + UpSet plots, Network + significant edges,
 * Statistics tables (Jaccard, Sorensen-Dice, Enrichment), Enrichment
 * visualisations, Item Share Distribution, and the About / Credits & Cite
 * sections. All figures are rasterised to PNG via resvg and embedded.
 */
export async function renderPdfReport(
  result: AnalyzeResult,
  opts: RenderPdfReportOptions = {},
): Promise<Uint8Array> {
  const n = result.columns.length;
  const letters = LETTERS.slice(0, n).split('');
  const { setNames, venn } = result;
  const totalItems = venn.totalUniqueItems;
  const stats = pairwiseStatistics(venn, n, totalItems, setNames);
  const vennModel = opts.vennModel ?? defaultModel(n);

  const doc = await ReportDoc.create();

  const addFigure = (svg: string, fitWidth: number): void => {
    const png = svgToPng(svg, { fitWidth: RASTER_WIDTH });
    const { w, h } = pngSize(png);
    doc.image(png, w, h, fitWidth);
  };

  // Short "Name (L)" labels used across tables and edge lists.
  const trimmedNames = letters.map((l, i) => {
    const raw = setNames[i] ?? l;
    const short = raw.length > 10 ? raw.slice(0, 10) : raw;
    return `${short} (${l})`;
  });
  const pairLabel = (s: PairwiseStat): string => {
    const a = trimmedNames[s.a.charCodeAt(0) - 65] ?? s.a;
    const b = trimmedNames[s.b.charCodeAt(0) - 65] ?? s.b;
    return `${a} - ${b}`;
  };

  // ── Page 1: Data Overview + Set Sizes ──────────────────────────────
  doc.newPage();
  doc.pageTitle('Venn Diagram Lab — Report');

  const totalRegions = (1 << n) - 1;
  const fullLabel = letters.join('');
  const coreCount = venn.exclusive.get(fullLabel) ?? 0;
  let processedItems = 0;
  let largestLabel = '';
  let largestCount = 0;
  let filledRegions = 0;
  for (let mask = 1; mask < 1 << n; mask++) {
    const label = letters.filter((_, i) => mask & (1 << i)).join('');
    const count = venn.exclusive.get(label) ?? 0;
    processedItems += count;
    if (count > largestCount) {
      largestCount = count;
      largestLabel = label;
    }
    if (count > 0) filledRegions++;
  }

  doc.keyValueRows([
    ['Title', opts.title ?? 'Data Report'],
    ['Source', opts.model ?? '(in-memory data)'],
    ['Venn model', vennModel.replace(/\.svg$/, '')],
    ['Number of sets', String(n)],
    ['Background universe', String(totalItems)],
    ['Items assigned to regions', String(processedItems)],
    ['Total regions', String(totalRegions)],
    ['Filled regions', `${filledRegions} / ${totalRegions}`],
    ['Core intersection (' + fullLabel + ')', String(coreCount)],
    ['Largest exclusive region', largestLabel ? `${largestLabel} (${largestCount})` : '-'],
  ]);

  doc.sectionTitle('Set Sizes');
  const inclusiveTotal = letters.reduce((s, l) => s + (venn.inclusive.get(l) ?? 0), 0);
  const setSizeRows = letters.map((l, i) => {
    const size = venn.inclusive.get(l) ?? 0;
    const excl = venn.exclusive.get(l) ?? 0;
    const shared = size - excl;
    const pct = inclusiveTotal > 0 ? `${((size / inclusiveTotal) * 100).toFixed(1)}%` : '0%';
    return [l, truncate(setNames[i] ?? l, 34), String(size), String(excl), String(shared), pct];
  });
  doc.table(
    ['Set', 'Name', 'Size', 'Exclusive', 'Shared', '%'],
    setSizeRows,
    { columnWidths: [34, 214, 66, 74, 66, 58] },
  );

  // ── Page 2: Venn + UpSet plots ─────────────────────────────────────
  doc.newPage();
  doc.pageTitle('Plots');
  doc.sectionTitle('Venn Diagram');
  addFigure(toVennSvg(result, vennModel), 380);
  doc.sectionTitle('UpSet Plot');
  addFigure(toUpsetSvg(result), CONTENT_WIDTH);

  // ── Page 3: Network + significant edges ────────────────────────────
  doc.newPage();
  doc.sectionTitle('Set Relationship Network');
  addFigure(toNetworkSvg(result, 'jaccard' as EdgeWeightMetric), 400);
  const sigEdges = stats.filter((s) => s.fdr < 0.05);
  if (sigEdges.length > 0) {
    doc.text('Significant edges (FDR < 0.05):', { bold: true, size: 10 });
    const sigText = sigEdges
      .map((s) => `${pairLabel(s)} Jaccard: ${s.jaccard.toFixed(3)}`)
      .join('; ');
    doc.text(sigText, { size: 9 });
  }

  // ── Statistics tables ──────────────────────────────────────────────
  const separatePages = n >= 7; // 7-8-9 sets: each table on its own page
  doc.newPage();
  doc.pageTitle('Statistics');

  doc.sectionTitle('Pairwise Jaccard Index');
  doc.table(
    ['Pair', 'Inter', 'Union', 'Jaccard', 'Overlap'],
    stats.map((s) => [
      pairLabel(s),
      String(s.intersection),
      String(s.union),
      s.jaccard.toFixed(4),
      s.overlapCoeff.toFixed(4),
    ]),
    { columnWidths: [272, 56, 60, 64, 60], size: 8 },
  );

  if (separatePages) doc.newPage();
  doc.sectionTitle('Sørensen–Dice Index');
  doc.table(
    ['Pair', 'Dice'],
    stats.map((s) => [pairLabel(s), s.dice.toFixed(4)]),
    { columnWidths: [412, 100], size: 8 },
  );

  if (separatePages) doc.newPage();
  doc.sectionTitle('Intersection Enrichment (Hypergeometric Test)');
  doc.table(
    ['Pair', 'Obs', 'Exp', 'FE', 'p-value', 'FDR', 'Sig'],
    stats.map((s) => [
      pairLabel(s),
      String(s.intersection),
      s.expected.toFixed(1),
      s.foldEnrichment.toFixed(2),
      formatP(s.pValue),
      formatP(s.fdr),
      sigLabel(s.fdr),
    ]),
    { columnWidths: [196, 44, 54, 48, 62, 62, 46], size: 8 },
  );

  // ── Enrichment visualisations ──────────────────────────────────────
  doc.newPage();
  doc.pageTitle('Statistics: Enrichment Visualisations');
  doc.sectionTitle('Bar chart');
  addFigure(toEnrichmentBarSvg(result), CONTENT_WIDTH);
  doc.sectionTitle('Lollipop chart');
  addFigure(toEnrichmentLollipopSvg(result), CONTENT_WIDTH);

  // ── Item Share Distribution ────────────────────────────────────────
  doc.newPage();
  doc.pageTitle('Item Share Distribution');
  addFigure(toShareDistributionSvg(result), 440);

  // ── About / Credits & Cite ─────────────────────────────────────────
  doc.newPage();
  doc.pageTitle('About This Report');
  for (const section of ABOUT_SECTIONS) {
    doc.sectionTitle(section.title);
    if (!section.body) continue;
    // Preserve intentional line breaks (e.g. the Credits & Cite block).
    for (const line of section.body.split('\n')) {
      doc.text(line, { size: 9 });
    }
  }

  return doc.save();
}
