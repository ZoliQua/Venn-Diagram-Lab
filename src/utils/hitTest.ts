/**
 * Shared shape-point containment detection.
 *
 * Primary: document.elementsFromPoint() — pixel-perfect for visible points.
 * Fallback: SVGGeometryElement.isPointInFill() — for off-viewport points.
 */

export function getContainingShapeIds(
  x: number,
  y: number,
  shapeIds: string[],
  svgSelector = '.canvas-svg'
): string[] {
  const svgRoot = document.querySelector(svgSelector) as SVGSVGElement | null;
  if (!svgRoot) return [];

  const rootCTM = svgRoot.getScreenCTM();
  if (!rootCTM) return [];

  const screenPt = new DOMPoint(x, y).matrixTransform(rootCTM);
  const shapeIdSet = new Set(shapeIds);
  const result: string[] = [];

  const inViewport = screenPt.x >= 0 && screenPt.y >= 0 &&
    screenPt.x <= window.innerWidth && screenPt.y <= window.innerHeight;

  if (inViewport) {
    const elementsAtPoint = document.elementsFromPoint(screenPt.x, screenPt.y);
    for (const el of elementsAtPoint) {
      if (el.id && shapeIdSet.has(el.id)) {
        result.push(el.id);
      }
    }
  } else {
    for (const id of shapeIds) {
      const el = document.getElementById(id) as unknown as SVGGeometryElement | null;
      if (!el || typeof el.isPointInFill !== 'function') continue;
      try {
        const shapeCTM = el.getScreenCTM();
        if (!shapeCTM) continue;
        const localPt = screenPt.matrixTransform(shapeCTM.inverse());
        if (el.isPointInFill(new DOMPoint(localPt.x, localPt.y))) {
          result.push(id);
        }
      } catch { /* skip */ }
    }
  }

  return result.sort();
}

/** Extract the letter from a shape ID like "ShapeA" → "A" */
export function shapeIdToLetter(id: string): string {
  return id.replace('Shape', '');
}

/** Extract expected shape letters from a Count ID like "Count_ACE" → ["A","C","E"] */
export function expectedLettersFromId(id: string): string[] {
  const match = id.match(/^Count_([A-H]+)$/);
  if (!match) return [];
  return match[1].split('');
}
