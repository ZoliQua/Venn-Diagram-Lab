"""`vdl data ...` subapp — validate, describe, convert, fit-model, samples."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Any

import typer

from venn_diagram_lab.analysis import analyze, list_models
from venn_diagram_lab.cli._common import (
    AlphabeticalGroup,
    examples_epilog,
    exit_error,
    load_input,
    resolve_sample_or_input,
)
from venn_diagram_lab.errors import VennDiagramError
from venn_diagram_lab.samples import list_samples

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Data operations (validate, describe, convert, fit-model, samples).",
    cls=AlphabeticalGroup,
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


@app.command(
    "validate",
    epilog=examples_epilog(
        "  vdl data validate --sample                                             # demo run",
        "  vdl data validate dataset_real_cancer_drivers_4 --text",
        "  vdl data validate data/my.tsv --strict",
    ),
)
def cmd_validate(  # noqa: PLR0912 - flat validation pipeline reads better than nested helpers
    input: Annotated[
        str | None,
        typer.Argument(
            help="Dataset path or bundled sample name. Optional when --sample is given.",
        ),
    ] = None,
    *,
    sample: Annotated[
        bool,
        typer.Option(
            "--sample",
            help="Run with the bundled cancer-drivers sample (overrides INPUT default).",
        ),
    ] = False,
    text: Annotated[
        bool, typer.Option("--text", help="Human-readable output instead of JSON")
    ] = False,
    strict: Annotated[
        bool, typer.Option("--strict", help="Promote warnings to errors")
    ] = False,
) -> None:
    """Validate a dataset's schema and contents.

    Loads the file, checks the schema (set names present, items
    parseable, no impossible cardinalities), and reports findings as
    structured JSON by default or human-readable text with `--text`.
    With `--strict`, warnings are promoted to errors so the command
    exits non-zero in CI pipelines.
    """
    resolved = resolve_sample_or_input(input, sample)
    doc: dict[str, Any] = {
        "input": resolved,
        "sets": [],
        "item_count": 0,
        "errors": [],
        "warnings": [],
        "info": [],
        "exit_code": 0,
    }
    try:
        ds = load_input(resolved)
    except (VennDiagramError, OSError, typer.Exit):
        doc["errors"].append(
            {"kind": "load-failed", "message": f"Could not load {resolved}"}
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


@app.command(
    "describe",
    epilog=examples_epilog(
        "  vdl data describe --sample                                             # demo run",
        "  vdl data describe dataset_real_cancer_drivers_4",
        "  vdl data describe data/my.tsv --model proportional",
    ),
)
def cmd_describe(
    input: Annotated[
        str | None,
        typer.Argument(
            help="Dataset path or bundled sample name. Optional when --sample is given.",
        ),
    ] = None,
    *,
    sample: Annotated[
        bool,
        typer.Option(
            "--sample",
            help="Run with the bundled cancer-drivers sample (overrides INPUT default).",
        ),
    ] = False,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Print a quick text summary of the dataset.

    Loads the data, runs `analyze()` with the chosen model, and prints
    set names, total item count (universe size), the resolved model,
    and the top 5 regions by exclusive-item count. Use this as a fast
    sanity check before kicking off a full report.
    """
    resolved = resolve_sample_or_input(input, sample)
    try:
        ds = load_input(resolved)
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


@app.command(
    "convert",
    epilog=examples_epilog(
        "  vdl data convert data/in.tsv data/out.csv",
        "  vdl data convert data/in.csv data/out.tsv",
        "  # no --sample: this command takes two explicit file paths.",
    ),
)
def cmd_convert(
    input: Annotated[Path, typer.Argument(help="Input file path")],
    output: Annotated[
        Path, typer.Argument(help="Output file path; format from extension")
    ],
) -> None:
    """Convert between TSV and CSV formats.

    Reads `input`, swaps the field separator based on its extension
    (`.tsv` <-> `.csv`), and writes the result to `output`. This is a
    pure delimiter swap with no schema reinterpretation. GMT and GMX
    support is planned for a follow-up release.
    """
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


@app.command(
    "fit-model",
    epilog=examples_epilog(
        "  vdl data fit-model --sample                                            # demo run",
        "  vdl data fit-model dataset_real_cancer_drivers_4",
        "  vdl data fit-model data/my.tsv",
    ),
)
def cmd_fit_model(
    input: Annotated[
        str | None,
        typer.Argument(
            help="Dataset path or bundled sample name. Optional when --sample is given.",
        ),
    ] = None,
    *,
    sample: Annotated[
        bool,
        typer.Option(
            "--sample",
            help="Run with the bundled cancer-drivers sample (overrides INPUT default).",
        ),
    ] = False,
) -> None:
    """Recommend a model name for the dataset's set count.

    Inspects the dataset's set count N and prints (a) a single
    heuristic-canonical model suggestion (circles for N<=3, Euler for
    N=4, Edwards for N>=5), and (b) the full list of bundled models
    that support exactly N sets. Useful before passing `--model` to
    a render or report command.
    """
    resolved = resolve_sample_or_input(input, sample)
    try:
        ds = load_input(resolved)
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


@app.command(
    "samples",
    epilog=examples_epilog("  vdl data samples    # no sample data needed"),
)
def cmd_samples() -> None:
    """List bundled sample datasets (plain-text, one per line).

    Same registry as `vdl list-samples`, but emitted as a plain stream
    suitable for shell pipelines (`xargs`, `for s in $(vdl data
    samples); do ...; done`). Use the top-level `vdl list-samples` for
    a Rich-formatted table.
    """
    for s in sorted(list_samples()):
        typer.echo(s)
