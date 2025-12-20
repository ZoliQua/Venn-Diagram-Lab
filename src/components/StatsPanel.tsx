import { useMemo } from 'react';
import type { VennDocument } from '../types.ts';

interface StatsPanelProps {
  doc: VennDocument;
  onAddText: (group: 'values', id: string, content: string) => void;
}

/** Compute C(n,k) — binomial coefficient */
function comb(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

/** Generate all combinations of `letters` of length `k`, sorted */
function combinations(letters: string[], k: number): string[] {
  const results: string[] = [];
  function recurse(start: number, current: string[]) {
    if (current.length === k) {
      results.push(current.join(''));
      return;
    }
    for (let i = start; i < letters.length; i++) {
      current.push(letters[i]);
      recurse(i + 1, current);
      current.pop();
    }
  }
  recurse(0, []);
  return results;
}

export function StatsPanel({ doc, onAddText }: StatsPanelProps) {
  const stats = useMemo(() => {
    // Get shape letters from IDs
    const shapeLetters = doc.shapes.map(s => s.id.replace('Shape', '')).sort();
    const n = shapeLetters.length;
    if (n === 0) return [];

    // Count existing values by character length
    const existingByLen: Record<number, Set<string>> = {};
    for (let k = 1; k <= n; k++) existingByLen[k] = new Set();

    for (const t of doc.texts.values) {
      // Extract the combo from the ID: Count_AB → AB
      const match = t.id.match(/^Count_([A-Z]+)$/);
      if (match) {
        const combo = match[1];
        const len = combo.length;
        if (len >= 1 && len <= n) {
          existingByLen[len].add(combo);
        }
      }
    }

    // Build stats per length
    const rows: {
      len: number;
      expected: number;
      found: number;
      missing: string[];
    }[] = [];

    for (let k = 1; k <= n; k++) {
      const expected = comb(n, k);
      const found = existingByLen[k].size;
      const allCombos = combinations(shapeLetters, k);
      const missing = allCombos.filter(c => !existingByLen[k].has(c));
      rows.push({ len: k, expected, found, missing });
    }

    return rows;
  }, [doc.shapes, doc.texts.values]);

  if (stats.length === 0) return null;

  const totalExpected = stats.reduce((s, r) => s + r.expected, 0);
  const totalFound = stats.reduce((s, r) => s + r.found, 0);

  return (
    <div className="stats-panel">
      <div className="stats-title">Region Statistics</div>
      <div className="stats-table">
        <div className="stats-header-row">
          <span className="stats-col-len">Chars</span>
          <span className="stats-col-count">Found</span>
          <span className="stats-col-expected">Expected</span>
          <span className="stats-col-action"></span>
        </div>
        {stats.map(row => (
          <div key={row.len} className={`stats-row ${row.found === row.expected ? 'stats-ok' : 'stats-warn'}`}>
            <span className="stats-col-len">{row.len}</span>
            <span className="stats-col-count">{row.found}</span>
            <span className="stats-col-expected">{row.expected}</span>
            <span className="stats-col-action">
              {row.missing.length > 0 && (
                <button
                  className="stats-add-btn"
                  onClick={() => {
                    for (const combo of row.missing) {
                      onAddText('values', `Count_${combo}`, combo);
                    }
                  }}
                  title={`Add missing: ${row.missing.join(', ')}`}
                >
                  +{row.missing.length}
                </button>
              )}
            </span>
          </div>
        ))}
        <div className={`stats-row stats-total ${totalFound === totalExpected ? 'stats-ok' : 'stats-warn'}`}>
          <span className="stats-col-len">Total</span>
          <span className="stats-col-count">{totalFound}</span>
          <span className="stats-col-expected">{totalExpected}</span>
          <span className="stats-col-action"></span>
        </div>
      </div>
      {stats.some(r => r.missing.length > 0) && (
        <div className="stats-missing-detail">
          <div className="stats-missing-title">Missing regions</div>
          {stats.filter(r => r.missing.length > 0).map(row => (
            <div key={row.len} className="stats-missing-row">
              <span className="stats-missing-len">{row.len}-char:</span>
              <span className="stats-missing-list">
                {row.missing.map(combo => (
                  <button
                    key={combo}
                    className="stats-missing-chip"
                    onClick={() => onAddText('values', `Count_${combo}`, combo)}
                    title={`Add Count_${combo}`}
                  >
                    {combo}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
