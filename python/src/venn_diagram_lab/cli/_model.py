"""`vdl model ...` subapp — bundled model inspection."""

from __future__ import annotations

import typer

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Inspect bundled Venn diagram models (list, info, svg).",
)
