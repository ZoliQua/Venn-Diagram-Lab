import { useEffect, useState } from 'react';
import type { VennResult } from '../utils/csvParser.ts';
import type { VennDocument } from '../types.ts';
import { svgStringToDataUrl } from '../utils/svgToImage.ts';
import { generatePdfReport } from '../utils/pdfReport.ts';
import { pairwiseStatistics } from '../utils/statistics.ts';
import { buildReportArtefacts } from '../utils/reportArtefacts.ts';
import type { EnrichmentPlotSettings } from '../utils/enrichmentPlotStyle.ts';
import { DEFAULT_SHARE_DIST_STYLE } from '../utils/shareDistributionSvgBuilder.ts';

interface PdfReportDialogProps {
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
  proportionalAccuracy?: { single?: Map<string, number>; pairwise: Map<string, number>; triple?: number; overall: number } | null;
  enrichmentPlotSettings?: EnrichmentPlotSettings;
}

export function PdfReportDialog({
  isOpen, onClose,
  vennResult, doc, n, setNames, totalItems, totalFileRows,
  filename, title, modelName, proportionalAccuracy,
  enrichmentPlotSettings,
}: PdfReportDialogProps) {
  const [step, setStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function generate() {
      try {
        // Build every SVG artefact in one pass
        setStep('Rendering Venn diagram...');
        const pairwiseStats = pairwiseStatistics(vennResult, n, totalItems, setNames);
        const art = buildReportArtefacts({
          doc, vennResult, n, setNames, totalItems, pairwiseStats,
        });

        const vennImage = await svgStringToDataUrl(art.vennSvgPrepared);
        if (cancelled) return;

        setStep('Rendering UpSet plot...');
        const upsetImage = await svgStringToDataUrl(art.upsetSvg);
        if (cancelled) return;

        setStep('Rendering Network diagram...');
        const networkImage = await svgStringToDataUrl(art.networkSvg);
        if (cancelled) return;

        setStep('Rendering enrichment plots...');
        const enrichmentBar = await svgStringToDataUrl(art.enrichmentBarSvg);
        const enrichmentLollipop = await svgStringToDataUrl(art.enrichmentLollipopSvg);
        const enrichmentHeatmap = await svgStringToDataUrl(art.enrichmentHeatmapSvg);
        if (cancelled) return;

        setStep('Building PDF...');
        const blob = await generatePdfReport({
          title,
          filename,
          vennResult,
          n,
          setNames,
          totalItems,
          totalFileRows,
          vennImageDataUrl: vennImage.dataUrl,
          vennImageWidth: vennImage.width,
          vennImageHeight: vennImage.height,
          upsetImageDataUrl: upsetImage.dataUrl,
          upsetImageWidth: upsetImage.width,
          upsetImageHeight: upsetImage.height,
          networkImageDataUrl: networkImage.dataUrl,
          networkImageWidth: networkImage.width,
          networkImageHeight: networkImage.height,
          enrichmentBarDataUrl: enrichmentBar.dataUrl,
          enrichmentBarWidth: enrichmentBar.width,
          enrichmentBarHeight: enrichmentBar.height,
          enrichmentLollipopDataUrl: enrichmentLollipop.dataUrl,
          enrichmentLollipopWidth: enrichmentLollipop.width,
          enrichmentLollipopHeight: enrichmentLollipop.height,
          enrichmentHeatmapDataUrl: enrichmentHeatmap.dataUrl,
          enrichmentHeatmapWidth: enrichmentHeatmap.width,
          enrichmentHeatmapHeight: enrichmentHeatmap.height,
          modelName,
          proportionalAccuracy,
          heatmapStyle: enrichmentPlotSettings?.heatmap,
          heatmapMetric: 'neglog10fdr',
          shareDistributionStyle: enrichmentPlotSettings ? {
            ...DEFAULT_SHARE_DIST_STYLE,
            background: enrichmentPlotSettings.shareDistribution.background,
            fontSize: enrichmentPlotSettings.shareDistribution.fontSize,
            fontFamily: enrichmentPlotSettings.shareDistribution.fontFamily,
            showAxisLabel: enrichmentPlotSettings.shareDistribution.showAxisLabel,
          } : undefined,
        });

        if (cancelled) return;

        setStep('Downloading...');
        const baseName = filename.replace(/\.[^.]+$/, '');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `venn_report_${baseName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onClose();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'PDF generation failed');
        }
      }
    }

    generate();
    return () => { cancelled = true; };
  }, [doc, filename, isOpen, modelName, n, onClose, proportionalAccuracy, setNames, title, totalFileRows, totalItems, vennResult, enrichmentPlotSettings]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={error ? onClose : undefined}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ minWidth: 320, textAlign: 'center', padding: 32 }}>
        {error ? (
          <>
            <div style={{ fontSize: 14, color: '#e55', marginBottom: 16 }}>Error: {error}</div>
            <button className="btn" onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, color: '#aaa' }}>{step}</div>
          </>
        )}
      </div>
    </div>
  );
}
