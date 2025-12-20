import type { VennDocument } from '../types.ts';

export interface Region {
  label: string;
  shapeIds: string[];
  countTextId: string;
  hasCountText: boolean;
  countValue: string | null;
}

/**
 * Generate all 2^n - 1 non-empty subsets of shape letters.
 * Sorted by subset size, then alphabetically.
 */
export function getAllRegions(doc: VennDocument): Region[] {
  const letters = doc.shapes
    .map(s => s.id.replace('Shape', ''))
    .filter(l => /^[A-H]$/.test(l))
    .sort();
  const regions: Region[] = [];
  const n = letters.length;

  for (let mask = 1; mask < (1 << n); mask++) {
    const subset: string[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(letters[i]);
    }
    const label = subset.join('');
    const countTextId = `Count_${label}`;
    const countText = doc.texts.values.find(t => t.id === countTextId);
    regions.push({
      label,
      shapeIds: subset.map(l => `Shape${l}`),
      countTextId,
      hasCountText: !!countText,
      countValue: countText?.content ?? null,
    });
  }

  regions.sort((a, b) => a.label.length - b.label.length || a.label.localeCompare(b.label));
  return regions;
}
