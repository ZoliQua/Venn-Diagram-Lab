import { describe, it, expect } from 'vitest';
import { isEmptyCountValue } from '../utils/regionDisplay.ts';

describe('isEmptyCountValue', () => {
  it('treats "0" (and whitespace-padded "0") as empty', () => {
    expect(isEmptyCountValue('0')).toBe(true);
    expect(isEmptyCountValue(' 0 ')).toBe(true);
  });

  it('treats an absent override (undefined/null) as empty', () => {
    expect(isEmptyCountValue(undefined)).toBe(true);
    expect(isEmptyCountValue(null)).toBe(true);
  });

  it('treats any positive count as non-empty', () => {
    expect(isEmptyCountValue('1')).toBe(false);
    expect(isEmptyCountValue('5')).toBe(false);
    expect(isEmptyCountValue('100')).toBe(false);
  });

  it('does not treat a zero embedded in a larger number as empty', () => {
    expect(isEmptyCountValue('10')).toBe(false);
    expect(isEmptyCountValue('20')).toBe(false);
    expect(isEmptyCountValue('40')).toBe(false);
  });
});
