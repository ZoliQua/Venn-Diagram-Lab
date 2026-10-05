// Pure geometry helpers for placing region-count labels outside a diagram's
// bounding box, on a ring around its centre, connected back to their region
// anchor by a leader line. Uses a raycast (angle from centre through the
// anchor) to pick each label's position on the ring, then redistributes the
// angles evenly while preserving the original angular order so labels never
// collide even when several anchors sit close together.

export interface LabelAnchor {
  id: string;
  content: string;
  x: number;
  y: number;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExteriorLabel {
  id: string;
  content: string;
  anchorX: number; // leader-line start (region point)
  anchorY: number;
  labelX: number; // leader-line end + text position (on the ring)
  labelY: number;
  textAnchor: 'start' | 'end';
}

const TWO_PI = 2 * Math.PI;

export function computeExteriorLabels(
  anchors: LabelAnchor[],
  viewBox: ViewBox,
  opts?: { gapFrac?: number },
): ExteriorLabel[] {
  const n = anchors.length;
  if (n === 0) return [];

  const cx = viewBox.x + viewBox.w / 2;
  const cy = viewBox.y + viewBox.h / 2;
  // The ring is an ellipse a small fraction beyond the diagram's half-extents,
  // so labels sit just outside the shapes (cardinal directions) or in the
  // otherwise-empty corners (diagonals) — close to the diagram rather than far
  // out. The caller (Canvas) expands the rendered viewBox to include the ring,
  // so labels near the diagonals are never clipped even though they may fall
  // just inside the original box corners. `gapFrac` is how far beyond the
  // half-extent the ring sits (0.12 = 12% past the edge).
  const gapFrac = opts?.gapFrac ?? 0.12;
  const rx = (viewBox.w / 2) * (1 + gapFrac);
  const ry = (viewBox.h / 2) * (1 + gapFrac);

  // Step 1: raycast angle per anchor. A degenerate anchor sitting exactly at
  // the centre has no well-defined direction (atan2(0,0) would collapse every
  // such anchor onto the same angle-0 slot), so it is given a distinct angle
  // derived from its position in the input list instead.
  const withAngles = anchors.map((anchor, index) => {
    const dx = anchor.x - cx;
    const dy = anchor.y - cy;
    const angle0 = dx === 0 && dy === 0 ? (index / n) * TWO_PI - Math.PI : Math.atan2(dy, dx);
    return { anchor, angle0 };
  });

  // Step 2: sort ascending by angle, tie-broken by id for determinism.
  const sorted = [...withAngles].sort((a, b) => {
    if (a.angle0 !== b.angle0) return a.angle0 - b.angle0;
    return a.anchor.id < b.anchor.id ? -1 : a.anchor.id > b.anchor.id ? 1 : 0;
  });

  // Step 3: redistribute evenly around the ring, preserving sorted order, so
  // labels never share a slot regardless of how the anchors cluster. Slots are
  // evenly spaced in VISUAL angle (as seen from the centre) — on the ellipse
  // ring an equal parameter step would bunch labels on the long axis, so the
  // visual angle is converted to the ellipse parameter first:
  //   θ (visual) → t (param) via t = atan2(rx·sinθ, ry·cosθ).
  const baseAngle = sorted[0].angle0;
  const step = TWO_PI / n;

  return sorted.map(({ anchor }, i) => {
    const slot = baseAngle + i * step;
    const t = Math.atan2(rx * Math.sin(slot), ry * Math.cos(slot));
    const labelX = cx + rx * Math.cos(t);
    const labelY = cy + ry * Math.sin(t);
    const textAnchor: 'start' | 'end' = labelX >= cx ? 'start' : 'end';
    return {
      id: anchor.id,
      content: anchor.content,
      anchorX: anchor.x,
      anchorY: anchor.y,
      labelX,
      labelY,
      textAnchor,
    };
  });
}

/**
 * Grow a viewBox so every exterior label — its ring point plus a worst-case
 * text extent — is visible, with a small proportional padding margin. This is
 * the geometry behind Canvas.renderViewBox; it lives here so the clipping
 * contract can be unit-tested.
 */
export function expandViewBoxForLabels(
  base: ViewBox,
  labels: ExteriorLabel[],
  fontSize: number,
  padFrac = 0.03,
): ViewBox {
  if (labels.length === 0) return base;
  let minX = base.x, minY = base.y;
  let maxX = base.x + base.w, maxY = base.y + base.h;
  for (const e of labels) {
    const textW = Math.max(1, e.content.length) * fontSize * 0.65; // rough advance width
    const x0 = e.textAnchor === 'end' ? e.labelX - textW : e.labelX;
    const x1 = e.textAnchor === 'end' ? e.labelX : e.labelX + textW;
    minX = Math.min(minX, x0);
    maxX = Math.max(maxX, x1);
    minY = Math.min(minY, e.labelY - fontSize);
    maxY = Math.max(maxY, e.labelY + fontSize);
  }
  const pad = Math.max(base.w, base.h) * padFrac;
  return { x: minX - pad, y: minY - pad, w: (maxX - minX) + 2 * pad, h: (maxY - minY) + 2 * pad };
}
