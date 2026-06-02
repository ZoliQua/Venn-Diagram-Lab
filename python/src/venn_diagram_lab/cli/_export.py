"""`vdl export ...` subapp — TSV exports."""

from __future__ import annotations

import typer

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Export TSV tables (region summary, matrix, statistics, pairwise).",
)
