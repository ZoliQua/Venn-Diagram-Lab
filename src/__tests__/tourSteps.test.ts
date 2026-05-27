import { describe, it, expect } from 'vitest';
import { TOUR_STEPS, isStepReplayable } from '../utils/tourSteps.ts';
import { TOUR_DATASET } from '../utils/tourMock.ts';
import { MODEL_LIST } from '../models.ts';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('TOUR_STEPS', () => {
  it('has exactly 14 steps as specified', () => {
    expect(TOUR_STEPS.length).toBe(14);
  });

  it('has unique step ids', () => {
    const ids = TOUR_STEPS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every non-center step a selector', () => {
    for (const step of TOUR_STEPS) {
      if (step.placement !== 'center') {
        expect(step.selector).toBeTruthy();
      }
    }
  });

  it('marks first and last steps as center modals', () => {
    expect(TOUR_STEPS[0].placement).toBe('center');
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].placement).toBe('center');
  });

  it('every step has a non-empty title and body', () => {
    for (const step of TOUR_STEPS) {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(20);
    }
  });

  it('includes the new right-panel-properties step that selects ABCD', () => {
    const step = TOUR_STEPS.find(s => s.id === 'right-panel-properties');
    expect(step).toBeDefined();
    const hasSelect = step!.enterActions?.some(a => a.kind === 'selectRegion' && a.label === 'ABCD');
    expect(hasSelect).toBe(true);
  });

  it('marks cycle steps as replayable', () => {
    const view = TOUR_STEPS.find(s => s.id === 'sidebar-view');
    const enrichment = TOUR_STEPS.find(s => s.id === 'right-panel-enrichment');
    expect(view && isStepReplayable(view)).toBe(true);
    expect(enrichment && isStepReplayable(enrichment)).toBe(true);
  });

  it('does not mark static steps as replayable', () => {
    const intro = TOUR_STEPS.find(s => s.id === 'welcome');
    const open = TOUR_STEPS.find(s => s.id === 'toolbar-open');
    expect(intro && isStepReplayable(intro)).toBe(false);
    expect(open && isStepReplayable(open)).toBe(false);
  });
});

describe('TOUR_DATASET', () => {
  it('points to a file that exists in the /data directory', () => {
    const filePath = resolve(__dirname, '..', '..', 'data', TOUR_DATASET.filename);
    expect(existsSync(filePath)).toBe(true);
  });

  it('maps preferredColumns to actual file columns', () => {
    const filePath = resolve(__dirname, '..', '..', 'data', TOUR_DATASET.filename);
    const header = readFileSync(filePath, 'utf-8').split('\n')[0];
    const cols = header.split(TOUR_DATASET.delimiter);
    for (const idx of TOUR_DATASET.preferredColumns) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(cols.length);
      expect(cols[idx].trim().length).toBeGreaterThan(0);
    }
  });

  it('references a preferred model that exists in MODEL_LIST', () => {
    const match = MODEL_LIST.find(m => m.filename === TOUR_DATASET.preferredModel);
    expect(match).toBeDefined();
  });

  it('preferredColumns length matches the set count implied by the model', () => {
    // venn-4a-set-edwards.svg -> 4 sets
    expect(TOUR_DATASET.preferredColumns.length).toBe(4);
  });
});
