import { useMemo, useCallback, useRef } from 'react';
import type { VennDocument } from '../types.ts';

interface CutViewCanvasProps {
  doc: VennDocument;
  scale: number;
  onRegionHover: (label: string | null) => void;
  onRegionClick: (label: string) => void;
}

/**
 * Pure SVG region view using clip-path + mask for Boolean operations.
 * Hover effects are CSS-only — no React state on mousemove.
 */
export function CutViewCanvas({ doc, scale, onRegionHover, onRegionClick }: CutViewCanvasProps) {
  const hoverLabelRef = useRef<string | null>(null);

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
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) label += shapeLetters[i];
    }
    return label;
  }, [n, shapeLetters]);

  // Use ref + raw callback to avoid re-renders on hover
  const handleMouseEnter = useCallback((mask: number) => {
    const label = bitmaskToLabel(mask);
    hoverLabelRef.current = label;
    onRegionHover(label);
  }, [onRegionHover, bitmaskToLabel]);

  const handleMouseLeave = useCallback(() => {
    hoverLabelRef.current = null;
    onRegionHover(null);
  }, [onRegionHover]);

  const handleClick = useCallback((mask: number) => {
    onRegionClick(bitmaskToLabel(mask));
  }, [onRegionClick, bitmaskToLabel]);

  const shapeColors = useMemo(() =>
    shapes.map(s => {
      const match = s.style.match(/fill:\s*([^;]+)/);
      return match?.[1] ?? '#666';
    }),
    [shapes]
  );

  const renderShapeGeometry = useCallback((shape: typeof shapes[0], extraProps?: Record<string, string>) => {
    const attrs = shape.attributes;
    const p = extraProps ?? {};
    switch (shape.tagName) {
      case 'path': return <path d={attrs['d']} {...p} />;
      case 'circle': return <circle cx={attrs['cx']} cy={attrs['cy']} r={attrs['r']} {...p} />;
      case 'ellipse': return <ellipse cx={attrs['cx']} cy={attrs['cy']} rx={attrs['rx']} ry={attrs['ry']} {...p} />;
      default: return <path d={attrs['d'] ?? ''} {...p} />;
    }
  }, []);

  // Color: subtle, depth-based
  const regionColor = useCallback((mask: number): string => {
    let depth = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) depth++;
    const hue = (mask * 137.5) % 360;
    const sat = 12 + depth * 5;
    const lit = 18 + depth * 5;
    return `hsl(${hue}, ${sat}%, ${lit}%)`;
  }, [n]);

  // Build defs + regions (memoized — no hover state dependency)
  const svgContent = useMemo(() => {
    const allRegions: number[] = [];
    for (let mask = 1; mask < (1 << n); mask++) allRegions.push(mask);
    // Deeper regions first (behind), shallower on top
    allRegions.sort((a, b) => {
      const dA = a.toString(2).split('1').length - 1;
      const dB = b.toString(2).split('1').length - 1;
      return dB - dA;
    });

    return (
      <>
        <defs>
          {shapes.map(s => (
            <clipPath key={`clip-${s.id}`} id={`clip-${s.id}`}>
              {renderShapeGeometry(s)}
            </clipPath>
          ))}
          {shapes.map(s => (
            <mask key={`mask-not-${s.id}`} id={`mask-not-${s.id}`}>
              <rect x={vb.x - 100} y={vb.y - 100} width={vb.w + 200} height={vb.h + 200} fill="white" />
              {renderShapeGeometry(s, { fill: 'black' })}
            </mask>
          ))}
        </defs>

        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#111" />

        <g className="cut-regions-group">
          {allRegions.map(mask => {
            const inIdx: number[] = [];
            const outIdx: number[] = [];
            for (let i = 0; i < n; i++) {
              if (mask & (1 << i)) inIdx.push(i);
              else outIdx.push(i);
            }

            // Build nested clip/mask structure
            let el: React.ReactElement = (
              <rect
                x={vb.x - 10} y={vb.y - 10}
                width={vb.w + 20} height={vb.h + 20}
                fill={regionColor(mask)}
                className="cut-region-fill"
              />
            );

            for (const idx of outIdx) {
              el = <g mask={`url(#mask-not-${shapes[idx].id})`}>{el}</g>;
            }
            for (const idx of inIdx) {
              el = <g clipPath={`url(#clip-${shapes[idx].id})`}>{el}</g>;
            }

            return (
              <g
                key={`region-${mask}`}
                className="cut-region"
                data-mask={mask}
                onMouseEnter={() => handleMouseEnter(mask)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(mask)}
              >
                {el}
              </g>
            );
          })}
        </g>

        {/* Shape curves */}
        <g style={{ pointerEvents: 'none' }}>
          {shapes.map((s, i) => (
            <g key={`curve-${s.id}`}>
              {renderShapeGeometry(s, {
                fill: 'none',
                stroke: shapeColors[i],
                strokeWidth: '1.5',
                opacity: '0.35',
              } as Record<string, string>)}
            </g>
          ))}
        </g>
      </>
    );
  }, [n, shapes, vb, regionColor, renderShapeGeometry, shapeColors, handleMouseEnter, handleMouseLeave, handleClick]);

  // Text labels (separate — also memoized)
  const textLabels = useMemo(() => {
    const parseStyle = (style: string) => {
      const map: Record<string, string> = {};
      for (const part of style.split(';')) {
        const colon = part.indexOf(':');
        if (colon === -1) continue;
        map[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
      }
      return map;
    };

    return (
      <g className="cut-labels" style={{ pointerEvents: 'none' }}>
        {doc.texts.values.map(t => {
          const s = parseStyle(t.style);
          return (
            <text
              key={t.id}
              transform={t.transformExtra
                ? `matrix(${t.transformExtra} ${t.x} ${t.y})`
                : `translate(${t.x}, ${t.y})`}
              style={{
                fill: s['fill'] === '#FFFFFF' ? '#fff' : '#ccc',
                stroke: 'none',
                fontFamily: s['font-family']?.replace(/'/g, '') ?? 'Tahoma',
                fontSize: s['font-size'] ?? '12',
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

  const displayWidth = vb.w * scale;
  const displayHeight = vb.h * scale;

  return (
    <div className="canvas-inner">
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        width={displayWidth}
        height={displayHeight}
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
