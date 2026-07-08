import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

/** Letter portrait page size, in points. */
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_HEIGHT = 24;
const BOTTOM_LIMIT = MARGIN + FOOTER_HEIGHT;

const TEXT_COLOR = rgb(0.1, 0.1, 0.1);
const RULE_COLOR = rgb(0.6, 0.6, 0.6);
const HEADER_FILL = rgb(0.92, 0.92, 0.94);
const FOOTER_COLOR = rgb(0.45, 0.45, 0.45);

export interface TextOptions {
  /** Use the bold font. Default false. */
  bold?: boolean;
  /** Font size in points. Default 10. */
  size?: number;
  /** Line color override (rarely needed). Default near-black. */
  color?: ReturnType<typeof rgb>;
}

export interface TableOptions {
  /** Font size for the table body. Default 9. */
  size?: number;
  /** Column widths in points; defaults to equal split of the content width. */
  columnWidths?: number[];
  /** Row height in points. Default 18. */
  rowHeight?: number;
}

/**
 * Reusable pdf-lib layout scaffolding for the Node package's PDF reports.
 *
 * Wraps a `PDFDocument` with an embedded Helvetica + Helvetica-Bold font pair
 * and a page cursor, exposing simple primitives (titles, wrapped text,
 * key/value rows, paginated tables, images, and a stamped footer) that the
 * report-composition layer (Task C3) builds on.
 */
export class ReportDoc {
  private readonly doc: PDFDocument;
  private readonly font: PDFFont;
  private readonly boldFont: PDFFont;
  /** Set on the first `newPage()` call; every drawing method requires it to exist. */
  private page!: PDFPage;
  /** Distance from the top of the page to the current write cursor. */
  private cursorY = 0;
  /** Deferred async image-embed operations, resolved in `save()`. */
  private pendingImageOps: Array<() => Promise<void>> = [];

  private constructor(doc: PDFDocument, font: PDFFont, boldFont: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.boldFont = boldFont;
    // No page is created here — callers start each page explicitly via
    // `newPage()`, matching the ReportDoc usage pattern (create() then
    // newPage() before drawing anything).
  }

  /** Create a new report document. Call `newPage()` before drawing anything. */
  static async create(): Promise<ReportDoc> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    return new ReportDoc(doc, font, boldFont);
  }

  /** Current cursor position, for callers that need to know how much room is left. */
  get cursor(): number {
    return this.cursorY;
  }

  /** How many points remain above the bottom margin (footer-reserved). */
  get remainingHeight(): number {
    return this.cursorY - BOTTOM_LIMIT;
  }

  /** Number of pages created so far. */
  get pageCount(): number {
    return this.doc.getPageCount();
  }

  /** Start a fresh page and reset the cursor to the top margin. */
  newPage(): void {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.cursorY = PAGE_HEIGHT - MARGIN;
  }

  /** Ensure at least `needed` points remain before the bottom margin, adding a page if not. */
  private ensureSpace(needed: number): void {
    if (this.cursorY - needed < BOTTOM_LIMIT) {
      this.newPage();
    }
  }

  /** Draw a large page title and advance the cursor. */
  pageTitle(text: string): void {
    this.ensureSpace(28);
    this.page.drawText(text, {
      x: MARGIN,
      y: this.cursorY - 20,
      size: 20,
      font: this.boldFont,
      color: TEXT_COLOR,
    });
    this.cursorY -= 34;
  }

  /** Draw a section heading and advance the cursor. */
  sectionTitle(text: string): void {
    this.ensureSpace(20);
    this.page.drawText(text, {
      x: MARGIN,
      y: this.cursorY - 13,
      size: 13,
      font: this.boldFont,
      color: TEXT_COLOR,
    });
    this.cursorY -= 22;
  }

  /** Word-wrap `value` to fit within `maxWidth` at the given font/size. */
  private wrapLines(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = value.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return [''];

    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current.length === 0 ? word : `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || current.length === 0) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current.length > 0) lines.push(current);
    return lines;
  }

  /** Draw word-wrapped body text, advancing the cursor one line height per line. */
  text(value: string, opts: TextOptions = {}): void {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.boldFont : this.font;
    const color = opts.color ?? TEXT_COLOR;
    const lineHeight = size * 1.4;

    const lines = this.wrapLines(value, font, size, CONTENT_WIDTH);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.page.drawText(line, {
        x: MARGIN,
        y: this.cursorY - size,
        size,
        font,
        color,
      });
      this.cursorY -= lineHeight;
    }
  }

  /** Draw a two-column list of label/value pairs (e.g. metadata). */
  keyValueRows(rows: [string, string][]): void {
    const size = 10;
    const lineHeight = size * 1.6;
    const labelWidth = CONTENT_WIDTH * 0.32;

    for (const [label, value] of rows) {
      this.ensureSpace(lineHeight);
      this.page.drawText(label, {
        x: MARGIN,
        y: this.cursorY - size,
        size,
        font: this.boldFont,
        color: TEXT_COLOR,
      });
      this.page.drawText(value, {
        x: MARGIN + labelWidth,
        y: this.cursorY - size,
        size,
        font: this.font,
        color: TEXT_COLOR,
      });
      this.cursorY -= lineHeight;
    }
  }

  /**
   * Draw a simple ruled table with a shaded header row. Rows are paginated:
   * once the cursor would cross the bottom margin, a new page is started and
   * the header row is repeated.
   */
  table(headers: string[], rows: string[][], opts: TableOptions = {}): void {
    const size = opts.size ?? 9;
    const rowHeight = opts.rowHeight ?? 18;
    const columnCount = headers.length;
    const columnWidths =
      opts.columnWidths ?? Array.from({ length: columnCount }, () => CONTENT_WIDTH / columnCount);

    const drawRow = (cells: string[], bold: boolean, fill?: ReturnType<typeof rgb>): void => {
      if (fill) {
        this.page.drawRectangle({
          x: MARGIN,
          y: this.cursorY - rowHeight,
          width: CONTENT_WIDTH,
          height: rowHeight,
          color: fill,
        });
      }
      let x = MARGIN;
      const font = bold ? this.boldFont : this.font;
      for (let i = 0; i < cells.length; i++) {
        this.page.drawText(cells[i] ?? '', {
          x: x + 4,
          y: this.cursorY - rowHeight + (rowHeight - size) / 2,
          size,
          font,
          color: TEXT_COLOR,
        });
        x += columnWidths[i] ?? CONTENT_WIDTH / columnCount;
      }
      this.page.drawLine({
        start: { x: MARGIN, y: this.cursorY - rowHeight },
        end: { x: MARGIN + CONTENT_WIDTH, y: this.cursorY - rowHeight },
        thickness: 0.5,
        color: RULE_COLOR,
      });
      this.cursorY -= rowHeight;
    };

    const drawHeader = (): void => {
      this.ensureSpace(rowHeight);
      drawRow(headers, true, HEADER_FILL);
    };

    drawHeader();
    for (const row of rows) {
      if (this.cursorY - rowHeight < BOTTOM_LIMIT) {
        this.newPage();
        drawHeader();
      }
      drawRow(row, false);
    }
  }

  /** Embed and draw a PNG, scaled so its width equals `fitWidth` (aspect preserved from `w`/`h`). */
  image(png: Uint8Array, w: number, h: number, fitWidth: number): void {
    const scale = fitWidth / w;
    const drawWidth = w * scale;
    const drawHeight = h * scale;
    this.ensureSpace(drawHeight);

    // `embedPng` is async but drawing must happen synchronously against the
    // page that is current *now*, not whichever page is current when the
    // queued op eventually runs. Capture the target page and y position up
    // front; the actual embed+draw is deferred to save() since embedPng needs
    // to await.
    const targetPage = this.page;
    const y = this.cursorY - drawHeight;
    this.pendingImageOps.push(async () => {
      const img = await this.doc.embedPng(png);
      targetPage.drawImage(img, {
        x: MARGIN,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    });
    this.cursorY -= drawHeight;
  }

  /** Draw the standard footer on the given page index (0-based) out of `total` pages. */
  footer(pageIndex: number, total: number): void {
    const page = this.doc.getPage(pageIndex);
    const label = `Venn Diagram Lab - Page ${pageIndex + 1} of ${total}`;
    const width = this.font.widthOfTextAtSize(label, 8);
    page.drawText(label, {
      x: PAGE_WIDTH - MARGIN - width,
      y: MARGIN / 2,
      size: 8,
      font: this.font,
      color: FOOTER_COLOR,
    });
  }

  /** Finalize the document: resolve pending image embeds, stamp footers on every page, and serialize to bytes. */
  async save(): Promise<Uint8Array> {
    for (const op of this.pendingImageOps) {
      await op();
    }
    this.pendingImageOps = [];

    const total = this.doc.getPageCount();
    for (let i = 0; i < total; i++) {
      this.footer(i, total);
    }
    return this.doc.save();
  }
}
