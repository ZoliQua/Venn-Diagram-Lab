/**
 * Shared SVG artefact builder (v1.12.0).
 *
 * The PDF report (`PdfReportDialog`) and the zip report (`zipReport.ts`)
 * need the same set of SVG images. This helper builds them all in one pass
 * so we never duplicate the construction logic.
 *
 * The PDF expects a "prepared" Venn SVG (title hidden, Name elements bumped
 * to 16 px for readability in the scaled-down PDF layout); the zip
 * expects the "standalone" Venn SVG that matches what the user sees on
 * screen. Both variants are produced here.
 */
import type { VennDocument } from '../types.ts';
import type { VennResult } from './csvParser.ts';
import type { PairwiseStat } from './statistics.ts';
import { saveSvg } from '../parser/saveSvg.ts';
import { upsetDataFromVennResult } from './upsetData.ts';
import { buildUpsetSvgString } from './upsetSvgBuilder.ts';
import { buildNetworkData } from './networkData.ts';
import { buildNetworkSvgString } from './networkSvgBuilder.ts';
import {
  buildEnrichmentBarSvg,
  buildEnrichmentLollipopSvg,
  buildEnrichmentHeatmapSvg,
} from './enrichmentPlotSvg.ts';

export interface ReportArtefactInput {
  doc: VennDocument;
  vennResult: VennResult;
  n: number;
  setNames: string[];
  totalItems: number;
  /** Enrichment background N for the network significance coloring (defaults to totalItems). */
  universeSize?: number;
  pairwiseStats: PairwiseStat[];
}

export interface ReportArtefacts {
  vennSvgPrepared: string;         // PDF-ready: title hidden + Name elements at 16 px
  vennSvgStandalone: string;       // As saved from the current document (what the user sees)
  upsetSvg: string;
  networkSvg: string;
  enrichmentBarSvg: string;
  enrichmentLollipopSvg: string;
  enrichmentHeatmapSvg: string;
}

/**
 * Apply the exact transformations PdfReportDialog used to do inline:
 *   - Hide the #Title element (display:none appended to style)
 *   - Bump every [id^="Name"] text to font-size 16
 *
 * Pure string/DOM manipulation, no rendering required.
 */
export function prepareVennSvgForPdf(standaloneSvg: string): string {
  const parser = new DOMParser();
  const svgDom = parser.parseFromString(standaloneSvg, 'image/svg+xml');
  const svgRoot = svgDom.documentElement as unknown as SVGSVGElement;

  const titleEl = svgRoot.querySelector('#Title');
  if (titleEl) {
    const prev = titleEl.getAttribute('style') ?? '';
    titleEl.setAttribute('style', `${prev};display:none`);
  }

  svgRoot.querySelectorAll('[id^="Name"]').forEach(el => {
    const prev = el.getAttribute('style') ?? '';
    const updated = prev.replace(/font-size:\s*[^;]+/, 'font-size:16');
    el.setAttribute('style', updated.includes('font-size') ? updated : `${updated};font-size:16`);
  });

  return new XMLSerializer().serializeToString(svgRoot);
}

/**
 * Build every SVG artefact the Report + Report (zip) pipelines need.
 * Enrichment plots use the default style (matches PDF, parity with v1.11.0).
 */
export function buildReportArtefacts(input: ReportArtefactInput): ReportArtefacts {
  const { doc, vennResult, n, setNames, totalItems, pairwiseStats } = input;

  const vennSvgStandalone = saveSvg(doc);
  const vennSvgPrepared = prepareVennSvgForPdf(vennSvgStandalone);

  const upsetData = upsetDataFromVennResult(vennResult, n);
  const upsetSvg = buildUpsetSvgString(upsetData, setNames);

  const netData = buildNetworkData(vennResult, n, input.universeSize ?? totalItems, setNames, 'intersection');
  const networkSvg = buildNetworkSvgString(netData, 'intersection');

  const letters = 'ABCDEFGHI'.slice(0, n).split('');
  const metric = 'neglog10fdr' as const;
  const enrichmentBarSvg = buildEnrichmentBarSvg(pairwiseStats, { metric });
  const enrichmentLollipopSvg = buildEnrichmentLollipopSvg(pairwiseStats, { metric });
  const enrichmentHeatmapSvg = buildEnrichmentHeatmapSvg(pairwiseStats, letters, setNames, { metric });

  return {
    vennSvgPrepared,
    vennSvgStandalone,
    upsetSvg,
    networkSvg,
    enrichmentBarSvg,
    enrichmentLollipopSvg,
    enrichmentHeatmapSvg,
  };
}
