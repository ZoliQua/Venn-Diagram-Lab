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
import type { Region } from './utils/regions.ts';

export type ViewStyle = 'layer' | 'cut';

export default function App() {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [viewStyle, setViewStyle] = useState<ViewStyle>('layer');
  const [regionData, setRegionData] = useState<RegionData | null>(null);

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
  }, [svgDoc, clearSelection]);

  const handleOpen = useCallback(() => { fileInputRef.current?.click(); }, []);

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
      zoomPan.resetZoom();
      regionDetection.clearSelection();
    } finally {
      setIsLoadingModel(false);
    }
  }, [svgDoc, zoomPan, regionDetection]);

  // Viewer: switch to edit
  const handleEditThis = useCallback(() => { setMode('edit'); }, []);

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
        onSetMode={setMode}
        filename={doc?.filename ?? null}
        zoom={zoomPan.state.scale}
        showGrid={showGrid}
        onOpen={handleOpen}
        onSave={handleSave}
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
        ) : (
          <Sidebar
            doc={doc}
            selected={selected}
            onLoadFile={handleLoadFile}
            onSave={handleSave}
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
            mode === 'view' && viewStyle === 'cut' && regionData ? (
              <div className="canvas-container" ref={zoomPan.setContainerRef} onWheel={zoomPan.onWheel}>
                <CutViewCanvas
                  regionData={regionData}
                  scale={zoomPan.state.scale}
                  onRegionHover={(label) => {
                    if (!label) { regionDetection.clearHover(); return; }
                    // Find count text position for the label to drive info panel
                    const ct = doc.texts.values.find(t => t.id === `Count_${label}`);
                    if (ct) regionDetection.onHover(ct.x, ct.y);
                  }}
                  onRegionClick={(label) => {
                    const ct = doc.texts.values.find(t => t.id === `Count_${label}`);
                    if (ct) regionDetection.onClick(ct.x, ct.y);
                  }}
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
                readOnly={mode === 'view'}
                viewStyle={mode === 'view' ? viewStyle : 'layer'}
                hoveredRegion={activeRegion}
                onRegionHover={regionDetection.onHover}
                onRegionClick={regionDetection.onClick}
                onRegionLeave={regionDetection.clearHover}
              />
          ) : (
            <div className="canvas-empty">
              <div className="canvas-empty-text">
                {mode === 'view' ? 'Select a Venn diagram model' : 'Open an SVG file to start editing'}
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

        {mode === 'view' ? (
          <ViewerInfoPanel
            doc={doc}
            hoveredRegion={regionDetection.hoveredRegion}
            selectedRegion={regionDetection.selectedRegion}
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

      <ReportDialog
        isOpen={reportOpen}
        doc={doc}
        onClose={() => setReportOpen(false)}
        onSelect={(id) => { selectById(id); setReportOpen(false); }}
      />

      <TextEditDialog
        isOpen={editDialog !== null}
        elementId={editDialog?.id ?? ''}
        currentContent={editDialog?.content ?? ''}
        onConfirm={handleEditDialogConfirm}
        onCancel={handleEditDialogCancel}
      />
    </div>
  );
}
