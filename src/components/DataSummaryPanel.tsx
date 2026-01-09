import { useState, useMemo } from 'react';
import type { VennResult } from '../utils/csvParser.ts';
import { pairwiseStatistics } from '../utils/statistics.ts';
import { downloadFile } from '../utils/exportData.ts';

interface DataSummaryPanelProps {
  vennResult: VennResult;
  n: number;
  setNames: string[];
  totalItems: number;
  selectedRegionLabel: string | null;
}

function formatP(p: number): string {
  if (p < 0.001) return p.toExponential(1);
  return p.toFixed(4);
}

function sigLabel(fdr: number): string {
  if (fdr < 0.001) return '***';
  if (fdr < 0.01) return '**';
  if (fdr < 0.05) return '*';
  return 'ns';
}

function fdrBgColor(fdr: number): string | undefined {
  if (fdr < 0.001) return '#1a3a1a';
  if (fdr < 0.05) return '#3a3a1a';
  return undefined;
}

function jaccardBgColor(j: number): string | undefined {
  if (j >= 0.7) return '#1a3a1a';
  if (j <= 0.3) return '#3a1a1a';
  return undefined;
}

export function DataSummaryPanel({ vennResult, n, setNames, totalItems }: DataSummaryPanelProps) {
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [setSizesOpen, setSetSizesOpen] = useState(true);
  const [jaccardOpen, setJaccardOpen] = useState(true);
  const [diceOpen, setDiceOpen] = useState(false);
  const [enrichmentOpen, setEnrichmentOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(true);

  const letters = 'ABCDEFGH'.slice(0, n).split('');

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
    const header = [
      'Set_A', 'Set_B', 'Name_A', 'Name_B', 'Size_A', 'Size_B',
      'Intersection', 'Union', 'Jaccard', 'Overlap_Coeff', 'Dice',
      'Expected', 'Fold_Enrichment', 'P_value', 'FDR', 'Significant'
    ].join('\t');
    const rows = pairStats.map(s => [
      s.a, s.b, s.nameA, s.nameB, s.sizeA, s.sizeB,
      s.intersection, s.union,
      s.jaccard.toFixed(4), s.overlapCoeff.toFixed(4), s.dice.toFixed(4),
      s.expected.toFixed(2), s.foldEnrichment.toFixed(3),
      s.pValue < 0.001 ? s.pValue.toExponential(2) : s.pValue.toFixed(6),
      s.fdr < 0.001 ? s.fdr.toExponential(2) : s.fdr.toFixed(6),
      sigLabel(s.fdr),
    ].join('\t'));
    downloadFile([header, ...rows].join('\n'), `venn_${n}set_statistics.tsv`);
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

      {/* 2. Set Sizes */}
      <div className="data-summary-section">
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

      {/* 3. Pairwise Jaccard */}
      <div className="data-summary-section">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setJaccardOpen(o => !o)}>
          <span>{jaccardOpen ? '▾' : '▸'} Pairwise Jaccard Index</span>
        </div>
        {jaccardOpen && (
          <table className="data-summary-compact-table">
            <thead>
              <tr><th>Pair</th><th>Inter</th><th>Union</th><th>Jaccard</th><th>OC</th></tr>
            </thead>
            <tbody>
              {jaccardSorted.map(s => (
                <tr key={s.label} style={{ background: jaccardBgColor(s.jaccard) }}>
                  <td>{s.a}{s.b}</td>
                  <td>{s.intersection}</td>
                  <td>{s.union}</td>
                  <td>{s.jaccard.toFixed(3)}</td>
                  <td>{s.overlapCoeff.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Sørensen-Dice */}
      <div className="data-summary-section">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setDiceOpen(o => !o)}>
          <span>{diceOpen ? '▾' : '▸'} Sorensen-Dice Index</span>
        </div>
        {diceOpen && (
          <table className="data-summary-compact-table">
            <thead>
              <tr><th>Pair</th><th>Dice</th></tr>
            </thead>
            <tbody>
              {jaccardSorted.map(s => (
                <tr key={s.label}>
                  <td>{s.a}{s.b}</td>
                  <td>{s.dice.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. Intersection Enrichment */}
      <div className="data-summary-section">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setEnrichmentOpen(o => !o)}>
          <span>{enrichmentOpen ? '▾' : '▸'} Intersection Enrichment</span>
        </div>
        {enrichmentOpen && (
          <>
            <div className="data-summary-hint">
              Hypergeometric test (one-sided, over-representation). Background: {totalItems} items. FDR: Benjamini-Hochberg.
            </div>
            <table className="data-summary-compact-table">
              <thead>
                <tr><th>Pair</th><th>Obs</th><th>Exp</th><th>FE</th><th>p-value</th><th>FDR</th><th>Sig</th></tr>
              </thead>
              <tbody>
                {pairStats.map(s => (
                  <tr key={s.label} style={{ background: fdrBgColor(s.fdr) }}>
                    <td>{s.a}{s.b}</td>
                    <td>{s.intersection}</td>
                    <td>{s.expected.toFixed(1)}</td>
                    <td>{s.foldEnrichment.toFixed(2)}</td>
                    <td>{formatP(s.pValue)}</td>
                    <td>{formatP(s.fdr)}</td>
                    <td>{sigLabel(s.fdr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* 6. Export Statistics */}
      <div className="data-summary-section">
        <div className="sidebar-section-title sidebar-collapsible" onClick={() => setExportOpen(o => !o)}>
          <span>{exportOpen ? '▾' : '▸'} Export Statistics</span>
        </div>
        {exportOpen && (
          <button className="btn btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={handleExportStats}>
            Export Statistics (TSV)
          </button>
        )}
      </div>
    </div>
  );
}
