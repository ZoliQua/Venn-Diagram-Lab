import { describe, expect, it } from 'vitest';
import { parseExcelFile, listExcelSheets } from '../index.ts';
import type { Workbook } from 'exceljs';

async function buildBuffer(fn: (wb: Workbook) => void): Promise<ArrayBuffer> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  fn(wb);
  const buf = await wb.xlsx.writeBuffer();
  const view = new Uint8Array(buf);
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
}

describe('parseExcelFile', () => {
  it('parses a binary 0/1 matrix', async () => {
    const buffer = await buildBuffer((wb) => {
      const ws = wb.addWorksheet('Binary');
      ws.addRow(['Gene', 'A', 'B', 'C']);
      ws.addRow(['g1', 1, 0, 1]);
      ws.addRow(['g2', 1, 1, 0]);
      ws.addRow(['g3', 0, 1, 1]);
    });

    const data = await parseExcelFile(buffer);
    expect(data.headers).toEqual(['Gene', 'A', 'B', 'C']);
    expect(data.rows).toEqual([
      ['g1', '1', '0', '1'],
      ['g2', '1', '1', '0'],
      ['g3', '0', '1', '1'],
    ]);
  });

  it('parses an aggregated gene-list sheet', async () => {
    const buffer = await buildBuffer((wb) => {
      const ws = wb.addWorksheet('Aggregated');
      ws.addRow(['Set A', 'Set B', 'Set C']);
      ws.addRow(['TP53', 'BRCA1', 'EGFR']);
      ws.addRow(['BRCA2', 'TP53', '']);
      ws.addRow(['', 'MYC', 'PTEN']);
    });

    const data = await parseExcelFile(buffer);
    expect(data.headers).toEqual(['Set A', 'Set B', 'Set C']);
    expect(data.rows).toEqual([
      ['TP53', 'BRCA1', 'EGFR'],
      ['BRCA2', 'TP53', ''],
      ['', 'MYC', 'PTEN'],
    ]);
  });

  it('lists and parses multi-sheet workbooks by name and index', async () => {
    const buffer = await buildBuffer((wb) => {
      const ws1 = wb.addWorksheet('Alpha');
      ws1.addRow(['Key', 'Value']);
      ws1.addRow(['a', '1']);

      const ws2 = wb.addWorksheet('Beta');
      ws2.addRow(['Name', 'Count']);
      ws2.addRow(['x', '42']);
    });

    const sheets = await listExcelSheets(buffer);
    expect(sheets).toEqual([
      { name: 'Alpha', index: 0 },
      { name: 'Beta', index: 1 },
    ]);

    const byName = await parseExcelFile(buffer, { sheet: 'Beta' });
    expect(byName.headers).toEqual(['Name', 'Count']);
    expect(byName.rows).toEqual([['x', '42']]);

    const byIndex = await parseExcelFile(buffer, { sheet: 0 });
    expect(byIndex.headers).toEqual(['Key', 'Value']);
    expect(byIndex.rows).toEqual([['a', '1']]);
  });

  it('throws on an empty sheet', async () => {
    const buffer = await buildBuffer((wb) => {
      wb.addWorksheet('Empty');
    });

    await expect(parseExcelFile(buffer)).rejects.toThrow('Excel sheet is empty');
  });

  it('throws on a header-only sheet', async () => {
    const buffer = await buildBuffer((wb) => {
      const ws = wb.addWorksheet('HeadersOnly');
      ws.addRow(['A', 'B', 'C']);
    });

    await expect(parseExcelFile(buffer)).rejects.toThrow('Excel sheet has only a header row');
  });

  it('parses more than 9 columns without error', async () => {
    const buffer = await buildBuffer((wb) => {
      const ws = wb.addWorksheet('Wide');
      const headers = Array.from({ length: 11 }, (_, i) => `Col ${i + 1}`);
      ws.addRow(headers);
      ws.addRow(Array.from({ length: 11 }, (_, i) => `v${i + 1}`));
    });

    const data = await parseExcelFile(buffer);
    expect(data.headers).toHaveLength(11);
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]).toHaveLength(11);
  });

  it('skips fully empty rows and pads shorter rows', async () => {
    const buffer = await buildBuffer((wb) => {
      const ws = wb.addWorksheet('Gaps');
      ws.addRow(['A', 'B', 'C']);
      ws.addRow(['1', '2']);
      ws.addRow([]);
      ws.addRow(['4', '', '6']);
    });

    const data = await parseExcelFile(buffer);
    expect(data.rows).toEqual([
      ['1', '2', ''],
      ['4', '', '6'],
    ]);
  });

  it('reads a date-typed cell as an ISO date, not a verbose JS Date string', async () => {
    const buffer = await buildBuffer((wb) => {
      const ws = wb.addWorksheet('S1');
      ws.addRow(['id', 'A']);
      const r = ws.addRow(['x', null]);
      r.getCell(2).value = new Date(Date.UTC(2024, 5, 12)); // simulates SEPT2 -> date
    });

    const { rows } = await parseExcelFile(buffer);
    expect(rows[0][1]).toBe('2024-06-12');
    expect(rows[0][1]).not.toMatch(/GMT|Coordinated/);
  });

  it('does not duplicate a merged header across the span', async () => {
    const buffer = await buildBuffer((wb) => {
      const ws = wb.addWorksheet('S1');
      ws.addRow(['id', 'Group', '']);
      ws.mergeCells('B1:C1');
      ws.addRow(['x', '1', '0']);
    });

    const { headers } = await parseExcelFile(buffer);
    expect(headers.filter(h => h === 'Group').length).toBe(1);
  });
});
