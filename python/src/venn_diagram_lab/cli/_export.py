"""`vdl export ...` subapp — TSV table writers."""

from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated

import typer

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.cli._common import (
    STDOUT_SENTINEL,
    exit_error,
    load_input,
    resolve_out,
    write_text_out,
)
from venn_diagram_lab.errors import VennDiagramError

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Export TSV tables (region summary, matrix, statistics, pairwise).",
)


def _emit(
    input: str,
    kind: str,
    out: Path | None,
    writer_method: str,
    model: str,
) -> None:
    """Common write/stdout dispatch for the 4 export commands."""
    try:
        ds = load_input(input)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    target = resolve_out(out, input, kind, "tsv")
    if target is STDOUT_SENTINEL:
        # Route through the writer so TSV escape / sort-order / line-ending logic
        # stays identical to a direct file write.
        with NamedTemporaryFile("w+", suffix=".tsv", delete=True, encoding="utf-8") as tf:
            tmp_path = Path(tf.name)
            getattr(result, writer_method)(tmp_path)
            content = tmp_path.read_text(encoding="utf-8")
        write_text_out(target, content)
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    getattr(result, writer_method)(target)
    typer.echo(f"Wrote {target}")


@app.command("region-summary")
def cmd_region_summary(
    input: Annotated[str, typer.Argument()],
    *,
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Write the per-region exclusive + inclusive counts TSV."""
    _emit(input, "region-summary", out, "to_region_summary_tsv", model)


@app.command("matrix")
def cmd_matrix(
    input: Annotated[str, typer.Argument()],
    *,
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Write the binary item x set membership matrix TSV."""
    _emit(input, "matrix", out, "to_matrix_tsv", model)


@app.command("statistics")
def cmd_statistics(
    input: Annotated[str, typer.Argument()],
    *,
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Write the pairwise statistics TSV (Jaccard / Dice / OC / FE / FDR)."""
    _emit(input, "statistics", out, "to_statistics_tsv", model)


@app.command("pairwise")
def cmd_pairwise(
    input: Annotated[str, typer.Argument()],
    *,
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Alias of `statistics`. Common synonym in the bioinformatics literature."""
    _emit(input, "statistics", out, "to_statistics_tsv", model)
