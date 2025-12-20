import type { VennDocument, VennText, VennShape, VennBullet } from '../types.ts';

function r1(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  // Avoid -0
  if (rounded === 0) return '0';
  return String(rounded);
}

function textTransform(t: VennText): string {
  const matrixBody = t.transformExtra
    ? `${t.transformExtra} ${r1(t.x)} ${r1(t.y)}`
    : `1 0 0 1 ${r1(t.x)} ${r1(t.y)}`;
  return `matrix(${matrixBody})`;
}

function serializeText(t: VennText, indent: string): string {
  return `${indent}<text id="${t.id}" transform="${textTransform(t)}" style="${t.style}">${escapeXml(t.content)}</text>`;
}

function serializeShape(s: VennShape, indent: string): string {
  const attrStr = Object.entries(s.attributes)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  const parts = [`${indent}<${s.tagName} id="${s.id}" style="${s.style}"`];
  if (attrStr) {
    parts[0] += ` ${attrStr}`;
  }
  parts[0] += '/>';
  return parts[0];
}

function serializeBullet(b: VennBullet, indent: string): string {
  return `${indent}<circle id="${b.id}" style="${b.style}" cx="${r1(b.cx)}" cy="${r1(b.cy)}" r="${r1(b.r)}"/>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function saveSvg(doc: VennDocument): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="utf-8"?>');
  if (doc.comment) {
    lines.push(`<!-- ${doc.comment} -->`);
  }

  const vb = `${r1(doc.viewBox.x)} ${r1(doc.viewBox.y)} ${r1(doc.viewBox.w)} ${r1(doc.viewBox.h)}`;
  lines.push(`<svg ${doc.rawSvgAttrs} viewBox="${vb}">`);

  // Shapes
  lines.push('<g id="Shapes">');
  for (const shape of doc.shapes) {
    serializeShapeMultiline(shape, lines);
  }
  lines.push('</g>');

  // Texts
  lines.push('<g id="Texts">');

  // Header
  if (doc.texts.header) {
    const displayStyle = doc.meta.headerHidden ? ' style="display:none;"' : '';
    lines.push(`\t<g id="Header"${displayStyle}>`);
    lines.push(serializeText(doc.texts.header, '\t\t'));
    lines.push('\t</g>');
  }

  // Names
  if (doc.texts.names.length > 0) {
    lines.push('\t<g id="Group_Names">');
    for (const t of doc.texts.names) {
      lines.push(serializeText(t, '\t\t'));
    }
    lines.push('\t</g>');
  }

  // Values
  if (doc.texts.values.length > 0) {
    lines.push('\t<g id="Group_Values">');
    for (const t of doc.texts.values) {
      lines.push(serializeText(t, '\t\t'));
    }
    lines.push('\t</g>');
  }

  // Sums
  if (doc.texts.sums.length > 0) {
    lines.push('\t<g id="Group_CountSums">');
    for (const t of doc.texts.sums) {
      lines.push(serializeText(t, '\t\t'));
    }
    lines.push('\t</g>');
  }

  lines.push('</g>');

  // Bullets
  if (doc.bullets.length > 0) {
    const displayStyle = doc.meta.bulletsHidden ? ' style="display:none;"' : '';
    lines.push(`<g id="Group_Bullets"${displayStyle}>`);
    for (const b of doc.bullets) {
      lines.push(serializeBullet(b, '\t'));
    }
    lines.push('</g>');
  }

  lines.push('</svg>');

  return lines.join('\n') + '\n';
}

/**
 * Serialize a shape, handling multi-line path `d` attributes.
 * We check if the original `d` attribute contains newlines/tabs;
 * if so, we preserve them by outputting the attribute on multiple lines.
 */
function serializeShapeMultiline(s: VennShape, lines: string[]): void {
  const d = s.attributes['d'];
  if (d && d.includes('\n')) {
    // Multi-line path: output opening tag parts, then d on continuation lines
    let line = `\t<${s.tagName} id="${s.id}" style="${s.style}"`;
    // Add non-d attributes
    for (const [k, v] of Object.entries(s.attributes)) {
      if (k === 'd') continue;
      line += ` ${k}="${v}"`;
    }
    line += ` d="${d}"/>`;
    lines.push(line);
  } else {
    lines.push(serializeShape(s, '\t'));
  }
}
