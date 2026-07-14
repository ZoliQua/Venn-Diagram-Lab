import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeCsvText, toMatrixTsv, toOneVsRestTsv, toRegionSummaryTsv, toStatisticsTsv } from '../src/api.ts';
import { loadSampleText } from '../src/samples.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const golden = (name: string) => readFileSync(join(FIXTURES, name), 'utf8').replace(/\n$/, '');

const CASES = [
  { sample: 'dataset_real_cancer_drivers_4', model: 'venn-4-set' },
  { sample: 'dataset_real_msigdb_cancer_pathways', model: 'venn-5-set-grunbaum' },
  { sample: 'dataset_real_msigdb_immune_pathways', model: 'venn-4-set' },
  { sample: 'dataset_mock_streaming_platforms', model: 'venn-8-set' },
  { sample: 'dataset_mock_gene_sets', model: 'venn-6-set' },
] as const;

const EXPORTERS = {
  region_summary: toRegionSummaryTsv,
  matrix: toMatrixTsv,
  statistics: toStatisticsTsv,
  one_vs_rest: toOneVsRestTsv,
} as const;

describe('byte-parity trio vs shared goldens', () => {
  for (const { sample, model } of CASES) {
    for (const kind of ['region_summary', 'matrix', 'statistics', 'one_vs_rest'] as const) {
      it(`${sample} ${kind} matches golden`, () => {
        const result = analyzeCsvText(loadSampleText(sample));
        const produced = EXPORTERS[kind](result).replace(/\n$/, '');
        expect(produced).toBe(golden(`${sample}__${model}__${kind}.tsv`));
      });
    }
  }
});
