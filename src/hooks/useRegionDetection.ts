import { useState, useCallback, useRef, useMemo } from 'react';
import type { VennDocument } from '../types.ts';
import { getContainingShapeIds, shapeIdToLetter } from '../utils/hitTest.ts';

export interface RegionInfo {
  shapeIds: string[];
  label: string;
  depth: number;
  countTextId: string;
  countValue: string | null;
  isInclusive?: boolean;  // true when selected via Name/CountSUM click
}

export function useRegionDetection(doc: VennDocument | null) {
  const [hoveredRegion, setHoveredRegion] = useState<RegionInfo | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo | null>(null);
  const rafRef = useRef(0);

  const allShapeIds = useMemo(() =>
    doc?.shapes.map(s => s.id).filter(id => /^Shape[A-H]$/.test(id)) ?? [],
    [doc?.shapes]
  );

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

  /** Lock the current hover as the selection (no re-computation) */
  const hoveredRef = useRef<RegionInfo | null>(null);
  hoveredRef.current = hoveredRegion;

  const lockHover = useCallback(() => {
    if (hoveredRef.current) {
      setSelectedRegion({ ...hoveredRef.current });
    }
  }, []);

  // Direct label-based setters (for CutView where hit-testing is not needed)
  const buildRegionFromLabel = useCallback((label: string): RegionInfo | null => {
    if (!doc || !label) return null;
    const shapeIds = label.split('').map(l => `Shape${l}`);
    const countTextId = `Count_${label}`;
    const countText = doc.texts.values.find(t => t.id === countTextId);
    return {
      shapeIds,
      label,
      depth: label.length,
      countTextId,
      countValue: countText?.content ?? null,
    };
  }, [doc]);

  const setHoverByLabel = useCallback((label: string | null) => {
    if (!label) { setHoveredRegion(null); return; }
    setHoveredRegion(buildRegionFromLabel(label));
  }, [buildRegionFromLabel]);

  const setSelectByLabel = useCallback((label: string, inclusive?: boolean) => {
    const info = buildRegionFromLabel(label);
    if (info && inclusive) {
      info.isInclusive = true;
    }
    setSelectedRegion(info);
  }, [buildRegionFromLabel]);

  return {
    hoveredRegion,
    selectedRegion,
    onHover,
    onClick,
    clearHover,
    clearSelection,
    setHoverByLabel,
    setSelectByLabel,
    lockHover,
  };
}
