import { describe, it, expect } from 'vitest';
import {
  parseCsvWithDelimiter,
  splitCsvLineWithDelimiter,
  detectDelimiter,
  validateBinaryColumns,
  validateAggregatedColumns,
  calculateVennCounts,
  calculateVennCountsFromAggregated,
  getBinaryColumns,
  detectGeneSetFormat,
  parseGmt,
  parseGmx,
} from '../utils/csvParser.ts';
import type { CsvData } from '../utils/csvParser.ts';

describe('splitCsvLineWithDelimiter', () => {
  it('splits by comma', () => {
    expect(splitCsvLineWithDelimiter('a,b,c', ',')).toEqual(['a', 'b', 'c']);
  });
  it('splits by semicolon', () => {
    expect(splitCsvLineWithDelimiter('a;b;c', ';')).toEqual(['a', 'b', 'c']);
  });
  it('splits by tab', () => {
    expect(splitCsvLineWithDelimiter('a\tb\tc', '\t')).toEqual(['a', 'b', 'c']);
  });
  it('respects quoted fields with delimiter inside', () => {
    expect(splitCsvLineWithDelimiter('"a,b",c,d', ',')).toEqual(['a,b', 'c', 'd']);
  });
  it('handles escaped quotes', () => {
    expect(splitCsvLineWithDelimiter('"say ""hello""",b', ',')).toEqual(['say "hello"', 'b']);
  });
  it('trims whitespace', () => {
    expect(splitCsvLineWithDelimiter(' a , b , c ', ',')).toEqual(['a', 'b', 'c']);
  });
});

describe('parseCsvWithDelimiter', () => {
  it('parses comma CSV with header', () => {
    const csv = parseCsvWithDelimiter('A,B,C\n1,2,3\n4,5,6', ',', true);
    expect(csv.headers).toEqual(['A', 'B', 'C']);
    expect(csv.rows).toEqual([['1', '2', '3'], ['4', '5', '6']]);
  });
  it('parses semicolon CSV', () => {
    const csv = parseCsvWithDelimiter('A;B;C\n1;2;3', ';', true);
    expect(csv.headers).toEqual(['A', 'B', 'C']);
    expect(csv.rows).toEqual([['1', '2', '3']]);
  });
  it('parses tab CSV', () => {
    const csv = parseCsvWithDelimiter('A\tB\n1\t2', '\t', true);
    expect(csv.headers).toEqual(['A', 'B']);
    expect(csv.rows).toEqual([['1', '2']]);
  });
  it('generates synthetic headers when hasHeader=false', () => {
    const csv = parseCsvWithDelimiter('1,2,3\n4,5,6', ',', false);
    expect(csv.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
    expect(csv.rows).toEqual([['1', '2', '3'], ['4', '5', '6']]);
  });
  it('throws on empty file', () => {
    expect(() => parseCsvWithDelimiter('', ',', true)).toThrow();
  });
  it('filters empty lines', () => {
    const csv = parseCsvWithDelimiter('A,B\n1,2\n\n3,4\n', ',', true);
    expect(csv.rows).toHaveLength(2);
  });
});

describe('detectDelimiter', () => {
  it('detects comma', () => {
    expect(detectDelimiter('a,b,c\n1,2,3\n4,5,6')).toBe(',');
  });
  it('detects tab', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });
  it('detects semicolon', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });
  it('falls back to comma for ambiguous input', () => {
    expect(detectDelimiter('abc')).toBe(',');
  });
});

describe('validateBinaryColumns', () => {
  const csv = {
    headers: ['Title', 'A', 'B', 'C'],
    rows: [
      ['x', '1', '0', '1'],
      ['y', '0', '1', '0'],
      ['z', '1', '1', '1'],
    ],
  };

  it('returns null for valid binary columns', () => {
    expect(validateBinaryColumns(csv, [1, 2, 3])).toBeNull();
  });
  it('rejects fewer than 2 columns', () => {
    expect(validateBinaryColumns(csv, [1])).toContain('At least 2');
  });
  it('rejects column with invalid values', () => {
    const badCsv = {
      headers: ['A', 'B'],
      rows: [['1', 'maybe'], ['0', '1']],
    };
    expect(validateBinaryColumns(badCsv, [0, 1])).toContain('invalid value');
  });
  it('rejects column with no truthy values', () => {
    const zeroCsv = {
      headers: ['A', 'B'],
      rows: [['0', '1'], ['0', '0']],
    };
    expect(validateBinaryColumns(zeroCsv, [0, 1])).toContain('no truthy');
  });
});

describe('validateAggregatedColumns', () => {
  const csv = {
    headers: ['SetA', 'SetB', 'SetC'],
    rows: [
      ['gene1', 'gene2', 'gene3'],
      ['gene4', '', 'gene5'],
    ],
  };

  it('returns null for valid aggregated columns', () => {
    expect(validateAggregatedColumns(csv, [0, 1])).toBeNull();
  });
  it('rejects fewer than 2 columns', () => {
    expect(validateAggregatedColumns(csv, [0])).toContain('At least 2');
  });
  it('rejects empty column', () => {
    const emptyCsv = {
      headers: ['A', 'B'],
      rows: [['gene1', ''], ['gene2', '']],
    };
    expect(validateAggregatedColumns(emptyCsv, [0, 1])).toContain('empty');
  });
});

describe('calculateVennCountsFromAggregated', () => {
  it('computes 2-set intersections correctly', () => {
    const csv = {
      headers: ['SetA', 'SetB'],
      rows: [
        ['X', 'Y'],
        ['Y', 'Z'],
        ['Z', 'W'],
      ],
    };
    // SetA = {X, Y, Z}, SetB = {Y, Z, W}
    // Exclusive A = {X} = 1, Exclusive B = {W} = 1, AB = {Y, Z} = 2
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ',');
    expect(result.exclusive.get('A')).toBe(1);
    expect(result.exclusive.get('B')).toBe(1);
    expect(result.exclusive.get('AB')).toBe(2);
    // Inclusive: A = 3 (X,Y,Z), B = 3 (Y,Z,W), AB = 2 (Y,Z)
    expect(result.inclusive.get('A')).toBe(3);
    expect(result.inclusive.get('B')).toBe(3);
    expect(result.inclusive.get('AB')).toBe(2);
  });

  it('computes 3-set intersections correctly', () => {
    const csv = {
      headers: ['A', 'B', 'C'],
      rows: [
        ['X', 'X', 'X'],  // X in all 3
        ['Y', 'Y', ''],   // Y in A,B
        ['Z', '', 'Z'],   // Z in A,C
        ['W', '', ''],     // W only in A
      ],
    };
    const result = calculateVennCountsFromAggregated(csv, [0, 1, 2], ',');
    expect(result.exclusive.get('ABC')).toBe(1); // X
    expect(result.exclusive.get('AB')).toBe(1);  // Y
    expect(result.exclusive.get('AC')).toBe(1);  // Z
    expect(result.exclusive.get('A')).toBe(1);   // W
    expect(result.exclusive.get('B')).toBe(0);
    expect(result.exclusive.get('C')).toBe(0);
    expect(result.exclusive.get('BC')).toBe(0);
  });

  it('handles item delimiter within cells', () => {
    const csv = {
      headers: ['SetA', 'SetB'],
      rows: [
        ['X;Y;Z', 'Y;W'],
      ],
    };
    // SetA = {X, Y, Z}, SetB = {Y, W}
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ';');
    expect(result.exclusive.get('A')).toBe(2);  // X, Z
    expect(result.exclusive.get('B')).toBe(1);  // W
    expect(result.exclusive.get('AB')).toBe(1); // Y
  });

  it('ignores empty cells and whitespace', () => {
    const csv = {
      headers: ['A', 'B'],
      rows: [
        ['X', ''],
        ['', 'Y'],
        ['  ', '  '],
      ],
    };
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ',');
    expect(result.exclusive.get('A')).toBe(1);
    expect(result.exclusive.get('B')).toBe(1);
    expect(result.exclusive.get('AB')).toBe(0);
  });

  it('is case-sensitive', () => {
    const csv = {
      headers: ['A', 'B'],
      rows: [
        ['Gene1', 'gene1'],
        ['gene1', 'Gene1'],
      ],
    };
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ',');
    // Gene1 in A and B → AB; gene1 in A and B → AB
    expect(result.exclusive.get('AB')).toBe(2);
  });
});

describe('getBinaryColumns', () => {
  it('detects binary columns', () => {
    const csv = {
      headers: ['Title', 'A', 'B', 'Type'],
      rows: [
        ['x', '1', '0', 'movie'],
        ['y', '0', '1', 'series'],
      ],
    };
    expect(getBinaryColumns(csv)).toEqual([1, 2]);
  });
  it('skips columns with no truthy values', () => {
    const csv = {
      headers: ['A', 'B'],
      rows: [['0', '1'], ['0', '0']],
    };
    expect(getBinaryColumns(csv)).toEqual([1]);
  });
});

describe('detectGeneSetFormat', () => {
  it('detects .gmt', () => {
    expect(detectGeneSetFormat('pathways.gmt')).toBe('gmt');
  });
  it('detects .gmx', () => {
    expect(detectGeneSetFormat('sets.gmx')).toBe('gmx');
  });
  it('returns null for .csv', () => {
    expect(detectGeneSetFormat('data.csv')).toBeNull();
  });
  it('is case insensitive', () => {
    expect(detectGeneSetFormat('DATA.GMT')).toBe('gmt');
    expect(detectGeneSetFormat('file.GMX')).toBe('gmx');
  });
  it('returns null for .txt', () => {
    expect(detectGeneSetFormat('file.txt')).toBeNull();
  });
});

describe('parseGmt', () => {
  it('parses basic 2-set GMT', () => {
    const text = 'SetA\thttp://example.com\tGene1\tGene2\tGene3\nSetB\tna\tGene2\tGene4';
    const result = parseGmt(text);
    expect(result.csv.headers).toEqual(['SetA', 'SetB']);
    expect(result.csv.rows.length).toBe(3); // max genes = 3
    expect(result.csv.rows[0]).toEqual(['Gene1', 'Gene2']); // first gene of each set
    expect(result.csv.rows[1]).toEqual(['Gene2', 'Gene4']);
    expect(result.csv.rows[2]).toEqual(['Gene3', '']); // SetB shorter, padded
    expect(result.meta.format).toBe('gmt');
    expect(result.meta.descriptions['SetA']).toBe('http://example.com');
    expect(result.meta.descriptions['SetB']).toBeUndefined(); // 'na' filtered
  });

  it('handles variable-length rows', () => {
    const text = 'A\tdesc\tX\nB\tdesc\tY\tZ\tW';
    const result = parseGmt(text);
    expect(result.csv.rows.length).toBe(3); // max = 3 (from B)
    expect(result.csv.rows[0]).toEqual(['X', 'Y']);
    expect(result.csv.rows[1]).toEqual(['', 'Z']);
    expect(result.csv.rows[2]).toEqual(['', 'W']);
  });

  it('skips empty lines', () => {
    const text = 'A\tdesc\tX\n\n\nB\tdesc\tY';
    const result = parseGmt(text);
    expect(result.csv.headers).toEqual(['A', 'B']);
  });

  it('throws on empty file', () => {
    expect(() => parseGmt('')).toThrow();
  });

  it('works with calculateVennCountsFromAggregated', () => {
    const text = 'SetA\tna\tX\tY\tZ\nSetB\tna\tY\tZ\tW';
    const { csv } = parseGmt(text);
    // SetA = {X,Y,Z}, SetB = {Y,Z,W}
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ',');
    expect(result.exclusive.get('A')).toBe(1);  // X
    expect(result.exclusive.get('B')).toBe(1);  // W
    expect(result.exclusive.get('AB')).toBe(2); // Y, Z
  });
});

describe('parseGmx', () => {
  it('parses basic 2-set GMX', () => {
    const text = 'SetA\tSetB\nhttp://a.com\thttp://b.com\nGene1\tGene2\nGene3\tGene4\nGene5\t';
    const result = parseGmx(text);
    expect(result.csv.headers).toEqual(['SetA', 'SetB']);
    expect(result.csv.rows.length).toBe(3);
    expect(result.csv.rows[0]).toEqual(['Gene1', 'Gene2']);
    expect(result.csv.rows[1]).toEqual(['Gene3', 'Gene4']);
    expect(result.csv.rows[2]).toEqual(['Gene5', '']);
    expect(result.meta.format).toBe('gmx');
    expect(result.meta.descriptions['SetA']).toBe('http://a.com');
    expect(result.meta.descriptions['SetB']).toBe('http://b.com');
  });

  it('filters na descriptions', () => {
    const text = 'A\tB\nna\tsome desc\nX\tY';
    const result = parseGmx(text);
    expect(result.meta.descriptions['A']).toBeUndefined();
    expect(result.meta.descriptions['B']).toBe('some desc');
  });

  it('throws on file with fewer than 3 rows', () => {
    expect(() => parseGmx('A\tB\ndesc1\tdesc2')).toThrow();
  });
});

describe('VennResult.totalUniqueItems', () => {
  it('binary mode: equals number of data rows', () => {
    const csv: CsvData = {
      headers: ['item', 'A', 'B'],
      rows: [
        ['g1', '1', '0'],
        ['g2', '0', '1'],
        ['g3', '1', '1'],
        ['g4', '0', '0'],
      ],
    };
    const result = calculateVennCounts(csv, [1, 2]);
    expect(result.totalUniqueItems).toBe(4);
  });

  it('aggregated mode: equals union of unique items across columns', () => {
    // A = {g1, g2, g3}, B = {g2, g3, g4}, union = {g1, g2, g3, g4}
    const csv: CsvData = {
      headers: ['A', 'B'],
      rows: [
        ['g1', 'g2'],
        ['g2', 'g3'],
        ['g3', 'g4'],
      ],
    };
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ',');
    expect(result.totalUniqueItems).toBe(4);
  });

  it('aggregated mode: ignores padding (empty cells)', () => {
    // Simulates GMT-parsed data: short sets padded with empty cells
    // A has 3 genes, B has 1 gene, padded to max = 3
    const csv: CsvData = {
      headers: ['A', 'B'],
      rows: [
        ['g1', 'g4'],
        ['g2', ''],
        ['g3', ''],
      ],
    };
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ',');
    // Union is {g1, g2, g3, g4} = 4; rows.length = 3 (WRONG if used as N)
    expect(result.totalUniqueItems).toBe(4);
  });

  it('aggregated mode: multiple items per cell with delimiter', () => {
    const csv: CsvData = {
      headers: ['A', 'B'],
      rows: [
        ['g1,g2,g3', 'g3,g4'],
      ],
    };
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ',');
    expect(result.totalUniqueItems).toBe(4);  // g1, g2, g3, g4
  });
});
