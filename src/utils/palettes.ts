// src/utils/palettes.ts
// Curated qualitative color palettes for Venn set colors. All values are
// published palette hex codes (facts). "Standard" is this project's own
// long-standing 9-color set mapping.
export type PaletteId =
  | 'standard' | 'okabe-ito' | 'brewer-set2' | 'brewer-dark2'
  | 'brewer-pastel1' | 'tableau10';

export interface Palette {
  id: PaletteId;
  name: string;
  colors: string[]; // exactly 9, mapped to sets A..I
}

export const STANDARD_PALETTE_ID: PaletteId = 'standard';

export const PALETTES: Palette[] = [
  { id: 'standard', name: 'Standard', colors: [
    '#FFF200','#2E3192','#ED1C24','#808285','#3C2415','#9E1F63','#CA4B9B','#21AED1','#F7941E',
  ]},
  // Colorblind-safe (Okabe & Ito, 2008). 8 chromatic + neutral grey as the 9th (our own extension).
  { id: 'okabe-ito', name: 'Colorblind-safe (Okabe-Ito)', colors: [
    '#E69F00','#56B4E9','#009E73','#F0E442','#0072B2','#D55E00','#CC79A7','#000000','#999999',
  ]},
  // ColorBrewer Set2, 8-class qualitative + neutral grey as the 9th (our own extension).
  { id: 'brewer-set2', name: 'Soft (Set2)', colors: [
    '#66C2A5','#FC8D62','#8DA0CB','#E78AC3','#A6D854','#FFD92F','#E5C494','#B3B3B3','#999999',
  ]},
  // ColorBrewer Dark2, 8-class qualitative + neutral grey as the 9th (our own extension).
  { id: 'brewer-dark2', name: 'Bold (Dark2)', colors: [
    '#1B9E77','#D95F02','#7570B3','#E7298A','#66A61E','#E6AB02','#A6761D','#666666','#999999',
  ]},
  // ColorBrewer Pastel1, 9-class qualitative (all 9 are canonical Pastel1 values).
  { id: 'brewer-pastel1', name: 'Pastel', colors: [
    '#FBB4AE','#B3CDE3','#CCEBC5','#DECBE4','#FED9A6','#FFFFCC','#E5D8BD','#FDDAEC','#F2F2F2',
  ]},
  // Tableau 10 categorical palette, first 9 of the 10 official colors (10th, grey #BAB0AC, omitted).
  { id: 'tableau10', name: 'Modern (Tableau)', colors: [
    '#4E79A7','#F28E2B','#E15759','#76B7B2','#59A14F','#EDC948','#B07AA1','#FF9DA7','#9C755F',
  ]},
];

const LETTERS = ['A','B','C','D','E','F','G','H','I'];

export function paletteColorMap(id: PaletteId): Record<string, string> {
  const p = PALETTES.find(x => x.id === id) ?? PALETTES[0];
  const map: Record<string, string> = {};
  LETTERS.forEach((L, i) => { map[L] = p.colors[i]; });
  return map;
}
