import { execFileSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(PKG, 'dist', 'cli.js');
const SAMPLE = join(PKG, '..', '..', 'data', 'dataset_real_cancer_drivers_4.tsv');

describe('vdl report', () => {
  it('renders a multi-page PDF report to a file', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'vdl-')), 'report.pdf');
    execFileSync('node', [CLI, 'report', SAMPLE, '--out', out], { encoding: 'utf8' });
    const pdf = readFileSync(out);
    expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(5000);
  }, 90000);

  it('accepts --model and --title', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'vdl-')), 'report.pdf');
    execFileSync(
      'node',
      [CLI, 'report', SAMPLE, '--out', out, '--model', 'venn-4-set', '--title', 'Cancer Drivers'],
      { encoding: 'utf8' },
    );
    const pdf = readFileSync(out);
    expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  }, 90000);

  it('errors when --out does not end in .pdf', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'vdl-')), 'report.svg');
    let stderr = '';
    let code = 0;
    try {
      execFileSync('node', [CLI, 'report', SAMPLE, '--out', out], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      const err = e as Error & SpawnSyncReturns<string>;
      stderr = String(err.stderr ?? '');
      code = err.status ?? 1;
    }
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/\.pdf/i);
  }, 30000);

  it('errors when --out is missing', () => {
    let code = 0;
    try {
      execFileSync('node', [CLI, 'report', SAMPLE], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      const err = e as Error & SpawnSyncReturns<string>;
      code = err.status ?? 1;
    }
    expect(code).not.toBe(0);
  }, 30000);
});
