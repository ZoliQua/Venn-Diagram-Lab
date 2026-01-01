import type { VennDocument } from '../types.ts';
import type { RegionInfo } from '../hooks/useRegionDetection.ts';
import { shapeIdToLetter } from '../utils/hitTest.ts';

interface ViewerInfoPanelProps {
  doc: VennDocument | null;
  hoveredRegion: RegionInfo | null;
  selectedRegion: RegionInfo | null;
  regionExclusiveItems?: Map<string, string[]> | null;
  regionInclusiveItems?: Map<string, string[]> | null;
  onSave?: () => void;
  canSave?: boolean;
  onClearSelection?: () => void;
}

const SHAPE_COLORS: Record<string, string> = {
  A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
  E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1',
};

const SHAPE_COLOR_NAMES: Record<string, string> = {
  A: 'Yellow', B: 'Blue', C: 'Red', D: 'Grey',
  E: 'Brown', F: 'Magenta', G: 'Pink', H: 'Cyan',
};

export function ViewerInfoPanel({ doc, hoveredRegion, selectedRegion, regionExclusiveItems, regionInclusiveItems, onSave, canSave, onClearSelection }: ViewerInfoPanelProps) {
  // If a region is selected (clicked), lock to it. Otherwise show hover.
  const isLocked = selectedRegion !== null;
  const region = isLocked ? selectedRegion : hoveredRegion;

  if (!doc) {
    return (
      <div className="property-panel viewer-info-panel">
        <div className="panel-empty">Select a diagram to explore regions</div>
      </div>
    );
  }

  if (!region) {
    return (
      <div className="property-panel viewer-info-panel">
        <div className="panel-section">
          <div className="panel-section-title">Region Info</div>
          <div className="panel-empty">Hover or click on the diagram to inspect a region</div>
        </div>
      </div>
    );
  }

  const letters = region.shapeIds.map(shapeIdToLetter);
  const nameTexts = doc.texts.names;

  return (
    <div className="property-panel viewer-info-panel">
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
        <div className="panel-section-title">Sets ({letters.length})</div>
        <div className="viewer-set-list">
          {letters.map(letter => {
            const nameText = nameTexts.find(n => n.id === `Name${letter}`);
            const displayName = nameText?.content ?? `Set ${letter}`;
            return (
              <div key={letter} className="viewer-set-item">
                <span
                  className="viewer-set-dot"
                  style={{ background: SHAPE_COLORS[letter] ?? '#666' }}
                />
                <span className="viewer-set-letter">{letter}</span>
                <span className="viewer-set-name">{displayName}</span>
                <span className="viewer-set-color">{SHAPE_COLOR_NAMES[letter]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">Expression</div>
        <div className="viewer-expression">
          {letters.map((l, i) => (
            <span key={l}>
              {i > 0 && <span className="viewer-op"> ∩ </span>}
              <span style={{ color: SHAPE_COLORS[l] }}>{l}</span>
            </span>
          ))}
        </div>
      </div>

      {(() => {
        if (region.isInclusive && region.label.length === 1) {
          // Inclusive mode (Name/CountSUM click): show CountSUM value
          const sumText = doc.texts.sums.find(t => t.id === `CountSUM_${region.label}`);
          const sumVal = sumText?.content;
          return sumVal ? (
            <div className="panel-section">
              <div className="panel-section-title">Total (inclusive)</div>
              <div className="viewer-count-value">{sumVal}</div>
            </div>
          ) : null;
        }
        // Normal mode: show Count value
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
          // Name/CountSUM click: show only inclusive items
          return inItems.length > 0 ? (
            <div className="panel-section">
              <div className="panel-section-title">All Items ({inItems.length})</div>
              <div className="viewer-items-list">
                {inItems.slice(0, 50).map((item, i) => (
                  <div key={i} className="viewer-item">{item}</div>
                ))}
                {inItems.length > 50 && (
                  <div className="viewer-item viewer-item-more">...and {inItems.length - 50} more</div>
                )}
              </div>
            </div>
          ) : null;
        }

        return (
          <>
            {exItems.length > 0 && (
              <div className="panel-section">
                <div className="panel-section-title">
                  {isSingle ? 'Exclusive Items' : 'Items'} ({exItems.length})
                </div>
                <div className="viewer-items-list">
                  {exItems.slice(0, 50).map((item, i) => (
                    <div key={i} className="viewer-item">{item}</div>
                  ))}
                  {exItems.length > 50 && (
                    <div className="viewer-item viewer-item-more">...and {exItems.length - 50} more</div>
                  )}
                </div>
              </div>
            )}
            {isSingle && inItems.length > 0 && (
              <div className="panel-section">
                <div className="panel-section-title">All Items incl. intersections ({inItems.length})</div>
                <div className="viewer-items-list">
                  {inItems.slice(0, 50).map((item, i) => (
                    <div key={`in-${i}`} className="viewer-item">{item}</div>
                  ))}
                  {inItems.length > 50 && (
                    <div className="viewer-item viewer-item-more">...and {inItems.length - 50} more</div>
                  )}
                </div>
              </div>
            )}
          </>
        );
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
    </div>
  );
}
