import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import type { RegionData } from '../models.ts';

interface CutViewCanvasProps {
  regionData: RegionData;
  scale: number;
  onRegionHover: (label: string | null) => void;
  onRegionClick: (label: string) => void;
  onBackgroundClick?: () => void;
  lockedLabel?: string | null;
  countOverrides?: Map<string, string> | null;
  colorMode?: 'depth' | 'heatmap';
  heatmapColors?: { low: string; mid: string; high: string };
  legendPosition?: string;
}

function indexToLabel(index: number, sets: string[]): string {
  let label = '';
  for (let i = 0; i < sets.length; i++) {
    if (index & (1 << i)) label += sets[i];
  }
  return label;
}

function bitCount(v: number): number {
  let c = 0;
  while (v) { c += v & 1; v >>= 1; }
  return c;
}

function interpolateColor(bg: [number, number, number], fg: [number, number, number], t: number): string {
  const h = bg[0] + (fg[0] - bg[0]) * t;
  const s = bg[1] + (fg[1] - bg[1]) * t;
  const l = bg[2] + (fg[2] - bg[2]) * t;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/** Parse hex color to [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Interpolate between two RGB colors */
function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

/** 3-point diverging color scale */
function heatmapColorFromPalette(t: number, low: string, mid: string, high: string): string {
  t = Math.max(0, Math.min(1, t));
  const lowRgb = hexToRgb(low);
  const midRgb = hexToRgb(mid);
  const highRgb = hexToRgb(high);
  if (t <= 0.5) return lerpRgb(lowRgb, midRgb, t / 0.5);
  return lerpRgb(midRgb, highRgb, (t - 0.5) / 0.5);
}

export function CutViewCanvas({ regionData, scale, onRegionHover, onRegionClick, onBackgroundClick, lockedLabel, countOverrides, colorMode = 'depth', heatmapColors, legendPosition = 'bottom-left' }: CutViewCanvasProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const onHoverRef = useRef(onRegionHover);
  const onClickRef = useRef(onRegionClick);
  useEffect(() => { onHoverRef.current = onRegionHover; }, [onRegionHover]);
  useEffect(() => { onClickRef.current = onRegionClick; }, [onRegionClick]);

  const { n, sets, regions, curves } = regionData;

  // Depth-based color scheme
  const bgColor: [number, number, number] = [220, 15, 12];
  const fgColor: [number, number, number] = [0, 45, 45];
  const depthColors = useMemo(() => {
    const colors: string[] = [];
    for (let i = 0; i <= n; i++) {
      colors.push(interpolateColor(bgColor, fgColor, i / n));
    }
    return colors;
  }, [n]);

  // Heatmap: compute min/max from countOverrides
  const heatmapRange = useMemo(() => {
    if (colorMode !== 'heatmap' || !countOverrides) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    for (const [, val] of countOverrides) {
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        if (num < min) min = num;
        if (num > max) max = num;
      }
    }
    if (min === Infinity) return { min: 0, max: 1 };
    return { min, max: max === min ? min + 1 : max };
  }, [colorMode, countOverrides]);

  // Get fill color for a region index
  const getRegionFill = useCallback((index: number): string => {
    if (colorMode === 'heatmap' && countOverrides) {
      const label = indexToLabel(index, sets);
      const val = countOverrides.get(label);
      const num = val ? parseInt(val, 10) : 0;
      if (isNaN(num) || num === 0) return '#3a3a4a'; // grey for zero
      const t = (num - heatmapRange.min) / (heatmapRange.max - heatmapRange.min);
      const low = heatmapColors?.low ?? '#2166AC';
      const mid = heatmapColors?.mid ?? '#F7F7F7';
      const high = heatmapColors?.high ?? '#B2182B';
      return heatmapColorFromPalette(t, low, mid, high);
    }
    return depthColors[bitCount(index)];
  }, [colorMode, countOverrides, sets, heatmapRange, depthColors]);

  const viewBox = useMemo(() => {
    const margin = 5;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const path of regions) {
      if (!path) continue;
      const nums = path.match(/-?\d+\.?\d*/g);
      if (!nums) continue;
      for (let i = 0; i < nums.length - 1; i += 2) {
        const x = parseFloat(nums[i]);
        const y = parseFloat(nums[i + 1]);
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
    }
    return { x: minX - margin, y: minY - margin, w: (maxX - minX) + margin * 2, h: (maxY - minY) + margin * 2 };
  }, [regions]);

  const displaySize = 700 * scale;

  const handleEnter = useCallback((index: number) => {
    setHoveredIndex(index);
    onHoverRef.current(indexToLabel(index, sets));
  }, [sets]);

  const handleLeave = useCallback(() => {
    setHoveredIndex(null);
    onHoverRef.current(null);
  }, []);

  const handleClick = useCallback((index: number) => {
    onClickRef.current(indexToLabel(index, sets));
  }, [sets]);

  // Compute locked index from label
  const lockedIndex = useMemo(() => {
    if (!lockedLabel) return null;
    for (let i = 1; i < regions.length; i++) {
      if (regions[i] && indexToLabel(i, sets) === lockedLabel) return i;
    }
    return null;
  }, [lockedLabel, regions, sets]);

  // Active highlight: locked takes priority over hovered
  const activeIndex = lockedIndex ?? hoveredIndex;

  const sortedIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 1; i < regions.length; i++) {
      if (regions[i]) indices.push(i);
    }
    indices.sort((a, b) => bitCount(a) - bitCount(b) || a - b);
    return indices;
  }, [regions]);

  // Legend position
  const legendW = viewBox.w * 0.2;
  const legendX = legendPosition.includes('right') ? viewBox.x + viewBox.w - legendW - 3 : viewBox.x + 3;
  const legendY = legendPosition.includes('top') ? viewBox.y + 5 : viewBox.y + viewBox.h - 8;

  return (
    <div className="canvas-inner">
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        width={displaySize}
        height={displaySize}
        xmlns="http://www.w3.org/2000/svg"
        className="canvas-svg cut-view-svg"
        style={{ background: '#1a1a2e' }}
        onMouseLeave={handleLeave}
        onClick={(e) => { if (e.target === e.currentTarget) onBackgroundClick?.(); }}
      >
        {sortedIndices.map(index => {
          const d = regions[index];
          if (!d) return null;
          const color = getRegionFill(index);
          const isHovered = activeIndex === index;
          const hasHover = activeIndex !== null;

          return (
            <path
              key={index}
              d={d}
              fill={color}
              stroke={color}
              strokeWidth={0.15}
              strokeLinejoin="round"
              opacity={hasHover ? (isHovered ? 1 : 0.25) : 1}
              style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
              onMouseEnter={() => handleEnter(index)}
              onClick={() => handleClick(index)}
            />
          );
        })}

        {activeIndex !== null && regions[activeIndex] && (
          <path
            d={regions[activeIndex]}
            fill="none"
            stroke="#ffffff"
            strokeWidth={0.5}
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {curves.map((curve, i) => (
          <path
            key={`curve-${i}`}
            d={curve}
            fill="none"
            stroke={activeIndex !== null
              ? (activeIndex & (1 << i) ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.05)')
              : 'rgba(255,255,255,0.15)'}
            strokeWidth={activeIndex !== null && (activeIndex & (1 << i)) ? 0.4 : 0.2}
            strokeLinejoin="round"
            style={{ pointerEvents: 'none', transition: 'opacity 0.12s' }}
          />
        ))}

        {activeIndex !== null && regions[activeIndex] && (() => {
          const d = regions[activeIndex];
          const nums = d.match(/-?\d+\.?\d*/g);
          if (!nums || nums.length < 2) return null;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let i = 0; i < nums.length - 1; i += 2) {
            const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
          }
          const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
          const label = indexToLabel(activeIndex, sets);
          const displayText = countOverrides?.get(label) ?? label;
          const fontSize = label.length <= 2 ? 5 : label.length <= 4 ? 3.5 : 2.5;
          return (
            <text
              x={cx} y={cy}
              fill="#ffffff"
              fontSize={fontSize}
              fontWeight="bold"
              fontFamily="Tahoma, sans-serif"
              textAnchor="middle"
              dominantBaseline="central"
              style={{ pointerEvents: 'none' }}
            >
              {displayText}
            </text>
          );
        })()}

        {/* Heatmap legend bar */}
        {colorMode === 'heatmap' && countOverrides && (
          <>
            <defs>
              <linearGradient id="heatmap-legend-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={heatmapColors?.low ?? '#2166AC'} />
                <stop offset="50%" stopColor={heatmapColors?.mid ?? '#F7F7F7'} />
                <stop offset="100%" stopColor={heatmapColors?.high ?? '#B2182B'} />
              </linearGradient>
            </defs>
            <rect x={legendX} y={legendY} width={legendW} height={2.5} rx={0.5}
              fill="url(#heatmap-legend-grad)" stroke="rgba(255,255,255,0.3)" strokeWidth={0.15} />
            <text x={legendX} y={legendY - 0.8} fill="#aaa" fontSize={2} fontFamily="Tahoma, sans-serif">
              {heatmapRange.min}
            </text>
            <text x={legendX + legendW} y={legendY - 0.8} fill="#aaa" fontSize={2} fontFamily="Tahoma, sans-serif" textAnchor="end">
              {heatmapRange.max}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
