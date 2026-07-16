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
  opts?: { marginFrac?: number },
): ExteriorLabel[] {
  const n = anchors.length;
  if (n === 0) return [];

  const cx = viewBox.x + viewBox.w / 2;
  const cy = viewBox.y + viewBox.h / 2;
  const marginFrac = opts?.marginFrac ?? 0.12;
  const margin = marginFrac * Math.max(viewBox.w, viewBox.h);
  // The ring must circumscribe the rectangular viewBox so every angle on it
  // lands outside the box, not just the cardinal directions. An ellipse
  // (x/rx)^2 + (y/ry)^2 = 1 contains the box's corner (w/2, h/2) — and thus
  // the whole box — whenever (a/rx)^2 + (b/ry)^2 <= 1 for a=w/2, b=h/2.
  // Scaling both half-extents by sqrt(2) guarantees this for any aspect
  // ratio: rx > sqrt(2)*a makes (a/rx)^2 < 1/2, same for ry/b, so the sum is
  // strictly < 1 and the whole rectangle sits strictly inside the ellipse.
  const rx = Math.SQRT2 * (viewBox.w / 2) + margin;
  const ry = Math.SQRT2 * (viewBox.h / 2) + margin;

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
  // labels never share a slot regardless of how the anchors cluster.
  const baseAngle = sorted[0].angle0;
  const step = TWO_PI / n;

  return sorted.map(({ anchor }, i) => {
    const slot = baseAngle + i * step;
    const labelX = cx + rx * Math.cos(slot);
    const labelY = cy + ry * Math.sin(slot);
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
