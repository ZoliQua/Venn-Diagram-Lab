import { describe, expect, it } from 'vitest';
import { analyzeCsvText, toDataQuality } from '../src/api.ts';

// Aggregated (list-based) file: 2 set columns (A, B), tab-delimited so that
// items within a cell can use the default ',' item delimiter without quoting.
// Row 2 has an empty cell in column A (empty-cell warning).
// "TP53" occurs twice in column A (duplicate-item warning).
// "TP53" (col A) vs "tp53" (col B) is a case collision.
const TSV = [
  'A\tB',
  'TP53,BRCA1\tBRCA1',
  '\ttp53',
  'TP53\tMYC',
].join('\n');

describe('toDataQuality', () => {
  it('is aggregated mode with 2 set columns', () => {
    const r = analyzeCsvText(TSV);
    expect(r.mode).toBe('aggregated');
    expect(r.setNames).toEqual(['A', 'B']);
  });

  it('reports the duplicate item, the empty cell, and the case collision', () => {
    const result = analyzeCsvText(TSV);
    const quality = toDataQuality(result);

    expect(quality.hasWarnings).toBe(true);

    expect(quality.duplicatesRemoved).toEqual([
      { column: 0, columnName: 'A', count: 1, examples: ['TP53'] },
    ]);

    expect(quality.emptyCellsSkipped).toBe(1);

    expect(quality.caseCollisions).toEqual([
      { items: ['TP53', 'tp53'] },
    ]);
  });

  it('never mutates item identity — the venn result keeps TP53 and tp53 distinct', () => {
    const result = analyzeCsvText(TSV);
    // Calling toDataQuality must not change result.venn in any way.
    const before = JSON.stringify([...result.venn.exclusiveItems.entries()]);
    toDataQuality(result);
    const after = JSON.stringify([...result.venn.exclusiveItems.entries()]);
    expect(after).toBe(before);

    // TP53 (only in column A) and tp53 (only in column B) remain separate,
    // case-sensitive identities — never folded/merged.
    expect(result.venn.exclusiveItems.get('A')).toEqual(['TP53']);
    expect(result.venn.exclusiveItems.get('B')).toEqual(['tp53', 'MYC']);
    expect(result.venn.exclusiveItems.get('AB')).toEqual(['BRCA1']);
  });

  it('reports no warnings for clean binary data', () => {
    const clean = ['Gene\tA\tB', 'g1\t1\t0', 'g2\t1\t1', 'g3\t0\t1'].join('\n');
    const result = analyzeCsvText(clean);
    expect(result.mode).toBe('binary');
    const quality = toDataQuality(result);
    expect(quality.hasWarnings).toBe(false);
    expect(quality.duplicatesRemoved).toEqual([]);
    expect(quality.emptyCellsSkipped).toBe(0);
    expect(quality.caseCollisions).toEqual([]);
  });
});
