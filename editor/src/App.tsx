import { useRef, useEffect, useCallback, useState } from 'react';
import { useSvgDocument } from './hooks/useSvgDocument.ts';
import { useSelection } from './hooks/useSelection.ts';
import { useZoomPan } from './hooks/useZoomPan.ts';
import { useDrag } from './hooks/useDrag.ts';
import { Toolbar } from './components/Toolbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Canvas } from './components/Canvas.tsx';
import { PropertyPanel } from './components/PropertyPanel.tsx';
import { ViewBoxEditor } from './components/ViewBoxEditor.tsx';
import { TextEditDialog } from './components/TextEditDialog.tsx';
import { ReportDialog } from './components/ReportDialog.tsx';

export default function App() {
  const svgDoc = useSvgDocument();
  const { doc } = svgDoc;
  const { selected, selectById, clearSelection } = useSelection(doc);
  const zoomPan = useZoomPan();
  const [showGrid, setShowGrid] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  // Stable refs for keyboard shortcuts to avoid stale closures
  const undoRef = useRef(svgDoc.undo);
  const redoRef = useRef(svgDoc.redo);
  const saveRef = useRef(handleSave);
  const clearSelRef = useRef(clearSelection);
  undoRef.current = svgDoc.undo;
  redoRef.current = svgDoc.redo;
  saveRef.current = handleSave;
  clearSelRef.current = clearSelection;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture shortcuts when dialog is open
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
    const upHandler = (e: KeyboardEvent) => {
      zoomPan.onKeyUp(e);
    };
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

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleLoadFile(file.name, reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [handleLoadFile]);

  const handleAddText = useCallback((group: 'names' | 'values' | 'sums') => {
    if (!doc) return;
    const defaultIds: Record<string, string> = {
      names: 'NameX',
      values: 'Count_X',
      sums: 'CountSUM_X',
    };
    const id = prompt('Element ID:', defaultIds[group]);
    if (!id) return;
    // Check for duplicate ID
    const allTexts = [
      doc.texts.header,
      ...doc.texts.names,
      ...doc.texts.values,
      ...doc.texts.sums,
    ].filter(Boolean);
    if (allTexts.some(t => t?.id === id)) {
      alert(`ID "${id}" already exists!`);
      return;
    }
    const content = prompt('Text content:', id.replace('Count_', '').replace('CountSUM_', '')) || id;
    const fontSize = group === 'names' ? '24' : group === 'sums' ? '18' : '12';
    const vb = doc.viewBox;
    svgDoc.addText(group, {
      id,
      x: Math.round(vb.x + vb.w / 2),
      y: Math.round(vb.y + vb.h / 2),
      content,
      style: `fill:#262262;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';font-size:${fontSize}`,
    });
    selectById(id);
  }, [doc, svgDoc, selectById]);

  const handleRemoveText = useCallback((id: string) => {
    if (!confirm(`Remove "${id}"?`)) return;
    clearSelection();
    svgDoc.removeText(id);
  }, [svgDoc, clearSelection]);

  // Text edit dialog state
  const [editDialog, setEditDialog] = useState<{ id: string; content: string } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const handleDoubleClickText = useCallback((id: string) => {
    if (!doc) return;
    const allTexts = [
      doc.texts.header,
      ...doc.texts.names,
      ...doc.texts.values,
      ...doc.texts.sums,
    ].filter(Boolean);
    const t = allTexts.find(t => t?.id === id);
    if (!t) return;
    setEditDialog({ id: t.id, content: t.content });
  }, [doc]);

  const handleEditDialogConfirm = useCallback((id: string, newContent: string) => {
    svgDoc.updateTextContent(id, newContent);
    setEditDialog(null);
  }, [svgDoc]);

  const handleEditDialogCancel = useCallback(() => {
    setEditDialog(null);
  }, []);

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Toolbar
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

        <div className="canvas-area">
          {doc ? (
            <Canvas
              doc={doc}
              zoomPan={zoomPan.state}
              selected={selected}
              showGrid={showGrid}
              showValidation={showValidation}
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
            />
          ) : (
            <div className="canvas-empty">
              <div className="canvas-empty-text">
                Open an SVG file to start editing
              </div>
              <button className="btn btn-large" onClick={handleOpen}>
                Open SVG File
              </button>
            </div>
          )}
          {doc && (
            <ViewBoxEditor
              viewBox={doc.viewBox}
              onUpdate={svgDoc.updateViewBox}
            />
          )}
        </div>

        <PropertyPanel
          selected={selected}
          shapes={doc?.shapes ?? []}
          onUpdateTextPosition={svgDoc.updateTextPosition}
          onUpdateTextContent={svgDoc.updateTextContent}
          onUpdateTextStyle={svgDoc.updateTextStyle}
          onUpdateBulletPosition={svgDoc.updateBulletPosition}
          onUpdateShapeStyle={svgDoc.updateShapeStyle}
        />
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
