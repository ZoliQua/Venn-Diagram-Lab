// src/__tests__/palettes.test.ts
import { describe, it, expect } from 'vitest';
import { PALETTES, paletteColorMap, STANDARD_PALETTE_ID } from '../utils/palettes.ts';

const LETTERS = ['A','B','C','D','E','F','G','H','I'];

describe('palettes', () => {
  it('defines exactly 6 palettes with unique ids', () => {
    expect(PALETTES).toHaveLength(6);
    expect(new Set(PALETTES.map(p => p.id)).size).toBe(6);
  });

  it('every palette has exactly 9 valid #RRGGBB colors', () => {
    for (const p of PALETTES) {
      expect(p.colors, p.id).toHaveLength(9);
      for (const c of p.colors) expect(c, `${p.id} ${c}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('the standard palette equals the current default set colors', () => {
    const std = paletteColorMap(STANDARD_PALETTE_ID);
    expect(std).toEqual({
      A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
      E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1', I: '#F7941E',
    });
  });

  it('paletteColorMap maps the 9 colors to letters A..I in order', () => {
    for (const p of PALETTES) {
      const map = paletteColorMap(p.id);
      LETTERS.forEach((L, i) => expect(map[L]).toBe(p.colors[i]));
    }
  });
});
