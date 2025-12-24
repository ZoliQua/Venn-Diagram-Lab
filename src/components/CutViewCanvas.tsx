import { useMemo, useRef, useEffect } from 'react';
import type { VennDocument } from '../types.ts';

interface CutViewCanvasProps {
  doc: VennDocument;
  scale: number;
  onRegionHover: (label: string | null) => void;
  onRegionClick: (label: string) => void;
}

// Standard shape colors (matching VENN_PROJECT.md)
const SHAPE_FILL: Record<string, string> = {
  A: '#3a3200', B: '#0a0c2e', C: '#2e0608', D: '#1a1a1c',
  E: '#120a05', F: '#1e0812', G: '#2a1020', H: '#082428',
};

/**
 * SVG region view — like nhthn/venn7.
 * Clip-path only, z-ordering for exclusivity. Stable refs prevent re-renders.
 */
export function CutViewCanvas({ doc, scale, onRegionHover, onRegionClick }: CutViewCanvasProps) {
  // Stable refs — prevent useMemo invalidation on parent re-render
  const onHoverRef = useRef(onRegionHover);
  const onClickRef = useRef(onRegionClick);
  useEffect(() => { onHoverRef.current = onRegionHover; }, [onRegionHover]);
  useEffect(() => { onClickRef.current = onRegionClick; }, [onRegionClick]);

  const shapes = useMemo(() =>
    doc.shapes
      .filter(s => /^Shape[A-H]$/.test(s.id))
      .sort((a, b) => a.id.localeCompare(b.id)),
    [doc.shapes]
  );

  const shapeLetters = useMemo(() => shapes.map(s => s.id.replace('Shape', '')), [shapes]);
  const n = shapes.length;
  const vb = doc.viewBox;

  const bitCount = (v: number) => { let c = 0; for (let i = 0; i < n; i++) if (v & (1 << i)) c++; return c; };

  const bitmaskToLabel = (mask: number): string => {
    let label = '';
    for (let i = 0; i < n; i++) if (mask & (1 << i)) label += shapeLetters[i];
    return label;
  };

  // Region color: single-set → dark tinted shape color, intersection → pale red
  const regionColor = (mask: number): string => {
    const depth = bitCount(mask);
    if (depth === 1) {
      // Use shape's own dark color
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) return SHAPE_FILL[shapeLetters[i]] ?? '#1a1a1a';
      }
      return '#1a1a1a';
    }
    // Intersection: pale red, brighter with depth
    const lit = 14 + depth * 4;
    const sat = 25 + depth * 4;
    return `hsl(0, ${sat}%, ${lit}%)`;
  };

  const renderGeo = (shape: typeof shapes[0], extra?: Record<string, string>) => {
    const a = shape.attributes;
    const p = extra ?? {};
    switch (shape.tagName) {
      case 'path': return <path d={a['d']} {...p} />;
      case 'circle': return <circle cx={a['cx']} cy={a['cy']} r={a['r']} {...p} />;
      case 'ellipse': return <ellipse cx={a['cx']} cy={a['cy']} rx={a['rx']} ry={a['ry']} {...p} />;
      default: return <path d={a['d'] ?? ''} {...p} />;
    }
  };

  const sortedRegions = useMemo(() => {
    const all: number[] = [];
    for (let mask = 1; mask < (1 << n); mask++) all.push(mask);
    all.sort((a, b) => bitCount(a) - bitCount(b) || a - b);
    return all;
  }, [n]);

  // Entire SVG internals — stable, only depends on doc structure
  const svgInternals = useMemo(() => {
    const clipDefs = shapes.map(s => (
      <clipPath key={`clip-${s.id}`} id={`clip-${s.id}`}>
        {renderGeo(s)}
      </clipPath>
    ));

    const regionEls = sortedRegions.map(mask => {
      const inIdx: number[] = [];
      for (let i = 0; i < n; i++) if (mask & (1 << i)) inIdx.push(i);

      let el: React.ReactElement = (
        <rect
          x={vb.x} y={vb.y} width={vb.w} height={vb.h}
          fill={regionColor(mask)}
          className="cut-region-fill"
          onMouseEnter={() => onHoverRef.current(bitmaskToLabel(mask))}
          onClick={() => onClickRef.current(bitmaskToLabel(mask))}
        />
      );

      for (const idx of inIdx) {
        el = <g key={`c-${idx}`} clipPath={`url(#clip-${shapes[idx].id})`}>{el}</g>;
      }

      return <g key={mask} className="cut-region">{el}</g>;
    });

    const shapeColors = shapes.map(s => {
      const m = s.style.match(/fill:\s*([^;]+)/);
      return m?.[1] ?? '#666';
    });

    const curves = shapes.map((s, i) => (
      <g key={`curve-${s.id}`}>
        {renderGeo(s, {
          fill: 'none',
          stroke: shapeColors[i],
          strokeWidth: '0.8',
          opacity: '0.15',
        } as Record<string, string>)}
      </g>
    ));

    // Text labels — white bold
    const parseStyle = (style: string) => {
      const m: Record<string, string> = {};
      for (const p of style.split(';')) {
        const c = p.indexOf(':');
        if (c !== -1) m[p.slice(0, c).trim()] = p.slice(c + 1).trim();
      }
      return m;
    };

    const labels = doc.texts.values.map(t => {
      const s = parseStyle(t.style);
      return (
        <text
          key={t.id}
          transform={t.transformExtra
            ? `matrix(${t.transformExtra} ${t.x} ${t.y})`
            : `translate(${t.x}, ${t.y})`}
          fill="#ffffff"
          fontFamily={s['font-family']?.replace(/'/g, '') ?? 'Tahoma'}
          fontSize={s['font-size'] ?? '12'}
          fontWeight="bold"
          textAnchor={(s['text-anchor'] as 'start' | 'middle' | 'end') ?? undefined}
          stroke="none"
          className="cut-label"
        >
          {t.content}
        </text>
      );
    });

    return { clipDefs, regionEls, curves, labels };
  // Only rebuild when doc structure changes — NOT on callback changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.shapes, doc.texts.values, doc.viewBox, n]);

  return (
    <div className="canvas-inner">
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        width={vb.w * scale}
        height={vb.h * scale}
        xmlns="http://www.w3.org/2000/svg"
        className="canvas-svg cut-view-svg"
        style={{ background: '#111' }}
      >
        <defs>{svgInternals.clipDefs}</defs>
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#111" />
        <g className="cut-regions-group" onMouseLeave={() => onHoverRef.current(null)}>
          {svgInternals.regionEls}
        </g>
        <g style={{ pointerEvents: 'none' }}>{svgInternals.curves}</g>
        <g style={{ pointerEvents: 'none' }}>{svgInternals.labels}</g>
      </svg>
    </div>
  );
}
