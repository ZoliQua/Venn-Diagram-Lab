# ruff: noqa: I001
"""End-to-end Phase 1/3 integration tests: sample -> analyze -> statistics + rendering."""

from __future__ import annotations

import pytest

import matplotlib
matplotlib.use("Agg")  # must be called before pyplot
import matplotlib.pyplot as plt

import venn_diagram_lab as vdl

STREAMING_SET_COUNT = 8
CANCER_DRIVERS_SET_COUNT = 4
CANCER_DRIVERS_PAIR_COUNT = 28  # C(8, 2) = 28
CANCER_DRIVERS_MAX_REGIONS = 15  # 2^4 - 1
JACCARD_DIAGONAL = 1.0

# Phase 3 constants
UPSET_MAX_COLUMNS = 10  # max columns passed to render_upset in Phase 3 tests
PROPORTIONAL_OVERSIZE_SET_COUNT = 4  # first set count that proportional doesn't support


class TestSampleToStatistics:
    def test_streaming_platforms_pipeline(self) -> None:
        # Real bundled sample, binary CSV, 8 sets
        ds = vdl.load_sample("dataset_mock_streaming_platforms")
        assert len(ds.set_names) == STREAMING_SET_COUNT

        result = vdl.analyze(ds, model="auto")
        assert result.model.startswith("venn-8")
        assert isinstance(result.regions, dict)
        assert all(isinstance(r, vdl.RegionData) for r in result.regions.values())

        stats = result.statistics
        assert stats.jaccard.shape == (STREAMING_SET_COUNT, STREAMING_SET_COUNT)
        assert len(stats.hypergeometric) == CANCER_DRIVERS_PAIR_COUNT  # C(8, 2) = 28

    def test_cancer_drivers_pipeline(self) -> None:
        ds = vdl.load_sample("dataset_real_cancer_drivers_4")
        assert len(ds.set_names) == CANCER_DRIVERS_SET_COUNT

        result = vdl.analyze(ds, model="venn-4-set")
        assert result.model == "venn-4-set"
        # 4 sets -> up to 2^4 - 1 = 15 regions; some may be empty
        assert 1 <= len(result.regions) <= CANCER_DRIVERS_MAX_REGIONS
        # All set sizes must be positive (real data)
        assert all(v > 0 for v in result.set_sizes.values())

        stats = result.statistics
        # Jaccard symmetric
        for a in ds.set_names:
            for b in ds.set_names:
                assert stats.jaccard.loc[a, b] == pytest.approx(stats.jaccard.loc[b, a])
        # Diagonal = 1.0
        for a in ds.set_names:
            assert stats.jaccard.loc[a, a] == pytest.approx(JACCARD_DIAGONAL)

    def test_aggregated_sample_pipeline(self) -> None:
        ds = vdl.load_sample("dataset_mock_gene_sets")
        result = vdl.analyze(ds, model="auto")
        # Compute the universe size from regions and verify against direct dataset count
        universe_from_regions = sum(r.exclusive_count for r in result.regions.values())
        universe_from_dataset = len(set().union(*ds.items.values()))
        assert universe_from_regions == universe_from_dataset


class TestErrorPaths:
    def test_unknown_model_via_public_api(self) -> None:
        ds = vdl.Dataset.from_dict({"A": {"x"}, "B": {"y"}})
        with pytest.raises(vdl.UnknownModelError):
            vdl.analyze(ds, model="not-a-real-model")

    def test_incompatible_model_via_public_api(self) -> None:
        ds = vdl.Dataset.from_dict({"A": {"x"}, "B": {"y"}})  # 2 sets
        with pytest.raises(vdl.IncompatibleModelError):
            vdl.analyze(ds, model="venn-7-set-grunbaum")


class TestPhase3RendersOnRealSample:
    def test_streaming_platforms_renders_all_three(self) -> None:
        ds = vdl.load_sample("dataset_mock_streaming_platforms")
        result = vdl.analyze(ds, model="auto")

        # SVG (Phase 2)
        svg_img = result.render_venn()
        assert isinstance(svg_img, vdl.SvgImage)

        # UpSet
        upset_img = result.render_upset(max_columns=UPSET_MAX_COLUMNS)
        assert isinstance(upset_img, vdl.MplImage)
        plt.close(upset_img.fig)

        # Network
        net_img = result.render_network()
        assert isinstance(net_img, vdl.MplImage)
        plt.close(net_img.fig)

    def test_proportional_pipeline_2set(self) -> None:
        ds = vdl.Dataset.from_dict({"A": {"x", "y", "z"}, "B": {"y", "z", "w"}})
        result = vdl.analyze(ds, model="proportional")
        assert result.is_approximate is False
        svg_img = result.render_venn()
        assert isinstance(svg_img, vdl.SvgImage)
        assert "<svg" in svg_img.svg

    def test_proportional_pipeline_3set_is_approximate(self) -> None:
        ds = vdl.Dataset.from_dict({"A": {"x"}, "B": {"x"}, "C": {"x"}})
        result = vdl.analyze(ds, model="proportional")
        assert result.is_approximate is True
        svg_img = result.render_venn()
        assert "approximate" in svg_img.svg

    def test_proportional_4set_render_raises(self) -> None:
        ds = vdl.Dataset.from_dict(
            {chr(ord("A") + i): {"x"} for i in range(PROPORTIONAL_OVERSIZE_SET_COUNT)}
        )
        result = vdl.analyze(ds, model="proportional")
        with pytest.raises(vdl.IncompatibleModelError):
            result.render_venn()
