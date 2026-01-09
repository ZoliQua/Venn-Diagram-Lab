import { useMemo, useState, useEffect } from 'react';
import { getModelsBySetCount, MODEL_LIST } from '../models.ts';
import { APP_NAME } from '../version.ts';

interface SummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (filename: string) => void;
  selectMode?: boolean; // true = "Select for Edit" header
  onOpenCustom?: () => void;
}

export const SOURCES: Record<string, { label: string; url?: string }> = {
  'venn-2-set.svg': { label: 'Venn, 1880', url: 'publications/Venn-1880.pdf' },
  'venn-3-set.svg': { label: 'Venn, 1880', url: 'publications/Venn-1880.pdf' },
  'venn-4-set.svg': { label: 'Venn, 1880', url: 'publications/Venn-1880.pdf' },
  'venn-4f-set.svg': { label: 'Venn, 1880', url: 'publications/Venn-1880.pdf' },
  'venn-5f-set.svg': { label: 'Venn, 1880', url: 'publications/Venn-1880.pdf' },
  'venn-2a-set-edwards.svg': { label: 'Edwards, 1996', url: 'publications/Edwards-1996.pdf' },
  'venn-3a-set-edwards.svg': { label: 'Edwards, 1996', url: 'publications/Edwards-1996.pdf' },
  'venn-4a-set-edwards.svg': { label: 'Edwards, 1996', url: 'publications/Edwards-1996.pdf' },
  'venn-5a-set-edwards.svg': { label: 'Edwards, 1996', url: 'publications/Edwards-1996.pdf' },
  'venn-6a-set-edwards.svg': { label: 'Edwards, 1996', url: 'publications/Edwards-1996.pdf' },
  'venn-7a-set-edwards.svg': { label: 'Edwards, 1996', url: 'publications/Edwards-1996.pdf' },
  'venn-3b-set-anderson.svg': { label: 'Anderson, 1988', url: 'publications/Anderson-1988.pdf' },
  'venn-4b-set-anderson.svg': { label: 'Anderson, 1988', url: 'publications/Anderson-1988.pdf' },
  'venn-5b-set-anderson.svg': { label: 'Anderson, 1988', url: 'publications/Anderson-1988.pdf' },
  'venn-6b-set-anderson.svg': { label: 'Anderson, 1988', url: 'publications/Anderson-1988.pdf' },
  'venn-5-set-grunbaum.svg': { label: 'Grünbaum, 1984', url: 'publications/Grunbaum-1984.pdf' },
  'venn-7-set-grunbaum.svg': { label: 'Grünbaum, 1992', url: 'publications/Grunbaum-1992.pdf' },
  'venn-5d-set-bannier.svg': { label: 'Bannier & Bodin, 2017', url: 'publications/Bannier-and-Bodin-2017.pdf' },
  'venn-6d-set-bannier.svg': { label: 'Bannier & Bodin, 2017', url: 'publications/Bannier-and-Bodin-2017.pdf' },
  'venn-7d-set-bannier.svg': { label: 'Bannier & Bodin, 2017', url: 'publications/Bannier-and-Bodin-2017.pdf' },
  'venn-8d-set-bannier.svg': { label: 'Bannier & Bodin, 2017', url: 'publications/Bannier-and-Bodin-2017.pdf' },
  'venn-7c-set-adelaide.svg': { label: 'Mamakani et al., 2012', url: 'publications/Mamakani-et-al-2012.pdf' },
  'venn-7e-set-adelaide.svg': { label: 'Mamakani et al., 2012', url: 'publications/Mamakani-et-al-2012.pdf' },
  'venn-7e-set-hamilton.svg': { label: 'Mamakani et al., 2012', url: 'publications/Mamakani-et-al-2012.pdf' },
  'venn-7e-set-manawatu.svg': { label: 'Mamakani et al., 2012', url: 'publications/Mamakani-et-al-2012.pdf' },
  'venn-7e-set-massey.svg': { label: 'Mamakani et al., 2012', url: 'publications/Mamakani-et-al-2012.pdf' },
  'venn-7e-set-palmerston-north.svg': { label: 'Mamakani et al., 2012', url: 'publications/Mamakani-et-al-2012.pdf' },
  'venn-7e-set-victoria.svg': { label: 'Mamakani et al., 2012', url: 'publications/Mamakani-et-al-2012.pdf' },
  'venn-3e-set-carroll-triangle.svg': { label: 'Carroll, 2000', url: 'publications/Caroll-2000.pdf' },
  'venn-4e-set-carroll-triangle.svg': { label: 'Carroll, 2000', url: 'publications/Caroll-2000.pdf' },
  'venn-5e-set-carroll-triangle.svg': { label: 'Carroll, 2000', url: 'publications/Caroll-2000.pdf' },
  'venn-6e-set-carroll-triangle.svg': { label: 'Carroll, 2000', url: 'publications/Caroll-2000.pdf' },
  'venn-6-set.svg': { label: 'SUMO-Venn' },
  'venn-8-set.svg': { label: 'SUMO-Venn' },
};

export function SvgPreview({ filename }: { filename: string }) {
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    fetch(`./models/svg/${filename}`)
      .then(r => r.text())
      .then(text => {
        // Strip XML declaration and comments, keep SVG
        const clean = text
          .replace(/<\?xml[^?]*\?>/, '')
          .replace(/<!--[\s\S]*?-->/g, '');
        setSvgContent(clean);
      })
      .catch(() => setSvgContent(''));
  }, [filename]);

  if (!svgContent) return <div className="summary-preview-loading">Loading...</div>;

  return (
    <div
      className="summary-preview-svg"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

export function SummaryDialog({ isOpen, onClose, onSelectModel, selectMode, onOpenCustom }: SummaryDialogProps) {
  const modelsBySet = useMemo(() => getModelsBySetCount(), []);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="summary-dialog" onClick={e => e.stopPropagation()}>
        <div className="summary-header">
          <h1 className="summary-title">{selectMode ? 'Select SVG Model' : APP_NAME}</h1>
          <p className="summary-subtitle">{selectMode ? 'Choose a diagram to open in the editor' : `${MODEL_LIST.length} Venn diagram models from 2-set to 8-set`}</p>
          <div className="summary-header-buttons">
            {selectMode && onOpenCustom && <button className="btn btn-toolbar" onClick={onOpenCustom}>Open Custom SVG</button>}
            <button className="btn btn-toolbar summary-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="summary-content">
          {Array.from(modelsBySet.entries())
            .sort(([a], [b]) => a - b)
            .map(([setCount, models]) => (
              <div key={setCount} className="summary-group">
                <h2 className="summary-group-title">
                  {setCount}-Set Diagrams
                  <span className="summary-group-count">{models.length} variant{models.length > 1 ? 's' : ''} — {Math.pow(2, setCount) - 1} regions</span>
                </h2>
                <div className="summary-grid">
                  {models.map(m => {
                    const source = SOURCES[m.filename];
                    return (
                      <div
                        key={m.filename}
                        className="summary-card"
                        onClick={() => onSelectModel(m.filename)}
                      >
                        <SvgPreview filename={m.filename} />
                        <div className="summary-card-info">
                          <div className="summary-card-name">{m.label}</div>
                          {source && (
                            <div className="summary-card-source">
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {source.label}
                                </a>
                              ) : (
                                <span>{source.label}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
