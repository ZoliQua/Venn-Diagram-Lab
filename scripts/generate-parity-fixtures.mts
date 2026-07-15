/**
 * scripts/generate-parity-fixtures.mts
 *
 * Generate golden TSV fixtures for python/tests/test_parity_with_webapp.py.
 *
 * Imports the actual webapp TS code so the fixtures are byte-identical to what
 * the live web tool emits. Re-run after any change to csvParser / exportData /
 * statistics, or after adding a new bundled sample.
 *
 * Usage:
 *   npm run fixtures:parity
 *   # or directly:
 *   npx tsx scripts/generate-parity-fixtures.mts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import {
  splitCsvLineWithDelimiter,
  calculateVennCounts,
  calculateVennCountsFromAggregated,
  type CsvData,
  type VennResult,
  type Delimiter,
} from '../src/utils/csvParser.ts';
import {
  exportRegionSummaryTsv,
  exportMatrixTsv,
  exportOneVsRestTsv,
  exportResultJson,
} from '../src/utils/exportData.ts';
import { pairwiseStatistics } from '../src/utils/statistics.ts';
import { buildNetworkData, toGraphml, toSif } from '../src/utils/networkData.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const SAMPLES_DIR = join(REPO_ROOT, 'python/src/venn_diagram_lab/_data/samples');
const OUT_DIR = join(REPO_ROOT, 'python/tests/fixtures/expected');

interface SampleSpec {
  name: string;
  ext: 'csv' | 'tsv';
  mode: 'binary' | 'aggregated';
  prefixCols: number;
  model: string;  // representative model for the README; doesn't affect TSV output
}

// Mirrors python/src/venn_diagram_lab/samples.py::_SAMPLE_REGISTRY exactly.
const SAMPLES: SampleSpec[] = [
  { name: 'dataset_real_cancer_drivers_4',         ext: 'tsv', mode: 'binary',     prefixCols: 1, model: 'venn-4-set' },
  { name: 'dataset_real_msigdb_immune_pathways',   ext: 'tsv', mode: 'binary',     prefixCols: 1, model: 'venn-4-set' },
  { name: 'dataset_real_msigdb_cancer_pathways',   ext: 'tsv', mode: 'binary',     prefixCols: 1, model: 'venn-5-set-grunbaum' },
  { name: 'dataset_mock_gene_sets',                ext: 'csv', mode: 'aggregated', prefixCols: 0, model: 'venn-6-set' },
  { name: 'dataset_mock_streaming_platforms',      ext: 'csv', mode: 'binary',     prefixCols: 2, model: 'venn-8-set' },
];

function detectDelimiter(text: string, ext: string): Delimiter {
  if (ext === 'tsv') return '\t';
  // CSV: detect from first non-empty line.
  const firstLine = text.split('\n').find(l => l.trim()) ?? '';
  for (const d of [',', ';', '\t', ' '] as Delimiter[]) {
    if (firstLine.includes(d)) return d;
  }
  return ',';
}

function loadCsv(path: string, ext: string): CsvData {
  const text = readFileSync(path, 'utf-8').replace(/^﻿/, '');
  const delim = detectDelimiter(text, ext);
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  const headers = splitCsvLineWithDelimiter(lines[0], delim);
  const rows = lines.slice(1).map(l => splitCsvLineWithDelimiter(l, delim));
  return { headers, rows };
}

function buildSetNames(headers: string[], spec: SampleSpec): string[] {
  if (spec.mode === 'binary') return headers.slice(spec.prefixCols);
  return headers;
}

function buildSelectedColumns(headers: string[], spec: SampleSpec): number[] {
  if (spec.mode === 'binary') {
    return Array.from({ length: headers.length - spec.prefixCols }, (_, i) => spec.prefixCols + i);
  }
  return Array.from({ length: headers.length }, (_, i) => i);
}

function exportStatisticsTsv(stats: ReturnType<typeof pairwiseStatistics>): string {
  // Mirrors src/components/DataSummaryPanel.tsx::handleExportStats byte-for-byte.
  const sigLabel = (fdr: number) =>
    fdr < 0.001 ? '***' : fdr < 0.01 ? '**' : fdr < 0.05 ? '*' : 'ns';
  const fmtP = (p: number) =>
    p < 0.001 ? p.toExponential(2) : p.toFixed(6);
  const header = [
    'Set_A', 'Set_B', 'Name_A', 'Name_B', 'Size_A', 'Size_B',
    'Intersection', 'Union', 'Jaccard', 'Overlap_Coeff', 'Dice',
    'Expected', 'Fold_Enrichment', 'P_value', 'FDR',
    'Bonferroni', 'P_two_sided',
    'Jaccard_CI_low', 'Jaccard_CI_high', 'Dice_CI_low', 'Dice_CI_high',
    'Significant',
  ].join('\t');
  const rows = stats.map(s => [
    s.a, s.b, s.nameA, s.nameB, s.sizeA, s.sizeB,
    s.intersection, s.union,
    s.jaccard.toFixed(4), s.overlapCoeff.toFixed(4), s.dice.toFixed(4),
    s.expected.toFixed(2), s.foldEnrichment.toFixed(3),
    fmtP(s.pValue), fmtP(s.fdr),
    fmtP(s.bonferroni), fmtP(s.pTwoSided),
    s.jaccardCiLow.toFixed(4), s.jaccardCiHigh.toFixed(4),
    s.diceCiLow.toFixed(4), s.diceCiHigh.toFixed(4),
    sigLabel(s.fdr),
  ].join('\t'));
  return [header, ...rows].join('\n');
}

function generateForSample(spec: SampleSpec): { regionSummary: string; matrix: string; statistics: string; oneVsRest: string; resultJson: string; networkGraphml: string; networkSif: string; setNames: string[]; rowCount: number; } {
  const path = join(SAMPLES_DIR, `${spec.name}.${spec.ext}`);
  const csv = loadCsv(path, spec.ext);
  const setNames = buildSetNames(csv.headers, spec);
  const selectedColumns = buildSelectedColumns(csv.headers, spec);
  const n = setNames.length;

  let result: VennResult;
  if (spec.mode === 'binary') {
    result = calculateVennCounts(csv, selectedColumns);
  } else {
    result = calculateVennCountsFromAggregated(csv, selectedColumns, ',');
  }
  const totalItems = result.totalUniqueItems;

  const regionSummary = exportRegionSummaryTsv(result, n, setNames, totalItems);
  const matrix = exportMatrixTsv(result, n, setNames);
  const stats = pairwiseStatistics(result, n, totalItems, setNames);
  const statistics = exportStatisticsTsv(stats);
  const oneVsRest = exportOneVsRestTsv(result, n, totalItems, setNames);
  const resultJson = exportResultJson(result, n, setNames, totalItems, spec.model);

  // Network exports use the default 'intersection' edge weight metric.
  const networkData = buildNetworkData(result, n, totalItems, setNames, 'intersection');
  const networkGraphml = toGraphml(networkData);
  const networkSif = toSif(networkData);

  return { regionSummary, matrix, statistics, oneVsRest, resultJson, networkGraphml, networkSif, setNames, rowCount: csv.rows.length };
}

function getWebappVersion(): string {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8')) as { version: string };
  let sha = 'unknown';
  try {
    sha = execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT }).toString().trim();
  } catch { /* not in git */ }
  return `${pkg.version} (commit ${sha})`;
}

function writeReadme(generated: Map<string, { setNames: string[]; rowCount: number; }>): void {
  const lines = [
    '# Parity Fixtures — Generated from React webapp',
    '',
    '**Do not edit by hand.** Regenerate via `npm run fixtures:parity` from the repo root.',
    '',
    `**Webapp version:** ${getWebappVersion()}`,
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Files',
    '',
    '| Sample | Sets | Rows in source | Files |',
    '|---|---|---|---|',
  ];
  for (const spec of SAMPLES) {
    const meta = generated.get(spec.name)!;
    lines.push(`| \`${spec.name}\` | ${meta.setNames.length} | ${meta.rowCount} | \`__${spec.model}__region_summary.tsv\`, \`__matrix.tsv\`, \`__statistics.tsv\`, \`__one_vs_rest.tsv\`, \`__result.json\`, \`__network.graphml\`, \`__network.sif\` |`);
  }
  lines.push('');
  lines.push('## Regenerating');
  lines.push('');
  lines.push('```bash');
  lines.push('cd /Users/Zoli/Code/Orthologs/2-venn-diagram');
  lines.push('npm run fixtures:parity');
  lines.push('```');
  lines.push('');
  lines.push('After regeneration, run `pytest python/tests/test_parity_with_webapp.py` to confirm Python output still matches.');
  lines.push('');
  writeFileSync(join(OUT_DIR, 'README.md'), lines.join('\n'), 'utf-8');
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const summary = new Map<string, { setNames: string[]; rowCount: number; }>();
  for (const spec of SAMPLES) {
    const out = generateForSample(spec);
    const base = `${spec.name}__${spec.model}`;
    writeFileSync(join(OUT_DIR, `${base}__region_summary.tsv`), out.regionSummary, 'utf-8');
    writeFileSync(join(OUT_DIR, `${base}__matrix.tsv`),         out.matrix,        'utf-8');
    writeFileSync(join(OUT_DIR, `${base}__statistics.tsv`),     out.statistics,    'utf-8');
    writeFileSync(join(OUT_DIR, `${base}__one_vs_rest.tsv`),    out.oneVsRest,     'utf-8');
    writeFileSync(join(OUT_DIR, `${base}__result.json`),        out.resultJson,    'utf-8');
    writeFileSync(join(OUT_DIR, `${base}__network.graphml`),    out.networkGraphml, 'utf-8');
    writeFileSync(join(OUT_DIR, `${base}__network.sif`),        out.networkSif,    'utf-8');
    summary.set(spec.name, { setNames: out.setNames, rowCount: out.rowCount });
    console.log(`wrote 7 fixtures for ${spec.name}`);
  }
  writeReadme(summary);
  console.log(`\nGenerated ${SAMPLES.length * 7} fixtures + README.md in ${OUT_DIR}`);
}

main();
