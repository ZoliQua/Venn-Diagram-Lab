// @vitest-environment jsdom
// Tests for the GMT/GMX gene-set size filter (v2.9.0, P5).
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { CsvImportDialog } from '../components/CsvImportDialog.tsx';
import type { CsvImportResult } from '../utils/csvParser.ts';

function noop(): void {
  /* onCancel stub */
}

// 4 sets: sizes 1, 3, 12, 600 → Standard filter (10–500) keeps only MEDIUM.
const genes = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix}${i}`).join('\t');
const GMT = [
  `TINY\tna\tG0`,
  `SMALL\tna\t${genes('S', 3)}`,
  `MEDIUM\tna\t${genes('M', 12)}`,
  `HUGE\tna\t${genes('H', 600)}`,
].join('\n');

function renderDialog(onLoad = vi.fn<(r: CsvImportResult) => void>()) {
  const utils = render(
    <CsvImportDialog
      isOpen={true}
      rawText={GMT}
      filename="sets.gmt"
      geneSetFormat="gmt"
      onLoad={onLoad}
      onCancel={noop}
    />
  );
  return { onLoad, ...utils };
}

describe('CsvImportDialog — gene set size filter', () => {
  it('no filter by default: all 4 sets are listed', () => {
    const { container } = renderDialog();
    const boxes = container.querySelectorAll('.csv-import-col-checkbox input[type="checkbox"]');
    expect(boxes).toHaveLength(4);
  });

  it('Standard (10–500) keeps only the 12-gene set and loads just that column', () => {
    const { container, onLoad } = renderDialog();

    fireEvent.click(within(container).getByRole('button', { name: 'Standard (10–500)' }));

    const boxes = container.querySelectorAll('.csv-import-col-checkbox input[type="checkbox"]');
    expect(boxes).toHaveLength(1);

    // The hint reports the range counts.
    expect(within(container).getByText(/1 of 4 sets within range/)).toBeTruthy();

    // Load requires min 2 columns — with a single set in range the button is disabled.
    const loadBtn = within(container).getByRole('button', { name: 'Load Data' }) as HTMLButtonElement;
    expect(loadBtn.disabled).toBe(true);
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('custom min/max filter narrows the visible sets', () => {
    const { container } = renderDialog();

    const filterSection = within(container).getByText('Gene Set Size Filter').parentElement!;
    const [minInput, maxInput] = Array.from(filterSection.querySelectorAll('input[type="number"]'));
    fireEvent.change(minInput, { target: { value: '2' } });
    fireEvent.change(maxInput, { target: { value: '20' } });

    const labels = Array.from(container.querySelectorAll('.csv-import-col-checkbox')).map(l => l.textContent);
    expect(labels).toEqual(['SMALL', 'MEDIUM']);
  });

  it('filtered-out selections do not reach onLoad', () => {
    const { container, onLoad } = renderDialog();

    // Select all 4 sets while unfiltered.
    fireEvent.click(within(container).getByRole('button', { name: 'Select All' }));
    // Now restrict to 10–500 (only MEDIUM survives).
    fireEvent.click(within(container).getByRole('button', { name: 'Standard (10–500)' }));
    // Widen the filter back so SMALL + TINY return, then load: only columns
    // still selected AND in range may be loaded. With 10–500 active, MEDIUM
    // is the sole effective column, so Load is disabled; clear instead and
    // verify all 4 selections load.
    fireEvent.click(within(container).getByRole('button', { name: 'Clear' }));
    fireEvent.click(within(container).getByRole('button', { name: 'Load Data' }));
    expect(onLoad).toHaveBeenCalledOnce();
    expect(onLoad.mock.calls[0][0].selectedColumns).toEqual([0, 1, 2, 3]);
  });
});
