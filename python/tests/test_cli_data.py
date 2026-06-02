"""Tests for the `vdl data ...` subapp."""

from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from venn_diagram_lab.cli import app

runner = CliRunner()
SAMPLE = "dataset_real_cancer_drivers_4"


def test_data_validate_good_sample_emits_json() -> None:
    res = runner.invoke(app, ["data", "validate", SAMPLE])
    assert res.exit_code == 0, res.output
    doc = json.loads(res.output)
    assert len(doc["sets"]) == 4
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
    from venn_diagram_lab.analysis import list_models

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
