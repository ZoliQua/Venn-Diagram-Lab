import { describe, expect, it } from 'vitest';
import { toGraphml, toSif } from '../networkExport.ts';
import type { NetworkData, NetworkNode, NetworkEdge } from '../networkData.ts';

function node(id: string, label: string, size: number): NetworkNode {
  return { id, label, size, x: 0, y: 0, vx: 0, vy: 0, radius: 0 };
}

function edge(source: string, target: string, over: Partial<NetworkEdge> = {}): NetworkEdge {
  return {
    source, target,
    weight: 12, intersection: 12,
    jaccard: 0.25, foldEnrichment: 1.5, overlapCoeff: 0.5, dice: 0.4,
    fdr: 0.02, pValue: 0.0005, significant: true,
    nameA: source, nameB: target,
    ...over,
  };
}

const DATA: NetworkData = {
  nodes: [node('A', 'Alpha', 40), node('B', 'B & <beta>', 30), node('C', 'Gamma', 10)],
  edges: [
    edge('A', 'B', { weight: 12, intersection: 12, jaccard: 0.2, foldEnrichment: 1.234, overlapCoeff: 0.6, dice: 0.3, pValue: 0.0005, fdr: 0.001, significant: true }),
    edge('A', 'C', { weight: 3, intersection: 3, jaccard: 0.06, foldEnrichment: 0.8, overlapCoeff: 0.3, dice: 0.11, pValue: 0.4, fdr: 0.4, significant: false }),
  ],
};

describe('toSif', () => {
  it('emits one tab-separated overlap line per edge, no trailing newline', () => {
    expect(toSif(DATA)).toBe('A\toverlap\tB\nA\toverlap\tC');
  });

  it('emits isolated nodes as lone lines after edges', () => {
    const data: NetworkData = {
      nodes: [node('A', 'A', 1), node('B', 'B', 1), node('C', 'C', 1)],
      edges: [edge('A', 'B')],
    };
    // C has no edge -> lone line appended after the edge line.
    expect(toSif(data)).toBe('A\toverlap\tB\nC');
  });
});

describe('toGraphml', () => {
  const xml = toGraphml(DATA);

  it('starts with the pinned XML declaration and graphml root', () => {
    const lines = xml.split('\n');
    expect(lines[0]).toBe('<?xml version="1.0" encoding="UTF-8"?>');
    expect(lines[1]).toBe('<graphml xmlns="http://graphml.graphdrawing.org/xmlns">');
    expect(xml.endsWith('</graphml>')).toBe(true);
    expect(xml.endsWith('\n')).toBe(false);
  });

  it('declares keys in the fixed order', () => {
    expect(xml).toContain('<key id="d0" for="node" attr.name="label" attr.type="string"/>');
    expect(xml).toContain('<key id="d1" for="node" attr.name="size" attr.type="long"/>');
    expect(xml).toContain('<key id="d2" for="edge" attr.name="weight" attr.type="double"/>');
    expect(xml).toContain('<key id="d10" for="edge" attr.name="significant" attr.type="boolean"/>');
    expect(xml.indexOf('d0')).toBeLessThan(xml.indexOf('d1'));
    expect(xml.indexOf('attr.name="weight"')).toBeLessThan(xml.indexOf('attr.name="intersection"'));
  });

  it('renders a node with escaped label and integer size', () => {
    expect(xml).toContain('    <node id="B">\n      <data key="d0">B &amp; &lt;beta&gt;</data>\n      <data key="d1">30</data>\n    </node>');
  });

  it('renders an edge with pinned numeric formatting and ordering', () => {
    expect(xml).toContain(
      '    <edge source="A" target="B">\n' +
      '      <data key="d2">12.000000</data>\n' +
      '      <data key="d3">12</data>\n' +
      '      <data key="d4">0.2000</data>\n' +
      '      <data key="d5">1.234</data>\n' +
      '      <data key="d6">0.6000</data>\n' +
      '      <data key="d7">0.3000</data>\n' +
      '      <data key="d8">5.00e-4</data>\n' +
      '      <data key="d9">0.001000</data>\n' +
      '      <data key="d10">true</data>\n' +
      '    </edge>',
    );
  });

  it('uses toFixed(6) for large p-values and false for non-significant edges', () => {
    expect(xml).toContain('<data key="d8">0.400000</data>');
    expect(xml).toContain('<data key="d10">false</data>');
  });

  it('uses the undirected graph default', () => {
    expect(xml).toContain('  <graph edgedefault="undirected">');
  });
});
