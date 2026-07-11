import { describe, it, expect } from 'vitest';
import { formatP } from '../utils/pdfReport.ts';

describe('pdfReport formatP (display-only)', () => {
  it('floors an exact-zero p-value to the underflow annotation', () => {
    expect(formatP(0)).toBe('< 1e-300');
  });

  it('keeps the existing scientific-notation format for small nonzero p', () => {
    expect(formatP(5e-20)).toBe((5e-20).toExponential(1));
  });

  it('keeps the existing fixed format for p >= 0.001', () => {
    expect(formatP(0.0234)).toBe((0.0234).toFixed(4));
  });
});
