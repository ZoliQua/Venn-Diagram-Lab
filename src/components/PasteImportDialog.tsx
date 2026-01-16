import { useState, useMemo, useCallback } from 'react';
import type { CsvImportResult } from '../utils/csvParser.ts';

interface PasteImportDialogProps {
  isOpen: boolean;
  onLoad: (result: CsvImportResult) => void;
  onCancel: () => void;
}

const LETTERS = 'ABCDEFGHI';

type PasteDelimiter = 'newline' | ',' | '\t' | ' ';

const SHAPE_COLORS: Record<string, string> = {
  A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
  E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1', I: '#F7941E',
};

export function PasteImportDialog({ isOpen, onLoad, onCancel }: PasteImportDialogProps) {
  const [numSets, setNumSets] = useState(3);
  const [setNames, setSetNames] = useState<string[]>(
    Array.from({ length: 9 }, (_, i) => `Set ${LETTERS[i]}`),
  );
  const [texts, setTexts] = useState<string[]>(Array(9).fill(''));
  const [delimiter, setDelimiter] = useState<PasteDelimiter>('newline');

  const parseItems = useCallback((text: string): string[] => {
    if (!text.trim()) return [];
    if (delimiter === 'newline') {
      return text.split(/\r?\n/).map(s => s.trim()).filter(s => s);
    }
    return text.split(delimiter).map(s => s.trim()).filter(s => s);
  }, [delimiter]);

  const itemCounts = useMemo(() => {
    return Array.from({ length: numSets }, (_, i) => parseItems(texts[i]).length);
  }, [texts, numSets, parseItems]);

  const totalUniqueItems = useMemo(() => {
    const all = new Set<string>();
    for (let i = 0; i < numSets; i++) {
      for (const item of parseItems(texts[i])) all.add(item);
    }
    return all.size;
  }, [texts, numSets, parseItems]);

  const filledSets = itemCounts.filter(c => c > 0).length;
  const canImport = filledSets >= 2;

  const handleTextChange = useCallback((idx: number, value: string) => {
    setTexts(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
    // Auto-detect: if pasted text has tabs, switch delimiter
    if (value.includes('\t') && delimiter === 'newline') {
      setDelimiter('\t');
    }
  }, [delimiter]);

  const handleNameChange = useCallback((idx: number, value: string) => {
    setSetNames(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }, []);

  const handleImport = useCallback(() => {
    const activeTexts = texts.slice(0, numSets);
    const activeNames = setNames.slice(0, numSets);

    const sets = activeTexts.map(t => parseItems(t));
    const maxLen = Math.max(...sets.map(s => s.length), 0);
    const headers = activeNames;
    const rows: string[][] = [];
    for (let i = 0; i < maxLen; i++) {
      rows.push(sets.map(s => i < s.length ? s[i] : ''));
    }

    onLoad({
      csv: { headers, rows },
      fileType: 'aggregated',
      selectedColumns: Array.from({ length: numSets }, (_, i) => i),
      hasHeader: true,
    });
  }, [texts, setNames, numSets, parseItems, onLoad]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog"
        onClick={e => e.stopPropagation()}
        style={{ minWidth: 500, maxWidth: 580, maxHeight: '85vh', overflow: 'auto', padding: 20 }}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Paste Gene Lists</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#888' }}>
          Paste one list per set. Items can be separated by newline, comma, tab, or space.
        </p>

        {/* Number of sets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <label style={{ fontSize: 12 }}>Number of sets:</label>
          <select
            value={numSets}
            onChange={e => setNumSets(parseInt(e.target.value))}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #555', background: '#2a2a3a', color: '#ccc' }}
          >
            {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Set textareas */}
        {Array.from({ length: numSets }, (_, i) => {
          const letter = LETTERS[i];
          const count = itemCounts[i];
          const isEmpty = count === 0 && texts[i].trim().length === 0;
          return (
            <div
              key={letter}
              style={{
                marginBottom: 10,
                padding: '8px 10px',
                borderRadius: 6,
                border: `1px solid ${isEmpty ? '#555' : '#4a6a8a'}`,
                background: '#1e1e2e',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                    background: SHAPE_COLORS[letter], flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 'bold', color: '#ccc', minWidth: 14 }}>{letter}</span>
                <input
                  type="text"
                  value={setNames[i]}
                  onChange={e => handleNameChange(i, e.target.value)}
                  placeholder={`Set ${letter} name`}
                  style={{
                    flex: 1, padding: '3px 6px', fontSize: 11, borderRadius: 3,
                    border: '1px solid #444', background: '#2a2a3a', color: '#ddd',
                  }}
                />
                <span style={{ fontSize: 10, color: '#888', minWidth: 50, textAlign: 'right' }}>
                  {count} item{count !== 1 ? 's' : ''}
                </span>
              </div>
              <textarea
                value={texts[i]}
                onChange={e => handleTextChange(i, e.target.value)}
                placeholder="Paste items here (one per line)"
                style={{
                  width: '100%', minHeight: 60, maxHeight: 150,
                  fontFamily: 'monospace', fontSize: 11,
                  padding: 6, borderRadius: 3,
                  border: '1px solid #444', background: '#252535', color: '#ccc',
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>
          );
        })}

        {/* Delimiter selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: 11, color: '#999' }}>
          <span>Delimiter:</span>
          {([['newline', 'Newline'], [',', 'Comma'], ['\t', 'Tab'], [' ', 'Space']] as [PasteDelimiter, string][]).map(([val, label]) => (
            <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
              <input
                type="radio"
                name="paste-delimiter"
                checked={delimiter === val}
                onChange={() => setDelimiter(val)}
              />
              {label}
            </label>
          ))}
        </div>

        {/* Summary + buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#888' }}>
            {filledSets} / {numSets} sets filled, {totalUniqueItems} unique items
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onCancel}>Cancel</button>
            <button
              className="btn btn-accent"
              onClick={handleImport}
              disabled={!canImport}
              title={canImport ? '' : 'At least 2 sets must have items'}
            >
              Import ({totalUniqueItems} items)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
