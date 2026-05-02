"""Tests for venn_diagram_lab.proportional."""

from __future__ import annotations

import math

from venn_diagram_lab.proportional import (
    ProportionalCircle,
    ProportionalLayout,
    circle_intersection_area,
)

_CX = 10.0
_CY = 20.0
_R = 5.0
_R_LARGE = 10.0
_CX2 = 15.0
_EXPECTED_ERROR = 0.001
_N_CIRCLES = 2


class TestProportionalCircle:
    def test_construction(self) -> None:
        c = ProportionalCircle(cx=_CX, cy=_CY, r=_R)
        assert c.cx == _CX
        assert c.cy == _CY
        assert c.r == _R


class TestProportionalLayout:
    def test_construction(self) -> None:
        circles = (
            ProportionalCircle(cx=0, cy=0, r=_R_LARGE),
            ProportionalCircle(cx=_CX2, cy=0, r=_R_LARGE),
        )
        layout = ProportionalLayout(circles=circles, error=_EXPECTED_ERROR, is_approximate=False)
        assert len(layout.circles) == _N_CIRCLES
        assert math.isclose(layout.error, _EXPECTED_ERROR)
        assert layout.is_approximate is False


_R_SMALL = 2.0
_R_MED = 5.0
_D_DISJOINT = 20.0
_D_PARTIAL = 5.0
_D_INSIDE = 2.0


class TestCircleIntersectionArea:
    def test_disjoint_circles(self) -> None:
        # Two equal circles, distance > r1+r2 -> no intersection.
        a = circle_intersection_area(r1=_R_MED, r2=_R_MED, d=_D_DISJOINT)
        assert math.isclose(a, 0.0, abs_tol=1e-9)

    def test_concentric_circles(self) -> None:
        # Distance 0, r1 == r2 -> intersection = pi * r ** 2 (full overlap).
        a = circle_intersection_area(r1=_R_MED, r2=_R_MED, d=0)
        assert math.isclose(a, math.pi * _R_MED ** 2, rel_tol=1e-6)

    def test_one_inside_other(self) -> None:
        # Small inside large: d + r1 <= r2 -> intersection = pi * r1 ** 2.
        a = circle_intersection_area(r1=_R_SMALL, r2=_R_MED, d=_D_INSIDE)
        assert math.isclose(a, math.pi * _R_SMALL ** 2, rel_tol=1e-6)

    def test_partial_overlap(self) -> None:
        # Two equal circles with centers 5 apart, radius 5.
        a = circle_intersection_area(r1=_R_MED, r2=_R_MED, d=_D_PARTIAL)
        expected = 2 * _R_MED ** 2 * math.acos(0.5) - (_D_PARTIAL / 2) * math.sqrt(3 * _R_MED ** 2)
        assert math.isclose(a, expected, rel_tol=1e-6)


from venn_diagram_lab.proportional import solve_2set  # noqa: E402


class TestSolve2Set:
    def test_disjoint(self) -> None:
        # |A only| = 10, |B only| = 10, |AB| = 0 -> circles don't overlap.
        layout = solve_2set(a_only=10, b_only=10, ab=0)
        assert layout.is_approximate is False
        assert len(layout.circles) == 2  # noqa: PLR2004
        c_a, c_b = layout.circles
        assert math.isclose(c_a.r, c_b.r, rel_tol=1e-3)
        d = math.hypot(c_b.cx - c_a.cx, c_b.cy - c_a.cy)
        assert d >= c_a.r + c_b.r - 1e-3

    def test_equal_overlap(self) -> None:
        # |A only| = |B only| = 5, |AB| = 5 -> circles same size, overlap.
        layout = solve_2set(a_only=5, b_only=5, ab=5)
        c_a, c_b = layout.circles
        assert math.isclose(c_a.r, c_b.r, rel_tol=1e-3)
        d = math.hypot(c_b.cx - c_a.cx, c_b.cy - c_a.cy)
        assert d < 2 * c_a.r

    def test_full_subset(self) -> None:
        # |A only| = 0, |B only| = 5, |AB| = 5 -> A is entirely inside B.
        layout = solve_2set(a_only=0, b_only=5, ab=5)
        c_a, c_b = layout.circles
        assert c_b.r > c_a.r
        d = math.hypot(c_b.cx - c_a.cx, c_b.cy - c_a.cy)
        assert d + c_a.r <= c_b.r + 1e-3

    def test_error_below_threshold(self) -> None:
        layout = solve_2set(a_only=12, b_only=8, ab=4)
        # Convergence target from spec: |computed - target| / target < 1e-4
        assert layout.error < 1e-4  # noqa: PLR2004


from venn_diagram_lab.proportional import solve_3set  # noqa: E402


class TestSolve3Set:
    def test_returns_approximate_layout(self) -> None:
        # 7-region partition (binary masks 1..7)
        # A=1, B=2, AB=3, C=4, AC=5, BC=6, ABC=7
        regions = {1: 10, 2: 10, 3: 5, 4: 10, 5: 5, 6: 5, 7: 2}
        layout = solve_3set(regions)
        assert layout.is_approximate is True
        assert len(layout.circles) == 3  # noqa: PLR2004

    def test_all_zero_intersections_returns_disjoint(self) -> None:
        regions = {1: 5, 2: 5, 3: 0, 4: 5, 5: 0, 6: 0, 7: 0}
        layout = solve_3set(regions)
        assert len(layout.circles) == 3  # noqa: PLR2004

    def test_error_reported(self) -> None:
        regions = {1: 10, 2: 10, 3: 5, 4: 10, 5: 5, 6: 5, 7: 2}
        layout = solve_3set(regions)
        assert layout.error >= 0.0


import pytest  # noqa: E402

from venn_diagram_lab.analysis import analyze  # noqa: E402
from venn_diagram_lab.io import Dataset  # noqa: E402
from venn_diagram_lab.proportional import generate_proportional_svg  # noqa: E402


class TestGenerateProportionalSvg:
    def test_2_set_produces_svg_string(self) -> None:
        # Use a real bundled 2-set model so analyze() succeeds; then call
        # generate_proportional_svg directly. C6 will wire the dispatch.
        ds = Dataset.from_dict({"A": {"x", "y", "z"}, "B": {"y", "z", "w"}})
        result = analyze(ds, model="venn-2-set")
        svg = generate_proportional_svg(result)
        assert isinstance(svg, str)
        assert "<svg" in svg
        assert 'id="ShapeA"' in svg
        assert 'id="ShapeB"' in svg
        assert 'id="Count_AB"' in svg

    def test_3_set_produces_svg_with_three_shapes(self) -> None:
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"y", "z"}, "C": {"z", "w"}})
        result = analyze(ds, model="venn-3-set")
        svg = generate_proportional_svg(result)
        assert 'id="ShapeC"' in svg
        assert 'id="Count_ABC"' in svg

    def test_count_values_substituted(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x", "y"}})
        result = analyze(ds, model="venn-2-set")
        svg = generate_proportional_svg(result)
        # Count_AB should be 1, Count_A should be 0, Count_B should be 1
        assert ">1<" in svg

    def test_4_set_raises_incompatible(self) -> None:
        from venn_diagram_lab.errors import IncompatibleModelError  # noqa: PLC0415
        ds = Dataset.from_dict({chr(ord("A") + i): {"x"} for i in range(4)})
        result = analyze(ds, model="venn-4-set")
        with pytest.raises(IncompatibleModelError, match="2-3 sets"):
            generate_proportional_svg(result)


from venn_diagram_lab.errors import IncompatibleModelError  # noqa: E402


class TestProportionalIntegration:
    def test_analyze_proportional_returns_result_with_correct_model(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="proportional")
        assert result.model == "proportional"

    def test_2_set_proportional_is_not_approximate(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="proportional")
        assert result.is_approximate is False

    def test_3_set_proportional_is_approximate(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}, "C": {"x"}})
        result = analyze(ds, model="proportional")
        assert result.is_approximate is True

    def test_4_set_proportional_renders_with_error(self) -> None:
        ds = Dataset.from_dict({chr(ord("A") + i): {"x"} for i in range(4)})
        result = analyze(ds, model="proportional")
        # analyze() succeeds (per design); render fails.
        with pytest.raises(IncompatibleModelError, match="2-3 sets"):
            result.render_venn()

    def test_render_venn_proportional_returns_svg_image(self) -> None:
        from venn_diagram_lab.render.svg import SvgImage  # noqa: PLC0415
        ds = Dataset.from_dict({"A": {"x", "y"}, "B": {"y", "z"}})
        result = analyze(ds, model="proportional")
        img = result.render_venn()
        assert isinstance(img, SvgImage)
        assert "<svg" in img.svg
