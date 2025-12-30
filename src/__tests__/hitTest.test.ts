import { describe, it, expect } from 'vitest';
import { shapeIdToLetter, expectedLettersFromId } from '../utils/hitTest.ts';

describe('shapeIdToLetter', () => {
  it('extracts letter from ShapeA', () => {
    expect(shapeIdToLetter('ShapeA')).toBe('A');
  });

  it('extracts letter from ShapeH', () => {
    expect(shapeIdToLetter('ShapeH')).toBe('H');
  });
});

describe('expectedLettersFromId', () => {
  it('parses Count_A', () => {
    expect(expectedLettersFromId('Count_A')).toEqual(['A']);
  });

  it('parses Count_ABD', () => {
    expect(expectedLettersFromId('Count_ABD')).toEqual(['A', 'B', 'D']);
  });

  it('parses Count_ABCDEFGH', () => {
    expect(expectedLettersFromId('Count_ABCDEFGH')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  });

  it('returns empty for non-Count IDs', () => {
    expect(expectedLettersFromId('NameA')).toEqual([]);
    expect(expectedLettersFromId('ShapeA')).toEqual([]);
  });

  it('returns empty for malformed IDs', () => {
    expect(expectedLettersFromId('Count_')).toEqual([]);
    expect(expectedLettersFromId('Count_abc')).toEqual([]);
  });
});
