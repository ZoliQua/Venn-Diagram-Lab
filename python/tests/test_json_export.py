"""Unit tests for the JSON number-rendering + serializer helpers.

Mirrors the executable spec in
``packages/core/src/__tests__/jsonExport.test.ts`` — in particular the
small-decimal boundary cases that must stay plain decimals (never exponential)
so the Python port matches the TS goldens byte-for-byte.
"""

from __future__ import annotations

from venn_diagram_lab._json_export import format_json_number, serialize


class TestFormatJsonNumber:
    def test_renders_integers_as_integers(self) -> None:
        assert format_json_number(1394) == "1394"
        assert format_json_number(0) == "0"

    def test_renders_whole_number_floats_without_decimal_point(self) -> None:
        assert format_json_number(2.0) == "2"
        assert format_json_number(1.0) == "1"

    def test_rounds_floats_to_6_decimals_shortest_form(self) -> None:
        assert format_json_number(0.5) == "0.5"
        assert format_json_number(0.1000000) == "0.1"
        assert format_json_number(0.1234567) == "0.123457"  # 7th decimal rounded off
        assert format_json_number(1 / 3) == "0.333333"
        assert format_json_number(2 / 3) == "0.666667"

    def test_rounds_tiny_values_below_1e_6_to_0(self) -> None:
        assert format_json_number(1e-20) == "0"

    def test_keeps_small_decimals_plain_never_exponential(self) -> None:
        # The 1e-6..1e-4 band: Python's str(float(...)) switches to exponential
        # here, which would break parity. Real goldens carry these Bonferroni
        # values (e.g. 0.000083, 0.000713).
        assert format_json_number(0.000083) == "0.000083"
        assert format_json_number(0.000001) == "0.000001"
        assert format_json_number(0.00001) == "0.00001"
        assert format_json_number(0.000713) == "0.000713"


class TestSerialize:
    def test_empty_containers(self) -> None:
        assert serialize({}) == "{}"
        assert serialize([]) == "[]"

    def test_pinned_object_layout_and_number_rendering(self) -> None:
        obj = {"a": "A", "overlapCoeff": 1.0, "intersection": 2, "items": ["x", "y"]}
        expected = (
            "{\n"
            '  "a": "A",\n'
            '  "overlapCoeff": 1,\n'
            '  "intersection": 2,\n'
            '  "items": [\n'
            '    "x",\n'
            '    "y"\n'
            "  ]\n"
            "}"
        )
        assert serialize(obj) == expected

    def test_no_trailing_newline(self) -> None:
        assert not serialize({"k": 1}).endswith("\n")
