import { useMemo, useCallback, useState } from 'react';
import type { VennDocument } from '../types.ts';

interface CutViewCanvasProps {
  doc: VennDocument;
  scale: number;
  onRegionHover: (label: string | null) => void;
  onRegionClick: (label: string) => void;
}

/**
 * Pure SVG region view using clip-path + mask for Boolean operations.
 * Each region (exclusive intersection) is a real SVG element.
 * Inspired by nhthn/venn7: vector regions, subtle colors, hover outlines.
 */
export function CutViewCanvas({ doc, scale, onRegionHover, onRegionClick }: CutViewCanvasProps) {
  const [hoveredMask, setHoveredMask] = useState<number | null>(null);

  const shapes = useMemo(() =>
    doc.shapes
      .filter(s => /^Shape[A-H]$/.test(s.id))
      .sort((a, b) => a.id.localeCompare(b.id)),
    [doc.shapes]
  );

  const shapeLetters = useMemo(() => shapes.map(s => s.id.replace('Shape', '')), [shapes]);
  const n = shapes.length;
  const vb = doc.viewBox;

  // Color scheme: subtle, desaturated, depth-based
  // Background → depth 1 → ... → depth n (brightest)
  const regionColor = useCallback((mask: number): string => {
    let depth = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) depth++;
    // HSL: hue rotates by mask, saturation and lightness by depth
    const hue = (mask * 137.5) % 360;
    const saturation = 15 + depth * 6;
    const lightness = 20 + depth * 6;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }, [n]);

  const bitmaskToLabel = useCallback((mask: number): string => {
    let label = '';
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) label += shapeLetters[i];
    }
    return label;
  }, [n, shapeLetters]);

  const handleMouseEnter = useCallback((mask: number) => {
    setHoveredMask(mask);
    onRegionHover(bitmaskToLabel(mask));
  }, [onRegionHover, bitmaskToLabel]);

  const handleMouseLeave = useCallback(() => {
    setHoveredMask(null);
    onRegionHover(null);
  }, [onRegionHover]);

  const handleClick = useCallback((mask: number) => {
    onRegionClick(bitmaskToLabel(mask));
  }, [onRegionClick, bitmaskToLabel]);

  // Parse shape style to extract fill color for curve rendering
  const shapeColors = useMemo(() => {
    return shapes.map(s => {
      const match = s.style.match(/fill:\s*([^;]+)/);
      return match?.[1] ?? '#666';
    });
  }, [shapes]);

  // Render a shape element (path, circle, ellipse) into a <clipPath> or <mask>
  const renderShapeGeometry = useCallback((shape: typeof shapes[0], props?: Record<string, string>) => {
    const attrs = shape.attributes;
    const extraProps = props ?? {};
    switch (shape.tagName) {
      case 'path':
        return <path d={attrs['d']} {...extraProps} />;
      case 'circle':
        return <circle cx={attrs['cx']} cy={attrs['cy']} r={attrs['r']} {...extraProps} />;
      case 'ellipse':
        return <ellipse cx={attrs['cx']} cy={attrs['cy']} rx={attrs['rx']} ry={attrs['ry']} {...extraProps} />;
      default:
        return <path d={attrs['d'] ?? ''} {...extraProps} />;
    }
  }, []);

  // Build all regions (2^n - 1)
  const regions = useMemo(() => {
    const result: number[] = [];
    for (let mask = 1; mask < (1 << n); mask++) {
      result.push(mask);
    }
    // Sort: deeper regions first (rendered below), shallower on top
    result.sort((a, b) => {
      const depthA = a.toString(2).split('1').length - 1;
      const depthB = b.toString(2).split('1').length - 1;
      return depthB - depthA;
    });
    return result;
  }, [n]);

  const displayWidth = vb.w * scale;
  const displayHeight = vb.h * scale;

  // Build the region element for a given bitmask
  // Uses nested clip-paths (for "in" shapes) and masks (for "out" shapes)
  const buildRegion = useCallback((mask: number) => {
    const inIndices: number[] = [];
    const outIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) inIndices.push(i);
      else outIndices.push(i);
    }

    const isHovered = hoveredMask === mask;
    const hasSomeHover = hoveredMask !== null;
    const fillColor = regionColor(mask);
    const opacity = hasSomeHover ? (isHovered ? 1 : 0.3) : 1;

    // Build from inside out: start with a filled rect, wrap in masks then clips
    let element: React.ReactElement = (
      <rect
        x={vb.x - 10} y={vb.y - 10}
        width={vb.w + 20} height={vb.h + 20}
        fill={fillColor}
        opacity={opacity}
        style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
        onMouseEnter={() => handleMouseEnter(mask)}
        onMouseLeave={handleMouseLeave}
        onClick={() => handleClick(mask)}
      />
    );

    // Wrap in "not" masks for excluded shapes
    for (const idx of outIndices) {
      element = (
        <g mask={`url(#mask-not-${shapes[idx].id})`}>
          {element}
        </g>
      );
    }

    // Wrap in clip-paths for included shapes
    for (const idx of inIndices) {
      element = (
        <g clipPath={`url(#clip-${shapes[idx].id})`}>
          {element}
        </g>
      );
    }

    return (
      <g key={`region-${mask}`}>
        {element}
        {/* Hover outline */}
        {isHovered && inIndices.map(idx => {
          const clipChain = inIndices.filter(i => i !== idx);
          let outlineEl: React.ReactElement = renderShapeGeometry(shapes[idx], {
            fill: 'none',
            stroke: '#ffffff',
            strokeWidth: '2.5',
            style: 'pointer-events:none',
          } as Record<string, string>);

          // Clip outline to the other "in" shapes
          for (const ci of clipChain) {
            outlineEl = (
              <g clipPath={`url(#clip-${shapes[ci].id})`}>
                {outlineEl}
              </g>
            );
          }
          // Mask out excluded shapes
          for (const oi of outIndices) {
            outlineEl = (
              <g mask={`url(#mask-not-${shapes[oi].id})`}>
                {outlineEl}
              </g>
            );
          }
          return <g key={`outline-${mask}-${idx}`}>{outlineEl}</g>;
        })}
      </g>
    );
  }, [n, shapes, vb, hoveredMask, regionColor, handleMouseEnter, handleMouseLeave, handleClick, renderShapeGeometry]);

  // Text labels
  const parseStyle = (style: string) => {
    const map: Record<string, string> = {};
    for (const part of style.split(';')) {
      const colon = part.indexOf(':');
      if (colon === -1) continue;
      map[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
    }
    return map;
  };

  const hoveredLabel = hoveredMask !== null ? bitmaskToLabel(hoveredMask) : null;

  return (
    <div className="canvas-inner">
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        width={displayWidth}
        height={displayHeight}
        xmlns="http://www.w3.org/2000/svg"
        className="canvas-svg"
        style={{ background: '#111' }}
      >
        <defs>
          {/* Clip-paths for each shape */}
          {shapes.map(s => (
            <clipPath key={`clip-${s.id}`} id={`clip-${s.id}`}>
              {renderShapeGeometry(s)}
            </clipPath>
          ))}
          {/* Masks for complement of each shape (¬Shape) */}
          {shapes.map(s => (
            <mask key={`mask-not-${s.id}`} id={`mask-not-${s.id}`}>
              <rect x={vb.x - 100} y={vb.y - 100} width={vb.w + 200} height={vb.h + 200} fill="white" />
              {renderShapeGeometry(s, { fill: 'black' })}
            </mask>
          ))}
        </defs>

        {/* Background */}
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="#111" />

        {/* Regions */}
        {regions.map(mask => buildRegion(mask))}

        {/* Shape curves (borders) — subtle, shown on hover */}
        <g style={{ pointerEvents: 'none' }}>
          {shapes.map((s, i) => (
            <g key={`curve-${s.id}`}>
              {renderShapeGeometry(s, {
                fill: 'none',
                stroke: shapeColors[i],
                strokeWidth: '1.5',
                opacity: '0.4',
              } as Record<string, string>)}
            </g>
          ))}
        </g>

        {/* Text labels */}
        <g style={{ pointerEvents: 'none' }}>
          {doc.texts.values.map(t => {
            const s = parseStyle(t.style);
            const isHighlighted = hoveredLabel === t.id.replace('Count_', '');
            return (
              <text
                key={t.id}
                transform={t.transformExtra
                  ? `matrix(${t.transformExtra} ${t.x} ${t.y})`
                  : `translate(${t.x}, ${t.y})`}
                style={{
                  fill: isHighlighted ? '#fff' : '#ccc',
                  stroke: 'none',
                  fontFamily: s['font-family']?.replace(/'/g, '') ?? 'Tahoma',
                  fontSize: s['font-size'] ?? '12',
                  fontWeight: isHighlighted ? 'bold' : 'normal',
                  textAnchor: (s['text-anchor'] as 'start' | 'middle' | 'end') ?? undefined,
                  opacity: hoveredMask !== null && !isHighlighted ? 0.3 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {t.content}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
