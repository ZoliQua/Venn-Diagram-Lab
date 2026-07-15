import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeCsvText, toNetworkGraphml, toNetworkSif } from '../src/api.ts';
import { loadSampleText } from '../src/samples.ts';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const golden = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');

// model must match the value baked into the golden (and generate-parity-fixtures.mts).
// Goldens use the default 'intersection' edge weight metric.
const CASES = [
  { sample: 'dataset_real_cancer_drivers_4', model: 'venn-4-set' },
  { sample: 'dataset_real_msigdb_cancer_pathways', model: 'venn-5-set-grunbaum' },
  { sample: 'dataset_real_msigdb_immune_pathways', model: 'venn-4-set' },
  { sample: 'dataset_mock_streaming_platforms', model: 'venn-8-set' },
  { sample: 'dataset_mock_gene_sets', model: 'venn-6-set' },
] as const;

describe('network GraphML byte-parity vs shared goldens', () => {
  for (const { sample, model } of CASES) {
    it(`${sample} network.graphml matches golden`, () => {
      const result = analyzeCsvText(loadSampleText(sample));
      expect(toNetworkGraphml(result)).toBe(golden(`${sample}__${model}__network.graphml`));
    });
  }
});

describe('network SIF byte-parity vs shared goldens', () => {
  for (const { sample, model } of CASES) {
    it(`${sample} network.sif matches golden`, () => {
      const result = analyzeCsvText(loadSampleText(sample));
      expect(toNetworkSif(result)).toBe(golden(`${sample}__${model}__network.sif`));
    });
  }
});
