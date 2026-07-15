import type { NetworkData } from './networkData.ts';

/**
 * Cytoscape-compatible network exports (.sif + .graphml).
 *
 * Both formats are deterministic pure string builders derived from NetworkData
 * (see buildNetworkData). They are the source-of-truth surface: the Python and R
 * ports must reproduce these BYTES exactly. Everything below (attribute order,
 * numeric rendering, indentation, escaping, line endings) is pinned on purpose —
 * changing any of it is a parity-breaking change.
 *
 * ── SIF ────────────────────────────────────────────────────────────────────
 *   One line per edge:  <sourceId>\t<interaction>\t<targetId>
 *   ids are the LETTER ids (A, B, …); interaction type is the literal `overlap`.
 *   Isolated nodes (degree 0) are emitted as a lone single-token line `<id>`
 *   AFTER all edge lines, in node-array order. LF line endings, no trailing LF.
 *
 * ── GraphML ────────────────────────────────────────────────────────────────
 *   Standard GraphML XML. 2-space indent, LF, no trailing newline.
 *   All text/attribute values are XML-escaped.
 *
 * Numeric rendering (pinned; mirrors the statistics TSV where a field exists):
 *   size          long    → integer decimal
 *   weight        double  → toFixed(6)
 *   intersection  long    → integer decimal
 *   jaccard       double  → toFixed(4)
 *   foldEnrichment double → toFixed(3)
 *   overlapCoeff  double  → toFixed(4)
 *   dice          double  → toFixed(4)
 *   pValue        double  → fmtP  (v < 0.001 ? toExponential(2) : toFixed(6))
 *   fdr           double  → fmtP
 *   significant   boolean → "true" | "false"
 */

const INTERACTION = 'overlap';

/** Statistics-TSV p-value formatting rule, reused for pValue + fdr. */
function fmtP(v: number): string {
  return v < 0.001 ? v.toExponential(2) : v.toFixed(6);
}

/** XML-escape text/attribute content. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Cytoscape SIF (Simple Interaction Format). One line per edge as
 * `<sourceId>\toverlap\t<targetId>`, then isolated nodes as lone lines.
 */
export function toSif(data: NetworkData): string {
  const lines: string[] = [];
  const connected = new Set<string>();

  for (const e of data.edges) {
    connected.add(e.source);
    connected.add(e.target);
    lines.push(`${e.source}\t${INTERACTION}\t${e.target}`);
  }

  // Isolated nodes (no incident edge) become single-token lines so every set
  // appears in the file. With pairwise Venn edges this is normally empty.
  for (const node of data.nodes) {
    if (!connected.has(node.id)) {
      lines.push(node.id);
    }
  }

  return lines.join('\n');
}

interface KeyDef {
  id: string;
  for: 'node' | 'edge';
  name: string;
  type: 'string' | 'long' | 'double' | 'boolean';
}

// Fixed key order — this is the parity contract. Do not reorder.
const KEYS: KeyDef[] = [
  { id: 'd0', for: 'node', name: 'label', type: 'string' },
  { id: 'd1', for: 'node', name: 'size', type: 'long' },
  { id: 'd2', for: 'edge', name: 'weight', type: 'double' },
  { id: 'd3', for: 'edge', name: 'intersection', type: 'long' },
  { id: 'd4', for: 'edge', name: 'jaccard', type: 'double' },
  { id: 'd5', for: 'edge', name: 'foldEnrichment', type: 'double' },
  { id: 'd6', for: 'edge', name: 'overlapCoeff', type: 'double' },
  { id: 'd7', for: 'edge', name: 'dice', type: 'double' },
  { id: 'd8', for: 'edge', name: 'pValue', type: 'double' },
  { id: 'd9', for: 'edge', name: 'fdr', type: 'double' },
  { id: 'd10', for: 'edge', name: 'significant', type: 'boolean' },
];

/**
 * Standard GraphML XML for the network. Node data keys: label, size. Edge data
 * keys: weight, intersection, jaccard, foldEnrichment, overlapCoeff, dice,
 * pValue, fdr, significant. Deterministic attribute order + numeric rendering.
 */
export function toGraphml(data: NetworkData): string {
  const out: string[] = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push('<graphml xmlns="http://graphml.graphdrawing.org/xmlns">');

  for (const k of KEYS) {
    out.push(
      `  <key id="${k.id}" for="${k.for}" attr.name="${k.name}" attr.type="${k.type}"/>`,
    );
  }

  out.push('  <graph edgedefault="undirected">');

  for (const node of data.nodes) {
    out.push(`    <node id="${xmlEscape(node.id)}">`);
    out.push(`      <data key="d0">${xmlEscape(node.label)}</data>`);
    out.push(`      <data key="d1">${String(node.size)}</data>`);
    out.push('    </node>');
  }

  for (const e of data.edges) {
    out.push(`    <edge source="${xmlEscape(e.source)}" target="${xmlEscape(e.target)}">`);
    out.push(`      <data key="d2">${e.weight.toFixed(6)}</data>`);
    out.push(`      <data key="d3">${String(e.intersection)}</data>`);
    out.push(`      <data key="d4">${e.jaccard.toFixed(4)}</data>`);
    out.push(`      <data key="d5">${e.foldEnrichment.toFixed(3)}</data>`);
    out.push(`      <data key="d6">${e.overlapCoeff.toFixed(4)}</data>`);
    out.push(`      <data key="d7">${e.dice.toFixed(4)}</data>`);
    out.push(`      <data key="d8">${fmtP(e.pValue)}</data>`);
    out.push(`      <data key="d9">${fmtP(e.fdr)}</data>`);
    out.push(`      <data key="d10">${e.significant ? 'true' : 'false'}</data>`);
    out.push('    </edge>');
  }

  out.push('  </graph>');
  out.push('</graphml>');

  return out.join('\n');
}
