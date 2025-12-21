import type { VennShape } from '../types.ts';

interface ViewBox {
  x: number; y: number; w: number; h: number;
}

function buildPath2DFromShape(shape: VennShape): Path2D {
  switch (shape.tagName) {
    case 'path':
      return new Path2D(shape.attributes['d'] ?? '');
    case 'circle': {
      const p = new Path2D();
      p.arc(+(shape.attributes['cx'] ?? 0), +(shape.attributes['cy'] ?? 0), +(shape.attributes['r'] ?? 0), 0, Math.PI * 2);
      return p;
    }
    case 'ellipse': {
      const p = new Path2D();
      p.ellipse(
        +(shape.attributes['cx'] ?? 0), +(shape.attributes['cy'] ?? 0),
        +(shape.attributes['rx'] ?? 0), +(shape.attributes['ry'] ?? 0),
        0, 0, Math.PI * 2
      );
      return p;
    }
    default:
      return new Path2D(shape.attributes['d'] ?? '');
  }
}

/**
 * Compute a bitmask region map: each pixel gets a bitmask indicating
 * which shapes contain it. Shape 0 = bit 0, shape 1 = bit 1, etc.
 */
export function computeRegionMap(
  shapes: VennShape[],
  viewBox: ViewBox,
  width: number,
  height: number,
): Uint8Array {
  const regionData = new Uint8Array(width * height);

  for (let i = 0; i < shapes.length && i < 8; i++) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(
      width / viewBox.w, 0,
      0, height / viewBox.h,
      -viewBox.x * width / viewBox.w,
      -viewBox.y * height / viewBox.h,
    );

    const path = buildPath2DFromShape(shapes[i]);
    ctx.fillStyle = '#fff';
    ctx.fill(path);

    const imageData = ctx.getImageData(0, 0, width, height);
    const bit = 1 << i;
    for (let j = 0; j < width * height; j++) {
      if (imageData.data[j * 4 + 3] > 128) {
        regionData[j] |= bit;
      }
    }
  }

  return regionData;
}

/** Generate a distinct color for a bitmask using HSL rotation */
function regionColor(mask: number, totalShapes: number): [number, number, number, number] {
  if (mask === 0) return [30, 30, 30, 255]; // background

  // Count bits = depth
  let depth = 0;
  let bitSum = 0;
  for (let i = 0; i < totalShapes; i++) {
    if (mask & (1 << i)) {
      depth++;
      bitSum += i;
    }
  }

  // Hue from bit pattern, saturation from depth
  const hue = ((bitSum * 137.5 + mask * 47) % 360);
  const saturation = 40 + depth * 8;
  const lightness = 55 - depth * 5;

  // HSL to RGB
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
    255,
  ];
}

/**
 * Render the cut view to a canvas context.
 * Each region gets a distinct color, with dark borders between regions.
 */
export function renderCutView(
  ctx: CanvasRenderingContext2D,
  regionMap: Uint8Array,
  width: number,
  height: number,
  totalShapes: number,
  highlightMask: number | null,
) {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Build color cache
  const colorCache = new Map<number, [number, number, number, number]>();
  for (let i = 0; i < width * height; i++) {
    const mask = regionMap[i];
    if (!colorCache.has(mask)) {
      colorCache.set(mask, regionColor(mask, totalShapes));
    }
  }

  // Fill pixels
  for (let i = 0; i < width * height; i++) {
    const mask = regionMap[i];
    const color = colorCache.get(mask)!;
    const idx = i * 4;

    // Dim non-highlighted regions when something is highlighted
    if (highlightMask !== null && mask !== 0) {
      if (mask === highlightMask) {
        // Brighten highlighted region
        data[idx] = Math.min(255, color[0] + 40);
        data[idx + 1] = Math.min(255, color[1] + 40);
        data[idx + 2] = Math.min(255, color[2] + 40);
        data[idx + 3] = 255;
      } else {
        // Dim others
        data[idx] = Math.round(color[0] * 0.3);
        data[idx + 1] = Math.round(color[1] * 0.3);
        data[idx + 2] = Math.round(color[2] * 0.3);
        data[idx + 3] = 255;
      }
    } else {
      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
      data[idx + 3] = color[3];
    }
  }

  // Draw borders: darken pixels where neighbors have different mask
  const borderColor: [number, number, number] = [20, 20, 20];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const mask = regionMap[idx];
      // Check 4 neighbors
      if (
        regionMap[idx - 1] !== mask ||
        regionMap[idx + 1] !== mask ||
        regionMap[idx - width] !== mask ||
        regionMap[idx + width] !== mask
      ) {
        const pi = idx * 4;
        data[pi] = borderColor[0];
        data[pi + 1] = borderColor[1];
        data[pi + 2] = borderColor[2];
        data[pi + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/** Convert a region label like "ABD" to a bitmask given shape letters */
export function labelToBitmask(label: string, shapeLetters: string[]): number {
  let mask = 0;
  for (const ch of label) {
    const idx = shapeLetters.indexOf(ch);
    if (idx >= 0) mask |= (1 << idx);
  }
  return mask;
}

/** Convert a bitmask to a region label given shape letters */
export function bitmaskToLabel(mask: number, shapeLetters: string[]): string {
  let label = '';
  for (let i = 0; i < shapeLetters.length; i++) {
    if (mask & (1 << i)) label += shapeLetters[i];
  }
  return label;
}
