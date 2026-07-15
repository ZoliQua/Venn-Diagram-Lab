"""Tests for `venn_diagram_lab.io.analyze_data_quality` (Feature 4).

Mirrors the TypeScript `analyzeDataQuality` test cases in
`packages/core/src/__tests__/dataQuality.test.ts` where the underlying
semantics are the same, and adds dedicated tests for the two deliberate,
documented Python divergences (see `DataQualityReport`'s docstring in
`venn_diagram_lab/io.py`):

1. Aggregated mode never splits a cell on an item delimiter — Python's real
   `_aggregated_columns_to_dataset` treats a whole trimmed cell as one item.
2. Binary mode reports duplicates **per set column**, not one flat entry
   keyed to the id column — Python's real `_binary_columns_to_dataset`
   stores membership as one independent `set()` per target set, so
   collapsing happens per column. It also skips an entire row (both for
   duplicate/case-collision detection *and* empty-cell counting) when the
   id column is blank, matching `_binary_columns_to_dataset`'s own
   `if not row or not row[0].strip(): continue`.
"""

from __future__ import annotations

from venn_diagram_lab.io import (
    CaseCollisionGroup,
    DataQualityReport,
    DuplicateColumnReport,
    analyze_data_quality,
)


class TestAnalyzeDataQualityAggregated:
    def test_duplicate_empty_cell_and_case_collision(self) -> None:
        """Ported directly from the TS 'aggregated mode' test — identical
        result because none of the cells here contain a delimiter, so
        Python's no-splitting divergence doesn't change the outcome."""
        headers = ["SetA", "SetB"]
        rows = [
            ["TP53", "BRCA1"],
            ["TP53", ""],
            ["EGFR", "tp53"],
        ]

        report = analyze_data_quality(headers, rows, [0, 1], "aggregated")

        assert report.has_warnings is True
        assert report.duplicates_removed == [
            DuplicateColumnReport(column=0, column_name="SetA", count=1, examples=["TP53"])
        ]
        assert report.empty_cells_skipped == 1
        assert report.case_collisions == [CaseCollisionGroup(items=["TP53", "tp53"])]

    def test_clean_data_no_warnings(self) -> None:
        headers = ["SetA", "SetB"]
        rows = [
            ["GENE1", "GENE3"],
            ["GENE2", "GENE4"],
        ]
        report = analyze_data_quality(headers, rows, [0, 1], "aggregated")
        assert report == DataQualityReport(
            duplicates_removed=[],
            empty_cells_skipped=0,
            case_collisions=[],
            has_warnings=False,
        )

    def test_no_item_delimiter_splitting_divergence(self) -> None:
        """Python divergence #1: a semicolon-joined cell is one opaque item,
        not three. The embedded 'GENE1' repeat and the 'gene1'/'GENE1'
        case-collision hiding inside the joined cell are therefore *not*
        detected here — unlike the TS surface, which splits on an item
        delimiter before dedup/case checks. This is intentional: Python's
        `_aggregated_columns_to_dataset` never splits a cell either."""
        headers = ["SetA", "SetB"]
        rows = [
            ["GENE1;GENE2;GENE1", "GENE3"],
            ["GENE4", "gene1"],
        ]
        report = analyze_data_quality(headers, rows, [0, 1], "aggregated")
        assert report == DataQualityReport(
            duplicates_removed=[],
            empty_cells_skipped=0,
            case_collisions=[],
            has_warnings=False,
        )


class TestAnalyzeDataQualityBinary:
    def test_duplicate_id_on_same_set_column(self) -> None:
        """Python divergence #2: a duplicate is only reported when the same
        identifier is truthy on the *same* set column across >1 rows —
        because that's the only case where `_binary_columns_to_dataset`'s
        `items[set_name].add(id)` actually collapses something. TP53 truthy
        twice on SetA (column 1) collapses to one membership; EGFR is fine."""
        headers = ["Gene", "SetA", "SetB"]
        rows = [
            ["TP53", "1", "0"],
            ["TP53", "1", "1"],
            ["EGFR", "1", "0"],
        ]
        report = analyze_data_quality(headers, rows, [1, 2], "binary")
        assert report.duplicates_removed == [
            DuplicateColumnReport(column=1, column_name="SetA", count=1, examples=["TP53"])
        ]
        assert report.has_warnings is True

    def test_same_id_different_truthy_columns_is_not_a_duplicate(self) -> None:
        """The TS binary duplicate test's fixture (TP53 truthy once on SetA,
        once on SetB across different rows) reports ZERO duplicates under
        Python semantics: each set's Python `set()` only ever sees TP53
        added once, so nothing is collapsed. This is the direct Python
        analogue of the TS test 'reports duplicate row identifiers (column
        0) among contributing rows' — same input, different (correct, for
        Python) result."""
        headers = ["Gene", "SetA", "SetB"]
        rows = [
            ["TP53", "1", "0"],
            ["TP53", "0", "1"],
            ["TP53", "0", "0"],
            ["EGFR", "1", "1"],
        ]
        report = analyze_data_quality(headers, rows, [1, 2], "binary")
        assert report.duplicates_removed == []
        assert report.has_warnings is False

    def test_empty_cells_counted_within_selected_columns(self) -> None:
        """Ported from the TS test — identical result since both ids here
        are non-blank, so the row-skip divergence doesn't manifest."""
        headers = ["Gene", "SetA", "SetB"]
        rows = [
            ["G1", "1", ""],
            ["G2", "", "0"],
        ]
        report = analyze_data_quality(headers, rows, [1, 2], "binary")
        assert report.empty_cells_skipped == 2  # noqa: PLR2004

    def test_blank_id_row_is_skipped_entirely_even_for_empty_cell_counting(self) -> None:
        """Divergence: `_binary_columns_to_dataset` skips a row's flag cells
        entirely when its id is blank (`if not row or not row[0].strip():
        continue`), so those cells' blankness is never even inspected. A
        'TS-style' unconditional-per-cell count would report 2 here."""
        headers = ["Gene", "SetA", "SetB"]
        rows = [
            ["", "", ""],
            ["G1", "1", "0"],
        ]
        report = analyze_data_quality(headers, rows, [1, 2], "binary")
        assert report.empty_cells_skipped == 0

    def test_case_collision_between_distinct_row_identifiers(self) -> None:
        headers = ["Gene", "SetA", "SetB"]
        rows = [
            ["TP53", "1", "0"],
            ["tp53", "0", "1"],
        ]
        report = analyze_data_quality(headers, rows, [1, 2], "binary")
        assert report.case_collisions == [CaseCollisionGroup(items=["TP53", "tp53"])]
        assert report.duplicates_removed == []

    def test_clean_binary_data_no_warnings(self) -> None:
        headers = ["Gene", "SetA", "SetB"]
        rows = [
            ["G1", "1", "0"],
            ["G2", "0", "1"],
        ]
        report = analyze_data_quality(headers, rows, [1, 2], "binary")
        assert report == DataQualityReport(
            duplicates_removed=[],
            empty_cells_skipped=0,
            case_collisions=[],
            has_warnings=False,
        )
