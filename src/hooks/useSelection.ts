import { useState, useCallback } from 'react';
import type { VennDocument, SelectableElement } from '../types.ts';

export function useSelection(doc: VennDocument | null) {
  const [selected, setSelected] = useState<SelectableElement | null>(null);

  const selectById = useCallback((id: string) => {
    if (!doc) return;

    // Search shapes
    for (const s of doc.shapes) {
      if (s.id === id) {
        setSelected({ type: 'shape', element: s });
        return;
      }
    }

    // Search header
    if (doc.texts.header?.id === id) {
      setSelected({ type: 'text', element: doc.texts.header, group: 'header' });
      return;
    }

    // Search names
    for (const t of doc.texts.names) {
      if (t.id === id) {
        setSelected({ type: 'text', element: t, group: 'names' });
        return;
      }
    }

    // Search values
    for (const t of doc.texts.values) {
      if (t.id === id) {
        setSelected({ type: 'text', element: t, group: 'values' });
        return;
      }
    }

    // Search sums
    for (const t of doc.texts.sums) {
      if (t.id === id) {
        setSelected({ type: 'text', element: t, group: 'sums' });
        return;
      }
    }

    // Search bullets
    for (const b of doc.bullets) {
      if (b.id === id) {
        setSelected({ type: 'bullet', element: b });
        return;
      }
    }
  }, [doc]);

  const clearSelection = useCallback(() => {
    setSelected(null);
  }, []);

  return { selected, selectById, clearSelection };
}
