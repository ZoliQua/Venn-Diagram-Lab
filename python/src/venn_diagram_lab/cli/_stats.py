"""Top-level v2.2.2 shortcuts (registered on root `app`, not as a subapp)."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.cli._common import (
    STDOUT_SENTINEL,
    examples_epilog,
    exit_error,
    load_input,
    resolve_out,
    resolve_sample_or_input,
    write_text_out,
)
from venn_diagram_lab.errors import VennDiagramError
from venn_diagram_lab.render.svg import (
    render_cluster_heatmap_svg,
    render_share_distribution_svg,
)


def register(app: typer.Typer) -> None:
    """Attach the share-dist + cluster commands to the given root app."""

    @app.command(
        "share-dist",
        epilog=examples_epilog(
            "  vdl share-dist --sample                                              # demo run",
            "  vdl share-dist dataset_real_cancer_drivers_4 --out /tmp/s.svg",
            "  vdl share-dist data/my.tsv --out -                                   # stdout",
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
    ) -> None:
        """Render Item Share Distribution histogram (shortcut for `render share-dist`).

        Identical output to `vdl render share-dist`. Exposed at the top
        level because it's one of the most common ad-hoc commands when
        sanity-checking a fresh dataset.
        """
        resolved = resolve_sample_or_input(input, sample)
        try:
            ds = load_input(resolved)
        except (VennDiagramError, OSError) as e:
            exit_error(str(e))
        img = render_share_distribution_svg(ds)
        target = resolve_out(out, resolved, "share-dist", "svg")
        if target is STDOUT_SENTINEL:
            write_text_out(target, img.content)
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        img.save(target)
        typer.echo(f"Wrote {target}")

    @app.command(
        "cluster",
        epilog=examples_epilog(
            "  vdl cluster --sample                                                 # demo run",
            "  vdl cluster dataset_real_cancer_drivers_4 --out /tmp/c.svg",
            "  vdl cluster data/my.tsv --linkage complete --out /tmp/c.svg",
        ),
    )
    def cmd_cluster(
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
        linkage: Annotated[str, typer.Option()] = "average",
    ) -> None:
        """Render cluster-rendered heatmap (shortcut for `render heatmap --cluster`).

        Identical output to `vdl render heatmap --cluster`. Always
        emits both row and column dendrograms. Use the longer form
        when you need to tune visibility flags.
        """
        resolved = resolve_sample_or_input(input, sample)
        try:
            ds = load_input(resolved)
            result = analyze(ds, model=model)
        except (VennDiagramError, OSError) as e:
            exit_error(str(e))
        img = render_cluster_heatmap_svg(
            result,
            linkage=linkage,
            show_row_dendrogram=True,
            show_col_dendrogram=True,
        )
        target = resolve_out(out, resolved, "cluster", "svg")
        if target is STDOUT_SENTINEL:
            write_text_out(target, img.content)
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        img.save(target)
        typer.echo(f"Wrote {target}")
