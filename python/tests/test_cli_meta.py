"""Tests for the meta top-level commands: tree / about / credits."""

from __future__ import annotations

from typer.testing import CliRunner

from venn_diagram_lab.cli import app

runner = CliRunner()


def test_tree_lists_top_level_commands() -> None:
    res = runner.invoke(app, ["tree"])
    assert res.exit_code == 0, res.output
    out = res.output
    # Root + a few representative subapp commands.
    assert "vdl" in out
    assert "render" in out
    assert "venn" in out          # render/venn
    assert "export" in out
    assert "statistics" in out    # export/statistics
    assert "workflow" in out
    assert "run-from" in out      # workflow/run-from


def test_tree_lists_all_subapps() -> None:
    res = runner.invoke(app, ["tree"])
    assert res.exit_code == 0
    out = res.output
    for sub in ("render", "export", "report", "data", "model", "workflow"):
        assert sub in out, f"{sub!r} subapp missing from tree"


def test_about_prints_overview() -> None:
    res = runner.invoke(app, ["about"])
    assert res.exit_code == 0, res.output
    out = res.output.lower()
    assert "venn" in out
    assert "history" in out or "historical" in out
    assert "https://venndiagramlab.org/" in res.output


def test_credits_lists_all_authors() -> None:
    res = runner.invoke(app, ["credits"])
    assert res.exit_code == 0, res.output
    out = res.output
    for surname in ("Dul", "Ölbei", "Thomas", "Si Ammour", "Csikász-Nagy"):
        assert surname in out, f"{surname!r} missing from credits"


def test_credits_includes_zenodo_doi() -> None:
    res = runner.invoke(app, ["credits"])
    assert res.exit_code == 0
    assert "10.5281/zenodo.19510813" in res.output


def test_credits_includes_links() -> None:
    res = runner.invoke(app, ["credits"])
    assert res.exit_code == 0
    out = res.output
    assert "https://venndiagramlab.org/" in out
    assert "github.com/ZoliQua/Venn-Diagram-Lab" in out
    assert "pypi.org/project/venn-diagram-lab" in out
    assert "CRAN.R-project.org/package=vennDiagramLab" in out


def test_credits_includes_npm_link() -> None:
    res = runner.invoke(app, ["credits"])
    assert res.exit_code == 0
    assert "npmjs.com/package/venn-diagram-lab" in res.output
