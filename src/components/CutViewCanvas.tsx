import { useMemo, useCallback, useRef } from 'react';
import type { VennDocument } from '../types.ts';

interface CutViewCanvasProps {
  doc: VennDocument;
  scale: number;
  onRegionHover: (label: string | null) => void;
  onRegionClick: (label: string) => void;
}

/**
 * SVG region view — like nhthn/venn7.
 *
 * Each region = intersection of its "in" shapes (clip-paths only, no masks).
 * Z-ordering handles exclusivity: deeper regions on top steal events and
 * visually cover the less-specific regions underneath.
 *
 * Depth 1 (A, B, C...) → bottom
 * Depth 2 (AB, AC, BC...) → on top
 * ...
 * Depth N (ABC...N) → topmost
 */
export function CutViewCanvas({ doc, scale, onRegionHover, onRegionClick }: CutViewCanvasProps) {
  const hoverRef = useRef<string | null>(null);

  const shapes = useMemo(() =>
    doc.shapes
      .filter(s => /^Shape[A-H]$/.test(s.id))
      .sort((a, b) => a.id.localeCompare(b.id)),
    [doc.shapes]
  );

  const shapeLetters = useMemo(() => shapes.map(s => s.id.replace('Shape', '')), [shapes]);
  const n = shapes.length;
  const vb = doc.viewBox;

  const bitmaskToLabel = useCallback((mask: number): string => {
    let label = '';
    for (let i = 0; i < n; i++) if (mask & (1 << i)) label += shapeLetters[i];
    return label;
  }, [n, shapeLetters]);

  const bitCount = (mask: number) => {
    let c = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) c++;
    return c;
  };

  const handleEnter = useCallback((mask: number) => {
    const label = bitmaskToLabel(mask);
    if (hoverRef.current !== label) {
      hoverRef.current = label;
      onRegionHover(label);
    }
  }, [onRegionHover, bitmaskToLabel]);

  const handleLeave = useCallback(() => {
    hoverRef.current = null;
    onRegionHover(null);
  }, [onRegionHover]);

  const handleClick = useCallback((mask: number) => {
    onRegionClick(bitmaskToLabel(mask));
  }, [onRegionClick, bitmaskToLabel]);

  const shapeColors = useMemo(() =>
    shapes.map(s => {
      const m = s.style.match(/fill:\s*([^;]+)/);
      return m?.[1] ?? '#666';
    }), [shapes]);

  const renderGeo = useCallback((shape: typeof shapes[0], extra?: Record<string, string>) => {
    const a = shape.attributes;
    const p = extra ?? {};
    switch (shape.tagName) {
      case 'path': return <path d={a['d']} {...p} />;
      case 'circle': return <circle cx={a['cx']} cy={a['cy']} r={a['r']} {...p} />;
      case 'ellipse': return <ellipse cx={a['cx']} cy={a['cy']} rx={a['rx']} ry={a['ry']} {...p} />;
      default: return <path d={a['d'] ?? ''} {...p} />;
    }
  }, []);

  // Uniform pale red, darker for shallow, brighter for deep
  const regionColor = useCallback((mask: number): string => {
    const depth = bitCount(mask);
    const lit = 12 + depth * 4;
    const sat = 20 + depth * 5;
    return `hsl(0, ${sat}%, ${lit}%)`;
  }, []);

  // Build regions sorted by depth: shallowest (bottom) → deepest (top)
  const sortedRegions = useMemo(() => {
    const all: number[] = [];
    for (let mask = 1; mask < (1 << n); mask++) all.push(mask);
    all.sort((a, b) => bitCount(a) - bitCount(b) || a - b);
    return all;
  }, [n]);

  // Pre-build clip-path intersection IDs for multi-shape regions
  // e.g., mask 0b101 (A∩C) → "clip-inter-5"
  const clipDefs = useMemo(() => {
    const defs: React.ReactElement[] = [];
    // Single-shape clip-paths
    for (const s of shapes) {
      defs.push(
        <clipPath key={`clip-${s.id}`} id={`clip-${s.id}`}>
          {renderGeo(s)}
        </clipPath>
      );
    }
    return defs;
  }, [shapes, renderGeo]);

  // SVG content — fully memoized, no hover state
  const svgContent = useMemo(() => (
    <>
      <defs>{clipDefs}</defs>

      {/* Dark background */}
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#111" />

      {/* Regions: shallowest first (bottom), deepest last (top) */}
      <g className="cut-regions-group" onMouseLeave={handleLeave}>
        {sortedRegions.map(mask => {
          const inIdx: number[] = [];
          for (let i = 0; i < n; i++) if (mask & (1 << i)) inIdx.push(i);

          // Build: rect clipped to all "in" shapes
          let el: React.ReactElement = (
            <rect
              x={vb.x} y={vb.y}
              width={vb.w} height={vb.h}
              fill={regionColor(mask)}
              className="cut-region-fill"
              onMouseEnter={() => handleEnter(mask)}
              onClick={() => handleClick(mask)}
            />
          );

          // Wrap in clip-paths, innermost first
          for (const idx of inIdx) {
            el = <g key={`c-${idx}`} clipPath={`url(#clip-${shapes[idx].id})`}>{el}</g>;
          }

          return <g key={mask} className="cut-region">{el}</g>;
        })}
      </g>

      {/* Shape curves — very subtle borders */}
      <g style={{ pointerEvents: 'none' }}>
        {shapes.map((s, i) => (
          <g key={`curve-${s.id}`}>
            {renderGeo(s, {
              fill: 'none',
              stroke: shapeColors[i],
              strokeWidth: '0.8',
              opacity: '0.15',
            } as Record<string, string>)}
          </g>
        ))}
      </g>
    </>
  ), [clipDefs, vb, sortedRegions, n, shapes, regionColor, handleEnter, handleLeave, handleClick, renderGeo, shapeColors]);

  // Text labels
  const textLabels = useMemo(() => {
    const ps = (style: string) => {
      const m: Record<string, string> = {};
      for (const p of style.split(';')) {
        const c = p.indexOf(':');
        if (c !== -1) m[p.slice(0, c).trim()] = p.slice(c + 1).trim();
      }
      return m;
    };
    return (
      <g className="cut-labels" style={{ pointerEvents: 'none' }}>
        {doc.texts.values.map(t => {
          const s = ps(t.style);
          return (
            <text
              key={t.id}
              transform={t.transformExtra
                ? `matrix(${t.transformExtra} ${t.x} ${t.y})`
                : `translate(${t.x}, ${t.y})`}
              style={{
                fill: '#ffffff',
                stroke: 'none',
                fontFamily: s['font-family']?.replace(/'/g, '') ?? 'Tahoma',
                fontSize: s['font-size'] ?? '12',
                fontWeight: 'bold',
                textAnchor: (s['text-anchor'] as 'start' | 'middle' | 'end') ?? undefined,
              }}
              className="cut-label"
            >
              {t.content}
            </text>
          );
        })}
      </g>
    );
  }, [doc.texts.values]);

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
        {svgContent}
        {textLabels}
      </svg>
    </div>
  );
}
