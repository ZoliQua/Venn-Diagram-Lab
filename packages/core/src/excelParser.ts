import type { CsvData } from './csvParser.ts';
import type { Workbook, Worksheet } from 'exceljs';

export interface ExcelSheetInfo {
  name: string;
  index: number;
}

function cellToString(cell: { text: string }): string {
  return (cell.text ?? '').trim();
}

function pickWorksheet(workbook: Workbook, sheet?: number | string): Worksheet {
  if (sheet === undefined) {
    return workbook.worksheets[0];
  }
  if (typeof sheet === 'string') {
    const ws = workbook.getWorksheet(sheet);
    if (!ws) throw new Error(`Sheet "${sheet}" not found`);
    return ws;
  }
  const ws = workbook.worksheets[sheet];
  if (!ws) throw new Error(`Sheet at index ${sheet} not found`);
  return ws;
}

function isRowEmpty(cells: string[]): boolean {
  return cells.every(cell => cell === '');
}

/**
 * Parse an .xlsx workbook into a CsvData structure.
 *
 * The first non-empty row is treated as the header. Fully empty rows are skipped.
 * All rows are padded/truncated to the header width.
 */
export async function parseExcelFile(
  buffer: ArrayBuffer,
  opts?: { sheet?: number | string },
): Promise<CsvData> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = pickWorksheet(workbook, opts?.sheet);

  const rawRows: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cellToString(cell));
    });
    if (!isRowEmpty(cells)) {
      rawRows.push(cells);
    }
  });

  if (rawRows.length === 0) {
    throw new Error('Excel sheet is empty');
  }

  const headers = rawRows[0];
  const dataRows = rawRows.slice(1).filter(row => !isRowEmpty(row));

  if (dataRows.length === 0) {
    throw new Error('Excel sheet has only a header row');
  }

  const width = headers.length;
  const rows = dataRows.map(row => {
    const padded = row.slice(0, width);
    while (padded.length < width) {
      padded.push('');
    }
    return padded;
  });

  return { headers, rows };
}

/**
 * List available worksheet names and indices from an .xlsx workbook.
 */
export async function listExcelSheets(buffer: ArrayBuffer): Promise<ExcelSheetInfo[]> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  return workbook.worksheets.map((ws, index) => ({ name: ws.name, index }));
}
