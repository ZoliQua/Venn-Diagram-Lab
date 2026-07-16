import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(PKG, 'dist', 'cli.js'); // built by `npm run build -w venn-diagram-lab`

describe('vdl analyze CLI', () => {
  it('writes a region-summary TSV from an input file', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vdl-'));
    const input = join(tmp, 'in.tsv');
    const out = join(tmp, 'out.tsv');
    writeFileSync(input, 'Gene\tA\tB\ng1\t1\t0\ng2\t1\t1\ng3\t0\t1\n');

    execFileSync('node', [CLI, 'analyze', input, '--region-summary', out], { encoding: 'utf8' });

    const tsv = readFileSync(out, 'utf8');
    expect(tsv.split('\n')[0]).toBe(
      'Region\tSets\tDepth\tExclusive_Count\tInclusive_Count\tExclusive_Pct\tItems',
    );
    expect(tsv).toContain('\nAB\t');
  }, 30000);
});
