"""`vdl report ...` subapp — multi-page PDF + ZIP bundle reports."""

from __future__ import annotations

import zipfile
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Annotated

import typer

from venn_diagram_lab.analysis import RegionResult, analyze
from venn_diagram_lab.cli._common import (
    AlphabeticalGroup,
    examples_epilog,
    exit_error,
    load_input,
    resolve_out,
    resolve_sample_or_input,
)
from venn_diagram_lab.errors import VennDiagramError
from venn_diagram_lab.render.network import render_network
from venn_diagram_lab.render.svg import (
    render_share_distribution_svg,
    render_venn_svg,
)
from venn_diagram_lab.render.upset import render_upset
from venn_diagram_lab.report.excel import to_excel_workbook
from venn_diagram_lab.version import __version__

app = typer.Typer(
    no_args_is_help=True,
    rich_markup_mode="rich",
    help="Generate multi-page reports (PDF / ZIP bundle).",
    cls=AlphabeticalGroup,
)


@app.command(
    "pdf",
    epilog=examples_epilog(
        "  vdl report pdf --sample                                                # demo run",
        "  vdl report pdf dataset_real_cancer_drivers_4 --out /tmp/r.pdf",
        "  vdl report pdf data/my.tsv --model auto --out /tmp/r.pdf",
    ),
)
def cmd_pdf(
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
    cluster_heatmap: Annotated[
        bool,
        typer.Option(
            "--cluster-heatmap",
            help=(
                "Append a cluster-ordered Jaccard heatmap page "
                "(mirrors the webtool's *Cluster* axis-order toggle)."
            ),
        ),
    ] = False,
) -> None:
    """Write the multi-page PDF report (mirrors the webtool's Report PDF).

    Generates the canonical multi-page report: cover page with data
    overview + set-size pie chart, Venn + UpSet plots, statistics
    tables (Jaccard / Dice / Enrichment with FDR colouring), Item
    Share Distribution histogram, Network page with significant edges,
    and a methodology page. Pass ``--cluster-heatmap`` to additionally
    append the cluster-ordered Jaccard heatmap page.
    """
    resolved = resolve_sample_or_input(input, sample)
    try:
        ds = load_input(resolved)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    target = resolve_out(out, resolved, "report", "pdf")
    target.parent.mkdir(parents=True, exist_ok=True)
    result.to_pdf_report(target, cluster_heatmap=cluster_heatmap)
    typer.echo(f"Wrote {target}")


@app.command(
    "zip",
    epilog=examples_epilog(
        "  vdl report zip --sample                                                # demo run",
        "  vdl report zip dataset_real_cancer_drivers_4 --out /tmp/r.zip",
        "  vdl report zip data/my.tsv --out /tmp/r.zip",
    ),
)
def cmd_zip(
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
    """Write the Full Report ZIP bundle (PDF + TSVs + SVGs).

    Packages the multi-page PDF report alongside the supporting SVGs
    (Venn, UpSet, Network, Share Distribution) and TSVs (Region
    Summary, Item Matrix, Statistics) into a single ZIP archive. This
    mirrors the webtool's "Download Everything" button.
    """
    resolved = resolve_sample_or_input(input, sample)
    try:
        ds = load_input(resolved)
        result = analyze(ds, model=model)
    except (VennDiagramError, OSError) as e:
        exit_error(str(e))
    target = resolve_out(out, resolved, "report", "zip")
    target.parent.mkdir(parents=True, exist_ok=True)
    n_sets = len(result.dataset.set_names)
    xlsx_name = f"enrichment_statistics_{n_sets}-sets.xlsx"
    with TemporaryDirectory() as td:
        tdp = Path(td)
        # SVGs
        render_venn_svg(result).save(tdp / "venn.svg")
        render_upset(result).save(tdp / "upset.svg")
        render_network(result).save(tdp / "network.svg")
        render_share_distribution_svg(ds).save(tdp / "share-dist.svg")
        # TSVs
        result.to_region_summary_tsv(tdp / "regions_summary.tsv")
        result.to_matrix_tsv(tdp / "items_matrix.tsv")
        result.to_statistics_tsv(tdp / "statistics.tsv")
        # Excel workbook (3 sheets: Jaccard / Sørensen-Dice / Enrichment).
        to_excel_workbook(result, tdp / xlsx_name)
        # PDF
        result.to_pdf_report(tdp / "report.pdf")
        # README.txt — provenance + About This Report methodology body.
        (tdp / "README.txt").write_text(
            _build_readme_text(resolved, result, xlsx_name),
            encoding="utf-8",
        )
        # Bundle
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in sorted(tdp.iterdir()):
                zf.write(f, arcname=f.name)
    typer.echo(f"Wrote {target}")


def _build_readme_text(
    resolved: str, result: RegionResult, xlsx_name: str,
) -> str:
    """Compose the ZIP bundle's README.txt body.

    Header carries provenance (ISO timestamp, tool version, dataset, model);
    body reuses ``_ABOUT_TEXT`` from :mod:`venn_diagram_lab.render.pdf` so
    the methodology text stays single-sourced with the PDF appendix.
    """
    from venn_diagram_lab.render.pdf import _ABOUT_TEXT  # noqa: PLC0415

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    header = (
        f"Venn Diagram Lab — Full Report (ZIP)\n\n"
        f"Generated: {timestamp}\n"
        f"Tool version: venn-diagram-lab {__version__}\n"
        f"Dataset: {resolved}\n"
        f"Model: {result.model}\n\n"
        f"Files in this bundle:\n"
        f"  venn.svg                            Multi-set Venn diagram\n"
        f"  upset.svg                           UpSet plot\n"
        f"  network.svg                         Set-relationship network\n"
        f"  share-dist.svg                      Item Share Distribution histogram\n"
        f"  regions_summary.tsv                 Per-region exclusive + inclusive counts\n"
        f"  items_matrix.tsv                    Binary item x set matrix\n"
        f"  statistics.tsv                      Pairwise statistics\n"
        f"  {xlsx_name:35s} Excel workbook: Jaccard / Sørensen-Dice / Enrichment\n"
        f"  report.pdf                          Multi-page PDF report\n"
        f"  README.txt                          This file\n\n"
    )
    # v2.2.3: prepend an "About This Report" banner so the README mirrors the
    # PDF appendix header. _ABOUT_TEXT itself now starts with the structured
    # "Venn Diagram Lab" section, not the banner (it's a flattening of the
    # _ABOUT_SECTIONS list which groups intro/plots/statistics/credits).
    return header + "About This Report\n\n" + _ABOUT_TEXT
