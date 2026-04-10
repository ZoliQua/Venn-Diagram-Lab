import { describe, it, expect } from 'vitest';
import { escapeSpreadsheetCell, exportMatrixTsv, exportRegionSummaryTsv } from '../utils/exportData.ts';
import type { VennResult } from '../utils/csvParser.ts';

function makeResult(): VennResult {
  return {
    inclusive: new Map([
      ['A', 2],
      ['B', 1],
      ['AB', 1],
    ]),
    exclusive: new Map([
      ['A', 1],
      ['B', 0],
      ['AB', 1],
    ]),
    inclusiveItems: new Map([
      ['A', ['safe', '=SUM(A1:A2)']],
      ['B', ['plain']],
      ['AB', ['@shared']],
    ]),
    exclusiveItems: new Map([
      ['A', ['safe']],
      ['B', []],
      ['AB', ['=SUM(A1:A2)', '@shared']],
    ]),
    totalUniqueItems: 3,
  };
}

describe('escapeSpreadsheetCell', () => {
  it('prefixes dangerous leading formula characters', () => {
    expect(escapeSpreadsheetCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeSpreadsheetCell('+1+2')).toBe("'+1+2");
    expect(escapeSpreadsheetCell('-cmd')).toBe("'-cmd");
    expect(escapeSpreadsheetCell('@user')).toBe("'@user");
  });

  it('prefixes values with leading whitespace before a formula character', () => {
    expect(escapeSpreadsheetCell('  =SUM(A1:A2)')).toBe("'  =SUM(A1:A2)");
    expect(escapeSpreadsheetCell('\t@user')).toBe("'\t@user");
  });

  it('leaves safe values unchanged', () => {
    expect(escapeSpreadsheetCell('plain text')).toBe('plain text');
    expect(escapeSpreadsheetCell("'already quoted")).toBe("'already quoted");
    expect(escapeSpreadsheetCell('42')).toBe('42');
  });
});

describe('exportRegionSummaryTsv', () => {
  it('escapes dangerous set names and item values only in export output', () => {
    const tsv = exportRegionSummaryTsv(makeResult(), 2, ['=Set A', '@Set B'], 2);
    const lines = tsv.split('\n');

    expect(lines[0]).toBe('Region\tSets\tDepth\tExclusive_Count\tInclusive_Count\tExclusive_Pct\tItems');
    expect(lines[1]).toBe("A\t'=Set A\t1\t1\t2\t50.00\tsafe");
    expect(lines[2]).toBe("B\t'@Set B\t1\t0\t1\t0.00\t");
    expect(lines[3]).toBe("AB\t'=Set A ∩ '@Set B\t2\t1\t1\t50.00\t'=SUM(A1:A2);'@shared");
  });
});

describe('exportMatrixTsv', () => {
  it('escapes dangerous headers and item names while keeping numeric membership intact', () => {
    const tsv = exportMatrixTsv(makeResult(), 2, ['=Set A', 'Safe B']);
    const lines = tsv.split('\n');

    expect(lines[0]).toBe("Item\t'=Set A\tSafe B\tRegion");
    expect(lines[1]).toBe('safe\t1\t0\tA');
    expect(lines[2]).toBe("'=SUM(A1:A2)\t1\t1\tAB");
    expect(lines[3]).toBe("'@shared\t1\t1\tAB");
  });
});
