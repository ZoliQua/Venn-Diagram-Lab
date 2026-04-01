import type { VennResult } from './csvParser.ts';
import { pairwiseStatistics } from './statistics.ts';
import type { PairwiseStat } from './statistics.ts';
import { APP_VERSION } from '../version.ts';
import { ABOUT_REPORT_SECTIONS } from './aboutReport.ts';

export interface PdfReportParams {
  title: string;
  filename: string;
  vennResult: VennResult;
  n: number;
  setNames: string[];
  totalItems: number;
  totalFileRows: number;
  vennImageDataUrl: string;
  vennImageWidth: number;
  vennImageHeight: number;
  upsetImageDataUrl: string;
  upsetImageWidth: number;
  upsetImageHeight: number;
  networkImageDataUrl: string;
  proportionalAccuracy?: { single?: Map<string, number>; pairwise: Map<string, number>; triple?: number; overall: number } | null;
  networkImageWidth: number;
  networkImageHeight: number;
  enrichmentBarDataUrl: string;
  enrichmentBarWidth: number;
  enrichmentBarHeight: number;
  enrichmentLollipopDataUrl: string;
  enrichmentLollipopWidth: number;
  enrichmentLollipopHeight: number;
  enrichmentHeatmapDataUrl: string;
  enrichmentHeatmapWidth: number;
  enrichmentHeatmapHeight: number;
  modelName: string;
}

// A4 portrait dimensions in mm
const PAGE_W = 210;
const PAGE_H = 297;
const M = { top: 20, bottom: 20, left: 15, right: 15 };
const CONTENT_W = PAGE_W - M.left - M.right;

// Font: helvetica (best Unicode support and consistent spacing in jsPDF)
const FONT = 'helvetica';

function formatP(p: number): string {
  if (p < 0.001) return p.toExponential(1);
  return p.toFixed(4);
}

function sigLabel(fdr: number): string {
  if (fdr < 0.001) return '***';
  if (fdr < 0.01) return '**';
  if (fdr < 0.05) return '*';
  return 'ns';
}

/**
 * Draw a table on the PDF document.
 * Returns the Y position after the table.
 * If the table doesn't fit, adds a new page automatically.
 */
function drawTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  x: number,
  startY: number,
  headers: string[],
  rows: (string | number)[][],
  colWidths: number[],
  opts?: {
    aligns?: ('left' | 'right' | 'center')[];
    rowBgColors?: (string | null)[];
    fontSize?: number;
  },
): number {
  const fontSize = opts?.fontSize ?? 8;
  const cellH = 5.5;
  const cellPad = 1.5;
  let y = startY;
  const tableW = colWidths.reduce((a, b) => a + b, 0);

  // If entire table doesn't fit, add page
  const tableH = (rows.length + 1) * cellH + 4;
  if (y + tableH > PAGE_H - M.bottom) {
    pdf.addPage();
    y = M.top;
  }

  const tableStartY = y;

  // Header row
  pdf.setFillColor(230, 230, 235);
  pdf.rect(x, y, tableW, cellH, 'F');
  pdf.setFontSize(fontSize);
  pdf.setFont(FONT, 'bold');
  pdf.setTextColor(30, 30, 30);

  let cx = x;
  for (let c = 0; c < headers.length; c++) {
    const align = opts?.aligns?.[c] ?? 'left';
    const tx = align === 'right' ? cx + colWidths[c] - cellPad
      : align === 'center' ? cx + colWidths[c] / 2
      : cx + cellPad;
    pdf.text(String(headers[c]), tx, y + cellH - 1.5, { align });
    cx += colWidths[c];
  }
  y += cellH;

  // Data rows
  pdf.setFont(FONT, 'normal');
  for (let r = 0; r < rows.length; r++) {
    // Page break check
    if (y + cellH > PAGE_H - M.bottom) {
      // Draw border for current page section
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.rect(x, tableStartY, tableW, y - tableStartY);
      pdf.line(x, tableStartY + cellH, x + tableW, tableStartY + cellH);
      cx = x;
      for (let c = 0; c < colWidths.length - 1; c++) { cx += colWidths[c]; pdf.line(cx, tableStartY, cx, y); }

      pdf.addPage();
      y = M.top;
      // Re-draw header on new page — but don't reset tableStartY tracking
      pdf.setFillColor(230, 230, 235);
      pdf.rect(x, y, tableW, cellH, 'F');
      pdf.setFontSize(fontSize);
      pdf.setFont(FONT, 'bold');
      pdf.setTextColor(30, 30, 30);
      cx = x;
      for (let c = 0; c < headers.length; c++) {
        const align = opts?.aligns?.[c] ?? 'left';
        const tx = align === 'right' ? cx + colWidths[c] - cellPad
          : align === 'center' ? cx + colWidths[c] / 2
          : cx + cellPad;
        pdf.text(String(headers[c]), tx, y + cellH - 1.5, { align });
        cx += colWidths[c];
      }
      y += cellH;
      pdf.setFont(FONT, 'normal');
    }

    // Row background
    const bgColor = opts?.rowBgColors?.[r];
    if (bgColor) {
      const rgb = hexToRgbArr(bgColor);
      pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
      pdf.rect(x, y, tableW, cellH, 'F');
    }

    cx = x;
    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(fontSize);
    for (let c = 0; c < rows[r].length; c++) {
      const align = opts?.aligns?.[c] ?? 'left';
      const tx = align === 'right' ? cx + colWidths[c] - cellPad
        : align === 'center' ? cx + colWidths[c] / 2
        : cx + cellPad;
      pdf.text(String(rows[r][c]), tx, y + cellH - 1.5, { align });
      cx += colWidths[c];
    }
    y += cellH;
  }

  // Table border for last page section
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.2);
  pdf.rect(x, Math.max(M.top, tableStartY), tableW, y - Math.max(M.top, tableStartY));
  cx = x;
  for (let c = 0; c < colWidths.length - 1; c++) { cx += colWidths[c]; pdf.line(cx, Math.max(M.top, tableStartY), cx, y); }

  return y + 4;
}

// Pastel colors for pie chart
const PIE_COLORS: Record<string, string> = {
  A: '#FFE082', B: '#90CAF9', C: '#EF9A9A', D: '#B0BEC5',
  E: '#A1887F', F: '#CE93D8', G: '#F48FB1', H: '#80DEEA', I: '#FFCC80',
};

/**
 * Draw a pie chart on the PDF using triangle fan.
 */
function drawPieChart(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  cx: number,
  cy: number,
  radius: number,
  slices: { label: string; value: number; color: string }[],
): void {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2; // start at top

  // Draw filled slices using triangle fan (center + two adjacent arc points)
  for (const slice of slices) {
    const sweepAngle = (slice.value / total) * Math.PI * 2;
    if (sweepAngle < 0.001) { startAngle += sweepAngle; continue; }

    const rgb = hexToRgbArr(slice.color);
    pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
    pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
    pdf.setLineWidth(0);

    // Draw as many small triangles (center, p1, p2) to fill the arc
    const steps = Math.max(12, Math.ceil(sweepAngle / 0.04));
    for (let i = 0; i < steps; i++) {
      const a1 = startAngle + (sweepAngle * i) / steps;
      const a2 = startAngle + (sweepAngle * (i + 1)) / steps;
      const x1 = cx + Math.cos(a1) * radius;
      const y1 = cy + Math.sin(a1) * radius;
      const x2 = cx + Math.cos(a2) * radius;
      const y2 = cy + Math.sin(a2) * radius;
      pdf.triangle(cx, cy, x1, y1, x2, y2, 'F');
    }

    startAngle += sweepAngle;
  }

  // Draw white separator lines between slices
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.5);
  let angle = -Math.PI / 2;
  for (const slice of slices) {
    const sweepAngle = (slice.value / total) * Math.PI * 2;
    pdf.line(cx, cy, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    angle += sweepAngle;
  }

  // Outer circle border
  pdf.setDrawColor(160, 160, 160);
  pdf.setLineWidth(0.3);
  pdf.circle(cx, cy, radius);

  // Labels outside the circle
  angle = -Math.PI / 2;
  for (const slice of slices) {
    const sweepAngle = (slice.value / total) * Math.PI * 2;
    const midAngle = angle + sweepAngle / 2;
    const labelR = radius + 6;
    const lx = cx + Math.cos(midAngle) * labelR;
    const ly = cy + Math.sin(midAngle) * labelR;
    const pct = ((slice.value / total) * 100).toFixed(1);

    pdf.setFontSize(7);
    pdf.setFont(FONT, 'normal');
    pdf.setTextColor(50, 50, 50);
    const align = Math.cos(midAngle) < -0.1 ? 'right' : Math.cos(midAngle) > 0.1 ? 'left' : 'center';
    pdf.text(`${slice.label} (${pct}%)`, lx, ly + 1, { align });

    angle += sweepAngle;
  }
}

function hexToRgbArr(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function addFooter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  pageNum: number,
  totalPages: number,
): void {
  pdf.setPage(pageNum);
  pdf.setFontSize(7);
  pdf.setFont(FONT, 'normal');
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    `Venn Diagram Lab v${APP_VERSION} \u2014 Page ${pageNum} of ${totalPages}`,
    PAGE_W / 2, PAGE_H - 10,
    { align: 'center' },
  );
}

function sectionTitle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  title: string,
  y: number,
  minContentHeight = 25,
): number {
  // Ensure title + at least some content fits; otherwise new page
  if (y + 12 + minContentHeight > PAGE_H - M.bottom) {
    pdf.addPage();
    y = M.top;
  }
  pdf.setFontSize(12);
  pdf.setFont(FONT, 'bold');
  pdf.setTextColor(30, 30, 80);
  pdf.text(title, M.left, y + 6);
  pdf.setDrawColor(100, 100, 180);
  pdf.setLineWidth(0.3);
  pdf.line(M.left, y + 8, M.left + CONTENT_W, y + 8);
  return y + 13;
}

function pageTitle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  title: string,
  y: number,
): number {
  pdf.setFontSize(16);
  pdf.setFont(FONT, 'bold');
  pdf.setTextColor(20, 20, 60);
  pdf.text(title, PAGE_W / 2, y + 6, { align: 'center' });
  return y + 14;
}

export async function generatePdfReport(params: PdfReportParams): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');

  const {
    filename, vennResult, n, setNames, totalItems, totalFileRows,
    vennImageDataUrl, vennImageWidth, vennImageHeight,
    upsetImageDataUrl, upsetImageWidth, upsetImageHeight,
    networkImageDataUrl, networkImageWidth, networkImageHeight,
    enrichmentBarDataUrl, enrichmentBarWidth, enrichmentBarHeight,
    enrichmentLollipopDataUrl, enrichmentLollipopWidth, enrichmentLollipopHeight,
    enrichmentHeatmapDataUrl, enrichmentHeatmapWidth, enrichmentHeatmapHeight,
  } = params;

  const letters = 'ABCDEFGHI'.slice(0, n).split('');
  const stats = pairwiseStatistics(vennResult, n, totalItems, setNames);
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Trimmed names: first 10 chars + " (X)"
  const trimmedNames = letters.map((l, i) => {
    const raw = setNames[i] ?? l;
    const short = raw.length > 10 ? raw.slice(0, 10) : raw;
    return `${short} (${l})`;
  });

  // Pair label helper: "Name1 (A) - Name2 (B)"
  const pairLabel = (s: PairwiseStat) => {
    const a = trimmedNames[s.a.charCodeAt(0) - 65];
    const b = trimmedNames[s.b.charCodeAt(0) - 65];
    return `${a} - ${b}`;
  };

  // Compute processed items (sum of all exclusive counts)
  let processedItems = 0;
  for (const [, count] of vennResult.exclusive) {
    processedItems += count;
  }

  let y = M.top;

  // ════════════════════════════════════════════
  // PAGE 1: Title + Data Overview + Set Sizes
  // ════════════════════════════════════════════

  // ── Title ──
  pdf.setFontSize(22);
  pdf.setFont(FONT, 'bold');
  pdf.setTextColor(20, 20, 60);
  pdf.text('Data Report', PAGE_W / 2, y + 8, { align: 'center' });
  y += 12;

  // ── Subtitle ──
  pdf.setFontSize(10);
  pdf.setFont(FONT, 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Model: Venn ${n}-Set Diagram`, PAGE_W / 2, y + 4, { align: 'center' });
  y += 10;

  // ── Data Overview ──
  y = sectionTitle(pdf, 'Data Overview', y);

  const totalRegions = (1 << n) - 1;
  const fullLabel = letters.join('');
  const coreCount = vennResult.exclusive.get(fullLabel) ?? 0;
  let largestLabel = '';
  let largestCount = 0;
  let emptyRegions = 0;
  let filledRegions = 0;
  for (let mask = 1; mask < (1 << n); mask++) {
    const label = letters.filter((_, i) => mask & (1 << i)).join('');
    const count = vennResult.exclusive.get(label) ?? 0;
    if (count > largestCount) { largestCount = count; largestLabel = label; }
    if (count === 0) emptyRegions++;
    else filledRegions++;
  }

  const overviewRows: [string, string][] = [
    ['Date', timestamp],
    ['Source file', filename],
    ['Total items in the file', String(totalFileRows)],
    ['Total items processed', String(processedItems)],
    ['Number of sets', String(n)],
    ['Total regions', String(totalRegions)],
    ['Core intersection (' + fullLabel + ')', String(coreCount)],
    ['Largest exclusive region', `${largestLabel} (${largestCount})`],
    ['Filled regions', `${filledRegions} / ${totalRegions}`],
    ['Empty regions', `${emptyRegions} / ${totalRegions}`],
  ];

  pdf.setFontSize(9);
  pdf.setFont(FONT, 'normal');
  pdf.setTextColor(40, 40, 40);
  for (const [label, value] of overviewRows) {
    pdf.setFont(FONT, 'normal');
    pdf.text(label + ':', M.left + 2, y + 4);
    pdf.setFont(FONT, 'bold');
    pdf.text(value, M.left + 70, y + 4);
    y += 5;
  }
  y += 4;

  // ── Set Sizes ──
  y = sectionTitle(pdf, 'Set Sizes', y);

  // Pie Chart first
  const pieR = 28;
  const pieChartH = pieR * 2 + 20;
  if (y + pieChartH > PAGE_H - M.bottom) {
    pdf.addPage();
    y = M.top;
  }

  const pieCx = PAGE_W / 2;
  const pieCy = y + pieR + 4;
  const pieSlices = letters.map((l, i) => ({
    label: trimmedNames[i],
    value: vennResult.inclusive.get(l) ?? 0,
    color: PIE_COLORS[l] ?? '#B0BEC5',
  }));
  drawPieChart(pdf, pieCx, pieCy, pieR, pieSlices);
  y += pieChartH + 2;

  // Table below pie chart — track truncated names for footnote
  const truncatedNames: { letter: string; fullName: string }[] = [];
  const inclusiveTotal = letters.reduce((s, l) => s + (vennResult.inclusive.get(l) ?? 0), 0);
  const setSizeRows = letters.map((l, i) => {
    const size = vennResult.inclusive.get(l) ?? 0;
    const excl = vennResult.exclusive.get(l) ?? 0;
    const incl = size - excl;
    const pct = inclusiveTotal > 0 ? (size / inclusiveTotal * 100).toFixed(1) + '%' : '0%';
    const fullName = setNames[i] ?? l;
    let fullDisplay: string;
    if (fullName.length > 30) {
      fullDisplay = fullName.slice(0, 30) + '*';
      truncatedNames.push({ letter: l, fullName });
    } else {
      fullDisplay = fullName;
    }
    return [l, fullDisplay, trimmedNames[i], String(size), String(excl), String(incl), pct];
  });

  y = drawTable(pdf, M.left, y, ['Set', 'Name', 'Name (short)', 'Size', 'Exclusive', 'Inclusive', '%'], setSizeRows,
    [10, 60, 36, 12, 16, 16, 14],
    { aligns: ['center', 'left', 'left', 'right', 'right', 'right', 'right'] },
  );

  // Footnote for truncated names
  if (truncatedNames.length > 0) {
    if (y + 10 > PAGE_H - M.bottom) {
      pdf.addPage();
      y = M.top;
    }
    pdf.setFontSize(6);
    pdf.setFont(FONT, 'italic');
    pdf.setTextColor(120, 120, 120);
    const truncList = truncatedNames.map(t => `${t.letter}: ${t.fullName}`).join(', ');
    const footnoteText = `* Names truncated for display. Full names: ${truncList}.`;
    const footnoteLines = pdf.splitTextToSize(footnoteText, CONTENT_W);
    for (const line of footnoteLines) {
      pdf.text(line, M.left, y + 3);
      y += 3;
    }
    y += 2;
  }

  // ════════════════════════════════════════════
  // PAGE 2: Plots — Venn Diagram + UpSet Plot
  // ════════════════════════════════════════════
  pdf.addPage();
  y = M.top;

  y = pageTitle(pdf, 'Plots', y);

  // ── Venn Diagram Image ──
  y = sectionTitle(pdf, 'Venn Diagram', y, 40);

  const vennAspect = vennImageHeight / vennImageWidth;
  const maxVennW = Math.min(CONTENT_W, 115);
  const vennW = maxVennW;
  const vennH = vennW * vennAspect;

  const vennX = M.left + (CONTENT_W - vennW) / 2;
  pdf.addImage(vennImageDataUrl, 'PNG', vennX, y, vennW, vennH);
  y += vennH + 4;

  // Proportional accuracy info (if applicable)
  if (params.proportionalAccuracy) {
    const pa = params.proportionalAccuracy;
    pdf.setFontSize(8);
    pdf.setFont(FONT, 'normal');
    pdf.setTextColor(80, 80, 80);
    const accParts: string[] = [];
    if (pa.single) accParts.push(...[...pa.single.entries()].map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`));
    accParts.push(...[...pa.pairwise.entries()].map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`));
    if (pa.triple !== undefined) accParts.push(`ABC: ${(pa.triple * 100).toFixed(1)}%`);
    accParts.push(`Overall: ${(pa.overall * 100).toFixed(1)}%`);
    pdf.text(`Proportional Accuracy — ${accParts.join('  |  ')}`, PAGE_W / 2, y + 3, { align: 'center' });
    y += 6;
  }
  y += 2;

  // ── UpSet Plot Image ──
  y = sectionTitle(pdf, 'UpSet Plot', y, 40);

  const upsetAspect = upsetImageHeight / upsetImageWidth;
  const availH = PAGE_H - M.bottom - y - 5;
  let upsetW = CONTENT_W;
  let upsetH = upsetW * upsetAspect;

  // Scale down if too tall for remaining space
  if (upsetH > availH) {
    upsetH = availH;
    upsetW = upsetH / upsetAspect;
  }

  const ux = M.left + (CONTENT_W - upsetW) / 2;
  pdf.addImage(upsetImageDataUrl, 'PNG', ux, y, upsetW, upsetH);
  y += upsetH + 6;

  // ── Network Diagram ──
  pdf.addPage();
  y = M.top;
  y = sectionTitle(pdf, 'Set Relationship Network', y, 40);

  const netAspect = networkImageHeight / networkImageWidth;
  let netW = Math.min(CONTENT_W, 160);
  let netH = netW * netAspect;
  const netAvailH = PAGE_H - M.bottom - y - 5;
  if (netH > netAvailH) {
    netH = netAvailH;
    netW = netH / netAspect;
  }
  const nx = M.left + (CONTENT_W - netW) / 2;
  pdf.addImage(networkImageDataUrl, 'PNG', nx, y, netW, netH);
  y += netH + 6;

  // Significant edges list
  const sigEdges = stats.filter(s => s.fdr < 0.05);
  if (sigEdges.length > 0) {
    if (y + 10 > PAGE_H - M.bottom) { pdf.addPage(); y = M.top; }
    pdf.setFontSize(9);
    pdf.setFont(FONT, 'bold');
    pdf.setTextColor(40, 40, 40);
    pdf.text('Significant edges:', M.left, y + 4);
    y += 6;
    pdf.setFont(FONT, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(60, 60, 60);
    const sigText = sigEdges.map(s => {
      const a = trimmedNames[s.a.charCodeAt(0) - 65];
      const b = trimmedNames[s.b.charCodeAt(0) - 65];
      return `${a} - ${b} Jaccard: ${s.jaccard.toFixed(3)}`;
    }).join('; ');
    const sigLines = pdf.splitTextToSize(sigText, CONTENT_W);
    for (const line of sigLines) {
      if (y + 4 > PAGE_H - M.bottom) { pdf.addPage(); y = M.top; }
      pdf.text(line, M.left, y + 3);
      y += 3.5;
    }
    y += 4;
  }

  // ════════════════════════════════════════════
  // PAGE 4+: Statistics
  // ════════════════════════════════════════════
  const separateStatPages = n >= 7; // 7-8-9 sets: each table on its own page

  pdf.addPage();
  y = M.top;

  y = pageTitle(pdf, 'Statistics', y);

  // ── Pairwise Jaccard Index ──
  y = sectionTitle(pdf, 'Pairwise Jaccard Index', y);

  const jaccardRows = stats.map(s => [
    pairLabel(s),
    String(s.intersection),
    String(s.union),
    s.jaccard.toFixed(4),
    s.overlapCoeff.toFixed(4),
  ]);
  const jaccardBg = stats.map(s =>
    s.jaccard >= 0.7 ? '#e8f5e9' : s.jaccard <= 0.1 ? '#fce4ec' : null,
  );

  y = drawTable(pdf, M.left, y,
    ['Pair', 'Inter', 'Union', 'Jaccard', 'Overlap'],
    jaccardRows,
    [72, 18, 22, 28, 28],
    { aligns: ['left', 'right', 'right', 'right', 'right'], rowBgColors: jaccardBg, fontSize: 7 },
  );

  // ── Sorensen-Dice Index ──
  if (separateStatPages) { pdf.addPage(); y = M.top; }
  y = sectionTitle(pdf, 'S\u00f8rensen-Dice Index', y);

  const diceRows = stats.map(s => [
    pairLabel(s),
    s.dice.toFixed(4),
  ]);

  y = drawTable(pdf, M.left, y,
    ['Pair', 'Dice'],
    diceRows,
    [110, 30],
    { aligns: ['left', 'right'], fontSize: 7 },
  );

  // ── Intersection Enrichment ──
  if (separateStatPages) { pdf.addPage(); y = M.top; }
  y = sectionTitle(pdf, 'Intersection Enrichment (Hypergeometric Test)', y);

  const enrichRows = stats.map(s => [
    pairLabel(s),
    String(s.intersection),
    s.expected.toFixed(1),
    s.foldEnrichment.toFixed(2),
    formatP(s.pValue),
    formatP(s.fdr),
    sigLabel(s.fdr),
  ]);
  const enrichBg = stats.map(s =>
    s.fdr < 0.001 ? '#e8f5e9' : s.fdr < 0.05 ? '#fff8e1' : null,
  );

  y = drawTable(pdf, M.left, y,
    ['Pair', 'Obs', 'Exp', 'FE', 'p-value', 'FDR', 'Sig'],
    enrichRows,
    [55, 15, 20, 18, 25, 25, 14],
    { aligns: ['left', 'right', 'right', 'right', 'right', 'right', 'center'], rowBgColors: enrichBg, fontSize: 7 },
  );

  // ════════════════════════════════════════════
  // PAGE: Enrichment Visualisations
  // ════════════════════════════════════════════
  pdf.addPage();
  y = M.top;

  y = pageTitle(pdf, 'Statistics: Enrichment Visualisations', y);

  const drawPlotImage = (dataUrl: string, imgW: number, imgH: number, maxW: number, maxH: number): void => {
    const aspect = imgH / imgW;
    let w = Math.min(CONTENT_W, maxW);
    let h = w * aspect;
    if (h > maxH) { h = maxH; w = h / aspect; }
    const x = M.left + (CONTENT_W - w) / 2;
    pdf.addImage(dataUrl, 'PNG', x, y, w, h);
    y += h + 4;
  };

  y = sectionTitle(pdf, 'Bar chart', y, 50);
  drawPlotImage(enrichmentBarDataUrl, enrichmentBarWidth, enrichmentBarHeight, CONTENT_W, 70);

  if (y + 70 > PAGE_H - M.bottom) { pdf.addPage(); y = M.top; }
  y = sectionTitle(pdf, 'Lollipop chart', y, 50);
  drawPlotImage(enrichmentLollipopDataUrl, enrichmentLollipopWidth, enrichmentLollipopHeight, CONTENT_W, 70);

  if (y + 70 > PAGE_H - M.bottom) { pdf.addPage(); y = M.top; }
  y = sectionTitle(pdf, 'Heatmap', y, 50);
  const heatmapMaxH = PAGE_H - M.bottom - y - 6;
  drawPlotImage(enrichmentHeatmapDataUrl, enrichmentHeatmapWidth, enrichmentHeatmapHeight, CONTENT_W, heatmapMaxH);

  // ════════════════════════════════════════════
  // LAST PAGE: Methodology & Explanation
  // ════════════════════════════════════════════
  pdf.addPage();
  y = M.top;

  y = pageTitle(pdf, 'About This Report', y);

  for (const section of ABOUT_REPORT_SECTIONS) {
    // Check if title + at least some text fits
    if (y + 16 > PAGE_H - M.bottom) {
      pdf.addPage();
      y = M.top;
    }

    // Section title
    pdf.setFontSize(10);
    pdf.setFont(FONT, 'bold');
    pdf.setTextColor(30, 30, 80);
    pdf.text(section.title, M.left, y + 5);
    y += 7;

    // Section text — wrap manually (skip if empty)
    if (!section.text) { y += 2; continue; }
    pdf.setFontSize(8);
    pdf.setFont(FONT, 'normal');
    pdf.setTextColor(60, 60, 60);
    const lines = pdf.splitTextToSize(section.text, CONTENT_W);
    for (const line of lines) {
      if (y + 4 > PAGE_H - M.bottom) {
        pdf.addPage();
        y = M.top;
      }
      pdf.text(line, M.left, y + 3);
      y += 3.5;
    }
    y += 4;
  }

  // ── Footer on all pages ──
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    addFooter(pdf, p, totalPages);
  }

  return pdf.output('blob');
}
