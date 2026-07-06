import { useEffect, useState } from 'react';
import type { VennResult, Delimiter } from '../utils/csvParser.ts';
import type { VennDocument } from '../types.ts';
import type { ProportionalAccuracy } from '../utils/proportionalLayout.ts';
import type { EnrichmentPlotSettings } from '../utils/enrichmentPlotStyle.ts';
import { generateZipReport } from '../utils/zipReport.ts';

interface ZipReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vennResult: VennResult;
  doc: VennDocument;
  n: number;
  setNames: string[];
  totalItems: number;
  totalFileRows: number;
  filename: string;
  title: string;
  modelName: string;
  columnMapping: number[];
  fileType: 'binary' | 'aggregated';
  itemDelimiter: Delimiter;
  shapeColors: Record<string, string>;
  enrichmentMetric: 'neglog10fdr' | 'foldEnrichment';
  sessionJson?: string;
  proportionalAccuracy?: ProportionalAccuracy | null;
  enrichmentPlotSettings?: EnrichmentPlotSettings;
  sourceKind: 'file' | 'sample' | 'paste' | 'url';
  hasHeader: boolean;
  sheetIndex: number;
  headers: string[];
  rawData: string[][];
}

export function ZipReportDialog({
  isOpen, onClose,
  vennResult, doc, n, setNames, totalItems, totalFileRows,
  filename, title, modelName, columnMapping, fileType, itemDelimiter,
  shapeColors, enrichmentMetric, sessionJson, proportionalAccuracy,
  enrichmentPlotSettings, sourceKind, hasHeader, sheetIndex, headers, rawData,
}: ZipReportDialogProps) {
  const [step, setStep] = useState('Preparing...');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function generate() {
      try {
        const blob = await generateZipReport({
          doc, vennResult, n, setNames, totalItems, totalFileRows,
          filename, title, modelName, columnMapping, fileType,
          itemDelimiter, shapeColors, enrichmentMetric, sessionJson,
          proportionalAccuracy, enrichmentPlotSettings,
          sourceKind, hasHeader, sheetIndex, headers, rawData,
          onProgress: (label, pct) => {
            if (cancelled) return;
            setStep(label);
            setPercent(pct);
          },
        });
        if (cancelled) return;

        setStep('Downloading...');
        setPercent(100);
        const baseName = filename.replace(/\.[^.]+$/, '');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `venn_report_${baseName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onClose();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Zip generation failed');
        }
      }
    }

    generate();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={error ? onClose : undefined}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ minWidth: 360, textAlign: 'center', padding: 32 }}>
        {error ? (
          <>
            <div style={{ fontSize: 14, color: '#e55', marginBottom: 16 }}>Error: {error}</div>
            <button className="btn" onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>{step}</div>
            <div className="zip-progress-bar" aria-label="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="zip-progress-bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <div className="zip-progress-percent">{percent}%</div>
          </>
        )}
      </div>
    </div>
  );
}
