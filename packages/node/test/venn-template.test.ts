import { describe, expect, it } from 'vitest';
import { listVennModels, loadVennTemplate } from '../src/vennTemplate.ts';

describe('venn template loader', () => {
  it('lists the bundled model filenames', () => {
    const models = listVennModels();
    expect(models.length).toBeGreaterThanOrEqual(44);
    expect(models).toContain('venn-4-set.svg');
  });

  it('loads a template by filename (with or without .svg)', () => {
    const a = loadVennTemplate('venn-4-set.svg');
    const b = loadVennTemplate('venn-4-set');
    expect(a).toBe(b);
    expect(a).toContain('id="Count_ABCD"');
    expect(a).toContain('<svg');
  });

  it('throws for an unknown model', () => {
    expect(() => loadVennTemplate('does-not-exist')).toThrow(/model|not found/i);
  });
});
