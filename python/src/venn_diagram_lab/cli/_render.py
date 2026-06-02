"""`vdl render ...` subapp — visual outputs."""

from __future__ import annotations

import typer

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Render visual outputs (Venn / UpSet / Network / Heatmap / Histogram).",
)
