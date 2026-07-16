import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(PKG, 'dist', 'cli.js');

describe('vdl analyze detects GMT input by extension', () => {
  it('analyses a .gmt file', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vdl-'));
    const input = join(tmp, 'sets.gmt');
    const out = join(tmp, 'r.tsv');
    writeFileSync(input, 'SetA\tdesc\tx\ty\tz\nSetB\tdesc\ty\tz\n');
    execFileSync('node', [CLI, 'analyze', input, '--region-summary', out], { encoding: 'utf8' });
    const tsv = readFileSync(out, 'utf8');
    expect(tsv.split('\n')[0]).toBe('Region\tSets\tDepth\tExclusive_Count\tInclusive_Count\tExclusive_Pct\tItems');
    expect(tsv).toContain('\nAB\t');
  }, 30000);
});
