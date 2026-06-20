#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { Command } from 'commander';
import { detectGeneSetFormat } from '@venn-diagram-lab/core';
import {
  analyzeGmtText, analyzeGmxText, analyzeCsvText,
  toMatrixTsv, toRegionSummaryTsv, toStatisticsTsv,
  toNetworkSvg, toShareDistributionSvg, toEnrichmentBarSvg, toEnrichmentLollipopSvg, toUpsetSvg,
  toProportionalSvg, toVennSvg,
} from './api.ts';
import { svgToPng, svgToPdf } from './raster.ts';

const program = new Command();

program
  .name('vdl')
  .description('Headless Venn Diagram Lab — analysis & export from the shell.')
  .version('0.0.0');

program
  .command('analyze')
  .description('Analyse a CSV/TSV and write the Region Summary TSV.')
  .argument('<input>', 'input CSV/TSV path (first column = item id, set columns are 0/1)')
  .option('--region-summary <path>', 'write the Region Summary TSV to this path')
  .option('--matrix <path>', 'write the Item Matrix TSV to this path')
  .option('--statistics <path>', 'write the pairwise Statistics TSV to this path')
  .action((input: string, opts: { regionSummary?: string; matrix?: string; statistics?: string }) => {
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
    if (!wroteFile) { process.stdout.write(toRegionSummaryTsv(result) + '\n'); }
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
      case 'network': svg = opts.metric ? toNetworkSvg(result, opts.metric as never) : toNetworkSvg(result); break;
      case 'share-dist': svg = toShareDistributionSvg(result); break;
      case 'enrichment-bar': svg = opts.metric ? toEnrichmentBarSvg(result, opts.metric as never) : toEnrichmentBarSvg(result); break;
      case 'enrichment-lollipop': svg = opts.metric ? toEnrichmentLollipopSvg(result, opts.metric as never) : toEnrichmentLollipopSvg(result); break;
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

program.parse();
