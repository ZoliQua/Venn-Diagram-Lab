import { useState, useMemo } from 'react';
import type { VennResult } from '../utils/csvParser.ts';
import { pairwiseStatistics } from '../utils/statistics.ts';
import { downloadFile, exportStatisticsTsv, sigLabel } from '../utils/exportData.ts';
import { buildStatisticsWorkbook } from '../utils/statisticsWorkbook.ts';
import { EnrichmentPlots } from './EnrichmentPlots.tsx';
import type { EnrichmentMetric } from '../utils/enrichmentPlotSvg.ts';
import type { EnrichmentPlotSettings, EnrichmentPlotType } from '../utils/enrichmentPlotStyle.ts';

interface DataSummaryPanelProps {
  vennResult: VennResult;
  n: number;
  setNames: string[];
  totalItems: number;
  matrix: readonly (readonly number[])[];
  selectedRegionLabel: string | null;
  datasetName?: string;
  enrichmentMetric: EnrichmentMetric;
  onEnrichmentMetricChange: (metric: EnrichmentMetric) => void;
  enrichmentPlotSettings: EnrichmentPlotSettings;
  activeEnrichmentPlot: EnrichmentPlotType | null;
  onEnterPlotEdit: (plot: EnrichmentPlotType) => void;
  /** Guided tour (v1.13.0): forces the Enrichment Plots section open. */
  forceEnrichmentPlotsOpen?: boolean;
  // Statistics-related exports moved here from the left sidebar — all
  // statistics export lives in one place, under "Export Statistics".
  onExportRegionSummary?: () => void;
  onExportMatrix?: () => void;
  onExportOneVsRest?: () => void;
  onExportJson?: () => void;
}

export function formatP(p: number): string {
  if (p === 0) return '< 1e-300';
  if (p < 0.001) return p.toExponential(1);
  return p.toFixed(4);
}

function fdrBgColor(fdr: number): string | undefined {
  if (fdr < 0.001) return 'var(--sig-strong-bg)';
  if (fdr < 0.05) return 'var(--sig-weak-bg)';
  return undefined;
}

function jaccardBgColor(j: number): string | undefined {
  if (j >= 0.7) return 'var(--sig-strong-bg)';
  if (j <= 0.3) return 'var(--sig-neg-bg)';
  return undefined;
}

export function DataSummaryPanel({
  vennResult, n, setNames, totalItems, matrix, datasetName,
  enrichmentMetric, onEnrichmentMetricChange,
  enrichmentPlotSettings, activeEnrichmentPlot, onEnterPlotEdit,
  forceEnrichmentPlotsOpen,
  onExportRegionSummary, onExportMatrix, onExportOneVsRest, onExportJson,
}: DataSummaryPanelProps) {
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [plotsOpen, setPlotsOpen] = useState(true);
  const effPlotsOpen = forceEnrichmentPlotsOpen === true ? true : plotsOpen;
  const [setSizesOpen, setSetSizesOpen] = useState(true);
  const [jaccardOpen, setJaccardOpen] = useState(true);
  const [diceOpen, setDiceOpen] = useState(false);
  const [enrichmentOpen, setEnrichmentOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(true);
  const [xlsxExporting, setXlsxExporting] = useState(false);

  const letters = 'ABCDEFGHI'.slice(0, n).split('');

  const pairStats = useMemo(() =>
    pairwiseStatistics(vennResult, n, totalItems, setNames),
    [vennResult, n, totalItems, setNames]
  );

  // Overview data
  const totalRegions = (1 << n) - 1;
  const fullLabel = letters.join('');
  const coreCount = vennResult.exclusive.get(fullLabel) ?? 0;
  let largestLabel = '';
  let largestCount = 0;
  let emptyRegions = 0;
  for (let mask = 1; mask < (1 << n); mask++) {
    const label = letters.filter((_, i) => mask & (1 << i)).join('');
    const count = vennResult.exclusive.get(label) ?? 0;
    if (count > largestCount) { largestCount = count; largestLabel = label; }
    if (count === 0) emptyRegions++;
  }

  // Set sizes sorted descending
  const setSizes = letters.map((l, i) => ({
    letter: l,
    name: setNames[i] ?? l,
    size: vennResult.inclusive.get(l) ?? 0,
  })).sort((a, b) => b.size - a.size);

  // Jaccard sorted descending
  const jaccardSorted = [...pairStats].sort((a, b) => b.jaccard - a.jaccard);

  // Export all statistics as TSV
  const handleExportStats = () => {
    downloadFile(exportStatisticsTsv(vennResult, n, totalItems, setNames), `venn_${n}set_statistics.tsv`);
  };

  // Export the same statistics as an Excel workbook (3 sheets: Jaccard, Dice, Enrichment)
  const handleExportStatsXlsx = async () => {
    setXlsxExporting(true);
    try {
      const blob = await buildStatisticsWorkbook(pairStats);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `venn_${n}set_statistics.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setXlsxExporting(false);
    }
  };

  return (
    <div className="property-panel data-summary-panel">
      {/* 1. Overview */}
      <div className="data-summary-section">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setOverviewOpen(o => !o)}>
          <span>{overviewOpen ? '▾' : '▸'} Overview</span>
        </div>
        {overviewOpen && (
          <div className="data-summary-table">
            <div className="data-summary-row"><span>Total items</span><span>{totalItems}</span></div>
            <div className="data-summary-row"><span>Sets</span><span>{n}</span></div>
            <div className="data-summary-row"><span>Regions</span><span>{totalRegions}</span></div>
            <div className="data-summary-row"><span>Core ({fullLabel})</span><span>{coreCount}</span></div>
            <div className="data-summary-row"><span>Largest exclusive</span><span>{largestLabel} ({largestCount})</span></div>
            <div className="data-summary-row"><span>Empty regions</span><span>{emptyRegions}</span></div>
          </div>
        )}
      </div>

      {/* 2. Enrichment Plots */}
      <div className="data-summary-section" data-tour="right-panel-enrichment-plots">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setPlotsOpen(o => !o)}>
          <span>{effPlotsOpen ? '▾' : '▸'} Enrichment Plots</span>
        </div>
        {effPlotsOpen && (
          <EnrichmentPlots
            stats={pairStats}
            setLetters={letters}
            setNames={setNames}
            matrix={matrix}
            datasetName={datasetName}
            metric={enrichmentMetric}
            onMetricChange={onEnrichmentMetricChange}
            settings={enrichmentPlotSettings}
            activePlot={activeEnrichmentPlot}
            onPlotClick={onEnterPlotEdit}
          />
        )}
      </div>

      {/* 3. Set Sizes */}
      <div className="data-summary-section" data-tour="right-panel-stats-tables">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setSetSizesOpen(o => !o)}>
          <span>{setSizesOpen ? '▾' : '▸'} Set Sizes</span>
        </div>
        {setSizesOpen && (
          <table className="data-summary-compact-table">
            <thead>
              <tr><th>Set</th><th>Name</th><th>Size</th><th>%</th></tr>
            </thead>
            <tbody>
              {setSizes.map(s => (
                <tr key={s.letter}>
                  <td>{s.letter}</td>
                  <td>{s.name}</td>
                  <td>{s.size}</td>
                  <td>{totalItems > 0 ? (s.size / totalItems * 100).toFixed(1) : '0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Pairwise Jaccard */}
      <div className="data-summary-section">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setJaccardOpen(o => !o)}>
          <span>{jaccardOpen ? '▾' : '▸'} Pairwise Jaccard Index</span>
        </div>
        {jaccardOpen && (
          <div className="stats-table-scroll">
            <table className="data-summary-compact-table">
              <thead>
                <tr><th>Pair</th><th>Inter</th><th>Union</th><th>Jaccard</th><th>95% CI</th><th>OC</th></tr>
              </thead>
              <tbody>
                {jaccardSorted.map(s => (
                  <tr key={s.label} style={{ background: jaccardBgColor(s.jaccard) }}>
                    <td>{s.a}{s.b}</td>
                    <td>{s.intersection}</td>
                    <td>{s.union}</td>
                    <td>{s.jaccard.toFixed(3)}</td>
                    <td>[{s.jaccardCiLow.toFixed(3)}, {s.jaccardCiHigh.toFixed(3)}]</td>
                    <td>{s.overlapCoeff.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Sørensen-Dice */}
      <div className="data-summary-section">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setDiceOpen(o => !o)}>
          <span>{diceOpen ? '▾' : '▸'} Sorensen-Dice Index</span>
        </div>
        {diceOpen && (
          <div className="stats-table-scroll">
            <table className="data-summary-compact-table">
              <thead>
                <tr><th>Pair</th><th>Dice</th><th>95% CI</th></tr>
              </thead>
              <tbody>
                {jaccardSorted.map(s => (
                  <tr key={s.label}>
                    <td>{s.a}{s.b}</td>
                    <td>{s.dice.toFixed(3)}</td>
                    <td>[{s.diceCiLow.toFixed(3)}, {s.diceCiHigh.toFixed(3)}]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Intersection Enrichment */}
      <div className="data-summary-section">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setEnrichmentOpen(o => !o)}>
          <span>{enrichmentOpen ? '▾' : '▸'} Intersection Enrichment</span>
        </div>
        {enrichmentOpen && (
          <>
            <div className="data-summary-hint">
              Hypergeometric test (one-sided, over-representation) + two-sided Fisher's exact test.
              Background: {totalItems} items. FDR: Benjamini-Hochberg. Bonferroni: family-wise error rate.
            </div>
            <div className="stats-table-scroll">
              <table className="data-summary-compact-table">
                <thead>
                  <tr><th>Pair</th><th>Obs</th><th>Exp</th><th>FE</th><th>p-value</th><th>p (2-sided)</th><th>FDR</th><th>Bonferroni</th><th>Sig</th></tr>
                </thead>
                <tbody>
                  {pairStats.map(s => (
                    <tr key={s.label} style={{ background: fdrBgColor(s.fdr) }}>
                      <td>{s.a}{s.b}</td>
                      <td>{s.intersection}</td>
                      <td>{s.expected.toFixed(1)}</td>
                      <td>{s.foldEnrichment.toFixed(2)}</td>
                      <td>{formatP(s.pValue)}</td>
                      <td>{formatP(s.pTwoSided)}</td>
                      <td>{formatP(s.fdr)}</td>
                      <td>{formatP(s.bonferroni)}</td>
                      <td>{sigLabel(s.fdr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 7. Export Statistics */}
      <div className="data-summary-section">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setExportOpen(o => !o)}>
          <span>{exportOpen ? '▾' : '▸'} Export Statistics</span>
        </div>
        {exportOpen && (
          <>
            <div className="data-summary-hint" style={{ marginTop: 4 }}>
              Export calculated data as tab-separated, Excel, or JSON files
            </div>

            <div className="data-summary-hint" style={{ marginTop: 8, marginBottom: 4 }}>
              All pairwise + one-vs-rest statistics (Jaccard, Dice, 95% CIs, enrichment, p-values, FDR, Bonferroni).
            </div>
            <button className="btn btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={handleExportStats}>
              Export All Statistics (TSV)
            </button>
            <button className="btn btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={handleExportStatsXlsx} disabled={xlsxExporting}>
              {xlsxExporting ? 'Exporting…' : 'Export All Statistics (XLSX)'}
            </button>

            {(onExportRegionSummary || onExportMatrix) && (
              <div className="data-summary-hint" style={{ marginTop: 10, marginBottom: 4 }}>
                Region-level data
              </div>
            )}
            {onExportRegionSummary && (
              <button className="btn btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={onExportRegionSummary}>
                Regions Summary (TSV)
              </button>
            )}
            {onExportMatrix && (
              <button className="btn btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={onExportMatrix}>
                Item Matrix (TSV)
              </button>
            )}

            {onExportOneVsRest && (
              <>
                <div className="data-summary-hint" style={{ marginTop: 10, marginBottom: 4 }}>
                  Enrichment
                </div>
                <button className="btn btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={onExportOneVsRest}>
                  Enrichment: one-vs-rest (TSV)
                </button>
              </>
            )}

            {onExportJson && (
              <>
                <div className="data-summary-hint" style={{ marginTop: 10, marginBottom: 4 }}>
                  Full export
                </div>
                <button className="btn btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={onExportJson}>
                  Full Result (JSON)
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
