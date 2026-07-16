import { describe, it, expect } from 'vitest';
import { computeExteriorLabels, type LabelAnchor, type ViewBox } from '../utils/exteriorLabels.ts';

const VB: ViewBox = { x: 0, y: 0, w: 100, h: 100 }; // centre (50,50)

describe('computeExteriorLabels', () => {
  it('returns [] for no anchors', () => {
    expect(computeExteriorLabels([], VB)).toEqual([]);
  });

  it('places every label on the ring OUTSIDE the viewBox', () => {
    const anchors: LabelAnchor[] = [
      { id: 'Count_A', content: '1', x: 60, y: 50 },
      { id: 'Count_B', content: '2', x: 50, y: 60 },
      { id: 'Count_C', content: '3', x: 40, y: 50 },
      { id: 'Count_D', content: '4', x: 50, y: 40 },
    ];
    const out = computeExteriorLabels(anchors, VB, { marginFrac: 0.1 });
    expect(out).toHaveLength(4);
    for (const e of out) {
      // ring radius = sqrt(2)*50 + 0.1*100 ≈ 80.71 around centre (50,50) → every point is outside [0,100]
      const outside = e.labelX < VB.x || e.labelX > VB.x + VB.w || e.labelY < VB.y || e.labelY > VB.y + VB.h;
      expect(outside, `${e.id} should be outside`).toBe(true);
    }
  });

  it('places every label outside the viewBox, including the diagonal worst case', () => {
    // Anchors placed at 45°/135°/225°/315° from centre so the redistributed
    // slots land exactly on the diagonals — the worst case for an
    // axis-aligned ellipse ring around a square viewBox, since that is where
    // an under-scaled ellipse most easily dips back inside the box (the bug
    // this guards against: rx=ry=w/2+margin puts the diagonal point at
    // (93.84, 93.84) for a 100x100 box at marginFrac=0.12, which is INSIDE).
    const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    const anchors: LabelAnchor[] = angles.map((a, i) => ({
      id: `Count_${i}`,
      content: String(i),
      x: 50 + Math.cos(a) * 5,
      y: 50 + Math.sin(a) * 5,
    }));
    const out = computeExteriorLabels(anchors, VB, { marginFrac: 0.12 });
    expect(out).toHaveLength(4);
    for (const e of out) {
      const outside = e.labelX < VB.x || e.labelX > VB.x + VB.w || e.labelY < VB.y || e.labelY > VB.y + VB.h;
      expect(outside, `${e.id} should be outside (label=${e.labelX},${e.labelY})`).toBe(true);
    }
  });

  it('places every label outside a NON-square viewBox (aspect ratio guard)', () => {
    const wideVB: ViewBox = { x: 0, y: 0, w: 200, h: 100 };
    const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
    const anchors: LabelAnchor[] = angles.map((a, i) => ({
      id: `Count_${i}`,
      content: String(i),
      x: 100 + Math.cos(a) * 10,
      y: 50 + Math.sin(a) * 10,
    }));
    const out = computeExteriorLabels(anchors, wideVB, { marginFrac: 0.12 });
    expect(out).toHaveLength(8);
    for (const e of out) {
      const outside =
        e.labelX < wideVB.x || e.labelX > wideVB.x + wideVB.w || e.labelY < wideVB.y || e.labelY > wideVB.y + wideVB.h;
      expect(outside, `${e.id} should be outside (label=${e.labelX},${e.labelY})`).toBe(true);
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

  it('spreads labels evenly around the ring in angular order (no two share a slot)', () => {
    const anchors: LabelAnchor[] = Array.from({ length: 8 }, (_, i) => ({
      id: `Count_${i}`, content: String(i), x: 50 + Math.cos(i) * 5, y: 50 + Math.sin(i) * 5,
    }));
    const out = computeExteriorLabels(anchors, VB);
    // all label positions distinct
    const keys = out.map(e => `${e.labelX.toFixed(3)},${e.labelY.toFixed(3)}`);
    expect(new Set(keys).size).toBe(out.length);
  });

  it('is deterministic', () => {
    const anchors: LabelAnchor[] = [
      { id: 'Count_A', content: '1', x: 60, y: 55 },
      { id: 'Count_B', content: '2', x: 45, y: 62 },
    ];
    expect(computeExteriorLabels(anchors, VB)).toEqual(computeExteriorLabels(anchors, VB));
  });

  it('places a single label on the ring at its own angle (N=1)', () => {
    const anchors: LabelAnchor[] = [{ id: 'Count_A', content: '1', x: 65, y: 60 }];
    const [e] = computeExteriorLabels(anchors, VB, { marginFrac: 0.1 });
    const cx = 50, cy = 50, rx = Math.SQRT2 * 50 + 10, ry = Math.SQRT2 * 50 + 10;
    const angle = Math.atan2(60 - cy, 65 - cx);
    expect(e.labelX).toBeCloseTo(cx + rx * Math.cos(angle), 9);
    expect(e.labelY).toBeCloseTo(cy + ry * Math.sin(angle), 9);
  });

  it('handles an anchor exactly at the centre without collapsing to angle 0', () => {
    const anchors: LabelAnchor[] = [
      { id: 'Count_A', content: '1', x: 50, y: 50 }, // degenerate: dx=dy=0
      { id: 'Count_B', content: '2', x: 90, y: 50 }, // angle 0 (right of centre)
    ];
    const out = computeExteriorLabels(anchors, VB);
    const a = out.find(e => e.id === 'Count_A')!;
    const b = out.find(e => e.id === 'Count_B')!;
    // The degenerate anchor must not land exactly on the same ring slot as the angle-0 anchor.
    expect(a.labelX === b.labelX && a.labelY === b.labelY).toBe(false);
    // Leader-line start must still be the original (centre) point.
    expect(a.anchorX).toBe(50);
    expect(a.anchorY).toBe(50);
  });

  it('honours a custom marginFrac to change the ring radius', () => {
    const anchors: LabelAnchor[] = [{ id: 'Count_A', content: '1', x: 90, y: 50 }];
    const small = computeExteriorLabels(anchors, VB, { marginFrac: 0.05 })[0];
    const large = computeExteriorLabels(anchors, VB, { marginFrac: 0.5 })[0];
    const dSmall = Math.hypot(small.labelX - 50, small.labelY - 50);
    const dLarge = Math.hypot(large.labelX - 50, large.labelY - 50);
    expect(dLarge).toBeGreaterThan(dSmall);
  });

  it('sorts ties in angle deterministically by id', () => {
    // Two anchors at the exact same angle from centre (both due right) — tie-break by id.
    const anchors: LabelAnchor[] = [
      { id: 'Count_Z', content: 'z', x: 80, y: 50 },
      { id: 'Count_A', content: 'a', x: 60, y: 50 },
    ];
    const out1 = computeExteriorLabels(anchors, VB);
    const out2 = computeExteriorLabels([...anchors].reverse(), VB);
    expect(out1.map(e => e.id)).toEqual(out2.map(e => e.id));
  });
});
