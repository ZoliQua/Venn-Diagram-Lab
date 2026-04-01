import { useMemo } from 'react';
import type { PairwiseStat } from '../utils/statistics.ts';
import {
  buildEnrichmentBarSvg,
  buildEnrichmentLollipopSvg,
  buildEnrichmentHeatmapSvg,
  metricLabel,
} from '../utils/enrichmentPlotSvg.ts';
import type { EnrichmentMetric } from '../utils/enrichmentPlotSvg.ts';
import type { EnrichmentPlotStyle, EnrichmentPlotType } from '../utils/enrichmentPlotStyle.ts';
import { PLOT_TYPE_LABELS } from '../utils/enrichmentPlotStyle.ts';

interface EnrichmentPlotCanvasProps {
  plotType: EnrichmentPlotType;
  stats: PairwiseStat[];
  setLetters: string[];
  setNames: string[];
  metric: EnrichmentMetric;
  style: EnrichmentPlotStyle;
}

export function EnrichmentPlotCanvas({
  plotType, stats, setLetters, setNames, metric, style,
}: EnrichmentPlotCanvasProps) {
  const svg = useMemo(() => {
    if (plotType === 'bar') {
      return buildEnrichmentBarSvg(stats, { metric, style, width: 800, height: 360 });
    }
    if (plotType === 'lollipop') {
      return buildEnrichmentLollipopSvg(stats, { metric, style, width: 800, height: 360 });
    }
    return buildEnrichmentHeatmapSvg(stats, setLetters, setNames, { metric, style });
  }, [plotType, stats, setLetters, setNames, metric, style]);

  return (
    <div className="enrichment-plot-canvas">
      <div className="enrichment-plot-canvas-header">
        <div className="enrichment-plot-canvas-title">{PLOT_TYPE_LABELS[plotType]}</div>
        <div className="enrichment-plot-canvas-subtitle">{metricLabel(metric)}</div>
      </div>
      <div className="enrichment-plot-canvas-svg" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
