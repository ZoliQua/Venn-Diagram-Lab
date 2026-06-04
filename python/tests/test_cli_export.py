"""Tests for the `vdl export ...` subapp."""

from __future__ import annotations

from pathlib import Path

import pytest
from typer.testing import CliRunner

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.cli import app
from venn_diagram_lab.samples import load_sample

runner = CliRunner()

SAMPLE = "dataset_real_cancer_drivers_4"


@pytest.mark.parametrize("kind,header_token", [
    ("region-summary", "Region"),
    ("matrix",         "Item"),
    # The pairwise/statistics writer emits a header beginning with "Set_A\tSet_B\t..."
    # (verified in analysis.to_statistics_tsv). The plan's "Pair" token was a spec
    # mismatch; we assert on the actual column name produced by the writer.
    ("statistics",     "Set_A"),
    ("pairwise",       "Set_A"),
])
def test_export_kind_writes_tsv(tmp_path: Path, kind: str, header_token: str) -> None:
    target = tmp_path / f"{kind}.tsv"
    res = runner.invoke(app, ["export", kind, SAMPLE, "--out", str(target)])
    assert res.exit_code == 0, res.output
    assert target.exists()
    first_line = target.read_text(encoding="utf-8").splitlines()[0]
    assert header_token in first_line


def test_export_statistics_to_stdout() -> None:
    res = runner.invoke(app, ["export", "statistics", SAMPLE, "--out", "-"])
    assert res.exit_code == 0
    # Header column name from the underlying writer; see parametrize note above.
    assert "Set_A" in res.output


def test_export_pairwise_byte_equivalent_to_statistics(tmp_path: Path) -> None:
    """`pairwise` is an alias of `statistics` — outputs must match byte-for-byte."""
    a = tmp_path / "a.tsv"
    b = tmp_path / "b.tsv"
    runner.invoke(app, ["export", "statistics", SAMPLE, "--out", str(a)])
    runner.invoke(app, ["export", "pairwise",   SAMPLE, "--out", str(b)])
    assert a.read_bytes() == b.read_bytes()


def test_export_unknown_input_exits_1(tmp_path: Path) -> None:
    res = runner.invoke(app, ["export", "statistics", "nope_xyz", "--out", str(tmp_path / "x.tsv")])
    assert res.exit_code == 1


def test_export_parity_with_api(tmp_path: Path) -> None:
    """CLI byte-equivalent to direct Python API call."""
    api_target = tmp_path / "api.tsv"
    cli_target = tmp_path / "cli.tsv"
    result = analyze(load_sample(SAMPLE))
    result.to_statistics_tsv(api_target)
    res = runner.invoke(app, ["export", "statistics", SAMPLE, "--out", str(cli_target)])
    assert res.exit_code == 0
    assert api_target.read_bytes() == cli_target.read_bytes()


# ----- --sample flag coverage -----------------------------------------------


@pytest.mark.parametrize(
    "kind,default_stem",
    [
        ("region-summary", "region-summary"),
        ("matrix", "matrix"),
        ("statistics", "statistics"),
        # `pairwise` shares the statistics writer, so the default filename
        # also uses the "statistics" stem. This is intentional — see _emit().
        ("pairwise", "statistics"),
    ],
)
def test_export_kind_with_sample_flag(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, kind: str, default_stem: str,
) -> None:
    """`vdl export <kind> --sample` writes the default-named TSV under CWD."""
    monkeypatch.chdir(tmp_path)
    res = runner.invoke(app, ["export", kind, "--sample"])
    assert res.exit_code == 0, res.output
    assert (tmp_path / f"{SAMPLE}__{default_stem}.tsv").exists()


def test_export_statistics_no_input_no_sample_exits_1() -> None:
    res = runner.invoke(app, ["export", "statistics"])
    assert res.exit_code == 1
    assert "INPUT required" in res.output or "use --sample" in res.output
