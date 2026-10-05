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

/** Value-equality for RegionInfo (label + displayed count drive all consumers). */
function regionInfoEquals(a: RegionInfo | null, b: RegionInfo | null): boolean {
  if (a === null || b === null) return a === b;
  return a.label === b.label && a.countValue === b.countValue && a.isInclusive === b.isInclusive;
}

export function useRegionDetection(doc: VennDocument | null) {
  const [hoveredRegion, setHoveredRegion] = useState<RegionInfo | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo | null>(null);
  const rafRef = useRef(0);

  const allShapeIds = useMemo(() =>
    doc?.shapes.map(s => s.id).filter(id => /^Shape[A-I]$/.test(id)) ?? [],
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
      const next = buildRegionInfo(svgX, svgY);
      // Bail out when the hovered region didn't actually change — otherwise
      // every rAF tick produces a fresh object and re-renders the whole app
      // tree at 60 fps even while the pointer stays inside one region.
      setHoveredRegion(prev => regionInfoEquals(prev, next) ? prev : next);
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

  const lockHover = useCallback(() => {
    if (hoveredRegion) {
      setSelectedRegion({ ...hoveredRegion });
    } else {
      setSelectedRegion(null);
    }
  }, [hoveredRegion]);

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
    const next = buildRegionFromLabel(label);
    setHoveredRegion(prev => regionInfoEquals(prev, next) ? prev : next);
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
