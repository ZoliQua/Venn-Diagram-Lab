import { useState, useEffect, useMemo } from 'react';
import type { FileType, Delimiter, CsvImportResult, GeneSetFormat } from '../utils/csvParser.ts';
import {
  parseCsvWithDelimiter,
  detectDelimiter,
  getPreviewRows,
  validateBinaryColumns,
  validateAggregatedColumns,
  getBinaryColumns,
  parseGmt,
  parseGmx,
  parseExcelFile,
  analyzeDataQuality,
} from '../utils/csvParser.ts';
import type { CsvData } from '../utils/csvParser.ts';

interface CsvImportDialogProps {
  isOpen: boolean;
  rawText: string;
  filename: string;
  geneSetFormat?: GeneSetFormat;
  defaultFileType?: 'binary' | 'aggregated';
  sourceFormat?: 'csv' | 'excel' | 'gmt' | 'gmx';
  sheetNames?: string[];
  initialSheet?: string;
  excelBuffer?: ArrayBuffer;
  csvData?: CsvData;
  initialError?: string;
  onLoad: (result: CsvImportResult) => void;
  onCancel: () => void;
}

const DELIMITER_OPTIONS: { value: Delimiter; label: string }[] = [
  { value: ',', label: 'Comma (,)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '\t', label: 'Tab' },
  { value: ' ', label: 'Space' },
];

/** Parse comma-separated row numbers like "1,3,5-10" into a Set of 0-based indices */
function parseRowSpec(spec: string): Set<number> {
  const result = new Set<number>();
  if (!spec.trim()) return result;
  for (const part of spec.split(',')) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) result.add(i - 1); // 1-based → 0-based
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n) && n >= 1) result.add(n - 1);
    }
  }
  return result;
}

export function CsvImportDialog({ isOpen, rawText, filename, geneSetFormat, defaultFileType, sourceFormat, sheetNames, initialSheet, excelBuffer, csvData, initialError, onLoad, onCancel }: CsvImportDialogProps) {
  const isGeneSet = !!geneSetFormat;
  const isExcel = sourceFormat === 'excel';
  const detectedDelimiter = useMemo(() => detectDelimiter(rawText), [rawText]);

  // Pre-parse GMT/GMX
  const geneSetParsed = useMemo(() => {
    if (!geneSetFormat) return null;
    try {
      return geneSetFormat === 'gmt' ? parseGmt(rawText) : parseGmx(rawText);
    } catch {
      return null;
    }
  }, [rawText, geneSetFormat]);

  const [fileType, setFileType] = useState<FileType>(defaultFileType ?? 'binary');
  const [rowDelimiter, setRowDelimiter] = useState<Delimiter>(detectedDelimiter);
  const [itemDelimiter, setItemDelimiter] = useState<Delimiter>(',');
  const [hasHeader, setHasHeader] = useState(true);
  const [customHeaders, setCustomHeaders] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<number>>(new Set());
  const [rowMode, setRowMode] = useState<'all' | 'selected'>('all');
  const [selectedRowsSpec, setSelectedRowsSpec] = useState('');
  const [skippingRowsSpec, setSkippingRowsSpec] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [excelCsv, setExcelCsv] = useState<CsvData | null>(csvData ?? null);
  const [selectedSheet, setSelectedSheet] = useState<string>(initialSheet ?? sheetNames?.[0] ?? '');

  // Re-parse preview when delimiter or header changes
  const preview = useMemo(() => {
    if (geneSetParsed) {
      return { headers: geneSetParsed.csv.headers, rows: geneSetParsed.csv.rows.slice(0, 5) };
    }
    if (isExcel && excelCsv) {
      return { headers: excelCsv.headers, rows: excelCsv.rows.slice(0, 5) };
    }
    try {
      return getPreviewRows(rawText, rowDelimiter, 5);
    } catch {
      return { headers: [], rows: [] };
    }
  }, [rawText, rowDelimiter, geneSetParsed, isExcel, excelCsv]);

  const fullCsv = useMemo(() => {
    if (geneSetParsed) return geneSetParsed.csv;
    if (isExcel) return excelCsv;
    try {
      return parseCsvWithDelimiter(rawText, rowDelimiter, hasHeader);
    } catch {
      return null;
    }
  }, [rawText, rowDelimiter, hasHeader, geneSetParsed, isExcel, excelCsv]);

  const colCount = preview.headers.length;

  // Initialize custom headers when column count changes
  useEffect(() => {
    setCustomHeaders(prev =>
      Array.from({ length: colCount }, (_, i) => prev[i] ?? `Column ${i + 1}`)
    );
  }, [colCount]);

  // Auto-configure for gene set formats
  useEffect(() => {
    if (geneSetParsed) {
      setFileType('aggregated');
      setRowDelimiter('\t');
      setHasHeader(true);
    }
  }, [geneSetParsed]);

  // Auto-select columns on file type or delimiter change
  useEffect(() => {
    if (!fullCsv) return;
    if (fileType === 'binary') {
      const binCols = getBinaryColumns(fullCsv);
      setSelectedColumns(new Set(binCols));
    } else {
      setSelectedColumns(new Set(fullCsv.headers.map((_, i) => i)));
    }
    setError(null);
  }, [fileType, fullCsv]);

  // Reset delimiter to detected when dialog opens
  useEffect(() => {
    setRowDelimiter(detectedDelimiter);
  }, [detectedDelimiter]);

  // Excel workbooks always use the first non-empty row as the header.
  // Adjusted during render (not in an effect) when `isExcel` transitions,
  // mirroring the previous effect's dependency array exactly.
  const [prevIsExcelForHeader, setPrevIsExcelForHeader] = useState(isExcel);
  if (isExcel !== prevIsExcelForHeader) {
    setPrevIsExcelForHeader(isExcel);
    if (isExcel) {
      setHasHeader(true);
    }
  }

  // Re-parse the active Excel worksheet when the selected sheet changes
  useEffect(() => {
    if (!isExcel || !excelBuffer || !selectedSheet) return;
    if (selectedSheet === initialSheet && csvData) {
      setExcelCsv(csvData);
      return;
    }
    let cancelled = false;
    setError(null);
    parseExcelFile(excelBuffer, { sheet: selectedSheet })
      .then(data => {
        if (!cancelled) setExcelCsv(data);
      })
      .catch(err => {
        if (!cancelled) {
          setError(`Failed to parse sheet: ${err instanceof Error ? err.message : String(err)}`);
        }
      });
    return () => { cancelled = true; };
  }, [isExcel, excelBuffer, selectedSheet, initialSheet, csvData]);

  const headers = hasHeader ? preview.headers : customHeaders.slice(0, colCount);
  const previewRows = hasHeader ? preview.rows : (() => {
    try {
      const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
      return lines.slice(0, 5)
        .filter(l => l.trim())
        .map(l => {
          const fields: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < l.length; i++) {
            const ch = l[i];
            if (ch === '"') { inQuotes = !inQuotes; }
            else if (ch === rowDelimiter && !inQuotes) { fields.push(current.trim()); current = ''; }
            else { current += ch; }
          }
          fields.push(current.trim());
          return fields;
        });
    } catch { return []; }
  })();

  const toggleColumn = (idx: number) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
    setError(null);
  };

  // The csv as it will actually be imported: custom headers applied (when no
  // header row) and row filtering applied (when "Import Selected Rows" is used).
  // Factored out so both handleLoad and the data-quality preview analyze the
  // same final data.
  const finalCsv = useMemo((): CsvData | null => {
    if (!fullCsv) return null;

    let csv = fullCsv;
    if (!hasHeader) {
      csv = { ...fullCsv, headers: customHeaders.slice(0, colCount) };
    }

    if (rowMode === 'selected') {
      const selectedRows = parseRowSpec(selectedRowsSpec);
      const skippingRows = parseRowSpec(skippingRowsSpec);
      let filteredRows = csv.rows;
      if (selectedRows.size > 0) {
        filteredRows = filteredRows.filter((_, i) => selectedRows.has(i));
      }
      if (skippingRows.size > 0) {
        // Skipping is applied on the original indices (before selected filter)
        // If both are set, selected takes priority then skip removes from that
        if (selectedRows.size > 0) {
          // Already filtered by selected — now remove skipped from original indices
          const originalIndices = Array.from({ length: csv.rows.length }, (_, i) => i).filter(i => selectedRows.has(i));
          filteredRows = originalIndices
            .filter(i => !skippingRows.has(i))
            .map(i => csv.rows[i]);
        } else {
          filteredRows = filteredRows.filter((_, i) => !skippingRows.has(i));
        }
      }
      csv = { headers: csv.headers, rows: filteredRows };
    }

    return csv;
  }, [fullCsv, hasHeader, customHeaders, colCount, rowMode, selectedRowsSpec, skippingRowsSpec]);

  // Non-blocking data-quality preview (duplicates / empty cells / case collisions).
  // Purely informational — never prevents Load Data.
  const qualityReport = useMemo(() => {
    if (!finalCsv) return null;
    const cols = Array.from(selectedColumns).sort((a, b) => a - b);
    if (cols.length < 2) return null;
    try {
      return analyzeDataQuality(finalCsv, cols, fileType, itemDelimiter);
    } catch {
      return null;
    }
  }, [finalCsv, selectedColumns, fileType, itemDelimiter]);

  const handleLoad = () => {
    if (!finalCsv) {
      setError('Failed to parse CSV file');
      return;
    }

    const cols = Array.from(selectedColumns).sort((a, b) => a - b);

    // Validate
    const validationError = fileType === 'binary'
      ? validateBinaryColumns(finalCsv, cols)
      : validateAggregatedColumns(finalCsv, cols);

    if (validationError) {
      setError(validationError);
      return;
    }

    onLoad({
      csv: finalCsv,
      fileType,
      selectedColumns: cols,
      itemDelimiter: fileType === 'aggregated' ? itemDelimiter : undefined,
      hasHeader,
      geneSetMeta: geneSetParsed?.meta,
      sourceFormat,
      sheetIndex: isExcel ? Math.max(0, sheetNames?.indexOf(selectedSheet) ?? 0) : undefined,
      quality: analyzeDataQuality(finalCsv, cols, fileType, itemDelimiter),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="csv-import-dialog" onClick={e => e.stopPropagation()}>
        <div className="csv-import-header">
          <h2 className="csv-import-title">{isGeneSet ? 'Import Gene Set File' : 'Import Custom Dataset'}: {filename}</h2>
        </div>

        <div className="csv-import-body">
          {/* 1. File Type */}
          <div className="csv-import-section">
            <div className="csv-import-section-title">1. File Type</div>
            <div className="csv-import-radio-group">
              <label className="csv-import-radio">
                <input type="radio" checked={fileType === 'binary'} onChange={() => setFileType('binary')} disabled={isGeneSet} />
                <span>Binary file <span className="csv-import-hint">(0/1 values per cell)</span></span>
              </label>
              <label className="csv-import-radio">
                <input type="radio" checked={fileType === 'aggregated'} onChange={() => setFileType('aggregated')} disabled={isGeneSet} />
                <span>Aggregated <span className="csv-import-hint">(item names per column)</span></span>
              </label>
              {isGeneSet ? (
                <div className="csv-import-detected">{geneSetFormat?.toUpperCase()} file detected — auto-configured as aggregated gene set format</div>
              ) : isExcel ? (
                <div className="csv-import-detected-neutral">Excel workbook (.xlsx) detected</div>
              ) : (
                <div className="csv-import-detected-neutral">
                  {filename.toLowerCase().endsWith('.tsv') ? 'TSV' : filename.toLowerCase().endsWith('.txt') ? 'TXT' : 'CSV'} file detected
                </div>
              )}
            </div>
          </div>

          {/* 2. Worksheet (Excel only) */}
          {isExcel && sheetNames && sheetNames.length > 1 && (
            <div className="csv-import-section">
              <div className="csv-import-section-title">2. Worksheet</div>
              <div className="csv-import-delimiter-row">
                <label>Sheet:</label>
                <select
                  className="csv-import-select"
                  value={selectedSheet}
                  onChange={e => setSelectedSheet(e.target.value)}
                >
                  {sheetNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 2. Delimiters */}
          {!isExcel && (
            <div className="csv-import-section">
              <div className="csv-import-section-title">2. Delimiters</div>
              <div className="csv-import-delimiter-row">
                <label>Row delimiter:</label>
                <select className="csv-import-select" value={rowDelimiter} onChange={e => setRowDelimiter(e.target.value as Delimiter)} disabled={isGeneSet}>
                  {DELIMITER_OPTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              {fileType === 'aggregated' && (
                <div className="csv-import-delimiter-row">
                  <label>Item delimiter:</label>
                  <select className="csv-import-select" value={itemDelimiter} onChange={e => setItemDelimiter(e.target.value as Delimiter)}>
                    {DELIMITER_OPTIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 3. Header */}
          <div className="csv-import-section">
            <div className="csv-import-section-title">3. Header</div>
            <label className="csv-import-checkbox-label">
              <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} disabled={isGeneSet || isExcel} />
              First row is header
            </label>
            {!hasHeader && colCount > 0 && (
              <div className="csv-import-header-inputs">
                {customHeaders.slice(0, colCount).map((h, i) => (
                  <div key={i} className="csv-import-header-input-row">
                    <span className="csv-import-header-col-num">{i + 1}.</span>
                    <input
                      className="csv-import-header-input"
                      value={h}
                      onChange={e => {
                        const next = [...customHeaders];
                        next[i] = e.target.value;
                        setCustomHeaders(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gene Set Descriptions */}
          {isGeneSet && geneSetParsed?.meta.descriptions && Object.keys(geneSetParsed.meta.descriptions).length > 0 && (
            <div className="csv-import-section">
              <div className="csv-import-section-title">Gene Set Descriptions</div>
              <div className="csv-import-descriptions">
                {Object.entries(geneSetParsed.meta.descriptions).slice(0, 20).map(([name, desc]) => (
                  <div key={name} className="csv-import-desc-row">
                    <span className="csv-import-desc-name">{name}</span>
                    <span className="csv-import-desc-text">{desc.startsWith('http') ? <a href={desc} target="_blank" rel="noopener noreferrer">{desc}</a> : desc}</span>
                  </div>
                ))}
                {Object.keys(geneSetParsed.meta.descriptions).length > 20 && (
                  <div className="csv-import-hint">...and {Object.keys(geneSetParsed.meta.descriptions).length - 20} more</div>
                )}
              </div>
            </div>
          )}

          {/* 4. Data Columns */}
          <div className="csv-import-section">
            <div className="csv-import-section-title-row">
              <span className="csv-import-section-title">4. Data Columns <span className="csv-import-hint">({selectedColumns.size} selected, min 2)</span></span>
              <div className="csv-import-select-buttons">
                <button className="btn btn-xs" onClick={() => setSelectedColumns(new Set(headers.map((_, i) => i)))}>Select All</button>
                <button className="btn btn-xs" onClick={() => setSelectedColumns(new Set())}>Deselect All</button>
              </div>
            </div>
            <div className="csv-import-checkbox-row">
              {headers.map((h, i) => (
                <label key={i} className={`csv-import-col-checkbox ${selectedColumns.has(i) ? 'csv-import-col-selected' : ''}`}>
                  <input type="checkbox" checked={selectedColumns.has(i)} onChange={() => toggleColumn(i)} />
                  {h}
                </label>
              ))}
            </div>
            {previewRows.length > 0 && (
              <div className="csv-import-preview">
                <table>
                  <thead>
                    <tr>
                      <th className="csv-import-row-num">#</th>
                      {headers.map((h, i) => (
                        <th key={i} className={selectedColumns.has(i) ? 'csv-import-selected-col' : ''}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri}>
                        <td className="csv-import-row-num">{ri + 1}</td>
                        {headers.map((_, ci) => (
                          <td key={ci} className={selectedColumns.has(ci) ? 'csv-import-selected-col' : ''}>
                            {row[ci] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. Data Rows */}
          <div className="csv-import-section">
            <div className="csv-import-section-title">5. Data Rows {fullCsv && <span className="csv-import-hint">({fullCsv.rows.length} total)</span>}</div>
            <div className="csv-import-radio-group">
              <label className="csv-import-radio">
                <input type="radio" checked={rowMode === 'all'} onChange={() => setRowMode('all')} />
                <span>Import All Rows</span>
              </label>
              <label className="csv-import-radio">
                <input type="radio" checked={rowMode === 'selected'} onChange={() => setRowMode('selected')} />
                <span>Import Selected Rows</span>
              </label>
            </div>
            {rowMode === 'selected' && (
              <div className="csv-import-row-filter">
                <div className="csv-import-row-filter-field">
                  <label>Selected Rows <span className="csv-import-hint">(comma-separated, e.g. 1,3,5-10 — empty = all)</span></label>
                  <input
                    className="csv-import-header-input"
                    value={selectedRowsSpec}
                    onChange={e => setSelectedRowsSpec(e.target.value)}
                    placeholder="e.g. 1,2,5-20,30"
                  />
                </div>
                <div className="csv-import-row-filter-field">
                  <label>Skipping Rows <span className="csv-import-hint">(comma-separated — these rows will be excluded)</span></label>
                  <input
                    className="csv-import-header-input"
                    value={skippingRowsSpec}
                    onChange={e => setSkippingRowsSpec(e.target.value)}
                    placeholder="e.g. 3,7,15-20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Data quality warnings (non-blocking) */}
          {qualityReport && qualityReport.hasWarnings && (
            <div className="csv-import-section">
              <div className="csv-import-warning-panel">
                <div className="csv-import-warning-title">Data quality notice</div>
                <ul className="csv-import-warning-list">
                  {qualityReport.duplicatesRemoved.map(d => (
                    <li key={d.column}>
                      {d.count} duplicate{d.count === 1 ? '' : 's'} in "{d.columnName}"
                      {d.examples.length > 0 && <> (e.g. {d.examples.join(', ')})</>}
                    </li>
                  ))}
                  {qualityReport.emptyCellsSkipped > 0 && (
                    <li>
                      {qualityReport.emptyCellsSkipped} empty cell{qualityReport.emptyCellsSkipped === 1 ? '' : 's'} skipped in the selected columns
                    </li>
                  )}
                  {qualityReport.caseCollisions.length > 0 && (
                    <li>
                      {qualityReport.caseCollisions.length} case-only difference{qualityReport.caseCollisions.length === 1 ? '' : 's'} found (not merged — treated as distinct items):{' '}
                      {qualityReport.caseCollisions.slice(0, 3).map(g => g.items.join(' / ')).join('; ')}
                      {qualityReport.caseCollisions.length > 3 && ` and ${qualityReport.caseCollisions.length - 3} more`}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Error */}
          {error && <div className="csv-import-error">{error}</div>}
        </div>

        <div className="csv-import-actions">
          <button className="btn btn-accent" onClick={handleLoad} disabled={selectedColumns.size < 2}>Load Data</button>
          <button className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
