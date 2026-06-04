"""`vdl render ...` subapp — visual outputs."""

from __future__ import annotations

from pathlib import Path
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
    stem_for,
    write_text_out,
)
from venn_diagram_lab.errors import VennDiagramError

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Render visual outputs (Venn / UpSet / Network / Heatmap / Histogram).",
    cls=AlphabeticalGroup,
)


# ---- helpers ---------------------------------------------------------------


def _save_or_stream(img: object, target: Path, dry_run: bool, kind: str) -> None:
    """Common save / stdout-stream / dry-run dispatch."""
    if dry_run:
        typer.echo(f"[dry-run] would write {target}")
        return
    if target is STDOUT_SENTINEL:
        raw = getattr(img, "content", None) or getattr(img, "svg", None) or str(img)
        write_text_out(target, str(raw))
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    save = img.save  # type: ignore[attr-defined]
    save(target)
    typer.echo(f"Wrote {target}")


# ---- venn ------------------------------------------------------------------


@app.command(
    "venn",
    epilog=examples_epilog(
        "  vdl render venn --sample                                            # demo run",
        "  vdl render venn dataset_real_cancer_drivers_4 --out /tmp/v.svg",
        "  vdl render venn data/my.tsv --model proportional --out /tmp/v.png",
    ),
)
def cmd_venn(
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
    out: Annotated[
        Path | None,
        typer.Option("--out", "-o", help="Output path; default: <stem>__venn.<ext> in CWD"),
    ] = None,
    model: Annotated[str, typer.Option(help="Model name; 'auto' or 'proportional'")] = "auto",
    show_names: Annotated[bool, typer.Option()] = True,
    show_counts: Annotated[bool, typer.Option()] = True,
    dry_run: Annotated[bool, typer.Option("--dry-run")] = False,
) -> None:
    """Render the Venn diagram SVG, PNG, or PDF.

    Loads the dataset (TSV/CSV/GMT/GMX path or bundled sample name),
    runs `analyze()` with the chosen model (auto / proportional /
    explicit model name), and writes the chosen output format inferred
    from the `--out` extension. Falls back to `<input-stem>__venn.svg`
    in the current working directory when `--out` is omitted.
    """
    from venn_diagram_lab.render.svg import render_venn_svg  # noqa: PLC0415
    resolved = resolve_sample_or_input(input, sample)
    try:
        ds = load_input(resolved)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    img = render_venn_svg(result, show_names=show_names, show_counts=show_counts)
    target = resolve_out(out, resolved, "venn", "svg")
    _save_or_stream(img, target, dry_run, "venn")


# ---- upset -----------------------------------------------------------------


@app.command(
    "upset",
    epilog=examples_epilog(
        "  vdl render upset --sample                                           # demo run",
        "  vdl render upset dataset_real_cancer_drivers_4 --out /tmp/u.svg",
        "  vdl render upset data/my.tsv --max-columns 10 --out /tmp/u.png",
    ),
)
def cmd_upset(
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
    max_columns: Annotated[int, typer.Option(help="Cap visible intersections")] = 20,
    dry_run: Annotated[bool, typer.Option("--dry-run")] = False,
) -> None:
    """Render the UpSet plot for the dataset's intersection structure.

    Computes each non-empty subset intersection, then renders the
    matrix-and-bar layout that the webtool exports. Use `--max-columns`
    to cap the number of intersections displayed (defaults to 20, the
    same cap the webtool's print-optimized SVG uses).
    """
    from venn_diagram_lab.render.upset import render_upset  # noqa: PLC0415
    resolved = resolve_sample_or_input(input, sample)
    try:
        ds = load_input(resolved)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    img = render_upset(result, max_columns=max_columns)
    target = resolve_out(out, resolved, "upset", "svg")
    _save_or_stream(img, target, dry_run, "upset")


# ---- network ---------------------------------------------------------------


@app.command(
    "network",
    epilog=examples_epilog(
        "  vdl render network --sample                                         # demo run",
        "  vdl render network dataset_real_cancer_drivers_4 --out /tmp/n.svg",
        "  vdl render network data/my.tsv --out /tmp/n.png",
    ),
)
def cmd_network(
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
    dry_run: Annotated[bool, typer.Option("--dry-run")] = False,
) -> None:
    """Render the set-relationship network graph.

    Each node represents a set sized by its cardinality; each edge
    represents a pairwise intersection weighted by the overlap count.
    The layout is force-directed, matching the webtool's Network view.
    """
    from venn_diagram_lab.render.network import render_network  # noqa: PLC0415
    resolved = resolve_sample_or_input(input, sample)
    try:
        ds = load_input(resolved)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    img = render_network(result)
    target = resolve_out(out, resolved, "network", "svg")
    _save_or_stream(img, target, dry_run, "network")


# ---- heatmap ---------------------------------------------------------------


@app.command(
    "heatmap",
    epilog=examples_epilog(
        "  vdl render heatmap --sample                                         # demo run",
        "  vdl render heatmap dataset_real_cancer_drivers_4 --out /tmp/h.svg",
        "  vdl render heatmap data/my.tsv --cluster --linkage average --out /tmp/h.svg",
    ),
)
def cmd_heatmap(
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
    cluster: Annotated[
        bool, typer.Option("--cluster/--original", help="Cluster-reorder rows/cols")
    ] = False,
    linkage: Annotated[
        str, typer.Option(help="Linkage method: average/complete/single")
    ] = "average",
    show_row_dendrogram: Annotated[bool, typer.Option()] = True,
    show_col_dendrogram: Annotated[bool, typer.Option()] = True,
    dendrogram_fraction: Annotated[
        float, typer.Option(help="Dendrogram band width as fraction (0..1)")
    ] = 0.12,
    dry_run: Annotated[bool, typer.Option("--dry-run")] = False,
) -> None:
    """Render the pairwise statistics heatmap, optionally cluster-reordered.

    Computes the pairwise Jaccard / Dice / OC / FE matrix and renders
    it as a coloured grid. In `--cluster` mode rows and columns are
    hierarchically clustered with the chosen linkage and shown with
    dendrograms; in `--original` mode the input ordering is preserved
    and the dendrogram bands are suppressed.
    """
    from venn_diagram_lab.render.svg import render_cluster_heatmap_svg  # noqa: PLC0415
    resolved = resolve_sample_or_input(input, sample)
    try:
        ds = load_input(resolved)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    if cluster:
        img = render_cluster_heatmap_svg(
            result,
            linkage=linkage,
            show_row_dendrogram=show_row_dendrogram,
            show_col_dendrogram=show_col_dendrogram,
            dendrogram_fraction=dendrogram_fraction,
        )
    else:
        # Original mode: render with dendrograms suppressed.
        img = render_cluster_heatmap_svg(
            result,
            linkage=linkage,
            show_row_dendrogram=False,
            show_col_dendrogram=False,
            dendrogram_fraction=dendrogram_fraction,
        )
    target = resolve_out(out, resolved, "heatmap", "svg")
    _save_or_stream(img, target, dry_run, "heatmap")


# ---- share-dist ------------------------------------------------------------


@app.command(
    "share-dist",
    epilog=examples_epilog(
        "  vdl render share-dist --sample                                      # demo run",
        "  vdl render share-dist dataset_real_cancer_drivers_4 --out /tmp/s.svg",
        "  vdl render share-dist data/my.tsv --out /tmp/s.svg",
    ),
)
def cmd_share_dist(
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
    dry_run: Annotated[bool, typer.Option("--dry-run")] = False,
) -> None:
    """Render the Item Share Distribution histogram.

    Each bar shows how many items are exclusive to exactly k sets, for
    k = 1..N. This is the same chart the webtool prints on the PDF
    report cover page and is computed directly from the dataset (no
    model fitting required).
    """
    from venn_diagram_lab.render.svg import render_share_distribution_svg  # noqa: PLC0415
    resolved = resolve_sample_or_input(input, sample)
    try:
        ds = load_input(resolved)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    img = render_share_distribution_svg(ds)
    target = resolve_out(out, resolved, "share-dist", "svg")
    _save_or_stream(img, target, dry_run, "share-dist")


# ---- all -------------------------------------------------------------------


@app.command(
    "all",
    epilog=examples_epilog(
        "  vdl render all --sample --output-dir /tmp/demo                      # demo run",
        "  vdl render all dataset_real_cancer_drivers_4 --output-dir /tmp/demo",
        "  vdl render all data/my.tsv --output-dir /tmp/run1 --model auto",
    ),
)
def cmd_all(
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
    output_dir: Annotated[
        Path, typer.Option("--output-dir", help="Destination directory (required)"),
    ],
    model: Annotated[str, typer.Option()] = "auto",
) -> None:
    """Render Venn + UpSet + Network + Heatmap + ShareDist into one directory.

    Writes five SVGs named `<stem>__venn.svg`, `<stem>__upset.svg`,
    `<stem>__network.svg`, `<stem>__heatmap.svg`, and
    `<stem>__share-dist.svg` to `--output-dir` (created if missing).
    Use this as a one-shot "give me everything visual" command before
    a `vdl report pdf` run.
    """
    from venn_diagram_lab.render.network import render_network  # noqa: PLC0415
    from venn_diagram_lab.render.svg import (  # noqa: PLC0415
        render_cluster_heatmap_svg,
        render_share_distribution_svg,
        render_venn_svg,
    )
    from venn_diagram_lab.render.upset import render_upset  # noqa: PLC0415
    resolved = resolve_sample_or_input(input, sample)
    try:
        ds = load_input(resolved)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = stem_for(resolved)
    bundle = [
        ("venn", render_venn_svg(result)),
        ("upset", render_upset(result)),
        ("network", render_network(result)),
        (
            "heatmap",
            render_cluster_heatmap_svg(
                result,
                linkage="average",
                show_row_dendrogram=False,
                show_col_dendrogram=False,
            ),
        ),
        ("share-dist", render_share_distribution_svg(ds)),
    ]
    for name, img in bundle:
        target = output_dir / f"{stem}__{name}.svg"
        save = img.save  # type: ignore[attr-defined]
        save(target)
        typer.echo(f"Wrote {target}")
