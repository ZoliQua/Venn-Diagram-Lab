import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
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
import { fetchModel, fetchRegionData, getModelsBySetCount } from './models.ts';
import type { RegionData } from './models.ts';
import { CutViewCanvas } from './components/CutViewCanvas.tsx';
import { SummaryDialog, SvgPreview, SOURCES } from './components/SummaryDialog.tsx';
import { WelcomeDialog } from './components/WelcomeDialog.tsx';
import { HelpDialog } from './components/HelpDialog.tsx';
import { SvgValidationDialog } from './components/SvgValidationDialog.tsx';
import { TestSidebar } from './components/TestSidebar.tsx';
import { CsvImportDialog } from './components/CsvImportDialog.tsx';
import { DataSummaryPanel } from './components/DataSummaryPanel.tsx';
import type { Region } from './utils/regions.ts';
import { calculateVennCounts, calculateVennCountsFromAggregated } from './utils/csvParser.ts';
import type { CsvData, FileType, Delimiter, CsvImportResult, VennResult } from './utils/csvParser.ts';
import { exportRegionSummaryTsv, exportMatrixTsv, downloadFile } from './utils/exportData.ts';

export type ViewStyle = 'layer' | 'cut';
export type AppMode = 'view' | 'edit' | 'data';

export default function App() {
  const [mode, setMode] = useState<AppMode>('view');
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [viewStyle, setViewStyle] = useState<ViewStyle>('layer');
  const [cutColorMode, setCutColorMode] = useState<'depth' | 'heatmap'>('depth');
  const [heatmapColors, setHeatmapColors] = useState({ low: '#2166AC', mid: '#F7F7F7', high: '#B2182B' });
  const [heatmapLegendPosition, setHeatmapLegendPosition] = useState('bottom-left');
  const [hoverColor, setHoverColor] = useState('#00ff88');
  const [dataRightPanel, setDataRightPanel] = useState<'properties' | 'statistics'>('properties');
  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summarySelectMode, setSummarySelectMode] = useState(false);
  const [summaryFromWelcome, setSummaryFromWelcome] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [modeSwitchTarget, setModeSwitchTarget] = useState<AppMode | null>(null);
  const [dataOpenDialog, setDataOpenDialog] = useState(false);
  const [csvImportDialog, setCsvImportDialog] = useState<{ rawText: string; filename: string } | null>(null);
  const [validationDialog, setValidationDialog] = useState<{ filename: string; content: string } | null>(null);
  const [originalSvgContent, setOriginalSvgContent] = useState<string | null>(null);

  // Data mode state
  const [testCsvData, setTestCsvData] = useState<CsvData | null>(null);
  const [testCsvFilename, setTestCsvFilename] = useState<string | null>(null);
  const [testModel, setTestModel] = useState<string | null>(null);
  const [testColumnMapping, setTestColumnMapping] = useState<number[]>([]);
  const [testOriginalColumns, setTestOriginalColumns] = useState<number[]>([]);
  const [testFileType, setTestFileType] = useState<FileType>('binary');
  const [testItemDelimiter, setTestItemDelimiter] = useState<Delimiter>(',');
  const [testCalculated, setTestCalculated] = useState(false);
  const [testVennResult, setTestVennResult] = useState<VennResult | null>(null);
  const [testExclusiveItems, setTestExclusiveItems] = useState<Map<string, string[]> | null>(null);
  const [testInclusiveItems, setTestInclusiveItems] = useState<Map<string, string[]> | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testShowTitle, setTestShowTitle] = useState(true);
  const [testShowNames, setTestShowNames] = useState(true);
  const [testShowSums, setTestShowSums] = useState(true);
  const [testNameFontSize, setTestNameFontSize] = useState(24);
  const [testNameFontFamily, setTestNameFontFamily] = useState('Tahoma');
  const [testTitleFontSize, setTestTitleFontSize] = useState(24);
  const [testTitleFontFamily, setTestTitleFontFamily] = useState('Tahoma');
  const [testShapeOpacity, setTestShapeOpacity] = useState(0.2);
  const [testShapeColors, setTestShapeColors] = useState<Record<string, string>>({
    A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
    E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1',
  });

  const svgDoc = useSvgDocument();
  const { doc } = svgDoc;
  const { selected, selectById, clearSelection } = useSelection(doc);
  const zoomPan = useZoomPan();
  const [showGrid, setShowGrid] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [moveShapes, setMoveShapes] = useState(false);
  const [rotateShapes, setRotateShapes] = useState(false);
  const [resizeShapes, setResizeShapes] = useState(false);
  const [textTool, setTextTool] = useState<'move' | 'rotate' | 'resize' | null>('move');
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

  // Text rotate/resize state
  const textToolRef = useRef<{ id: string; mode: 'rotate' | 'resize'; centerX: number; centerY: number; startAngle: number; startY: number; origFontSize: number } | null>(null);
  const [textToolAngle, setTextToolAngle] = useState<number | null>(null);
  const [textToolCursor, setTextToolCursor] = useState<{ x: number; y: number } | null>(null);
  const [textToolSize, setTextToolSize] = useState<number | null>(null);

  const handleTextToolStart = useCallback((e: React.PointerEvent, id: string, _origX: number, _origY: number) => {
    if (!textTool || textTool === 'move') return;
    const svg = document.querySelector('.canvas-svg') as SVGSVGElement | null;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    // Get visual center via bounding box (like shape rotate)
    const domEl = document.getElementById(id);
    if (!domEl) return;
    const bbox = domEl.getBoundingClientRect();
    const centerScreen = new DOMPoint(bbox.left + bbox.width / 2, bbox.top + bbox.height / 2);
    const center = centerScreen.matrixTransform(ctm.inverse());
    // Get font size from text style
    const allTexts = doc ? [doc.texts.header, ...doc.texts.names, ...doc.texts.values, ...doc.texts.sums].filter(Boolean) : [];
    const textEl = allTexts.find(t => t?.id === id);
    const styleMap = textEl?.style ? Object.fromEntries(textEl.style.split(';').map(p => { const c = p.indexOf(':'); return c > 0 ? [p.slice(0, c).trim(), p.slice(c + 1).trim()] : ['', '']; }).filter(([k]) => k)) : {};
    const fontSize = parseInt(styleMap['font-size']?.replace(/px$/, '') ?? '12', 10) || 12;

    if (textTool === 'rotate') {
      textToolRef.current = { id, mode: 'rotate', centerX: center.x, centerY: center.y, startAngle: e.clientX, startY: 0, origFontSize: fontSize };
      setTextToolAngle(0);
    } else {
      textToolRef.current = { id, mode: 'resize', centerX: center.x, centerY: center.y, startAngle: 0, startY: e.clientY, origFontSize: fontSize };
      setTextToolSize(fontSize);
    }
    setTextToolCursor({ x: e.clientX, y: e.clientY });
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [textTool, doc]);

  const handleTextToolMove = useCallback((e: React.PointerEvent) => {
    if (!textToolRef.current) return;
    const { id, mode, centerX, centerY, startAngle, startY, origFontSize } = textToolRef.current;
    setTextToolCursor({ x: e.clientX, y: e.clientY });

    if (mode === 'rotate') {
      // startAngle stores the initial clientX; 1px horizontal = 1 degree
      const delta = Math.round((e.clientX - startAngle) * 10) / 10;
      setTextToolAngle(delta);
      const el = document.getElementById(id);
      if (el) {
        el.setAttribute('transform', `rotate(${delta},${Math.round(centerX * 10) / 10},${Math.round(centerY * 10) / 10})`);
      }
    } else {
      // Resize: each 10px vertical drag = 1pt
      const dy = startY - e.clientY; // up = bigger
      const newSize = Math.max(4, Math.min(120, origFontSize + Math.round(dy / 10)));
      setTextToolSize(newSize);
      const el = document.getElementById(id);
      if (el) {
        // Update the style attribute directly (not inline CSS) so it takes effect
        const curStyle = el.getAttribute('style') || '';
        const updatedStyle = curStyle.replace(/font-size:\s*[^;]+/, `font-size:${newSize}`);
        el.setAttribute('style', updatedStyle);
      }
    }
  }, []);

  const handleTextToolEnd = useCallback(() => {
    if (!textToolRef.current) return;
    const { id, mode, centerX, centerY } = textToolRef.current;
    if (mode === 'rotate') {
      const angle = textToolAngle ?? 0;
      if (Math.abs(angle) > 0.5) {
        const cx = Math.round(centerX * 10) / 10;
        const cy = Math.round(centerY * 10) / 10;
        svgDoc.updateTextStyle(id, 'transform', `rotate(${angle},${cx},${cy})`);
      }
      // Remove DOM transform
      const el = document.getElementById(id);
      if (el) el.removeAttribute('transform');
    } else {
      const newSize = textToolSize ?? 12;
      svgDoc.updateTextStyle(id, 'font-size', String(newSize));
    }
    textToolRef.current = null;
    setTextToolAngle(null);
    setTextToolSize(null);
    setTextToolCursor(null);
  }, [textToolAngle, textToolSize, svgDoc]);

  // Shape drag state (Move Shapes mode) — tracked globally via container events
  const shapeDragRef = useRef<{ id: string; startX: number; startY: number; origTransform: string } | null>(null);

  const handleShapeDragStart = useCallback((e: React.PointerEvent, id: string) => {
    if (!moveShapes) return;
    const svg = document.querySelector('.canvas-svg') as SVGSVGElement | null;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const shape = doc?.shapes.find(s => s.id === id);
    shapeDragRef.current = {
      id,
      startX: pt.x,
      startY: pt.y,
      origTransform: shape?.attributes['transform'] ?? '',
    };
    e.stopPropagation();
    e.preventDefault();
  }, [moveShapes, doc]);

  // Shape rotate state
  const shapeRotateRef = useRef<{ id: string; centerX: number; centerY: number; startAngle: number; origTransform: string } | null>(null);
  const [rotateAngle, setRotateAngle] = useState<number | null>(null);
  const [rotateCursor, setRotateCursor] = useState<{ x: number; y: number } | null>(null);

  const handleShapeRotateStart = useCallback((e: React.PointerEvent, id: string) => {
    if (!rotateShapes) return;
    const svg = document.querySelector('.canvas-svg') as SVGSVGElement | null;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    // Get shape center via bounding box
    const el = document.getElementById(id);
    if (!el) return;
    const bbox = el.getBoundingClientRect();
    const centerScreen = new DOMPoint(bbox.left + bbox.width / 2, bbox.top + bbox.height / 2);
    const center = centerScreen.matrixTransform(ctm.inverse());
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const startAngle = Math.atan2(pt.y - center.y, pt.x - center.x) * 180 / Math.PI;
    const shape = doc?.shapes.find(s => s.id === id);
    shapeRotateRef.current = {
      id,
      centerX: center.x,
      centerY: center.y,
      startAngle,
      origTransform: shape?.attributes['transform'] ?? '',
    };
    setRotateAngle(0);
    setRotateCursor({ x: e.clientX, y: e.clientY });
    e.stopPropagation();
    e.preventDefault();
  }, [rotateShapes, doc]);

  const handleShapeRotateMove = useCallback((e: React.PointerEvent) => {
    if (!shapeRotateRef.current) return;
    const svg = document.querySelector('.canvas-svg') as SVGSVGElement | null;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const { centerX, centerY, startAngle, id, origTransform } = shapeRotateRef.current;
    const currentAngle = Math.atan2(pt.y - centerY, pt.x - centerX) * 180 / Math.PI;
    let delta = currentAngle - startAngle;
    // Normalize to -180..180
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const rounded = Math.round(delta * 10) / 10;
    setRotateAngle(rounded);
    setRotateCursor({ x: e.clientX, y: e.clientY });
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute('transform', `rotate(${rounded},${Math.round(centerX * 10) / 10},${Math.round(centerY * 10) / 10}) ${origTransform}`.trim());
    }
  }, []);

  const handleShapeRotateEnd = useCallback(() => {
    if (!shapeRotateRef.current) return;
    const { id, centerX, centerY, origTransform } = shapeRotateRef.current;
    const angle = rotateAngle ?? 0;
    if (Math.abs(angle) > 0.5) {
      const newTransform = `rotate(${angle},${Math.round(centerX * 10) / 10},${Math.round(centerY * 10) / 10}) ${origTransform}`.trim();
      // Bullets are circles — rotation is committed as transform attribute on the shape
      // updateShapeAttribute works on doc.shapes; bullets don't need rotation
      const isShape = doc?.shapes.some(s => s.id === id);
      if (isShape) {
        svgDoc.updateShapeAttribute(id, 'transform', newTransform);
      }
    }
    shapeRotateRef.current = null;
    setRotateAngle(null);
    setRotateCursor(null);
  }, [rotateAngle, svgDoc]);

  // Shape resize state
  const shapeResizeRef = useRef<{ id: string; centerX: number; centerY: number; startDist: number; origTransform: string } | null>(null);
  const [resizeScale, setResizeScale] = useState<number | null>(null);
  const [resizeCursor, setResizeCursor] = useState<{ x: number; y: number } | null>(null);

  const handleShapeResizeStart = useCallback((e: React.PointerEvent, id: string) => {
    if (!resizeShapes) return;
    const svg = document.querySelector('.canvas-svg') as SVGSVGElement | null;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const el = document.getElementById(id);
    if (!el) return;
    const bbox = el.getBoundingClientRect();
    const centerScreen = new DOMPoint(bbox.left + bbox.width / 2, bbox.top + bbox.height / 2);
    const center = centerScreen.matrixTransform(ctm.inverse());
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const startDist = Math.hypot(pt.x - center.x, pt.y - center.y);
    const shape = doc?.shapes.find(s => s.id === id);
    shapeResizeRef.current = {
      id,
      centerX: center.x,
      centerY: center.y,
      startDist: Math.max(startDist, 1),
      origTransform: shape?.attributes['transform'] ?? '',
    };
    setResizeScale(100);
    setResizeCursor({ x: e.clientX, y: e.clientY });
    e.stopPropagation();
    e.preventDefault();
  }, [resizeShapes, doc]);

  const handleShapeResizeMove = useCallback((e: React.PointerEvent) => {
    if (!shapeResizeRef.current) return;
    const svg = document.querySelector('.canvas-svg') as SVGSVGElement | null;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const { centerX, centerY, startDist, id, origTransform } = shapeResizeRef.current;
    const currentDist = Math.hypot(pt.x - centerX, pt.y - centerY);
    const scale = currentDist / startDist;
    const pct = Math.round(scale * 100);
    setResizeScale(pct);
    setResizeCursor({ x: e.clientX, y: e.clientY });
    const el = document.getElementById(id);
    if (el) {
      const cx = Math.round(centerX * 10) / 10;
      const cy = Math.round(centerY * 10) / 10;
      const s = Math.round(scale * 1000) / 1000;
      el.setAttribute('transform', `translate(${cx},${cy}) scale(${s}) translate(${-cx},${-cy}) ${origTransform}`.trim());
    }
  }, []);

  const handleShapeResizeEnd = useCallback(() => {
    if (!shapeResizeRef.current) return;
    const { id, centerX, centerY, startDist, origTransform } = shapeResizeRef.current;
    const scale = (resizeScale ?? 100) / 100;
    if (Math.abs(scale - 1) > 0.01) {
      const cx = Math.round(centerX * 10) / 10;
      const cy = Math.round(centerY * 10) / 10;
      const s = Math.round(scale * 1000) / 1000;
      const newTransform = `translate(${cx},${cy}) scale(${s}) translate(${-cx},${-cy}) ${origTransform}`.trim();
      const isShape = doc?.shapes.some(sh => sh.id === id);
      if (isShape) {
        svgDoc.updateShapeAttribute(id, 'transform', newTransform);
      }
    }
    shapeResizeRef.current = null;
    setResizeScale(null);
    setResizeCursor(null);
    void startDist;
  }, [resizeScale, svgDoc, doc]);

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
    svgDoc.markSaved();
  }, [doc, svgDoc]);

  const handleExportImage = useCallback((format: 'png' | 'jpg') => {
    const svgEl = document.querySelector('.canvas-svg') as SVGSVGElement | null;
    if (!svgEl || !doc) return;
    // Clone the SVG to avoid modifying the DOM
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // Remove selection rects and hover highlights
    clone.querySelectorAll('.selection-rect, [data-hover]').forEach(el => el.remove());
    // Remove any region highlight styling (locked/hovered state)
    clone.querySelectorAll('[style*="stroke-width: 3"]').forEach(el => {
      (el as SVGElement).style.removeProperty('stroke-width');
    });
    // Serialize to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      // Use viewBox dimensions for high-quality export
      const vb = doc.viewBox;
      const scale = 2; // 2x for retina quality
      const canvas = document.createElement('canvas');
      canvas.width = vb.w * scale;
      canvas.height = vb.h * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // White background for both PNG and JPG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const ext = format === 'png' ? '.png' : '.jpg';
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.filename.replace(/\.svg$/, ext);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, mimeType, 0.95);
    };
    img.src = svgUrl;
  }, [doc]);

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
    setOriginalSvgContent(content);
  }, [svgDoc, clearSelection]);

  const handleOpen = useCallback(() => { fileInputRef.current?.click(); }, []);

  const handleRestore = useCallback(() => {
    if (!doc || !originalSvgContent) return;
    svgDoc.loadFromString(doc.filename, originalSvgContent);
    clearSelection();
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

  // Data mode handlers
  const handleTestLoadCsv = useCallback(async (source: 'file' | 'sample') => {
    if (source === 'sample') {
      try {
        const resp = await fetch('./data/dataset_streaming_platforms.csv');
        const text = await resp.text();
        setCsvImportDialog({ rawText: text, filename: 'dataset_streaming_platforms.csv' });
      } catch (e) {
        setTestError(`Failed to load sample: ${e}`);
      }
    }
  }, []);

  const handleTestFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCsvImportDialog({ rawText: reader.result as string, filename: file.name });
    };
    reader.readAsText(file);
  }, []);

  const handleCsvImportLoad = useCallback((result: CsvImportResult) => {
    const filename = csvImportDialog?.filename ?? 'data.csv';
    setCsvImportDialog(null);
    setTestCsvData(result.csv);
    setTestCsvFilename(filename);
    setTestFileType(result.fileType);
    if (result.itemDelimiter) setTestItemDelimiter(result.itemDelimiter);
    setTestError(null);
    setTestCalculated(false);
    // For aggregated: selectedColumns are the set columns; for binary: column indices
    const cols = result.selectedColumns.slice(0, 8);
    setTestColumnMapping(cols);
    setTestOriginalColumns(cols);
  }, [csvImportDialog]);

  const dataFileInputRef = useRef<HTMLInputElement>(null);

  const handleDataClose = useCallback(() => {
    setTestCsvData(null);
    setTestCsvFilename(null);
    setTestModel(null);
    setTestColumnMapping([]);
    setTestOriginalColumns([]);
    setTestCalculated(false);
    setTestVennResult(null);
    setTestExclusiveItems(null);
    setTestInclusiveItems(null);
    setTestError(null);
    svgDoc.clearDoc();
    setCurrentModel(null);
    setRegionData(null);
  }, [svgDoc]);

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
      const result = testFileType === 'aggregated'
        ? calculateVennCountsFromAggregated(testCsvData, testColumnMapping, testItemDelimiter)
        : calculateVennCounts(testCsvData, testColumnMapping);
      setTestVennResult(result);
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

      // Apply custom shape colors and opacity
      for (let i = 0; i < testColumnMapping.length; i++) {
        const letter = letters[i];
        const color = testShapeColors[letter];
        if (color) {
          svgDoc.updateShapeStyle(`Shape${letter}`, 'fill', color);
        }
        svgDoc.updateShapeStyle(`Shape${letter}`, 'opacity', String(testShapeOpacity));
      }

      setTestCalculated(true);
      setCutColorMode('heatmap');
      regionDetection.clearSelection();
    } catch (e) {
      setTestError(`Calculation failed: ${e}`);
    }
  }, [testCsvData, testModel, testColumnMapping, svgDoc, zoomPan, regionDetection, testShapeColors, testShapeOpacity, testFileType, testItemDelimiter]);

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

  const modelsBySet = useMemo(() => getModelsBySetCount(), []);

  return (
    <div className="app">
      <input ref={fileInputRef} type="file" accept=".svg" style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={dataFileInputRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleTestFileUpload(file);
        e.target.value = '';
      }} />

      <Toolbar
        mode={mode}
        onSetMode={(newMode) => {
          if (mode === 'edit' && svgDoc.isModified && newMode !== 'edit') {
            setModeSwitchTarget(newMode);
            return;
          }
          if (newMode === 'data' && !testCsvData) {
            svgDoc.clearDoc();
            setCurrentModel(null);
            setRegionData(null);
          }
          if (newMode === 'edit' && mode === 'data') {
            svgDoc.markSaved();
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
        onOpen={handleSelectFromLibrary}
        onDataOpen={() => setDataOpenDialog(true)}
        onDataSave={handleSave}
        onDataClose={handleDataClose}
        hasDataFile={!!testCsvData}
        onUndo={svgDoc.undo}
        onRedo={svgDoc.redo}
        onReport={() => setReportOpen(true)}
      />

      <div className="main-layout">
        {mode === 'view' ? (
          doc ? (
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
          ) : null
        ) : mode === 'data' ? (
          !testCsvData ? null : <TestSidebar
            csvData={testCsvData}
            csvFilename={testCsvFilename}
            fileType={testFileType}
            selectedModel={testModel}
            onSelectModel={(filename, setCount) => {
              setTestModel(filename);
              setTestCalculated(false);
              // Resize column mapping to match model's set count
              if (testCsvData) {
                if (testFileType === 'aggregated') {
                  // Aggregated: slice from original columns (so switching back to larger model works)
                  setTestColumnMapping(testOriginalColumns.slice(0, setCount));
                } else {
                  // Binary: slice from original columns
                  setTestColumnMapping(testOriginalColumns.slice(0, setCount));
                }
              }
            }}
            columnMapping={testColumnMapping}
            onSetColumnMapping={setTestColumnMapping}
            onCalculate={handleTestCalculate}
            isCalculated={testCalculated}
            viewStyle={viewStyle}
            onSetViewStyle={setViewStyle}
            cutColorMode={cutColorMode}
            onSetCutColorMode={setCutColorMode}
            heatmapColors={heatmapColors}
            onSetHeatmapColors={setHeatmapColors}
            heatmapLegendPosition={heatmapLegendPosition}
            onSetHeatmapLegendPosition={setHeatmapLegendPosition}
            error={testError}
            showTitle={testShowTitle}
            showNames={testShowNames}
            showSums={testShowSums}
            hoverColor={hoverColor}
            onHoverColorChange={setHoverColor}
            onToggleTitle={() => { setTestShowTitle(v => !v); if (doc) svgDoc.toggleMeta('headerHidden'); }}
            onToggleNames={() => { setTestShowNames(v => !v); if (doc) svgDoc.toggleGroupVisibility('names'); }}
            onToggleSums={() => { setTestShowSums(v => !v); if (doc) svgDoc.toggleGroupVisibility('sums'); }}
            shapeOpacity={testShapeOpacity}
            onShapeOpacityChange={(opacity) => {
              setTestShapeOpacity(opacity);
              if (doc) {
                const letters = 'ABCDEFGH';
                for (let i = 0; i < doc.shapes.length && i < 8; i++) {
                  svgDoc.updateShapeStyle(`Shape${letters[i]}`, 'opacity', String(opacity));
                }
              }
            }}
            shapeColors={testShapeColors}
            onShapeColorChange={(letter, color) => {
              setTestShapeColors(prev => ({ ...prev, [letter]: color }));
              if (doc) {
                // Update shape fill color
                svgDoc.updateShapeStyle(`Shape${letter}`, 'fill', color);
                // Update bullet color
                svgDoc.updateShapeStyle(`Bullet${letter}`, 'fill', color);
              }
            }}
            nameFontSize={testNameFontSize}
            onNameFontSizeChange={(size) => {
              setTestNameFontSize(size);
              if (!doc) return;
              const letters = 'ABCDEFGH';
              for (let i = 0; i < doc.shapes.length && i < 8; i++) {
                svgDoc.updateTextStyle(`Name${letters[i]}`, 'font-size', String(size));
              }
            }}
            nameFontFamily={testNameFontFamily}
            onNameFontFamilyChange={(font) => {
              setTestNameFontFamily(font);
              if (!doc) return;
              const letters = 'ABCDEFGH';
              for (let i = 0; i < doc.shapes.length && i < 8; i++) {
                svgDoc.updateTextStyle(`Name${letters[i]}`, 'font-family', `'${font}'`);
              }
            }}
            titleFontSize={testTitleFontSize}
            onTitleFontSizeChange={(size) => {
              setTestTitleFontSize(size);
              if (!doc?.texts.header) return;
              svgDoc.updateTextStyle(doc.texts.header.id, 'font-size', String(size));
            }}
            titleFontFamily={testTitleFontFamily}
            onTitleFontFamilyChange={(font) => {
              setTestTitleFontFamily(font);
              if (!doc?.texts.header) return;
              svgDoc.updateTextStyle(doc.texts.header.id, 'font-family', `'${font}'`);
            }}
            onExportRegionSummary={testVennResult ? () => {
              const setNames = testColumnMapping.map(ci => testCsvData?.headers[ci] ?? '');
              let totalItems = 0;
              for (const [, count] of testVennResult.exclusive) totalItems += count;
              const tsv = exportRegionSummaryTsv(testVennResult, testColumnMapping.length, setNames, totalItems);
              downloadFile(tsv, `venn_${testColumnMapping.length}set_regions.tsv`);
            } : undefined}
            onExportMatrix={testVennResult ? () => {
              const setNames = testColumnMapping.map(ci => testCsvData?.headers[ci] ?? '');
              const tsv = exportMatrixTsv(testVennResult, testColumnMapping.length, setNames);
              downloadFile(tsv, `venn_${testColumnMapping.length}set_matrix.tsv`);
            } : undefined}
            onSaveSvg={handleSave}
            onExportImage={handleExportImage}
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
            isModified={svgDoc.isModified}
          />
        )}

        <div className="canvas-area">
          {doc ? (
            (mode === 'view' || mode === 'data') && viewStyle === 'cut' && regionData ? (
              <div className="canvas-container" ref={zoomPan.setContainerRef} onWheel={zoomPan.onWheel}>
                <CutViewCanvas
                  regionData={regionData}
                  scale={zoomPan.state.scale}
                  onRegionHover={regionDetection.setHoverByLabel}
                  onRegionClick={regionDetection.setSelectByLabel}
                  onBackgroundClick={regionDetection.clearSelection}
                  lockedLabel={regionDetection.selectedRegion?.label ?? null}
                  countOverrides={mode === 'data' && doc ? (() => {
                    const m = new Map<string, string>();
                    for (const t of doc.texts.values) {
                      const label = t.id.replace('Count_', '');
                      if (label !== t.id) m.set(label, t.content);
                    }
                    return m;
                  })() : null}
                  colorMode={mode === 'data' ? cutColorMode : 'depth'}
                  heatmapColors={heatmapColors}
                  legendPosition={heatmapLegendPosition}
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
                onDragTextStart={textTool === 'move' ? drag.onPointerDown : textTool ? handleTextToolStart : undefined}
                onDragShapeStart={moveShapes ? handleShapeDragStart : rotateShapes ? handleShapeRotateStart : resizeShapes ? handleShapeResizeStart : undefined}
                onShapeDragMove={resizeShapes ? handleShapeResizeMove : rotateShapes ? handleShapeRotateMove : moveShapes ? (e: React.PointerEvent) => {
                  if (!shapeDragRef.current) return;
                  const svg = document.querySelector('.canvas-svg') as SVGSVGElement | null;
                  if (!svg) return;
                  const ctm = svg.getScreenCTM();
                  if (!ctm) return;
                  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
                  const dx = pt.x - shapeDragRef.current.startX;
                  const dy = pt.y - shapeDragRef.current.startY;
                  const el = document.getElementById(shapeDragRef.current.id);
                  if (el) {
                    el.setAttribute('transform', `translate(${dx},${dy}) ${shapeDragRef.current.origTransform}`.trim());
                  }
                } : undefined}
                onShapeDragEnd={resizeShapes ? ((_e: React.PointerEvent) => { handleShapeResizeEnd(); }) : rotateShapes ? ((_e: React.PointerEvent) => { handleShapeRotateEnd(); }) : moveShapes ? (e: React.PointerEvent) => {
                  if (!shapeDragRef.current) return;
                  const svg = document.querySelector('.canvas-svg') as SVGSVGElement | null;
                  if (!svg) return;
                  const ctm = svg.getScreenCTM();
                  if (!ctm) return;
                  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
                  const dx = pt.x - shapeDragRef.current.startX;
                  const dy = pt.y - shapeDragRef.current.startY;
                  const id = shapeDragRef.current.id;
                  // Check if it's a bullet (BulletX) → update cx/cy
                  const bullet = doc?.bullets.find(b => b.id === id);
                  if (bullet) {
                    svgDoc.updateBulletPosition(id, Math.round((bullet.cx + dx) * 10) / 10, Math.round((bullet.cy + dy) * 10) / 10);
                    // Remove DOM transform (was visual-only during drag)
                    const el = document.getElementById(id);
                    if (el) el.removeAttribute('transform');
                  } else {
                    const orig = shapeDragRef.current.origTransform;
                    const newTransform = `translate(${Math.round(dx * 10) / 10},${Math.round(dy * 10) / 10}) ${orig}`.trim();
                    svgDoc.updateShapeAttribute(id, 'transform', newTransform);
                  }
                  shapeDragRef.current = null;
                  void e;
                } : undefined}
                onDragPointerMove={(e: React.PointerEvent) => { drag.onPointerMove(e); handleTextToolMove(e); }}
                onDragPointerUp={(e: React.PointerEvent) => { drag.onPointerUp(e); handleTextToolEnd(); }}
                onDoubleClickText={handleDoubleClickText}
                moveShapes={moveShapes || rotateShapes || resizeShapes}
                shapeCursor={rotateShapes ? 'grab' : resizeShapes ? 'nwse-resize' : 'move'}
                readOnly={mode === 'view' || mode === 'data'}
                viewStyle={(mode === 'view' || mode === 'data') ? viewStyle : 'layer'}
                hoveredRegion={activeRegion}
                hoverColor={mode === 'data' ? hoverColor : undefined}
                onRegionHover={regionDetection.onHover}
                onRegionClick={regionDetection.lockHover}
                onRegionLeave={regionDetection.clearHover}
                onReadOnlyTextClick={(letter) => regionDetection.setSelectByLabel(letter, true)}
              />
          ) : mode === 'view' && !welcomeOpen ? (
            <div className="canvas-model-browser">
              <div className="canvas-model-browser-inner">
                <h2 className="canvas-model-browser-title">Select a Venn Diagram Model</h2>
                {Array.from(modelsBySet.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([setCount, models]) => (
                    <div key={setCount} className="summary-group">
                      <h3 className="summary-group-title">
                        {setCount}-Set Diagrams
                        <span className="summary-group-count">{models.length} variant{models.length > 1 ? 's' : ''} — {Math.pow(2, setCount) - 1} regions</span>
                      </h3>
                      <div className="summary-grid">
                        {models.map(m => {
                          const source = SOURCES[m.filename];
                          return (
                            <div
                              key={m.filename}
                              className="summary-card"
                              onClick={() => handleLoadModel(m.filename)}
                            >
                              <SvgPreview filename={m.filename} />
                              <div className="summary-card-info">
                                <div className="summary-card-name">{m.label}</div>
                                {source && (
                                  <div className="summary-card-source">
                                    <span>{source.label}</span>
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
          ) : (
            <div className="canvas-empty">
              <div className="canvas-empty-text">
                {mode === 'data' ? 'Load your data to get started' : 'Open an SVG file to start editing'}
              </div>
              {mode === 'edit' && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-large" onClick={handleSelectFromLibrary}>Select Model</button>
                  <button className="btn btn-large" onClick={handleOpen}>Open Custom</button>
                </div>
              )}
              {mode === 'data' && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-large" onClick={() => handleTestLoadCsv('sample')}>Load Sample Data</button>
                  <label className="btn btn-large" style={{ cursor: 'pointer' }}>
                    Upload Custom File
                    <input type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleTestFileUpload(file);
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              )}
            </div>
          )}
          {doc && mode === 'edit' && (
            <ViewBoxEditor viewBox={doc.viewBox} onUpdate={svgDoc.updateViewBox} />
          )}
        </div>

        {(mode === 'view' || mode === 'data') ? (
          ((mode === 'view' && !doc) || (mode === 'data' && !testCsvData)) ? null : (
            <div className="right-panel-wrapper">
              {mode === 'data' && testCalculated && testVennResult && (
                <div className="right-panel-toggle">
                  <div className="view-style-switcher">
                    <button className={`btn btn-sm btn-view-style ${dataRightPanel === 'properties' ? 'btn-mode-active' : ''}`} onClick={() => setDataRightPanel('properties')}>Properties</button>
                    <button className={`btn btn-sm btn-view-style ${dataRightPanel === 'statistics' ? 'btn-mode-active' : ''}`} onClick={() => setDataRightPanel('statistics')}>Statistics</button>
                  </div>
                </div>
              )}
              {mode === 'data' && testCalculated && testVennResult && dataRightPanel === 'statistics' ? (
                <DataSummaryPanel
                  vennResult={testVennResult}
                  n={testColumnMapping.length}
                  setNames={testColumnMapping.map(i => testCsvData?.headers[i] ?? '')}
                  totalItems={testCsvData?.rows.length ?? 0}
                  selectedRegionLabel={regionDetection.selectedRegion?.label ?? null}
                />
              ) : (
                <ViewerInfoPanel
                  doc={doc}
                  hoveredRegion={regionDetection.hoveredRegion}
                  selectedRegion={regionDetection.selectedRegion}
                  regionExclusiveItems={mode === 'data' ? testExclusiveItems : null}
                  regionInclusiveItems={mode === 'data' ? testInclusiveItems : null}
                  canSave={mode === 'data' && testCalculated && viewStyle === 'layer'}
                  onSave={handleSave}
                  onClearSelection={regionDetection.clearSelection}
                />
              )}
            </div>
          )
        ) : (
          <PropertyPanel
            selected={selected}
            shapes={doc?.shapes ?? []}
            onUpdateTextPosition={svgDoc.updateTextPosition}
            onUpdateTextContent={svgDoc.updateTextContent}
            onUpdateTextStyle={svgDoc.updateTextStyle}
            onUpdateBulletPosition={svgDoc.updateBulletPosition}
            onUpdateShapeStyle={svgDoc.updateShapeStyle}
            moveShapes={moveShapes}
            rotateShapes={rotateShapes}
            resizeShapes={resizeShapes}
            onToggleMoveShapes={() => { setMoveShapes(m => !m); setRotateShapes(false); setResizeShapes(false); }}
            onToggleRotateShapes={() => { setRotateShapes(r => !r); setMoveShapes(false); setResizeShapes(false); }}
            onToggleResizeShapes={() => { setResizeShapes(r => !r); setMoveShapes(false); setRotateShapes(false); }}
            textTool={textTool ?? undefined}
            onSetTextTool={setTextTool}
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
        onClose={() => {
          setSummaryOpen(false);
          setSummarySelectMode(false);
          if (summaryFromWelcome) { setWelcomeOpen(true); setSummaryFromWelcome(false); }
        }}
        onSelectModel={async (filename) => {
          if (summarySelectMode) {
            const svgString = await fetchModel(filename);
            handleLoadFile(filename, svgString);
          } else {
            handleLoadModel(filename);
            setMode('view');
          }
          setSummaryOpen(false);
          setSummarySelectMode(false);
          setSummaryFromWelcome(false);
          setWelcomeOpen(false);
        }}
        onOpenCustom={() => { setSummaryOpen(false); setSummarySelectMode(false); handleOpen(); }}
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
        onSummary={() => { setSummarySelectMode(false); setSummaryFromWelcome(true); setSummaryOpen(true); setWelcomeOpen(false); }}
      />

      <HelpDialog
        isOpen={helpOpen}
        mode={mode}
        onClose={() => setHelpOpen(false)}
      />

      {/* Data Open dialog */}
      {dataOpenDialog && (
        <div className="dialog-overlay" onClick={() => setDataOpenDialog(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-title">Open Data</h3>
            <p className="confirm-text">Choose a data source for Venn diagram calculation.</p>
            <div className="confirm-actions">
              <button className="btn btn-accent" onClick={() => { setDataOpenDialog(false); handleTestLoadCsv('sample'); }}>Load Sample Data</button>
              <button className="btn" onClick={() => { setDataOpenDialog(false); dataFileInputRef.current?.click(); }}>Upload Custom File</button>
              <button className="btn" onClick={() => setDataOpenDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Dialog */}
      {csvImportDialog && (
        <CsvImportDialog
          isOpen={true}
          rawText={csvImportDialog.rawText}
          filename={csvImportDialog.filename}
          onLoad={handleCsvImportLoad}
          onCancel={() => setCsvImportDialog(null)}
        />
      )}

      {/* Unsaved changes confirm */}
      {modeSwitchTarget !== null && (
        <div className="dialog-overlay" onClick={() => setModeSwitchTarget(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-title">Unsaved Changes</h3>
            <p className="confirm-text">You have unsaved changes. Save before switching?</p>
            <div className="confirm-actions">
              <button className="btn btn-accent" onClick={() => { handleSave(); setMode(modeSwitchTarget); setModeSwitchTarget(null); }}>Save & Switch</button>
              <button className="btn" onClick={() => { svgDoc.markSaved(); setMode(modeSwitchTarget); setModeSwitchTarget(null); }}>Discard</button>
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

      {/* Rotate angle tooltip */}
      {rotateAngle !== null && rotateCursor && (
        <div className="rotate-tooltip" style={{ left: rotateCursor.x + 16, top: rotateCursor.y - 12 }}>
          {rotateAngle > 0 ? '+' : ''}{rotateAngle}°
        </div>
      )}

      {/* Resize scale tooltip */}
      {resizeScale !== null && resizeCursor && (
        <div className="rotate-tooltip" style={{ left: resizeCursor.x + 16, top: resizeCursor.y - 12 }}>
          {resizeScale}%
        </div>
      )}

      {/* Text tool tooltip */}
      {textToolCursor && textToolAngle !== null && (
        <div className="rotate-tooltip" style={{ left: textToolCursor.x + 16, top: textToolCursor.y - 12 }}>
          {textToolAngle > 0 ? '+' : ''}{textToolAngle}°
        </div>
      )}
      {textToolCursor && textToolSize !== null && (
        <div className="rotate-tooltip" style={{ left: textToolCursor.x + 16, top: textToolCursor.y - 12 }}>
          {textToolSize}px
        </div>
      )}
    </div>
  );
}
