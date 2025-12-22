import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import type { VennDocument, VennText, SelectableElement } from '../types.ts';
import type { ZoomPanState } from '../hooks/useZoomPan.ts';

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
  onPointerDown,
  onClick,
  onDoubleClick,
}: {
  t: VennText;
  isSelected: boolean;
  errorHighlight: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const styleObj = useMemo(() => parseStyleToObj(t.style), [t.style]);
  const transformStr = t.transformExtra
    ? `matrix(${t.transformExtra} ${t.x} ${t.y})`
    : `translate(${t.x}, ${t.y})`;

  return (
    <g>
      <text
        id={t.id}
        transform={transformStr}
        style={{
          fill: errorHighlight ? '#ff0000' : styleObj['fill'],
          stroke: errorHighlight ? '#ff0000' : styleObj['stroke'],
          strokeWidth: styleObj['stroke-width'],
          strokeMiterlimit: styleObj['stroke-miterlimit'] ? Number(styleObj['stroke-miterlimit']) : undefined,
          fontFamily: styleObj['font-family']?.replace(/'/g, ''),
          fontSize: styleObj['font-size'],
          fontWeight: styleObj['font-weight'],
          fontStyle: styleObj['font-style'],
          textAnchor: (styleObj['text-anchor'] as 'start' | 'middle' | 'end') || undefined,
          cursor: 'move',
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
}: CanvasProps) {
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
      isSelected={selectedId === t.id}
      errorHighlight={showValidation && invalidIds.has(t.id)}
      onPointerDown={(e) => onDragTextStart(e, t.id, t.x, t.y)}
      onClick={() => onSelect(t.id)}
      onDoubleClick={() => onDoubleClickText(t.id)}
    />
  ), [selectedId, onDragTextStart, onSelect, onDoubleClickText]);

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onWheel={onZoomWheel}
      onPointerDown={onPanPointerDown}
      onPointerMove={(e) => { onPanPointerMove(e); onDragPointerMove(e); }}
      onPointerUp={(e) => { onPanPointerUp(); onDragPointerUp(e); }}
      onClick={handleBackgroundClick}
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
          onClick={handleBackgroundClick}
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
              const commonStyle: React.CSSProperties = {
                opacity: styleObj['opacity'] ? Number(styleObj['opacity']) : undefined,
                fill: styleObj['fill'],
                stroke: styleObj['stroke'],
                strokeWidth: styleObj['stroke-width'],
                strokeMiterlimit: styleObj['stroke-miterlimit'] ? Number(styleObj['stroke-miterlimit']) : undefined,
                strokeLinecap: styleObj['stroke-linecap'] as React.CSSProperties['strokeLinecap'],
                strokeLinejoin: styleObj['stroke-linejoin'] as React.CSSProperties['strokeLinejoin'],
                cursor: 'pointer',
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
