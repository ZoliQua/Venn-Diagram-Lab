// @vitest-environment jsdom
// Characterization tests for src/components/CsvImportDialog.tsx.
//
// These tests pin the CURRENT (pre-refactor) observable behaviour of the 5
// derived-state effects flagged for the react-hooks v7 "set-state-in-effect"
// cleanup (Task 3), by rendering the component with representative CSV/TSV/GMT
// fixtures (mirroring src/__tests__/csvParser.test.ts) and asserting on DOM
// that reflects each effect's output. They must stay green across the
// upcoming refactor to prove behaviour-preservation.
//
// Effects under test (current line numbers in CsvImportDialog.tsx):
//   L116 - custom headers initialised from column count
//   L124 - gene-set auto-config (fileType/rowDelimiter/hasHeader) from geneSetParsed
//   L135 - column auto-select from fileType + fullCsv (binary vs aggregated branch)
//   L144 - delimiter reset from detectedDelimiter
//   L162 - Excel worksheet re-parse (only reachable when isExcel; see Excel section below)

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CsvImportDialog } from '../components/CsvImportDialog.tsx';
import type { CsvImportResult } from '../utils/csvParser.ts';

function noop(): void {
  /* onLoad/onCancel stub */
}

describe('CsvImportDialog — characterization (pre-refactor)', () => {
  // --- L135 (binary branch) + L116 -----------------------------------------
  it('TSV binary matrix: all-binary columns are auto-selected, and custom headers are pre-initialised from column count', () => {
    // 3 purely binary (0/1) columns, tab-delimited (mirrors detectDelimiter's
    // tab-detection and getBinaryColumns' behaviour tested in csvParser.test.ts).
    const rawText = 'A\tB\tC\n1\t0\t1\n0\t1\t0\n1\t1\t1';
    const onLoad = vi.fn<(result: CsvImportResult) => void>();

    const { container } = render(
      <CsvImportDialog
        isOpen={true}
        rawText={rawText}
        filename="data.tsv"
        onLoad={onLoad}
        onCancel={noop}
      />
    );

    // L135 binary branch: getBinaryColumns finds all 3 columns binary, so all
    // 3 column checkboxes should be auto-selected.
    const colCheckboxes = container.querySelectorAll<HTMLInputElement>(
      '.csv-import-col-checkbox input[type="checkbox"]'
    );
    expect(colCheckboxes).toHaveLength(3);
    colCheckboxes.forEach(cb => expect(cb.checked).toBe(true));

    // Row delimiter should have been auto-detected as Tab.
    const selects = container.querySelectorAll<HTMLSelectElement>('select');
    expect(selects[0].value).toBe('\t');

    // L116: customHeaders state is derived from colCount on mount, independent
    // of whether the header-input UI is currently shown (hasHeader is true by
    // default so the inputs aren't rendered yet). Toggle "First row is header"
    // off to reveal the pre-initialised default header text.
    const headerCheckbox = container.querySelector<HTMLInputElement>(
      '.csv-import-checkbox-label input[type="checkbox"]'
    )!;
    expect(headerCheckbox.checked).toBe(true);
    fireEvent.click(headerCheckbox);

    const headerInputs = container.querySelectorAll<HTMLInputElement>('.csv-import-header-input');
    expect(headerInputs).toHaveLength(3);
    expect(Array.from(headerInputs).map(i => i.value)).toEqual(['Column 1', 'Column 2', 'Column 3']);
  });

  // --- L135 (aggregated/else branch) ----------------------------------------
  it('Aggregated gene-list CSV: all columns are auto-selected regardless of binary-ness (else branch)', () => {
    // Non-binary text values per cell — would fail getBinaryColumns, but with
    // fileType forced to 'aggregated' the else branch selects every column.
    const rawText = 'SetA,SetB,SetC\ngene1,gene2,gene3\ngene4,,gene5';
    const onLoad = vi.fn<(result: CsvImportResult) => void>();

    const { container } = render(
      <CsvImportDialog
        isOpen={true}
        rawText={rawText}
        filename="data.csv"
        defaultFileType="aggregated"
        onLoad={onLoad}
        onCancel={noop}
      />
    );

    // Aggregated radio should be the checked one.
    const radios = container.querySelectorAll<HTMLInputElement>(
      '.csv-import-radio-group input[type="radio"]'
    );
    expect(radios[0].checked).toBe(false); // Binary
    expect(radios[1].checked).toBe(true); // Aggregated

    const colCheckboxes = container.querySelectorAll<HTMLInputElement>(
      '.csv-import-col-checkbox input[type="checkbox"]'
    );
    expect(colCheckboxes).toHaveLength(3);
    colCheckboxes.forEach(cb => expect(cb.checked).toBe(true));
  });

  // --- L124 (gene-set auto-config) -------------------------------------------
  it('GMT input auto-configures file type to aggregated, tab delimiter, and header on', () => {
    // Same GMT fixture used in csvParser.test.ts's parseGmt describe block.
    const rawText = 'SetA\thttp://example.com\tGene1\tGene2\tGene3\nSetB\tna\tGene2\tGene4';
    const onLoad = vi.fn<(result: CsvImportResult) => void>();

    const { container } = render(
      <CsvImportDialog
        isOpen={true}
        rawText={rawText}
        filename="pathways.gmt"
        geneSetFormat="gmt"
        onLoad={onLoad}
        onCancel={noop}
      />
    );

    // File type radios: Aggregated checked, Binary not, both disabled (gene set locks the type).
    const radios = container.querySelectorAll<HTMLInputElement>(
      '.csv-import-radio-group input[type="radio"]'
    );
    expect(radios[0].checked).toBe(false); // Binary
    expect(radios[0].disabled).toBe(true);
    expect(radios[1].checked).toBe(true); // Aggregated
    expect(radios[1].disabled).toBe(true);

    // Row delimiter forced to Tab.
    const selects = container.querySelectorAll<HTMLSelectElement>('select');
    expect(selects[0].value).toBe('\t');

    // Header checkbox forced on (and disabled, since isGeneSet).
    const headerCheckbox = container.querySelector<HTMLInputElement>(
      '.csv-import-checkbox-label input[type="checkbox"]'
    )!;
    expect(headerCheckbox.checked).toBe(true);
    expect(headerCheckbox.disabled).toBe(true);

    // Downstream of L124 + L135: both gene-set columns (SetA, SetB) selected.
    const colCheckboxes = container.querySelectorAll<HTMLInputElement>(
      '.csv-import-col-checkbox input[type="checkbox"]'
    );
    expect(colCheckboxes).toHaveLength(2);
    colCheckboxes.forEach(cb => expect(cb.checked).toBe(true));
  });

  // --- L144 (delimiter reset on detectedDelimiter change) --------------------
  it('changing rawText so detectedDelimiter changes updates the row delimiter select', () => {
    const commaCsv = 'A,B,C\n1,2,3\n4,5,6';
    const semicolonCsv = 'A;B;C\n1;2;3';
    const onLoad = vi.fn<(result: CsvImportResult) => void>();

    const { container, rerender } = render(
      <CsvImportDialog
        isOpen={true}
        rawText={commaCsv}
        filename="data.csv"
        onLoad={onLoad}
        onCancel={noop}
      />
    );

    const rowDelimiterSelect = () => container.querySelectorAll<HTMLSelectElement>('select')[0];
    expect(rowDelimiterSelect().value).toBe(',');

    rerender(
      <CsvImportDialog
        isOpen={true}
        rawText={semicolonCsv}
        filename="data.csv"
        onLoad={onLoad}
        onCancel={noop}
      />
    );

    // L144: detectedDelimiter recomputed to ';' for the new rawText, and the
    // effect resets rowDelimiter state to match.
    expect(rowDelimiterSelect().value).toBe(';');
  });

  // --- L162 (Excel worksheet re-parse) — non-Excel guard only ----------------
  // Constructing a real .xlsx ArrayBuffer fixture here would be disproportionate
  // for this characterization pass; the Excel parse path itself (parseExcelFile)
  // is already covered by src/__tests__/excelParser.test.ts. Here we only pin
  // the guard clause `if (!isExcel || !excelBuffer || !selectedSheet) return;`:
  // when sourceFormat is not 'excel', the effect must return immediately and
  // never touch excelCsv/error state, leaving the dialog to render straight
  // from the parsed rawText.
  it('non-Excel input leaves the worksheet re-parse effect a no-op (guard clause)', () => {
    const rawText = 'A,B,C\n1,2,3\n4,5,6';
    const onLoad = vi.fn<(result: CsvImportResult) => void>();

    const { container, queryByText } = render(
      <CsvImportDialog
        isOpen={true}
        rawText={rawText}
        filename="data.csv"
        // sourceFormat is intentionally omitted/non-excel; excelBuffer is
        // supplied to prove the guard — not the missing-buffer check — is
        // what short-circuits the effect.
        excelBuffer={new ArrayBuffer(8)}
        onLoad={onLoad}
        onCancel={noop}
      />
    );

    // No Worksheet section (Excel-only UI) is rendered.
    expect(queryByText('2. Worksheet')).toBeNull();

    // No error surfaced (the effect's .catch(err => setError(...)) never ran).
    expect(container.querySelector('.csv-import-error')).toBeNull();

    // Data columns/preview reflect the plain CSV parse (from rawText), not an
    // untouched/empty excelCsv — confirming the guard clause returned before
    // any state mutation, and preview/fullCsv fall through to the CSV path.
    const colCheckboxes = container.querySelectorAll('.csv-import-col-checkbox');
    expect(colCheckboxes).toHaveLength(3);
    expect(Array.from(colCheckboxes).map(el => el.textContent?.trim())).toEqual(['A', 'B', 'C']);
  });
});
