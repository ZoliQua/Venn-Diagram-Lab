import { describe, it, expect } from 'vitest';
import {
  computeExteriorLabels,
  expandViewBoxForLabels,
  type ExteriorLabel,
  type LabelAnchor,
  type ViewBox,
} from '../utils/exteriorLabels.ts';

const VB: ViewBox = { x: 0, y: 0, w: 100, h: 100 }; // centre (50,50)
const TWO_PI = 2 * Math.PI;

// A spread of aspect ratios the models actually produce (square to extreme),
// including one with a non-zero origin.
const ASPECT_VBS: ViewBox[] = [
  { x: 0, y: 0, w: 100, h: 100 }, // square
  { x: 0, y: 0, w: 200, h: 100 }, // wide
  { x: 0, y: 0, w: 100, h: 200 }, // tall
  { x: 0, y: 0, w: 400, h: 50 }, // very wide
  { x: -30, y: 10, w: 150, h: 120 }, // offset origin
];

function centre(vb: ViewBox) {
  return { cx: vb.x + vb.w / 2, cy: vb.y + vb.h / 2 };
}

// Anchors scattered at varied angles and radii inside the box, like real
// region-count texts.
function anchorsFor(vb: ViewBox, n: number): LabelAnchor[] {
  const { cx, cy } = centre(vb);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TWO_PI + 0.3;
    const r = Math.min(vb.w, vb.h) * (0.1 + 0.15 * (i % 3));
    return {
      id: `Count_${i}`,
      content: String((i + 1) * 137),
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
    };
  });
}

// Slot angle of a placed label, normalised to [0, 2π).
function slotAngle(e: ExteriorLabel, vb: ViewBox): number {
  const { cx, cy } = centre(vb);
  const a = Math.atan2(e.labelY - cy, e.labelX - cx);
  return a < 0 ? a + TWO_PI : a;
}

describe('computeExteriorLabels', () => {
  it('returns [] for no anchors', () => {
    expect(computeExteriorLabels([], VB)).toEqual([]);
  });

  it('places every label beyond the box-inscribed ellipse, across aspect ratios', () => {
    // The honest contract of the ellipse ring: a label's normalized elliptical
    // radius u²+v² (u,v normalized by the box half-extents) exceeds 1, i.e. it
    // sits beyond the largest ellipse the viewBox can inscribe. Diagonal
    // labels may still fall inside the box's (empty) corners — that is by
    // design, and the expanded-viewBox clipping contract covers them.
    for (const vb of ASPECT_VBS) {
      for (const n of [2, 3, 8]) {
        for (const gapFrac of [0.05, 0.12, 0.3]) {
          const out = computeExteriorLabels(anchorsFor(vb, n), vb, { gapFrac });
          expect(out).toHaveLength(n);
          const { cx, cy } = centre(vb);
          for (const e of out) {
            const u = (e.labelX - cx) / (vb.w / 2);
            const v = (e.labelY - cy) / (vb.h / 2);
            expect(
              u * u + v * v,
              `${e.id} beyond inscribed ellipse of ${vb.w}x${vb.h} box (gapFrac ${gapFrac})`,
            ).toBeGreaterThan(1);
          }
        }
      }
    }
  });

  it('keeps cardinal-direction labels outside the box edge on their side', () => {
    for (const vb of ASPECT_VBS) {
      const { cx, cy } = centre(vb);
      const anchors: LabelAnchor[] = [
        { id: 'Count_R', content: '1', x: cx + vb.w * 0.4, y: cy }, // right
        { id: 'Count_L', content: '2', x: cx - vb.w * 0.4, y: cy }, // left
      ];
      const out = computeExteriorLabels(anchors, vb, { gapFrac: 0.12 });
      const r = out.find(e => e.id === 'Count_R')!;
      const l = out.find(e => e.id === 'Count_L')!;
      expect(r.labelX).toBeGreaterThan(vb.x + vb.w);
      expect(l.labelX).toBeLessThan(vb.x);
    }
  });

  it('gives every label a distinct angular slot, across aspect ratios', () => {
    for (const vb of ASPECT_VBS) {
      for (const n of [2, 5, 9, 16]) {
        const out = computeExteriorLabels(anchorsFor(vb, n), vb);
        const angles = out.map(e => slotAngle(e, vb));
        expect(new Set(angles.map(a => a.toFixed(9))).size).toBe(n);
      }
    }
  });

  it('spaces the slots evenly: every circular gap is 2π/n', () => {
    for (const vb of ASPECT_VBS) {
      for (const n of [2, 4, 7]) {
        const out = computeExteriorLabels(anchorsFor(vb, n), vb);
        const angles = out.map(e => slotAngle(e, vb)).sort((a, b) => a - b);
        const step = TWO_PI / n;
        for (let i = 0; i < n; i++) {
          const next = angles[(i + 1) % n] + (i === n - 1 ? TWO_PI : 0);
          expect(next - angles[i], `gap ${i} for n=${n}`).toBeCloseTo(step, 9);
        }
      }
    }
  });

  it('places labels in monotonically increasing slot order matching the anchors\' angular order', () => {
    // Anchors at known, well-separated angles, fed in a shuffled order.
    const angles = [2.8, 0.1, -1.5, 1.2, -2.9, 0.9];
    const anchors: LabelAnchor[] = angles.map((a, i) => ({
      id: `Count_${i}`, content: String(i), x: 50 + Math.cos(a) * 20, y: 50 + Math.sin(a) * 20,
    }));
    const out = computeExteriorLabels(anchors, VB);
    // Output order must follow the anchors' own raycast-angle order.
    const expectedOrder = [...anchors]
      .sort((p, q) => Math.atan2(p.y - 50, p.x - 50) - Math.atan2(q.y - 50, q.x - 50))
      .map(a => a.id);
    expect(out.map(e => e.id)).toEqual(expectedOrder);
    // And the placed slot angles must be strictly increasing around the ring
    // (unwrapping the circular boundary).
    const slots = out.map(e => slotAngle(e, VB));
    let prev = slots[0];
    for (let i = 1; i < slots.length; i++) {
      let cur = slots[i];
      while (cur <= prev) cur += TWO_PI;
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it('preserves each anchor as the leader-line start', () => {
    const anchors: LabelAnchor[] = [{ id: 'Count_A', content: '9', x: 70, y: 50 }];
    const [e] = computeExteriorLabels(anchors, VB);
    expect(e.anchorX).toBe(70);
    expect(e.anchorY).toBe(50);
    expect(e.content).toBe('9');
    expect(e.id).toBe('Count_A');
  });

  it('sets textAnchor by side (start on the right of centre, end on the left)', () => {
    const anchors: LabelAnchor[] = [
      { id: 'Count_R', content: '1', x: 90, y: 50 }, // right
      { id: 'Count_L', content: '2', x: 10, y: 50 }, // left
    ];
    const out = computeExteriorLabels(anchors, VB);
    const r = out.find(e => e.id === 'Count_R')!;
    const l = out.find(e => e.id === 'Count_L')!;
    expect(r.textAnchor).toBe('start');
    expect(l.textAnchor).toBe('end');
  });

  it('is deterministic', () => {
    const anchors: LabelAnchor[] = [
      { id: 'Count_A', content: '1', x: 60, y: 55 },
      { id: 'Count_B', content: '2', x: 45, y: 62 },
    ];
    expect(computeExteriorLabels(anchors, VB)).toEqual(computeExteriorLabels(anchors, VB));
  });

  it('handles an anchor exactly at the centre without collapsing to angle 0', () => {
    const anchors: LabelAnchor[] = [
      { id: 'Count_A', content: '1', x: 50, y: 50 }, // degenerate: dx=dy=0
      { id: 'Count_B', content: '2', x: 90, y: 50 }, // angle 0 (right of centre)
    ];
    const out = computeExteriorLabels(anchors, VB);
    const a = out.find(e => e.id === 'Count_A')!;
    const b = out.find(e => e.id === 'Count_B')!;
    expect(a.labelX === b.labelX && a.labelY === b.labelY).toBe(false);
    expect(a.anchorX).toBe(50);
    expect(a.anchorY).toBe(50);
  });

  it('moves labels further out for a larger gapFrac', () => {
    const anchors: LabelAnchor[] = [{ id: 'Count_A', content: '1', x: 90, y: 50 }];
    const small = computeExteriorLabels(anchors, VB, { gapFrac: 0.05 })[0];
    const large = computeExteriorLabels(anchors, VB, { gapFrac: 0.5 })[0];
    const dSmall = Math.hypot(small.labelX - 50, small.labelY - 50);
    const dLarge = Math.hypot(large.labelX - 50, large.labelY - 50);
    expect(dLarge).toBeGreaterThan(dSmall);
  });

  it('sorts ties in angle deterministically by id', () => {
    const anchors: LabelAnchor[] = [
      { id: 'Count_Z', content: 'z', x: 80, y: 50 },
      { id: 'Count_A', content: 'a', x: 60, y: 50 },
    ];
    const out1 = computeExteriorLabels(anchors, VB);
    const out2 = computeExteriorLabels([...anchors].reverse(), VB);
    expect(out1.map(e => e.id)).toEqual(out2.map(e => e.id));
  });
});

describe('expandViewBoxForLabels (renderViewBox clipping contract)', () => {
  it('returns the base box unchanged when there are no labels', () => {
    for (const vb of ASPECT_VBS) {
      expect(expandViewBoxForLabels(vb, [], 12)).toEqual(vb);
    }
  });

  it('contains the original viewBox and grows every side by at least the pad', () => {
    for (const vb of ASPECT_VBS) {
      const labels = computeExteriorLabels(anchorsFor(vb, 6), vb);
      const fs = 12;
      const expanded = expandViewBoxForLabels(vb, labels, fs);
      const pad = Math.max(vb.w, vb.h) * 0.03;
      // Contains the original box...
      expect(expanded.x).toBeLessThanOrEqual(vb.x);
      expect(expanded.y).toBeLessThanOrEqual(vb.y);
      expect(expanded.x + expanded.w).toBeGreaterThanOrEqual(vb.x + vb.w);
      expect(expanded.y + expanded.h).toBeGreaterThanOrEqual(vb.y + vb.h);
      // ...and since labels sit outside the box, every side grows by >= pad.
      expect(vb.x - expanded.x).toBeGreaterThanOrEqual(pad - 1e-9);
      expect(vb.y - expanded.y).toBeGreaterThanOrEqual(pad - 1e-9);
      expect((expanded.x + expanded.w) - (vb.x + vb.w)).toBeGreaterThanOrEqual(pad - 1e-9);
      expect((expanded.y + expanded.h) - (vb.y + vb.h)).toBeGreaterThanOrEqual(pad - 1e-9);
    }
  });

  it('contains every ring point plus its worst-case text extent (nothing clipped)', () => {
    const EPS = 1e-9;
    for (const vb of ASPECT_VBS) {
      for (const fs of [8, 12, 40]) {
        const labels = computeExteriorLabels(anchorsFor(vb, 8), vb);
        const expanded = expandViewBoxForLabels(vb, labels, fs);
        for (const e of labels) {
          // Same worst-case text extent renderViewBox accounts for.
          const textW = Math.max(1, e.content.length) * fs * 0.65;
          const x0 = e.textAnchor === 'end' ? e.labelX - textW : e.labelX;
          const x1 = e.textAnchor === 'end' ? e.labelX : e.labelX + textW;
          expect(x0).toBeGreaterThanOrEqual(expanded.x - EPS);
          expect(x1).toBeLessThanOrEqual(expanded.x + expanded.w + EPS);
          expect(e.labelY - fs).toBeGreaterThanOrEqual(expanded.y - EPS);
          expect(e.labelY + fs).toBeLessThanOrEqual(expanded.y + expanded.h + EPS);
        }
      }
    }
  });

  it('never clips long multi-character contents anchored to the left side', () => {
    const vb: ViewBox = { x: 0, y: 0, w: 100, h: 100 };
    const anchors: LabelAnchor[] = [
      { id: 'Count_LONG', content: '1234567890', x: 10, y: 50 }, // left side, end anchor
    ];
    const fs = 16;
    const labels = computeExteriorLabels(anchors, vb);
    const expanded = expandViewBoxForLabels(vb, labels, fs);
    const [e] = labels;
    expect(e.textAnchor).toBe('end');
    const textW = e.content.length * fs * 0.65;
    expect(e.labelX - textW).toBeGreaterThanOrEqual(expanded.x - 1e-9);
  });
});
