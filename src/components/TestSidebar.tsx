import { useState, useMemo, useCallback } from 'react';
import type { ViewStyle } from '../App.tsx';
import { MODEL_LIST, getModelsBySetCount } from '../models.ts';
import type { CsvData } from '../utils/csvParser.ts';
import { getBinaryColumns } from '../utils/csvParser.ts';

interface TestSidebarProps {
  csvData: CsvData | null;
  csvFilename: string | null;
  onLoadCsv: (source: 'file' | 'sample') => void;
  onFileUpload: (file: File) => void;
  selectedModel: string | null;
  onSelectModel: (filename: string, setCount: number) => void;
  columnMapping: number[];  // indices into csv headers for A, B, C, ...
  onSetColumnMapping: (mapping: number[]) => void;
  onCalculate: () => void;
  isCalculated: boolean;
  viewStyle: ViewStyle;
  onSetViewStyle: (style: ViewStyle) => void;
  error: string | null;
  showTitle: boolean;
  showNames: boolean;
  showSums: boolean;
  onToggleTitle: () => void;
  onToggleNames: () => void;
  onToggleSums: () => void;
  nameFontSize: number;
  onNameFontSizeChange: (size: number) => void;
  shapeColors: Record<string, string>;
  onShapeColorChange: (letter: string, color: string) => void;
  shapeOpacity: number;
  onShapeOpacityChange: (opacity: number) => void;
}

export function TestSidebar({
  csvData, csvFilename,
  onLoadCsv, onFileUpload,
  selectedModel, onSelectModel,
  columnMapping, onSetColumnMapping,
  onCalculate, isCalculated,
  viewStyle, onSetViewStyle,
  error,
  showTitle, showNames, showSums,
  onToggleTitle, onToggleNames, onToggleSums,
  nameFontSize, onNameFontSizeChange,
  shapeColors, onShapeColorChange,
  shapeOpacity, onShapeOpacityChange,
}: TestSidebarProps) {
  useMemo(() => getModelsBySetCount(), []);
  const [fileInputKey, setFileInputKey] = useState(0);

  const binaryColumns = useMemo(() => {
    if (!csvData) return [];
    return getBinaryColumns(csvData);
  }, [csvData]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      setFileInputKey(k => k + 1);
    }
  }, [onFileUpload]);

  const handleColumnChange = useCallback((setIndex: number, colIndex: number) => {
    const newMapping = [...columnMapping];
    newMapping[setIndex] = colIndex;
    onSetColumnMapping(newMapping);
  }, [columnMapping, onSetColumnMapping]);

  const n = columnMapping.length;
  const maxSets = Math.min(binaryColumns.length, 8);
  const letters = 'ABCDEFGH'.slice(0, n).split('');

  // Show all models from 2-set up to max available binary columns
  const compatibleModelsBySet = useMemo(() => {
    if (maxSets < 2) return new Map<number, typeof MODEL_LIST>();
    const groups = new Map<number, typeof MODEL_LIST>();
    for (const m of MODEL_LIST) {
      if (m.setCount >= 2 && m.setCount <= maxSets) {
        if (!groups.has(m.setCount)) groups.set(m.setCount, []);
        groups.get(m.setCount)!.push(m);
      }
    }
    return groups;
  }, [n]);

  return (
    <div className="sidebar test-sidebar">
      {/* Data Source */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">1. Data Source</div>
        <div className="test-data-buttons">
          <button className="btn btn-sm" onClick={() => onLoadCsv('sample')}>Load Sample</button>
          <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
            Upload Custom
            <input key={fileInputKey} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
          </label>
        </div>
      </div>

      {/* File Info */}
      {csvData && csvFilename && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">2. File Info</div>
          <div className="sidebar-file-info">
            <div><span className="file-info-label">Filename:</span> {csvFilename}</div>
            <div><span className="file-info-label">File type:</span> CSV</div>
            <div><span className="file-info-label">Columns:</span> {csvData.headers.length} columns</div>
            <div><span className="file-info-label">Binary:</span> {binaryColumns.length} detected</div>
            <div><span className="file-info-label">Rows:</span> {csvData.rows.length}</div>
          </div>
          <button className="btn btn-sm" style={{ width: '100%', marginTop: 6 }}
            onClick={() => {
              if (!csvFilename) return;
              const link = document.createElement('a');
              link.href = `./data/${csvFilename}`;
              link.download = csvFilename;
              link.click();
            }}>Download File</button>
        </div>
      )}

      {/* Model Selection */}
      {csvData && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">3. Venn Diagram Model</div>
          {n >= 2 ? (
            <select
              className="model-selector"
              value={selectedModel ?? ''}
              onChange={e => {
                const fn = e.target.value;
                const model = MODEL_LIST.find(m => m.filename === fn);
                if (model) onSelectModel(fn, model.setCount);
              }}
            >
              <option value="">— Select model (2–{maxSets} sets) —</option>
              {Array.from(compatibleModelsBySet.entries())
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
          ) : (
            <div className="test-error">Need at least 2 binary columns</div>
          )}
        </div>
      )}

      {/* Column Mapping */}
      {csvData && n >= 2 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">4. Column Mapping</div>
          <div className="test-column-mapping">
            {letters.map((letter, i) => (
              <div key={letter} className="test-column-row">
                <span className="test-column-letter">{letter}</span>
                <input
                  type="color"
                  className="test-color-input"
                  value={shapeColors[letter] ?? '#666666'}
                  onChange={e => onShapeColorChange(letter, e.target.value)}
                  title={`Color for set ${letter}`}
                />
                <select
                  className="test-column-select"
                  value={columnMapping[i]}
                  onChange={e => handleColumnChange(i, parseInt(e.target.value))}
                >
                  {csvData.headers.map((h, hi) => (
                    <option key={hi} value={hi}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="test-font-size" style={{ marginTop: 6 }}>
            <label>Opacity: {Math.round(shapeOpacity * 100)}%</label>
            <input type="range" min="5" max="100" value={Math.round(shapeOpacity * 100)} onChange={e => onShapeOpacityChange(parseInt(e.target.value) / 100)} />
          </div>
          <button
            className="btn btn-sm btn-accent"
            style={{ width: '100%', marginTop: 8 }}
            onClick={onCalculate}
            disabled={!selectedModel || n < 2}
          >
            Calculate
          </button>
        </div>
      )}

      {/* View Style */}
      {isCalculated && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">5. View</div>
          <div className="view-style-switcher">
            <button className={`btn btn-sm btn-view-style ${viewStyle === 'layer' ? 'btn-mode-active' : ''}`} onClick={() => onSetViewStyle('layer')}>Layer</button>
            <button className={`btn btn-sm btn-view-style ${viewStyle === 'cut' ? 'btn-mode-active' : ''}`} onClick={() => onSetViewStyle('cut')}>Cut</button>
          </div>
          {viewStyle === 'layer' && (
            <>
              <div className="test-view-toggles">
                <button className={`btn btn-sm btn-toggle ${showTitle ? 'btn-toggle-active' : ''}`} onClick={onToggleTitle}>Title</button>
                <button className={`btn btn-sm btn-toggle ${showNames ? 'btn-toggle-active' : ''}`} onClick={onToggleNames}>Names</button>
                <button className={`btn btn-sm btn-toggle ${showSums ? 'btn-toggle-active' : ''}`} onClick={onToggleSums}>Numbers</button>
              </div>
              <div className="test-font-size">
                <label>Name size: {nameFontSize}px</label>
                <input type="range" min="8" max="48" value={nameFontSize} onChange={e => onNameFontSizeChange(parseInt(e.target.value))} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="sidebar-section">
          <div className="test-error">{error}</div>
        </div>
      )}
    </div>
  );
}
