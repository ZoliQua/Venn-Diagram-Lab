import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(PKG, 'dist', 'cli.js');

describe('vdl analyze --matrix / --statistics', () => {
  it('writes matrix and statistics TSVs', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vdl-'));
    const input = join(tmp, 'in.tsv');
    const mtx = join(tmp, 'matrix.tsv');
    const stats = join(tmp, 'stats.tsv');
    writeFileSync(input, 'Gene\tA\tB\ng1\t1\t0\ng2\t1\t1\ng3\t0\t1\n');

    execFileSync('node', [CLI, 'analyze', input, '--matrix', mtx, '--statistics', stats], { encoding: 'utf8' });

    expect(readFileSync(mtx, 'utf8').split('\n')[0]).toBe('Item\tA\tB\tRegion');
    expect(readFileSync(stats, 'utf8').split('\n')[0].startsWith('Set_A\tSet_B\t')).toBe(true);
  }, 30000);
});

describe('vdl export graphml / sif', () => {
  it('writes GraphML and SIF network files', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vdl-'));
    const input = join(tmp, 'in.tsv');
    const gml = join(tmp, 'net.graphml');
    const sif = join(tmp, 'net.sif');
    writeFileSync(input, 'Gene\tA\tB\tC\ng1\t1\t0\t1\ng2\t1\t1\t0\ng3\t0\t1\t1\n');

    execFileSync('node', [CLI, 'export', 'graphml', input, '--out', gml], { encoding: 'utf8' });
    execFileSync('node', [CLI, 'export', 'sif', input, '--out', sif], { encoding: 'utf8' });

    const graphml = readFileSync(gml, 'utf8');
    expect(graphml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(graphml).toContain('<graph edgedefault="undirected">');
    expect(graphml).toContain('<key id="d0" for="node" attr.name="label" attr.type="string"/>');

    const sifText = readFileSync(sif, 'utf8').trimEnd();
    for (const line of sifText.split('\n')) {
      expect(line.split('\t')[1]).toBe('overlap');
    }
  }, 30000);
});
