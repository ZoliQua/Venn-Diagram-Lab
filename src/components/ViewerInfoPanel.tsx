import { useState, useEffect, useMemo } from 'react';
import type { VennDocument } from '../types.ts';
import type { RegionInfo } from '../hooks/useRegionDetection.ts';
import { shapeIdToLetter } from '../utils/hitTest.ts';
import { downloadFile } from '../utils/exportData.ts';

interface ViewerInfoPanelProps {
  doc: VennDocument | null;
  hoveredRegion: RegionInfo | null;
  selectedRegion: RegionInfo | null;
  regionExclusiveItems?: Map<string, string[]> | null;
  regionInclusiveItems?: Map<string, string[]> | null;
  onSave?: () => void;
  canSave?: boolean;
  onClearSelection?: () => void;
  onSelectRegionByLabel?: (label: string) => void;
}

const SHAPE_COLORS: Record<string, string> = {
  A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
  E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1',
};

const SHAPE_COLOR_NAMES: Record<string, string> = {
  A: 'Yellow', B: 'Blue', C: 'Red', D: 'Grey',
  E: 'Brown', F: 'Magenta', G: 'Pink', H: 'Cyan',
};

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="item-match">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function ViewerInfoPanel({
  doc, hoveredRegion, selectedRegion,
  regionExclusiveItems, regionInclusiveItems,
  onSave, canSave, onClearSelection, onSelectRegionByLabel,
}: ViewerInfoPanelProps) {
  const isLocked = selectedRegion !== null;
  const region = isLocked ? selectedRegion : hoveredRegion;

  // Mode A: in-region filter
  const [itemFilter, setItemFilter] = useState('');

  // Mode B: global search
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalOpen, setGlobalOpen] = useState(true);

  // Reset in-region filter when region changes
  useEffect(() => { setItemFilter(''); }, [region?.label]);

  // Global search results
  const globalResults = useMemo(() => {
    if (!globalSearch.trim() || !regionExclusiveItems) return [];
    const query = globalSearch.trim().toLowerCase();
    const results: { label: string; matching: string[]; total: number }[] = [];

    for (const [label, items] of regionExclusiveItems.entries()) {
      const matching = items.filter(item => item.toLowerCase().includes(query));
      if (matching.length > 0) {
        results.push({ label, matching, total: items.length });
      }
    }

    results.sort((a, b) => a.label.length - b.label.length || a.label.localeCompare(b.label));
    return results;
  }, [globalSearch, regionExclusiveItems]);

  if (!doc) {
    return (
      <div className="property-panel viewer-info-panel">
        <div className="panel-empty">Select a diagram to explore regions</div>
      </div>
    );
  }

  // Get name mapping for global search result display
  const getSetNames = (label: string) => {
    return label.split('').map(l => {
      const nameText = doc.texts.names.find(n => n.id === `Name${l}`);
      return nameText?.content ?? `Set ${l}`;
    });
  };

  // Get live shape colors
  const liveColors: Record<string, string> = {};
  for (const s of doc.shapes) {
    const letter = s.id.replace('Shape', '');
    const m = s.style.match(/fill:\s*([^;]+)/);
    if (m) liveColors[letter] = m[1];
  }

  // Helper to render a filtered items list (Mode A)
  const renderItemsList = (items: string[], title: string) => {
    const filtered = itemFilter.trim()
      ? items.filter(item => item.toLowerCase().includes(itemFilter.trim().toLowerCase()))
      : items;
    const limit = itemFilter ? 200 : 50;

    return (
      <div className="panel-section">
        <div className="panel-section-title">{title} ({items.length})</div>

        {items.length > 10 && (
          <div className="item-search-bar">
            <input
              type="text"
              className="item-search-input"
              placeholder="Filter items..."
              value={itemFilter}
              onChange={e => setItemFilter(e.target.value)}
            />
            {itemFilter && (
              <button className="item-search-clear" onClick={() => setItemFilter('')}>{'\u2715'}</button>
            )}
          </div>
        )}
        {itemFilter && (
          <div className="item-search-count">
            {filtered.length} of {items.length} matching
          </div>
        )}

        <div className="viewer-items-list">
          {filtered.slice(0, limit).map((item, i) => (
            <div key={i} className={`viewer-item ${itemFilter ? 'viewer-item-highlight' : ''}`}>
              {itemFilter ? highlightMatch(item, itemFilter) : item}
            </div>
          ))}
          {filtered.length > limit && (
            <div className="viewer-item viewer-item-more">...and {filtered.length - limit} more</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="property-panel viewer-info-panel">

      {/* Mode B: Global Item Search */}
      {regionExclusiveItems && (
        <div className="panel-section global-search-section">
          <div className="panel-section-title sidebar-collapsible" onClick={() => setGlobalOpen(!globalOpen)}>
            <span>{globalOpen ? '\u25be' : '\u25b8'} Find Item</span>
          </div>
          {globalOpen && (
            <>
              <div className="item-search-bar">
                <input
                  type="text"
                  className="item-search-input"
                  placeholder="Search across all regions..."
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                />
                {globalSearch && (
                  <button className="item-search-clear" onClick={() => setGlobalSearch('')}>{'\u2715'}</button>
                )}
              </div>

              {globalSearch.trim() && globalResults.length === 0 && (
                <div className="item-search-count">No items matching "{globalSearch.trim()}"</div>
              )}

              {globalResults.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div className="item-search-count">
                    Found in {globalResults.length} region{globalResults.length !== 1 ? 's' : ''}
                  </div>
                  {globalResults.slice(0, 20).map(r => (
                    <div
                      key={r.label}
                      className="global-search-result"
                      onClick={() => onSelectRegionByLabel?.(r.label)}
                    >
                      <div className="global-search-result-label">
                        {r.label.split('').map(l => (
                          <span key={l} style={{ marginRight: 2 }}>
                            <span className="viewer-set-dot" style={{
                              background: liveColors[l] ?? SHAPE_COLORS[l] ?? '#666',
                              display: 'inline-block', width: 8, height: 8, borderRadius: 2, verticalAlign: 'middle', marginRight: 2,
                            }} />
                          </span>
                        ))}
                        <span style={{ marginLeft: 4 }}>{r.label}</span>
                      </div>
                      <div className="global-search-result-desc">
                        {getSetNames(r.label).join(' \u2229 ')}
                      </div>
                      <div className="global-search-result-count">
                        {r.matching.length} match{r.matching.length !== 1 ? 'es' : ''} / {r.total} items
                      </div>
                      <div className="global-search-result-items">
                        {r.matching.slice(0, 5).map((item, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            {highlightMatch(item, globalSearch.trim())}
                          </span>
                        ))}
                        {r.matching.length > 5 && <span>, ...+{r.matching.length - 5}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Region info */}
      {!region ? (
        <div className="panel-section">
          <div className="panel-section-title">Region Info</div>
          <div className="panel-empty">Hover or click on the diagram to inspect a region</div>
        </div>
      ) : (
        <>
          <div className="panel-section">
            <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{isLocked ? 'Selected Region' : 'Hovered Region'}</span>
              {isLocked && <span className="locked-badge">LOCKED</span>}
            </div>

            <div className="viewer-region-label">{region.label}</div>

            <div className="viewer-region-depth">
              {region.depth === 1 ? 'Unique region' : `${region.depth}-way intersection`}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section-title">Sets ({region.shapeIds.map(shapeIdToLetter).length})</div>
            <div className="viewer-set-list">
              {region.shapeIds.map(shapeIdToLetter).map(letter => {
                const nameText = doc.texts.names.find(n => n.id === `Name${letter}`);
                const displayName = nameText?.content ?? `Set ${letter}`;
                return (
                  <div key={letter} className="viewer-set-item">
                    <span className="viewer-set-dot" style={{ background: liveColors[letter] ?? SHAPE_COLORS[letter] ?? '#666' }} />
                    <span className="viewer-set-letter">{letter}</span>
                    <span className="viewer-set-name">{displayName}</span>
                    <span className="viewer-set-color">{liveColors[letter] ?? SHAPE_COLOR_NAMES[letter]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section-title">Expression</div>
            <div className="viewer-expression">
              {region.shapeIds.map(shapeIdToLetter).map((l, i) => (
                <span key={l}>
                  {i > 0 && <span className="viewer-op"> {'\u2229'} </span>}
                  <span style={{ color: 'var(--text-inverse)' }}>{l}</span>
                </span>
              ))}
            </div>
          </div>

          {(() => {
            if (region.isInclusive && region.label.length === 1) {
              const sumText = doc.texts.sums.find(t => t.id === `CountSUM_${region.label}`);
              const sumVal = sumText?.content;
              return sumVal ? (
                <div className="panel-section">
                  <div className="panel-section-title">Total (inclusive)</div>
                  <div className="viewer-count-value">{sumVal}</div>
                </div>
              ) : null;
            }
            return region.countValue && region.countValue !== region.label ? (
              <div className="panel-section">
                <div className="panel-section-title">Value</div>
                <div className="viewer-count-value">{region.countValue}</div>
              </div>
            ) : null;
          })()}

          {regionExclusiveItems && (() => {
            const exItems = regionExclusiveItems.get(region.label) ?? [];
            const inItems = regionInclusiveItems?.get(region.label) ?? [];
            const isSingle = region.label.length === 1;

            if (region.isInclusive) {
              return inItems.length > 0 ? renderItemsList(inItems, 'All Items') : null;
            }

            return (
              <>
                {exItems.length > 0 && renderItemsList(exItems, isSingle ? 'Exclusive Items' : 'Items')}
                {isSingle && inItems.length > 0 && renderItemsList(inItems, 'All Items incl. intersections')}
              </>
            );
          })()}

          {/* Region export */}
          {regionExclusiveItems && (() => {
            const items = region.isInclusive
              ? (regionInclusiveItems?.get(region.label) ?? [])
              : (regionExclusiveItems.get(region.label) ?? []);
            return items.length > 0 ? (
              <button className="btn btn-sm" style={{ width: '100%', marginTop: 6 }}
                onClick={() => {
                  const content = items.join('\n');
                  downloadFile(content, `region_${region.label}_items.txt`, 'text/plain');
                }}>
                Export Region Items ({items.length})
              </button>
            ) : null;
          })()}

          {/* Action buttons */}
          <div className="panel-section" style={{ marginTop: 'auto', paddingTop: 16 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {canSave && onSave && (
                <button className="btn btn-accent" style={{ flex: 1 }} onClick={onSave}>Save SVG</button>
              )}
              {isLocked && onClearSelection && (
                <button className="btn" style={{ flex: canSave ? 0 : 1 }} onClick={onClearSelection}>Unlock</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
