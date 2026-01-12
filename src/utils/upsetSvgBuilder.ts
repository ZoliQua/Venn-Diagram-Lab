/**
 * Build a print-optimized UpSet plot SVG string from UpsetData.
 * White background, dark text, max 20 columns, no interactivity.
 */
import type { UpsetData } from './upsetData.ts';
import { sortBySize, computeSetSizes } from './upsetData.ts';

// Standard Venn set colors
const SET_COLORS: Record<string, string> = {
  A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
  E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1', I: '#F7941E',
};

// Layout constants
const LEFT_LABEL_W = 90;  // wider for trimmed names like "GOBP_3_UTR (E)"
const SET_NUM_W = 36;
const SET_BAR_W = 100;
const GAP = 16;
const DOT_R = 5;
const COL_W = 22;
const ROW_H = 20;
const BAR_TOP_H = 140;
const MARGIN = { top: 20, right: 20, bottom: 20, left: 10 };
const MAX_COLS = 20;

function depthColor(depth: number, maxDepth: number): string {
  const t = maxDepth > 1 ? (depth - 1) / (maxDepth - 1) : 0;
  const r = Math.round(60 + (220 - 60) * t);
  const g = Math.round(80 + (50 - 80) * t);
  const b = Math.round(180 + (50 - 180) * t);
  return `rgb(${r},${g},${b})`;
}

function esc(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildUpsetSvgString(data: UpsetData, setNames?: string[]): string {
  // Sort by size descending, filter zeros if >20, cap at 20
  let sorted = sortBySize(data);
  if (sorted.length > MAX_COLS) {
    sorted = sorted.filter(i => i.size > 0);
  }
  if (sorted.length > MAX_COLS) {
    sorted = sorted.slice(0, MAX_COLS);
  }

  const setSizes = computeSetSizes(data);
  const maxSetSize = Math.max(1, ...setSizes.values());
  const maxIntSize = Math.max(1, ...sorted.map(i => i.size));

  const nSets = data.sets.length;
  const nCols = sorted.length;
  const matrixW = nCols * COL_W;
  const matrixH = nSets * ROW_H;
  const barAreaX = MARGIN.left + LEFT_LABEL_W + SET_NUM_W;
  const matrixX = barAreaX + SET_BAR_W + GAP;
  const matrixY = MARGIN.top + BAR_TOP_H;
  const totalW = matrixX + matrixW + MARGIN.right;
  const totalH = matrixY + matrixH + MARGIN.bottom;

  // Trimmed display names: first 10 chars + " (X)"
  const trimmedNames = data.sets.map((set, i) => {
    const raw = setNames?.[i] ?? set;
    const short = raw.length > 10 ? raw.slice(0, 10) : raw;
    return `${short} (${set})`;
  });

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">`);
  parts.push(`<rect width="${totalW}" height="${totalH}" fill="#ffffff"/>`);

  // Set size bars (horizontal, left side)
  for (let i = 0; i < nSets; i++) {
    const set = data.sets[i];
    const y = matrixY + i * ROW_H;
    const size = setSizes.get(set) ?? 0;
    const barW = maxSetSize > 0 ? size / maxSetSize * SET_BAR_W : 0;
    const barX = barAreaX + SET_BAR_W - barW;

    // Set label (left, trimmed)
    parts.push(`<text x="${MARGIN.left + 4}" y="${y + ROW_H / 2}" fill="#222" font-size="9" font-family="Tahoma,sans-serif" font-weight="bold" dominant-baseline="central">${esc(trimmedNames[i])}</text>`);
    // Size value (right-aligned in its own column, between label and bar)
    parts.push(`<text x="${barAreaX - 4}" y="${y + ROW_H / 2}" fill="#555" font-size="9" font-family="Tahoma,sans-serif" text-anchor="end" dominant-baseline="central">${size}</text>`);
    // Bar
    parts.push(`<rect x="${barX}" y="${y + 3}" width="${barW}" height="${ROW_H - 6}" rx="2" fill="${SET_COLORS[set] ?? '#888'}" opacity="0.8"/>`);
  }

  // Set size axis
  parts.push(`<line x1="${barAreaX}" y1="${matrixY - 2}" x2="${barAreaX + SET_BAR_W}" y2="${matrixY - 2}" stroke="#ccc" stroke-width="1"/>`);
  parts.push(`<text x="${barAreaX + SET_BAR_W / 2}" y="${matrixY - 6}" fill="#888" font-size="9" font-family="Tahoma,sans-serif" text-anchor="middle">Set Size</text>`);

  // Intersection bars (vertical, above matrix)
  for (let ci = 0; ci < nCols; ci++) {
    const int = sorted[ci];
    const x = matrixX + ci * COL_W;
    const barH = maxIntSize > 0 ? (int.size / maxIntSize) * (BAR_TOP_H - 30) : 0;
    const barY = matrixY - 6 - barH;
    const color = depthColor(int.members.length, nSets);

    parts.push(`<rect x="${x + (COL_W - 10) / 2}" y="${barY}" width="10" height="${barH}" rx="2" fill="${color}" opacity="0.85"/>`);
    parts.push(`<text x="${x + COL_W / 2}" y="${barY - 3}" fill="#333" font-size="8" font-family="Tahoma,sans-serif" text-anchor="middle">${int.size}</text>`);
  }

  // Intersection size label
  parts.push(`<text x="${matrixX + matrixW / 2}" y="${MARGIN.top + 6}" fill="#888" font-size="9" font-family="Tahoma,sans-serif" text-anchor="middle">Intersection Size (top ${nCols})</text>`);

  // Matrix horizontal grid lines
  for (let i = 0; i < nSets; i++) {
    const y = matrixY + i * ROW_H + ROW_H / 2;
    parts.push(`<line x1="${matrixX - 4}" x2="${matrixX + matrixW}" y1="${y}" y2="${y}" stroke="#e8e8e8" stroke-width="1"/>`);
  }

  // Matrix dots & connecting lines
  for (let ci = 0; ci < nCols; ci++) {
    const int = sorted[ci];
    const cx = matrixX + ci * COL_W + COL_W / 2;

    const filledRows = data.sets
      .map((set, ri) => ({ set, ri }))
      .filter(({ set }) => int.members.includes(set));
    const minRow = Math.min(...filledRows.map(f => f.ri));
    const maxRow = Math.max(...filledRows.map(f => f.ri));

    // Connecting line
    if (filledRows.length > 1) {
      parts.push(`<line x1="${cx}" y1="${matrixY + minRow * ROW_H + ROW_H / 2}" x2="${cx}" y2="${matrixY + maxRow * ROW_H + ROW_H / 2}" stroke="#333" stroke-width="2"/>`);
    }

    // Dots
    for (let ri = 0; ri < nSets; ri++) {
      const cy = matrixY + ri * ROW_H + ROW_H / 2;
      const isMember = int.members.includes(data.sets[ri]);
      if (isMember) {
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${DOT_R}" fill="#333"/>`);
      } else {
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${DOT_R}" fill="transparent" stroke="#ccc" stroke-width="1.5"/>`);
      }
    }
  }

  parts.push('</svg>');
  return parts.join('\n');
}
