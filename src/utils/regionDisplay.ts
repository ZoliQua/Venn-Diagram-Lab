// Shared "is this region empty?" test for the Hide-empty-regions feature.
//
// Region counts are always rendered as `String(nonNegativeInteger)`, so a
// zero region's count string is exactly "0" (and an absent override means no
// items). Plain string equality is therefore the precise test — and using ONE
// helper across the Layer-view label filter (Canvas), the Cut-view path skip
// (CutViewCanvas), and the SVG serializer (saveSvg) guarantees all three
// surfaces hide exactly the same regions, with no chance of drift.
export function isEmptyCountValue(content: string | undefined | null): boolean {
  return content == null || content.trim() === '0';
}
