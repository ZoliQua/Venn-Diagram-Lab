import { useMemo, useState } from 'react';
import type { VennDocument } from '../types.ts';
import type { RegionInfo } from '../hooks/useRegionDetection.ts';
import type { Region } from '../utils/regions.ts';
import type { ViewStyle } from '../App.tsx';
import { getAllRegions } from '../utils/regions.ts';
import { getModelsBySetCount } from '../models.ts';

interface ViewerSidebarProps {
  doc: VennDocument | null;
  currentModel: string | null;
  onLoadModel: (filename: string) => void;
  hoveredRegion: RegionInfo | null;
  selectedRegion: RegionInfo | null;
  onHoverRegion: (region: Region | null) => void;
  onSelectRegion: (region: Region) => void;
  onEditThis: () => void;
  isLoading: boolean;
  viewStyle: ViewStyle;
  onSetViewStyle: (style: ViewStyle) => void;
}

const SHAPE_COLORS: Record<string, string> = {
  A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
  E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1',
};

export function ViewerSidebar({
  doc, currentModel, onLoadModel,
  hoveredRegion, selectedRegion,
  onHoverRegion, onSelectRegion,
  onEditThis, isLoading,
  viewStyle, onSetViewStyle,
}: ViewerSidebarProps) {
  const modelsBySet = useMemo(() => getModelsBySetCount(), []);
  const regions = useMemo(() => doc ? getAllRegions(doc) : [], [doc]);
  const activeLabel = selectedRegion?.label ?? hoveredRegion?.label ?? null;

  const regionsByDepth = useMemo(() => {
    const groups = new Map<number, Region[]>();
    for (const r of regions) {
      const d = r.label.length;
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(r);
    }
    return groups;
  }, [regions]);

  // Collapsible state
  const [infoOpen, setInfoOpen] = useState(true);
  const [collapsedDepths, setCollapsedDepths] = useState<Set<number>>(new Set());

  const toggleDepth = (d: number) => {
    setCollapsedDepths(prev => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  };

  return (
    <div className="sidebar viewer-sidebar">
      {/* Model selector */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Model</div>
        <select
          className="model-selector"
          value={currentModel ?? ''}
          onChange={e => e.target.value && onLoadModel(e.target.value)}
          disabled={isLoading}
        >
          <option value="">— Select diagram —</option>
          {Array.from(modelsBySet.entries())
            .sort(([a], [b]) => a - b)
            .map(([setCount, models]) => (
              <optgroup key={setCount} label={`${setCount}-set (${models.length})`}>
                {models.map(m => (
                  <option key={m.filename} value={m.filename}>{m.label}</option>
                ))}
              </optgroup>
            ))
          }
        </select>
        {doc && (
          <>
            <div className="view-style-switcher">
              <button className={`btn btn-sm btn-view-style ${viewStyle === 'layer' ? 'btn-mode-active' : ''}`} onClick={() => onSetViewStyle('layer')}>Layer</button>
              <button className={`btn btn-sm btn-view-style ${viewStyle === 'cut' ? 'btn-mode-active' : ''}`} onClick={() => onSetViewStyle('cut')}>Cut</button>
            </div>
            <button className="btn btn-sm" style={{ marginTop: 4, width: '100%' }} onClick={onEditThis}>Edit this diagram</button>
          </>
        )}
      </div>

      {/* Info (collapsible, above Regions) */}
      {doc && (
        <div className="sidebar-section">
          <div className="sidebar-section-title sidebar-collapsible" onClick={() => setInfoOpen(!infoOpen)}>
            <span>{infoOpen ? '▾' : '▸'} Info</span>
          </div>
          {infoOpen && (
            <div className="viewer-stats">
              <div>Sets: {doc.shapes.filter(s => /^Shape[A-H]$/.test(s.id)).length}</div>
              <div>Regions: {regions.length}</div>
              <div>File: {currentModel}</div>
            </div>
          )}
        </div>
      )}

      {/* Regions (collapsible groups) */}
      {doc && (
        <div className="sidebar-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-section-title">Regions ({regions.length})</div>
          <div className="region-list">
            {Array.from(regionsByDepth.entries())
              .sort(([a], [b]) => a - b)
              .map(([depth, group]) => {
                const isCollapsed = collapsedDepths.has(depth);
                const depthLabel = depth === 1 ? 'Single' : `${depth}-way`;
                return (
                  <div key={depth}>
                    <div className="region-depth-header" onClick={() => toggleDepth(depth)} style={{ cursor: 'pointer' }}>
                      <span>{isCollapsed ? '▸' : '▾'} {depthLabel}</span>
                      <span className="region-depth-count">{group.length}</span>
                    </div>
                    {!isCollapsed && group.map(r => (
                      <div
                        key={r.label}
                        className={`region-item ${r.label === activeLabel ? 'region-item-active' : ''} ${!r.hasCountText ? 'region-item-missing' : ''}`}
                        onMouseEnter={() => onHoverRegion(r)}
                        onMouseLeave={() => onHoverRegion(null)}
                        onClick={() => onSelectRegion(r)}
                      >
                        <span className="region-item-dots">
                          {r.label.split('').map(letter => (
                            <span key={letter} className="region-item-dot" style={{ background: SHAPE_COLORS[letter] ?? '#666' }} />
                          ))}
                        </span>
                        <span className="region-item-label">{r.label}</span>
                        {r.hasCountText && r.countValue !== r.label && (
                          <span className="region-item-value">{r.countValue}</span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}
