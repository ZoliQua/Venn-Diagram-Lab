"""`vdl model ...` subapp — list/info/svg for bundled Venn templates."""

from __future__ import annotations

from importlib import resources
from pathlib import Path
from typing import Annotated

import typer

from venn_diagram_lab.analysis import list_models
from venn_diagram_lab.cli._common import (
    AlphabeticalGroup,
    examples_epilog,
    exit_error,
)

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Inspect bundled Venn diagram models (list, info, svg).",
    cls=AlphabeticalGroup,
)


# Ordered (substring, label) pairs; first match wins. The plain "-set" suffix
# is detected separately because it requires a suffix test, not a substring test.
_GEOMETRY_KEYWORDS: tuple[tuple[str, str], ...] = (
    ("euler", "Euler"),
    ("edwards", "Edwards"),
    ("anderson", "Anderson"),
    ("carroll", "Carroll"),
    ("grunbaum", "Grunbaum"),
    ("bannier", "Bannier-Bodin"),
    ("bodin", "Bannier-Bodin"),
    ("mamakani", "Mamakani rosette"),
    ("rosette", "Mamakani rosette"),
    ("sumo", "SUMO-Venn"),
)


def _geometry_hint(name: str) -> str:
    """Best-effort geometry label inferred from the model name."""
    if name.endswith("-set"):
        return "circle"
    for keyword, label in _GEOMETRY_KEYWORDS:
        if keyword in name:
            return label
    return "non-circle"


@app.command(
    "list",
    epilog=examples_epilog("  vdl model list    # no sample data needed"),
)
def cmd_list() -> None:
    """List bundled model names, one per line.

    Plain-text stream suitable for shell pipelines. The same catalog
    is available as a Rich table via the top-level `vdl list-models`,
    or with metadata via `vdl model info <name>`.
    """
    for m in sorted(list_models(), key=lambda x: x.name):
        typer.echo(m.name)


@app.command(
    "info",
    epilog=examples_epilog(
        "  vdl model info venn-3-set",
        "  vdl model info venn-5a-set-edwards",
        "  # no --sample: this command takes a model name, not a dataset.",
    ),
)
def cmd_info(name: Annotated[str, typer.Argument()]) -> None:
    """Print details about a specific bundled model.

    Shows the canonical name, set count, human-readable display name,
    and a best-effort geometry hint (circle / Edwards / Euler /
    Mamakani rosette / etc.). Useful before choosing `--model` for
    a render or report command.
    """
    catalog = {m.name: m for m in list_models()}
    if name not in catalog:
        exit_error(f"unknown model {name!r}; try `vdl model list`")
    m = catalog[name]
    typer.echo(f"name:         {m.name}")
    typer.echo(f"sets:         {m.set_count}")
    typer.echo(f"display_name: {m.display_name}")
    typer.echo(f"geometry:     {_geometry_hint(m.name)}")


@app.command(
    "svg",
    epilog=examples_epilog(
        "  vdl model svg venn-3-set --out /tmp/venn3.svg",
        "  vdl model svg venn-5a-set-edwards",
        "  # no --sample: this command takes a model name, not a dataset.",
    ),
)
def cmd_svg(
    name: Annotated[str, typer.Argument()],
    out: Annotated[
        Path | None,
        typer.Option("--out", "-o", help="Destination path; default: <name>.svg in CWD"),
    ] = None,
) -> None:
    """Write the raw bundled SVG template (no result substitution).

    Copies the model's SVG template byte-for-byte to `--out` (or
    `<name>.svg` in the current directory). The template still
    contains placeholder count IDs (`Count_A`, `Count_AB`, ...) — to
    fill them with real values, use `vdl render venn` instead.
    """
    available = {m.name for m in list_models()}
    if name not in available:
        exit_error(f"unknown model {name!r}; try `vdl model list`")
    pkg_root = resources.files("venn_diagram_lab")
    src = Path(str(pkg_root)) / "_data" / "models" / "svg" / f"{name}.svg"
    if not src.is_file():
        exit_error(f"model SVG not found on disk: {src}")
    target = out if out is not None else Path.cwd() / f"{name}.svg"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(src.read_text(encoding="utf-8"), encoding="utf-8", newline="")
    typer.echo(f"Wrote {target}")
