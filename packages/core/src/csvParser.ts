export interface CsvData {
  headers: string[];
  rows: string[][];
  /**
   * Columnar storage for column-oriented sources (GMT). When present, this is
   * the source of truth and `rows` may be a lazily materialized transpose
   * (non-enumerable getter) so that huge GMT files (thousands of sets ×
   * thousands of genes) never materialize the full matrix unless a
   * row-oriented consumer actually reads it. Column-oriented consumers should
   * prefer `columns` when available. See {@link hydrateCsvRows}.
   */
  columns?: string[][];
}

export type FileType = 'binary' | 'aggregated';
export type Delimiter = ',' | ';' | ' ' | '\t';
export type GeneSetFormat = 'gmt' | 'gmx' | null;

export interface GeneSetMeta {
  format: GeneSetFormat;
  descriptions: Record<string, string>;
  /** Number of source lines skipped because they had no genes (GMT only). */
  skippedSets?: number;
}

/**
 * Number of logical data rows in `csv` without forcing a lazy GMT transpose.
 */
export function csvRowCount(csv: CsvData): number {
  if (csv.columns) {
    let max = 0;
    for (const col of csv.columns) if (col.length > max) max = col.length;
    return max;
  }
  return csv.rows.length;
}

/**
 * First `maxRows` data rows for preview, read column-wise when possible so a
 * large GMT never materializes its full row matrix for a 5-row preview.
 */
export function csvPreviewRows(csv: CsvData, maxRows: number): string[][] {
  if (!csv.columns) return csv.rows.slice(0, maxRows);
  const nCols = csv.columns.length;
  const out: string[][] = [];
  for (let ri = 0; ri < maxRows; ri++) {
    const row: string[] = [];
    let any = false;
    for (let ci = 0; ci < nCols; ci++) {
      const v = ri < csv.columns[ci].length ? csv.columns[ci][ri] : '';
      if (v) any = true;
      row.push(v);
    }
    if (!any) break;
    out.push(row);
  }
  return out;
}

/**
 * Re-attach the lazy `rows` transpose to a `CsvData` that carries only
 * `columns` (e.g. after JSON session restore, where the non-enumerable
 * getter is lost). Mutates and returns `csv`.
 */
export function hydrateCsvRows(csv: CsvData): CsvData {
  // After JSON.parse the lazy getter is gone and `rows` is simply absent;
  // avoid touching `csv.rows` here (that would trigger the getter). The cast
  // defeats the static "rows is always present" narrowing of the `in` check.
  const rec = csv as unknown as Record<string, unknown>;
  if (csv.columns && !('rows' in rec)) {
    attachLazyRows(csv, csv.columns);
  }
  return csv;
}

/**
 * Slice a dataset down to the columns an exported analysis script actually
 * needs — the identifier column (binary) plus the mapped set columns — and
 * return adjusted headers/rows/columnMapping for inline embedding. Columnar
 * (GMT) sources are sliced WITHOUT materializing the full transpose: only
 * the selected columns' arrays are read, and the row count is the longest
 * SELECTED column (not the file-wide maximum). This keeps a 7.5k-set MSigDB
 * GMT from producing a ~100 MB inline literal in an exported script.
 */
export function sliceForScriptEmbed(
  csv: CsvData,
  columnMapping: number[],
  fileType: FileType,
): { headers: string[]; rows: string[][]; columnMapping: number[] } {
  const indices = fileType === 'binary' ? [0, ...columnMapping] : [...columnMapping];
  const headers = indices.map(i => csv.headers[i] ?? `Column ${i + 1}`);
  const columnMappingOut = fileType === 'binary'
    ? columnMapping.map((_, i) => i + 1)
    : columnMapping.map((_, i) => i);

  let rows: string[][];
  if (csv.columns) {
    const cols = indices.map(i => csv.columns![i] ?? []);
    const nRows = cols.reduce((m, c) => Math.max(m, c.length), 0);
    rows = [];
    for (let ri = 0; ri < nRows; ri++) {
      rows.push(cols.map(c => (ri < c.length ? c[ri] : '')));
    }
  } else {
    rows = csv.rows.map(row => indices.map(i => row[i] ?? ''));
  }
  return { headers, rows, columnMapping: columnMappingOut };
}

/** Define `rows` as a non-enumerable lazily-materialized transpose of `columns`. */function attachLazyRows(csv: CsvData, columns: string[][]): void {
  let materialized: string[][] | null = null;
  Object.defineProperty(csv, 'rows', {
    enumerable: false, // keep JSON.stringify (session save) off the full transpose
    get() {
      if (!materialized) {
        const maxGenes = columns.reduce((m, c) => Math.max(m, c.length), 0);
        const rows: string[][] = [];
        for (let gi = 0; gi < maxGenes; gi++) {
          const row: string[] = [];
          for (const col of columns) {
            row.push(gi < col.length ? col[gi] : '');
          }
          rows.push(row);
        }
        materialized = rows;
      }
      return materialized;
    },
  });
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
    const hasContent = csv.columns
      ? (csv.columns[colIdx] ?? []).some(cell => cell.trim() !== '')
      : csv.rows.some(row => (row[colIdx] ?? '').trim() !== '');
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

  // Collect items per set. Columnar sources (GMT) are read column-wise so the
  // lazy row transpose is never materialized for a ≤9-column calculation.
  const sets: Set<string>[] = selectedColumns.map(() => new Set<string>());
  if (csv.columns) {
    for (let i = 0; i < n; i++) {
      const col = csv.columns[selectedColumns[i]] ?? [];
      for (const cellRaw of col) {
        const cell = cellRaw.trim();
        if (!cell) continue;
        const items = cell.split(itemDelimiter).map(s => s.trim()).filter(s => s);
        for (const item of items) {
          sets[i].add(item);
        }
      }
    }
  } else {
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
   * Binary mode: number of data rows with a non-empty identifier (one row per
   * item in well-formed input; all-zero rows count as background), matching
   * the Python/R `universe_size`.
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

  // Collapse rows by item identifier (column 0), mirroring the Python and R
  // implementations: rows with a blank identifier are skipped entirely (they
  // are neither counted nor part of the universe), and repeated identifiers
  // merge with OR semantics across the selected sets.
  const maskByItem = new Map<string, number>();
  let universeRows = 0;
  for (const row of csv.rows) {
    const title = (row[0] ?? '').trim();
    if (!title) continue;
    universeRows++;
    let rowMask = 0;
    for (let i = 0; i < n; i++) {
      const val = row[selectedColumns[i]];
      if (val === '1' || val?.toLowerCase() === 'true' || val?.toLowerCase() === 'yes') {
        rowMask |= (1 << i);
      }
    }
    maskByItem.set(title, (maskByItem.get(title) ?? 0) | rowMask);
  }

  for (const [title, rowMask] of maskByItem) {
    if (rowMask === 0) continue;

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

  return { inclusive, exclusive, inclusiveItems, exclusiveItems, totalUniqueItems: universeRows };
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
 *     own skip of items whose merged mask is 0). `count` = sum over duplicated
 *     identifiers of (occurrences - 1), i.e. the number of redundant rows that
 *     `calculateVennCounts` collapses when it merges repeated identifiers with
 *     OR semantics (matching the Python/R set semantics).
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
  /**
   * Detected identifier namespace per selected column (aggregated: each set
   * column; binary: the row-identifier column). Informational on its own —
   * the actionable signal is `namespaceMismatch`.
   */
  idNamespaces: { column: number; columnName: string; namespace: IdNamespace }[];
  /**
   * True when 2+ selected columns use different non-empty identifier
   * namespaces (e.g. gene symbols vs Ensembl). Biological overlap between
   * such columns is spuriously near zero — the user should convert IDs first.
   */
  namespaceMismatch: boolean;
  /** True if any of the above arrays is non-empty or emptyCellsSkipped > 0. */
  hasWarnings: boolean;
}

const MAX_DUPLICATE_EXAMPLES = 5;

// ---------------------------------------------------------------------------
// Identifier-namespace detection (P2)
//
// Real-world list comparisons often fail silently because one column uses
// gene symbols (TP53) while another uses Ensembl (ENSG00000141510) or Entrez
// (7157) identifiers — intersections then look empty for the wrong reason.
// These heuristics classify the identifier style of a column so the quality
// report can warn when the selected columns mix namespaces.
// ---------------------------------------------------------------------------

export type IdNamespace = 'ensembl' | 'entrez' | 'uniprot' | 'symbol' | 'mixed' | 'empty';

// Ensembl: ENSG00000141510, ENSMUSG00000029552, ... (optional .version suffix)
const ENSEMBL_RE = /^ENS[A-Z]{0,10}\d{6,}$/i;
// Entrez Gene: pure numeric.
const ENTREZ_RE = /^\d{1,10}$/;
// UniProtKB accession (6 or 10 chars, canonical pattern).
const UNIPROT_RE = /^([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9][A-Z][A-Z0-9]{2}[0-9])([A-Z][A-Z0-9]{2}[0-9])?$/;

const NAMESPACE_MAJORITY = 0.8;
const MAX_NAMESPACE_SAMPLE = 1000;

function classifyId(value: string): Exclude<IdNamespace, 'mixed' | 'empty'> {
  const base = value.replace(/\.\d+$/, ''); // strip Ensembl-style version suffix
  if (ENSEMBL_RE.test(base)) return 'ensembl';
  if (ENTREZ_RE.test(base)) return 'entrez';
  if (UNIPROT_RE.test(base)) return 'uniprot';
  return 'symbol';
}

/**
 * Majority-vote identifier namespace of a collection of item strings
 * (>= 80% of non-empty values must agree, otherwise 'mixed'). Empty input
 * yields 'empty'. Anything not matching Ensembl/Entrez/UniProt patterns is
 * treated as a gene symbol.
 */
export function detectIdNamespace(values: Iterable<string>): IdNamespace {
  const counts = new Map<string, number>();
  let total = 0;
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const ns = classifyId(v);
    counts.set(ns, (counts.get(ns) ?? 0) + 1);
    total++;
  }
  if (total === 0) return 'empty';
  let best: IdNamespace = 'symbol';
  let bestCount = 0;
  for (const [ns, c] of counts) {
    if (c > bestCount) {
      best = ns as IdNamespace;
      bestCount = c;
    }
  }
  return bestCount / total >= NAMESPACE_MAJORITY ? best : 'mixed';
}

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
  const idNamespaces: DataQualityReport['idNamespaces'] = [];
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
    // Columnar sources (GMT) stream cells column-wise to avoid the transpose.
    const iterCells = function* (colIdx: number): Generator<string> {
      if (csv.columns) {
        for (const cell of csv.columns[colIdx] ?? []) yield cell;
      } else {
        for (const row of csv.rows) yield row[colIdx] ?? '';
      }
    };
    for (const colIdx of columns) {
      const header = csv.headers[colIdx] ?? `Column ${colIdx + 1}`;
      const seen = new Map<string, number>(); // item -> occurrence count within this column
      const exampleOrder: string[] = [];
      const namespaceSample: string[] = [];

      for (const cellRaw of iterCells(colIdx)) {
        const cell = cellRaw.trim();
        if (!cell) {
          emptyCellsSkipped++;
          continue;
        }
        const items = cell.split(itemDelimiter).map(s => s.trim()).filter(s => s);
        for (const item of items) {
          const count = (seen.get(item) ?? 0) + 1;
          seen.set(item, count);
          if (count === 2) exampleOrder.push(item); // first moment it becomes a duplicate
          if (namespaceSample.length < MAX_NAMESPACE_SAMPLE) namespaceSample.push(item);
          registerForCaseCollision(item);
        }
      }

      idNamespaces.push({
        column: colIdx,
        columnName: header,
        namespace: detectIdNamespace(namespaceSample),
      });

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
    const namespaceSample: string[] = [];

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
      if (namespaceSample.length < MAX_NAMESPACE_SAMPLE) namespaceSample.push(id);
      registerForCaseCollision(id);
    }

    idNamespaces.push({
      column: idColumn,
      columnName: idColumnName,
      namespace: detectIdNamespace(namespaceSample),
    });

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

  // Mismatch = 2+ distinct real namespaces among the selected columns
  // ('mixed'/'empty' columns are not evidence of a namespace clash).
  const realNamespaces = new Set(
    idNamespaces
      .map(e => e.namespace)
      .filter(ns => ns !== 'mixed' && ns !== 'empty'),
  );
  const namespaceMismatch = fileType === 'aggregated' && realNamespaces.size > 1;

  return {
    duplicatesRemoved,
    emptyCellsSkipped,
    caseCollisions,
    idNamespaces,
    namespaceMismatch,
    hasWarnings:
      duplicatesRemoved.length > 0 || emptyCellsSkipped > 0 ||
      caseCollisions.length > 0 || namespaceMismatch,
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
 * Returns CsvData with sets as columns + metadata with descriptions.
 *
 * The result stores genes COLUMN-wise (`csv.columns`); the row-wise transpose
 * (`csv.rows`) is a lazily materialized non-enumerable getter, so a large GMT
 * (e.g. MSigDB c5: ~7.5k sets × ~2k genes ≈ 15M cell strings) never builds
 * the full matrix at parse time. Lines with no genes or an empty set name are
 * skipped and counted in `meta.skippedSets`.
 */
export function parseGmt(text: string): { csv: CsvData; meta: GeneSetMeta } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(l => l.trim());
  if (lines.length === 0) throw new Error('GMT file is empty');

  const sets: { name: string; description: string; genes: string[] }[] = [];
  let skippedSets = 0;

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) {
      skippedSets++;
      continue;
    }
    const name = parts[0].trim();
    const description = parts[1].trim();
    const genes = parts.slice(2).map(g => g.trim()).filter(g => g);
    if (name && genes.length > 0) sets.push({ name, description, genes });
    else skippedSets++;
  }

  if (sets.length === 0) throw new Error('GMT file has no valid gene sets');

  const headers = sets.map(s => s.name);
  const descriptions: Record<string, string> = {};
  for (const s of sets) {
    if (s.description && s.description.toLowerCase() !== 'na') {
      descriptions[s.name] = s.description;
    }
  }

  const columns = sets.map(s => s.genes);
  const csv = { headers, columns } as CsvData;
  attachLazyRows(csv, columns);

  return {
    csv,
    meta: { format: 'gmt', descriptions, skippedSets },
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
