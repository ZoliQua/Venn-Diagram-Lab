import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(PKG, 'dist', 'cli.js');
const SAMPLE = join(PKG, '..', '..', 'data', 'dataset_real_cancer_drivers_4.tsv');

describe('vdl render', () => {
  for (const kind of ['network', 'share-dist', 'enrichment-bar', 'enrichment-lollipop', 'upset']) {
    it(`renders ${kind} to an SVG file`, () => {
      const out = join(mkdtempSync(join(tmpdir(), 'vdl-')), `${kind}.svg`);
      execFileSync('node', [CLI, 'render', kind, SAMPLE, '--out', out], { encoding: 'utf8' });
      const svg = readFileSync(out, 'utf8');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    });
  }
});

describe('vdl render proportional', () => {
  it('renders a 2-set proportional SVG to a file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vdl-'));
    const input = join(dir, 'two.tsv');
    const out = join(dir, 'prop.svg');
    writeFileSync(input, 'Gene\tA\tB\ng1\t1\t0\ng2\t1\t1\ng3\t0\t1\n');
    execFileSync('node', [CLI, 'render', 'proportional', input, '--out', out], { encoding: 'utf8' });
    const svg = readFileSync(out, 'utf8');
    expect(svg).toContain('<svg');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });
});

describe('vdl render venn', () => {
  const SAMPLE = join(PKG, '..', '..', 'data', 'dataset_real_cancer_drivers_4.tsv');
  it('renders a templated Venn to a file', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'vdl-')), 'venn.svg');
    execFileSync('node', [CLI, 'render', 'venn', SAMPLE, '--model', 'venn-4-set', '--out', out], { encoding: 'utf8' });
    const svg = readFileSync(out, 'utf8');
    expect(svg).toContain('<svg');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('errors when --model is omitted for venn', () => {
    const input = join(PKG, '..', '..', 'data', 'dataset_real_cancer_drivers_4.tsv');
    expect(() => execFileSync('node', [CLI, 'render', 'venn', input], { encoding: 'utf8', stdio: 'pipe' })).toThrow();
  });
});

describe('render error handling', () => {
  it('reports a clean error (no raw stack) for a model/data set-count mismatch', () => {
    const input = join(PKG, '..', '..', 'data', 'dataset_real_cancer_drivers_4.tsv');
    let stderr = '';
    let code = 0;
    try {
      execFileSync('node', [CLI, 'render', 'venn', input, '--model', 'venn-3-set'], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e: any) {
      stderr = String(e.stderr ?? '');
      code = e.status ?? 1;
    }
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/sets|model/i);
    expect(stderr).not.toMatch(/\n\s+at /); // no Node.js stack-trace frames
  });
});
