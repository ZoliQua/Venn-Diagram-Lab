import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PLOT_STYLE,
  createDefaultPlotSettings,
  PLOT_TYPE_LABELS,
} from '../utils/enrichmentPlotStyle.ts';
import type { EnrichmentPlotType } from '../utils/enrichmentPlotStyle.ts';

const PLOT_TYPES: EnrichmentPlotType[] = ['bar', 'lollipop', 'heatmap'];

describe('DEFAULT_PLOT_STYLE', () => {
  it('matches the v1.10.1 hardcoded color constants', () => {
    expect(DEFAULT_PLOT_STYLE.sigColor).toBe('#2e7d32');
    expect(DEFAULT_PLOT_STYLE.nsColor).toBe('#888888');
    expect(DEFAULT_PLOT_STYLE.gradientLowColor).toBe('#ffffff');
    expect(DEFAULT_PLOT_STYLE.gradientHighFdrColor).toBe('#1b5e20');
    expect(DEFAULT_PLOT_STYLE.gradientHighFeColor).toBe('#4a148c');
    expect(DEFAULT_PLOT_STYLE.fontFamily).toBe('Tahoma,sans-serif');
    expect(DEFAULT_PLOT_STYLE.fontSize).toBe(10);
    expect(DEFAULT_PLOT_STYLE.background).toBe('white');
  });

  it('has all visibility toggles on by default', () => {
    expect(DEFAULT_PLOT_STYLE.showAxisLabel).toBe(true);
    expect(DEFAULT_PLOT_STYLE.showPairLabels).toBe(true);
    expect(DEFAULT_PLOT_STYLE.showSigMarkers).toBe(true);
    expect(DEFAULT_PLOT_STYLE.showLegend).toBe(true);
  });
});

describe('createDefaultPlotSettings', () => {
  it('returns an object with all three plot types, each equal to DEFAULT_PLOT_STYLE', () => {
    const settings = createDefaultPlotSettings();
    for (const t of PLOT_TYPES) {
      expect(settings[t]).toEqual(DEFAULT_PLOT_STYLE);
    }
  });

  it('returns independent copies per plot (mutation does not cross-contaminate)', () => {
    const settings = createDefaultPlotSettings();
    settings.bar.sigColor = '#ff0000';
    expect(settings.lollipop.sigColor).toBe('#2e7d32');
    expect(settings.heatmap.sigColor).toBe('#2e7d32');
  });

  it('does not share a reference with DEFAULT_PLOT_STYLE (no accidental mutation)', () => {
    const settings = createDefaultPlotSettings();
    settings.bar.sigColor = '#deadbe';
    expect(DEFAULT_PLOT_STYLE.sigColor).toBe('#2e7d32');
  });
});

describe('PLOT_TYPE_LABELS', () => {
  it('provides a human label for every plot type', () => {
    for (const t of PLOT_TYPES) {
      expect(PLOT_TYPE_LABELS[t]).toBeTruthy();
      expect(PLOT_TYPE_LABELS[t].length).toBeGreaterThan(2);
    }
  });
});
