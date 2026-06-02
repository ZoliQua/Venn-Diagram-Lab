"""Command-line interface for venn-diagram-lab.

Entry point declared in pyproject.toml: vdl = "venn_diagram_lab.cli:app".
"""

from __future__ import annotations

from pathlib import Path
from typing import Annotated, Literal

import typer
from rich.console import Console
from rich.table import Table

from venn_diagram_lab.analysis import RegionResult, analyze, list_models
from venn_diagram_lab.errors import VennDiagramError
from venn_diagram_lab.io import Dataset, load_csv, load_gmt, load_gmx, load_tsv
from venn_diagram_lab.samples import list_samples, load_sample
from venn_diagram_lab.version import __version__

ModeLiteral = Literal["binary", "aggregated"]
FormatLiteral = Literal["csv", "tsv", "gmt", "gmx"]

app = typer.Typer(
    name="vdl",
    help="venn-diagram-lab - headless Venn diagram analysis and rendering.",
    no_args_is_help=True,
)

_console = Console()

# Subapp registrations.
from venn_diagram_lab.cli import (  # noqa: E402
    _data,
    _export,
    _model,
    _render,
    _report,
    _stats,  # noqa: F401  # registered via decorator in Phase 7
    _workflow,
)

app.add_typer(_render.app, name="render")
app.add_typer(_export.app, name="export")
app.add_typer(_report.app, name="report")
app.add_typer(_data.app, name="data")
app.add_typer(_model.app, name="model")
app.add_typer(_workflow.app, name="workflow")


@app.callback()
def _main() -> None:
    """venn-diagram-lab CLI."""


@app.command()
def version() -> None:
    """Print the venn-diagram-lab package version."""
    typer.echo(__version__)


@app.command("list-models")
def cmd_list_models() -> None:
    """List all bundled Venn diagram models."""
    table = Table(title="Bundled models")
    table.add_column("Name", style="cyan")
    table.add_column("Sets", justify="right")
    table.add_column("Display name")

    for m in list_models():
        table.add_row(m.name, str(m.set_count), m.display_name)

    _console.print(table)


@app.command("list-samples")
def cmd_list_samples() -> None:
    """List bundled sample datasets."""
    table = Table(title="Bundled sample datasets")
    table.add_column("Name", style="cyan")

    for name in list_samples():
        table.add_row(name)

    _console.print(table)


def _load_dataset(
    input_path: Path,
    *,
    format_override: FormatLiteral | None,
    mode: ModeLiteral,
) -> Dataset:
    """Load a dataset based on the file extension or explicit format override."""
    fmt: FormatLiteral
    if format_override is not None:
        fmt = format_override
    else:
        ext = input_path.suffix.lower()
        if ext == ".csv":
            fmt = "csv"
        elif ext in {".tsv", ".txt"}:
            fmt = "tsv"
        elif ext == ".gmt":
            fmt = "gmt"
        elif ext == ".gmx":
            fmt = "gmx"
        else:
            raise typer.BadParameter(
                f"Cannot detect format from extension {ext!r}. "
                "Use --format to override (csv|tsv|gmt|gmx)."
            )

    binary = mode == "binary"
    if fmt == "csv":
        return load_csv(input_path, binary=binary)
    if fmt == "tsv":
        return load_tsv(input_path, binary=binary)
    if fmt == "gmt":
        return load_gmt(input_path)
    return load_gmx(input_path)


def _print_summary(result: RegionResult) -> None:
    """Print a quick text summary of the analysis result."""
    table = Table(title="Analysis Summary")
    table.add_column("Set", style="cyan")
    table.add_column("Size", justify="right")
    for name in result.dataset.set_names:
        table.add_row(name, str(result.set_sizes[name]))
    _console.print(table)
    universe = result.effective_universe()
    _console.print(f"Model: [bold]{result.model}[/]")
    _console.print(f"Sets: {len(result.dataset.set_names)}")
    _console.print(f"Universe: {universe} items in {len(result.regions)} non-empty regions")


def _resolve_output_paths(
    output_dir: Path,
    venn: Path | None,
    upset: Path | None,
    network: Path | None,
    pdf: Path | None,
    statistics_tsv: Path | None,
) -> tuple[Path, Path, Path, Path, Path]:
    """Expand None output paths to default names inside *output_dir*."""
    output_dir.mkdir(parents=True, exist_ok=True)
    return (
        venn if venn is not None else output_dir / "venn.svg",
        upset if upset is not None else output_dir / "upset.png",
        network if network is not None else output_dir / "network.png",
        pdf if pdf is not None else output_dir / "report.pdf",
        statistics_tsv if statistics_tsv is not None else output_dir / "statistics.tsv",
    )


def _write_outputs(
    result: RegionResult,
    venn: Path | None,
    upset: Path | None,
    network: Path | None,
    pdf: Path | None,
    statistics_tsv: Path | None,
) -> None:
    """Write all requested output files; raises Exit(1) on VennDiagramError."""
    try:
        if venn is not None:
            result.render_venn().save(venn)
            typer.echo(f"wrote {venn}")
        if upset is not None:
            img = result.render_upset()
            img.save(upset)
            import matplotlib.pyplot as plt  # noqa: PLC0415  - heavy import only when used
            plt.close(img.fig)
            typer.echo(f"wrote {upset}")
        if network is not None:
            img = result.render_network()
            img.save(network)
            import matplotlib.pyplot as plt  # noqa: PLC0415  - heavy import only when used
            plt.close(img.fig)
            typer.echo(f"wrote {network}")
        if pdf is not None:
            result.to_pdf_report(pdf)
            typer.echo(f"wrote {pdf}")
        if statistics_tsv is not None:
            result.to_statistics_tsv(statistics_tsv)
            typer.echo(f"wrote {statistics_tsv}")
    except (VennDiagramError, OSError) as e:
        typer.secho(f"error: {e}", fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1) from None


def _emit_outputs(
    result: RegionResult,
    *,
    output_dir: Path | None,
    venn: Path | None,
    upset: Path | None,
    network: Path | None,
    pdf: Path | None,
    statistics_tsv: Path | None,
) -> None:
    """Shared output dispatcher for `analyze` and `render-sample` commands."""
    if output_dir is not None:
        venn, upset, network, pdf, statistics_tsv = _resolve_output_paths(
            output_dir, venn, upset, network, pdf, statistics_tsv
        )

    any_output = any(p is not None for p in (venn, upset, network, pdf, statistics_tsv))
    if not any_output:
        _print_summary(result)
        return

    _write_outputs(result, venn, upset, network, pdf, statistics_tsv)


@app.command("analyze")
def cmd_analyze(
    input: Annotated[Path, typer.Argument(help="Input dataset path (CSV/TSV/GMT/GMX)")],
    *,
    model: Annotated[
        str, typer.Option(help="Model name; 'auto' or 'proportional'")
    ] = "auto",
    mode: Annotated[
        ModeLiteral, typer.Option(help="Binary or aggregated mode")
    ] = "binary",
    format: Annotated[
        FormatLiteral | None, typer.Option(help="Override format auto-detection")
    ] = None,
    output_dir: Annotated[
        Path | None, typer.Option("--output-dir", help="Write full output bundle to this directory")
    ] = None,
    venn: Annotated[
        Path | None, typer.Option(help="Write Venn diagram (.svg/.png/.pdf)")
    ] = None,
    upset: Annotated[
        Path | None, typer.Option(help="Write UpSet plot (.png/.pdf/.svg)")
    ] = None,
    network: Annotated[
        Path | None, typer.Option(help="Write Network plot (.png/.pdf/.svg)")
    ] = None,
    pdf: Annotated[
        Path | None, typer.Option(help="Write multi-page PDF report")
    ] = None,
    statistics_tsv: Annotated[
        Path | None, typer.Option("--statistics-tsv", help="Write pairwise statistics as TSV")
    ] = None,
) -> None:
    """Analyze a dataset and write outputs (or print summary if none specified)."""
    try:
        dataset = _load_dataset(input, format_override=format, mode=mode)
        result = analyze(dataset, model=model)
    except (VennDiagramError, OSError) as e:
        typer.secho(f"error: {e}", fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1) from None

    _emit_outputs(
        result,
        output_dir=output_dir,
        venn=venn, upset=upset, network=network, pdf=pdf,
        statistics_tsv=statistics_tsv,
    )


@app.command("render-sample")
def cmd_render_sample(
    name: Annotated[str, typer.Argument(help="Sample name (use `vdl list-samples`)")],
    *,
    model: Annotated[
        str, typer.Option(help="Model name; 'auto' or 'proportional'")
    ] = "auto",
    output_dir: Annotated[
        Path | None, typer.Option("--output-dir", help="Write full output bundle")
    ] = None,
    venn: Annotated[Path | None, typer.Option(help="Write Venn diagram")] = None,
    upset: Annotated[Path | None, typer.Option(help="Write UpSet plot")] = None,
    network: Annotated[Path | None, typer.Option(help="Write Network plot")] = None,
    pdf: Annotated[Path | None, typer.Option(help="Write multi-page PDF report")] = None,
    statistics_tsv: Annotated[
        Path | None, typer.Option("--statistics-tsv", help="Write pairwise statistics as TSV")
    ] = None,
) -> None:
    """Analyze a bundled sample dataset and write outputs."""
    try:
        dataset = load_sample(name)
    except KeyError as e:
        typer.secho(f"error: {e}", fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1) from None

    try:
        result = analyze(dataset, model=model)
    except (VennDiagramError, OSError) as e:
        typer.secho(f"error: {e}", fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1) from None

    _emit_outputs(
        result,
        output_dir=output_dir,
        venn=venn, upset=upset, network=network, pdf=pdf,
        statistics_tsv=statistics_tsv,
    )
