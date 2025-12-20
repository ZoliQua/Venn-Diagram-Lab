import type { VennDocument } from '../types.ts';
import type { RegionInfo } from '../hooks/useRegionDetection.ts';
import { shapeIdToLetter } from '../utils/hitTest.ts';

interface ViewerInfoPanelProps {
  doc: VennDocument | null;
  hoveredRegion: RegionInfo | null;
  selectedRegion: RegionInfo | null;
}

const SHAPE_COLORS: Record<string, string> = {
  A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
  E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1',
};

const SHAPE_COLOR_NAMES: Record<string, string> = {
  A: 'Yellow', B: 'Blue', C: 'Red', D: 'Grey',
  E: 'Brown', F: 'Magenta', G: 'Pink', H: 'Cyan',
};

export function ViewerInfoPanel({ doc, hoveredRegion, selectedRegion }: ViewerInfoPanelProps) {
  const region = selectedRegion ?? hoveredRegion;

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
        <div className="panel-section-title">
          {selectedRegion ? 'Selected Region' : 'Hovered Region'}
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

      {region.countValue && region.countValue !== region.label && (
        <div className="panel-section">
          <div className="panel-section-title">Value</div>
          <div className="viewer-count-value">{region.countValue}</div>
        </div>
      )}
    </div>
  );
}
