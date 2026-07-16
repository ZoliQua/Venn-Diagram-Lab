import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(PKG, 'dist', 'cli.js');

describe('vdl --version', () => {
  it('prints the package.json version', () => {
    const expected = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')).version;
    const out = execFileSync('node', [CLI, '--version'], { encoding: 'utf8' }).trim();
    expect(out).toBe(expected);
  }, 30000);
});
