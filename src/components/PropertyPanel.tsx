import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { SelectableElement, VennShape } from '../types.ts';
import { ColorPicker } from './ColorPicker.tsx';

interface PropertyPanelProps {
  selected: SelectableElement | null;
  shapes: VennShape[];
  onUpdateTextPosition: (id: string, x: number, y: number) => void;
  onUpdateTextContent: (id: string, content: string) => void;
  onUpdateTextStyle: (id: string, property: string, value: string) => void;
  onUpdateBulletPosition: (id: string, cx: number, cy: number) => void;
  onUpdateShapeStyle: (id: string, property: string, value: string) => void;
}

function parseStyleString(style: string): Record<string, string> {
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

function parseFontSize(raw: string | undefined): number {
  if (!raw) return 12;
  return parseInt(raw.replace(/px$/, ''), 10) || 12;
}

/** Extract the letter from a shape ID like "ShapeA" → "A" */
function shapeIdToLetter(id: string): string {
  return id.replace('Shape', '');
}

/** Extract expected shape letters from a Count ID like "Count_ACE" → ["A","C","E"] */
function expectedLettersFromId(id: string): string[] {
  const match = id.match(/^Count_([A-H]+)$/);
  if (!match) return [];
  return match[1].split('');
}

/**
 * Check which shapes contain point (x,y) in SVG viewBox coordinates.
 *
 * Primary method: document.elementsFromPoint() — tests actual rendered pixels.
 * Fallback: isPointInFill with proper coordinate transform — for when
 * the point is outside the visible viewport (scrolled out).
 */
function getContainingShapes(x: number, y: number, shapeIds: string[]): string[] {
  const svgRoot = document.querySelector('.canvas-svg') as SVGSVGElement | null;
  if (!svgRoot) return [];

  const rootCTM = svgRoot.getScreenCTM();
  if (!rootCTM) return [];

  const screenPt = new DOMPoint(x, y).matrixTransform(rootCTM);
  const shapeIdSet = new Set(shapeIds);
  const result: string[] = [];

  // Check if screen point is within the visible viewport
  const inViewport = screenPt.x >= 0 && screenPt.y >= 0 &&
    screenPt.x <= window.innerWidth && screenPt.y <= window.innerHeight;

  if (inViewport) {
    // Primary: use elementsFromPoint — pixel-perfect, handles all shape types
    const elementsAtPoint = document.elementsFromPoint(screenPt.x, screenPt.y);
    for (const el of elementsAtPoint) {
      if (el.id && shapeIdSet.has(el.id)) {
        result.push(el.id); // Push full shape ID, not letter
      }
    }
  } else {
    // Fallback: isPointInFill with coordinate transform
    for (const id of shapeIds) {
      const el = document.getElementById(id) as unknown as SVGGeometryElement | null;
      if (!el || typeof el.isPointInFill !== 'function') continue;
      try {
        const shapeCTM = el.getScreenCTM();
        if (!shapeCTM) continue;
        const localPt = screenPt.matrixTransform(shapeCTM.inverse());
        if (el.isPointInFill(new DOMPoint(localPt.x, localPt.y))) {
          result.push(id); // Push full shape ID
        }
      } catch { /* skip */ }
    }
  }

  return result.sort();
}

function TextProperties({
  sel,
  shapes,
  onUpdatePosition,
  onUpdateContent,
  onUpdateStyle,
}: {
  sel: { type: 'text'; element: { id: string; x: number; y: number; content: string; style: string }; group: string };
  shapes: VennShape[];
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateStyle: (id: string, property: string, value: string) => void;
}) {
  const t = sel.element;
  const styleObj = parseStyleString(t.style);

  const [content, setContent] = useState(t.content);
  const [x, setX] = useState(String(t.x));
  const [y, setY] = useState(String(t.y));
  const [fontSize, setFontSize] = useState(parseFontSize(styleObj['font-size']));
  const [anchor, setAnchor] = useState(styleObj['text-anchor'] || 'start');
  const [fill, setFill] = useState(styleObj['fill'] || '#262262');
  const [bold, setBold] = useState(styleObj['font-weight'] === 'bold' || parseInt(styleObj['font-weight'] || '0') >= 700);
  const [italic, setItalic] = useState(styleObj['font-style'] === 'italic');

  useEffect(() => {
    setContent(t.content);
    setX(String(t.x));
    setY(String(t.y));
    const s = parseStyleString(t.style);
    setFontSize(parseFontSize(s['font-size']));
    setAnchor(s['text-anchor'] || 'start');
    setFill(s['fill'] || '#262262');
    setBold(s['font-weight'] === 'bold' || parseInt(s['font-weight'] || '0') >= 700);
    setItalic(s['font-style'] === 'italic');
  }, [t.id, t.content, t.x, t.y, t.style]);

  const commitContent = () => {
    if (content !== t.content) {
      onUpdateContent(t.id, content);
    }
  };

  const commitPosition = () => {
    const nx = parseFloat(x);
    const ny = parseFloat(y);
    if (!isNaN(nx) && !isNaN(ny) && (nx !== t.x || ny !== t.y)) {
      onUpdatePosition(t.id, nx, ny);
    }
  };

  const changeFontSize = (newSize: number) => {
    if (newSize < 1) newSize = 1;
    setFontSize(newSize);
    onUpdateStyle(t.id, 'font-size', String(newSize));
  };

  const changeAnchor = (val: string) => {
    setAnchor(val);
    onUpdateStyle(t.id, 'text-anchor', val);
  };

  return (
    <div className="prop-section">
      <div className="prop-row">
        <label>ID</label>
        <span className="prop-value-ro">{t.id}</span>
      </div>
      <div className="prop-row">
        <label>Group</label>
        <span className="prop-value-ro">{sel.group}</span>
      </div>
      <div className="prop-row">
        <label>Content</label>
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          onBlur={commitContent}
          onKeyDown={e => { if (e.key === 'Enter') commitContent(); }}
        />
      </div>
      <div className="prop-row">
        <label>X</label>
        <input
          type="number"
          step="0.1"
          value={x}
          onChange={e => setX(e.target.value)}
          onBlur={commitPosition}
          onKeyDown={e => { if (e.key === 'Enter') commitPosition(); }}
        />
      </div>
      <div className="prop-row">
        <label>Y</label>
        <input
          type="number"
          step="0.1"
          value={y}
          onChange={e => setY(e.target.value)}
          onBlur={commitPosition}
          onKeyDown={e => { if (e.key === 'Enter') commitPosition(); }}
        />
      </div>
      <div className="prop-row">
        <label>Font size</label>
        <div className="prop-fontsize-group">
          <button className="prop-fontsize-btn" onClick={() => changeFontSize(fontSize - 1)}>-</button>
          <input
            type="number"
            min="1"
            step="1"
            value={fontSize}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) changeFontSize(v);
            }}
            className="prop-fontsize-input"
          />
          <button className="prop-fontsize-btn" onClick={() => changeFontSize(fontSize + 1)}>+</button>
        </div>
      </div>
      <div className="prop-row">
        <label>Style</label>
        <div className="prop-fontstyle-group">
          <button
            className={`prop-fontstyle-btn ${bold ? 'prop-fontstyle-active' : ''}`}
            onClick={() => { const v = !bold; setBold(v); onUpdateStyle(t.id, 'font-weight', v ? 'bold' : 'normal'); }}
            title="Bold"
          ><b>B</b></button>
          <button
            className={`prop-fontstyle-btn ${italic ? 'prop-fontstyle-active' : ''}`}
            onClick={() => { const v = !italic; setItalic(v); onUpdateStyle(t.id, 'font-style', v ? 'italic' : 'normal'); }}
            title="Italic"
          ><i>I</i></button>
        </div>
      </div>
      <div className="prop-row">
        <label>Fill</label>
        <ColorPicker
          value={fill}
          onChange={(c) => { setFill(c); onUpdateStyle(t.id, 'fill', c); }}
          onCommit={(c) => { setFill(c); onUpdateStyle(t.id, 'fill', c); }}
        />
      </div>
      <div className="prop-row">
        <label>Anchor</label>
        <select
          value={anchor}
          onChange={e => changeAnchor(e.target.value)}
          className="prop-select"
        >
          <option value="start">start</option>
          <option value="middle">middle</option>
          <option value="end">end</option>
        </select>
      </div>
      <LayersInfo
        textId={t.id}
        textContent={t.content}
        textX={t.x}
        textY={t.y}
        shapes={shapes}
      />
    </div>
  );
}

function LayersInfo({ textId, textContent, textX, textY, shapes }: {
  textId: string;
  textContent: string;
  textX: number;
  textY: number;
  shapes: VennShape[];
}) {
  const shapeIds = useMemo(() => shapes.map(s => s.id), [shapes]);

  // Compute containing shapes AFTER render when DOM is stable
  const [containingShapeIds, setContainingShapeIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setContainingShapeIds(getContainingShapes(textX, textY, shapeIds));
    });
    return () => cancelAnimationFrame(timer);
  }, [textX, textY, shapeIds]);

  // Build shape color map for display
  const shapeColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of shapes) {
      const m = s.style.match(/fill:\s*(#[0-9a-fA-F]+)/);
      map[s.id] = m ? m[1] : '#888';
    }
    return map;
  }, [shapes]);

  // Count of containing shapes
  const count = containingShapeIds.length;

  // Suggested text: letters from containing shape IDs
  const suggestedLetters = containingShapeIds
    .map(id => shapeIdToLetter(id))
    .sort()
    .join('');

  // Expected from text ID
  const expectedLetters = expectedLettersFromId(textId);
  const expectedText = expectedLetters.join('');
  const isCountText = textId.startsWith('Count_');
  const isMatch = isCountText && suggestedLetters === expectedText;
  const contentMatchesSuggested = suggestedLetters === textContent;

  return (
    <div className="prop-layers-section">
      <div className="prop-layers-title">Layers at position ({count})</div>
      <div className="prop-layers-list">
        {count === 0 ? (
          <span className="prop-layers-none">No shapes at this point</span>
        ) : (
          containingShapeIds.map(shapeId => (
            <div key={shapeId} className="prop-layers-item prop-layers-match">
              <span
                className="prop-layers-dot"
                style={{ background: shapeColorMap[shapeId] }}
              />
              {shapeId}
            </div>
          ))
        )}
      </div>
      {isCountText && (
        <div className="prop-layers-suggested">
          <label>Suggested text</label>
          <span className={`prop-layers-suggested-value ${isMatch ? 'prop-layers-ok' : 'prop-layers-warn'}`}>
            {suggestedLetters || '—'}
            {suggestedLetters && (
              <span className={contentMatchesSuggested ? 'prop-layers-check-ok' : 'prop-layers-check-fail'}>
                {contentMatchesSuggested ? ' \u2714' : ' \u2718'}
              </span>
            )}
          </span>
          {!isMatch && expectedText && (
            <span className="prop-layers-expected">
              expected: {expectedText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ShapeProperties({
  sel,
  onUpdateStyle,
}: {
  sel: { type: 'shape'; element: { id: string; tagName: string; style: string; attributes: Record<string, string> } };
  onUpdateStyle: (id: string, property: string, value: string) => void;
}) {
  const s = sel.element;
  const styleObj = parseStyleString(s.style);

  const [shapeFill, setShapeFill] = useState(styleObj['fill'] || '#000000');
  const [shapeStroke, setShapeStroke] = useState(styleObj['stroke'] || '#000000');

  useEffect(() => {
    const so = parseStyleString(s.style);
    setShapeFill(so['fill'] || '#000000');
    setShapeStroke(so['stroke'] || '#000000');
  }, [s.id, s.style]);

  const handleFillChange = useCallback((c: string) => { setShapeFill(c); onUpdateStyle(s.id, 'fill', c); }, [s.id, onUpdateStyle]);
  const handleStrokeChange = useCallback((c: string) => { setShapeStroke(c); onUpdateStyle(s.id, 'stroke', c); }, [s.id, onUpdateStyle]);

  return (
    <div className="prop-section">
      <div className="prop-row">
        <label>ID</label>
        <span className="prop-value-ro">{s.id}</span>
      </div>
      <div className="prop-row">
        <label>Type</label>
        <span className="prop-value-ro">{s.tagName}</span>
      </div>
      <div className="prop-row">
        <label>Fill</label>
        <ColorPicker
          value={shapeFill}
          onChange={handleFillChange}
          onCommit={handleFillChange}
        />
      </div>
      <div className="prop-row">
        <label>Opacity</label>
        <input
          type="number"
          step="0.05"
          min="0"
          max="1"
          value={styleObj['opacity'] || '1'}
          onChange={e => onUpdateStyle(s.id, 'opacity', e.target.value)}
        />
      </div>
      <div className="prop-row">
        <label>Stroke</label>
        <ColorPicker
          value={shapeStroke}
          onChange={handleStrokeChange}
          onCommit={handleStrokeChange}
        />
      </div>
      <div className="prop-row">
        <label>Stroke width</label>
        <input
          type="number"
          step="0.5"
          value={styleObj['stroke-width'] || '1'}
          onChange={e => onUpdateStyle(s.id, 'stroke-width', e.target.value)}
        />
      </div>
    </div>
  );
}

function BulletProperties({
  sel,
  onUpdatePosition,
}: {
  sel: { type: 'bullet'; element: { id: string; cx: number; cy: number; r: number; style: string } };
  onUpdatePosition: (id: string, cx: number, cy: number) => void;
}) {
  const b = sel.element;
  const styleObj = parseStyleString(b.style);

  const [cx, setCx] = useState(String(b.cx));
  const [cy, setCy] = useState(String(b.cy));

  useEffect(() => {
    setCx(String(b.cx));
    setCy(String(b.cy));
  }, [b.cx, b.cy]);

  const commitPosition = () => {
    const ncx = parseFloat(cx);
    const ncy = parseFloat(cy);
    if (!isNaN(ncx) && !isNaN(ncy)) {
      onUpdatePosition(b.id, ncx, ncy);
    }
  };

  return (
    <div className="prop-section">
      <div className="prop-row">
        <label>ID</label>
        <span className="prop-value-ro">{b.id}</span>
      </div>
      <div className="prop-row">
        <label>CX</label>
        <input
          type="number"
          step="0.1"
          value={cx}
          onChange={e => setCx(e.target.value)}
          onBlur={commitPosition}
          onKeyDown={e => { if (e.key === 'Enter') commitPosition(); }}
        />
      </div>
      <div className="prop-row">
        <label>CY</label>
        <input
          type="number"
          step="0.1"
          value={cy}
          onChange={e => setCy(e.target.value)}
          onBlur={commitPosition}
          onKeyDown={e => { if (e.key === 'Enter') commitPosition(); }}
        />
      </div>
      <div className="prop-row">
        <label>Radius</label>
        <span className="prop-value-ro">{b.r}</span>
      </div>
      <div className="prop-row">
        <label>Fill</label>
        <span className="prop-value-ro">{styleObj['fill'] || ''}</span>
      </div>
    </div>
  );
}

export function PropertyPanel({
  selected,
  shapes,
  onUpdateTextPosition,
  onUpdateTextContent,
  onUpdateTextStyle,
  onUpdateBulletPosition,
  onUpdateShapeStyle,
}: PropertyPanelProps) {
  const [width, setWidth] = useState(280);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(280);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      // Dragging left = larger panel
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(500, Math.max(200, startWidthRef.current + delta));
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = false;
        handleRef.current?.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    handleRef.current?.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const panelContent = !selected ? (
    <div className="property-panel" style={{ width }}>
      <div className="prop-empty">No element selected</div>
    </div>
  ) : (
    <div className="property-panel" style={{ width }}>
      <div className="prop-title">Properties</div>
      {selected.type === 'text' && (
        <TextProperties
          key={selected.element.id}
          sel={selected}
          shapes={shapes}
          onUpdatePosition={onUpdateTextPosition}
          onUpdateContent={onUpdateTextContent}
          onUpdateStyle={onUpdateTextStyle}
        />
      )}
      {selected.type === 'shape' && (
        <ShapeProperties
          sel={selected}
          onUpdateStyle={onUpdateShapeStyle}
        />
      )}
      {selected.type === 'bullet' && (
        <BulletProperties
          sel={selected}
          onUpdatePosition={onUpdateBulletPosition}
        />
      )}
    </div>
  );

  return (
    <div className="property-panel-wrapper">
      <div
        ref={handleRef}
        className="property-panel-resize"
        onMouseDown={onResizeStart}
      />
      {panelContent}
    </div>
  );
}
