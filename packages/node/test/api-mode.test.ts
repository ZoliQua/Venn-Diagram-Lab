import { describe, expect, it } from 'vitest';
import { analyzeCsvText } from '../src/api.ts';

describe('AnalyzeResult.mode', () => {
  it('reports binary for a 0/1 matrix', () => {
    expect(analyzeCsvText('Gene\tA\tB\ng1\t1\t0\ng2\t1\t1').mode).toBe('binary');
  });
  it('reports aggregated for a one-set-per-column file', () => {
    expect(analyzeCsvText('SetA,SetB\nx,y\ny,z').mode).toBe('aggregated');
  });
});
