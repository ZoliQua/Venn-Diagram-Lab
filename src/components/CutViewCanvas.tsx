import { useMemo, useRef, useEffect, useCallback } from 'react';
import type { VennDocument } from '../types.ts';

interface CutViewCanvasProps {
  doc: VennDocument;
  scale: number;
  onRegionHover: (label: string | null) => void;
  onRegionClick: (label: string) => void;
}

/**
 * Cut View: renders the ORIGINAL shapes exactly as Layer view,
 * then overlays interactive intersection regions on top.
 * Shape geometry is never modified — only colored overlays are added.
 */
export function CutViewCanvas({ doc, scale, onRegionHover, onRegionClick }: CutViewCanvasProps) {
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

  const bitmaskToLabel = useCallback((mask: number): string => {
    let label = '';
    for (let i = 0; i < n; i++) if (mask & (1 << i)) label += shapeLetters[i];
    return label;
  }, [n, shapeLetters]);

  // Parse a CSS style string to an object
  const parseStyleToObj = (style: string): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const part of style.split(';')) {
      const colon = part.indexOf(':');
      if (colon !== -1) map[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
    }
    return map;
  };

  // Render shape with its ORIGINAL style (identical to Layer view Canvas.tsx)
  const renderShapeOriginal = (shape: typeof shapes[0]) => {
    const styleObj = parseStyleToObj(shape.style);
    const reactStyle: React.CSSProperties = {
      opacity: styleObj['opacity'] ? Number(styleObj['opacity']) : undefined,
      fill: styleObj['fill'],
      stroke: styleObj['stroke'],
      strokeWidth: styleObj['stroke-width'],
      strokeMiterlimit: styleObj['stroke-miterlimit'] ? Number(styleObj['stroke-miterlimit']) : undefined,
      strokeLinecap: styleObj['stroke-linecap'] as React.CSSProperties['strokeLinecap'],
      strokeLinejoin: styleObj['stroke-linejoin'] as React.CSSProperties['strokeLinejoin'],
      pointerEvents: 'none',
    };
    const attrs = shape.attributes;
    const common = { id: shape.id, style: reactStyle };

    switch (shape.tagName) {
      case 'path': return <path {...common} d={attrs['d']} />;
      case 'circle': return <circle {...common} cx={attrs['cx']} cy={attrs['cy']} r={attrs['r']} />;
      case 'ellipse': return <ellipse {...common} cx={attrs['cx']} cy={attrs['cy']} rx={attrs['rx']} ry={attrs['ry']} />;
      default: return <path {...common} d={attrs['d'] ?? ''} />;
    }
  };

  // Render shape geometry for clip-path (no style, just shape)
  const renderGeoForClip = (shape: typeof shapes[0]) => {
    const attrs = shape.attributes;
    switch (shape.tagName) {
      case 'path': return <path d={attrs['d']} />;
      case 'circle': return <circle cx={attrs['cx']} cy={attrs['cy']} r={attrs['r']} />;
      case 'ellipse': return <ellipse cx={attrs['cx']} cy={attrs['cy']} rx={attrs['rx']} ry={attrs['ry']} />;
      default: return <path d={attrs['d'] ?? ''} />;
    }
  };

  // Only intersection regions (depth >= 2), sorted shallowest to deepest
  const intersectionRegions = useMemo(() => {
    const all: number[] = [];
    for (let mask = 1; mask < (1 << n); mask++) {
      if (bitCount(mask) >= 2) all.push(mask);
    }
    all.sort((a, b) => bitCount(a) - bitCount(b) || a - b);
    return all;
  }, [n]);

  // SVG internals — stable
  const svgInternals = useMemo(() => {
    // Clip-path defs for each shape
    const clipDefs = shapes.map(s => (
      <clipPath key={`clip-${s.id}`} id={`clip-${s.id}`}>
        {renderGeoForClip(s)}
      </clipPath>
    ));

    // Original shapes (identical to Layer view)
    const originalShapes = shapes.map(s => (
      <g key={s.id}>{renderShapeOriginal(s)}</g>
    ));

    // Intersection overlays (depth >= 2 only)
    const overlays = intersectionRegions.map(mask => {
      const depth = bitCount(mask);
      const inIdx: number[] = [];
      for (let i = 0; i < n; i++) if (mask & (1 << i)) inIdx.push(i);

      // Pale red overlay, more opaque for deeper intersections
      const overlayOpacity = 0.08 + depth * 0.04;

      let el: React.ReactElement = (
        <rect
          x={vb.x} y={vb.y} width={vb.w} height={vb.h}
          fill="#cc2222"
          opacity={overlayOpacity}
          className="cut-region-fill"
          onMouseEnter={() => onHoverRef.current(bitmaskToLabel(mask))}
          onClick={() => onClickRef.current(bitmaskToLabel(mask))}
          style={{ cursor: 'pointer' }}
        />
      );

      // Clip to all shapes in this intersection
      for (const idx of inIdx) {
        el = <g key={`c-${idx}`} clipPath={`url(#clip-${shapes[idx].id})`}>{el}</g>;
      }

      return <g key={mask} className="cut-region">{el}</g>;
    });

    // Single-set region hit areas (invisible, for mouse events only)
    const singleHitAreas = shapes.map((s, i) => {
      const mask = 1 << i;
      let el: React.ReactElement = (
        <rect
          x={vb.x} y={vb.y} width={vb.w} height={vb.h}
          fill="transparent"
          onMouseEnter={() => onHoverRef.current(bitmaskToLabel(mask))}
          onClick={() => onClickRef.current(bitmaskToLabel(mask))}
          style={{ cursor: 'pointer' }}
        />
      );
      el = <g clipPath={`url(#clip-${s.id})`}>{el}</g>;
      return <g key={`single-${i}`}>{el}</g>;
    });

    // Text labels — white bold
    const labels = doc.texts.values.map(t => {
      const s = parseStyleToObj(t.style);
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
          style={{ pointerEvents: 'none' }}
        >
          {t.content}
        </text>
      );
    });

    return { clipDefs, originalShapes, singleHitAreas, overlays, labels };
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
      >
        <defs>{svgInternals.clipDefs}</defs>

        {/* 1. Original shapes — IDENTICAL to Layer view */}
        <g id="Shapes">{svgInternals.originalShapes}</g>

        {/* 2. Single-set hit areas (transparent, bottom) */}
        <g className="cut-regions-group" onMouseLeave={() => onHoverRef.current(null)}>
          {svgInternals.singleHitAreas}

          {/* 3. Intersection overlays — pale red, deeper on top */}
          {svgInternals.overlays}
        </g>

        {/* 4. Text labels */}
        <g>{svgInternals.labels}</g>
      </svg>
    </div>
  );
}
