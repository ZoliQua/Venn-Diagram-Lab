"""`vdl data ...` subapp — validate, describe, convert, fit-model, samples."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Any

import typer

from venn_diagram_lab.analysis import analyze, list_models
from venn_diagram_lab.cli._common import exit_error, load_input
from venn_diagram_lab.errors import VennDiagramError
from venn_diagram_lab.samples import list_samples

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Data operations (validate, describe, convert, fit-model, samples).",
)

# Thresholds for fit-model recommendations.
_MAX_CIRCLES_SETS = 3
_EULER_SETS = 4
_MAX_EDWARDS_SETS = 6


def _items_total(ds: Any) -> int:
    """Return the total item count across all sets (universe size)."""
    if not hasattr(ds, "items"):
        return 0
    seen: set[str] = set()
    for items in ds.items.values():
        seen.update(items)
    return len(seen)


@app.command("validate")
def cmd_validate(  # noqa: PLR0912 - flat validation pipeline reads better than nested helpers
    input: Annotated[str, typer.Argument()],
    *,
    text: Annotated[
        bool, typer.Option("--text", help="Human-readable output instead of JSON")
    ] = False,
    strict: Annotated[
        bool, typer.Option("--strict", help="Promote warnings to errors")
    ] = False,
) -> None:
    """Validate a dataset's schema and contents (JSON output by default)."""
    doc: dict[str, Any] = {
        "input": input,
        "sets": [],
        "item_count": 0,
        "errors": [],
        "warnings": [],
        "info": [],
        "exit_code": 0,
    }
    try:
        ds = load_input(input)
    except (VennDiagramError, OSError, typer.Exit):
        doc["errors"].append(
            {"kind": "load-failed", "message": f"Could not load {input}"}
        )
        doc["exit_code"] = 1
    else:
        doc["sets"] = list(ds.set_names)
        doc["item_count"] = _items_total(ds)
        if hasattr(ds, "items"):
            for set_name, items in ds.items.items():
                doc["info"].append(
                    {"kind": "set-size", "set": set_name, "count": len(items)}
                )

    if strict and doc["warnings"]:
        doc["errors"].extend(doc["warnings"])
        doc["warnings"] = []
    if doc["errors"]:
        doc["exit_code"] = 1

    if text:
        typer.echo(f"input:  {doc['input']}")
        typer.echo(f"sets:   {doc['sets']}")
        typer.echo(f"items:  {doc['item_count']}")
        if doc["errors"]:
            typer.secho("errors:", fg=typer.colors.RED)
            for e in doc["errors"]:
                typer.echo(f"  {e}")
        else:
            typer.secho("no errors", fg=typer.colors.GREEN)
        if doc["warnings"]:
            typer.secho("warnings:", fg=typer.colors.YELLOW)
            for w in doc["warnings"]:
                typer.echo(f"  {w}")
    else:
        typer.echo(json.dumps(doc, indent=2))
    if doc["exit_code"] != 0:
        raise typer.Exit(code=doc["exit_code"])


@app.command("describe")
def cmd_describe(
    input: Annotated[str, typer.Argument()],
    *,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Print a quick summary (set sizes, top regions, model)."""
    try:
        ds = load_input(input)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
        return  # mypy hint; exit_error raises
    typer.echo(f"sets:   {ds.set_names}")
    typer.echo(f"items:  {_items_total(ds)}")
    typer.echo(f"model:  {model}")
    sorted_regions = sorted(
        result.regions.values(),
        key=lambda r: r.exclusive_count,
        reverse=True,
    )[:5]
    typer.echo("top regions by exclusive count:")
    for r in sorted_regions:
        typer.echo(f"  {r.label:10s}  {r.exclusive_count}")


@app.command("convert")
def cmd_convert(
    input: Annotated[Path, typer.Argument(help="Input file path")],
    output: Annotated[
        Path, typer.Argument(help="Output file path; format from extension")
    ],
) -> None:
    """Convert between TSV and CSV formats."""
    if not input.is_file():
        exit_error(f"input file not found: {input}")
    in_ext = input.suffix.lstrip(".").lower()
    out_ext = output.suffix.lstrip(".").lower()
    if in_ext not in {"tsv", "csv"} or out_ext not in {"tsv", "csv"}:
        exit_error(
            "this iteration supports TSV <-> CSV only; GMT/GMX coming in a follow-up. "
            f"got in={in_ext!r}, out={out_ext!r}"
        )
    in_sep = "\t" if in_ext == "tsv" else ","
    out_sep = "\t" if out_ext == "tsv" else ","
    text = input.read_text(encoding="utf-8")
    converted = (
        "\n".join(out_sep.join(row.split(in_sep)) for row in text.splitlines()) + "\n"
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(converted, encoding="utf-8", newline="")
    typer.echo(f"Wrote {output}")


@app.command("fit-model")
def cmd_fit_model(input: Annotated[str, typer.Argument()]) -> None:
    """Recommend a model name for the dataset's set count."""
    try:
        ds = load_input(input)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
        return  # mypy hint; exit_error raises
    n = len(ds.set_names)
    catalog = sorted(m.name for m in list_models())
    # Set-count-aware filter: match `-N`, `-Na`, `-Nb`, `-Ne`, `-Nf` only.
    candidates_for_n = [
        name
        for name in catalog
        if f"-{n}-" in name
        or f"-{n}a" in name
        or f"-{n}b" in name
        or f"-{n}c" in name
        or f"-{n}d" in name
        or f"-{n}e" in name
        or f"-{n}f" in name
    ]
    # Try the heuristic-canonical name first.
    if n <= _MAX_CIRCLES_SETS:
        heuristic = f"venn-{n}-set"
    elif n == _EULER_SETS:
        heuristic = "venn-4e-set-euler"
    else:
        heuristic = f"venn-{n}a-set-edwards"
    catalog_set = set(catalog)
    if heuristic in catalog_set:
        suggestion = heuristic
    elif candidates_for_n:
        suggestion = candidates_for_n[0]
    elif catalog:
        suggestion = catalog[0]
    else:
        suggestion = ""
    typer.echo(f"suggested model: {suggestion}")
    typer.echo(f"available models for N={n}: {candidates_for_n}")


@app.command("samples")
def cmd_samples() -> None:
    """List bundled sample datasets."""
    for s in sorted(list_samples()):
        typer.echo(s)
