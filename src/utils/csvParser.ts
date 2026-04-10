export interface CsvData {
  headers: string[];
  rows: string[][];
}

export type FileType = 'binary' | 'aggregated';
export type Delimiter = ',' | ';' | ' ' | '\t';
export type GeneSetFormat = 'gmt' | 'gmx' | null;

export interface GeneSetMeta {
  format: GeneSetFormat;
  descriptions: Record<string, string>;
}

export interface CsvImportResult {
  csv: CsvData;
  fileType: FileType;
  selectedColumns: number[];
  itemDelimiter?: Delimiter;
  hasHeader: boolean;
  geneSetMeta?: GeneSetMeta;
}

/** Split a CSV line respecting quoted fields, with configurable delimiter */
export function splitCsvLineWithDelimiter(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** Legacy comma-only splitter (calls general version) */
function splitCsvLine(line: string): string[] {
  return splitCsvLineWithDelimiter(line, ',');
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

/** Parse CSV with configurable delimiter and optional header */
export function parseCsvWithDelimiter(text: string, delimiter: Delimiter, hasHeader: boolean = true): CsvData {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 1) throw new Error('CSV file is empty');

  if (hasHeader) {
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');
    const headers = splitCsvLineWithDelimiter(lines[0], delimiter);
    const rows = lines.slice(1)
      .filter(line => line.trim() !== '')
      .map(line => splitCsvLineWithDelimiter(line, delimiter));
    return { headers, rows };
  } else {
    const allRows = lines
      .filter(line => line.trim() !== '')
      .map(line => splitCsvLineWithDelimiter(line, delimiter));
    if (allRows.length === 0) throw new Error('CSV file has no data rows');
    const colCount = allRows[0].length;
    const headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
    return { headers, rows: allRows };
  }
}

/** Auto-detect delimiter from first few lines */
export function detectDelimiter(text: string): Delimiter {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').slice(0, 5);
  if (lines.length === 0) return ',';

  const candidates: Delimiter[] = [',', ';', '\t', ' '];
  let bestDelimiter: Delimiter = ',';
  let bestScore = -1;

  for (const d of candidates) {
    const counts = lines.map(line => {
      // Count delimiter occurrences outside quotes
      let count = 0;
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === d && !inQuotes) count++;
      }
      return count;
    });
    // Score: consistent count across lines, and at least 1
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    if (min >= 1 && max - min <= 1) {
      const score = min * 10 + (max === min ? 5 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = d;
      }
    }
  }
  return bestDelimiter;
}

/** Get preview rows (parsed with delimiter, first N rows) */
export function getPreviewRows(text: string, delimiter: Delimiter, maxRows: number = 5): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLineWithDelimiter(lines[0], delimiter);
  const rows = lines.slice(1, 1 + maxRows)
    .filter(line => line.trim() !== '')
    .map(line => splitCsvLineWithDelimiter(line, delimiter));
  return { headers, rows };
}

/** Validate that selected columns contain only binary values */
export function validateBinaryColumns(csv: CsvData, columns: number[]): string | null {
  if (columns.length < 2) return 'At least 2 data columns must be selected';

  for (const colIdx of columns) {
    if (colIdx < 0 || colIdx >= csv.headers.length) return `Column index ${colIdx} out of range`;
    const header = csv.headers[colIdx];
    let hasTrue = false;
    for (const row of csv.rows) {
      const v = (row[colIdx] ?? '').toLowerCase().trim();
      if (v === '') continue;
      if (v === '1' || v === 'true' || v === 'yes') { hasTrue = true; continue; }
      if (v === '0' || v === 'false' || v === 'no') continue;
      return `Column "${header}" contains invalid value "${row[colIdx]}" (expected 0/1/true/false/yes/no)`;
    }
    if (!hasTrue) return `Column "${header}" has no truthy values (all 0 or empty)`;
  }
  return null;
}

/** Validate that selected columns contain non-empty string values */
export function validateAggregatedColumns(csv: CsvData, columns: number[]): string | null {
  if (columns.length < 2) return 'At least 2 data columns must be selected';

  for (const colIdx of columns) {
    if (colIdx < 0 || colIdx >= csv.headers.length) return `Column index ${colIdx} out of range`;
    const header = csv.headers[colIdx];
    const hasContent = csv.rows.some(row => (row[colIdx] ?? '').trim() !== '');
    if (!hasContent) return `Column "${header}" is completely empty`;
  }
  return null;
}

/**
 * Calculate Venn counts from aggregated (list-based) columns.
 * Each column = a set. Each cell contains item names (one per cell, or multiple separated by itemDelimiter).
 * Items appearing in multiple columns create intersections.
 */
export function calculateVennCountsFromAggregated(
  csv: CsvData,
  selectedColumns: number[],
  itemDelimiter: Delimiter = ',',
): VennResult {
  const n = selectedColumns.length;
  const letters = 'ABCDEFGHI'.slice(0, n).split('');

  // Collect items per set
  const sets: Set<string>[] = selectedColumns.map(() => new Set<string>());
  for (const row of csv.rows) {
    for (let i = 0; i < n; i++) {
      const cell = (row[selectedColumns[i]] ?? '').trim();
      if (!cell) continue;
      // Split cell by item delimiter
      const items = cell.split(itemDelimiter).map(s => s.trim()).filter(s => s);
      for (const item of items) {
        sets[i].add(item);
      }
    }
  }

  // Build item → bitmask map
  const allItems = new Set<string>();
  for (const s of sets) for (const item of s) allItems.add(item);

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

  for (const item of allItems) {
    let itemMask = 0;
    for (let i = 0; i < n; i++) {
      if (sets[i].has(item)) itemMask |= (1 << i);
    }
    if (itemMask === 0) continue;

    // Exclusive
    const exLabel = letters.filter((_, i) => itemMask & (1 << i)).join('');
    exclusive.set(exLabel, (exclusive.get(exLabel) ?? 0) + 1);
    exclusiveItems.get(exLabel)?.push(item);

    // Inclusive
    for (let mask = 1; mask < (1 << n); mask++) {
      if ((itemMask & mask) === mask) {
        const label = letters.filter((_, i) => mask & (1 << i)).join('');
        inclusive.set(label, (inclusive.get(label) ?? 0) + 1);
        inclusiveItems.get(label)?.push(item);
      }
    }
  }

  return { inclusive, exclusive, inclusiveItems, exclusiveItems, totalUniqueItems: allItems.size };
}

/**
 * Calculate Venn region counts from binary (0/1) columns.
 */
export interface VennResult {
  inclusive: Map<string, number>;
  exclusive: Map<string, number>;
  inclusiveItems: Map<string, string[]>;
  exclusiveItems: Map<string, string[]>;
  /**
   * Size of the hypergeometric background universe.
   * Binary mode: equals the number of data rows (one row per unique item).
   * Aggregated mode: equals |union of items across all mapped columns|
   * (not rows.length, which reflects the longest column after GMT padding).
   */
  totalUniqueItems: number;
}

export function calculateVennCounts(
  csv: CsvData,
  selectedColumns: number[],
): VennResult {
  const n = selectedColumns.length;
  const letters = 'ABCDEFGHI'.slice(0, n).split('');

  const inclusive = new Map<string, number>();
  const exclusive = new Map<string, number>();
  const inclusiveItems = new Map<string, string[]>();
  const exclusiveItems = new Map<string, string[]>();

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

    const exLabel = letters.filter((_, i) => rowMask & (1 << i)).join('');
    exclusive.set(exLabel, (exclusive.get(exLabel) ?? 0) + 1);
    exclusiveItems.get(exLabel)?.push(title);

    for (let mask = 1; mask < (1 << n); mask++) {
      if ((rowMask & mask) === mask) {
        const label = letters.filter((_, i) => mask & (1 << i)).join('');
        inclusive.set(label, (inclusive.get(label) ?? 0) + 1);
        inclusiveItems.get(label)?.push(title);
      }
    }
  }

  return { inclusive, exclusive, inclusiveItems, exclusiveItems, totalUniqueItems: csv.rows.length };
}

/**
 * Get list of numeric/binary columns suitable for Venn sets.
 */
export function getBinaryColumns(csv: CsvData): number[] {
  const result: number[] = [];
  for (let i = 0; i < csv.headers.length; i++) {
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

/** Detect gene set format from file extension */
export function detectGeneSetFormat(filename: string): GeneSetFormat {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'gmt') return 'gmt';
  if (ext === 'gmx') return 'gmx';
  return null;
}

/**
 * Parse GMT (Gene Matrix Transposed) format.
 * Each row = one gene set: setName\tdescription\tgene1\tgene2\t...
 * Returns CsvData with sets as columns (transposed) + metadata with descriptions.
 */
export function parseGmt(text: string): { csv: CsvData; meta: GeneSetMeta } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(l => l.trim());
  if (lines.length === 0) throw new Error('GMT file is empty');

  const sets: { name: string; description: string; genes: string[] }[] = [];

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const name = parts[0].trim();
    const description = parts[1].trim();
    const genes = parts.slice(2).map(g => g.trim()).filter(g => g);
    if (name) sets.push({ name, description, genes });
  }

  if (sets.length === 0) throw new Error('GMT file has no valid gene sets');

  const headers = sets.map(s => s.name);
  const descriptions: Record<string, string> = {};
  for (const s of sets) {
    if (s.description && s.description.toLowerCase() !== 'na') {
      descriptions[s.name] = s.description;
    }
  }

  const maxGenes = Math.max(...sets.map(s => s.genes.length));
  const rows: string[][] = [];
  for (let gi = 0; gi < maxGenes; gi++) {
    const row: string[] = [];
    for (const s of sets) {
      row.push(gi < s.genes.length ? s.genes[gi] : '');
    }
    rows.push(row);
  }

  return {
    csv: { headers, rows },
    meta: { format: 'gmt', descriptions },
  };
}

/**
 * Parse GMX (Gene MatriX) format.
 * Column-oriented: Row 1 = set names, Row 2 = descriptions, Row 3+ = genes.
 */
export function parseGmx(text: string): { csv: CsvData; meta: GeneSetMeta } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(l => l.trim());
  if (lines.length < 3) throw new Error('GMX file must have at least 3 rows (names, descriptions, genes)');

  const headers = lines[0].split('\t').map(h => h.trim());
  const descRow = lines[1].split('\t').map(d => d.trim());

  const descriptions: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const desc = descRow[i] ?? '';
    if (desc && desc.toLowerCase() !== 'na' && headers[i]) {
      descriptions[headers[i]] = desc;
    }
  }

  const rows: string[][] = [];
  for (let li = 2; li < lines.length; li++) {
    const parts = lines[li].split('\t').map(p => p.trim());
    while (parts.length < headers.length) parts.push('');
    rows.push(parts);
  }

  return {
    csv: { headers, rows },
    meta: { format: 'gmx', descriptions },
  };
}
