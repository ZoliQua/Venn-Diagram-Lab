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
//   L124 - gene-set auto-config: only the setFileType('aggregated') call is
//          pinned here (see scope note at that test) — setRowDelimiter/
//          setHasHeader in the same effect are not independently
//          discriminating for any fixture (L144 and the hasHeader default
//          already reproduce their values).
//   L135 - column auto-select from fileType + fullCsv (binary vs aggregated branch)
//   L144 - delimiter reset from detectedDelimiter
//   L162 - Excel worksheet re-parse: intentionally NOT characterized here.
//          See the comment at the end of this file for why.

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
  // SCOPE NOTE: the L124 effect also calls setRowDelimiter('\t') and
  // setHasHeader(true), but neither is independently discriminating for this
  // (or any) fixture:
  //  - hasHeader already defaults to true (`useState(true)`), with or without
  //    this effect, so asserting it stays true proves nothing.
  //  - rowDelimiter is unconditionally re-set by the separate L144 "reset
  //    delimiter to detected" effect, which runs after this one on every
  //    mount and always wins (last setState for the same state in a mount
  //    batch takes effect). For this GMT fixture, detectedDelimiter is
  //    already '\t' (see detectDelimiter's tab-consistency scoring), so
  //    L144 alone reproduces '\t' even with the L124 line removed.
  // Verified experimentally: commenting out `setRowDelimiter('\t')` and
  // `setHasHeader(true)` at L125-126 leaves this test green; commenting out
  // `setFileType('aggregated')` at L124 makes it fail. Only the fileType
  // assertions below are a genuine, effect-specific pin.
  it('GMT input auto-configures file type to aggregated', () => {
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

    // Downstream double-check on the same pin: L135's else-branch (fileType
    // !== 'binary') selects every column. If setFileType('aggregated') were
    // removed, fileType would stay at its 'binary' default and L135 would
    // instead run getBinaryColumns on non-numeric gene names, selecting zero
    // columns instead of both.
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

  // --- L162 (Excel worksheet re-parse) — intentionally NOT covered here -----
  // This effect (`if (!isExcel || !excelBuffer || !selectedSheet) return; ...
  // parseExcelFile(...).then(setExcelCsv).catch(setError)`) is a legitimate
  // async effect. The upcoming react-hooks v7 refactor (Task 3) is expected
  // to leave its behaviour as-is behind a scoped eslint-disable rather than
  // rewrite it — so it does not need a behaviour-pinning safety net here.
  //
  // A prior version of this file had a test claiming to pin the `!isExcel`
  // guard clause via a non-Excel render. That coverage was fabricated: with
  // no sheet-context prop (`sheetNames`/`initialSheet`), `selectedSheet`
  // defaults to '' (`useState(initialSheet ?? sheetNames?.[0] ?? '')`), so
  // `!selectedSheet` alone short-circuits the guard regardless of `isExcel`;
  // and the test asserted synchronously, so even if the guard had let an
  // async `parseExcelFile(...)` through, its `.then`/`.catch` couldn't have
  // resolved before the assertions ran. The test passed identically whether
  // or not the `!isExcel` clause existed. Verified experimentally (see
  // task-2-report.md): removing `!isExcel ||` from the guard left the full
  // suite green.
  //
  // Building a fixture that genuinely discriminates this guard would require
  // either a real parseable .xlsx ArrayBuffer or mocking parseExcelFile —
  // both judged disproportionate for an effect that won't be refactored. The
  // Excel parsing path itself (parseExcelFile) is covered by
  // src/__tests__/excelParser.test.ts.
});
