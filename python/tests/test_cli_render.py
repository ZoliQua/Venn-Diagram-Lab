"""Tests for the `vdl render ...` subapp."""

from __future__ import annotations

from pathlib import Path

import pytest
from typer.testing import CliRunner

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.cli import app
from venn_diagram_lab.render.svg import render_venn_svg
from venn_diagram_lab.samples import load_sample

runner = CliRunner()
SAMPLE = "dataset_real_cancer_drivers_4"
_EXPECTED_BARS = 4   # 4 sets → 4 sd-bar rects


def test_render_venn_from_sample_default_out(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path,
) -> None:
    """`vdl render venn <sample>` writes <sample>__venn.svg in CWD."""
    monkeypatch.chdir(tmp_path)
    res = runner.invoke(app, ["render", "venn", SAMPLE])
    assert res.exit_code == 0, res.output
    target = tmp_path / f"{SAMPLE}__venn.svg"
    assert target.exists()
    body = target.read_text(encoding="utf-8").lstrip()
    assert body.startswith("<svg") or body.startswith("<?xml")


def test_render_venn_explicit_out(tmp_path: Path) -> None:
    """`vdl render venn <sample> --out path.svg` writes there."""
    target = tmp_path / "out.svg"
    res = runner.invoke(app, ["render", "venn", SAMPLE, "--out", str(target)])
    assert res.exit_code == 0, res.output
    assert target.exists()


def test_render_venn_unknown_input() -> None:
    """Unknown input string exits with code 1."""
    res = runner.invoke(app, ["render", "venn", "nosuch_input_zzz"])
    assert res.exit_code == 1


def test_render_venn_dry_run(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """--dry-run prints the target path but writes nothing."""
    monkeypatch.chdir(tmp_path)
    res = runner.invoke(app, ["render", "venn", SAMPLE, "--dry-run"])
    assert res.exit_code == 0
    assert "dry-run" in res.output
    assert not (tmp_path / f"{SAMPLE}__venn.svg").exists()


def test_render_venn_parity_with_api(tmp_path: Path) -> None:
    """CLI byte-equivalent to direct Python API call."""
    api_target = tmp_path / "api.svg"
    cli_target = tmp_path / "cli.svg"
    img = render_venn_svg(analyze(load_sample(SAMPLE)))
    img.save(api_target)
    res = runner.invoke(app, ["render", "venn", SAMPLE, "--out", str(cli_target)])
    assert res.exit_code == 0
    assert api_target.read_bytes() == cli_target.read_bytes()


def test_render_upset(tmp_path: Path) -> None:
    target = tmp_path / "upset.svg"
    res = runner.invoke(app, ["render", "upset", SAMPLE, "--out", str(target)])
    assert res.exit_code == 0, res.output
    assert target.exists()


def test_render_network(tmp_path: Path) -> None:
    target = tmp_path / "network.svg"
    res = runner.invoke(app, ["render", "network", SAMPLE, "--out", str(target)])
    assert res.exit_code == 0, res.output
    assert target.exists()


def test_render_heatmap_original(tmp_path: Path) -> None:
    target = tmp_path / "heatmap.svg"
    res = runner.invoke(app, ["render", "heatmap", SAMPLE, "--out", str(target)])
    assert res.exit_code == 0, res.output
    assert target.exists()
    body = target.read_text(encoding="utf-8")
    assert "hm-dendro-col" not in body  # original mode = no dendrograms


def test_render_heatmap_cluster(tmp_path: Path) -> None:
    target = tmp_path / "heatmap_clust.svg"
    res = runner.invoke(
        app,
        ["render", "heatmap", SAMPLE,
         "--cluster", "--linkage", "average", "--out", str(target)],
    )
    assert res.exit_code == 0, res.output
    assert target.exists()
    body = target.read_text(encoding="utf-8")
    assert "hm-dendro-col" in body
    assert "hm-dendro-row" in body


def test_render_share_dist(tmp_path: Path) -> None:
    target = tmp_path / "share.svg"
    res = runner.invoke(app, ["render", "share-dist", SAMPLE, "--out", str(target)])
    assert res.exit_code == 0, res.output
    assert target.exists()
    body = target.read_text(encoding="utf-8")
    assert body.count('class="sd-bar"') == _EXPECTED_BARS


def test_render_all_writes_bundle(tmp_path: Path) -> None:
    """`render all` writes venn + upset + network + heatmap + share-dist into a dir."""
    target_dir = tmp_path / "bundle"
    res = runner.invoke(
        app,
        ["render", "all", SAMPLE, "--output-dir", str(target_dir)],
    )
    assert res.exit_code == 0, res.output
    for name in ["venn", "upset", "network", "heatmap", "share-dist"]:
        assert (target_dir / f"{SAMPLE}__{name}.svg").exists(), name


def test_render_all_requires_output_dir() -> None:
    """Missing --output-dir exits with non-zero (Typer's missing-required code)."""
    res = runner.invoke(app, ["render", "all", SAMPLE])
    assert res.exit_code != 0


# ----- --sample flag coverage -----------------------------------------------


def test_render_venn_with_sample_flag(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path,
) -> None:
    """`vdl render venn --sample` writes the default-named file under CWD."""
    monkeypatch.chdir(tmp_path)
    res = runner.invoke(app, ["render", "venn", "--sample"])
    assert res.exit_code == 0, res.output
    assert (tmp_path / f"{SAMPLE}__venn.svg").exists()


def test_render_upset_with_sample_flag(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    res = runner.invoke(app, ["render", "upset", "--sample"])
    assert res.exit_code == 0, res.output
    assert (tmp_path / f"{SAMPLE}__upset.svg").exists()


def test_render_network_with_sample_flag(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    res = runner.invoke(app, ["render", "network", "--sample"])
    assert res.exit_code == 0, res.output
    assert (tmp_path / f"{SAMPLE}__network.svg").exists()


def test_render_heatmap_with_sample_flag(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    res = runner.invoke(app, ["render", "heatmap", "--sample"])
    assert res.exit_code == 0, res.output
    assert (tmp_path / f"{SAMPLE}__heatmap.svg").exists()


def test_render_share_dist_with_sample_flag(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path,
) -> None:
    monkeypatch.chdir(tmp_path)
    res = runner.invoke(app, ["render", "share-dist", "--sample"])
    assert res.exit_code == 0, res.output
    assert (tmp_path / f"{SAMPLE}__share-dist.svg").exists()


def test_render_all_with_sample_flag(tmp_path: Path) -> None:
    """`vdl render all --sample --output-dir DIR` writes the 5-file bundle."""
    target_dir = tmp_path / "bundle"
    res = runner.invoke(
        app, ["render", "all", "--sample", "--output-dir", str(target_dir)],
    )
    assert res.exit_code == 0, res.output
    for name in ["venn", "upset", "network", "heatmap", "share-dist"]:
        assert (target_dir / f"{SAMPLE}__{name}.svg").exists(), name


def test_render_venn_no_input_no_sample_exits_1() -> None:
    """No INPUT and no --sample produces a clear error message."""
    res = runner.invoke(app, ["render", "venn"])
    assert res.exit_code == 1
    assert "INPUT required" in res.output or "use --sample" in res.output
