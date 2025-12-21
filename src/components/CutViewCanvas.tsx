import { useRef, useEffect, useMemo, useCallback } from 'react';
import type { VennDocument, VennText } from '../types.ts';
import type { RegionInfo } from '../hooks/useRegionDetection.ts';
import { computeRegionMap, renderCutView, bitmaskToLabel, labelToBitmask } from '../utils/regionRenderer.ts';

interface CutViewCanvasProps {
  doc: VennDocument;
  scale: number;
  hoveredRegion: RegionInfo | null;
  onRegionHover: (label: string | null) => void;
  onRegionClick: (label: string) => void;
}

const RENDER_SCALE = 1; // 1:1 with viewBox for performance

export function CutViewCanvas({ doc, scale, hoveredRegion, onRegionHover, onRegionClick }: CutViewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textOverlayRef = useRef<SVGSVGElement>(null);

  const shapeLetters = useMemo(() =>
    doc.shapes
      .map(s => s.id.replace('Shape', ''))
      .filter(l => /^[A-H]$/.test(l))
      .sort(),
    [doc.shapes]
  );

  const filteredShapes = useMemo(() =>
    doc.shapes.filter(s => /^Shape[A-H]$/.test(s.id)).sort((a, b) => a.id.localeCompare(b.id)),
    [doc.shapes]
  );

  const renderWidth = Math.round(doc.viewBox.w * RENDER_SCALE);
  const renderHeight = Math.round(doc.viewBox.h * RENDER_SCALE);

  const regionMap = useMemo(() =>
    computeRegionMap(filteredShapes, doc.viewBox, renderWidth, renderHeight),
    [filteredShapes, doc.viewBox, renderWidth, renderHeight]
  );

  const highlightMask = useMemo(() => {
    if (!hoveredRegion) return null;
    return labelToBitmask(hoveredRegion.label, shapeLetters);
  }, [hoveredRegion, shapeLetters]);

  // Render the cut view
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderCutView(ctx, regionMap, renderWidth, renderHeight, filteredShapes.length, highlightMask);
  }, [regionMap, renderWidth, renderHeight, filteredShapes.length, highlightMask]);

  // Mouse → region detection via regionMap lookup
  const getMaskAtEvent = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const px = Math.round((e.clientX - rect.left) / rect.width * renderWidth);
    const py = Math.round((e.clientY - rect.top) / rect.height * renderHeight);
    if (px < 0 || py < 0 || px >= renderWidth || py >= renderHeight) return 0;
    return regionMap[py * renderWidth + px];
  }, [regionMap, renderWidth, renderHeight]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const mask = getMaskAtEvent(e);
    if (mask === 0) {
      onRegionHover(null);
    } else {
      onRegionHover(bitmaskToLabel(mask, shapeLetters));
    }
  }, [getMaskAtEvent, onRegionHover, shapeLetters]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const mask = getMaskAtEvent(e);
    if (mask !== 0) {
      onRegionClick(bitmaskToLabel(mask, shapeLetters));
    }
  }, [getMaskAtEvent, onRegionClick, shapeLetters]);

  const handleMouseLeave = useCallback(() => {
    onRegionHover(null);
  }, [onRegionHover]);

  const displayWidth = doc.viewBox.w * scale;
  const displayHeight = doc.viewBox.h * scale;

  // Render text labels from the SVG on top of the canvas
  const parseStyle = (style: string) => {
    const map: Record<string, string> = {};
    for (const part of style.split(';')) {
      const colon = part.indexOf(':');
      if (colon === -1) continue;
      const key = part.slice(0, colon).trim();
      const val = part.slice(colon + 1).trim();
      if (key) map[key] = val;
    }
    return map;
  };

  const renderTextElement = (t: VennText) => {
    const s = parseStyle(t.style);
    const isHighlighted = hoveredRegion?.countTextId === t.id;
    return (
      <text
        key={t.id}
        transform={t.transformExtra
          ? `matrix(${t.transformExtra} ${t.x} ${t.y})`
          : `translate(${t.x}, ${t.y})`
        }
        style={{
          fill: isHighlighted ? '#00ff88' : (s['fill'] === '#FFFFFF' ? '#ffffff' : '#e0e0e0'),
          stroke: 'none',
          fontFamily: s['font-family']?.replace(/'/g, '') ?? 'Tahoma',
          fontSize: s['font-size'] ?? '12',
          fontWeight: isHighlighted ? 'bold' : (s['font-weight'] ?? 'normal'),
          textAnchor: (s['text-anchor'] as 'start' | 'middle' | 'end') ?? undefined,
          pointerEvents: 'none',
        }}
      >
        {t.content}
      </text>
    );
  };

  return (
    <div className="cut-view-container" style={{ position: 'relative', width: displayWidth, height: displayHeight }}>
      <canvas
        ref={canvasRef}
        width={renderWidth}
        height={renderHeight}
        style={{
          width: displayWidth,
          height: displayHeight,
          cursor: 'crosshair',
          imageRendering: 'auto',
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />
      <svg
        ref={textOverlayRef}
        viewBox={`${doc.viewBox.x} ${doc.viewBox.y} ${doc.viewBox.w} ${doc.viewBox.h}`}
        width={displayWidth}
        height={displayHeight}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        {doc.texts.values.map(renderTextElement)}
        {doc.texts.names.map(renderTextElement)}
        {doc.texts.sums.map(renderTextElement)}
        {doc.texts.header && renderTextElement(doc.texts.header)}
      </svg>
    </div>
  );
}
