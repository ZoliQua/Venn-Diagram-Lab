/**
 * Style and state model for the Enrichment plot editor (v1.11.0).
 *
 * The three plots (bar, lollipop, heatmap) each keep an independent style
 * object. The metric (neglog10fdr vs foldEnrichment) is shared app-level.
 *
 * DEFAULT_PLOT_STYLE intentionally reproduces the hardcoded v1.10.1 values;
 * the SVG generators treat a missing `style` option as equivalent to this
 * default so the PDF export (which never passes a style) stays bit-identical
 * to v1.10.1.
 */

export type EnrichmentPlotType = 'bar' | 'lollipop' | 'heatmap';

export interface EnrichmentPlotStyle {
  sigColor: string;
  nsColor: string;
  fontSize: number;
  fontFamily: string;
  background: 'white' | 'dark';
  showAxisLabel: boolean;   // rotated Y-axis metric label (bar/lollipop); top metric title (heatmap)
  showPairLabels: boolean;  // X-tick pair labels (bar/lollipop); row+col labels (heatmap)
  showSigMarkers: boolean;  // significance asterisks above bars/dots (no-op on heatmap)
  showLegend: boolean;      // bottom legend (bar/lollipop); right colorbar (heatmap)
  gradientLowColor: string;
  gradientHighFdrColor: string;
  gradientHighFeColor: string;
}

export const DEFAULT_PLOT_STYLE: EnrichmentPlotStyle = {
  sigColor: '#2e7d32',
  nsColor: '#888888',
  fontSize: 10,
  fontFamily: 'Tahoma,sans-serif',
  background: 'white',
  showAxisLabel: true,
  showPairLabels: true,
  showSigMarkers: true,
  showLegend: true,
  gradientLowColor: '#ffffff',
  gradientHighFdrColor: '#1b5e20',
  gradientHighFeColor: '#4a148c',
};

export interface EnrichmentPlotSettings {
  bar: EnrichmentPlotStyle;
  lollipop: EnrichmentPlotStyle;
  heatmap: EnrichmentPlotStyle;
}

export function createDefaultPlotSettings(): EnrichmentPlotSettings {
  return {
    bar: { ...DEFAULT_PLOT_STYLE },
    lollipop: { ...DEFAULT_PLOT_STYLE },
    heatmap: { ...DEFAULT_PLOT_STYLE },
  };
}

export interface PlotEditState {
  plotType: EnrichmentPlotType;
}

export const PLOT_TYPE_LABELS: Record<EnrichmentPlotType, string> = {
  bar: 'Bar chart',
  lollipop: 'Lollipop chart',
  heatmap: 'Heatmap',
};
