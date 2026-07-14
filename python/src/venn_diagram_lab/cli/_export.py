"""`vdl export ...` subapp — TSV table writers."""

from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated

import typer

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.cli._common import (
    STDOUT_SENTINEL,
    AlphabeticalGroup,
    examples_epilog,
    exit_error,
    load_input,
    resolve_out,
    resolve_sample_or_input,
    write_text_out,
)
from venn_diagram_lab.errors import VennDiagramError

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Export TSV tables (region summary, matrix, statistics, pairwise, one-vs-rest).",
    cls=AlphabeticalGroup,
)


def _emit(
    resolved: str,
    kind: str,
    out: Path | None,
    writer_method: str,
    model: str,
    ext: str = "tsv",
) -> None:
    """Common write/stdout dispatch for the export commands."""
    try:
        ds = load_input(resolved)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    target = resolve_out(out, resolved, kind, ext)
    if target is STDOUT_SENTINEL:
        # Route through the writer so TSV/JSON escape / sort-order / line-ending
        # logic stays identical to a direct file write. `delete=False` + manual
        # cleanup is required on Windows because the default `delete=True` holds
        # an exclusive handle and the writer can't re-open the path
        # (PermissionError 13). POSIX is unaffected — cleanup in the finally.
        tf = NamedTemporaryFile("w", suffix=f".{ext}", delete=False, encoding="utf-8")
        tmp_path = Path(tf.name)
        tf.close()
        try:
            getattr(result, writer_method)(tmp_path)
            content = tmp_path.read_text(encoding="utf-8")
        finally:
            tmp_path.unlink(missing_ok=True)
        write_text_out(target, content)
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    getattr(result, writer_method)(target)
    typer.echo(f"Wrote {target}")


@app.command(
    "region-summary",
    epilog=examples_epilog(
        "  vdl export region-summary --sample                                     # demo run",
        "  vdl export region-summary dataset_real_cancer_drivers_4 --out /tmp/r.tsv",
        "  vdl export region-summary data/my.tsv --out -                          # stdout",
    ),
)
def cmd_region_summary(
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
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Write the per-region exclusive + inclusive counts TSV.

    One row per non-empty subset of the input sets, with the bitmask
    label (e.g. `A_B_C`), the exclusive count (items only in that
    intersection), and the inclusive count (items in that intersection
    or any superset). Matches the webtool's Region Summary export.
    """
    resolved = resolve_sample_or_input(input, sample)
    _emit(resolved, "region-summary", out, "to_region_summary_tsv", model)


@app.command(
    "matrix",
    epilog=examples_epilog(
        "  vdl export matrix --sample                                             # demo run",
        "  vdl export matrix dataset_real_cancer_drivers_4 --out /tmp/m.tsv",
        "  vdl export matrix data/my.tsv --out -                                  # stdout",
    ),
)
def cmd_matrix(
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
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Write the binary item-by-set membership matrix TSV.

    One row per item, one column per set, with 0/1 values indicating
    membership. This is the canonical wide-form representation used by
    downstream tools (R `vennDiagramLab::read_binary_tsv()`, pandas,
    etc.) and matches the webtool's Item Matrix export.
    """
    resolved = resolve_sample_or_input(input, sample)
    _emit(resolved, "matrix", out, "to_matrix_tsv", model)


@app.command(
    "statistics",
    epilog=examples_epilog(
        "  vdl export statistics --sample                                         # demo run",
        "  vdl export statistics dataset_real_cancer_drivers_4 --out /tmp/s.tsv",
        "  vdl export statistics data/my.tsv --out -                              # stdout",
    ),
)
def cmd_statistics(
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
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Write the pairwise statistics TSV (Jaccard / Dice / OC / FE / FDR).

    For each ordered pair of input sets, computes Jaccard similarity,
    Dice coefficient, Szymkiewicz-Simpson overlap coefficient (OC),
    hypergeometric fold-enrichment (FE), a one-sided p-value, and the
    Benjamini-Hochberg adjusted FDR. Same statistics the webtool's
    Statistics panel reports.
    """
    resolved = resolve_sample_or_input(input, sample)
    _emit(resolved, "statistics", out, "to_statistics_tsv", model)


@app.command(
    "one-vs-rest",
    epilog=examples_epilog(
        "  vdl export one-vs-rest --sample                                        # demo run",
        "  vdl export one-vs-rest dataset_real_cancer_drivers_4 --out /tmp/ovr.tsv",
        "  vdl export one-vs-rest data/my.tsv --out -                             # stdout",
    ),
)
def cmd_one_vs_rest(
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
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Write the one-vs-rest enrichment TSV (each set vs. the union of the rest).

    For each input set S, tests whether S's members overlap the union of all
    OTHER sets more than expected by chance, via the same hypergeometric
    machinery as `statistics`. Reports size, rest-size, intersection, expected
    count, fold-enrichment, a one-sided p-value, and the Benjamini-Hochberg
    adjusted FDR (m = number of sets). Matches the webtool's
    "Enrichment: one-vs-rest" export.
    """
    resolved = resolve_sample_or_input(input, sample)
    _emit(resolved, "one-vs-rest", out, "to_one_vs_rest_tsv", model)


@app.command(
    "json",
    epilog=examples_epilog(
        "  vdl export json --sample                                               # demo run",
        "  vdl export json dataset_real_cancer_drivers_4 --out /tmp/r.json",
        "  vdl export json data/my.tsv --out -                                    # stdout",
    ),
)
def cmd_json(
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
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Write the full Venn result + statistics as a single JSON document.

    Bundles the model id, set names, universe size, every non-empty region
    (with exclusive/inclusive counts and exclusive items), single-set sizes,
    and the pairwise statistics array (Jaccard / Dice / OC / FE / p-value /
    FDR / Bonferroni / two-sided). Matches the webtool's "Full Result (JSON)"
    export byte-for-byte.
    """
    resolved = resolve_sample_or_input(input, sample)
    _emit(resolved, "result", out, "to_json", model, ext="json")


@app.command(
    "pairwise",
    epilog=examples_epilog(
        "  vdl export pairwise --sample                                           # demo run",
        "  vdl export pairwise dataset_real_cancer_drivers_4 --out /tmp/p.tsv",
        "  vdl export pairwise data/my.tsv --out -                                # stdout",
    ),
)
def cmd_pairwise(
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
    out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Alias of `statistics`. Common synonym in the bioinformatics literature.

    Produces a byte-identical output to `vdl export statistics`. Kept
    so users coming from tools that say "pairwise" (e.g. `pwcomp`,
    `pairwise-overlap.py`) find a familiar verb.
    """
    resolved = resolve_sample_or_input(input, sample)
    _emit(resolved, "statistics", out, "to_statistics_tsv", model)
