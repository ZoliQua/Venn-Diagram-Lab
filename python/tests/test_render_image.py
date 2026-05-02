"""Tests for venn_diagram_lab.render.image (MplImage)."""

# ruff: noqa: I001
from __future__ import annotations

import matplotlib
matplotlib.use("Agg")  # non-interactive backend before pyplot
import matplotlib.pyplot as plt

from venn_diagram_lab.render.image import MplImage


def _make_simple_figure() -> plt.Figure:
    fig, ax = plt.subplots(figsize=(2, 2))
    ax.plot([0, 1], [0, 1])
    return fig


class TestMplImage:
    def test_construction_holds_figure(self) -> None:
        fig = _make_simple_figure()
        img = MplImage(fig=fig)
        assert img.fig is fig
        plt.close(fig)

    def test_save_to_png_writes_png_file(self, tmp_path) -> None:
        fig = _make_simple_figure()
        img = MplImage(fig=fig)
        out = tmp_path / "out.png"
        img.save(out)
        assert out.is_file()
        assert out.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"
        plt.close(fig)

    def test_save_to_pdf_writes_pdf_file(self, tmp_path) -> None:
        fig = _make_simple_figure()
        img = MplImage(fig=fig)
        out = tmp_path / "out.pdf"
        img.save(out)
        assert out.is_file()
        assert out.read_bytes()[:5] == b"%PDF-"
        plt.close(fig)

    def test_save_to_svg_writes_svg_file(self, tmp_path) -> None:
        fig = _make_simple_figure()
        img = MplImage(fig=fig)
        out = tmp_path / "out.svg"
        img.save(out)
        assert out.is_file()
        head = out.read_text(encoding="utf-8")[:5]
        assert head.startswith("<?xml") or head.startswith("<svg")
        plt.close(fig)

    def test_save_with_explicit_dpi(self, tmp_path) -> None:
        fig = _make_simple_figure()
        img = MplImage(fig=fig)
        out_low = tmp_path / "low.png"
        out_high = tmp_path / "high.png"
        img.save(out_low, dpi=72)
        img.save(out_high, dpi=300)
        assert out_high.stat().st_size > out_low.stat().st_size
        plt.close(fig)

    def test_repr_png_returns_bytes(self) -> None:
        fig = _make_simple_figure()
        img = MplImage(fig=fig)
        png = img._repr_png_()
        assert isinstance(png, bytes)
        assert png[:8] == b"\x89PNG\r\n\x1a\n"
        plt.close(fig)
