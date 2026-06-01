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
import { itemShareDistribution } from '../utils/shareDistribution.ts';
import {
  buildShareDistributionSvg,
  DEFAULT_SHARE_DIST_STYLE,
} from '../utils/shareDistributionSvgBuilder.ts';
import { clusterSetOrder } from '../utils/clusterHeatmap.ts';

interface EnrichmentPlotCanvasProps {
  plotType: EnrichmentPlotType;
  stats: PairwiseStat[];
  setLetters: string[];
  setNames: string[];
  matrix: readonly (readonly number[])[];
  metric: EnrichmentMetric;
  style: EnrichmentPlotStyle;
}

export function EnrichmentPlotCanvas({
  plotType, stats, setLetters, setNames, matrix, metric, style,
}: EnrichmentPlotCanvasProps) {
  const svg = useMemo(() => {
    if (plotType === 'bar') {
      return buildEnrichmentBarSvg(stats, { metric, style, width: 800, height: 360 });
    }
    if (plotType === 'lollipop') {
      return buildEnrichmentLollipopSvg(stats, { metric, style, width: 800, height: 360 });
    }
    if (plotType === 'shareDistribution') {
      const dist = itemShareDistribution(matrix, setLetters.length);
      return buildShareDistributionSvg(dist, {
        style: {
          ...DEFAULT_SHARE_DIST_STYLE,
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
          background: style.background,
        },
      });
    }
    // heatmap — cluster-aware if axisOrder='cluster' and N≥3
    if (style.axisOrder === 'cluster' && setLetters.length >= 3) {
      const n = setLetters.length;
      const letterIndex = new Map<string, number>();
      setLetters.forEach((l, i) => letterIndex.set(l, i));
      const D = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
      for (const st of stats) {
        const i = letterIndex.get(st.a);
        const j = letterIndex.get(st.b);
        if (i === undefined || j === undefined) continue;
        D[i][j] = 1 - st.jaccard;
        D[j][i] = 1 - st.jaccard;
      }
      const order = clusterSetOrder(D, style.linkageMethod);
      return buildEnrichmentHeatmapSvg(stats, setLetters, setNames, {
        metric,
        style,
        clusterOrder: order,
        showRowDendrogram: style.showRowDendrogram,
        showColDendrogram: style.showColDendrogram,
        dendrogramFraction: style.dendrogramFraction,
      });
    }
    return buildEnrichmentHeatmapSvg(stats, setLetters, setNames, { metric, style });
  }, [plotType, stats, setLetters, setNames, matrix, metric, style]);

  const subtitle = plotType === 'shareDistribution'
    ? `${setLetters.length}-set membership distribution`
    : (plotType === 'heatmap' && style.axisOrder === 'cluster' && setLetters.length >= 3
        ? `${metricLabel(metric)} — clustered (${style.linkageMethod})`
        : metricLabel(metric));

  return (
    <div className="enrichment-plot-canvas">
      <div className="enrichment-plot-canvas-header">
        <div className="enrichment-plot-canvas-title">{PLOT_TYPE_LABELS[plotType]}</div>
        <div className="enrichment-plot-canvas-subtitle">{subtitle}</div>
      </div>
      <div className="enrichment-plot-canvas-svg" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
