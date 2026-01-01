export interface CsvData {
  headers: string[];
  rows: string[][];
}

/** Split a CSV line respecting quoted fields (handles commas inside quotes) */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsv(text: string): CsvData {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1)
    .filter(line => line.trim() !== '')
    .map(line => splitCsvLine(line));
  return { headers, rows };
}

/**
 * Calculate Venn region counts from binary (0/1) columns.
 * selectedColumns: indices into headers for the sets (A, B, C, ...)
 * Returns a Map: region label (e.g., "AB") → count of rows where exactly those columns are 1.
 * Also returns intersection counts (rows where ALL specified columns are 1, regardless of others).
 */
export interface VennResult {
  /** Inclusive counts: rows where ALL sets in the label are 1 (regardless of others) */
  inclusive: Map<string, number>;
  /** Exclusive counts: rows where EXACTLY these sets are 1, no others */
  exclusive: Map<string, number>;
  /** Items per inclusive region (for Name/CountSUM clicks) */
  inclusiveItems: Map<string, string[]>;
  /** Items per exclusive region (for Count value display) */
  exclusiveItems: Map<string, string[]>;
}

export function calculateVennCounts(
  csv: CsvData,
  selectedColumns: number[],
): VennResult {
  const n = selectedColumns.length;
  const letters = 'ABCDEFGH'.slice(0, n).split('');

  const inclusive = new Map<string, number>();
  const exclusive = new Map<string, number>();
  const inclusiveItems = new Map<string, string[]>();
  const exclusiveItems = new Map<string, string[]>();

  // Initialize all 2^n - 1 regions
  for (let mask = 1; mask < (1 << n); mask++) {
    const label = letters.filter((_, i) => mask & (1 << i)).join('');
    inclusive.set(label, 0);
    exclusive.set(label, 0);
    inclusiveItems.set(label, []);
    exclusiveItems.set(label, []);
  }

  for (const row of csv.rows) {
    let rowMask = 0;
    for (let i = 0; i < n; i++) {
      const val = row[selectedColumns[i]];
      if (val === '1' || val?.toLowerCase() === 'true' || val?.toLowerCase() === 'yes') {
        rowMask |= (1 << i);
      }
    }
    if (rowMask === 0) continue;

    const title = row[0] ?? '';

    // Exclusive: only the exact mask
    const exLabel = letters.filter((_, i) => rowMask & (1 << i)).join('');
    exclusive.set(exLabel, (exclusive.get(exLabel) ?? 0) + 1);
    exclusiveItems.get(exLabel)?.push(title);

    // Inclusive: every subset of rowMask
    for (let mask = 1; mask < (1 << n); mask++) {
      if ((rowMask & mask) === mask) {
        const label = letters.filter((_, i) => mask & (1 << i)).join('');
        inclusive.set(label, (inclusive.get(label) ?? 0) + 1);
        inclusiveItems.get(label)?.push(title);
      }
    }
  }

  return { inclusive, exclusive, inclusiveItems, exclusiveItems };
}

/**
 * Get list of numeric/binary columns suitable for Venn sets.
 */
export function getBinaryColumns(csv: CsvData): number[] {
  const result: number[] = [];
  for (let i = 0; i < csv.headers.length; i++) {
    // Check if all values in column are 0/1/true/false/yes/no
    const isBinary = csv.rows.every(row => {
      const v = row[i]?.toLowerCase();
      return v === '0' || v === '1' || v === 'true' || v === 'false' || v === 'yes' || v === 'no' || v === '';
    });
    if (isBinary && csv.rows.some(row => row[i] === '1' || row[i]?.toLowerCase() === 'true' || row[i]?.toLowerCase() === 'yes')) {
      result.push(i);
    }
  }
  return result;
}
