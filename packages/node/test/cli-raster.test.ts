import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(PKG, 'dist', 'cli.js');
const SAMPLE = join(PKG, '..', '..', 'data', 'dataset_real_cancer_drivers_4.tsv');

describe('vdl render --out png/pdf', () => {
  it('writes a PNG when --out ends in .png', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'vdl-')), 'net.png');
    execFileSync('node', [CLI, 'render', 'network', SAMPLE, '--out', out], { encoding: 'utf8' });
    const buf = readFileSync(out);
    expect(buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
  }, 30000);

  it('writes a PDF when --out ends in .pdf', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'vdl-')), 'net.pdf');
    execFileSync('node', [CLI, 'render', 'network', SAMPLE, '--out', out], { encoding: 'utf8' });
    expect(readFileSync(out).subarray(0, 5).toString()).toBe('%PDF-');
  }, 30000);

  it('still writes SVG when --out ends in .svg', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'vdl-')), 'net.svg');
    execFileSync('node', [CLI, 'render', 'network', SAMPLE, '--out', out], { encoding: 'utf8' });
    expect(readFileSync(out, 'utf8')).toContain('<svg');
  }, 30000);
});
