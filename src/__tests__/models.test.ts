import { describe, it, expect } from 'vitest';
import { MODEL_LIST, getModelsBySetCount } from '../models.ts';
import { existsSync } from 'fs';
import { resolve } from 'path';

describe('MODEL_LIST', () => {
  it('contains 39 models', () => {
    expect(MODEL_LIST).toHaveLength(39);
  });

  it('every model has required fields', () => {
    for (const m of MODEL_LIST) {
      expect(m.filename).toMatch(/^venn-\d.*\.svg$/);
      expect(m.label).toBeTruthy();
      expect(m.setCount).toBeGreaterThanOrEqual(2);
      expect(m.setCount).toBeLessThanOrEqual(8);
    }
  });

  it('filenames are unique', () => {
    const filenames = MODEL_LIST.map(m => m.filename);
    expect(new Set(filenames).size).toBe(filenames.length);
  });

  it('every SVG file exists on disk', () => {
    for (const m of MODEL_LIST) {
      const path = resolve(__dirname, '../../models/svg', m.filename);
      expect(existsSync(path), `Missing: ${m.filename}`).toBe(true);
    }
  });

  it('every JSON file exists on disk', () => {
    for (const m of MODEL_LIST) {
      const jsonName = m.filename.replace('.svg', '.json');
      const path = resolve(__dirname, '../../models/json', jsonName);
      expect(existsSync(path), `Missing: ${jsonName}`).toBe(true);
    }
  });
});

describe('getModelsBySetCount', () => {
  it('groups models correctly', () => {
    const groups = getModelsBySetCount();
    expect(groups.size).toBeGreaterThanOrEqual(7); // 2-8 sets

    let total = 0;
    for (const [setCount, models] of groups) {
      expect(setCount).toBeGreaterThanOrEqual(2);
      expect(setCount).toBeLessThanOrEqual(8);
      for (const m of models) {
        expect(m.setCount).toBe(setCount);
      }
      total += models.length;
    }
    expect(total).toBe(39);
  });
});
