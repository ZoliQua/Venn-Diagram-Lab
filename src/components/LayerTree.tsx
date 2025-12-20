import { useState } from 'react';
import type { VennDocument, SelectableElement } from '../types.ts';

interface LayerTreeProps {
  doc: VennDocument;
  selected: SelectableElement | null;
  onSelect: (id: string) => void;
  onToggleMeta: (key: 'headerHidden' | 'bulletsHidden') => void;
  onMoveElement: (group: 'shapes' | 'names' | 'values' | 'sums' | 'bullets', id: string, direction: 'up' | 'down') => void;
  onAddText: (group: 'names' | 'values' | 'sums') => void;
  onRemoveText: (id: string) => void;
  onToggleElementVisibility: (id: string) => void;
  onToggleGroupVisibility: (group: string) => void;
}

function getSelectedId(sel: SelectableElement | null): string | null {
  if (!sel) return null;
  return sel.element.id;
}

function GroupSection({
  title,
  groupKey,
  items,
  selectedId,
  hiddenIds,
  groupHidden,
  onSelect,
  onMove,
  onToggleElementVisibility,
  onToggleGroupVisibility,
  persistHidden,
  onTogglePersistHidden,
  addable,
  onAdd,
  onRemove,
}: {
  title: string;
  groupKey: string;
  items: { id: string; label: string }[];
  selectedId: string | null;
  hiddenIds: Set<string>;
  groupHidden: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onToggleElementVisibility: (id: string) => void;
  onToggleGroupVisibility: () => void;
  persistHidden?: boolean;
  onTogglePersistHidden?: () => void;
  addable?: boolean;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (items.length === 0 && !addable) return null;

  return (
    <div className="layer-group" data-group={groupKey}>
      <div className="layer-group-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="layer-collapse">{collapsed ? '\u25B6' : '\u25BC'}</span>
        <span
          className={`layer-eye ${groupHidden ? 'layer-eye-hidden' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleGroupVisibility(); }}
          title={groupHidden ? 'Show group' : 'Hide group'}
        >
          {groupHidden ? '\u25CB' : '\u25CF'}
        </span>
        {onTogglePersistHidden && (
          <span
            className={`layer-eye-persist ${persistHidden ? 'layer-eye-hidden' : ''}`}
            onClick={(e) => { e.stopPropagation(); onTogglePersistHidden(); }}
            title={persistHidden ? 'Show in SVG (display:none is set)' : 'Hide in SVG (set display:none)'}
          >
            {persistHidden ? '\u{1F441}\u200D\u{1F5E8}' : '\u{1F441}'}
          </span>
        )}
        <span className="layer-group-title">{title}</span>
        <span className="layer-count">({items.length})</span>
        {addable && onAdd && (
          <span
            className="layer-add-btn"
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            title={`Add to ${title}`}
          >
            +
          </span>
        )}
      </div>
      {!collapsed && (
        <div className="layer-items">
          {items.map((item, idx) => {
            const isHidden = hiddenIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`layer-item ${selectedId === item.id ? 'layer-item-selected' : ''} ${isHidden ? 'layer-item-hidden' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                <span
                  className={`layer-eye-item ${isHidden ? 'layer-eye-hidden' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onToggleElementVisibility(item.id); }}
                  title={isHidden ? 'Show' : 'Hide'}
                >
                  {isHidden ? '\u25CB' : '\u25CF'}
                </span>
                <span className="layer-item-label">{item.label}</span>
                <span className="layer-item-actions">
                  <button
                    className="layer-move-btn"
                    disabled={idx === 0}
                    onClick={(e) => { e.stopPropagation(); onMove(item.id, 'up'); }}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    className="layer-move-btn"
                    disabled={idx === items.length - 1}
                    onClick={(e) => { e.stopPropagation(); onMove(item.id, 'down'); }}
                    title="Move down"
                  >
                    ▼
                  </button>
                  {onRemove && (
                    <button
                      className="layer-move-btn layer-remove-btn"
                      onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LayerTree({ doc, selected, onSelect, onToggleMeta, onMoveElement, onAddText, onRemoveText, onToggleElementVisibility, onToggleGroupVisibility }: LayerTreeProps) {
  const selectedId = getSelectedId(selected);
  const { hiddenIds, hiddenGroups } = doc.meta;

  const shapeItems = doc.shapes.map(s => ({ id: s.id, label: s.id }));
  const headerItems = doc.texts.header
    ? [{ id: doc.texts.header.id, label: doc.texts.header.id }]
    : [];
  const nameItems = doc.texts.names.map(t => ({ id: t.id, label: t.id }));
  const valueItems = doc.texts.values.map(t => ({ id: t.id, label: t.id }));
  const sumItems = doc.texts.sums.map(t => ({ id: t.id, label: t.id }));
  const bulletItems = doc.bullets.map(b => ({ id: b.id, label: b.id }));

  return (
    <div className="layer-tree">
      <div className="layer-tree-title">Layers</div>
      <GroupSection
        title="Shapes"
        groupKey="shapes"
        items={shapeItems}
        selectedId={selectedId}
        hiddenIds={hiddenIds}
        groupHidden={hiddenGroups.has('shapes')}
        onSelect={onSelect}
        onMove={(id, dir) => onMoveElement('shapes', id, dir)}
        onToggleElementVisibility={onToggleElementVisibility}
        onToggleGroupVisibility={() => onToggleGroupVisibility('shapes')}
      />
      <GroupSection
        title="Header"
        groupKey="header"
        items={headerItems}
        selectedId={selectedId}
        hiddenIds={hiddenIds}
        groupHidden={hiddenGroups.has('header')}
        onSelect={onSelect}
        onMove={() => {}}
        onToggleElementVisibility={onToggleElementVisibility}
        onToggleGroupVisibility={() => onToggleGroupVisibility('header')}
        persistHidden={doc.meta.headerHidden}
        onTogglePersistHidden={() => onToggleMeta('headerHidden')}
      />
      <GroupSection
        title="Names"
        groupKey="names"
        items={nameItems}
        selectedId={selectedId}
        hiddenIds={hiddenIds}
        groupHidden={hiddenGroups.has('names')}
        onSelect={onSelect}
        onMove={(id, dir) => onMoveElement('names', id, dir)}
        onToggleElementVisibility={onToggleElementVisibility}
        onToggleGroupVisibility={() => onToggleGroupVisibility('names')}
        addable
        onAdd={() => onAddText('names')}
        onRemove={onRemoveText}
      />
      <GroupSection
        title="Values"
        groupKey="values"
        items={valueItems}
        selectedId={selectedId}
        hiddenIds={hiddenIds}
        groupHidden={hiddenGroups.has('values')}
        onSelect={onSelect}
        onMove={(id, dir) => onMoveElement('values', id, dir)}
        onToggleElementVisibility={onToggleElementVisibility}
        onToggleGroupVisibility={() => onToggleGroupVisibility('values')}
        addable
        onAdd={() => onAddText('values')}
        onRemove={onRemoveText}
      />
      <GroupSection
        title="Sums"
        groupKey="sums"
        items={sumItems}
        selectedId={selectedId}
        hiddenIds={hiddenIds}
        groupHidden={hiddenGroups.has('sums')}
        onSelect={onSelect}
        onMove={(id, dir) => onMoveElement('sums', id, dir)}
        onToggleElementVisibility={onToggleElementVisibility}
        onToggleGroupVisibility={() => onToggleGroupVisibility('sums')}
        addable
        onAdd={() => onAddText('sums')}
        onRemove={onRemoveText}
      />
      <GroupSection
        title="Bullets"
        groupKey="bullets"
        items={bulletItems}
        selectedId={selectedId}
        hiddenIds={hiddenIds}
        groupHidden={hiddenGroups.has('bullets')}
        onSelect={onSelect}
        onMove={(id, dir) => onMoveElement('bullets', id, dir)}
        onToggleElementVisibility={onToggleElementVisibility}
        onToggleGroupVisibility={() => onToggleGroupVisibility('bullets')}
        persistHidden={doc.meta.bulletsHidden}
        onTogglePersistHidden={() => onToggleMeta('bulletsHidden')}
      />
    </div>
  );
}
