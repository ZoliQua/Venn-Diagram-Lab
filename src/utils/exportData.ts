import type { VennResult } from './csvParser.ts';

const FORMULA_PREFIX_RE = /^[\t\r ]*[=+\-@]/;

export function escapeSpreadsheetCell(value: string): string {
  return FORMULA_PREFIX_RE.test(value) ? `'${value}` : value;
}

/**
 * FORMAT A: Region Summary TSV
 * Columns: Region | Sets | Depth | Exclusive_Count | Inclusive_Count | Exclusive_Pct | Items
 */
export function exportRegionSummaryTsv(
  result: VennResult,
  n: number,
  setNames: string[],
  totalItems: number,
): string {
  const letters = 'ABCDEFGHI'.slice(0, n).split('');
  const header = [
    'Region', 'Sets', 'Depth',
    'Exclusive_Count', 'Inclusive_Count',
    'Exclusive_Pct', 'Items'
  ].join('\t');

  const rows: string[] = [];

  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = letters.filter((_, i) => mask & (1 << i));
    const label = subset.join('');
    const setLabels = subset
      .map(l => escapeSpreadsheetCell(setNames[l.charCodeAt(0) - 65] ?? l))
      .join(' \u2229 ');
    const exCount = result.exclusive.get(label) ?? 0;
    const inCount = result.inclusive.get(label) ?? 0;
    const pct = totalItems > 0 ? (exCount / totalItems * 100).toFixed(2) : '0.00';
    const items = (result.exclusiveItems.get(label) ?? [])
      .map(escapeSpreadsheetCell)
      .join(';');

    rows.push([label, setLabels, subset.length, exCount, inCount, pct, items].join('\t'));
  }

  rows.sort((a, b) => {
    const dA = parseInt(a.split('\t')[2]);
    const dB = parseInt(b.split('\t')[2]);
    return dA - dB || a.localeCompare(b);
  });

  return [header, ...rows].join('\n');
}

/**
 * FORMAT B: Item Matrix TSV
 * Columns: Item | SetA_name | SetB_name | ... | Region
 */
export function exportMatrixTsv(
  result: VennResult,
  n: number,
  setNames: string[],
): string {
  const letters = 'ABCDEFGHI'.slice(0, n).split('');
  const headerCols = ['Item', ...letters.map((l, i) => escapeSpreadsheetCell(setNames[i] ?? l)), 'Region'];
  const header = headerCols.join('\t');

  const rows: string[] = [];

  for (const [label, items] of result.exclusiveItems) {
    for (const item of items) {
      const membership = letters.map(l => label.includes(l) ? '1' : '0');
      rows.push([escapeSpreadsheetCell(item), ...membership, label].join('\t'));
    }
  }

  return [header, ...rows].join('\n');
}

/** Download a text file with BOM for Excel UTF-8 compatibility */
export function downloadFile(content: string, filename: string, mimeType = 'text/tab-separated-values'): void {
  const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
