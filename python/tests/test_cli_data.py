"""Tests for the `vdl data ...` subapp."""

from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from venn_diagram_lab.analysis import list_models
from venn_diagram_lab.cli import app

runner = CliRunner()
SAMPLE = "dataset_real_cancer_drivers_4"
_EXPECTED_SETS_CANCER = 4


def test_data_validate_good_sample_emits_json() -> None:
    res = runner.invoke(app, ["data", "validate", SAMPLE])
    assert res.exit_code == 0, res.output
    doc = json.loads(res.output)
    assert len(doc["sets"]) == _EXPECTED_SETS_CANCER
    assert doc["item_count"] > 0
    assert isinstance(doc["errors"], list)
    assert doc["errors"] == []


def test_data_validate_text_mode_human_readable() -> None:
    res = runner.invoke(app, ["data", "validate", SAMPLE, "--text"])
    assert res.exit_code == 0
    out = res.output.lower()
    assert "no errors" in out or "errors" in out


def test_data_validate_missing_file_exits_1(tmp_path: Path) -> None:
    bogus = tmp_path / "nope.tsv"
    res = runner.invoke(app, ["data", "validate", str(bogus)])
    assert res.exit_code == 1


def test_data_describe(tmp_path: Path) -> None:
    res = runner.invoke(app, ["data", "describe", SAMPLE])
    assert res.exit_code == 0, res.output
    out = res.output.lower()
    assert "set" in out
    assert "item" in out


def test_data_convert_tsv_to_csv(tmp_path: Path) -> None:
    src = tmp_path / "src.tsv"
    src.write_text("A\tB\nx\t1\ny\t0\n", encoding="utf-8")
    dst = tmp_path / "dst.csv"
    res = runner.invoke(app, ["data", "convert", str(src), str(dst)])
    assert res.exit_code == 0, res.output
    assert dst.exists()
    body = dst.read_text(encoding="utf-8")
    assert "," in body
    assert "\t" not in body


def test_data_convert_csv_to_tsv(tmp_path: Path) -> None:
    src = tmp_path / "src.csv"
    src.write_text("A,B\nx,1\ny,0\n", encoding="utf-8")
    dst = tmp_path / "dst.tsv"
    res = runner.invoke(app, ["data", "convert", str(src), str(dst)])
    assert res.exit_code == 0, res.output
    assert dst.exists()
    body = dst.read_text(encoding="utf-8")
    assert "\t" in body
    assert "," not in body


def test_data_fit_model() -> None:
    """The suggested model name must exist in list_models()."""

    res = runner.invoke(app, ["data", "fit-model", SAMPLE])
    assert res.exit_code == 0
    assert "venn" in res.output.lower()
    # Extract the suggested name (line "suggested model: <name>")
    for line in res.output.splitlines():
        if line.startswith("suggested model:"):
            suggestion = line.split(":", 1)[1].strip()
            break
    else:
        raise AssertionError("no 'suggested model:' line in output")
    catalog = {m.name for m in list_models()}
    assert suggestion in catalog, f"{suggestion!r} not in catalog ({sorted(catalog)})"


def test_data_samples_lists() -> None:
    res = runner.invoke(app, ["data", "samples"])
    assert res.exit_code == 0
    assert SAMPLE in res.output


def test_data_validate_strict_promotes_warnings(tmp_path: Path) -> None:
    """When --strict is set, warnings (if any) are reclassified as errors."""
    res = runner.invoke(app, ["data", "validate", SAMPLE, "--strict"])
    # For a clean sample with no warnings, --strict still exits 0.
    assert res.exit_code in (0, 1)


# ----- Feature 4: data-quality warnings --------------------------------------

# Binary TSV fixture (default `data validate` mode) with all three quality
# issues: TP53 is truthy on SetA in two rows (duplicate, collapsed per
# `_binary_columns_to_dataset`'s per-column Python set), EGFR's SetA cell is
# blank (empty cell), and "tp53" vs "TP53" is a case collision.
_QUALITY_TSV = (
    "Gene\tSetA\tSetB\n"
    "TP53\t1\t0\n"
    "TP53\t1\t1\n"
    "tp53\t0\t1\n"
    "EGFR\t\t1\n"
)


def _write_quality_tsv(tmp_path: Path) -> Path:
    p = tmp_path / "quality.tsv"
    p.write_text(_QUALITY_TSV, encoding="utf-8")
    return p


def test_data_validate_emits_data_quality_warnings(tmp_path: Path) -> None:
    src = _write_quality_tsv(tmp_path)
    res = runner.invoke(app, ["data", "validate", str(src)])
    assert res.exit_code == 0, res.output
    doc = json.loads(res.output)
    assert doc["errors"] == []
    kinds = {w["kind"] for w in doc["warnings"]}
    assert kinds == {"duplicate-items", "empty-cells", "case-collision"}

    dup = next(w for w in doc["warnings"] if w["kind"] == "duplicate-items")
    assert dup["column_name"] == "SetA"
    assert dup["count"] == 1
    assert dup["examples"] == ["TP53"]

    empty = next(w for w in doc["warnings"] if w["kind"] == "empty-cells")
    assert empty["count"] == 1

    collision = next(w for w in doc["warnings"] if w["kind"] == "case-collision")
    assert collision["items"] == ["TP53", "tp53"]


def test_data_validate_strict_promotes_data_quality_warnings_to_errors(
    tmp_path: Path,
) -> None:
    src = _write_quality_tsv(tmp_path)
    res = runner.invoke(app, ["data", "validate", str(src), "--strict"])
    assert res.exit_code == 1, res.output
    doc = json.loads(res.output)
    assert doc["warnings"] == []
    assert len(doc["errors"]) == 3  # noqa: PLR2004
    assert {e["kind"] for e in doc["errors"]} == {
        "duplicate-items",
        "empty-cells",
        "case-collision",
    }


def test_data_validate_text_mode_shows_warnings(tmp_path: Path) -> None:
    src = _write_quality_tsv(tmp_path)
    res = runner.invoke(app, ["data", "validate", str(src), "--text"])
    assert res.exit_code == 0, res.output
    out = res.output.lower()
    assert "warnings:" in out
    assert "duplicate" in out


def test_data_validate_clean_tsv_has_no_quality_warnings(tmp_path: Path) -> None:
    src = tmp_path / "clean.tsv"
    src.write_text("Gene\tSetA\tSetB\nG1\t1\t0\nG2\t0\t1\n", encoding="utf-8")
    res = runner.invoke(app, ["data", "validate", str(src)])
    assert res.exit_code == 0, res.output
    doc = json.loads(res.output)
    assert doc["warnings"] == []


# ----- --sample flag coverage -----------------------------------------------


def test_data_validate_with_sample_flag() -> None:
    """`vdl data validate --sample` runs end-to-end on the bundled dataset."""
    res = runner.invoke(app, ["data", "validate", "--sample"])
    assert res.exit_code == 0, res.output
    # The "--sample" notice is emitted on stderr (mixed with stdout under CliRunner);
    # strip everything before the first '{' so json.loads sees the body only.
    body = res.output[res.output.index("{") :]
    doc = json.loads(body)
    assert doc["input"] == SAMPLE
    assert len(doc["sets"]) == _EXPECTED_SETS_CANCER


def test_data_describe_with_sample_flag() -> None:
    res = runner.invoke(app, ["data", "describe", "--sample"])
    assert res.exit_code == 0, res.output
    assert "set" in res.output.lower()


def test_data_fit_model_with_sample_flag() -> None:
    res = runner.invoke(app, ["data", "fit-model", "--sample"])
    assert res.exit_code == 0, res.output
    assert "venn" in res.output.lower()


def test_data_describe_no_input_no_sample_exits_1() -> None:
    res = runner.invoke(app, ["data", "describe"])
    assert res.exit_code == 1
    assert "INPUT required" in res.output or "use --sample" in res.output


# ----- data lookup (v2.2.3) -------------------------------------------------


def test_data_lookup_known_item() -> None:
    """An item that exists in the cancer-drivers dataset prints 'found in'."""
    res = runner.invoke(app, ["data", "lookup", SAMPLE, "TP53"])
    assert res.exit_code == 0, res.output
    assert "TP53" in res.output
    assert "found in" in res.output
    # TP53 is in all four catalogs of dataset_real_cancer_drivers_4, so the
    # match must be the 4-way region "ABCD".
    assert "ABCD" in res.output


def test_data_lookup_unknown_item() -> None:
    """An item that doesn't exist prints 'not found' but still exits 0."""
    res = runner.invoke(app, ["data", "lookup", SAMPLE, "NOTAGENE_XYZ"])
    assert res.exit_code == 0, res.output
    assert "not found" in res.output


def test_data_lookup_with_sample_flag() -> None:
    """`vdl data lookup --sample TP53` skips the INPUT positional."""
    res = runner.invoke(app, ["data", "lookup", "--sample", "TP53"])
    assert res.exit_code == 0, res.output
    assert "TP53" in res.output
    assert "found in" in res.output


def test_data_lookup_missing_item_exits_1() -> None:
    """No ITEM argument exits 1 with a clear message."""
    res = runner.invoke(app, ["data", "lookup", SAMPLE])
    assert res.exit_code == 1
    assert "ITEM required" in res.output or "item" in res.output.lower()
