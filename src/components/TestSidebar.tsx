import { useState, useMemo, useCallback } from 'react';
import type { ViewStyle } from '../App.tsx';
import type { UpsetColorMode, UpsetSortMode } from './UpsetPlot.tsx';
import { MODEL_LIST, getModelsBySetCount } from '../models.ts';
import type { CsvData } from '../utils/csvParser.ts';
import { getBinaryColumns } from '../utils/csvParser.ts';

function detectVennType(filename: string): { setCount: number; form: string } {
  const m = filename.match(/venn-(\d+)/);
  const setCount = m ? parseInt(m[1]) : 0;
  let form = 'standard';
  if (filename.includes('-edwards')) form = 'Edwards';
  else if (filename.includes('-anderson')) form = 'Anderson';
  else if (filename.includes('-bannier')) form = 'Bannier';
  else if (filename.includes('-grunbaum')) form = 'Grünbaum';
  else if (filename.includes('-euler')) form = 'Euler';
  else if (filename.includes('-carroll')) form = 'Carroll';
  else if (filename.includes('-adelaide') || filename.includes('-hamilton') || filename.includes('-massey') || filename.includes('-victoria') || filename.includes('-manawatu') || filename.includes('-palmerston')) form = 'Mamakani';
  else if (filename.includes('venn-5e-') || filename.includes('venn-5f-') || filename.includes('venn-4f-')) form = 'Venn (original)';
  else if (filename.includes('-rectangle')) form = 'Rectangle';
  else if (filename.includes('venn-6-set') || filename.includes('venn-8-set.')) form = 'SUMO-Venn';
  return { setCount, form };
}

function ModelInfo({ filename }: { filename: string | null }) {
  if (!filename) return null;
  const vt = detectVennType(filename);
  return (
    <div className="sidebar-file-info" style={{ marginTop: 6 }}>
      <div><span className="file-info-label">Venn type:</span> {vt.setCount} sets</div>
      <div><span className="file-info-label">Form:</span> {vt.form}</div>
      <div><span className="file-info-label">Regions:</span> {Math.pow(2, vt.setCount) - 1} regions</div>
    </div>
  );
}

interface TestSidebarProps {
  csvData: CsvData | null;
  csvFilename: string | null;
  fileType?: 'binary' | 'aggregated';
  geneSetFormat?: 'gmt' | 'gmx' | null;
  selectedModel: string | null;
  onSelectModel: (filename: string, setCount: number) => void;
  columnMapping: number[];  // indices into csv headers for A, B, C, ...
  originalColumnCount: number;
  onSetColumnMapping: (mapping: number[]) => void;
  onCalculate: () => void;
  isCalculated: boolean;
  viewStyle: ViewStyle;
  onSetViewStyle: (style: ViewStyle) => void;
  cutColorMode: 'depth' | 'heatmap';
  onSetCutColorMode: (mode: 'depth' | 'heatmap') => void;
  heatmapColors: { low: string; mid: string; high: string };
  onSetHeatmapColors: (colors: { low: string; mid: string; high: string }) => void;
  heatmapLegendPosition: string;
  onSetHeatmapLegendPosition: (pos: string) => void;
  error: string | null;
  showTitle: boolean;
  showNames: boolean;
  showSums: boolean;
  hoverColor: string;
  onHoverColorChange: (color: string) => void;
  onToggleTitle: () => void;
  onToggleNames: () => void;
  onToggleSums: () => void;
  nameFontSize: number;
  onNameFontSizeChange: (size: number) => void;
  nameFontFamily: string;
  onNameFontFamilyChange: (font: string) => void;
  titleFontSize: number;
  onTitleFontSizeChange: (size: number) => void;
  titleFontFamily: string;
  onTitleFontFamilyChange: (font: string) => void;
  shapeColors: Record<string, string>;
  onShapeColorChange: (letter: string, color: string) => void;
  shapeOpacity: number;
  onShapeOpacityChange: (opacity: number) => void;
  upsetColorMode: UpsetColorMode;
  onSetUpsetColorMode: (mode: UpsetColorMode) => void;
  upsetSortMode: UpsetSortMode;
  onSetUpsetSortMode: (mode: UpsetSortMode) => void;
  upsetThreshold: number;
  onSetUpsetThreshold: (v: number) => void;
  upsetCustomColor: string;
  onSetUpsetCustomColor: (c: string) => void;
  onExportRegionSummary?: () => void;
  onExportMatrix?: () => void;
  onSaveSvg?: () => void;
  onExportImage?: (format: 'png' | 'jpg') => void;
}

export function TestSidebar({
  csvData, csvFilename, fileType, geneSetFormat,
  selectedModel, onSelectModel,
  columnMapping, originalColumnCount, onSetColumnMapping,
  onCalculate, isCalculated,
  viewStyle, onSetViewStyle,
  cutColorMode, onSetCutColorMode,
  heatmapColors, onSetHeatmapColors,
  heatmapLegendPosition, onSetHeatmapLegendPosition,
  error,
  showTitle, showNames, showSums,
  hoverColor, onHoverColorChange,
  onToggleTitle, onToggleNames, onToggleSums,
  nameFontSize, onNameFontSizeChange,
  nameFontFamily, onNameFontFamilyChange,
  titleFontSize, onTitleFontSizeChange,
  titleFontFamily, onTitleFontFamilyChange,
  shapeColors, onShapeColorChange,
  shapeOpacity, onShapeOpacityChange,
  upsetColorMode, onSetUpsetColorMode,
  upsetSortMode, onSetUpsetSortMode,
  upsetThreshold, onSetUpsetThreshold,
  upsetCustomColor, onSetUpsetCustomColor,
  onExportRegionSummary, onExportMatrix,
  onSaveSvg, onExportImage,
}: TestSidebarProps) {
  useMemo(() => getModelsBySetCount(), []);
  const [fileInfoOpen, setFileInfoOpen] = useState(true);
  const [modelOpen, setModelOpen] = useState(true);
  const [mappingOpen, setMappingOpen] = useState(true);
  const [viewOpen, setViewOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(true);

  const binaryColumns = useMemo(() => {
    if (!csvData) return [];
    return getBinaryColumns(csvData);
  }, [csvData]);

  const handleColumnChange = useCallback((setIndex: number, colIndex: number) => {
    const newMapping = [...columnMapping];
    newMapping[setIndex] = colIndex;
    onSetColumnMapping(newMapping);
  }, [columnMapping, onSetColumnMapping]);

  const n = columnMapping.length;
  const maxSets = Math.min(originalColumnCount, 9);
  const letters = 'ABCDEFGHI'.slice(0, n).split('');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, maxSets, fileType, binaryColumns.length]);

  return (
    <div className="sidebar test-sidebar">
      {/* File Info */}
      {csvData && csvFilename && (
        <div className="sidebar-section">
          <div className="sidebar-section-title sidebar-collapsible" onClick={() => setFileInfoOpen(o => !o)}>
            <span>{fileInfoOpen ? '▾' : '▸'} 1. File Info</span>
          </div>
          {fileInfoOpen && (
            <>
              <div className="sidebar-file-info">
                <div><span className="file-info-label">Filename:</span> {csvFilename}</div>
                <div><span className="file-info-label">Format:</span> {
                  geneSetFormat === 'gmt' ? 'GMT (Gene Matrix Transposed)' :
                  geneSetFormat === 'gmx' ? 'GMX (Gene Matrix)' :
                  fileType === 'aggregated' ? 'Aggregated' : 'Binary'
                }</div>
                <div><span className="file-info-label">Columns:</span> {csvData.headers.length} columns</div>
                {fileType !== 'aggregated' && <div><span className="file-info-label">Binary:</span> {binaryColumns.length} detected</div>}
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
            </>
          )}
        </div>
      )}

      {/* Model Selection */}
      {csvData && (
        <div className="sidebar-section">
          <div className="sidebar-section-title sidebar-collapsible" onClick={() => setModelOpen(o => !o)}>
            <span>{modelOpen ? '▾' : '▸'} 2. Venn Diagram Model</span>
          </div>
          {modelOpen && (n >= 2 ? (
            <>
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
              <ModelInfo filename={selectedModel} />
            </>
          ) : (
            <div className="test-error">{fileType === 'aggregated' ? 'Need at least 2 data columns' : 'Need at least 2 binary columns'}</div>
          ))}
        </div>
      )}

      {/* Column Mapping — only shown after model is selected */}
      {csvData && n >= 2 && selectedModel && (
        <div className="sidebar-section">
          <div className="sidebar-section-title sidebar-collapsible" onClick={() => setMappingOpen(o => !o)}>
            <span>{mappingOpen ? '▾' : '▸'} 3. Column Mapping</span>
          </div>
          {mappingOpen && <>
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
                    <option key={hi} value={hi}>{h.length > 32 ? h.slice(0, 32) + '…' : h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="test-font-size" style={{ marginTop: 6 }}>
            <label>Opacity: {Math.round(shapeOpacity * 100)}%</label>
            <input type="range" min="5" max="100" value={Math.round(shapeOpacity * 100)} onChange={e => onShapeOpacityChange(parseInt(e.target.value) / 100)} />
          </div>
          </>}
        </div>
      )}

      {/* View Style */}
      {isCalculated && (
        <div className="sidebar-section">
          <div className="sidebar-section-title sidebar-collapsible" onClick={() => setViewOpen(o => !o)}>
            <span>{viewOpen ? '▾' : '▸'} 4. View</span>
          </div>
          {viewOpen && <>
          <div className="view-style-switcher">
            <button className={`btn btn-sm btn-view-style ${viewStyle === 'layer' ? 'btn-mode-active' : ''}`} onClick={() => onSetViewStyle('layer')}>Layer</button>
            <button className={`btn btn-sm btn-view-style ${viewStyle === 'cut' ? 'btn-mode-active' : ''}`} onClick={() => onSetViewStyle('cut')}>Cut</button>
            <button className={`btn btn-sm btn-view-style ${viewStyle === 'upset' ? 'btn-mode-active' : ''}`} onClick={() => onSetViewStyle('upset')}>UpSet</button>
          </div>
          {viewStyle === 'upset' && (
            <div style={{ marginTop: 8 }}>
              <div className="sidebar-subsection-title">Sort by</div>
              <div className="view-style-switcher">
                <button className={`btn btn-sm btn-view-style ${upsetSortMode === 'size' ? 'btn-mode-active' : ''}`} onClick={() => onSetUpsetSortMode('size')}>Size</button>
                <button className={`btn btn-sm btn-view-style ${upsetSortMode === 'degree' ? 'btn-mode-active' : ''}`} onClick={() => onSetUpsetSortMode('degree')}>Degree</button>
              </div>
              <div className="sidebar-subsection-title" style={{ marginTop: 6 }}>Color mode</div>
              <div className="view-style-switcher">
                <button className={`btn btn-sm btn-view-style ${upsetColorMode === 'depth' ? 'btn-mode-active' : ''}`} onClick={() => onSetUpsetColorMode('depth')}>Depth</button>
                <button className={`btn btn-sm btn-view-style ${upsetColorMode === 'heatmap' ? 'btn-mode-active' : ''}`} onClick={() => onSetUpsetColorMode('heatmap')}>Heatmap</button>
                <button className={`btn btn-sm btn-view-style ${upsetColorMode === 'custom' ? 'btn-mode-active' : ''}`} onClick={() => onSetUpsetColorMode('custom')}>Custom</button>
              </div>
              {upsetColorMode === 'custom' && (
                <div className="heatmap-color-row" style={{ marginTop: 6 }}>
                  <label>Color</label>
                  <input type="color" className="test-color-input" value={upsetCustomColor} onChange={e => onSetUpsetCustomColor(e.target.value)} />
                </div>
              )}
              <div className="sidebar-subsection-title" style={{ marginTop: 6 }}>Min. count threshold</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="range" min="0" max="100" value={upsetThreshold} onChange={e => onSetUpsetThreshold(parseInt(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: '#aaa', minWidth: 24, textAlign: 'right' }}>{upsetThreshold}</span>
              </div>
            </div>
          )}
          {viewStyle === 'cut' && (
            <div style={{ marginTop: 8 }}>
              <div className="sidebar-subsection-title">Color mode</div>
              <div className="view-style-switcher">
                <button className={`btn btn-sm btn-view-style ${cutColorMode === 'depth' ? 'btn-mode-active' : ''}`} onClick={() => onSetCutColorMode('depth')}>Depth</button>
                <button className={`btn btn-sm btn-view-style ${cutColorMode === 'heatmap' ? 'btn-mode-active' : ''}`} onClick={() => onSetCutColorMode('heatmap')}>Heatmap</button>
              </div>
              {cutColorMode === 'heatmap' && (
                <>
                  <div className="heatmap-color-row" style={{ marginTop: 6 }}>
                    <label>Low</label>
                    <input type="color" className="test-color-input" value={heatmapColors.low} onChange={e => onSetHeatmapColors({ ...heatmapColors, low: e.target.value })} />
                    <label>Mid</label>
                    <input type="color" className="test-color-input" value={heatmapColors.mid} onChange={e => onSetHeatmapColors({ ...heatmapColors, mid: e.target.value })} />
                    <label>High</label>
                    <input type="color" className="test-color-input" value={heatmapColors.high} onChange={e => onSetHeatmapColors({ ...heatmapColors, high: e.target.value })} />
                  </div>
                  <div className="test-font-type-row" style={{ marginTop: 4 }}>
                    <label>Legend</label>
                    <select className="prop-select" value={heatmapLegendPosition} onChange={e => onSetHeatmapLegendPosition(e.target.value)}>
                      <option value="bottom-left">Bottom-left</option>
                      <option value="bottom-right">Bottom-right</option>
                      <option value="top-left">Top-left</option>
                      <option value="top-right">Top-right</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}
          {viewStyle === 'layer' && (
            <>
              <div className="sidebar-subsection-title" style={{ marginTop: 8 }}>Group names and numbers</div>
              <div className="test-show-inline">
                <span className="test-show-label">Show</span>
                <button className={`btn btn-xs btn-toggle ${showNames ? 'btn-toggle-active' : ''}`} onClick={onToggleNames}>Names</button>
                <button className={`btn btn-xs btn-toggle ${showSums ? 'btn-toggle-active' : ''}`} onClick={onToggleSums}>SUM Numbers</button>
              </div>
              <div className="test-font-size">
                <label>Font-size: {nameFontSize}px</label>
                <input type="range" min="8" max="48" value={nameFontSize} onChange={e => onNameFontSizeChange(parseInt(e.target.value))} />
              </div>
              <div className="test-font-type-row">
                <label>Font type</label>
                <select className="prop-select" value={nameFontFamily} onChange={e => onNameFontFamilyChange(e.target.value)}>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Arial">Arial</option>
                  <option value="sans-serif">Sans-serif</option>
                  <option value="monospace">Monospace</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </div>

              <div className="sidebar-subsection-title" style={{ marginTop: 12 }}>Diagram Title</div>
              <div className="test-show-inline">
                <span className="test-show-label">Show</span>
                <button className={`btn btn-xs btn-toggle ${showTitle ? 'btn-toggle-active' : ''}`} onClick={onToggleTitle}>Title</button>
              </div>
              <div className="test-font-size">
                <label>Font-size: {titleFontSize}px</label>
                <input type="range" min="8" max="48" value={titleFontSize} onChange={e => onTitleFontSizeChange(parseInt(e.target.value))} />
              </div>
              <div className="test-font-type-row">
                <label>Font type</label>
                <select className="prop-select" value={titleFontFamily} onChange={e => onTitleFontFamilyChange(e.target.value)}>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Arial">Arial</option>
                  <option value="sans-serif">Sans-serif</option>
                  <option value="monospace">Monospace</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </div>

              <div className="sidebar-subsection-title" style={{ marginTop: 12 }}>Selected region style</div>
              <div className="test-font-type-row">
                <label>Hover color</label>
                <input type="color" className="test-color-input" value={hoverColor} onChange={e => onHoverColorChange(e.target.value)} />
              </div>
            </>
          )}
          </>}
        </div>
      )}

      {/* Export */}
      {isCalculated && onExportRegionSummary && (
        <div className="sidebar-section">
          <div className="sidebar-section-title sidebar-collapsible" onClick={() => setExportOpen(o => !o)}>
            <span>{exportOpen ? '▾' : '▸'} 5. Export</span>
          </div>
          {exportOpen && (
            <>
              <div className="data-summary-hint" style={{ marginTop: 4 }}>Save diagram as image or vector file</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button className="btn btn-sm" style={{ flex: 1 }} onClick={onSaveSvg}>SVG</button>
                <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => onExportImage?.('png')}>PNG</button>
                <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => onExportImage?.('jpg')}>JPG</button>
              </div>
              <div className="data-summary-hint" style={{ marginTop: 8 }}>Export calculated data as tab-separated files</div>
              <button className="btn btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={onExportRegionSummary}>
                Regions Summary (TSV)
              </button>
              <button className="btn btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={onExportMatrix}>
                Item Matrix (TSV)
              </button>
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
