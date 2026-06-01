import type { EnrichmentMetric } from '../utils/enrichmentPlotSvg.ts';
import { metricLabel } from '../utils/enrichmentPlotSvg.ts';
import type { EnrichmentPlotStyle, EnrichmentPlotType } from '../utils/enrichmentPlotStyle.ts';
import { PLOT_TYPE_LABELS } from '../utils/enrichmentPlotStyle.ts';

interface EnrichmentPlotEditorProps {
  plotType: EnrichmentPlotType;
  metric: EnrichmentMetric;
  style: EnrichmentPlotStyle;
  nSets: number;
  onMetricChange: (m: EnrichmentMetric) => void;
  onUpdateStyle: (patch: Partial<EnrichmentPlotStyle>) => void;
  onResetStyle: () => void;
  onExit: () => void;
}

const FONT_OPTIONS = ['Tahoma,sans-serif', 'Arial,sans-serif', 'Helvetica,sans-serif', 'Times New Roman,serif', 'Courier New,monospace'];
const FONT_LABELS: Record<string, string> = {
  'Tahoma,sans-serif': 'Tahoma',
  'Arial,sans-serif': 'Arial',
  'Helvetica,sans-serif': 'Helvetica',
  'Times New Roman,serif': 'Times New Roman',
  'Courier New,monospace': 'Courier New',
};

export function EnrichmentPlotEditor({
  plotType, metric, style, nSets,
  onMetricChange, onUpdateStyle, onResetStyle, onExit,
}: EnrichmentPlotEditorProps) {
  const isHeatmap = plotType === 'heatmap';
  const isShareDist = plotType === 'shareDistribution';

  return (
    <div className="plot-editor">
      <div className="sidebar-section-title">4. EDIT PLOT — {PLOT_TYPE_LABELS[plotType]}</div>

      <div className="plot-editor-group">
        <div className="plot-editor-label">Metric</div>
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

      <div className="plot-editor-group">
        <div className="plot-editor-label">Colors</div>
        <div className="plot-editor-color-row">
          <span>Significant</span>
          <input
            type="color"
            value={style.sigColor}
            onChange={e => onUpdateStyle({ sigColor: e.target.value })}
          />
        </div>
        <div className="plot-editor-color-row">
          <span>Not significant</span>
          <input
            type="color"
            value={style.nsColor}
            onChange={e => onUpdateStyle({ nsColor: e.target.value })}
          />
        </div>
        {isHeatmap && (
          <>
            <div className="plot-editor-color-row">
              <span>Gradient low</span>
              <input
                type="color"
                value={style.gradientLowColor}
                onChange={e => onUpdateStyle({ gradientLowColor: e.target.value })}
              />
            </div>
            <div className="plot-editor-color-row">
              <span>Gradient high (FDR)</span>
              <input
                type="color"
                value={style.gradientHighFdrColor}
                onChange={e => onUpdateStyle({ gradientHighFdrColor: e.target.value })}
              />
            </div>
            <div className="plot-editor-color-row">
              <span>Gradient high (FE)</span>
              <input
                type="color"
                value={style.gradientHighFeColor}
                onChange={e => onUpdateStyle({ gradientHighFeColor: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      <div className="plot-editor-group">
        <div className="plot-editor-label">Typography</div>
        <div className="test-font-size">
          <label>Font-size: {style.fontSize}px</label>
          <input
            type="range" min="6" max="16" step="1"
            value={style.fontSize}
            onChange={e => onUpdateStyle({ fontSize: parseInt(e.target.value) })}
          />
        </div>
        <div className="test-font-type-row">
          <label>Font type</label>
          <select
            className="prop-select"
            value={style.fontFamily}
            onChange={e => onUpdateStyle({ fontFamily: e.target.value })}
          >
            {FONT_OPTIONS.map(f => (
              <option key={f} value={f}>{FONT_LABELS[f] ?? f}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="plot-editor-group">
        <div className="plot-editor-label">Background</div>
        <div className="test-show-inline">
          <button
            className={`btn btn-xs btn-toggle ${style.background === 'white' ? 'btn-toggle-active' : ''}`}
            onClick={() => onUpdateStyle({ background: 'white' })}
          >
            White
          </button>
          <button
            className={`btn btn-xs btn-toggle ${style.background === 'dark' ? 'btn-toggle-active' : ''}`}
            onClick={() => onUpdateStyle({ background: 'dark' })}
          >
            Dark
          </button>
        </div>
      </div>

      {isHeatmap && (
        <div className="plot-editor-group">
          <div className="plot-editor-label">Axis order</div>
          <div className="test-show-inline" data-tour="cluster-toggle">
            <button
              type="button"
              className={`btn btn-xs btn-toggle ${style.axisOrder === 'original' ? 'btn-toggle-active' : ''}`}
              onClick={() => onUpdateStyle({ axisOrder: 'original' })}
            >
              Original
            </button>
            <button
              type="button"
              className={`btn btn-xs btn-toggle ${style.axisOrder === 'cluster' ? 'btn-toggle-active' : ''}`}
              onClick={() => onUpdateStyle({ axisOrder: 'cluster' })}
              disabled={nSets < 3}
              title={nSets < 3 ? 'Clustering needs 3 or more sets.' : undefined}
            >
              Cluster
            </button>
          </div>

          {style.axisOrder === 'cluster' && (
            <>
              <div className="test-font-type-row">
                <label>Linkage</label>
                <select
                  className="prop-select"
                  value={style.linkageMethod}
                  onChange={e => onUpdateStyle({ linkageMethod: e.target.value as 'average' | 'complete' | 'single' })}
                >
                  <option value="average">Average (UPGMA)</option>
                  <option value="complete">Complete</option>
                  <option value="single">Single</option>
                </select>
              </div>

              <div className="test-font-size">
                <label>Dendrogram size: {Math.round(style.dendrogramFraction * 100)}%</label>
                <input
                  type="range" min="6" max="25" step="1"
                  value={Math.round(style.dendrogramFraction * 100)}
                  onChange={e => onUpdateStyle({ dendrogramFraction: Number(e.target.value) / 100 })}
                />
              </div>

              <div className="test-show-inline">
                <button
                  className={`btn btn-xs btn-toggle ${style.showRowDendrogram ? 'btn-toggle-active' : ''}`}
                  onClick={() => onUpdateStyle({ showRowDendrogram: !style.showRowDendrogram })}
                >
                  Row dendrogram
                </button>
                <button
                  className={`btn btn-xs btn-toggle ${style.showColDendrogram ? 'btn-toggle-active' : ''}`}
                  onClick={() => onUpdateStyle({ showColDendrogram: !style.showColDendrogram })}
                >
                  Column dendrogram
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="plot-editor-group">
        <div className="plot-editor-label">Visibility</div>
        <div className="plot-editor-toggle-grid">
          <button
            className={`btn btn-xs btn-toggle ${style.showAxisLabel ? 'btn-toggle-active' : ''}`}
            onClick={() => onUpdateStyle({ showAxisLabel: !style.showAxisLabel })}
          >
            {isHeatmap ? 'Top title' : isShareDist ? 'Title' : 'Y-axis label'}
          </button>
          {!isShareDist && (
            <button
              className={`btn btn-xs btn-toggle ${style.showPairLabels ? 'btn-toggle-active' : ''}`}
              onClick={() => onUpdateStyle({ showPairLabels: !style.showPairLabels })}
            >
              {isHeatmap ? 'Row / col labels' : 'Pair labels'}
            </button>
          )}
          {!isHeatmap && !isShareDist && (
            <button
              className={`btn btn-xs btn-toggle ${style.showSigMarkers ? 'btn-toggle-active' : ''}`}
              onClick={() => onUpdateStyle({ showSigMarkers: !style.showSigMarkers })}
            >
              Sig. markers
            </button>
          )}
          {!isShareDist && (
            <button
              className={`btn btn-xs btn-toggle ${style.showLegend ? 'btn-toggle-active' : ''}`}
              onClick={() => onUpdateStyle({ showLegend: !style.showLegend })}
            >
              Legend
            </button>
          )}
        </div>
      </div>

      <div className="plot-editor-actions">
        <button className="btn btn-sm" onClick={onResetStyle}>
          Reset plot style
        </button>
        <button className="btn btn-accent btn-sm plot-editor-back-btn" onClick={onExit}>
          {'\u2190'} Back to Diagram
        </button>
      </div>
    </div>
  );
}
