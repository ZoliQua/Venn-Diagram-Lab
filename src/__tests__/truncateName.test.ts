import { describe, it, expect } from 'vitest';
import { truncateName } from '../utils/truncateName.ts';

describe('truncateName', () => {
  it('returns the raw name unchanged when maxChars >= length', () => {
    expect(truncateName('INTERFERON', 16)).toBe('INTERFERON');
    expect(truncateName('SHORT', 5)).toBe('SHORT');
    expect(truncateName('', 8)).toBe('');
  });

  it('truncates longer names to maxChars with an ellipsis', () => {
    // Length 26; cap at 16 → first 15 chars + '…' = 16 chars total
    const out = truncateName('INTERFERON_ALPHA_RESPONSE', 16);
    expect(out.length).toBe(16);
    expect(out.endsWith('…')).toBe(true);
    expect(out.slice(0, 15)).toBe('INTERFERON_ALPH');
  });

  it('is idempotent when re-applied with the same cap', () => {
    const out1 = truncateName('COSMIC_CANCER_GENE_CENSUS', 12);
    const out2 = truncateName(out1, 12);
    expect(out2).toBe(out1);
  });

  it('treats non-positive or non-finite maxChars as "no truncation"', () => {
    expect(truncateName('ABCD', 0)).toBe('ABCD');
    expect(truncateName('ABCD', -1)).toBe('ABCD');
    expect(truncateName('ABCD', Number.NaN)).toBe('ABCD');
    expect(truncateName('ABCD', Number.POSITIVE_INFINITY)).toBe('ABCD');
  });

  it('collapses to just the ellipsis when maxChars === 1', () => {
    expect(truncateName('WHATEVER', 1)).toBe('…');
  });

  it('produces exactly maxChars characters for 16-cap on long inputs', () => {
    const long = 'A'.repeat(40);
    const out = truncateName(long, 16);
    expect(out.length).toBe(16);
    expect(out).toBe('A'.repeat(15) + '…');
  });
});
