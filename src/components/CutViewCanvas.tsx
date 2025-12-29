import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import type { RegionData } from '../models.ts';

interface CutViewCanvasProps {
  regionData: RegionData;
  scale: number;
  onRegionHover: (label: string | null) => void;
  onRegionClick: (label: string) => void;
}

/** Convert bitmask index to set label, e.g. 5 with sets [A,B,C] → "AC" */
function indexToLabel(index: number, sets: string[]): string {
  let label = '';
  for (let i = 0; i < sets.length; i++) {
    if (index & (1 << i)) label += sets[i];
  }
  return label;
}

/** Count set bits */
function bitCount(v: number): number {
  let c = 0;
  while (v) { c += v & 1; v >>= 1; }
  return c;
}

/** Interpolate between two HSL colors */
function interpolateColor(bg: [number, number, number], fg: [number, number, number], t: number): string {
  const h = bg[0] + (fg[0] - bg[0]) * t;
  const s = bg[1] + (fg[1] - bg[1]) * t;
  const l = bg[2] + (fg[2] - bg[2]) * t;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Cut View: renders pre-computed region SVG paths from JSON data.
 * Each region is a real SVG path with direct mouse events — like venn7.
 */
export function CutViewCanvas({ regionData, scale, onRegionHover, onRegionClick }: CutViewCanvasProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const onHoverRef = useRef(onRegionHover);
  const onClickRef = useRef(onRegionClick);
  useEffect(() => { onHoverRef.current = onRegionHover; }, [onRegionHover]);
  useEffect(() => { onClickRef.current = onRegionClick; }, [onRegionClick]);

  const { n, sets, regions, curves } = regionData;

  // Color scheme: interpolate from dark background to warm center
  const bgColor: [number, number, number] = [220, 15, 12];   // dark blue-grey
  const fgColor: [number, number, number] = [0, 45, 45];      // warm red
  const regionColors = useMemo(() => {
    const colors: string[] = [];
    for (let i = 0; i <= n; i++) {
      colors.push(interpolateColor(bgColor, fgColor, i / n));
    }
    return colors;
  }, [n]);

  // Determine viewBox from coordinate ranges
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
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    return {
      x: minX - margin,
      y: minY - margin,
      w: (maxX - minX) + margin * 2,
      h: (maxY - minY) + margin * 2,
    };
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

  // Sorted region indices: depth ascending (shallow bottom, deep top)
  const sortedIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 1; i < regions.length; i++) {
      if (regions[i]) indices.push(i);
    }
    indices.sort((a, b) => bitCount(a) - bitCount(b) || a - b);
    return indices;
  }, [regions]);

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
      >
        {/* Regions: each a pre-computed SVG path */}
        {sortedIndices.map(index => {
          const d = regions[index];
          if (!d) return null;
          const depth = bitCount(index);
          const color = regionColors[depth];
          const isHovered = hoveredIndex === index;
          const hasHover = hoveredIndex !== null;

          return (
            <path
              key={index}
              d={d}
              fill={color}
              stroke={color}
              strokeWidth={0.15}
              strokeLinejoin="round"
              opacity={hasHover ? (isHovered ? 1 : 0.25) : 1}
              style={{
                cursor: 'pointer',
                transition: 'opacity 0.12s',
              }}
              onMouseEnter={() => handleEnter(index)}
              onClick={() => handleClick(index)}
            />
          );
        })}

        {/* Hover outline */}
        {hoveredIndex !== null && regions[hoveredIndex] && (
          <path
            d={regions[hoveredIndex]}
            fill="none"
            stroke="#ffffff"
            strokeWidth={0.5}
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Shape curves — subtle borders */}
        {curves.map((curve, i) => (
          <path
            key={`curve-${i}`}
            d={curve}
            fill="none"
            stroke={hoveredIndex !== null
              ? (hoveredIndex & (1 << i) ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.05)')
              : 'rgba(255,255,255,0.15)'}
            strokeWidth={hoveredIndex !== null && (hoveredIndex & (1 << i)) ? 0.4 : 0.2}
            strokeLinejoin="round"
            style={{ pointerEvents: 'none', transition: 'opacity 0.12s' }}
          />
        ))}

        {/* Hovered region label — centered on the region's bounding box */}
        {hoveredIndex !== null && regions[hoveredIndex] && (() => {
          const d = regions[hoveredIndex];
          const nums = d.match(/-?\d+\.?\d*/g);
          if (!nums || nums.length < 2) return null;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let i = 0; i < nums.length - 1; i += 2) {
            const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
          }
          const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
          const label = indexToLabel(hoveredIndex, sets);
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
              {label}
            </text>
          );
        })()}
      </svg>
    </div>
  );
}
