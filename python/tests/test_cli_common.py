"""Tests for cli._common shared helpers."""

from __future__ import annotations

from pathlib import Path

import pytest
import typer

from venn_diagram_lab.cli._common import (
    STDOUT_SENTINEL,
    exit_error,
    load_input,
    resolve_out,
    stem_for,
)


def test_load_input_path(tmp_path: Path) -> None:
    """A real file path is loaded via the format-detected loader."""
    p = tmp_path / "tiny.tsv"
    p.write_text("id\tA\tB\nx\t1\t0\ny\t0\t1\n", encoding="utf-8")
    ds = load_input(str(p))
    assert ds is not None
    assert hasattr(ds, "set_names")


def test_load_input_sample() -> None:
    """A registered sample name is loaded via load_sample()."""
    ds = load_input("dataset_real_cancer_drivers_4")
    assert ds is not None
    assert len(ds.set_names) == 4


def test_load_input_unknown_raises_typer_exit() -> None:
    """An unknown string (not a path, not a sample) exits with code 1."""
    with pytest.raises(typer.Exit) as exc_info:
        load_input("definitely_not_a_thing_xyz")
    assert exc_info.value.exit_code == 1


def test_resolve_out_explicit_path(tmp_path: Path) -> None:
    """When `out` is given, return it unchanged."""
    p = tmp_path / "foo.svg"
    assert resolve_out(p, "input.tsv", "venn", "svg") == p


def test_resolve_out_default_in_cwd(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """When `out` is None, default to `<input-stem>__<command>.<ext>` in CWD."""
    monkeypatch.chdir(tmp_path)
    result = resolve_out(None, "data/cancer_drivers_4.tsv", "venn", "svg")
    assert result == Path("cancer_drivers_4__venn.svg").resolve()


def test_resolve_out_dir_target(tmp_path: Path) -> None:
    """When `out` is a directory, place the auto-name inside it."""
    target_dir = tmp_path / "outputs"
    target_dir.mkdir()
    result = resolve_out(target_dir, "data/foo.tsv", "venn", "svg")
    assert result == target_dir / "foo__venn.svg"


def test_resolve_out_extension_appended(tmp_path: Path) -> None:
    """When `out` has no extension, append the default."""
    p = tmp_path / "noext"
    result = resolve_out(p, "x.tsv", "venn", "svg")
    assert result == p.with_suffix(".svg")


def test_resolve_out_dash_returns_stdout_sentinel() -> None:
    """`--out -` returns the STDOUT_SENTINEL value."""
    assert resolve_out(Path("-"), "x.tsv", "venn", "svg") is STDOUT_SENTINEL


def test_stem_for_path_uses_stem() -> None:
    """For a file path, stem_for() returns the basename without extension."""
    assert stem_for("data/cancer_drivers_4.tsv") == "cancer_drivers_4"


def test_stem_for_sample_returns_name() -> None:
    """For a registered sample name, stem_for() returns the name itself."""
    assert stem_for("dataset_real_cancer_drivers_4") == "dataset_real_cancer_drivers_4"


def test_exit_error_raises_typer_exit_with_code_1(capsys: pytest.CaptureFixture[str]) -> None:
    """exit_error() emits the message to stderr in red and raises typer.Exit(1)."""
    with pytest.raises(typer.Exit) as exc_info:
        exit_error("boom")
    assert exc_info.value.exit_code == 1
    err = capsys.readouterr().err
    assert "boom" in err
