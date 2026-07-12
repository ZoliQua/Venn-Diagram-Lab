import { describe, expect, it } from 'vitest';
import { exportResultJson, formatJsonNumber } from '../jsonExport.ts';
import type { VennResult } from '../csvParser.ts';

describe('formatJsonNumber', () => {
  it('renders integers as integers', () => {
    expect(formatJsonNumber(1394)).toBe('1394');
    expect(formatJsonNumber(0)).toBe('0');
  });
  it('renders whole-number floats without a decimal point', () => {
    expect(formatJsonNumber(2.0)).toBe('2');
    expect(formatJsonNumber(1.0)).toBe('1');
  });
  it('rounds floats to 6 decimals, shortest form (trailing zeros stripped)', () => {
    expect(formatJsonNumber(0.5)).toBe('0.5');
    expect(formatJsonNumber(0.1000000)).toBe('0.1');
    expect(formatJsonNumber(0.1234567)).toBe('0.123457'); // 7th decimal rounded off
    expect(formatJsonNumber(1 / 3)).toBe('0.333333');
    expect(formatJsonNumber(2 / 3)).toBe('0.666667');
  });
  it('rounds tiny values below 1e-6 to 0', () => {
    expect(formatJsonNumber(1e-20)).toBe('0');
  });
});

function makeResult(): VennResult {
  return {
    inclusive: new Map([['A', 2], ['B', 3], ['AB', 2]]),
    exclusive: new Map([['A', 0], ['B', 1], ['AB', 2]]),
    inclusiveItems: new Map(),
    exclusiveItems: new Map([['A', []], ['B', ['b1']], ['AB', ['s1', 's2']]]),
    totalUniqueItems: 3,
  };
}

describe('exportResultJson', () => {
  const json = exportResultJson(makeResult(), 2, ['Alpha', 'Beta'], 3, 'venn-2-set');

  it('is 2-space-indented JSON with the pinned top-level key order', () => {
    expect(json.startsWith('{\n  "schemaVersion": "1",\n')).toBe(true);
    const order = ['schemaVersion', 'model', 'setNames', 'universeSize', 'regions', 'setSizes', 'statistics']
      .map(k => json.indexOf(`"${k}"`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every(i => i >= 0)).toBe(true);
  });

  it('round-trips and carries integer counts + set names/sizes', () => {
    const obj = JSON.parse(json);
    expect(obj.schemaVersion).toBe('1');
    expect(obj.model).toBe('venn-2-set');
    expect(obj.setNames).toEqual({ A: 'Alpha', B: 'Beta' });
    expect(obj.universeSize).toBe(3);
    expect(obj.setSizes).toEqual({ A: 2, B: 3 });
    expect(obj.regions).toHaveLength(3); // 2^2 - 1
  });

  it('orders regions by depth then label, with the pinned region key order', () => {
    const obj = JSON.parse(json);
    expect(obj.regions.map((r: { label: string }) => r.label)).toEqual(['A', 'B', 'AB']);
    expect(Object.keys(obj.regions[2])).toEqual([
      'label', 'sets', 'depth', 'exclusiveCount', 'inclusiveCount', 'exclusiveItems',
    ]);
    expect(obj.regions[2]).toMatchObject({
      label: 'AB', sets: ['A', 'B'], depth: 2, exclusiveCount: 2, inclusiveCount: 2,
      exclusiveItems: ['s1', 's2'],
    });
  });

  it('renders a whole-number float statistic as an integer (overlapCoeff = 1)', () => {
    // inter=2, min(sizeA,sizeB)=2 -> overlapCoeff = 1.0 -> must serialize as `1`, not `1.0`.
    expect(json).toContain('"overlapCoeff": 1,');
    const obj = JSON.parse(json);
    expect(Object.keys(obj.statistics[0])).toEqual([
      'a', 'b', 'jaccard', 'dice', 'overlapCoeff', 'intersection', 'union',
      'expected', 'foldEnrichment', 'pValue', 'fdr', 'bonferroni', 'pTwoSided', 'significant',
    ]);
    expect(obj.statistics[0].jaccard).toBe(0.666667); // 2/3 rounded to 6dp
  });
});
