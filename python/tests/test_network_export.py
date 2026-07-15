"""Unit tests for ``to_network_sif`` / ``to_network_graphml`` (Feature 8).

Mirrors the executable spec in
``packages/core/src/__tests__/networkExport.test.ts`` with a small
hand-built ``NetworkData`` -- structure, numeric formatting, XML escaping,
and isolated-node handling must match the TS source of truth byte-for-byte.
"""

from __future__ import annotations

from venn_diagram_lab.render.network import (
    NetworkData,
    NetworkEdge,
    NetworkNode,
    to_network_graphml,
    to_network_sif,
)


def _node(id_: str, label: str, size: int) -> NetworkNode:
    return NetworkNode(id=id_, label=label, size=size, radius=0.0)


def _edge(
    source: str,
    target: str,
    *,
    weight: float = 12.0,
    intersection: int = 12,
    jaccard: float = 0.25,
    fold_enrichment: float = 1.5,
    overlap_coefficient: float = 0.5,
    dice: float = 0.4,
    p_value: float = 0.0005,
    p_adjusted: float = 0.02,
    significant: bool = True,
) -> NetworkEdge:
    return NetworkEdge(
        source=source, target=target, weight=weight, intersection=intersection,
        jaccard=jaccard, fold_enrichment=fold_enrichment,
        overlap_coefficient=overlap_coefficient, dice=dice,
        p_value=p_value, p_adjusted=p_adjusted, significant=significant,
        name_a=source, name_b=target,
    )


DATA = NetworkData(
    nodes=(
        _node("A", "Alpha", 40),
        _node("B", "B & <beta>", 30),
        _node("C", "Gamma", 10),
    ),
    edges=(
        _edge(
            "A", "B", weight=12, intersection=12, jaccard=0.2, fold_enrichment=1.234,
            overlap_coefficient=0.6, dice=0.3, p_value=0.0005, p_adjusted=0.001,
            significant=True,
        ),
        _edge(
            "A", "C", weight=3, intersection=3, jaccard=0.06, fold_enrichment=0.8,
            overlap_coefficient=0.3, dice=0.11, p_value=0.4, p_adjusted=0.4,
            significant=False,
        ),
    ),
)


class TestToNetworkSif:
    def test_emits_one_tab_separated_overlap_line_per_edge_no_trailing_newline(self) -> None:
        assert to_network_sif(DATA) == "A\toverlap\tB\nA\toverlap\tC"

    def test_emits_isolated_nodes_as_lone_lines_after_edges(self) -> None:
        data = NetworkData(
            nodes=(_node("A", "A", 1), _node("B", "B", 1), _node("C", "C", 1)),
            edges=(_edge("A", "B"),),
        )
        # C has no edge -> lone line appended after the edge line.
        assert to_network_sif(data) == "A\toverlap\tB\nC"


class TestToNetworkGraphml:
    xml = to_network_graphml(DATA)

    def test_starts_with_pinned_xml_declaration_and_graphml_root(self) -> None:
        lines = self.xml.split("\n")
        assert lines[0] == '<?xml version="1.0" encoding="UTF-8"?>'
        assert lines[1] == '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">'
        assert self.xml.endswith("</graphml>")
        assert not self.xml.endswith("\n")

    def test_declares_keys_in_fixed_order(self) -> None:
        assert '<key id="d0" for="node" attr.name="label" attr.type="string"/>' in self.xml
        assert '<key id="d1" for="node" attr.name="size" attr.type="long"/>' in self.xml
        assert '<key id="d2" for="edge" attr.name="weight" attr.type="double"/>' in self.xml
        assert (
            '<key id="d10" for="edge" attr.name="significant" attr.type="boolean"/>' in self.xml
        )
        assert self.xml.index("d0") < self.xml.index("d1")
        assert self.xml.index('attr.name="weight"') < self.xml.index('attr.name="intersection"')

    def test_renders_node_with_escaped_label_and_integer_size(self) -> None:
        assert (
            '    <node id="B">\n'
            "      <data key=\"d0\">B &amp; &lt;beta&gt;</data>\n"
            "      <data key=\"d1\">30</data>\n"
            "    </node>"
        ) in self.xml

    def test_renders_edge_with_pinned_numeric_formatting_and_ordering(self) -> None:
        assert (
            '    <edge source="A" target="B">\n'
            '      <data key="d2">12.000000</data>\n'
            '      <data key="d3">12</data>\n'
            '      <data key="d4">0.2000</data>\n'
            '      <data key="d5">1.234</data>\n'
            '      <data key="d6">0.6000</data>\n'
            '      <data key="d7">0.3000</data>\n'
            '      <data key="d8">5.00e-4</data>\n'
            '      <data key="d9">0.001000</data>\n'
            '      <data key="d10">true</data>\n'
            "    </edge>"
        ) in self.xml

    def test_uses_to_fixed_6_for_large_p_values_and_false_for_nonsignificant_edges(self) -> None:
        assert '<data key="d8">0.400000</data>' in self.xml
        assert '<data key="d10">false</data>' in self.xml

    def test_uses_undirected_graph_default(self) -> None:
        assert '  <graph edgedefault="undirected">' in self.xml
