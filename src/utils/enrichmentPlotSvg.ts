/**
 * Pure SVG-string generators for the three enrichment plots used in the
 * Data mode EnrichmentPlots section and the PDF report:
 *
 *   - Bar chart      (one bar per pair, ordered as provided)
 *   - Lollipop chart (stick + dot, dot size ~ intersection count)
 *   - Heatmap        (n x n symmetric matrix, diagonal marked empty)
 *
 * No external dependencies. Pattern matches upsetSvgBuilder.ts /
 * networkSvgBuilder.ts: build string parts and join.
 *
 * v1.11.0 — builders now accept `opts.style` (Partial<EnrichmentPlotStyle>).
 * Omitted fields fall back to DEFAULT_PLOT_STYLE, which reproduces v1.10.1
 * hardcoded values byte-for-byte so PDF export stays unchanged.
 */
import type { PairwiseStat } from './statistics.ts';
import type { EnrichmentPlotStyle } from './enrichmentPlotStyle.ts';
import { DEFAULT_PLOT_STYLE } from './enrichmentPlotStyle.ts';
import type { ClusterOrder } from './clusterHeatmap.ts';

export type EnrichmentMetric = 'neglog10fdr' | 'foldEnrichment';
export type PlotBackground = 'white' | 'dark';

export interface EnrichmentPlotOptions {
  metric: EnrichmentMetric;
  background?: PlotBackground;
  width?: number;
  height?: number;
  style?: Partial<EnrichmentPlotStyle>;
  // Heatmap-only cluster mode (additive, backwards-compatible):
  clusterOrder?: ClusterOrder;
  showRowDendrogram?: boolean;
  showColDendrogram?: boolean;
  dendrogramFraction?: number; // 0..1
}

const FDR_FLOOR = 1e-300;

const COLOR_AXIS = '#888888';
const COLOR_GRID = '#e8e8e8';
const COLOR_TEXT = '#222222';
const COLOR_TEXT_MUTED = '#555555';
const COLOR_DIAG = '#eeeeee';

function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  const tc = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * tc)},${Math.round(a[1] + (b[1] - a[1]) * tc)},${Math.round(a[2] + (b[2] - a[2]) * tc)})`;
}

function sigMarker(fdr: number): string {
  if (fdr < 0.001) return '***';
  if (fdr < 0.01) return '**';
  if (fdr < 0.05) return '*';
  return '';
}

export function metricValue(s: PairwiseStat, metric: EnrichmentMetric): number {
  if (metric === 'foldEnrichment') return s.foldEnrichment;
  const fdr = Math.max(s.fdr, FDR_FLOOR);
  return -Math.log10(fdr);
}

export function metricLabel(metric: EnrichmentMetric): string {
  return metric === 'foldEnrichment' ? 'Fold Enrichment' : '\u2212log\u2081\u2080(FDR)';
}

function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0) || !Number.isFinite(max)) return [0, 1];
  const raw = max / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / pow;
  const step = (normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10) * pow;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.0001; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

function formatTick(v: number): string {
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 100 || abs < 0.1) return v.toExponential(1);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

interface Palette {
  bg: string;
  text: string;
  textMuted: string;
  axis: string;
  grid: string;
}

function palette(background: PlotBackground): Palette {
  if (background === 'dark') {
    return { bg: '#1e1e1e', text: '#e6e6e6', textMuted: '#bbbbbb', axis: '#bbbbbb', grid: '#333333' };
  }
  return { bg: '#ffffff', text: COLOR_TEXT, textMuted: COLOR_TEXT_MUTED, axis: COLOR_AXIS, grid: COLOR_GRID };
}

/**
 * Resolve the effective style for a builder. Merges DEFAULT_PLOT_STYLE with
 * the caller's partial, and lets legacy `opts.background` win only when the
 * style partial itself does not specify `background`.
 */
function resolveStyle(opts: EnrichmentPlotOptions): EnrichmentPlotStyle {
  const partial = opts.style ?? {};
  const merged: EnrichmentPlotStyle = { ...DEFAULT_PLOT_STYLE, ...partial };
  if (partial.background === undefined && opts.background !== undefined) {
    merged.background = opts.background;
  }
  return merged;
}

/**
 * Scale a baseline font size by the current style.fontSize setting.
 * DEFAULT_PLOT_STYLE.fontSize is the reference (scale=1), so default output
 * matches v1.10.1 byte-for-byte.
 */
function scaleFs(base: number, style: EnrichmentPlotStyle): number {
  const scale = style.fontSize / DEFAULT_PLOT_STYLE.fontSize;
  return Math.max(2, Math.round(base * scale * 10) / 10);
}

export function buildEnrichmentBarSvg(stats: PairwiseStat[], opts: EnrichmentPlotOptions): string {
  const width = opts.width ?? 560;
  const height = opts.height ?? 240;
  const style = resolveStyle(opts);
  const pal = palette(style.background);
  const metric = opts.metric;

  const M = { top: 24, right: 16, bottom: 52, left: 48 };
  const plotX = M.left;
  const plotY = M.top;
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;

  const ff = style.fontFamily;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`);
  parts.push(`<rect width="${width}" height="${height}" fill="${pal.bg}"/>`);

  if (stats.length === 0) {
    parts.push(`<text x="${width / 2}" y="${height / 2}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(11, style)}" text-anchor="middle">No pairs to plot</text>`);
    parts.push('</svg>');
    return parts.join('\n');
  }

  const values = stats.map(s => metricValue(s, metric));
  const maxVal = Math.max(0, ...values);
  const ticks = niceTicks(maxVal || 1);
  const yMax = Math.max(maxVal, ticks[ticks.length - 1] || 1);

  const n = stats.length;
  const slotW = plotW / n;
  const barW = Math.min(22, slotW * 0.7);

  // Y-axis grid + tick labels
  for (const t of ticks) {
    const y = plotY + plotH - (t / yMax) * plotH;
    parts.push(`<line x1="${plotX}" y1="${y}" x2="${plotX + plotW}" y2="${y}" stroke="${pal.grid}" stroke-width="1"/>`);
    parts.push(`<text x="${plotX - 4}" y="${y + 3}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(9, style)}" text-anchor="end">${esc(formatTick(t))}</text>`);
  }

  // Y-axis line
  parts.push(`<line x1="${plotX}" y1="${plotY}" x2="${plotX}" y2="${plotY + plotH}" stroke="${pal.axis}" stroke-width="1"/>`);
  // X-axis line
  parts.push(`<line x1="${plotX}" y1="${plotY + plotH}" x2="${plotX + plotW}" y2="${plotY + plotH}" stroke="${pal.axis}" stroke-width="1"/>`);

  // Bars + x labels
  for (let i = 0; i < n; i++) {
    const s = stats[i];
    const v = values[i];
    const cx = plotX + slotW * i + slotW / 2;
    const barH = yMax > 0 ? Math.max(0, (v / yMax) * plotH) : 0;
    const y = plotY + plotH - barH;
    const color = s.fdr < 0.05 ? style.sigColor : style.nsColor;

    parts.push(`<rect x="${cx - barW / 2}" y="${y}" width="${barW}" height="${barH}" rx="1.5" fill="${color}" opacity="0.85"/>`);

    if (style.showSigMarkers) {
      const marker = sigMarker(s.fdr);
      if (marker) {
        parts.push(`<text x="${cx}" y="${y - 3}" fill="${pal.text}" font-family="${ff}" font-size="${scaleFs(9, style)}" text-anchor="middle" font-weight="bold">${marker}</text>`);
      }
    }

    if (style.showPairLabels) {
      const lx = cx;
      const ly = plotY + plotH + 10;
      parts.push(`<text x="${lx}" y="${ly}" fill="${pal.text}" font-family="${ff}" font-size="${scaleFs(9, style)}" text-anchor="end" transform="rotate(-45 ${lx} ${ly})">${esc(s.label)}</text>`);
    }
  }

  // Y-axis rotated metric label
  if (style.showAxisLabel) {
    const yLabelX = 14;
    const yLabelY = plotY + plotH / 2;
    parts.push(`<text x="${yLabelX}" y="${yLabelY}" fill="${pal.text}" font-family="${ff}" font-size="${scaleFs(10, style)}" font-weight="bold" text-anchor="middle" transform="rotate(-90 ${yLabelX} ${yLabelY})">${esc(metricLabel(metric))}</text>`);
  }

  // Bottom legend
  if (style.showLegend) {
    const legendY = height - 12;
    parts.push(`<rect x="${plotX}" y="${legendY - 6}" width="8" height="8" fill="${style.sigColor}" opacity="0.85"/>`);
    parts.push(`<text x="${plotX + 12}" y="${legendY}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(9, style)}">FDR &lt; 0.05</text>`);
    parts.push(`<rect x="${plotX + 70}" y="${legendY - 6}" width="8" height="8" fill="${style.nsColor}" opacity="0.85"/>`);
    parts.push(`<text x="${plotX + 82}" y="${legendY}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(9, style)}">not significant</text>`);
  }

  parts.push('</svg>');
  return parts.join('\n');
}

export function buildEnrichmentLollipopSvg(stats: PairwiseStat[], opts: EnrichmentPlotOptions): string {
  const width = opts.width ?? 560;
  const height = opts.height ?? 240;
  const style = resolveStyle(opts);
  const pal = palette(style.background);
  const metric = opts.metric;

  const M = { top: 24, right: 16, bottom: 52, left: 48 };
  const plotX = M.left;
  const plotY = M.top;
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;

  const ff = style.fontFamily;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`);
  parts.push(`<rect width="${width}" height="${height}" fill="${pal.bg}"/>`);

  if (stats.length === 0) {
    parts.push(`<text x="${width / 2}" y="${height / 2}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(11, style)}" text-anchor="middle">No pairs to plot</text>`);
    parts.push('</svg>');
    return parts.join('\n');
  }

  const values = stats.map(s => metricValue(s, metric));
  const maxVal = Math.max(0, ...values);
  const ticks = niceTicks(maxVal || 1);
  const yMax = Math.max(maxVal, ticks[ticks.length - 1] || 1);

  const maxIntersection = Math.max(1, ...stats.map(s => s.intersection));
  const minDotR = 2.5;
  const maxDotR = 8;

  const n = stats.length;
  const slotW = plotW / n;

  for (const t of ticks) {
    const y = plotY + plotH - (t / yMax) * plotH;
    parts.push(`<line x1="${plotX}" y1="${y}" x2="${plotX + plotW}" y2="${y}" stroke="${pal.grid}" stroke-width="1"/>`);
    parts.push(`<text x="${plotX - 4}" y="${y + 3}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(9, style)}" text-anchor="end">${esc(formatTick(t))}</text>`);
  }

  parts.push(`<line x1="${plotX}" y1="${plotY}" x2="${plotX}" y2="${plotY + plotH}" stroke="${pal.axis}" stroke-width="1"/>`);
  parts.push(`<line x1="${plotX}" y1="${plotY + plotH}" x2="${plotX + plotW}" y2="${plotY + plotH}" stroke="${pal.axis}" stroke-width="1"/>`);

  for (let i = 0; i < n; i++) {
    const s = stats[i];
    const v = values[i];
    const cx = plotX + slotW * i + slotW / 2;
    const dotY = yMax > 0 ? plotY + plotH - (v / yMax) * plotH : plotY + plotH;
    const color = s.fdr < 0.05 ? style.sigColor : style.nsColor;
    const t = Math.sqrt(s.intersection / maxIntersection);
    const r = minDotR + (maxDotR - minDotR) * t;

    parts.push(`<line x1="${cx}" y1="${plotY + plotH}" x2="${cx}" y2="${dotY}" stroke="${color}" stroke-width="1.2" opacity="0.85"/>`);
    parts.push(`<circle cx="${cx}" cy="${dotY}" r="${r.toFixed(2)}" fill="${color}" opacity="0.9"/>`);

    if (style.showSigMarkers) {
      const marker = sigMarker(s.fdr);
      if (marker) {
        parts.push(`<text x="${cx}" y="${dotY - r - 2}" fill="${pal.text}" font-family="${ff}" font-size="${scaleFs(9, style)}" text-anchor="middle" font-weight="bold">${marker}</text>`);
      }
    }

    if (style.showPairLabels) {
      const lx = cx;
      const ly = plotY + plotH + 10;
      parts.push(`<text x="${lx}" y="${ly}" fill="${pal.text}" font-family="${ff}" font-size="${scaleFs(9, style)}" text-anchor="end" transform="rotate(-45 ${lx} ${ly})">${esc(s.label)}</text>`);
    }
  }

  if (style.showAxisLabel) {
    const yLabelX = 14;
    const yLabelY = plotY + plotH / 2;
    parts.push(`<text x="${yLabelX}" y="${yLabelY}" fill="${pal.text}" font-family="${ff}" font-size="${scaleFs(10, style)}" font-weight="bold" text-anchor="middle" transform="rotate(-90 ${yLabelX} ${yLabelY})">${esc(metricLabel(metric))}</text>`);
  }

  if (style.showLegend) {
    const legendY = height - 12;
    parts.push(`<circle cx="${plotX + 4}" cy="${legendY - 2}" r="${minDotR}" fill="${pal.textMuted}"/>`);
    parts.push(`<text x="${plotX + 12}" y="${legendY}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(9, style)}">small intersection</text>`);
    parts.push(`<circle cx="${plotX + 110}" cy="${legendY - 2}" r="${maxDotR}" fill="${pal.textMuted}"/>`);
    parts.push(`<text x="${plotX + 122}" y="${legendY}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(9, style)}">large intersection (n=${maxIntersection})</text>`);
  }

  parts.push('</svg>');
  return parts.join('\n');
}

export function buildEnrichmentHeatmapSvg(
  stats: PairwiseStat[],
  setLetters: string[],
  setNames: string[],
  opts: EnrichmentPlotOptions,
): string {
  const style = resolveStyle(opts);
  const pal = palette(style.background);
  const metric = opts.metric;
  const nSets = setLetters.length;

  const cellSize = 36;
  const leftLabelW = 110;
  const topLabelH = 82;
  const legendW = 22;
  const legendGap = 12;
  const legendLabelW = 48;
  const paddingR = 14;
  const paddingT = 20;
  const paddingB = 18;

  // Cluster mode setup.
  const cluster = opts.clusterOrder;
  const order: number[] = cluster && cluster.leafOrder.length === nSets
    ? cluster.leafOrder
    : Array.from({ length: nSets }, (_, i) => i);
  const showRow = cluster ? (opts.showRowDendrogram ?? true) : false;
  const showCol = cluster ? (opts.showColDendrogram ?? true) : false;
  const dendroFrac = opts.dendrogramFraction ?? 0.12;

  const gridWBase = nSets * cellSize;
  const gridHBase = nSets * cellSize;
  // Pixels reserved for dendrogram tracks. The previous `Math.max(20, …)`
  // floor made the slider feel inert for small N (4 sets × 36 cell = 144 px
  // grid; 6% × 144 = 8 px, clamped up to 20 — so 6%-13% all looked the same
  // 20 px). Use a small 4 px floor (just enough to draw a visible stroke)
  // and let the slider drive the actual size.
  const dendroPx = (showRow || showCol)
    ? Math.max(4, Math.round(Math.min(gridWBase, gridHBase) * dendroFrac))
    : 0;
  const dendroColH = showCol ? dendroPx + 6 : 0; // 6px gap to top labels
  const dendroRowW = showRow ? dendroPx + 6 : 0; // 6px gap to row labels

  const gridX = leftLabelW + dendroRowW;
  const gridY = topLabelH + dendroColH;
  const gridW = gridWBase;
  const gridH = gridHBase;

  // Legend takes up its own horizontal slot; when hidden, collapse it.
  const legendSlot = style.showLegend ? (legendGap + legendW + legendLabelW) : 0;
  const width = gridX + gridW + legendSlot + paddingR;
  const height = gridY + gridH + paddingB;

  const ff = style.fontFamily;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`);
  parts.push(`<rect width="${width}" height="${height}" fill="${pal.bg}"/>`);

  if (nSets === 0) {
    parts.push(`<text x="${width / 2}" y="${height / 2}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(11, style)}" text-anchor="middle">No sets</text>`);
    parts.push('</svg>');
    return parts.join('\n');
  }

  // Build lookup: "AB" / "BA" -> stat
  const statByPair = new Map<string, PairwiseStat>();
  for (const s of stats) {
    statByPair.set(s.label, s);
    statByPair.set(s.b + s.a, s);
  }

  const values: number[] = [];
  for (const s of stats) values.push(metricValue(s, metric));
  const maxVal = values.length > 0 ? Math.max(0, ...values) : 0;
  const scaleMax = maxVal > 0 ? maxVal : 1;

  const hexLow = style.gradientLowColor;
  const hexHigh = metric === 'foldEnrichment' ? style.gradientHighFeColor : style.gradientHighFdrColor;
  const rgbLow = hexToRgb(hexLow);
  const rgbHigh = hexToRgb(hexHigh);

  // Top metric title (treated as the heatmap's "axis label")
  if (style.showAxisLabel) {
    parts.push(`<text x="${gridX + gridW / 2}" y="${paddingT}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(10, style)}" text-anchor="middle">${esc(metricLabel(metric))}</text>`);
  }

  // Trimmed display names: "Name (X)"
  const trimmedNames = setLetters.map((l, i) => {
    const raw = setNames[i] ?? l;
    const short = raw.length > 10 ? raw.slice(0, 10) : raw;
    return `${short} (${l})`;
  });

  if (style.showPairLabels) {
    // Column labels (top, rotated) \u2014 use cluster leaf order for content
    for (let c = 0; c < nSets; c++) {
      const ci = order[c];
      const cx = gridX + c * cellSize + cellSize / 2;
      const cy = gridY - 6;
      parts.push(`<text x="${cx}" y="${cy}" fill="${pal.text}" font-family="${ff}" font-size="${scaleFs(7, style)}" text-anchor="start" transform="rotate(-45 ${cx} ${cy})">${esc(trimmedNames[ci])}</text>`);
    }
    // Row labels (left)
    for (let r = 0; r < nSets; r++) {
      const ri = order[r];
      const ly = gridY + r * cellSize + cellSize / 2;
      parts.push(`<text x="${gridX - 6}" y="${ly + 3}" fill="${pal.text}" font-family="${ff}" font-size="${scaleFs(7, style)}" text-anchor="end">${esc(trimmedNames[ri])}</text>`);
    }
  }

  // Cells \u2014 visual (r, c) maps to original (ri, ci) via permutation
  for (let r = 0; r < nSets; r++) {
    const ri = order[r];
    for (let c = 0; c < nSets; c++) {
      const ci = order[c];
      const x = gridX + c * cellSize;
      const y = gridY + r * cellSize;

      if (ri === ci) {
        parts.push(`<rect data-diag="true" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${COLOR_DIAG}" stroke="${pal.grid}" stroke-width="0.8"/>`);
        parts.push(`<text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 3}" fill="${pal.textMuted}" font-family="${ff}" font-size="${scaleFs(9, style)}" text-anchor="middle">\u2014</text>`);
        continue;
      }

      const key = setLetters[ri] + setLetters[ci];
      const s = statByPair.get(key);
      const v = s ? metricValue(s, metric) : 0;
      const t = scaleMax > 0 ? v / scaleMax : 0;
      const fill = lerpRgb(rgbLow, rgbHigh, t);

      parts.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}" stroke="${pal.grid}" stroke-width="0.8"/>`);

      if (s) {
        const label = metric === 'foldEnrichment' ? s.foldEnrichment.toFixed(1) : v.toFixed(1);
        const textColor = t > 0.55 ? '#ffffff' : pal.text;
        parts.push(`<text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 3}" fill="${textColor}" font-family="${ff}" font-size="${scaleFs(8, style)}" text-anchor="middle">${esc(label)}</text>`);
      }
    }
  }

  // Dendrogram overlays (cluster mode only)
  if (cluster && (showRow || showCol) && nSets >= 2 && cluster.merges.length > 0) {
    const merges = cluster.merges;
    const maxHeight = merges.reduce((m, x) => Math.max(m, x.height), 0) || 1;
    const stroke = pal.textMuted;

    // Map cluster-id -> leaf-position-set (positions in visual leaf-index space [0..nSets-1])
    // Leaf k has visual position = order.indexOf(k).
    const positionsById = new Map<number, number[]>();
    for (let k = 0; k < nSets; k++) {
      const vis = order.indexOf(k);
      positionsById.set(k, [vis]);
    }
    // Each merge has node id = nSets + mi; its positions = union of children.
    const mergePos: number[] = []; // representative position (mean of leaf positions)
    for (let mi = 0; mi < merges.length; mi++) {
      const m = merges[mi];
      const leftPos = positionsById.get(m.left) ?? [];
      const rightPos = positionsById.get(m.right) ?? [];
      const all = [...leftPos, ...rightPos];
      positionsById.set(nSets + mi, all);
      const leftMean = leftPos.length > 0 ? leftPos.reduce((a, b) => a + b, 0) / leftPos.length : 0;
      const rightMean = rightPos.length > 0 ? rightPos.reduce((a, b) => a + b, 0) / rightPos.length : 0;
      // Store as midpoint of the two children's mean positions (parent location).
      mergePos[mi] = (leftMean + rightMean) / 2;
    }

    // Helper: per-node representative position (visual leaf-index space, 0..nSets-1)
    const nodePos = (id: number): number => {
      if (id < nSets) return order.indexOf(id);
      const mi = id - nSets;
      return mergePos[mi];
    };
    // Helper: per-node height (leaves at 0)
    const nodeHeight = (id: number): number => {
      if (id < nSets) return 0;
      return merges[id - nSets].height;
    };

    if (showCol && dendroColH > 0) {
      // Column dendrogram sits in the band [topOfBand .. topOfBand + dendroPx].
      // Column labels live in the top band [paddingT .. gridY]; the grid was shifted
      // down by dendroColH to make room. Dendrogram is placed above the labels.
      const bandTop = paddingT + 6; // small gap below axis-label baseline
      const bandBottom = bandTop + dendroPx;
      // X for visual leaf position p: gridX + p*cellSize + cellSize/2
      const xFor = (p: number): number => gridX + p * cellSize + cellSize / 2;
      // Y maps height h: at h=0 -> bandBottom (leaves), at h=maxHeight -> bandTop (root)
      const yFor = (h: number): number => bandBottom - (h / maxHeight) * (bandBottom - bandTop);

      parts.push(`<g class="hm-dendro-col" stroke="${stroke}" stroke-width="1" fill="none">`);
      for (let mi = 0; mi < merges.length; mi++) {
        const m = merges[mi];
        const xLeft = xFor(nodePos(m.left));
        const xRight = xFor(nodePos(m.right));
        const yLeftChild = yFor(nodeHeight(m.left));
        const yRightChild = yFor(nodeHeight(m.right));
        const yMerge = yFor(m.height);
        // Vertical from left child up to merge node
        parts.push(`<line x1="${xLeft}" y1="${yLeftChild}" x2="${xLeft}" y2="${yMerge}"/>`);
        // Vertical from right child up to merge node
        parts.push(`<line x1="${xRight}" y1="${yRightChild}" x2="${xRight}" y2="${yMerge}"/>`);
        // Horizontal across at the merge height
        parts.push(`<line x1="${xLeft}" y1="${yMerge}" x2="${xRight}" y2="${yMerge}"/>`);
      }
      parts.push(`</g>`);
    }

    if (showRow && dendroRowW > 0) {
      // Row dendrogram occupies a vertical strip on the far left.
      // The grid was shifted right by dendroRowW. Place the dendrogram in
      // [leftPad .. leftPad + dendroPx], with leaves on the right (closest
      // to grid) and the root on the left.
      const leftPad = 6;
      const bandLeft = leftPad;
      const bandRight = leftPad + dendroPx;
      const yForRow = (p: number): number => gridY + p * cellSize + cellSize / 2;
      const xForRow = (h: number): number => bandRight - (h / maxHeight) * (bandRight - bandLeft);

      parts.push(`<g class="hm-dendro-row" stroke="${stroke}" stroke-width="1" fill="none">`);
      for (let mi = 0; mi < merges.length; mi++) {
        const m = merges[mi];
        const yTop = yForRow(nodePos(m.left));
        const yBot = yForRow(nodePos(m.right));
        const xLeftChild = xForRow(nodeHeight(m.left));
        const xRightChild = xForRow(nodeHeight(m.right));
        const xMerge = xForRow(m.height);
        // Horizontal from each child inward to merge node X
        parts.push(`<line x1="${xLeftChild}" y1="${yTop}" x2="${xMerge}" y2="${yTop}"/>`);
        parts.push(`<line x1="${xRightChild}" y1="${yBot}" x2="${xMerge}" y2="${yBot}"/>`);
        // Vertical at the merge X connecting the two children
        parts.push(`<line x1="${xMerge}" y1="${yTop}" x2="${xMerge}" y2="${yBot}"/>`);
      }
      parts.push(`</g>`);
    }
  }

  // Colorbar legend
  if (style.showLegend) {
    const lbX = gridX + gridW + legendGap;
    const lbY = gridY;
    const lbH = gridH;
    const lbSteps = 32;
    for (let i = 0; i < lbSteps; i++) {
      const t = 1 - i / (lbSteps - 1);
      const fill = lerpRgb(rgbLow, rgbHigh, t);
      parts.push(`<rect x="${lbX}" y="${lbY + (lbH / lbSteps) * i}" width="${legendW}" height="${lbH / lbSteps + 0.5}" fill="${fill}"/>`);
    }
    parts.push(`<rect x="${lbX}" y="${lbY}" width="${legendW}" height="${lbH}" fill="none" stroke="${pal.axis}" stroke-width="0.6"/>`);
    parts.push(`<text x="${lbX + legendW + 4}" y="${lbY + 6}" fill="${pal.text}" font-family="${ff}" font-size="${scaleFs(9, style)}">${esc(formatTick(scaleMax))}</text>`);
    parts.push(`<text x="${lbX + legendW + 4}" y="${lbY + lbH}" fill="${pal.text}" font-family="${ff}" font-size="${scaleFs(9, style)}">0</text>`);
  }

  parts.push('</svg>');
  return parts.join('\n');
}
