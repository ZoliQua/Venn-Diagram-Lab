import { useState, useEffect } from 'react';

interface ViewBoxEditorProps {
  viewBox: { x: number; y: number; w: number; h: number };
  onUpdate: (vb: { x: number; y: number; w: number; h: number }) => void;
}

export function ViewBoxEditor({ viewBox, onUpdate }: ViewBoxEditorProps) {
  const [values, setValues] = useState({
    x: String(viewBox.x),
    y: String(viewBox.y),
    w: String(viewBox.w),
    h: String(viewBox.h),
  });

  useEffect(() => {
    setValues({
      x: String(viewBox.x),
      y: String(viewBox.y),
      w: String(viewBox.w),
      h: String(viewBox.h),
    });
  }, [viewBox.x, viewBox.y, viewBox.w, viewBox.h]);

  const commit = () => {
    const x = parseFloat(values.x);
    const y = parseFloat(values.y);
    const w = parseFloat(values.w);
    const h = parseFloat(values.h);
    if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      onUpdate({ x, y, w, h });
    }
  };

  return (
    <div className="viewbox-editor">
      <span className="viewbox-label">ViewBox:</span>
      <label>
        X
        <input
          type="number"
          value={values.x}
          onChange={e => setValues(v => ({ ...v, x: e.target.value }))}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        />
      </label>
      <label>
        Y
        <input
          type="number"
          value={values.y}
          onChange={e => setValues(v => ({ ...v, y: e.target.value }))}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        />
      </label>
      <label>
        W
        <input
          type="number"
          value={values.w}
          onChange={e => setValues(v => ({ ...v, w: e.target.value }))}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        />
      </label>
      <label>
        H
        <input
          type="number"
          value={values.h}
          onChange={e => setValues(v => ({ ...v, h: e.target.value }))}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        />
      </label>
    </div>
  );
}
