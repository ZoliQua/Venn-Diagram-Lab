import { useRef, useCallback, useState } from 'react';
import type { VennDocument, SelectableElement, VennText } from '../types.ts';
import { LayerTree } from './LayerTree.tsx';
import { StatsPanel } from './StatsPanel.tsx';

function detectVennType(filename: string): { setCount: number; form: string } {
  const m = filename.match(/venn-(\d+)/);
  const setCount = m ? parseInt(m[1]) : 0;
  let form = 'standard';
  if (filename.includes('-edwards')) form = 'Edwards';
  else if (filename.includes('-anderson')) form = 'Anderson';
  else if (filename.includes('-bannier')) form = 'Bannier';
  else if (filename.includes('-grunbaum')) form = 'Grünbaum';
  else if (filename.includes('-euler')) form = 'Euler';
  else if (filename.includes('-adelaide') || filename.includes('-hamilton') || filename.includes('-massey') || filename.includes('-victoria') || filename.includes('-manawatu') || filename.includes('-palmerston')) form = 'Mamakani';
  else if (filename.includes('venn-5e-') || filename.includes('venn-5f-') || filename.includes('venn-4f-')) form = 'Venn (original)';
  else if (filename.includes('venn-6-set') || filename.includes('venn-8-set.')) form = 'SUMO-Venn';
  return { setCount, form };
}

interface SidebarProps {
  doc: VennDocument | null;
  selected: SelectableElement | null;
  onLoadFile: (filename: string, content: string) => void;
  onSave: () => void;
  onRestore: () => void;
  onSelectFromLibrary: () => void;
  onOpenCustomFile: (filename: string, content: string) => void;
  onSelect: (id: string) => void;
  onToggleMeta: (key: 'headerHidden' | 'bulletsHidden') => void;
  onMoveElement: (group: 'shapes' | 'names' | 'values' | 'sums' | 'bullets', id: string, direction: 'up' | 'down') => void;
  onAddText: (group: 'names' | 'values' | 'sums') => void;
  onAddTextDirect: (group: 'names' | 'values' | 'sums', text: VennText) => void;
  onRemoveText: (id: string) => void;
  onToggleElementVisibility: (id: string) => void;
  onToggleGroupVisibility: (group: string) => void;
}

export function Sidebar({ doc, selected, onSave, onRestore, onSelectFromLibrary, onOpenCustomFile, onSelect, onToggleMeta, onMoveElement, onAddText, onAddTextDirect, onRemoveText, onToggleElementVisibility, onToggleGroupVisibility }: SidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onOpenCustomFile(file.name, reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleStatsAddText = useCallback((group: 'values', id: string, content: string) => {
    if (!doc) return;
    // Check duplicate
    if (doc.texts.values.some(t => t.id === id)) return;
    const vb = doc.viewBox;
    const fontSize = content.length <= 2 ? '14' : content.length <= 4 ? '10' : '8';
    onAddTextDirect(group, {
      id,
      x: Math.round(vb.x + vb.w / 2),
      y: Math.round(vb.y + vb.h / 2),
      content,
      style: `fill:#262262;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';font-size:${fontSize}`,
    });
  }, [doc, onAddTextDirect]);

  const vennType = doc ? detectVennType(doc.filename) : null;

  return (
    <div className="sidebar">
      {/* SVG FILE */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">SVG File</div>
        <input ref={inputRef} type="file" accept=".svg" style={{ display: 'none' }} onChange={handleFileChange} />
        <div className="sidebar-file-buttons">
          <button className="btn" onClick={onSelectFromLibrary}>Select</button>
          <button className="btn" onClick={() => inputRef.current?.click()}>Open Custom</button>
        </div>
      </div>

      {/* FILE INFO */}
      {doc && vennType && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">File Info</div>
          <div className="sidebar-file-info">
            <div><span className="file-info-label">Filename:</span> {doc.filename}</div>
            <div><span className="file-info-label">Venn type:</span> {vennType.setCount} sets</div>
            <div><span className="file-info-label">Form:</span> {vennType.form}</div>
          </div>
          <div className="sidebar-file-buttons" style={{ marginTop: 8 }}>
            <button className="btn" onClick={onSave}>Save</button>
            <button className="btn" onClick={() => setRestoreConfirmOpen(true)}>Restore</button>
          </div>
        </div>
      )}

      {/* LAYERS */}
      {doc && (
        <div className="sidebar-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-section-title">Layers</div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <LayerTree
              doc={doc}
              selected={selected}
              onSelect={onSelect}
              onToggleMeta={onToggleMeta}
              onMoveElement={onMoveElement}
              onAddText={onAddText}
              onRemoveText={onRemoveText}
              onToggleElementVisibility={onToggleElementVisibility}
              onToggleGroupVisibility={onToggleGroupVisibility}
            />
          </div>
        </div>
      )}

      {doc && (
        <div className="sidebar-section">
          <StatsPanel doc={doc} onAddText={handleStatsAddText} />
        </div>
      )}

      {/* Restore confirm dialog */}
      {restoreConfirmOpen && (
        <div className="dialog-overlay" onClick={() => setRestoreConfirmOpen(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-title">Restore Original</h3>
            <p className="confirm-text">Revert to the original SVG? All changes will be lost.</p>
            <div className="confirm-actions">
              <button className="btn btn-accent" onClick={() => { onRestore(); setRestoreConfirmOpen(false); }}>Restore</button>
              <button className="btn" onClick={() => setRestoreConfirmOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
