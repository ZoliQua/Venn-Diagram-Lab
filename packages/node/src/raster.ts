import { Resvg } from '@resvg/resvg-js';

export interface PngOptions {
  /** Render width in px (height scales to preserve aspect ratio). */
  fitWidth?: number;
}

/** Rasterize an SVG string to a PNG (Uint8Array). */
export function svgToPng(svg: string, opts: PngOptions = {}): Uint8Array {
  const resvg = new Resvg(svg, {
    fitTo: opts.fitWidth ? { mode: 'width', value: opts.fitWidth } : { mode: 'original' },
    font: { loadSystemFonts: true },
  });
  return resvg.render().asPng();
}
