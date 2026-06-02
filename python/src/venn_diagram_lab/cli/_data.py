"""`vdl data ...` subapp — data operations."""

from __future__ import annotations

import typer

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Data operations (validate, describe, convert, fit-model, samples).",
)
