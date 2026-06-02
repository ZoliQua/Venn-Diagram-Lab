"""`vdl workflow ...` subapp — project workflow helpers."""

from __future__ import annotations

import typer

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Project workflow helpers (init, bench, run-from config).",
)
