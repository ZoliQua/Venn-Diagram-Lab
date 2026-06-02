"""Tests for the `vdl report ...` subapp."""

from __future__ import annotations

import zipfile
from pathlib import Path

from typer.testing import CliRunner

from venn_diagram_lab.cli import app

runner = CliRunner()
SAMPLE = "dataset_real_cancer_drivers_4"


def test_report_pdf(tmp_path: Path) -> None:
    target = tmp_path / "report.pdf"
    res = runner.invoke(app, ["report", "pdf", SAMPLE, "--out", str(target)])
    assert res.exit_code == 0, res.output
    assert target.exists()
    head = target.read_bytes()[:8]
    assert head.startswith(b"%PDF-")


def test_report_zip(tmp_path: Path) -> None:
    target = tmp_path / "bundle.zip"
    res = runner.invoke(app, ["report", "zip", SAMPLE, "--out", str(target)])
    assert res.exit_code == 0, res.output
    assert target.exists()
    with zipfile.ZipFile(target) as zf:
        names = set(zf.namelist())
    assert any(name.endswith(".pdf") for name in names), names
    assert any(name.endswith(".tsv") for name in names), names
    assert any(name.endswith(".svg") for name in names), names


def test_report_pdf_unknown_input_exits_1(tmp_path: Path) -> None:
    res = runner.invoke(app, ["report", "pdf", "nope_xyz", "--out", str(tmp_path / "x.pdf")])
    assert res.exit_code == 1


def test_report_zip_contains_expected_files(tmp_path: Path) -> None:
    """The zip bundle should contain venn/upset/network/share-dist SVGs + 3 TSVs + 1 PDF."""
    target = tmp_path / "bundle.zip"
    res = runner.invoke(app, ["report", "zip", SAMPLE, "--out", str(target)])
    assert res.exit_code == 0, res.output
    with zipfile.ZipFile(target) as zf:
        names = sorted(zf.namelist())
    expected_kinds = ["venn.svg", "upset.svg", "network.svg", "share-dist.svg",
                       "regions_summary.tsv", "items_matrix.tsv", "statistics.tsv",
                       "report.pdf"]
    for kind in expected_kinds:
        assert kind in names, f"{kind} missing from zip; got {names}"
