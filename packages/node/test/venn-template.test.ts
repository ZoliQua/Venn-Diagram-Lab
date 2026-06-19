import { describe, expect, it } from 'vitest';
import { fillVennTemplate, listVennModels, loadVennTemplate } from '../src/vennTemplate.ts';

describe('venn template loader', () => {
  it('lists the bundled model filenames', () => {
    const models = listVennModels();
    expect(models).toHaveLength(44);
    expect(models).toContain('venn-4-set.svg');
    expect(models).not.toContain('names-bar.svg');
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

describe('fillVennTemplate', () => {
  const tpl = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '<text id="Title" style="x">Venn 2-set diagram</text>',
    '<text id="NameA" style="y">NameA</text>',
    '<text id="NameB" style="y">NameB</text>',
    '<text id="Count_A" style="z">A</text>',
    '<text id="Count_B" style="z">B</text>',
    '<text id="Count_AB" style="z">AB</text>',
    '</svg>',
  ].join('\n');

  it('replaces Count_/Name/Title placeholders with real values', () => {
    const out = fillVennTemplate(tpl, {
      title: 'My title',
      setNames: ['Alpha', 'Beta'],
      counts: new Map([['A', 12], ['B', 7], ['AB', 3]]),
    });
    expect(out).toContain('>My title</text>');
    expect(out).toContain('id="NameA" style="y">Alpha<');
    expect(out).toContain('id="NameB" style="y">Beta<');
    expect(out).toContain('id="Count_A" style="z">12<');
    expect(out).toContain('id="Count_AB" style="z">3<');
    expect(out).not.toContain('>NameA</text>');
    expect(out).not.toContain('id="Count_AB" style="z">AB<');
  });

  it('escapes XML-special characters in values', () => {
    const out = fillVennTemplate(tpl, { setNames: ['A&B', 'B'], counts: new Map() });
    expect(out).toContain('id="NameA" style="y">A&amp;B<');
  });

  it('leaves placeholders for labels not in counts', () => {
    const out = fillVennTemplate(tpl, { setNames: ['A', 'B'], counts: new Map([['A', 1]]) });
    expect(out).toContain('id="Count_B" style="z">B<');
  });

  it('fills CountSUM_<label> when countSums provided', () => {
    const tplWithSum = [
      '<svg xmlns="http://www.w3.org/2000/svg">',
      '<text id="NameA" style="y">NameA</text>',
      '<text id="CountSUM_A" style="s">CountSUM_A</text>',
      '</svg>',
    ].join('\n');
    const out = fillVennTemplate(tplWithSum, {
      setNames: ['X'],
      counts: new Map(),
      countSums: new Map([['A', 42]]),
    });
    expect(out).toContain('id="CountSUM_A" style="s">42<');
  });
});
