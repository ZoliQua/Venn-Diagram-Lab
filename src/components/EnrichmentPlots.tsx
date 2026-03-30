import { useMemo, useState } from 'react';
import type { PairwiseStat } from '../utils/statistics.ts';
import {
  buildEnrichmentBarSvg,
  buildEnrichmentLollipopSvg,
  buildEnrichmentHeatmapSvg,
  metricLabel,
} from '../utils/enrichmentPlotSvg.ts';
import type { EnrichmentMetric } from '../utils/enrichmentPlotSvg.ts';

interface EnrichmentPlotsProps {
  stats: PairwiseStat[];
  setLetters: string[];
  setNames: string[];
  datasetName?: string;
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

export function EnrichmentPlots({ stats, setLetters, setNames, datasetName }: EnrichmentPlotsProps) {
  const [metric, setMetric] = useState<EnrichmentMetric>('neglog10fdr');

  const barSvg = useMemo(() => buildEnrichmentBarSvg(stats, { metric }), [stats, metric]);
  const lollipopSvg = useMemo(() => buildEnrichmentLollipopSvg(stats, { metric }), [stats, metric]);
  const heatmapSvg = useMemo(
    () => buildEnrichmentHeatmapSvg(stats, setLetters, setNames, { metric }),
    [stats, setLetters, setNames, metric],
  );

  const prefix = slug(datasetName);
  const metricSuffix = metric === 'foldEnrichment' ? 'fe' : 'neglog10fdr';

  return (
    <div className="enrichment-plots">
      <div className="enrichment-plots-header">
        <div className="enrichment-metric-toggle" role="radiogroup" aria-label="Metric">
          <button
            role="radio"
            aria-checked={metric === 'neglog10fdr'}
            className={`btn btn-sm ${metric === 'neglog10fdr' ? 'btn-accent' : ''}`}
            onClick={() => setMetric('neglog10fdr')}
          >
            {metricLabel('neglog10fdr')}
          </button>
          <button
            role="radio"
            aria-checked={metric === 'foldEnrichment'}
            className={`btn btn-sm ${metric === 'foldEnrichment' ? 'btn-accent' : ''}`}
            onClick={() => setMetric('foldEnrichment')}
          >
            {metricLabel('foldEnrichment')}
          </button>
        </div>
      </div>

      <div className="enrichment-plot-block">
        <div className="enrichment-plot-title">
          <span>Bar chart</span>
          <button
            className="btn btn-sm"
            onClick={() => downloadSvg(barSvg, `${prefix}_enrichment_bar_${metricSuffix}.svg`)}
          >
            Export SVG
          </button>
        </div>
        <div className="enrichment-plot-svg" dangerouslySetInnerHTML={{ __html: barSvg }} />
      </div>

      <div className="enrichment-plot-block">
        <div className="enrichment-plot-title">
          <span>Lollipop chart</span>
          <button
            className="btn btn-sm"
            onClick={() => downloadSvg(lollipopSvg, `${prefix}_enrichment_lollipop_${metricSuffix}.svg`)}
          >
            Export SVG
          </button>
        </div>
        <div className="enrichment-plot-svg" dangerouslySetInnerHTML={{ __html: lollipopSvg }} />
      </div>

      <div className="enrichment-plot-block">
        <div className="enrichment-plot-title">
          <span>Heatmap</span>
          <button
            className="btn btn-sm"
            onClick={() => downloadSvg(heatmapSvg, `${prefix}_enrichment_heatmap_${metricSuffix}.svg`)}
          >
            Export SVG
          </button>
        </div>
        <div className="enrichment-plot-svg" dangerouslySetInnerHTML={{ __html: heatmapSvg }} />
      </div>
    </div>
  );
}
