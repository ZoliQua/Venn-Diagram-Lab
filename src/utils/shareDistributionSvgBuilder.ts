/**
 * Item Share Distribution SVG builder.
 *
 * Vertical bar chart with N bars (k = 1..N), tier-gradient fill
 * (k=1 -> low, k=N -> high), absolute count labels above each bar
 * and "k set(s)" tick labels on the X axis.
 */

export interface ShareDistStyle {
  background: 'white' | 'dark';
  fontSize: number;
  fontFamily: string;
  gradientLow: string;
  gradientHigh: string;
  showPercent: boolean;
  showAxisLabel: boolean;
  logScale: boolean;
}

export const DEFAULT_SHARE_DIST_STYLE: ShareDistStyle = {
  background: 'white',
  fontSize: 11,
  fontFamily: 'Tahoma,sans-serif',
  gradientLow: '#ffe4b5',
  gradientHigh: '#7e14ff',
  showPercent: false,
  showAxisLabel: true,
  logScale: false,
};

export interface ShareDistOptions {
  style?: ShareDistStyle;
}

function esc(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${b2})`;
}

export function buildShareDistributionSvg(
  dist: ReadonlyMap<number, number>,
  opts: ShareDistOptions = {},
): string {
  const style = opts.style ?? DEFAULT_SHARE_DIST_STYLE;
  const bins = Array.from(dist.entries()).sort((a, b) => a[0] - b[0]);
  const nBins = bins.length;
  const total = bins.reduce((s, [, v]) => s + v, 0) || 1;

  const W = 480, H = 280;
  const margin = { top: 30, right: 20, bottom: 40, left: 50 };
  const plotW = W - margin.left - margin.right;
  const plotH = H - margin.top - margin.bottom;

  const maxV = bins.reduce((m, [, v]) => Math.max(m, v), 1);
  const yScale = (v: number): number => {
    if (style.logScale) {
      const lv = v <= 0 ? 0 : Math.log10(v + 1);
      const lm = Math.log10(maxV + 1);
      return plotH * (1 - lv / lm);
    }
    return plotH * (1 - v / maxV);
  };

  const barW = plotW / nBins * 0.7;
  const barGap = plotW / nBins * 0.3;

  const bg = style.background === 'dark' ? '#222' : '#ffffff';
  const fg = style.background === 'dark' ? '#eee' : '#333';

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
  parts.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`);
  if (style.showAxisLabel) {
    parts.push(`<text x="${W / 2}" y="${margin.top - 12}" text-anchor="middle" fill="${fg}" font-family="${style.fontFamily}" font-size="${style.fontSize + 1}">Item Share Distribution</text>`);
  }

  bins.forEach(([k, v], i) => {
    const t = nBins > 1 ? (i) / (nBins - 1) : 0;
    const fill = lerpHex(style.gradientLow, style.gradientHigh, t);
    const x = margin.left + i * (barW + barGap) + barGap / 2;
    const yTop = margin.top + yScale(v);
    const h = (margin.top + plotH) - yTop;
    parts.push(`<rect class="sd-bar" x="${x.toFixed(2)}" y="${yTop.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" fill="${fill}"/>`);
    const label = style.showPercent ? `${v} (${((v / total) * 100).toFixed(0)}%)` : `${v}`;
    parts.push(`<text x="${(x + barW / 2).toFixed(2)}" y="${(yTop - 4).toFixed(2)}" text-anchor="middle" fill="${fg}" font-family="${style.fontFamily}" font-size="${style.fontSize}">${esc(label)}</text>`);
    const tick = k === 1 ? '1 set' : `${k} sets`;
    parts.push(`<text x="${(x + barW / 2).toFixed(2)}" y="${(margin.top + plotH + 16).toFixed(2)}" text-anchor="middle" fill="${fg}" font-family="${style.fontFamily}" font-size="${style.fontSize}">${esc(tick)}</text>`);
  });

  parts.push(`<line x1="${margin.left}" x2="${margin.left + plotW}" y1="${margin.top + plotH}" y2="${margin.top + plotH}" stroke="${fg}" stroke-width="1"/>`);
  if (style.showPercent) {
    parts.push(`<text x="${margin.left}" y="${margin.top - 6}" fill="${fg}" font-family="${style.fontFamily}" font-size="${style.fontSize - 1}">% labels include the per-bin share of total items</text>`);
  }
  parts.push(`</svg>`);
  return parts.join('');
}
