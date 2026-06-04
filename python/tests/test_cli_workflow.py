"""Tests for the `vdl workflow ...` subapp."""

from __future__ import annotations

from pathlib import Path

from typer.testing import CliRunner

from venn_diagram_lab.cli import app

runner = CliRunner()


def test_workflow_init_creates_scaffold(tmp_path: Path) -> None:
    target = tmp_path / "proj"
    res = runner.invoke(app, ["workflow", "init", str(target)])
    assert res.exit_code == 0, res.output
    assert (target / "data").is_dir()
    assert (target / "output").is_dir()
    assert (target / "analysis.yaml").is_file()
    body = (target / "analysis.yaml").read_text(encoding="utf-8")
    assert "version: 1" in body
    assert "outputs:" in body


def test_workflow_init_refuses_nonempty(tmp_path: Path) -> None:
    target = tmp_path / "proj"
    target.mkdir()
    (target / "dummy.txt").write_text("x")
    res = runner.invoke(app, ["workflow", "init", str(target)])
    assert res.exit_code == 1


def test_workflow_bench_emits_timing() -> None:
    res = runner.invoke(app, ["workflow", "bench", "dataset_real_cancer_drivers_4"])
    assert res.exit_code == 0, res.output
    out = res.output.lower()
    assert "analyze" in out
    assert "total" in out


def test_workflow_run_from_writes_outputs(tmp_path: Path) -> None:
    cfg = tmp_path / "analysis.yaml"
    cfg.write_text(
        "version: 1\n"
        "input: dataset_real_cancer_drivers_4\n"
        "outputs:\n"
        f"  - kind: venn\n    out: {tmp_path}/venn.svg\n"
        f"  - kind: statistics\n    out: {tmp_path}/stats.tsv\n",
        encoding="utf-8",
    )
    res = runner.invoke(app, ["workflow", "run-from", str(cfg)])
    assert res.exit_code == 0, res.output
    assert (tmp_path / "venn.svg").exists()
    assert (tmp_path / "stats.tsv").exists()


def test_workflow_run_from_bad_yaml(tmp_path: Path) -> None:
    cfg = tmp_path / "bad.yaml"
    cfg.write_text("not: valid: yaml: at all\n")
    res = runner.invoke(app, ["workflow", "run-from", str(cfg)])
    assert res.exit_code != 0


def test_workflow_run_from_missing_file(tmp_path: Path) -> None:
    res = runner.invoke(app, ["workflow", "run-from", str(tmp_path / "nope.yaml")])
    assert res.exit_code == 1


def test_workflow_run_from_unknown_kind(tmp_path: Path) -> None:
    cfg = tmp_path / "x.yaml"
    cfg.write_text(
        "version: 1\n"
        "input: dataset_real_cancer_drivers_4\n"
        "outputs:\n"
        f"  - kind: bogus_kind\n    out: {tmp_path}/x.svg\n",
        encoding="utf-8",
    )
    res = runner.invoke(app, ["workflow", "run-from", str(cfg)])
    assert res.exit_code == 1


# ----- --sample flag coverage -----------------------------------------------


def test_workflow_bench_with_sample_flag() -> None:
    """`vdl workflow bench --sample` runs and prints stage timings."""
    res = runner.invoke(app, ["workflow", "bench", "--sample"])
    assert res.exit_code == 0, res.output
    out = res.output.lower()
    assert "analyze" in out
    assert "total" in out


def test_workflow_bench_no_input_no_sample_exits_1() -> None:
    res = runner.invoke(app, ["workflow", "bench"])
    assert res.exit_code == 1
    assert "INPUT required" in res.output or "use --sample" in res.output
