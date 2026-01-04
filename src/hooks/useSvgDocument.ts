import { useState, useCallback, useRef } from 'react';
import type { VennDocument, VennText } from '../types.ts';
import { loadSvg } from '../parser/loadSvg.ts';
import { saveSvg } from '../parser/saveSvg.ts';

const MAX_HISTORY = 50;

function cloneDoc(doc: VennDocument): VennDocument {
  const clone = JSON.parse(JSON.stringify(doc, (_k, v) =>
    v instanceof Set ? { __set: [...v] } : v
  ), (_k, v) =>
    v && typeof v === 'object' && '__set' in v ? new Set(v.__set) : v
  );
  return clone;
}

export function useSvgDocument() {
  const [doc, setDoc] = useState<VennDocument | null>(null);
  const historyRef = useRef<VennDocument[]>([]);
  const historyIndexRef = useRef(-1);

  const pushHistory = useCallback((newDoc: VennDocument) => {
    const h = historyRef.current;
    const idx = historyIndexRef.current;
    // Discard any redo states beyond current index
    historyRef.current = h.slice(0, idx + 1);
    historyRef.current.push(cloneDoc(newDoc));
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const loadFromString = useCallback((filename: string, svgString: string) => {
    const parsed = loadSvg(filename, svgString);
    setDoc(parsed);
    historyRef.current = [cloneDoc(parsed)];
    historyIndexRef.current = 0;
  }, []);

  const updateDoc = useCallback((updater: (d: VennDocument) => VennDocument, addToHistory = true) => {
    setDoc(prev => {
      if (!prev) return prev;
      const next = updater(cloneDoc(prev));
      if (addToHistory) {
        pushHistory(next);
      }
      return next;
    });
  }, [pushHistory]);

  const updateTextPosition = useCallback((id: string, x: number, y: number) => {
    updateDoc(d => {
      const allTexts = [
        d.texts.header,
        ...d.texts.names,
        ...d.texts.values,
        ...d.texts.sums,
      ];
      for (const t of allTexts) {
        if (t && t.id === id) {
          t.x = x;
          t.y = y;
          break;
        }
      }
      return d;
    });
  }, [updateDoc]);

  // Live drag updates (no history push)
  const updateTextPositionLive = useCallback((id: string, x: number, y: number) => {
    updateDoc(d => {
      const allTexts = [
        d.texts.header,
        ...d.texts.names,
        ...d.texts.values,
        ...d.texts.sums,
      ];
      for (const t of allTexts) {
        if (t && t.id === id) {
          t.x = x;
          t.y = y;
          break;
        }
      }
      return d;
    }, false);
  }, [updateDoc]);

  const updateTextContent = useCallback((id: string, content: string) => {
    updateDoc(d => {
      const allTexts = [
        d.texts.header,
        ...d.texts.names,
        ...d.texts.values,
        ...d.texts.sums,
      ];
      for (const t of allTexts) {
        if (t && t.id === id) {
          t.content = content;
          break;
        }
      }
      return d;
    });
  }, [updateDoc]);

  const updateTextStyle = useCallback((id: string, property: string, value: string) => {
    updateDoc(d => {
      const allTexts = [
        d.texts.header,
        ...d.texts.names,
        ...d.texts.values,
        ...d.texts.sums,
      ];
      for (const t of allTexts) {
        if (t && t.id === id) {
          // Parse style, update property, reserialize
          const styleMap = parseStyleString(t.style);
          styleMap[property] = value;
          t.style = serializeStyleMap(styleMap);
          break;
        }
      }
      return d;
    });
  }, [updateDoc]);

  const updateViewBox = useCallback((vb: { x: number; y: number; w: number; h: number }) => {
    updateDoc(d => {
      d.viewBox = vb;
      return d;
    });
  }, [updateDoc]);

  const updateBulletPosition = useCallback((id: string, cx: number, cy: number) => {
    updateDoc(d => {
      for (const b of d.bullets) {
        if (b.id === id) {
          b.cx = cx;
          b.cy = cy;
          break;
        }
      }
      return d;
    });
  }, [updateDoc]);

  const updateShapeStyle = useCallback((id: string, property: string, value: string) => {
    updateDoc(d => {
      for (const s of d.shapes) {
        if (s.id === id) {
          const styleMap = parseStyleString(s.style);
          styleMap[property] = value;
          s.style = serializeStyleMap(styleMap);
          break;
        }
      }
      return d;
    });
  }, [updateDoc]);

  const updateShapeAttribute = useCallback((id: string, attr: string, value: string) => {
    updateDoc(d => {
      for (const s of d.shapes) {
        if (s.id === id) {
          s.attributes[attr] = value;
          break;
        }
      }
      return d;
    });
  }, [updateDoc]);

  const addText = useCallback((group: 'names' | 'values' | 'sums', text: VennText) => {
    updateDoc(d => {
      d.texts[group].push(text);
      return d;
    });
  }, [updateDoc]);

  const removeText = useCallback((id: string) => {
    updateDoc(d => {
      for (const group of ['names', 'values', 'sums'] as const) {
        const idx = d.texts[group].findIndex(t => t.id === id);
        if (idx !== -1) {
          d.texts[group].splice(idx, 1);
          break;
        }
      }
      return d;
    });
  }, [updateDoc]);

  const moveElementInGroup = useCallback((
    groupType: 'shapes' | 'names' | 'values' | 'sums' | 'bullets',
    id: string,
    direction: 'up' | 'down'
  ) => {
    updateDoc(d => {
      let arr: { id: string }[];
      switch (groupType) {
        case 'shapes': arr = d.shapes; break;
        case 'names': arr = d.texts.names; break;
        case 'values': arr = d.texts.values; break;
        case 'sums': arr = d.texts.sums; break;
        case 'bullets': arr = d.bullets; break;
      }
      const idx = arr.findIndex(el => el.id === id);
      if (idx === -1) return d;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return d;
      [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
      return d;
    });
  }, [updateDoc]);

  const toggleMeta = useCallback((key: 'headerHidden' | 'bulletsHidden') => {
    updateDoc(d => {
      d.meta[key] = !d.meta[key];
      return d;
    });
  }, [updateDoc]);

  const toggleElementVisibility = useCallback((id: string) => {
    updateDoc(d => {
      if (d.meta.hiddenIds.has(id)) {
        d.meta.hiddenIds.delete(id);
      } else {
        d.meta.hiddenIds.add(id);
      }
      return d;
    }, false);
  }, [updateDoc]);

  const toggleGroupVisibility = useCallback((group: string) => {
    updateDoc(d => {
      if (d.meta.hiddenGroups.has(group)) {
        d.meta.hiddenGroups.delete(group);
        // Also unhide all elements in group
        const ids = getGroupIds(d, group);
        for (const id of ids) d.meta.hiddenIds.delete(id);
      } else {
        d.meta.hiddenGroups.add(group);
        // Also hide all elements in group
        const ids = getGroupIds(d, group);
        for (const id of ids) d.meta.hiddenIds.add(id);
      }
      return d;
    }, false);
  }, [updateDoc]);

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx > 0) {
      historyIndexRef.current = idx - 1;
      setDoc(cloneDoc(historyRef.current[idx - 1]));
    }
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    const idx = historyIndexRef.current;
    if (idx < h.length - 1) {
      historyIndexRef.current = idx + 1;
      setDoc(cloneDoc(h[idx + 1]));
    }
  }, []);

  const saveToString = useCallback((): string => {
    if (!doc) return '';
    return saveSvg(doc);
  }, [doc]);

  return {
    doc,
    loadFromString,
    updateTextPosition,
    updateTextPositionLive,
    updateTextContent,
    updateTextStyle,
    updateViewBox,
    updateBulletPosition,
    updateShapeStyle,
    updateShapeAttribute,
    addText,
    removeText,
    moveElementInGroup,
    toggleMeta,
    toggleElementVisibility,
    toggleGroupVisibility,
    undo,
    redo,
    saveToString,
    pushHistory,
  };
}

function getGroupIds(doc: VennDocument, group: string): string[] {
  switch (group) {
    case 'shapes': return doc.shapes.map(s => s.id);
    case 'header': return doc.texts.header ? [doc.texts.header.id] : [];
    case 'names': return doc.texts.names.map(t => t.id);
    case 'values': return doc.texts.values.map(t => t.id);
    case 'sums': return doc.texts.sums.map(t => t.id);
    case 'bullets': return doc.bullets.map(b => b.id);
    default: return [];
  }
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

function serializeStyleMap(map: Record<string, string>): string {
  return Object.entries(map)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}
