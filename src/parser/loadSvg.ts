import type { VennDocument, VennShape, VennText, VennBullet } from '../types.ts';

function parseTransform(attr: string): { x: number; y: number; extra?: string } {
  // matrix(A B C D X Y)
  const m = attr.match(/matrix\(([^)]+)\)/);
  if (!m) return { x: 0, y: 0 };
  const parts = m[1].trim().split(/\s+/);
  if (parts.length < 6) return { x: 0, y: 0 };
  const a = parts[0], b = parts[1], c = parts[2], d = parts[3];
  const x = parseFloat(parts[4]);
  const y = parseFloat(parts[5]);

  // Check if matrix is non-identity (A!=1 or B!=0 or C!=0 or D!=1)
  const isIdentity =
    parseFloat(a) === 1 &&
    parseFloat(b) === 0 &&
    parseFloat(c) === 0 &&
    parseFloat(d) === 1;

  if (isIdentity) {
    return { x, y };
  }
  return { x, y, extra: `${a} ${b} ${c} ${d}` };
}

function parseTextElement(el: Element): VennText {
  const id = el.getAttribute('id') || '';
  const transform = el.getAttribute('transform') || '';
  const style = el.getAttribute('style') || '';
  const content = el.textContent || '';
  const { x, y, extra } = parseTransform(transform);

  const result: VennText = { id, x, y, content, style };
  if (extra) {
    result.transformExtra = extra;
  }
  return result;
}

// Geometry-only attribute whitelist for parsed shapes. Anything else
// (event handlers like onclick/onload, href, etc.) is dropped so a crafted
// "custom SVG" can't carry executable markup into the editor or the
// re-exported file.
const SHAPE_ATTR_WHITELIST = new Set([
  'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'width', 'height', 'points', 'transform',
]);

// Only real shape elements are accepted under #Shapes / #ShapesExtras —
// a <script id="ShapeA"> would otherwise be re-emitted verbatim by saveSvg.
const SHAPE_TAG_WHITELIST = new Set(['circle', 'ellipse', 'rect', 'path', 'polygon', 'line']);

function parseShape(el: Element): VennShape | null {
  const tagName = el.tagName.toLowerCase();
  if (!SHAPE_TAG_WHITELIST.has(tagName)) return null;
  const id = el.getAttribute('id') || '';
  const style = el.getAttribute('style') || '';

  const attributes: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (!SHAPE_ATTR_WHITELIST.has(attr.name)) continue;
    attributes[attr.name] = attr.value;
  }

  return { id, tagName, attributes, style };
}

function parseBullet(el: Element): VennBullet {
  const id = el.getAttribute('id') || '';
  const cx = parseFloat(el.getAttribute('cx') || '0');
  const cy = parseFloat(el.getAttribute('cy') || '0');
  const r = parseFloat(el.getAttribute('r') || '0');
  const style = el.getAttribute('style') || '';
  return { id, cx, cy, r, style };
}

function isHidden(el: Element): boolean {
  const style = el.getAttribute('style') || '';
  return /display\s*:\s*none/i.test(style);
}

export function loadSvg(filename: string, svgString: string): VennDocument {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, 'image/svg+xml');

  // Check for parse errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Failed to parse SVG: ' + parseError.textContent);
  }

  const svgEl = xmlDoc.querySelector('svg');
  if (!svgEl) throw new Error('No <svg> element found');

  // Extract raw SVG attributes (whitelisted: namespace declarations and
  // placement only — event handlers and any other attributes are dropped so
  // they can't survive into the re-exported SVG).
  const ROOT_ATTR_WHITELIST = new Set(['xmlns', 'xmlns:xlink', 'version', 'x', 'y', 'width', 'height']);
  const attrParts: string[] = [];
  for (let i = 0; i < svgEl.attributes.length; i++) {
    const attr = svgEl.attributes[i];
    if (!ROOT_ATTR_WHITELIST.has(attr.name)) continue;
    attrParts.push(`${attr.name}="${attr.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`);
  }
  const rawSvgAttrs = attrParts.join('\n\t ');

  // Parse viewBox
  const vbStr = svgEl.getAttribute('viewBox') || '0 0 700 700';
  const vbParts = vbStr.trim().split(/\s+/).map(Number);
  const viewBox = {
    x: vbParts[0] || 0,
    y: vbParts[1] || 0,
    w: vbParts[2] || 700,
    h: vbParts[3] || 700,
  };

  // Extract comment
  let comment = '';
  for (let i = 0; i < xmlDoc.childNodes.length; i++) {
    const node = xmlDoc.childNodes[i];
    if (node.nodeType === Node.COMMENT_NODE) {
      comment = (node as Comment).data.trim();
      break;
    }
  }

  // Parse shapes
  const shapes: VennShape[] = [];
  const shapesGroup = svgEl.querySelector('#Shapes');
  if (shapesGroup) {
    for (let i = 0; i < shapesGroup.children.length; i++) {
      const shape = parseShape(shapesGroup.children[i]);
      if (shape) shapes.push(shape);
    }
  }

  // Parse extra shapes (e.g. ShapeA2 in Euler diagrams)
  const shapesExtras: VennShape[] = [];
  const shapesExtrasGroup = svgEl.querySelector('#ShapesExtras');
  if (shapesExtrasGroup) {
    for (let i = 0; i < shapesExtrasGroup.children.length; i++) {
      const shape = parseShape(shapesExtrasGroup.children[i]);
      if (shape) shapesExtras.push(shape);
    }
  }

  // Parse texts
  let header: VennText | null = null;
  let headerHidden = false;
  const headerGroup = svgEl.querySelector('#Header');
  if (headerGroup) {
    headerHidden = isHidden(headerGroup);
    const titleEl = headerGroup.querySelector('#Title');
    if (titleEl) {
      header = parseTextElement(titleEl);
    }
  }

  const names: VennText[] = [];
  const namesGroup = svgEl.querySelector('#Group_Names');
  if (namesGroup) {
    for (let i = 0; i < namesGroup.children.length; i++) {
      names.push(parseTextElement(namesGroup.children[i]));
    }
  }

  const values: VennText[] = [];
  const valuesGroup = svgEl.querySelector('#Group_Values');
  if (valuesGroup) {
    for (let i = 0; i < valuesGroup.children.length; i++) {
      values.push(parseTextElement(valuesGroup.children[i]));
    }
  }

  const sums: VennText[] = [];
  const sumsGroup = svgEl.querySelector('#Group_CountSums');
  if (sumsGroup) {
    for (let i = 0; i < sumsGroup.children.length; i++) {
      sums.push(parseTextElement(sumsGroup.children[i]));
    }
  }

  // Parse bullets
  const bullets: VennBullet[] = [];
  let bulletsHidden = false;
  const bulletsGroup = svgEl.querySelector('#Group_Bullets');
  if (bulletsGroup) {
    bulletsHidden = isHidden(bulletsGroup);
    for (let i = 0; i < bulletsGroup.children.length; i++) {
      const child = bulletsGroup.children[i];
      if (child.tagName.toLowerCase() === 'circle') {
        bullets.push(parseBullet(child));
      }
    }
  }

  return {
    filename,
    rawSvgAttrs,
    viewBox,
    comment,
    shapes,
    shapesExtras,
    texts: { header, names, values, sums },
    bullets,
    meta: { headerHidden, bulletsHidden, hiddenIds: new Set(), hiddenGroups: new Set() },
  };
}
