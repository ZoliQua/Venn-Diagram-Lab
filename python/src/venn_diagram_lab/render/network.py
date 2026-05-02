"""Network plot: force-directed graph of set overlaps via networkx + matplotlib."""

from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

import matplotlib.pyplot as plt
import networkx as nx  # type: ignore[import-untyped]

from venn_diagram_lab.render.image import MplImage

if TYPE_CHECKING:
    from venn_diagram_lab.analysis import RegionResult

_LETTERS = "ABCDEFGHI"

EdgeMetric = Literal["intersection", "jaccard", "fold_enrichment", "overlap_coefficient"]


@dataclass(frozen=True)
class NetworkNode:
    """One node in the set-overlap network."""

    id: str
    label: str
    size: int  # |set| inclusive
    radius: float  # rendered marker radius (matplotlib points)


@dataclass(frozen=True)
class NetworkEdge:
    """One edge between two sets, carrying all pairwise stats."""

    source: str
    target: str
    weight: float  # selected metric value (used for edge thickness / weight)
    intersection: int
    jaccard: float
    fold_enrichment: float
    overlap_coefficient: float
    dice: float
    p_value: float
    p_adjusted: float
    significant: bool  # p_adjusted < 0.05 by default; threshold configurable in render
    name_a: str
    name_b: str


@dataclass(frozen=True)
class NetworkData:
    """All nodes and edges of the set-overlap network."""

    nodes: tuple[NetworkNode, ...]
    edges: tuple[NetworkEdge, ...]


def build_network_data(result: RegionResult, *, metric: EdgeMetric = "intersection") -> NetworkData:
    """Build NetworkData from a Phase 1 RegionResult.

    Uses pairwise statistics from the lazy ``result.statistics`` cached_property.
    """
    sizes = result.set_sizes
    max_size = max(1, max(sizes.values(), default=1))

    nodes: list[NetworkNode] = []
    for i, name in enumerate(result.dataset.set_names):
        if i >= len(_LETTERS):
            break
        size = sizes[name]
        # Radius: 12 + sqrt(size / max) * 22 (matches web tool).
        radius = 12.0 + math.sqrt(size / max_size) * 22.0
        nodes.append(NetworkNode(id=_LETTERS[i], label=name, size=size, radius=radius))

    edges: list[NetworkEdge] = []
    stats = result.statistics
    hyp = stats.hypergeometric  # long-form pairwise table
    name_to_letter = {name: _LETTERS[i] for i, name in enumerate(result.dataset.set_names)}

    for _, row in hyp.iterrows():
        a_letter = name_to_letter[row["set_a"]]
        b_letter = name_to_letter[row["set_b"]]
        inter = int(row["intersection"])
        jac = float(stats.jaccard.loc[row["set_a"], row["set_b"]])
        fe = float(stats.fold_enrichment.loc[row["set_a"], row["set_b"]])
        oc = float(stats.overlap_coefficient.loc[row["set_a"], row["set_b"]])
        dic = float(stats.dice.loc[row["set_a"], row["set_b"]])
        p_val = float(row["p_value"])
        p_adj = float(row["p_adjusted"])
        weight = _weight_for_metric(metric, inter, jac, fe, oc)
        edges.append(NetworkEdge(
            source=a_letter, target=b_letter, weight=weight,
            intersection=inter, jaccard=jac, fold_enrichment=fe, overlap_coefficient=oc,
            dice=dic, p_value=p_val, p_adjusted=p_adj, significant=bool(row["significant"]),
            name_a=row["set_a"], name_b=row["set_b"],
        ))

    return NetworkData(nodes=tuple(nodes), edges=tuple(edges))


def _weight_for_metric(
    metric: EdgeMetric,
    intersection: int,
    jaccard: float,
    fold_enrichment: float,
    overlap_coefficient: float,
) -> float:
    """Pick the edge weight from one of the supported metrics.

    Caps fold_enrichment at 20 (matches the web tool -- extreme outliers were
    making the layout unstable).
    """
    if metric == "intersection":
        return float(intersection)
    if metric == "jaccard":
        return jaccard
    if metric == "fold_enrichment":
        return min(fold_enrichment, 20.0)
    return overlap_coefficient


# Styling constants for render_network.
_FIG_SIZE = 7
_NODE_COLOR = "#FFF200"
_NODE_EDGE_COLOR = "#444444"
_EDGE_COLOR_SIG = "#2E3192"
_EDGE_COLOR_NONSIG = "#bbbbbb"
_EDGE_WIDTH_BASE = 1.0
_EDGE_WIDTH_SCALE = 5.0
_LABEL_FONT_SIZE = 10
_DEFAULT_SIGNIFICANCE_THRESHOLD = 0.05


def render_network(
    result,  # type: ignore[no-untyped-def]
    *,
    edge_metric: EdgeMetric = "intersection",
    seed: int = 42,
    significance_threshold: float = _DEFAULT_SIGNIFICANCE_THRESHOLD,
    node_color_map: Mapping[str, str] | None = None,
) -> MplImage:
    """Render the set-overlap network as a matplotlib figure.

    Layout: networkx spring_layout (Fruchterman-Reingold) seeded for determinism.
    """
    data = build_network_data(result, metric=edge_metric)

    g: nx.Graph = nx.Graph()
    for node in data.nodes:
        g.add_node(node.id, label=node.label, size=node.size, radius=node.radius)
    for edge in data.edges:
        g.add_edge(edge.source, edge.target, weight=edge.weight)

    pos = nx.spring_layout(g, seed=seed, weight="weight")

    fig, ax = plt.subplots(figsize=(_FIG_SIZE, _FIG_SIZE))
    ax.set_axis_off()

    # Edges: color by significance, thickness by normalised weight.
    weights = [e.weight for e in data.edges]
    max_w = max(weights) if weights else 1.0
    if max_w <= 0:
        max_w = 1.0
    edge_colors = [
        _EDGE_COLOR_SIG if e.p_adjusted < significance_threshold else _EDGE_COLOR_NONSIG
        for e in data.edges
    ]
    edge_widths = [_EDGE_WIDTH_BASE + _EDGE_WIDTH_SCALE * (e.weight / max_w) for e in data.edges]
    nx.draw_networkx_edges(
        g, pos,
        edgelist=[(e.source, e.target) for e in data.edges],
        edge_color=edge_colors,
        width=edge_widths,
        ax=ax,
    )

    # Nodes: size by `radius`^2 (matplotlib `node_size` is area).
    node_sizes = [n.radius ** 2 for n in data.nodes]
    node_colors = (
        [node_color_map.get(n.id, "#FFF200") for n in data.nodes]
        if node_color_map else ["#FFF200"] * len(data.nodes)
    )
    nx.draw_networkx_nodes(
        g, pos, node_color=node_colors, edgecolors="#444444", node_size=node_sizes, ax=ax,
    )
    nx.draw_networkx_labels(
        g, pos,
        labels={n.id: n.label for n in data.nodes},
        font_size=_LABEL_FONT_SIZE,
        ax=ax,
    )

    fig.tight_layout()
    return MplImage(fig=fig)
