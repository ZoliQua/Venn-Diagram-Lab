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
  sourceFormat?: 'csv' | 'excel' | 'gmt' | 'gmx' | 'paste' | 'url';
  /** 0-based worksheet index, set for Excel (.xlsx) imports. Undefined for non-Excel sources. */
  sheetIndex?: number;
  /**
   * Data-quality analysis (duplicates / empty cells / case collisions) computed
   * over the final imported csv + selectedColumns. See {@link analyzeDataQuality}.
   * Purely informational — never affects the imported data itself.
   */
  quality?: DataQualityReport;
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
 * A read-only report of data-quality issues detected while scanning the selected
 * columns of a `CsvData`. This is a pure analysis pass — it never mutates `csv`,
 * never changes item identity, and never affects the results of
 * `calculateVennCounts` / `calculateVennCountsFromAggregated`. It exists to
 * surface, to the user, what those functions already do silently (dedupe via
 * `Set`, skip empty cells) plus a case-collision heads-up that the counting
 * functions deliberately do NOT act on (case-folding item identity is
 * dangerous — e.g. "TP53" vs "tp53" may or may not be the same real-world
 * entity, so identity is never merged automatically).
 *
 * Detection semantics (documented here precisely so Python/R mirror them):
 *
 * duplicatesRemoved:
 *   - Aggregated mode: one entry per element of `columns` where a split,
 *     trimmed, non-empty item string (using `itemDelimiter`) occurs more than
 *     once across that column's cells — mirroring the `Set` dedupe in
 *     `calculateVennCountsFromAggregated`. `count` = sum over all duplicated
 *     items in that column of (occurrences - 1), i.e. the number of redundant
 *     occurrences that get collapsed into 1 by the real Set-based counting.
 *     Columns with no duplicates are omitted from the array.
 *   - Binary mode: at most one entry, keyed to column index 0 / its header
 *     (the row-identifier "title" column read as `row[0]` by
 *     `calculateVennCounts`), reporting duplicate identifier values across
 *     rows that contribute to the count (i.e. at least one of the selected
 *     `columns` is truthy for that row — mirrors `calculateVennCounts`'
 *     own `if (rowMask === 0) continue;` skip). `count` = sum over duplicated
 *     identifiers of (occurrences - 1). NOTE: `calculateVennCounts` itself
 *     does NOT dedupe repeated identifiers (each row is counted
 *     independently, inflating region counts) — this entry is a pure warning
 *     flagging that the source data has repeated identifiers, it does not
 *     describe something the counting function actually removed.
 *   - `examples`: up to 5 example item/identifier strings found duplicated,
 *     in order of first becoming a duplicate (i.e. on their 2nd occurrence).
 *
 * emptyCellsSkipped:
 *   - Count of cells within the selected `columns` that are empty or
 *     whitespace-only after `.trim()`.
 *   - Aggregated mode: matches the `if (!cell) continue;` skip in
 *     `calculateVennCountsFromAggregated` exactly (checked per row, per
 *     selected column, before splitting on `itemDelimiter`).
 *   - Binary mode: counted per row, per selected column, regardless of
 *     whether the row ends up contributing to the count. A blank cell is
 *     indistinguishable from an explicit falsy value ('0'/'false'/'no') once
 *     parsed by `calculateVennCounts`, so this count highlights cells that
 *     were actually blank rather than explicitly negative.
 *
 * caseCollisions:
 *   - Computed over the full set of distinct, case-sensitive item identities
 *     in scope: the union of all split/trimmed/non-empty items across all
 *     selected `columns` (aggregated mode), or the set of distinct trimmed,
 *     non-empty `row[0]` identifiers of contributing rows (binary mode, same
 *     row scope as duplicatesRemoved above).
 *   - Items are grouped by their lower-cased form; any group containing 2+
 *     distinct case-sensitive spellings is reported as one entry, with
 *     `items` listed in order of first appearance in the source data.
 *   - WARNING ONLY: this function and the counting functions never fold case
 *     or merge these identities — they remain distinct items everywhere else.
 */
export interface DataQualityReport {
  duplicatesRemoved: { column: number; columnName: string; count: number; examples: string[] }[];
  emptyCellsSkipped: number;
  caseCollisions: { items: string[] }[];
  /** True if any of the above arrays is non-empty or emptyCellsSkipped > 0. */
  hasWarnings: boolean;
}

const MAX_DUPLICATE_EXAMPLES = 5;

/**
 * Pure, read-only analysis of data-quality issues (duplicates, empty cells,
 * case collisions) in the selected columns of `csv`. See {@link DataQualityReport}
 * for exact detection semantics. Never mutates `csv` and never folds/merges
 * item case — case collisions are reported, not normalised.
 */
export function analyzeDataQuality(
  csv: CsvData,
  columns: number[],
  fileType: FileType,
  itemDelimiter: Delimiter = ',',
): DataQualityReport {
  const duplicatesRemoved: DataQualityReport['duplicatesRemoved'] = [];
  let emptyCellsSkipped = 0;

  // Tracks, in order of first appearance, every distinct case-sensitive item
  // string considered "in scope" for case-collision detection.
  const firstSeenOrder: string[] = [];
  // lowercase form -> set of distinct case-sensitive spellings seen (insertion order)
  const caseGroups = new Map<string, Set<string>>();

  const registerForCaseCollision = (item: string) => {
    const lower = item.toLowerCase();
    let variants = caseGroups.get(lower);
    if (!variants) {
      variants = new Set<string>();
      caseGroups.set(lower, variants);
    }
    if (!variants.has(item)) {
      variants.add(item);
      firstSeenOrder.push(item);
    }
  };

  if (fileType === 'aggregated') {
    for (const colIdx of columns) {
      const header = csv.headers[colIdx] ?? `Column ${colIdx + 1}`;
      const seen = new Map<string, number>(); // item -> occurrence count within this column
      const exampleOrder: string[] = [];

      for (const row of csv.rows) {
        const cell = (row[colIdx] ?? '').trim();
        if (!cell) {
          emptyCellsSkipped++;
          continue;
        }
        const items = cell.split(itemDelimiter).map(s => s.trim()).filter(s => s);
        for (const item of items) {
          const count = (seen.get(item) ?? 0) + 1;
          seen.set(item, count);
          if (count === 2) exampleOrder.push(item); // first moment it becomes a duplicate
          registerForCaseCollision(item);
        }
      }

      let colDuplicateCount = 0;
      for (const count of seen.values()) {
        if (count > 1) colDuplicateCount += count - 1;
      }
      if (colDuplicateCount > 0) {
        duplicatesRemoved.push({
          column: colIdx,
          columnName: header,
          count: colDuplicateCount,
          examples: exampleOrder.slice(0, MAX_DUPLICATE_EXAMPLES),
        });
      }
    }
  } else {
    // Binary mode: identity = trimmed row[0] ("title" column), scoped to rows
    // that contribute to the count (at least one truthy selected column),
    // mirroring calculateVennCounts' own rowMask === 0 skip.
    const idColumn = 0;
    const idColumnName = csv.headers[idColumn] ?? 'Column 1';
    const seen = new Map<string, number>();
    const exampleOrder: string[] = [];

    for (const row of csv.rows) {
      let rowMask = 0;
      for (let i = 0; i < columns.length; i++) {
        const val = row[columns[i]];
        if (val === '1' || val?.toLowerCase() === 'true' || val?.toLowerCase() === 'yes') {
          rowMask |= (1 << i);
        }
      }

      for (const colIdx of columns) {
        if ((row[colIdx] ?? '').trim() === '') emptyCellsSkipped++;
      }

      if (rowMask === 0) continue; // matches calculateVennCounts' own skip

      const id = (row[idColumn] ?? '').trim();
      if (!id) continue;
      const count = (seen.get(id) ?? 0) + 1;
      seen.set(id, count);
      if (count === 2) exampleOrder.push(id);
      registerForCaseCollision(id);
    }

    let idDuplicateCount = 0;
    for (const count of seen.values()) {
      if (count > 1) idDuplicateCount += count - 1;
    }
    if (idDuplicateCount > 0) {
      duplicatesRemoved.push({
        column: idColumn,
        columnName: idColumnName,
        count: idDuplicateCount,
        examples: exampleOrder.slice(0, MAX_DUPLICATE_EXAMPLES),
      });
    }
  }

  const caseCollisions: DataQualityReport['caseCollisions'] = [];
  const emittedLower = new Set<string>();
  for (const item of firstSeenOrder) {
    const lower = item.toLowerCase();
    if (emittedLower.has(lower)) continue;
    const variants = caseGroups.get(lower);
    if (variants && variants.size > 1) {
      caseCollisions.push({ items: Array.from(variants) });
      emittedLower.add(lower);
    }
  }

  return {
    duplicatesRemoved,
    emptyCellsSkipped,
    caseCollisions,
    hasWarnings: duplicatesRemoved.length > 0 || emptyCellsSkipped > 0 || caseCollisions.length > 0,
  };
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
