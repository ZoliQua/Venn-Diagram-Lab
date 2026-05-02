"""Tests for venn_diagram_lab.render.network."""

# ruff: noqa: I001
from __future__ import annotations

import math

import matplotlib
matplotlib.use("Agg")  # non-interactive backend before pyplot
import matplotlib.pyplot as plt

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.io import Dataset
from venn_diagram_lab.render.network import (
    NetworkData,
    NetworkEdge,
    NetworkNode,
    build_network_data,
    render_network,
)
from venn_diagram_lab.render.image import MplImage


class TestNetworkDataclasses:
    def test_node_construction(self) -> None:
        n = NetworkNode(id="A", label="SetA", size=42, radius=15.0)
        assert n.id == "A"
        assert n.size == 42  # noqa: PLR2004

    def test_edge_construction(self) -> None:
        e = NetworkEdge(
            source="A", target="B", weight=0.25,
            intersection=10, jaccard=0.25, fold_enrichment=2.0, overlap_coefficient=0.5,
            dice=0.4, p_value=0.01, p_adjusted=0.05, significant=True,
            name_a="SetA", name_b="SetB",
        )
        assert e.source == "A"
        assert e.significant is True

    def test_network_data_construction(self) -> None:
        n1 = NetworkNode(id="A", label="A", size=10, radius=12.0)
        n2 = NetworkNode(id="B", label="B", size=10, radius=12.0)
        e = NetworkEdge(
            source="A", target="B", weight=1.0,
            intersection=5, jaccard=0.33, fold_enrichment=1.0, overlap_coefficient=0.5,
            dice=0.5, p_value=0.5, p_adjusted=0.5, significant=False,
            name_a="A", name_b="B",
        )
        data = NetworkData(nodes=(n1, n2), edges=(e,))
        assert len(data.nodes) == 2  # noqa: PLR2004
        assert len(data.edges) == 1


class TestBuildNetworkData:
    def test_two_set_basic(self) -> None:
        ds = Dataset.from_dict({"SetA": {"x", "y", "z"}, "SetB": {"y", "z", "w"}})
        result = analyze(ds, model="venn-2-set")
        data = build_network_data(result)
        assert len(data.nodes) == 2  # noqa: PLR2004
        assert len(data.edges) == 1
        edge = data.edges[0]
        assert edge.source == "A"
        assert edge.target == "B"
        # Jaccard for |A|=3, |B|=3, |A & B|=2 -> 2/4 = 0.5
        assert math.isclose(edge.jaccard, 0.5, abs_tol=1e-3)

    def test_three_set_pair_count(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}, "C": {"x"}})
        result = analyze(ds, model="venn-3-set")
        data = build_network_data(result)
        assert len(data.nodes) == 3  # noqa: PLR2004
        assert len(data.edges) == 3  # noqa: PLR2004  # C(3, 2) = 3

    def test_node_radius_scales_with_set_size(self) -> None:
        ds = Dataset.from_dict({
            "A": set(range(100)),
            "B": {"x"},
        })
        result = analyze(ds, model="venn-2-set")
        data = build_network_data(result)
        node_a = next(n for n in data.nodes if n.id == "A")
        node_b = next(n for n in data.nodes if n.id == "B")
        assert node_a.radius > node_b.radius

    def test_edge_metric_changes_weight(self) -> None:
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"x", "z"}})
        result = analyze(ds, model="venn-2-set")
        d_count = build_network_data(result, metric="intersection")
        d_jacc = build_network_data(result, metric="jaccard")
        assert d_count.edges[0].weight == 1
        assert math.isclose(d_jacc.edges[0].weight, 1 / 3, abs_tol=1e-3)


class TestRenderNetworkBasic:
    def test_returns_mpl_image(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="venn-2-set")
        img = render_network(result)
        assert isinstance(img, MplImage)
        plt.close(img.fig)

    def test_three_set_renders(self) -> None:
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"y", "z"}, "C": {"z", "w"}})
        result = analyze(ds, model="venn-3-set")
        img = render_network(result)
        assert isinstance(img, MplImage)
        assert len(img.fig.axes) >= 1
        plt.close(img.fig)

    def test_seed_makes_layout_deterministic(self) -> None:
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"y", "z"}, "C": {"z"}})
        result = analyze(ds, model="venn-3-set")
        img1 = render_network(result, seed=42)
        img2 = render_network(result, seed=42)
        # Same seed -> same node positions -> same PNG bytes.
        assert img1._repr_png_() == img2._repr_png_()
        plt.close(img1.fig)
        plt.close(img2.fig)


class TestRenderNetworkColors:
    def test_node_color_map_overrides_default(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="venn-2-set")
        img = render_network(result, node_color_map={"A": "#FF0000", "B": "#00FF00"})
        assert isinstance(img, MplImage)
        plt.close(img.fig)


class TestRegionResultRenderNetwork:
    def test_method_returns_mpl_image(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="venn-2-set")
        img = result.render_network()
        assert isinstance(img, MplImage)
        plt.close(img.fig)

    def test_method_passes_through_kwargs(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="venn-2-set")
        img = result.render_network(edge_metric="jaccard", seed=7)
        assert isinstance(img, MplImage)
        plt.close(img.fig)
