"""Tests for venn_diagram_lab.render.upset."""

# ruff: noqa: I001
from __future__ import annotations

import matplotlib
matplotlib.use("Agg")  # non-interactive backend before pyplot
import matplotlib.pyplot as plt

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.io import Dataset
from venn_diagram_lab.render.image import MplImage
from venn_diagram_lab.render.upset import (
    UpsetData,
    UpsetIntersection,
    render_upset,
    sort_by_degree,
    sort_by_size,
    upset_data_from_region_result,
)


class TestUpsetIntersection:
    def test_construction(self) -> None:
        u = UpsetIntersection(members=("A", "C"), size=42, label="AC")
        assert u.members == ("A", "C")
        assert u.size == 42  # noqa: PLR2004
        assert u.label == "AC"


class TestUpsetData:
    def test_construction(self) -> None:
        ints = (
            UpsetIntersection(members=("A",), size=10, label="A"),
            UpsetIntersection(members=("A", "B"), size=5, label="AB"),
        )
        data = UpsetData(sets=("A", "B"), intersections=ints)
        assert data.sets == ("A", "B")
        assert len(data.intersections) == 2  # noqa: PLR2004


class TestUpsetDataFromRegionResult:
    def test_two_set_basic(self) -> None:
        # Construct a dataset where region sizes are deterministic:
        # A only -> 5, B only -> 3, AB -> 7
        n_a_only = 5
        n_b_only = 3
        n_ab = 7
        a_only = {f"a{i}" for i in range(n_a_only)}
        b_only = {f"b{i}" for i in range(n_b_only)}
        ab = {f"ab{i}" for i in range(n_ab)}
        ds = Dataset.from_dict({"A": a_only | ab, "B": b_only | ab})
        result = analyze(ds, model="venn-2-set")
        data = upset_data_from_region_result(result)
        assert data.sets == ("A", "B")
        sizes_by_label = {i.label: i.size for i in data.intersections}
        assert sizes_by_label.get("A") == n_a_only
        assert sizes_by_label.get("B") == n_b_only
        assert sizes_by_label.get("AB") == n_ab

    def test_omits_empty_regions(self) -> None:
        # Disjoint 2-set: AB region is empty; should NOT appear in intersections.
        ds = Dataset.from_dict({"A": {"x"}, "B": {"y"}})
        result = analyze(ds, model="venn-2-set")
        data = upset_data_from_region_result(result)
        labels = {i.label for i in data.intersections}
        assert "AB" not in labels
        assert "A" in labels
        assert "B" in labels


class TestUpsetSort:
    def _data(self) -> UpsetData:
        return UpsetData(
            sets=("A", "B", "C"),
            intersections=(
                UpsetIntersection(members=("A",), size=10, label="A"),
                UpsetIntersection(members=("B",), size=5, label="B"),
                UpsetIntersection(members=("A", "B"), size=20, label="AB"),
                UpsetIntersection(members=("A", "B", "C"), size=15, label="ABC"),
            ),
        )

    def test_sort_by_size_descending(self) -> None:
        sorted_ints = sort_by_size(self._data())
        assert [i.label for i in sorted_ints] == ["AB", "ABC", "A", "B"]

    def test_sort_by_degree_then_alpha(self) -> None:
        sorted_ints = sort_by_degree(self._data())
        # Degree 1 first (A, B), then degree 2 (AB), then degree 3 (ABC).
        assert [i.label for i in sorted_ints] == ["A", "B", "AB", "ABC"]


class TestRenderUpsetBasic:
    def test_returns_mpl_image(self) -> None:
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"y"}})
        result = analyze(ds, model="venn-2-set")
        img = render_upset(result)
        assert isinstance(img, MplImage)
        # Three axes: top bars, dot matrix, left bars.
        assert len(img.fig.axes) == 3  # noqa: PLR2004
        plt.close(img.fig)

    def test_has_intersections_in_dot_matrix(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x", "y"}, "C": {"y", "z"}})
        result = analyze(ds, model="venn-3-set")
        img = render_upset(result)
        assert img.fig.get_size_inches()[0] > 0
        plt.close(img.fig)


class TestRenderUpsetColorModes:
    def _result(self):
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"y", "z"}, "C": {"z"}})
        return analyze(ds, model="venn-3-set")

    def test_depth_mode_default(self) -> None:
        img = render_upset(self._result())
        ax_top = img.fig.axes[0]
        bars = ax_top.containers[0]
        colors = [bar.get_facecolor() for bar in bars]
        assert all(len(c) == 4 for c in colors)  # noqa: PLR2004
        plt.close(img.fig)

    def test_heatmap_mode(self) -> None:
        img = render_upset(self._result(), color_mode="heatmap")
        ax_top = img.fig.axes[0]
        bars = ax_top.containers[0]
        assert len(list(bars)) > 0
        plt.close(img.fig)

    def test_custom_mode_with_colors(self) -> None:
        img = render_upset(
            self._result(),
            color_mode="custom",
            colors={
                "A": "#FF0000",
                "B": "#00FF00",
                "C": "#0000FF",
                "AB": "#FFFF00",
                "BC": "#00FFFF",
            },
        )
        plt.close(img.fig)


class TestRenderUpsetFilter:
    def _result(self):
        ds = Dataset.from_dict({
            "A": {f"a{i}" for i in range(10)} | {"shared"},
            "B": {f"b{i}" for i in range(5)} | {"shared"},
        })
        return analyze(ds, model="venn-2-set")

    def test_threshold_filters_small_intersections(self) -> None:
        threshold = 2
        img = render_upset(self._result(), threshold=threshold)
        # The shared-only intersection has size 1, below threshold; should be excluded.
        ax_dot = img.fig.axes[1]
        labels_shown = [t.get_text() for t in ax_dot.get_xticklabels()]
        assert "AB" not in labels_shown
        plt.close(img.fig)

    def test_sort_by_degree_changes_order(self) -> None:
        img = render_upset(self._result(), sort_by="degree")
        ax_dot = img.fig.axes[1]
        labels = [t.get_text() for t in ax_dot.get_xticklabels()]
        # First two labels should be single-letter (degree 1)
        assert all(len(label) == 1 for label in labels[:2])
        plt.close(img.fig)


class TestRegionResultRenderUpset:
    def test_method_returns_mpl_image(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="venn-2-set")
        img = result.render_upset()
        assert isinstance(img, MplImage)
        plt.close(img.fig)

    def test_method_passes_through_kwargs(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="venn-2-set")
        img = result.render_upset(max_columns=5, color_mode="heatmap")
        assert isinstance(img, MplImage)
        plt.close(img.fig)
