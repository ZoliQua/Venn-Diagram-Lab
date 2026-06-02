"""`vdl report ...` subapp — multi-page PDF + ZIP bundle reports."""

from __future__ import annotations

import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Annotated

import typer

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.cli._common import exit_error, load_input, resolve_out
from venn_diagram_lab.errors import VennDiagramError
from venn_diagram_lab.render.network import render_network
from venn_diagram_lab.render.svg import (
    render_share_distribution_svg,
    render_venn_svg,
)
from venn_diagram_lab.render.upset import render_upset

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Generate multi-page reports (PDF / ZIP bundle).",
)


@app.command("pdf")
def cmd_pdf(
    input: Annotated[str, typer.Argument()],
    *,
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Write the multi-page PDF report (mirrors the webtool's Report PDF)."""
    try:
        ds = load_input(input)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    target = resolve_out(out, input, "report", "pdf")
    target.parent.mkdir(parents=True, exist_ok=True)
    result.to_pdf_report(target)
    typer.echo(f"Wrote {target}")


@app.command("zip")
def cmd_zip(
    input: Annotated[str, typer.Argument()],
    *,
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Write the Full Report ZIP bundle (PDF + TSVs + SVGs)."""
    try:
        ds = load_input(input)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    target = resolve_out(out, input, "report", "zip")
    target.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory() as td:
        tdp = Path(td)
        # SVGs
        render_venn_svg(result).save(tdp / "venn.svg")
        render_upset(result).save(tdp / "upset.svg")
        render_network(result).save(tdp / "network.svg")
        render_share_distribution_svg(ds).save(tdp / "share-dist.svg")
        # TSVs
        result.to_region_summary_tsv(tdp / "regions_summary.tsv")
        result.to_matrix_tsv(tdp / "items_matrix.tsv")
        result.to_statistics_tsv(tdp / "statistics.tsv")
        # PDF
        result.to_pdf_report(tdp / "report.pdf")
        # Bundle
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in sorted(tdp.iterdir()):
                zf.write(f, arcname=f.name)
    typer.echo(f"Wrote {target}")
