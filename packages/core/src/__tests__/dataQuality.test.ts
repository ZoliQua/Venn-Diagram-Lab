import { describe, expect, it } from 'vitest';
import { analyzeDataQuality } from '../csvParser.ts';
import type { CsvData } from '../csvParser.ts';

describe('analyzeDataQuality — aggregated mode', () => {
  it('reports a duplicate item within one column, an empty cell, and a case collision', () => {
    // Column 0 ("SetA"): TP53 appears twice (real duplicate, collapsed by Set in
    // calculateVennCountsFromAggregated). Column 1 ("SetB"): one blank cell, and
    // "tp53" (case-collides with "TP53" from column 0).
    const csv: CsvData = {
      headers: ['SetA', 'SetB'],
      rows: [
        ['TP53', 'BRCA1'],
        ['TP53', ''],
        ['EGFR', 'tp53'],
      ],
    };

    const report = analyzeDataQuality(csv, [0, 1], 'aggregated', ',');

    expect(report.hasWarnings).toBe(true);

    // Duplicate: TP53 occurs twice in column 0 -> 1 redundant occurrence collapsed.
    expect(report.duplicatesRemoved).toEqual([
      { column: 0, columnName: 'SetA', count: 1, examples: ['TP53'] },
    ]);

    // Empty cell: row 1's SetB cell is blank.
    expect(report.emptyCellsSkipped).toBe(1);

    // Case collision: "TP53" (col 0) vs "tp53" (col 1), first-appearance order.
    expect(report.caseCollisions).toEqual([{ items: ['TP53', 'tp53'] }]);
  });

  it('splits multi-item cells on the item delimiter before dedup/case checks', () => {
    const csv: CsvData = {
      headers: ['SetA', 'SetB'],
      rows: [
        ['GENE1;GENE2;GENE1', 'GENE3'],
        ['  ', 'gene1'],
      ],
    };

    const report = analyzeDataQuality(csv, [0, 1], 'aggregated', ';');

    // GENE1 appears twice within the split cell of column 0.
    expect(report.duplicatesRemoved).toEqual([
      { column: 0, columnName: 'SetA', count: 1, examples: ['GENE1'] },
    ]);
    // Row 1's SetA cell is whitespace-only -> counts as empty.
    expect(report.emptyCellsSkipped).toBe(1);
    // GENE1 (col 0) vs gene1 (col 1) is a case collision.
    expect(report.caseCollisions).toEqual([{ items: ['GENE1', 'gene1'] }]);
  });

  it('returns no warnings for clean data', () => {
    const csv: CsvData = {
      headers: ['SetA', 'SetB'],
      rows: [
        ['GENE1', 'GENE3'],
        ['GENE2', 'GENE4'],
      ],
    };
    const report = analyzeDataQuality(csv, [0, 1], 'aggregated', ',');
    expect(report).toEqual({
      duplicatesRemoved: [],
      emptyCellsSkipped: 0,
      caseCollisions: [],
      hasWarnings: false,
    });
  });
});

describe('analyzeDataQuality — binary mode', () => {
  it('reports duplicate row identifiers (column 0) among contributing rows', () => {
    // Row identifier is column 0 ("Gene"). "TP53" appears on 2 contributing rows
    // (rowMask !== 0 for both) -> 1 redundant occurrence. The 3rd "TP53" row is
    // all-zero across selected columns, so it does not contribute and is excluded
    // from duplicate counting (mirrors calculateVennCounts' rowMask===0 skip).
    const csv: CsvData = {
      headers: ['Gene', 'SetA', 'SetB'],
      rows: [
        ['TP53', '1', '0'],
        ['TP53', '0', '1'],
        ['TP53', '0', '0'],
        ['EGFR', '1', '1'],
      ],
    };

    const report = analyzeDataQuality(csv, [1, 2], 'binary');

    expect(report.duplicatesRemoved).toEqual([
      { column: 0, columnName: 'Gene', count: 1, examples: ['TP53'] },
    ]);
    expect(report.hasWarnings).toBe(true);
  });

  it('counts empty cells within the selected columns regardless of row contribution', () => {
    const csv: CsvData = {
      headers: ['Gene', 'SetA', 'SetB'],
      rows: [
        ['G1', '1', ''],
        ['G2', '', '0'],
      ],
    };
    const report = analyzeDataQuality(csv, [1, 2], 'binary');
    expect(report.emptyCellsSkipped).toBe(2);
  });

  it('flags case-collision between distinct row identifiers', () => {
    const csv: CsvData = {
      headers: ['Gene', 'SetA', 'SetB'],
      rows: [
        ['TP53', '1', '0'],
        ['tp53', '0', '1'],
      ],
    };
    const report = analyzeDataQuality(csv, [1, 2], 'binary');
    expect(report.caseCollisions).toEqual([{ items: ['TP53', 'tp53'] }]);
    expect(report.duplicatesRemoved).toEqual([]); // distinct identifiers, not duplicates
  });

  it('returns no warnings for clean binary data', () => {
    const csv: CsvData = {
      headers: ['Gene', 'SetA', 'SetB'],
      rows: [
        ['G1', '1', '0'],
        ['G2', '0', '1'],
      ],
    };
    const report = analyzeDataQuality(csv, [1, 2], 'binary');
    expect(report).toEqual({
      duplicatesRemoved: [],
      emptyCellsSkipped: 0,
      caseCollisions: [],
      hasWarnings: false,
    });
  });
});
