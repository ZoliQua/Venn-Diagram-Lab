import { execFileSync, type SpawnSyncReturns } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(PKG, 'dist', 'cli.js');
const SAMPLE = join(PKG, '..', '..', 'data', 'dataset_real_cancer_drivers_4.tsv');

describe('vdl render --metric validation', () => {
  it('rejects an unknown metric with a clean error + exit 1', () => {
    let stderr = '', code = 0;
    try {
      execFileSync('node', [CLI, 'render', 'network', SAMPLE, '--metric', 'bogus'], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      const err = e as Error & SpawnSyncReturns<string>;
      stderr = String(err.stderr ?? '');
      code = err.status ?? 1;
    }
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/metric/i);
    expect(stderr).not.toMatch(/\n\s+at /);
  });
  it('accepts a valid metric', () => {
    const out = execFileSync('node', [CLI, 'render', 'network', SAMPLE, '--metric', 'jaccard'], { encoding: 'utf8' });
    expect(out).toContain('<svg');
  });
});
