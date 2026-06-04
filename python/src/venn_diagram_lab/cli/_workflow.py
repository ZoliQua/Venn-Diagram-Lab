"""`vdl workflow ...` subapp — project scaffolding + config-driven runs."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Annotated, Any

import typer
import yaml  # type: ignore[import-untyped, unused-ignore]

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.cli._common import (
    AlphabeticalGroup,
    examples_epilog,
    exit_error,
    load_input,
    resolve_sample_or_input,
)
from venn_diagram_lab.errors import VennDiagramError
from venn_diagram_lab.io import Dataset
from venn_diagram_lab.render.network import render_network
from venn_diagram_lab.render.svg import (
    render_cluster_heatmap_svg,
    render_share_distribution_svg,
    render_venn_svg,
)
from venn_diagram_lab.render.upset import render_upset

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Project workflow helpers (init, bench, run-from config).",
    cls=AlphabeticalGroup,
)


_SCAFFOLD_YAML = """\
# vdl workflow run-from config - see `vdl workflow run-from --help`
version: 1
input: dataset_real_cancer_drivers_4   # bundled sample, or path to your TSV/CSV
model: auto                            # or 'proportional'

outputs:
  - kind: venn
    out: output/venn.svg
  - kind: upset
    out: output/upset.svg
  - kind: network
    out: output/network.svg
  - kind: heatmap
    out: output/heatmap.svg
    cluster: true
    linkage: average
  - kind: share-dist
    out: output/share-dist.svg
  - kind: pdf
    out: output/report.pdf
  - kind: statistics
    out: output/statistics.tsv
"""


_KNOWN_KINDS = {
    "venn",
    "upset",
    "network",
    "heatmap",
    "share-dist",
    "pdf",
    "region-summary",
    "matrix",
    "statistics",
    "cluster",
}


@app.command(
    "init",
    epilog=examples_epilog(
        "  vdl workflow init /tmp/my-vdl-project",
        "  # no --sample: this command scaffolds an empty project directory.",
    ),
)
def cmd_init(
    directory: Annotated[Path, typer.Argument(help="Project directory to create")],
) -> None:
    """Scaffold a project layout (data/, output/, analysis.yaml).

    Creates a fresh `data/` and `output/` directory pair plus a starter
    `analysis.yaml` config preconfigured to run on the bundled
    cancer-drivers sample. Fail-fast if the target directory already
    exists and is not empty. Use `vdl workflow run-from` next.
    """
    if directory.exists() and any(directory.iterdir()):
        exit_error(f"{directory} exists and is not empty")
    (directory / "data").mkdir(parents=True, exist_ok=True)
    (directory / "output").mkdir(parents=True, exist_ok=True)
    (directory / "analysis.yaml").write_text(_SCAFFOLD_YAML, encoding="utf-8")
    typer.echo(f"Initialised project at {directory}")


@app.command(
    "bench",
    epilog=examples_epilog(
        "  vdl workflow bench --sample                                            # demo run",
        "  vdl workflow bench dataset_real_cancer_drivers_4",
        "  vdl workflow bench data/my.tsv --model proportional",
    ),
)
def cmd_bench(
    input: Annotated[
        str | None,
        typer.Argument(
            help="Dataset path or bundled sample name. Optional when --sample is given.",
        ),
    ] = None,
    *,
    sample: Annotated[
        bool,
        typer.Option(
            "--sample",
            help="Run with the bundled cancer-drivers sample (overrides INPUT default).",
        ),
    ] = False,
    model: Annotated[str, typer.Option(help="Model name; 'auto' or 'proportional'")] = "auto",
) -> None:
    """Run a per-stage performance benchmark.

    Times each pipeline stage (load, analyze, render-venn,
    render-upset, render-network, render-heatmap, render-share-dist)
    and prints seconds + milliseconds plus a grand total. Use this to
    spot bottlenecks before integrating vdl into a CI step.
    """
    resolved = resolve_sample_or_input(input, sample)
    stages: list[tuple[str, float]] = []
    t0 = time.perf_counter()
    ds = load_input(resolved)
    stages.append(("load_input", time.perf_counter() - t0))

    t0 = time.perf_counter()
    result = analyze(ds, model=model)
    stages.append(("analyze", time.perf_counter() - t0))

    benches: list[tuple[str, Any]] = [
        ("render_venn", lambda: render_venn_svg(result)),
        ("render_upset", lambda: render_upset(result)),
        ("render_network", lambda: render_network(result)),
        ("render_heatmap", lambda: render_cluster_heatmap_svg(result, linkage="average")),
        ("render_share_dist", lambda: render_share_distribution_svg(ds)),
    ]
    for name, fn in benches:
        t0 = time.perf_counter()
        fn()
        stages.append((name, time.perf_counter() - t0))

    typer.echo("stage                seconds      ms")
    typer.echo("--------------------------------------")
    for name, dt in stages:
        typer.echo(f"{name:18s}   {dt:8.3f}   {dt*1000:6.1f}")
    total = sum(dt for _, dt in stages)
    typer.echo("--------------------------------------")
    typer.echo(f"{'total':18s}   {total:8.3f}   {total*1000:6.1f}")


def _execute_output(entry: dict[str, Any], ds: Dataset, result: Any) -> None:
    """Execute a single `outputs` entry from the config."""
    kind = entry["kind"]
    out_path = Path(entry["out"])
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if kind == "venn":
        render_venn_svg(result).save(out_path)
    elif kind == "upset":
        render_upset(result).save(out_path)
    elif kind == "network":
        render_network(result).save(out_path)
    elif kind == "heatmap":
        cluster = bool(entry.get("cluster", False))
        render_cluster_heatmap_svg(
            result,
            linkage=entry.get("linkage", "average"),
            show_row_dendrogram=cluster,
            show_col_dendrogram=cluster,
        ).save(out_path)
    elif kind == "share-dist":
        render_share_distribution_svg(ds).save(out_path)
    elif kind == "pdf":
        result.to_pdf_report(out_path)
    elif kind == "region-summary":
        result.to_region_summary_tsv(out_path)
    elif kind == "matrix":
        result.to_matrix_tsv(out_path)
    elif kind == "statistics":
        result.to_statistics_tsv(out_path)
    elif kind == "cluster":
        render_cluster_heatmap_svg(
            result,
            linkage=entry.get("linkage", "average"),
            show_row_dendrogram=True,
            show_col_dendrogram=True,
        ).save(out_path)


def _parse_config(config: Path) -> tuple[str, str, list[dict[str, Any]]]:
    """Parse and validate a `run-from` YAML config; return (input, model, outputs)."""
    if not config.is_file():
        exit_error(f"config not found: {config}")
    try:
        doc = yaml.safe_load(config.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        exit_error(f"YAML parse error: {e}")
        raise RuntimeError("unreachable") from None  # mypy hint
    if not isinstance(doc, dict) or doc.get("version") != 1:
        exit_error("config must be a mapping with `version: 1` at top level")
    input_value = doc.get("input")
    if not isinstance(input_value, str):
        exit_error("`input:` must be a string (path or sample name)")
    model = doc.get("model", "auto")
    if not isinstance(model, str):
        exit_error("`model:` must be a string")
    outputs = doc.get("outputs") or []
    if not isinstance(outputs, list):
        exit_error("`outputs:` must be a list of {kind, out, ...} mappings")
    return input_value, model, outputs


@app.command(
    "run-from",
    epilog=examples_epilog(
        "  vdl workflow init /tmp/run1 && vdl workflow run-from /tmp/run1/analysis.yaml",
        "  vdl workflow run-from my-pipeline.yaml",
        "  # no --sample: this command takes a YAML config that already names its INPUT.",
    ),
)
def cmd_run_from(
    config: Annotated[Path, typer.Argument(help="YAML config file")],
) -> None:
    """Execute every step described in a YAML config.

    Loads a `version: 1` YAML mapping with `input:`, optional `model:`,
    and an `outputs:` list of `{kind, out, ...}` entries. Each entry is
    dispatched to the corresponding render / export / report writer.
    See `vdl workflow init` for a starter config you can edit.
    """
    input_value, model, outputs = _parse_config(config)

    try:
        ds = load_input(input_value)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))

    total = len(outputs)
    for i, entry in enumerate(outputs, start=1):
        if not isinstance(entry, dict):
            exit_error(f"output #{i} is not a mapping")
        kind = entry.get("kind")
        out = entry.get("out")
        if kind not in _KNOWN_KINDS or not isinstance(out, str):
            exit_error(f"output #{i}: unknown kind {kind!r} or missing `out`")
        typer.echo(f"[{i}/{total}] {kind} -> {out}")
        _execute_output(entry, ds, result)
    typer.echo("done.")
