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

function parseShape(el: Element): VennShape {
  const id = el.getAttribute('id') || '';
  const tagName = el.tagName.toLowerCase();
  const style = el.getAttribute('style') || '';

  const attributes: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr.name === 'id' || attr.name === 'style') continue;
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

  // Extract raw SVG attributes
  const attrParts: string[] = [];
  for (let i = 0; i < svgEl.attributes.length; i++) {
    const attr = svgEl.attributes[i];
    if (attr.name === 'viewBox') continue; // handled separately
    attrParts.push(`${attr.name}="${attr.value}"`);
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
      shapes.push(parseShape(shapesGroup.children[i]));
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
    texts: { header, names, values, sums },
    bullets,
    meta: { headerHidden, bulletsHidden, hiddenIds: new Set(), hiddenGroups: new Set() },
  };
}
