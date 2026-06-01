import { useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import type { PairwiseStat } from '../utils/statistics.ts';
import {
  buildEnrichmentBarSvg,
  buildEnrichmentLollipopSvg,
  buildEnrichmentHeatmapSvg,
  metricLabel,
} from '../utils/enrichmentPlotSvg.ts';
import type { EnrichmentMetric } from '../utils/enrichmentPlotSvg.ts';
import type { EnrichmentPlotSettings, EnrichmentPlotType } from '../utils/enrichmentPlotStyle.ts';
import { itemShareDistribution } from '../utils/shareDistribution.ts';
import { buildShareDistributionSvg, DEFAULT_SHARE_DIST_STYLE } from '../utils/shareDistributionSvgBuilder.ts';
import { clusterSetOrder } from '../utils/clusterHeatmap.ts';

interface EnrichmentPlotsProps {
  stats: PairwiseStat[];
  setLetters: string[];
  setNames: string[];
  matrix: readonly (readonly number[])[];
  datasetName?: string;
  metric: EnrichmentMetric;
  onMetricChange: (metric: EnrichmentMetric) => void;
  settings: EnrichmentPlotSettings;
  activePlot?: EnrichmentPlotType | null;
  onPlotClick?: (plot: EnrichmentPlotType) => void;
}

function downloadSvg(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slug(name?: string): string {
  if (!name) return 'enrichment';
  return name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'enrichment';
}

function stopClick<E extends { stopPropagation: () => void }>(fn: () => void) {
  return (e: E) => {
    e.stopPropagation();
    fn();
  };
}

export function EnrichmentPlots({
  stats, setLetters, setNames, matrix, datasetName,
  metric, onMetricChange,
  settings,
  activePlot = null,
  onPlotClick,
}: EnrichmentPlotsProps) {
  const barSvg = useMemo(
    () => buildEnrichmentBarSvg(stats, { metric, style: settings.bar }),
    [stats, metric, settings.bar],
  );
  const lollipopSvg = useMemo(
    () => buildEnrichmentLollipopSvg(stats, { metric, style: settings.lollipop }),
    [stats, metric, settings.lollipop],
  );
  const heatmapSvg = useMemo(() => {
    const s = settings.heatmap;
    if (s.axisOrder === 'cluster' && setLetters.length >= 3) {
      const n = setLetters.length;
      const letterIndex = new Map<string, number>();
      setLetters.forEach((ltr, idx) => letterIndex.set(ltr, idx));
      const D = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
      for (const st of stats) {
        const i = letterIndex.get(st.a);
        const j = letterIndex.get(st.b);
        if (i === undefined || j === undefined) continue;
        D[i][j] = 1 - st.jaccard;
        D[j][i] = 1 - st.jaccard;
      }
      const order = clusterSetOrder(D, s.linkageMethod);
      return buildEnrichmentHeatmapSvg(stats, setLetters, setNames, {
        metric,
        style: s,
        clusterOrder: order,
        showRowDendrogram: s.showRowDendrogram,
        showColDendrogram: s.showColDendrogram,
        dendrogramFraction: s.dendrogramFraction,
      });
    }
    return buildEnrichmentHeatmapSvg(stats, setLetters, setNames, { metric, style: s });
  }, [stats, setLetters, setNames, metric, settings.heatmap]);
  const shareDistSvg = useMemo(() => {
    const dist = itemShareDistribution(matrix, setLetters.length);
    return buildShareDistributionSvg(dist, {
      // The shareDistribution-specific defaults (cream→purple gradient) read
      // well on both light and dark backgrounds. The heatmap-derived
      // gradientLowColor='#ffffff' would render the lowest bar invisible on
      // white — don't reuse it here. Only typography + background follow
      // the user-configurable side-panel style.
      style: {
        ...DEFAULT_SHARE_DIST_STYLE,
        fontSize: settings.shareDistribution.fontSize,
        fontFamily: settings.shareDistribution.fontFamily,
        background: settings.shareDistribution.background,
      },
    });
  }, [matrix, setLetters.length, settings.shareDistribution]);

  const prefix = slug(datasetName);
  const metricSuffix = metric === 'foldEnrichment' ? 'fe' : 'neglog10fdr';

  const handleBlockClick = (plot: EnrichmentPlotType) => () => onPlotClick?.(plot);
  const handleBlockKey = (plot: EnrichmentPlotType) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPlotClick?.(plot);
    }
  };

  const renderBlock = (
    plot: EnrichmentPlotType,
    title: string,
    svg: string,
    filenameKey: string,
  ) => {
    const isActive = activePlot === plot;
    const isClickable = !!onPlotClick;
    const classNames = [
      'enrichment-plot-block',
      isClickable ? 'enrichment-plot-block--clickable' : '',
      isActive ? 'enrichment-plot-block--active' : '',
    ].filter(Boolean).join(' ');

    return (
      <div
        className={classNames}
        data-plot-card={plot}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? handleBlockClick(plot) : undefined}
        onKeyDown={isClickable ? handleBlockKey(plot) : undefined}
        aria-pressed={isClickable ? isActive : undefined}
      >
        <div className="enrichment-plot-title">
          <span>{title}</span>
          <button
            className="btn btn-sm"
            onClick={stopClick(() => downloadSvg(svg, `${prefix}_enrichment_${filenameKey}_${metricSuffix}.svg`))}
          >
            Export SVG
          </button>
        </div>
        <div className="enrichment-plot-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    );
  };

  return (
    <div className="enrichment-plots">
      <div className="enrichment-plots-header">
        <div className="enrichment-metric-toggle" role="radiogroup" aria-label="Metric">
          <button
            role="radio"
            aria-checked={metric === 'neglog10fdr'}
            className={`btn btn-sm ${metric === 'neglog10fdr' ? 'btn-accent' : ''}`}
            onClick={() => onMetricChange('neglog10fdr')}
          >
            {metricLabel('neglog10fdr')}
          </button>
          <button
            role="radio"
            aria-checked={metric === 'foldEnrichment'}
            className={`btn btn-sm ${metric === 'foldEnrichment' ? 'btn-accent' : ''}`}
            onClick={() => onMetricChange('foldEnrichment')}
          >
            {metricLabel('foldEnrichment')}
          </button>
        </div>
      </div>

      {renderBlock('bar', 'Bar chart', barSvg, 'bar')}
      {renderBlock('lollipop', 'Lollipop chart', lollipopSvg, 'lollipop')}
      {renderBlock('heatmap', 'Heatmap', heatmapSvg, 'heatmap')}
      {renderBlock('shareDistribution', 'Item Share Distribution', shareDistSvg, 'shareDistribution')}
    </div>
  );
}
