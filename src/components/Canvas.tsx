import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import type { VennDocument, VennText, SelectableElement } from '../types.ts';
import type { ZoomPanState } from '../hooks/useZoomPan.ts';
import type { RegionInfo } from '../hooks/useRegionDetection.ts';

interface CanvasProps {
  doc: VennDocument;
  zoomPan: ZoomPanState;
  selected: SelectableElement | null;
  showGrid: boolean;
  showValidation: boolean;
  containerRef: (el: HTMLDivElement | null) => void;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  onZoomWheel: (e: React.WheelEvent) => void;
  onPanPointerDown: (e: React.PointerEvent) => void;
  onPanPointerMove: (e: React.PointerEvent) => void;
  onPanPointerUp: () => void;
  onDragTextStart: (e: React.PointerEvent, id: string, origX: number, origY: number) => void;
  onDragPointerMove: (e: React.PointerEvent) => void;
  onDragPointerUp: (e: React.PointerEvent) => void;
  onDoubleClickText: (id: string) => void;
  readOnly?: boolean;
  viewStyle?: 'layer' | 'cut';
  hoveredRegion?: RegionInfo | null;
  onRegionHover?: (svgX: number, svgY: number) => void;
  onRegionClick?: (svgX: number, svgY: number) => void;
  onRegionLeave?: () => void;
}

function getSelectedId(sel: SelectableElement | null): string | null {
  if (!sel) return null;
  if (sel.type === 'shape') return sel.element.id;
  if (sel.type === 'text') return sel.element.id;
  if (sel.type === 'bullet') return sel.element.id;
  return null;
}

function parseStyleToObj(style: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of style.split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const key = part.slice(0, colon).trim();
    const val = part.slice(colon + 1).trim();
    if (key) map[key] = val;
  }
  return map;
}

function renderShapeElement(
  tagName: string,
  id: string,
  attrs: Record<string, string | undefined>,
  style: React.CSSProperties,
  onClick: (e: React.MouseEvent) => void,
) {
  // Common props for all shape types
  const props: Record<string, unknown> = {
    id,
    style,
    onClick,
  };

  // Copy relevant attributes based on tag type
  switch (tagName) {
    case 'path':
      props.d = attrs['d'];
      if (attrs['transform']) props.transform = attrs['transform'];
      break;
    case 'circle':
      props.cx = attrs['cx'];
      props.cy = attrs['cy'];
      props.r = attrs['r'];
      if (attrs['transform']) props.transform = attrs['transform'];
      break;
    case 'ellipse':
      props.cx = attrs['cx'];
      props.cy = attrs['cy'];
      props.rx = attrs['rx'];
      props.ry = attrs['ry'];
      if (attrs['transform']) props.transform = attrs['transform'];
      break;
    case 'rect':
      props.x = attrs['x'];
      props.y = attrs['y'];
      props.width = attrs['width'];
      props.height = attrs['height'];
      if (attrs['rx']) props.rx = attrs['rx'];
      if (attrs['ry']) props.ry = attrs['ry'];
      if (attrs['transform']) props.transform = attrs['transform'];
      break;
    case 'polygon':
      props.points = attrs['points'];
      if (attrs['transform']) props.transform = attrs['transform'];
      break;
    case 'line':
      props.x1 = attrs['x1'];
      props.y1 = attrs['y1'];
      props.x2 = attrs['x2'];
      props.y2 = attrs['y2'];
      if (attrs['transform']) props.transform = attrs['transform'];
      break;
    default:
      // Fallback: try to render as the given tag
      if (attrs['d']) props.d = attrs['d'];
      if (attrs['transform']) props.transform = attrs['transform'];
      break;
  }

  switch (tagName) {
    case 'path': return <path {...props as React.SVGProps<SVGPathElement>} />;
    case 'circle': return <circle {...props as React.SVGProps<SVGCircleElement>} />;
    case 'ellipse': return <ellipse {...props as React.SVGProps<SVGEllipseElement>} />;
    case 'rect': return <rect {...props as React.SVGProps<SVGRectElement>} />;
    case 'polygon': return <polygon {...props as React.SVGProps<SVGPolygonElement>} />;
    case 'line': return <line {...props as React.SVGProps<SVGLineElement>} />;
    default: return <path {...props as React.SVGProps<SVGPathElement>} />;
  }
}

function TextElement({
  t,
  isSelected,
  errorHighlight,
  viewerHighlight,
  readOnly,
  isCutView,
  onPointerDown,
  onClick,
  onDoubleClick,
}: {
  t: VennText;
  isSelected: boolean;
  errorHighlight: boolean;
  viewerHighlight?: boolean;
  readOnly?: boolean;
  isCutView?: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const styleObj = useMemo(() => parseStyleToObj(t.style), [t.style]);
  const transformStr = t.transformExtra
    ? `matrix(${t.transformExtra} ${t.x} ${t.y})`
    : `translate(${t.x}, ${t.y})`;

  const isCut = isCutView && !errorHighlight;
  const fillColor = errorHighlight ? '#ff0000' : viewerHighlight ? '#00ff88' : isCut ? '#ffffff' : styleObj['fill'];
  const strokeColor = errorHighlight ? '#ff0000' : viewerHighlight ? '#00ff88' : isCut ? 'none' : styleObj['stroke'];

  return (
    <g>
      {viewerHighlight && (
        <HighlightRect targetId={t.id} />
      )}
      <text
        id={t.id}
        transform={transformStr}
        style={{
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: styleObj['stroke-width'],
          strokeMiterlimit: styleObj['stroke-miterlimit'] ? Number(styleObj['stroke-miterlimit']) : undefined,
          fontFamily: styleObj['font-family']?.replace(/'/g, ''),
          fontSize: styleObj['font-size'],
          fontWeight: viewerHighlight ? 'bold' : isCut ? 'bold' : styleObj['font-weight'],
          fontStyle: styleObj['font-style'],
          textAnchor: (styleObj['text-anchor'] as 'start' | 'middle' | 'end') || undefined,
          cursor: readOnly ? 'default' : 'move',
        }}
        onPointerDown={onPointerDown}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
      >
        {t.content}
      </text>
      {isSelected && (
        <SelectionRect targetId={t.id} />
      )}
    </g>
  );
}

function HighlightRect({ targetId }: { targetId: string }) {
  const rectRef = useRef<SVGRectElement>(null);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || !rectRef.current) return;
    try {
      const bbox = (el as unknown as SVGGraphicsElement).getBBox();
      const rect = rectRef.current;
      rect.setAttribute('x', String(bbox.x - 4));
      rect.setAttribute('y', String(bbox.y - 4));
      rect.setAttribute('width', String(bbox.width + 8));
      rect.setAttribute('height', String(bbox.height + 8));
    } catch { /* skip */ }
  });
  return (
    <rect
      ref={rectRef}
      fill="rgba(0, 255, 136, 0.2)"
      stroke="#00ff88"
      strokeWidth="2"
      rx="3"
      pointerEvents="none"
    />
  );
}

function SelectionRect({ targetId }: { targetId: string }) {
  const rectRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || !rectRef.current) return;
    try {
      const bbox = (el as unknown as SVGGraphicsElement).getBBox();
      const rect = rectRef.current;
      rect.setAttribute('x', String(bbox.x - 3));
      rect.setAttribute('y', String(bbox.y - 3));
      rect.setAttribute('width', String(bbox.width + 6));
      rect.setAttribute('height', String(bbox.height + 6));
    } catch {
      // Element might not be rendered yet
    }
  });

  return (
    <rect
      ref={rectRef}
      fill="none"
      stroke="#0078d4"
      strokeWidth="1.5"
      strokeDasharray="4 2"
      pointerEvents="none"
    />
  );
}

export function Canvas({
  doc,
  zoomPan,
  selected,
  showGrid,
  showValidation,
  containerRef,
  onSelect,
  onClearSelection,
  onZoomWheel,
  onPanPointerDown,
  onPanPointerMove,
  onPanPointerUp,
  onDragTextStart,
  onDragPointerMove,
  onDragPointerUp,
  onDoubleClickText,
  readOnly,
  viewStyle,
  hoveredRegion,
  onRegionHover,
  onRegionClick,
  onRegionLeave,
}: CanvasProps) {
  const isCutView = readOnly && viewStyle === 'cut';
  const svgElRef = useRef<SVGSVGElement>(null);

  const svgPointFromEvent = useCallback((e: React.MouseEvent) => {
    const svg = svgElRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  }, []);

  const handleViewerMouseMove = useCallback((e: React.MouseEvent) => {
    if (!readOnly || !onRegionHover) return;
    const pt = svgPointFromEvent(e);
    if (pt) onRegionHover(pt.x, pt.y);
  }, [readOnly, onRegionHover, svgPointFromEvent]);

  const handleViewerClick = useCallback((e: React.MouseEvent) => {
    if (!readOnly || !onRegionClick) return;
    const pt = svgPointFromEvent(e);
    if (pt) onRegionClick(pt.x, pt.y);
  }, [readOnly, onRegionClick, svgPointFromEvent]);

  const handleViewerLeave = useCallback(() => {
    if (readOnly && onRegionLeave) onRegionLeave();
  }, [readOnly, onRegionLeave]);

  const highlightedShapeIds = useMemo(() => {
    if (!readOnly || !hoveredRegion) return new Set<string>();
    return new Set(hoveredRegion.shapeIds);
  }, [readOnly, hoveredRegion]);

  const highlightedCountId = hoveredRegion?.countTextId ?? null;
  const selectedId = getSelectedId(selected);

  // Validation: compute which Count texts are in wrong position
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  const shapeIds = useMemo(() => doc.shapes.map(s => s.id), [doc.shapes]);

  useEffect(() => {
    if (!showValidation) {
      setInvalidIds(new Set());
      return;
    }

    // Run after paint
    const timer = requestAnimationFrame(() => {
      const svgRoot = document.querySelector('.canvas-svg') as SVGSVGElement | null;
      if (!svgRoot) return;
      const rootCTM = svgRoot.getScreenCTM();
      if (!rootCTM) return;

      const shapeIdSet = new Set(shapeIds);
      const errors = new Set<string>();

      for (const t of doc.texts.values) {
        if (!t.id.startsWith('Count_')) continue;

        const screenPt = new DOMPoint(t.x, t.y).matrixTransform(rootCTM);
        const inViewport = screenPt.x >= 0 && screenPt.y >= 0 &&
          screenPt.x <= window.innerWidth && screenPt.y <= window.innerHeight;

        let suggested = '';
        if (inViewport) {
          const els = document.elementsFromPoint(screenPt.x, screenPt.y);
          suggested = els
            .filter(el => shapeIdSet.has(el.id))
            .map(el => el.id.replace('Shape', ''))
            .sort()
            .join('');
        }

        if (suggested && suggested !== t.content) {
          errors.add(t.id);
        }
      }

      setInvalidIds(errors);
    });
    return () => cancelAnimationFrame(timer);
  }, [showValidation, doc.texts.values, shapeIds, doc.viewBox, zoomPan.scale]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClearSelection();
    }
  }, [onClearSelection]);

  const renderText = useCallback((t: VennText) => (
    <TextElement
      key={t.id}
      t={t}
      isSelected={!readOnly && selectedId === t.id}
      errorHighlight={!readOnly && showValidation && invalidIds.has(t.id)}
      viewerHighlight={readOnly === true && highlightedCountId === t.id}
      readOnly={readOnly}
      isCutView={isCutView}
      onPointerDown={readOnly ? () => {} : (e) => onDragTextStart(e, t.id, t.x, t.y)}
      onClick={readOnly ? () => {} : () => onSelect(t.id)}
      onDoubleClick={readOnly ? () => {} : () => onDoubleClickText(t.id)}
    />
  ), [selectedId, onDragTextStart, onSelect, onDoubleClickText, readOnly, isCutView, highlightedCountId, showValidation, invalidIds]);

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onWheel={onZoomWheel}
      onPointerDown={onPanPointerDown}
      onPointerMove={(e) => { onPanPointerMove(e); if (!readOnly) onDragPointerMove(e); }}
      onPointerUp={(e) => { onPanPointerUp(); if (!readOnly) onDragPointerUp(e); }}
      onClick={handleBackgroundClick}
      onMouseLeave={handleViewerLeave}
    >
      <div
        className="canvas-inner"
      >
        <svg
          viewBox={`${doc.viewBox.x} ${doc.viewBox.y} ${doc.viewBox.w} ${doc.viewBox.h}`}
          width={doc.viewBox.w * zoomPan.scale}
          height={doc.viewBox.h * zoomPan.scale}
          xmlns="http://www.w3.org/2000/svg"
          className="canvas-svg"
          ref={svgElRef}
          onClick={readOnly ? handleViewerClick : handleBackgroundClick}
          onMouseMove={readOnly ? handleViewerMouseMove : undefined}
          style={readOnly ? { cursor: 'crosshair' } : undefined}
        >
          {/* Grid */}
          {showGrid && (
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="0.5" />
              </pattern>
            </defs>
          )}
          {showGrid && (
            <rect
              x={doc.viewBox.x}
              y={doc.viewBox.y}
              width={doc.viewBox.w}
              height={doc.viewBox.h}
              fill="url(#grid)"
              pointerEvents="none"
            />
          )}

          {/* Shapes */}
          <g id="Shapes">
            {doc.shapes.filter(s => !doc.meta.hiddenIds.has(s.id) && !doc.meta.hiddenGroups.has('shapes')).map(s => {
              const styleObj = parseStyleToObj(s.style);
              const baseOpacity = styleObj['opacity'] ? Number(styleObj['opacity']) : undefined;
              const isHighlighted = highlightedShapeIds.has(s.id);
              const hasAnyHighlight = highlightedShapeIds.size > 0;
              let finalOpacity = baseOpacity;
              if (readOnly && hasAnyHighlight) {
                if (isCutView) {
                  finalOpacity = isHighlighted ? 0.35 : (baseOpacity ?? 0.2) * 0.12;
                } else {
                  finalOpacity = isHighlighted ? 0.5 : (baseOpacity ?? 0.2) * 0.3;
                }
              } else if (isCutView && !hasAnyHighlight) {
                // Cut view default: slightly reduced opacity, bolder borders
                finalOpacity = (baseOpacity ?? 0.2) * 0.8;
              }

              const cutStroke = isCutView ? (styleObj['stroke'] ?? '#000') : styleObj['stroke'];
              const cutStrokeWidth = isCutView ? '2.5' : styleObj['stroke-width'];

              const commonStyle: React.CSSProperties = {
                opacity: finalOpacity,
                fill: styleObj['fill'],
                stroke: isHighlighted ? '#0078d4' : cutStroke,
                strokeWidth: isHighlighted ? '3' : cutStrokeWidth,
                strokeMiterlimit: styleObj['stroke-miterlimit'] ? Number(styleObj['stroke-miterlimit']) : undefined,
                strokeLinecap: styleObj['stroke-linecap'] as React.CSSProperties['strokeLinecap'],
                strokeLinejoin: styleObj['stroke-linejoin'] as React.CSSProperties['strokeLinejoin'],
                cursor: readOnly ? 'crosshair' : 'pointer',
              };

              const isSelected = selectedId === s.id;
              const handleClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                onSelect(s.id);
              };

              // Build SVG attributes from stored attributes map
              const svgAttrs: Record<string, string | undefined> = {};
              for (const [key, val] of Object.entries(s.attributes)) {
                svgAttrs[key] = val;
              }

              return (
                <g key={s.id}>
                  {renderShapeElement(s.tagName, s.id, svgAttrs, commonStyle, handleClick)}
                  {isSelected && <SelectionRect targetId={s.id} />}
                </g>
              );
            })}
          </g>

          {/* Cut View: clip-path defs + hover overlay */}
          {isCutView && (
            <defs>
              {doc.shapes.filter(s => /^Shape[A-H]$/.test(s.id)).map(s => {
                const a = s.attributes;
                return (
                  <clipPath key={`cut-clip-${s.id}`} id={`cut-clip-${s.id}`}>
                    {s.tagName === 'path' && <path d={a['d']} />}
                    {s.tagName === 'circle' && <circle cx={a['cx']} cy={a['cy']} r={a['r']} />}
                    {s.tagName === 'ellipse' && <ellipse cx={a['cx']} cy={a['cy']} rx={a['rx']} ry={a['ry']} />}
                    {!['path', 'circle', 'ellipse'].includes(s.tagName) && <path d={a['d'] ?? ''} />}
                  </clipPath>
                );
              })}
            </defs>
          )}
          {isCutView && hoveredRegion && hoveredRegion.depth >= 2 && (() => {
            // Bright overlay + white dashed border, clipped to intersection
            let fill: React.ReactElement = (
              <rect
                x={doc.viewBox.x - 10} y={doc.viewBox.y - 10}
                width={doc.viewBox.w + 20} height={doc.viewBox.h + 20}
                fill="#ff2222" opacity="0.5"
                pointerEvents="none"
              />
            );
            // Clip fill to intersection
            for (const shapeId of hoveredRegion.shapeIds) {
              fill = <g clipPath={`url(#cut-clip-${shapeId})`}>{fill}</g>;
            }

            // White dashed border for each shape edge within the intersection
            const borders = hoveredRegion.shapeIds.map(shapeId => {
              const shape = doc.shapes.find(s => s.id === shapeId);
              if (!shape) return null;
              const a = shape.attributes;
              // Clip this shape's outline by all OTHER shapes in the region
              const otherIds = hoveredRegion!.shapeIds.filter(id => id !== shapeId);
              let border: React.ReactElement;
              switch (shape.tagName) {
                case 'path': border = <path d={a['d']} fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="8 4" />; break;
                case 'circle': border = <circle cx={a['cx']} cy={a['cy']} r={a['r']} fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="8 4" />; break;
                case 'ellipse': border = <ellipse cx={a['cx']} cy={a['cy']} rx={a['rx']} ry={a['ry']} fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="8 4" />; break;
                default: border = <path d={a['d'] ?? ''} fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="8 4" />; break;
              }
              for (const otherId of otherIds) {
                border = <g clipPath={`url(#cut-clip-${otherId})`}>{border}</g>;
              }
              return <g key={`border-${shapeId}`} style={{ pointerEvents: 'none' }}>{border}</g>;
            });

            return <g>{fill}{borders}</g>;
          })()}

          {/* Texts */}
          <g id="Texts">
            {/* Header */}
            {doc.texts.header && !doc.meta.headerHidden && !doc.meta.hiddenGroups.has('header') && !doc.meta.hiddenIds.has(doc.texts.header.id) && (
              <g id="Header">
                {renderText(doc.texts.header)}
              </g>
            )}

            {/* Names */}
            <g id="Group_Names">
              {doc.texts.names.filter(t => !doc.meta.hiddenIds.has(t.id) && !doc.meta.hiddenGroups.has('names')).map(renderText)}
            </g>

            {/* Values */}
            <g id="Group_Values">
              {doc.texts.values.filter(t => !doc.meta.hiddenIds.has(t.id) && !doc.meta.hiddenGroups.has('values')).map(renderText)}
            </g>

            {/* Sums */}
            {doc.texts.sums.length > 0 && (
              <g id="Group_CountSums">
                {doc.texts.sums.filter(t => !doc.meta.hiddenIds.has(t.id) && !doc.meta.hiddenGroups.has('sums')).map(renderText)}
              </g>
            )}
          </g>

          {/* Bullets */}
          {!doc.meta.bulletsHidden && !doc.meta.hiddenGroups.has('bullets') && doc.bullets.length > 0 && (
            <g id="Group_Bullets">
              {doc.bullets.filter(b => !doc.meta.hiddenIds.has(b.id)).map(b => {
                const styleObj = parseStyleToObj(b.style);
                return (
                  <g key={b.id}>
                    <circle
                      id={b.id}
                      cx={b.cx}
                      cy={b.cy}
                      r={b.r}
                      style={{
                        opacity: styleObj['opacity'] ? Number(styleObj['opacity']) : undefined,
                        fill: styleObj['fill'],
                        stroke: styleObj['stroke'],
                        strokeWidth: styleObj['stroke-width'],
                        cursor: 'pointer',
                      }}
                      onClick={(e) => { e.stopPropagation(); onSelect(b.id); }}
                    />
                    {selectedId === b.id && <SelectionRect targetId={b.id} />}
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
