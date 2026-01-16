import { useEffect, useState } from 'react';
import type { VennResult } from '../utils/csvParser.ts';
import type { VennDocument } from '../types.ts';
import { upsetDataFromVennResult } from '../utils/upsetData.ts';
import { buildUpsetSvgString } from '../utils/upsetSvgBuilder.ts';
import { svgElementToDataUrl, svgStringToDataUrl } from '../utils/svgToImage.ts';
import { generatePdfReport } from '../utils/pdfReport.ts';
import { saveSvg } from '../parser/saveSvg.ts';
import { downloadFile } from '../utils/exportData.ts';

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
  viewStyle: string;
}

export function PdfReportDialog({
  isOpen, onClose,
  vennResult, doc, n, setNames, totalItems, totalFileRows,
  filename, title, modelName, viewStyle,
}: PdfReportDialogProps) {
  const [step, setStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function generate() {
      try {
        // Step 1: Capture Venn diagram
        setStep('Rendering Venn diagram...');

        let vennImage: { dataUrl: string; width: number; height: number };

        // Build SVG from document model for consistent PDF output
        const svgString = saveSvg(doc);
        // Parse and modify: hide title, set Name font size to 16px
        const parser = new DOMParser();
        const svgDom = parser.parseFromString(svgString, 'image/svg+xml');
        const svgRoot = svgDom.documentElement as unknown as SVGSVGElement;
        // Hide title
        const titleEl = svgRoot.querySelector('#Title');
        if (titleEl) (titleEl as SVGElement).setAttribute('style', (titleEl.getAttribute('style') ?? '') + ';display:none');
        // Set Name elements to 16px
        svgRoot.querySelectorAll('[id^="Name"]').forEach(el => {
          const style = el.getAttribute('style') ?? '';
          const updated = style.replace(/font-size:\s*[^;]+/, 'font-size:16');
          el.setAttribute('style', updated.includes('font-size') ? updated : updated + ';font-size:16');
        });
        const modifiedSvg = new XMLSerializer().serializeToString(svgRoot);
        vennImage = await svgStringToDataUrl(modifiedSvg);

        if (cancelled) return;

        // Step 2: Build UpSet plot
        setStep('Rendering UpSet plot...');

        const upsetData = upsetDataFromVennResult(vennResult, n);
        const upsetSvgString = buildUpsetSvgString(upsetData, setNames);
        const upsetImage = await svgStringToDataUrl(upsetSvgString);

        if (cancelled) return;

        // Step 3: Generate PDF
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
          modelName,
        });

        if (cancelled) return;

        // Step 4: Download
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
  }, [isOpen]);

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
