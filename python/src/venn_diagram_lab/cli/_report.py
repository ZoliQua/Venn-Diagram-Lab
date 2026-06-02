"""`vdl report ...` subapp — multi-page reports."""

from __future__ import annotations

import typer

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Generate multi-page reports (PDF / ZIP bundle).",
)
