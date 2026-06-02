"""`vdl stats ...` subapp — v2.2.2 statistics shortcuts."""

from __future__ import annotations

import typer

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="v2.2.2 statistics shortcuts (share-dist, cluster).",
)
