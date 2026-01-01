import { useEffect, useState, useMemo } from 'react';
import type { VennDocument } from '../types.ts';

interface ReportDialogProps {
  isOpen: boolean;
  doc: VennDocument | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}

interface ReportRow {
  id: string;
  content: string;
  expected: string;  // from containing shapes
  match: boolean;
}

function shapeIdToLetter(id: string): string {
  return id.replace('Shape', '');
}

function getContainingShapesForReport(
  x: number, y: number, shapeIds: string[]
): string[] {
  const svgRoot = document.querySelector('.canvas-svg') as SVGSVGElement | null;
  if (!svgRoot) return [];

  const rootCTM = svgRoot.getScreenCTM();
  if (!rootCTM) return [];

  const screenPt = new DOMPoint(x, y).matrixTransform(rootCTM);
  const shapeIdSet = new Set(shapeIds);
  const result: string[] = [];

  const inViewport = screenPt.x >= 0 && screenPt.y >= 0 &&
    screenPt.x <= window.innerWidth && screenPt.y <= window.innerHeight;

  if (inViewport) {
    const els = document.elementsFromPoint(screenPt.x, screenPt.y);
    for (const el of els) {
      if (el.id && shapeIdSet.has(el.id)) {
        result.push(el.id);
      }
    }
  } else {
    for (const id of shapeIds) {
      const el = document.getElementById(id) as unknown as SVGGeometryElement | null;
      if (!el || typeof el.isPointInFill !== 'function') continue;
      try {
        const shapeCTM = el.getScreenCTM();
        if (!shapeCTM) continue;
        const localPt = screenPt.matrixTransform(shapeCTM.inverse());
        if (el.isPointInFill(new DOMPoint(localPt.x, localPt.y))) {
          result.push(id);
        }
      } catch { /* skip */ }
    }
  }

  return result.sort();
}

export function ReportDialog({ isOpen, doc, onClose, onSelect }: ReportDialogProps) {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [computing, setComputing] = useState(false);

  const shapeIds = useMemo(() => doc?.shapes.map(s => s.id) ?? [], [doc]);

  useEffect(() => {
    if (!isOpen || !doc) {
      setRows([]);
      return;
    }

    setComputing(true);

    // Compute after a frame to ensure DOM is rendered
    requestAnimationFrame(() => {
      const newRows: ReportRow[] = [];

      for (const t of doc.texts.values) {
        const containingIds = getContainingShapesForReport(t.x, t.y, shapeIds);
        const expected = containingIds.map(id => shapeIdToLetter(id)).sort().join('');

        // Compare against ID-based expected letters (not content, which may be numbers)
        const expectedFromId = t.id.startsWith('Count_') ? t.id.replace('Count_', '') : '';
        newRows.push({
          id: t.id,
          content: t.content,
          expected,
          match: expectedFromId ? expectedFromId === expected : t.content === expected,
        });
      }

      setRows(newRows);
      setComputing(false);
    });
  }, [isOpen, doc, shapeIds]);

  if (!isOpen) return null;

  const matchCount = rows.filter(r => r.match).length;
  const totalCount = rows.length;
  const allMatch = matchCount === totalCount;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="report-dialog" onClick={e => e.stopPropagation()}>
        <div className="report-header">
          <div className="dialog-title">Validation Report</div>
          <div className={`report-summary ${allMatch ? 'report-summary-ok' : 'report-summary-warn'}`}>
            {allMatch ? '\u2714' : '\u26A0'} {matchCount}/{totalCount} regions correct
          </div>
        </div>

        {computing ? (
          <div className="report-computing">Computing...</div>
        ) : (
          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th className="report-th-status"></th>
                  <th className="report-th-id">ID</th>
                  <th className="report-th-content">Content</th>
                  <th className="report-th-expected">Expected</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.id}
                    className={`report-row ${row.match ? 'report-row-ok' : 'report-row-fail'}`}
                    onClick={() => { onSelect(row.id); onClose(); }}
                    title={`Click to select ${row.id}`}
                  >
                    <td className="report-td-status">
                      <span className={row.match ? 'report-check-ok' : 'report-check-fail'}>
                        {row.match ? '\u2714' : '\u2718'}
                      </span>
                    </td>
                    <td className="report-td-id">{row.id.replace('Count_', '')}</td>
                    <td className="report-td-content">{row.content}</td>
                    <td className="report-td-expected">{row.expected || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
