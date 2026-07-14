#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { detectGeneSetFormat, type EdgeWeightMetric, type EnrichmentMetric } from '@venn-diagram-lab/core';
import {
  analyzeGmtText, analyzeGmxText, analyzeCsvText,
  toMatrixTsv, toOneVsRestTsv, toRegionSummaryTsv, toResultJson, toStatisticsTsv,
  toNetworkSvg, toShareDistributionSvg, toEnrichmentBarSvg, toEnrichmentLollipopSvg, toUpsetSvg,
  toProportionalSvg, toVennSvg,
} from './api.ts';
import { svgToPng, svgToPdf } from './raster.ts';
import { renderPdfReport } from './report/report.ts';

const PKG_VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'),
).version as string;

const EDGE_METRICS = ['intersection', 'jaccard', 'foldEnrichment', 'overlapCoeff'] as const;
const ENRICH_METRICS = ['neglog10fdr', 'foldEnrichment'] as const;

const program = new Command();

program
  .name('vdl')
  .description('Headless Venn Diagram Lab — analysis & export from the shell.')
  .version(PKG_VERSION);

program
  .command('analyze')
  .description('Analyse a CSV/TSV and write the Region Summary TSV.')
  .argument('<input>', 'input CSV/TSV path (first column = item id, set columns are 0/1)')
  .option('--region-summary <path>', 'write the Region Summary TSV to this path')
  .option('--matrix <path>', 'write the Item Matrix TSV to this path')
  .option('--statistics <path>', 'write the pairwise Statistics TSV to this path')
  .option('--json <path>', 'write the full result + statistics JSON to this path')
  .option('--model <id>', 'model id label for the JSON export (default: venn-<n>-set)')
  .action((input: string, opts: { regionSummary?: string; matrix?: string; statistics?: string; json?: string; model?: string }) => {
    const text = readFileSync(input, 'utf8');
    const fmt = detectGeneSetFormat(input);
    const result =
      fmt === 'gmt' ? analyzeGmtText(text) :
      fmt === 'gmx' ? analyzeGmxText(text) :
      analyzeCsvText(text);
    let wroteFile = false;
    if (opts.regionSummary) { writeFileSync(opts.regionSummary, toRegionSummaryTsv(result), 'utf8'); wroteFile = true; }
    if (opts.matrix) { writeFileSync(opts.matrix, toMatrixTsv(result), 'utf8'); wroteFile = true; }
    if (opts.statistics) { writeFileSync(opts.statistics, toStatisticsTsv(result), 'utf8'); wroteFile = true; }
    if (opts.json) { writeFileSync(opts.json, toResultJson(result, opts.model), 'utf8'); wroteFile = true; }
    if (!wroteFile) { process.stdout.write(toRegionSummaryTsv(result) + '\n'); }
  });

const EXPORTERS = {
  'one-vs-rest': toOneVsRestTsv,
  'region-summary': toRegionSummaryTsv,
  'matrix': toMatrixTsv,
  'statistics': toStatisticsTsv,
} as const;

program
  .command('export')
  .description('Export a TSV artifact (one-vs-rest | region-summary | matrix | statistics).')
  .argument('<kind>', 'one-vs-rest | region-summary | matrix | statistics')
  .argument('<input>', 'input CSV/TSV/GMT/GMX path')
  .option('--out <path>', 'write the TSV here (default: stdout)')
  .action((kind: string, input: string, opts: { out?: string }) => {
    const exporter = (EXPORTERS as Record<string, (r: ReturnType<typeof analyzeCsvText>) => string>)[kind];
    if (!exporter) {
      process.stderr.write(`Unknown export kind: ${kind}. Valid: ${Object.keys(EXPORTERS).join(', ')}\n`);
      process.exitCode = 1;
      return;
    }
    const text = readFileSync(input, 'utf8');
    const fmt = detectGeneSetFormat(input);
    const result =
      fmt === 'gmt' ? analyzeGmtText(text) :
      fmt === 'gmx' ? analyzeGmxText(text) :
      analyzeCsvText(text);
    const tsv = exporter(result);
    if (opts.out) { writeFileSync(opts.out, tsv, 'utf8'); }
    else { process.stdout.write(tsv + '\n'); }
  });

program
  .command('render')
  .description('Render an SVG figure (network | share-dist | enrichment-bar | enrichment-lollipop | upset | proportional | venn).')
  .argument('<kind>', 'network | share-dist | enrichment-bar | enrichment-lollipop | upset | proportional | venn')
  .argument('<input>', 'input CSV/TSV/GMT/GMX path')
  .option('--out <path>', 'write the SVG here (default: stdout)')
  .option('--metric <metric>', 'edge/enrichment metric')
  .option('--model <name>', 'Venn model template (for kind=venn), e.g. venn-4-set')
  .action(async (kind: string, input: string, opts: { out?: string; metric?: string; model?: string }) => {
    const text = readFileSync(input, 'utf8');
    const fmt = detectGeneSetFormat(input);
    const result =
      fmt === 'gmt' ? analyzeGmtText(text) :
      fmt === 'gmx' ? analyzeGmxText(text) :
      analyzeCsvText(text);
    let svg: string;
    switch (kind) {
      case 'network': {
        const m = opts.metric;
        if (m && !(EDGE_METRICS as readonly string[]).includes(m)) {
          process.stderr.write(`Unknown --metric '${m}' for network. Valid: ${EDGE_METRICS.join(', ')}\n`);
          process.exitCode = 1; return;
        }
        svg = toNetworkSvg(result, m as EdgeWeightMetric | undefined);
        break;
      }
      case 'share-dist': svg = toShareDistributionSvg(result); break;
      case 'enrichment-bar': {
        const m = opts.metric;
        if (m && !(ENRICH_METRICS as readonly string[]).includes(m)) {
          process.stderr.write(`Unknown --metric '${m}' for enrichment-bar. Valid: ${ENRICH_METRICS.join(', ')}\n`);
          process.exitCode = 1; return;
        }
        svg = toEnrichmentBarSvg(result, m as EnrichmentMetric | undefined);
        break;
      }
      case 'enrichment-lollipop': {
        const m = opts.metric;
        if (m && !(ENRICH_METRICS as readonly string[]).includes(m)) {
          process.stderr.write(`Unknown --metric '${m}' for enrichment-lollipop. Valid: ${ENRICH_METRICS.join(', ')}\n`);
          process.exitCode = 1; return;
        }
        svg = toEnrichmentLollipopSvg(result, m as EnrichmentMetric | undefined);
        break;
      }
      case 'upset': svg = toUpsetSvg(result); break;
      case 'proportional': svg = toProportionalSvg(result); break;
      case 'venn':
        if (!opts.model) {
          process.stderr.write('render venn requires --model <name> (e.g. --model venn-4-set)\n');
          process.exitCode = 1;
          return;
        }
        svg = toVennSvg(result, opts.model);
        break;
      default:
        process.stderr.write(`Unknown render kind: ${kind}\n`);
        process.exitCode = 1;
        return;
    }
    if (opts.out && /\.png$/i.test(opts.out)) {
      writeFileSync(opts.out, svgToPng(svg));
    } else if (opts.out && /\.pdf$/i.test(opts.out)) {
      writeFileSync(opts.out, await svgToPdf(svg));
    } else if (opts.out) {
      writeFileSync(opts.out, svg, 'utf8');
    } else {
      process.stdout.write(svg + '\n');
    }
  });

program
  .command('report')
  .description('Generate a multi-page PDF report from a CSV/TSV/GMT/GMX analysis.')
  .argument('<input>', 'input CSV/TSV/GMT/GMX path')
  .option('--out <path>', 'write the PDF report here (required, must end in .pdf)')
  .option('--model <id>', 'Venn model template to use in the report, e.g. venn-4-set')
  .option('--title <text>', 'report title shown in the Data Overview block')
  .action(async (input: string, opts: { out?: string; model?: string; title?: string }) => {
    if (!opts.out) {
      process.stderr.write('report requires --out <path.pdf>\n');
      process.exitCode = 1;
      return;
    }
    if (!/\.pdf$/i.test(opts.out)) {
      process.stderr.write(`--out must end in .pdf (got '${opts.out}')\n`);
      process.exitCode = 1;
      return;
    }
    const text = readFileSync(input, 'utf8');
    const fmt = detectGeneSetFormat(input);
    const result =
      fmt === 'gmt' ? analyzeGmtText(text) :
      fmt === 'gmx' ? analyzeGmxText(text) :
      analyzeCsvText(text);
    const pdf = await renderPdfReport(result, { title: opts.title, vennModel: opts.model, model: input });
    writeFileSync(opts.out, pdf);
  });

program.parseAsync().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
