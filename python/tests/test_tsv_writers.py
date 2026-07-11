"""Unit tests for RegionResult.to_*_tsv() writers.

Focused tests with a tiny hand-built dataset where we can manually verify the
expected TSV bytes. The full webapp-parity comparison lives in
test_parity_with_webapp.py.
"""

from __future__ import annotations

from pathlib import Path

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.io import Dataset


def _tiny_dataset() -> Dataset:
    """3-set dataset, 5 items, designed so every region has at least one item."""
    return Dataset.from_dict(
        {
            "Alpha": ["x1", "x2", "x3", "x4"],
            "Beta": ["x2", "x3", "x4", "x5"],
            "Gamma": ["x3", "x4", "x5"],
        }
    )


class TestRegionSummaryTsv:
    def test_basic_layout_and_sort(self, tmp_path: Path) -> None:
        result = analyze(_tiny_dataset(), model="auto")
        out = tmp_path / "out.tsv"
        result.to_region_summary_tsv(out)
        text = out.read_text(encoding="utf-8")
        lines = text.split("\n")

        # Header
        expected_header = (
            "Region\tSets\tDepth\tExclusive_Count\tInclusive_Count\tExclusive_Pct\tItems"
        )
        assert lines[0] == expected_header

        # Data rows: depth 1 first (A, B, C), then depth 2 (AB, AC, BC), then depth 3 (ABC).
        # With this dataset:
        # Exclusive only-A items: x1
        # Exclusive only-B items: (none)
        # Exclusive only-C items: (none)
        # Exclusive AB-only items: x2
        # Exclusive AC-only items: (none)
        # Exclusive BC-only items: x5
        # Exclusive ABC items: x3, x4
        # Total = 5
        assert "A\tAlpha\t1\t1\t4\t20.00\tx1" in text
        assert "AB\tAlpha ∩ Beta\t2\t1\t3\t20.00\tx2" in text
        assert "ABC\tAlpha ∩ Beta ∩ Gamma\t3\t2\t2\t40.00\tx3;x4" in text

    def test_items_use_dataset_item_order(self, tmp_path: Path) -> None:
        # Build a dataset whose item_order is deliberately reversed alphabetically.
        ds = Dataset.from_dict({"S1": ["zebra", "apple"], "S2": ["zebra", "apple"]})
        result = analyze(ds, model="auto")
        out = tmp_path / "out.tsv"
        result.to_region_summary_tsv(out)
        # Both items belong to region "AB"; row should list them in item_order = (zebra, apple).
        # Find the AB row.
        for line in out.read_text(encoding="utf-8").split("\n"):
            if line.startswith("AB\t"):
                assert line.endswith("\tzebra;apple")
                break
        else:
            raise AssertionError("AB row not found")

    def test_escapes_formula_prefix_in_set_name(self, tmp_path: Path) -> None:
        ds = Dataset.from_dict({"=Hack": ["x"], "Safe": ["x"]})
        result = analyze(ds, model="auto")
        out = tmp_path / "out.tsv"
        result.to_region_summary_tsv(out)
        text = out.read_text(encoding="utf-8")
        # The Sets column should contain '=Hack escaped as "'=Hack".
        assert "'=Hack" in text

    def test_escapes_formula_prefix_in_item(self, tmp_path: Path) -> None:
        ds = Dataset.from_dict({"S1": ["=evil", "good"], "S2": ["=evil", "good"]})
        result = analyze(ds, model="auto")
        out = tmp_path / "out.tsv"
        result.to_region_summary_tsv(out)
        # Items column for AB region should contain "'=evil;good"
        for line in out.read_text(encoding="utf-8").split("\n"):
            if line.startswith("AB\t"):
                assert "'=evil;good" in line
                break


class TestMatrixTsv:
    def test_basic_layout(self, tmp_path: Path) -> None:
        ds = Dataset.from_dict({"Alpha": ["x1", "x2"], "Beta": ["x2", "x3"]})
        result = analyze(ds, model="auto")
        out = tmp_path / "out.tsv"
        result.to_matrix_tsv(out)
        text = out.read_text(encoding="utf-8")
        lines = text.split("\n")

        assert lines[0] == "Item\tAlpha\tBeta\tRegion"
        # Items appear in dataset.item_order grouped by their region (mask order).
        # Mask 0b01 = "A" (only-Alpha): x1
        # Mask 0b11 = "AB" (both): x2
        # Mask 0b10 = "B" (only-Beta): x3
        assert "x1\t1\t0\tA" in text
        assert "x2\t1\t1\tAB" in text
        assert "x3\t0\t1\tB" in text

    def test_row_order_iterates_masks_then_item_order(self, tmp_path: Path) -> None:
        # Items appear in mask order (1, 2, 3 -> A, B, AB), and within each mask in item_order.
        ds = Dataset.from_dict({"S1": ["zebra", "apple"], "S2": ["beta", "apple"]})
        # item_order = (zebra, apple, beta)
        # Region A (only S1): zebra
        # Region B (only S2): beta
        # Region AB: apple
        result = analyze(ds, model="auto")
        out = tmp_path / "out.tsv"
        result.to_matrix_tsv(out)
        data_lines = out.read_text(encoding="utf-8").split("\n")[1:]
        # Mask iteration order: 1 (A), 2 (B), 3 (AB)
        assert data_lines[0].startswith("zebra\t")
        assert data_lines[1].startswith("beta\t")
        assert data_lines[2].startswith("apple\t")

    def test_escapes_set_names_and_items(self, tmp_path: Path) -> None:
        ds = Dataset.from_dict({"=Hack": ["=evil"], "Safe": ["=evil"]})
        result = analyze(ds, model="auto")
        out = tmp_path / "out.tsv"
        result.to_matrix_tsv(out)
        text = out.read_text(encoding="utf-8")
        # Header: Item \t '=Hack \t Safe \t Region
        assert text.startswith("Item\t'=Hack\tSafe\tRegion\n")
        assert "'=evil\t" in text


class TestStatisticsTsv:
    def test_columns_and_sort(self, tmp_path: Path) -> None:
        # 3 sets so we get 3 pairs.
        ds = Dataset.from_dict({
            "S1": ["a", "b", "c", "d"],
            "S2": ["b", "c", "d", "e"],
            "S3": ["x", "y"],   # disjoint from S1, S2
        })
        result = analyze(ds, model="auto")
        out = tmp_path / "stats.tsv"
        result.to_statistics_tsv(out)
        text = out.read_text(encoding="utf-8")
        lines = text.split("\n")

        # Header matches DataSummaryPanel.handleExportStats exactly.
        assert lines[0] == (
            "Set_A\tSet_B\tName_A\tName_B\tSize_A\tSize_B\t"
            "Intersection\tUnion\tJaccard\tOverlap_Coeff\tDice\t"
            "Expected\tFold_Enrichment\tP_value\tFDR\t"
            "Bonferroni\tP_two_sided\t"
            "Jaccard_CI_low\tJaccard_CI_high\tDice_CI_low\tDice_CI_high\t"
            "Significant"
        )

        # 3 data rows for n=3 (3 pairs).
        assert len(lines) - 1 == 3  # noqa: PLR2004

        # Rows are in the iteration order of `pairwiseStatistics`: (A,B), (A,C), (B,C).
        # The webapp sorts by p_value ascending after BH correction.
        # Without recomputing exactly, check the (S1,S2) pair appears with intersection 3.
        ab_row = next(r for r in lines[1:] if r.startswith("A\tB\t"))
        cells = ab_row.split("\t")
        assert cells[2] == "S1"
        assert cells[3] == "S2"
        assert cells[6] == "3"  # Intersection: b,c,d
        assert cells[7] == "5"  # Union: a,b,c,d,e

    def test_jaccard_4dp(self, tmp_path: Path) -> None:
        ds = Dataset.from_dict({"S1": ["a", "b"], "S2": ["a", "b"]})
        result = analyze(ds, model="auto")
        out = tmp_path / "stats.tsv"
        result.to_statistics_tsv(out)
        ab = next(r for r in out.read_text("utf-8").split("\n")[1:] if r.startswith("A\tB\t"))
        cells = ab.split("\t")
        # Jaccard, Overlap_Coeff, Dice columns are .4f
        assert cells[8] == "1.0000"
        assert cells[9] == "1.0000"
        assert cells[10] == "1.0000"

    def test_significance_label_and_pvalue_format(self, tmp_path: Path) -> None:
        # S1 and S2 fully overlap (10 items each), S3 adds 100 unique items so the
        # exclusive-item universe is 110, making the S1/S2 overlap highly significant.
        s12_items = [str(i) for i in range(10)]
        s3_items = [str(i) for i in range(10, 110)]
        ds = Dataset.from_dict({"S1": s12_items, "S2": s12_items, "S3": s3_items})
        result = analyze(ds, model="auto")
        out = tmp_path / "stats.tsv"
        result.to_statistics_tsv(out)
        # Find the S1/S2 row (A\tB prefix).
        ab = next(r for r in out.read_text("utf-8").split("\n")[1:] if r.startswith("A\tB\t"))
        cells = ab.split("\t")
        # Significant is now the last (22nd) column -> index 21.
        assert cells[21] in {"***", "**", "*"}
        # P_value column (cells[13]) must use JS-style scientific notation (p << 0.001).
        assert "e-" in cells[13] or "e+" in cells[13]
        # Bonferroni (cells[15]) and P_two_sided (cells[16]) columns exist and are p-like.
        assert cells[15] != ""
        assert cells[16] != ""
        # Wilson CI columns are 4-decimal fixed (cells[17..20]).
        for idx in range(17, 21):
            assert "." in cells[idx]

    def test_no_pairs_when_n_lt_2(self, tmp_path: Path) -> None:
        # Edge case: dataset with min sets (=2) is the smallest valid; just ensure no crash.
        ds = Dataset.from_dict({"S1": ["a"], "S2": ["a"]})
        result = analyze(ds, model="auto")
        out = tmp_path / "stats.tsv"
        result.to_statistics_tsv(out)
        # Header + 1 row.
        assert len(out.read_text("utf-8").split("\n")) == 2  # noqa: PLR2004
