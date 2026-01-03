import { useRef, useEffect, useCallback, useState } from 'react';
import { useSvgDocument } from './hooks/useSvgDocument.ts';
import { useSelection } from './hooks/useSelection.ts';
import { useZoomPan } from './hooks/useZoomPan.ts';
import { useDrag } from './hooks/useDrag.ts';
import { useRegionDetection } from './hooks/useRegionDetection.ts';
import { Toolbar } from './components/Toolbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Canvas } from './components/Canvas.tsx';
import { PropertyPanel } from './components/PropertyPanel.tsx';
import { ViewBoxEditor } from './components/ViewBoxEditor.tsx';
import { TextEditDialog } from './components/TextEditDialog.tsx';
import { ReportDialog } from './components/ReportDialog.tsx';
import { ViewerSidebar } from './components/ViewerSidebar.tsx';
import { ViewerInfoPanel } from './components/ViewerInfoPanel.tsx';
import { fetchModel, fetchRegionData } from './models.ts';
import type { RegionData } from './models.ts';
import { CutViewCanvas } from './components/CutViewCanvas.tsx';
import { SummaryDialog } from './components/SummaryDialog.tsx';
import { WelcomeDialog } from './components/WelcomeDialog.tsx';
import { HelpDialog } from './components/HelpDialog.tsx';
import { SvgValidationDialog } from './components/SvgValidationDialog.tsx';
import { TestSidebar } from './components/TestSidebar.tsx';
import type { Region } from './utils/regions.ts';
import { parseCsv, calculateVennCounts, getBinaryColumns } from './utils/csvParser.ts';
import type { CsvData } from './utils/csvParser.ts';

export type ViewStyle = 'layer' | 'cut';
export type AppMode = 'view' | 'edit' | 'test';

export default function App() {
  const [mode, setMode] = useState<AppMode>('view');
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [viewStyle, setViewStyle] = useState<ViewStyle>('layer');
  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summarySelectMode, setSummarySelectMode] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [modeSwitchTarget, setModeSwitchTarget] = useState<AppMode | null>(null);
  const [validationDialog, setValidationDialog] = useState<{ filename: string; content: string } | null>(null);
  const [originalSvgContent, setOriginalSvgContent] = useState<string | null>(null);

  // Test mode state
  const [testCsvData, setTestCsvData] = useState<CsvData | null>(null);
  const [testCsvFilename, setTestCsvFilename] = useState<string | null>(null);
  const [testModel, setTestModel] = useState<string | null>(null);
  const [testColumnMapping, setTestColumnMapping] = useState<number[]>([]);
  const [testCalculated, setTestCalculated] = useState(false);
  const [, setTestVennCounts] = useState<Map<string, number> | null>(null);
  const [testExclusiveItems, setTestExclusiveItems] = useState<Map<string, string[]> | null>(null);
  const [testInclusiveItems, setTestInclusiveItems] = useState<Map<string, string[]> | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testShowTitle, setTestShowTitle] = useState(true);
  const [testShowNames, setTestShowNames] = useState(true);
  const [testShowSums, setTestShowSums] = useState(true);
  const [testNameFontSize, setTestNameFontSize] = useState(24);

  const svgDoc = useSvgDocument();
  const { doc } = svgDoc;
  const { selected, selectById, clearSelection } = useSelection(doc);
  const zoomPan = useZoomPan();
  const [showGrid, setShowGrid] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewer region detection
  const regionDetection = useRegionDetection(doc);

  const dragCallbacksRef = useRef({
    onDragMove: (id: string, x: number, y: number) => {
      svgDoc.updateTextPositionLive(id, x, y);
    },
    onDragEnd: (id: string, x: number, y: number) => {
      svgDoc.updateTextPosition(id, x, y);
    },
  });
  dragCallbacksRef.current.onDragMove = (id: string, x: number, y: number) => {
    svgDoc.updateTextPositionLive(id, x, y);
  };
  dragCallbacksRef.current.onDragEnd = (id: string, x: number, y: number) => {
    svgDoc.updateTextPosition(id, x, y);
    setHasUnsavedEdits(true);
  };

  const stableDragCallbacks = useRef({
    onDragMove: (id: string, x: number, y: number) => {
      dragCallbacksRef.current.onDragMove(id, x, y);
    },
    onDragEnd: (id: string, x: number, y: number) => {
      dragCallbacksRef.current.onDragEnd(id, x, y);
    },
  }).current;

  const drag = useDrag(zoomPan.state.scale, svgRef, stableDragCallbacks);

  const handleSave = useCallback(() => {
    if (!doc) return;
    const svgString = svgDoc.saveToString();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setHasUnsavedEdits(false);
  }, [doc, svgDoc]);

  // Stable refs for keyboard shortcuts
  const undoRef = useRef(svgDoc.undo);
  const redoRef = useRef(svgDoc.redo);
  const saveRef = useRef(handleSave);
  const clearSelRef = useRef(clearSelection);
  undoRef.current = svgDoc.undo;
  redoRef.current = svgDoc.redo;
  saveRef.current = handleSave;
  clearSelRef.current = clearSelection;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dialogOpen = document.querySelector('.dialog-overlay');
      if (dialogOpen) return;
      zoomPan.onKeyDown(e);
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redoRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redoRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveRef.current();
      }
      if (e.key === 'Escape') {
        clearSelRef.current();
      }
    };
    const upHandler = (e: KeyboardEvent) => { zoomPan.onKeyUp(e); };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', upHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [zoomPan]);

  const handleLoadFile = useCallback((filename: string, content: string) => {
    svgDoc.loadFromString(filename, content);
    clearSelection();
    setHasUnsavedEdits(false);
    setOriginalSvgContent(content);
  }, [svgDoc, clearSelection]);

  const handleOpen = useCallback(() => { fileInputRef.current?.click(); }, []);

  const handleRestore = useCallback(() => {
    if (!doc || !originalSvgContent) return;
    svgDoc.loadFromString(doc.filename, originalSvgContent);
    clearSelection();
    setHasUnsavedEdits(false);
  }, [doc, originalSvgContent, svgDoc, clearSelection]);

  // Edit: open custom file → validation dialog
  const handleOpenCustomFile = useCallback((filename: string, content: string) => {
    setValidationDialog({ filename, content });
  }, []);

  const handleValidationAccept = useCallback(() => {
    if (!validationDialog) return;
    handleLoadFile(validationDialog.filename, validationDialog.content);
    setValidationDialog(null);
  }, [validationDialog, handleLoadFile]);

  // Edit: select from library
  const handleSelectFromLibrary = useCallback(() => {
    setSummarySelectMode(true);
    setSummaryOpen(true);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { handleLoadFile(file.name, reader.result as string); };
    reader.readAsText(file);
    e.target.value = '';
  }, [handleLoadFile]);

  const handleAddText = useCallback((group: 'names' | 'values' | 'sums') => {
    if (!doc) return;
    const defaultIds: Record<string, string> = { names: 'NameX', values: 'Count_X', sums: 'CountSUM_X' };
    const id = prompt('Element ID:', defaultIds[group]);
    if (!id) return;
    const allTexts = [doc.texts.header, ...doc.texts.names, ...doc.texts.values, ...doc.texts.sums].filter(Boolean);
    if (allTexts.some(t => t?.id === id)) { alert(`ID "${id}" already exists!`); return; }
    const content = prompt('Text content:', id.replace('Count_', '').replace('CountSUM_', '')) || id;
    const fontSize = group === 'names' ? '24' : group === 'sums' ? '18' : '12';
    const vb = doc.viewBox;
    svgDoc.addText(group, {
      id, x: Math.round(vb.x + vb.w / 2), y: Math.round(vb.y + vb.h / 2), content,
      style: `fill:#262262;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';font-size:${fontSize}`,
    });
    selectById(id);
  }, [doc, svgDoc, selectById]);

  const handleRemoveText = useCallback((id: string) => {
    if (!confirm(`Remove "${id}"?`)) return;
    clearSelection();
    svgDoc.removeText(id);
  }, [svgDoc, clearSelection]);

  const [editDialog, setEditDialog] = useState<{ id: string; content: string } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const handleDoubleClickText = useCallback((id: string) => {
    if (!doc) return;
    const allTexts = [doc.texts.header, ...doc.texts.names, ...doc.texts.values, ...doc.texts.sums].filter(Boolean);
    const t = allTexts.find(t => t?.id === id);
    if (!t) return;
    setEditDialog({ id: t.id, content: t.content });
  }, [doc]);

  const handleEditDialogConfirm = useCallback((id: string, newContent: string) => {
    svgDoc.updateTextContent(id, newContent);
    setEditDialog(null);
    setHasUnsavedEdits(true);
  }, [svgDoc]);

  const handleEditDialogCancel = useCallback(() => { setEditDialog(null); }, []);

  // Viewer: load model
  const handleLoadModel = useCallback(async (filename: string) => {
    setIsLoadingModel(true);
    try {
      const [svgString, regData] = await Promise.all([
        fetchModel(filename),
        fetchRegionData(filename).catch(() => null),
      ]);
      svgDoc.loadFromString(filename, svgString);
      setCurrentModel(filename);
      setRegionData(regData);
      if (filename.includes('venn-8-set')) {
        zoomPan.setZoom(0.6);
      } else {
        zoomPan.resetZoom();
      }
      regionDetection.clearSelection();
    } finally {
      setIsLoadingModel(false);
    }
  }, [svgDoc, zoomPan, regionDetection]);

  // Viewer: switch to edit
  const handleEditThis = useCallback(() => { setMode('edit'); }, []);

  // Test mode handlers
  const handleTestLoadCsv = useCallback(async (source: 'file' | 'sample') => {
    if (source === 'sample') {
      try {
        const resp = await fetch('./data/dataset_streaming_platforms.csv');
        const text = await resp.text();
        const csv = parseCsv(text);
        setTestCsvData(csv);
        setTestCsvFilename('dataset_streaming_platforms.csv');
        setTestError(null);
        setTestCalculated(false);
        // Auto-detect binary columns and set initial mapping
        const binCols = getBinaryColumns(csv);
        const n = Math.min(binCols.length, 8);
        setTestColumnMapping(binCols.slice(0, n));
      } catch (e) {
        setTestError(`Failed to load sample: ${e}`);
      }
    }
  }, []);

  const handleTestFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const csv = parseCsv(reader.result as string);
        setTestCsvData(csv);
        setTestCsvFilename(file.name);
        setTestError(null);
        setTestCalculated(false);
        const binCols = getBinaryColumns(csv);
        if (binCols.length < 2) {
          setTestError('CSV must have at least 2 binary columns (0/1 values)');
          setTestColumnMapping([]);
          return;
        }
        const n = Math.min(binCols.length, 8);
        setTestColumnMapping(binCols.slice(0, n));
      } catch (e) {
        setTestError(`Failed to parse CSV: ${e}`);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleTestCalculate = useCallback(async () => {
    if (!testCsvData || !testModel || testColumnMapping.length < 2) return;
    setTestError(null);
    try {
      // Load SVG model
      const [svgString, regData] = await Promise.all([
        fetchModel(testModel),
        fetchRegionData(testModel).catch(() => null),
      ]);
      svgDoc.loadFromString(testModel, svgString);
      setRegionData(regData);
      setCurrentModel(testModel);
      // Large diagrams (8-set SUMO: 1400x1400) → 60% zoom
      if (testModel.includes('venn-8-set')) {
        zoomPan.setZoom(0.6);
      } else {
        zoomPan.resetZoom();
      }

      // Calculate Venn counts
      const result = calculateVennCounts(testCsvData, testColumnMapping);
      setTestVennCounts(result.exclusive);
      setTestExclusiveItems(result.exclusiveItems);
      setTestInclusiveItems(result.inclusiveItems);

      const letters = 'ABCDEFGH'.slice(0, testColumnMapping.length).split('');

      // Count_X texts = exclusive counts (only in exactly these sets)
      for (const [label, count] of result.exclusive) {
        svgDoc.updateTextContent(`Count_${label}`, String(count));
        // Ensure text-anchor:middle for proper centering
        svgDoc.updateTextStyle(`Count_${label}`, 'text-anchor', 'middle');
      }

      // Name labels = column names (keep original text-anchor)
      for (let i = 0; i < testColumnMapping.length; i++) {
        const colName = testCsvData.headers[testColumnMapping[i]];
        svgDoc.updateTextContent(`Name${letters[i]}`, colName);
      }

      // CountSUM_X = inclusive total (all rows containing set X, ensure centered)
      for (let i = 0; i < testColumnMapping.length; i++) {
        const total = result.inclusive.get(letters[i]) ?? 0;
        svgDoc.updateTextContent(`CountSUM_${letters[i]}`, String(total));
        svgDoc.updateTextStyle(`CountSUM_${letters[i]}`, 'text-anchor', 'middle');
      }

      setTestCalculated(true);
      regionDetection.clearSelection();
    } catch (e) {
      setTestError(`Calculation failed: ${e}`);
    }
  }, [testCsvData, testModel, testColumnMapping, svgDoc, zoomPan, regionDetection]);

  // Viewer: region list hover/click
  const handleSidebarHoverRegion = useCallback((_region: Region | null) => {
    // Sidebar hover could drive canvas highlight in the future
  }, []);

  const handleSidebarSelectRegion = useCallback((region: Region) => {
    regionDetection.onClick(0, 0); // Clear, then set via label
    // Find the count text position and simulate a click there
    if (!doc) return;
    const countText = doc.texts.values.find(t => t.id === `Count_${region.label}`);
    if (countText) {
      regionDetection.onClick(countText.x, countText.y);
    }
  }, [doc, regionDetection]);

  // Determine active region label for sidebar highlighting
  const activeRegion = regionDetection.selectedRegion ?? regionDetection.hoveredRegion;

  return (
    <div className="app">
      <input ref={fileInputRef} type="file" accept=".svg" style={{ display: 'none' }} onChange={handleFileChange} />

      <Toolbar
        mode={mode}
        onSetMode={(newMode) => {
          if (mode === 'edit' && hasUnsavedEdits && newMode !== 'edit') {
            setModeSwitchTarget(newMode);
            return;
          }
          setMode(newMode);
        }}
        onSummary={() => { setSummarySelectMode(false); setSummaryOpen(true); }}
        onHelp={() => setHelpOpen(true)}
        filename={doc?.filename ?? null}
        zoom={zoomPan.state.scale}
        showGrid={showGrid}
        onZoomIn={zoomPan.zoomIn}
        onZoomOut={zoomPan.zoomOut}
        onZoomReset={zoomPan.resetZoom}
        showValidation={showValidation}
        onToggleGrid={() => setShowGrid(g => !g)}
        onToggleValidation={() => setShowValidation(v => !v)}
        onUndo={svgDoc.undo}
        onRedo={svgDoc.redo}
        onReport={() => setReportOpen(true)}
      />

      <div className="main-layout">
        {mode === 'view' ? (
          <ViewerSidebar
            doc={doc}
            currentModel={currentModel}
            onLoadModel={handleLoadModel}
            hoveredRegion={regionDetection.hoveredRegion}
            selectedRegion={regionDetection.selectedRegion}
            onHoverRegion={handleSidebarHoverRegion}
            onSelectRegion={handleSidebarSelectRegion}
            onEditThis={handleEditThis}
            isLoading={isLoadingModel}
            viewStyle={viewStyle}
            onSetViewStyle={setViewStyle}
          />
        ) : mode === 'test' ? (
          <TestSidebar
            csvData={testCsvData}
            csvFilename={testCsvFilename}
            onLoadCsv={handleTestLoadCsv}
            onFileUpload={handleTestFileUpload}
            selectedModel={testModel}
            onSelectModel={(filename, setCount) => {
              setTestModel(filename);
              setTestCalculated(false);
              // Resize column mapping to match model's set count
              if (testCsvData) {
                const binCols = getBinaryColumns(testCsvData);
                const needed = Math.min(setCount, binCols.length);
                setTestColumnMapping(binCols.slice(0, needed));
              }
            }}
            columnMapping={testColumnMapping}
            onSetColumnMapping={setTestColumnMapping}
            onCalculate={handleTestCalculate}
            isCalculated={testCalculated}
            viewStyle={viewStyle}
            onSetViewStyle={setViewStyle}
            error={testError}
            showTitle={testShowTitle}
            showNames={testShowNames}
            showSums={testShowSums}
            onToggleTitle={() => { setTestShowTitle(v => !v); if (doc) svgDoc.toggleMeta('headerHidden'); }}
            onToggleNames={() => { setTestShowNames(v => !v); if (doc) svgDoc.toggleGroupVisibility('names'); }}
            onToggleSums={() => { setTestShowSums(v => !v); if (doc) svgDoc.toggleGroupVisibility('sums'); }}
            nameFontSize={testNameFontSize}
            onNameFontSizeChange={(size) => {
              setTestNameFontSize(size);
              if (!doc) return;
              const letters = 'ABCDEFGH';
              for (let i = 0; i < doc.shapes.length && i < 8; i++) {
                svgDoc.updateTextStyle(`Name${letters[i]}`, 'font-size', String(size));
              }
            }}
          />
        ) : (
          <Sidebar
            doc={doc}
            selected={selected}
            onLoadFile={handleLoadFile}
            onSave={handleSave}
            onRestore={handleRestore}
            onSelectFromLibrary={handleSelectFromLibrary}
            onOpenCustomFile={handleOpenCustomFile}
            onSelect={selectById}
            onToggleMeta={svgDoc.toggleMeta}
            onMoveElement={svgDoc.moveElementInGroup}
            onAddText={handleAddText}
            onAddTextDirect={svgDoc.addText}
            onRemoveText={handleRemoveText}
            onToggleElementVisibility={svgDoc.toggleElementVisibility}
            onToggleGroupVisibility={svgDoc.toggleGroupVisibility}
          />
        )}

        <div className="canvas-area">
          {doc ? (
            (mode === 'view' || mode === 'test') && viewStyle === 'cut' && regionData ? (
              <div className="canvas-container" ref={zoomPan.setContainerRef} onWheel={zoomPan.onWheel}>
                <CutViewCanvas
                  regionData={regionData}
                  scale={zoomPan.state.scale}
                  onRegionHover={regionDetection.setHoverByLabel}
                  onRegionClick={regionDetection.setSelectByLabel}
                  countOverrides={mode === 'test' && doc ? (() => {
                    const m = new Map<string, string>();
                    for (const t of doc.texts.values) {
                      const label = t.id.replace('Count_', '');
                      if (label !== t.id) m.set(label, t.content);
                    }
                    return m;
                  })() : null}
                />
              </div>
            ) :
              <Canvas
                doc={doc}
                zoomPan={zoomPan.state}
                selected={selected}
                showGrid={mode === 'edit' && showGrid}
                showValidation={mode === 'edit' && showValidation}
                containerRef={zoomPan.setContainerRef}
                onSelect={selectById}
                onClearSelection={clearSelection}
                onZoomWheel={zoomPan.onWheel}
                onPanPointerDown={zoomPan.onPointerDown}
                onPanPointerMove={zoomPan.onPointerMove}
                onPanPointerUp={zoomPan.onPointerUp}
                onDragTextStart={drag.onPointerDown}
                onDragPointerMove={drag.onPointerMove}
                onDragPointerUp={drag.onPointerUp}
                onDoubleClickText={handleDoubleClickText}
                readOnly={mode === 'view' || mode === 'test'}
                viewStyle={(mode === 'view' || mode === 'test') ? viewStyle : 'layer'}
                hoveredRegion={activeRegion}
                onRegionHover={regionDetection.onHover}
                onRegionClick={regionDetection.lockHover}
                onRegionLeave={regionDetection.clearHover}
                onReadOnlyTextClick={(letter) => regionDetection.setSelectByLabel(letter, true)}
              />
          ) : (
            <div className="canvas-empty">
              <div className="canvas-empty-text">
                {mode === 'test' ? 'Load data and select a model to calculate' : mode === 'view' ? 'Select a Venn diagram model' : 'Open an SVG file to start editing'}
              </div>
              {mode === 'edit' && (
                <button className="btn btn-large" onClick={handleOpen}>Open SVG File</button>
              )}
            </div>
          )}
          {doc && mode === 'edit' && (
            <ViewBoxEditor viewBox={doc.viewBox} onUpdate={svgDoc.updateViewBox} />
          )}
        </div>

        {mode === 'view' || mode === 'test' ? (
          <ViewerInfoPanel
            doc={doc}
            hoveredRegion={regionDetection.hoveredRegion}
            selectedRegion={regionDetection.selectedRegion}
            regionExclusiveItems={mode === 'test' ? testExclusiveItems : null}
            regionInclusiveItems={mode === 'test' ? testInclusiveItems : null}
            canSave={mode === 'test' && testCalculated && viewStyle === 'layer'}
            onSave={handleSave}
            onClearSelection={regionDetection.clearSelection}
          />
        ) : (
          <PropertyPanel
            selected={selected}
            shapes={doc?.shapes ?? []}
            onUpdateTextPosition={svgDoc.updateTextPosition}
            onUpdateTextContent={svgDoc.updateTextContent}
            onUpdateTextStyle={svgDoc.updateTextStyle}
            onUpdateBulletPosition={svgDoc.updateBulletPosition}
            onUpdateShapeStyle={svgDoc.updateShapeStyle}
          />
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="bottom-toolbar">
        <span className="bottom-toolbar-filename">{doc?.filename ?? ''}</span>
        <span className="bottom-toolbar-cursor" id="cursor-position"></span>
      </div>

      <ReportDialog
        isOpen={reportOpen}
        doc={doc}
        onClose={() => setReportOpen(false)}
        onSelect={(id) => { selectById(id); setReportOpen(false); }}
      />

      <SummaryDialog
        isOpen={summaryOpen}
        selectMode={summarySelectMode}
        onClose={() => { setSummaryOpen(false); setSummarySelectMode(false); }}
        onSelectModel={async (filename) => {
          if (summarySelectMode) {
            // Edit mode: load into editor
            const svgString = await fetchModel(filename);
            handleLoadFile(filename, svgString);
          } else {
            handleLoadModel(filename);
            setMode('view');
          }
          setSummaryOpen(false);
          setSummarySelectMode(false);
        }}
      />

      <TextEditDialog
        isOpen={editDialog !== null}
        elementId={editDialog?.id ?? ''}
        currentContent={editDialog?.content ?? ''}
        onConfirm={handleEditDialogConfirm}
        onCancel={handleEditDialogCancel}
      />

      <WelcomeDialog
        isOpen={welcomeOpen}
        onSelectMode={(m) => { setMode(m); setWelcomeOpen(false); }}
        onSummary={() => { setSummarySelectMode(false); setSummaryOpen(true); setWelcomeOpen(false); }}
      />

      <HelpDialog
        isOpen={helpOpen}
        mode={mode}
        onClose={() => setHelpOpen(false)}
      />

      {/* Unsaved changes confirm */}
      {modeSwitchTarget !== null && (
        <div className="dialog-overlay" onClick={() => setModeSwitchTarget(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-title">Unsaved Changes</h3>
            <p className="confirm-text">You have unsaved changes. Save before switching?</p>
            <div className="confirm-actions">
              <button className="btn btn-accent" onClick={() => { handleSave(); setHasUnsavedEdits(false); setMode(modeSwitchTarget); setModeSwitchTarget(null); }}>Save & Switch</button>
              <button className="btn" onClick={() => { setHasUnsavedEdits(false); setMode(modeSwitchTarget); setModeSwitchTarget(null); }}>Discard</button>
              <button className="btn" onClick={() => setModeSwitchTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <SvgValidationDialog
        isOpen={validationDialog !== null}
        svgContent={validationDialog?.content ?? ''}
        filename={validationDialog?.filename ?? ''}
        onAccept={handleValidationAccept}
        onCancel={() => setValidationDialog(null)}
      />
    </div>
  );
}
