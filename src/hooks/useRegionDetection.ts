import { useState, useCallback, useRef } from 'react';
import type { VennDocument } from '../types.ts';
import { getContainingShapeIds, shapeIdToLetter } from '../utils/hitTest.ts';

export interface RegionInfo {
  shapeIds: string[];
  label: string;
  depth: number;
  countTextId: string;
  countValue: string | null;
}

export function useRegionDetection(doc: VennDocument | null) {
  const [hoveredRegion, setHoveredRegion] = useState<RegionInfo | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo | null>(null);
  const rafRef = useRef(0);

  const allShapeIds = doc?.shapes
    .map(s => s.id)
    .filter(id => /^Shape[A-H]$/.test(id)) ?? [];

  const buildRegionInfo = useCallback((svgX: number, svgY: number): RegionInfo | null => {
    if (!doc || allShapeIds.length === 0) return null;

    const containing = getContainingShapeIds(svgX, svgY, allShapeIds);
    if (containing.length === 0) return null;

    const label = containing.map(shapeIdToLetter).sort().join('');
    const countTextId = `Count_${label}`;
    const countText = doc.texts.values.find(t => t.id === countTextId);

    return {
      shapeIds: containing,
      label,
      depth: containing.length,
      countTextId,
      countValue: countText?.content ?? null,
    };
  }, [doc, allShapeIds]);

  const onHover = useCallback((svgX: number, svgY: number) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setHoveredRegion(buildRegionInfo(svgX, svgY));
    });
  }, [buildRegionInfo]);

  const onClick = useCallback((svgX: number, svgY: number) => {
    setSelectedRegion(buildRegionInfo(svgX, svgY));
  }, [buildRegionInfo]);

  const clearHover = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setHoveredRegion(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRegion(null);
  }, []);

  return {
    hoveredRegion,
    selectedRegion,
    onHover,
    onClick,
    clearHover,
    clearSelection,
  };
}
