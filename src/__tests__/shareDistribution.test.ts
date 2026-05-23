import { describe, it, expect } from 'vitest';
import { itemShareDistribution } from '../utils/shareDistribution.ts';

describe('itemShareDistribution', () => {
  it('returns zero map for empty input', () => {
    expect(itemShareDistribution([], 3)).toEqual(new Map([[1, 0], [2, 0], [3, 0]]));
  });

  it('counts items by membership level on a 3-set matrix', () => {
    const matrix = [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
      [1, 0, 1],
    ];
    const dist = itemShareDistribution(matrix, 3);
    expect(dist).toEqual(new Map([[1, 2], [2, 2], [3, 1]]));
  });

  it('includes zero-valued bins for k absent in data', () => {
    const matrix = [
      [1, 0, 0, 0],
      [0, 0, 1, 0],
    ];
    expect(itemShareDistribution(matrix, 4)).toEqual(
      new Map([[1, 2], [2, 0], [3, 0], [4, 0]]),
    );
  });

  it('ignores items with all-zero rows (universe-rule violation; defensive)', () => {
    const matrix = [
      [1, 0, 0],
      [0, 0, 0],
      [1, 1, 0],
    ];
    expect(itemShareDistribution(matrix, 3)).toEqual(new Map([[1, 1], [2, 1], [3, 0]]));
  });
});
