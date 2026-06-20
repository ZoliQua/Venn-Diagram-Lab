import { Resvg } from '@resvg/resvg-js';
import { PDFDocument } from 'pdf-lib';

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

export interface PdfOptions {
  /** Raster width in px before embedding (default 1200). */
  fitWidth?: number;
}

/** Render an SVG to PNG and embed it in a one-page PDF sized to the image. */
export async function svgToPdf(svg: string, opts: PdfOptions = {}): Promise<Uint8Array> {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: opts.fitWidth ?? 1200 },
    font: { loadSystemFonts: true },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  const { width, height } = rendered;
  const doc = await PDFDocument.create();
  const img = await doc.embedPng(new Uint8Array(png));
  const page = doc.addPage([width, height]);
  page.drawImage(img, { x: 0, y: 0, width, height });
  return doc.save();
}
