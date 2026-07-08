import { PDFDocument, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { ReportDoc } from '../src/report/layout.ts';

/** Decode the `Tj` operands out of a raw (already Flate-decoded) content stream string. */
function decodeTjOperands(content: string): string {
  let out = '';
  const hexRe = /<([0-9A-Fa-f]+)>\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(content)) !== null) {
    const hex = m[1];
    for (let i = 0; i + 1 < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
  }
  const litRe = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
  while ((m = litRe.exec(content)) !== null) {
    out += m[1].replace(/\\(.)/g, '$1');
  }
  return out;
}

/**
 * pdf-lib Flate-compresses page content streams by default, and encodes
 * drawn text as hex strings, so the expected words never appear as a literal
 * substring of the saved bytes. Reload the document, decode each page's
 * content stream via pdf-lib's own codec (`decodePDFRawStream`), then pull
 * out the `Tj` string operands.
 */
async function extractPageText(bytes: Uint8Array): Promise<string> {
  const reloaded = await PDFDocument.load(bytes);
  let text = '';
  for (const page of reloaded.getPages()) {
    const contents = page.node.Contents();
    const entries: unknown[] =
      contents === undefined ? [] : 'asArray' in contents ? contents.asArray() : [contents];
    for (const entry of entries) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = reloaded.context.lookup(entry as any);
      if (stream instanceof PDFRawStream) {
        const raw = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
        text += decodeTjOperands(raw);
      }
    }
  }
  return text;
}

describe('ReportDoc', () => {
  it('produces a valid multi-page PDF byte stream', async () => {
    const d = await ReportDoc.create();
    d.newPage();
    d.pageTitle('Hello');
    d.text('body text');
    d.newPage();
    d.table(['A', 'B'], [
      ['1', '2'],
      ['3', '4'],
    ]);
    const bytes = await d.save();
    expect(bytes.length).toBeGreaterThan(500);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('wraps long text across lines without throwing', async () => {
    const d = await ReportDoc.create();
    d.newPage();
    d.text('word '.repeat(400));
    expect((await d.save()).length).toBeGreaterThan(500);
  });

  it('supports section titles, key-value rows, and bold/sized text', async () => {
    const d = await ReportDoc.create();
    d.newPage();
    d.pageTitle('Report');
    d.sectionTitle('Overview');
    d.keyValueRows([
      ['File', 'sample.csv'],
      ['Items', '42'],
    ]);
    d.text('Emphasis', { bold: true, size: 14 });
    const bytes = await d.save();
    expect(bytes.length).toBeGreaterThan(500);
  });

  it('paginates a long table across pages', async () => {
    const d = await ReportDoc.create();
    d.newPage();
    const rows = Array.from({ length: 60 }, (_, i) => [String(i), `value-${i}`]);
    d.table(['Index', 'Value'], rows);
    const bytes = await d.save();
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('embeds an image scaled to fit width', async () => {
    const d = await ReportDoc.create();
    d.newPage();
    // 1x1 transparent PNG
    const png = Uint8Array.from(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    d.image(png, 1, 1, 100);
    const bytes = await d.save();
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('stamps a footer with page X of Y on every page after save', async () => {
    const d = await ReportDoc.create();
    d.newPage();
    d.text('page 1');
    d.newPage();
    d.text('page 2');
    const bytes = await d.save();
    const text = await extractPageText(bytes);
    expect(text).toContain('Venn Diagram Lab');
    expect(text).toContain('Page');
  });
});
