/**
 * Convert an SVG element to a PNG data URL via offscreen canvas.
 */
export async function svgElementToDataUrl(
  svgEl: SVGSVGElement,
  opts?: { scale?: number; background?: string },
): Promise<{ dataUrl: string; width: number; height: number }> {
  const scale = opts?.scale ?? 2;
  const background = opts?.background ?? '#ffffff';

  // Clone and clean up interactive elements
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('.selection-rect, [data-hover]').forEach(el => el.remove());
  clone.querySelectorAll('[style*="stroke-width: 3"]').forEach(el => {
    (el as SVGElement).style.removeProperty('stroke-width');
  });

  // Read viewBox dimensions for consistent sizing
  const vbAttr = clone.getAttribute('viewBox');
  const vbParts = vbAttr?.split(/\s+/).map(Number);
  const w = vbParts && vbParts.length === 4 ? vbParts[2] : parseFloat(clone.getAttribute('width') ?? '700');
  const h = vbParts && vbParts.length === 4 ? vbParts[3] : parseFloat(clone.getAttribute('height') ?? '700');

  // Ensure explicit dimensions on the clone for Image rendering
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));

  // Serialize to blob URL
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: w * scale, height: h * scale });
    };
    img.onerror = () => { URL.revokeObjectURL(svgUrl); reject(new Error('SVG image load failed')); };
    img.src = svgUrl;
  });
}

/**
 * Convert an SVG string to a PNG data URL (for offscreen SVGs not in DOM).
 */
export async function svgStringToDataUrl(
  svgString: string,
  opts?: { scale?: number; background?: string },
): Promise<{ dataUrl: string; width: number; height: number }> {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = svgDoc.documentElement as unknown as SVGSVGElement;
  return svgElementToDataUrl(svgEl, opts);
}
