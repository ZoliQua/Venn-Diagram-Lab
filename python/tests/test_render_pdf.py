"""Tests for venn_diagram_lab.render.pdf."""

# ruff: noqa: I001  - matplotlib non-interactive backend setup
from __future__ import annotations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.io import Dataset
from venn_diagram_lab.render.pdf import (
    _build_about_page,
    _build_network_page,
    _build_overview_page,
    _build_statistics_pages,
    _build_venn_upset_page,
    _format_p,
    render_pdf_report,
)


class TestFormatP:
    """Display-only p-value formatting (Feature 5: underflow floor annotation)."""

    def test_floors_exact_zero_to_underflow_annotation(self) -> None:
        assert _format_p(0.0) == "< 1e-300"

    def test_keeps_scientific_notation_for_small_nonzero_p(self) -> None:
        assert _format_p(5e-20) == f"{5e-20:.2e}"

    def test_keeps_fixed_format_for_p_at_or_above_threshold(self) -> None:
        assert _format_p(0.0234) == f"{0.0234:.3f}"


class TestBuildOverviewPage:
    def test_returns_figure(self) -> None:
        ds = Dataset.from_dict({"A": {"x", "y", "z"}, "B": {"y", "z", "w"}})
        result = analyze(ds, model="venn-2-set")
        fig = _build_overview_page(result, title="Test Report")
        assert fig is not None
        assert len(fig.axes) >= 1
        plt.close(fig)

    def test_includes_set_names_in_pie(self) -> None:
        ds = Dataset.from_dict({"Human": {"BRCA1"}, "Mouse": {"Brca1"}, "Rat": {"Brca1"}})
        result = analyze(ds, model="venn-3-set")
        fig = _build_overview_page(result, title="Orthologs")
        all_text = " ".join(t.get_text() for ax in fig.axes for t in ax.texts)
        assert "Human" in all_text or "Mouse" in all_text or "Rat" in all_text
        plt.close(fig)


_EXPECTED_VENN_UPSET_AXES = 2  # venn imshow + upset imshow
_EXPECTED_STATS_PAGES_LARGE = 3  # one page per table for 7-9 sets


class TestBuildVennUpsetPage:
    def test_returns_figure_with_two_axes(self) -> None:
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"y", "z"}})
        result = analyze(ds, model="venn-2-set")
        fig = _build_venn_upset_page(result)
        # Two image panels (venn imshow + upset imshow).
        assert len(fig.axes) == _EXPECTED_VENN_UPSET_AXES
        plt.close(fig)


class TestBuildStatisticsPages:
    def test_2_set_returns_one_combined_page(self) -> None:
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"y", "z"}})
        result = analyze(ds, model="venn-2-set")
        figs = _build_statistics_pages(result)
        # 2-6 sets get one page with all three tables.
        assert len(figs) == 1
        for f in figs:
            plt.close(f)

    def test_7_set_returns_three_pages(self) -> None:
        # Build a 7-set dataset with deterministic structure.
        ds = Dataset.from_dict({chr(ord("A") + i): {f"x{i}", "shared"} for i in range(7)})
        result = analyze(ds, model="venn-7-set-grunbaum")
        figs = _build_statistics_pages(result)
        # 7-9 sets: one page per table (3 tables).
        assert len(figs) == _EXPECTED_STATS_PAGES_LARGE
        for f in figs:
            plt.close(f)


class TestBuildNetworkPage:
    def test_returns_figure(self) -> None:
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"y", "z"}, "C": {"z", "w"}})
        result = analyze(ds, model="venn-3-set")
        fig = _build_network_page(result)
        # Two axes: network image + edges list.
        assert len(fig.axes) == _EXPECTED_VENN_UPSET_AXES
        plt.close(fig)


class TestBuildAboutPage:
    def test_returns_figure_with_text(self) -> None:
        fig = _build_about_page()
        all_text = " ".join(t.get_text() for ax in fig.axes for t in ax.texts)
        assert "Jaccard" in all_text or "Hypergeometric" in all_text or "Venn" in all_text
        plt.close(fig)


class TestRenderPdfReport:
    def test_writes_pdf_file(self, tmp_path) -> None:
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"y", "z"}})
        result = analyze(ds, model="venn-2-set")
        out = tmp_path / "report.pdf"
        render_pdf_report(result, out)
        assert out.is_file()
        assert out.read_bytes()[:5] == b"%PDF-"

    def test_skip_network_and_about_still_writes_pdf(self, tmp_path) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"y"}})
        result = analyze(ds, model="venn-2-set")
        out = tmp_path / "report.pdf"
        render_pdf_report(result, out, include_network=False, include_about=False)
        assert out.is_file()

    def test_accepts_str_path(self, tmp_path) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="venn-2-set")
        out = tmp_path / "report.pdf"
        render_pdf_report(result, str(out))
        assert out.is_file()


class TestRegionResultToPdfReport:
    def test_method_writes_pdf(self, tmp_path) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="venn-2-set")
        out = tmp_path / "report.pdf"
        result.to_pdf_report(out)
        assert out.is_file()
        assert out.read_bytes()[:5] == b"%PDF-"

    def test_method_passes_through_kwargs(self, tmp_path) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="venn-2-set")
        out = tmp_path / "report.pdf"
        result.to_pdf_report(out, include_about=False)
        assert out.is_file()
