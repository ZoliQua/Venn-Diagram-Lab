"""Top-level meta commands: tree, about, credits."""

from __future__ import annotations

from typing import Any

import typer

from venn_diagram_lab.cli._common import examples_epilog
from venn_diagram_lab.version import __version__

# Webtool URL + Zenodo concept DOI (kept in sync with r/inst/CITATION).
_WEBTOOL_URL = "https://venndiagramlab.org/"
_GITHUB_URL = "https://github.com/ZoliQua/Venn-Diagram-Lab"
_ZENODO_CONCEPT_DOI = "10.5281/zenodo.19510813"
_PYPI_URL = "https://pypi.org/project/venn-diagram-lab/"
_CRAN_URL = "https://CRAN.R-project.org/package=vennDiagramLab"

# Authors in canonical order (matches r/inst/CITATION + cikk).
_AUTHORS = [
    "Zoltán Dul <zoltan.dul@gmail.com>",
    "Márton Ölbei",
    "N. Shaun B. Thomas",
    "Azeddine Si Ammour",
    "Attila Csikász-Nagy",
]


def _is_group(node: Any) -> bool:
    """Duck-typed check for click.Group-shaped objects.

    Avoids a direct `from click import Group` import — click is brought in
    transitively by typer at runtime, but the explicit symbol import fails
    on some CI matrix cells where the click wheel doesn't expose `Group`
    at module load time. The `commands` attribute is the contract we need.
    """
    return hasattr(node, "commands") and isinstance(node.commands, dict)


def _print_tree(app: typer.Typer, prefix: str = "vdl") -> None:
    """Walk the Typer app and print every command in a tree."""
    typer.echo(prefix)
    click_app = typer.main.get_command(app)
    _walk(click_app, prefix, "")


def _walk(node: Any, prefix: str, indent: str) -> None:
    if _is_group(node):
        names = sorted(node.commands.keys())
        for i, name in enumerate(names):
            is_last = i == len(names) - 1
            connector = "└── " if is_last else "├── "
            sub = node.commands[name]
            short = getattr(sub, "short_help", None) or (
                (sub.help or "").splitlines()[0] if sub.help else ""
            )
            typer.echo(f"{indent}{connector}{name}" + (f"  — {short}" if short else ""))
            if _is_group(sub):
                next_indent = indent + ("    " if is_last else "│   ")
                _walk(sub, prefix, next_indent)


_ABOUT_TEXT = """\
About Venn Diagrams

ORIGINS AND HISTORICAL BACKGROUND

Venn diagrams belong to a much older effort to make logical structure
visible. The name comes from John Venn (1880), but the idea of reasoning
with geometric or diagrammatic arrangements predates him by centuries —
through Llull, Vives, Sturm, Leibniz, Weise, Euler, and Lambert.

WHAT A VENN DIAGRAM IS

A mathematical Venn diagram is more demanding than the everyday textbook
intuition. Following Griggs, Killian, and Savage, an n-Venn diagram is a
collection of n simple closed curves such that each subset of the index
set determines a non-empty and connected region obtained from the
appropriate interiors and exteriors of the curves. So an n-Venn diagram
has exactly 2^n - 1 non-empty regions plus the exterior.

SYMMETRY AND LATER RESEARCH

Once existence is established, the subject branches into sharper
questions: which Venn diagrams are symmetric, convex, monotone, or
reducible, and what curve families are needed. Henderson (1963) showed
that symmetric n-Venn diagrams can exist only when n is prime; later
work (Griggs et al., Mamakani & Ruskey) proved existence for every
prime n and connected the constructions to symmetric chain
decompositions in the Boolean lattice.

For the full content with bibliography, see the webtool's About dialog:
""" + _WEBTOOL_URL


def _print_about() -> None:
    typer.echo(_ABOUT_TEXT)


def _print_credits() -> None:
    typer.echo("Venn Diagram Lab — Credits & Citation")
    typer.echo("")
    typer.echo("AUTHORS")
    for a in _AUTHORS:
        typer.echo(f"  - {a}")
    typer.echo("")
    typer.echo("LINKS")
    typer.echo(f"  webtool:  {_WEBTOOL_URL}")
    typer.echo(f"  github:   {_GITHUB_URL}")
    typer.echo(f"  pypi:     {_PYPI_URL}")
    typer.echo(f"  cran:     {_CRAN_URL}")
    typer.echo(f"  zenodo:   https://doi.org/{_ZENODO_CONCEPT_DOI}")
    typer.echo("")
    typer.echo("CITATION (BibTeX-friendly)")
    typer.echo(
        "  Dul Z., Ölbei M., Thomas N.S.B., Si Ammour A., Csikász-Nagy A. "
        "(2026). venn-diagram-lab: Headless Venn diagram analysis and "
        f"rendering. Python package version {__version__}."
    )
    typer.echo(f"  Zenodo concept DOI: {_ZENODO_CONCEPT_DOI}")
    typer.echo(f"  Webtool: {_WEBTOOL_URL}")


def register(app: typer.Typer) -> None:
    """Attach tree / about / credits to the root app."""

    @app.command(
        "tree",
        epilog=examples_epilog("  vdl tree    # no sample data needed"),
    )
    def cmd_tree() -> None:
        """Print every command in the CLI as a tree.

        Walks the full Typer/Click command graph and prints each
        command with its short-help under its parent group. Useful
        for discovering commands without paging through each subapp's
        `--help`.
        """
        _print_tree(app)

    @app.command(
        "about",
        epilog=examples_epilog("  vdl about    # no sample data needed"),
    )
    def cmd_about() -> None:
        """Show a short overview of Venn diagrams (abridged from the webtool).

        Covers the three sections of the webtool's About dialog:
        historical origins, the formal mathematical definition of an
        n-Venn diagram, and modern symmetry / monotonicity results.
        For the full content with bibliography, see
        https://venndiagramlab.org/.
        """
        _print_about()

    @app.command(
        "credits",
        epilog=examples_epilog("  vdl credits    # no sample data needed"),
    )
    def cmd_credits() -> None:
        """Show authors, citation, and links to the webtool / Zenodo / PyPI / CRAN.

        Prints the canonical author list (in the order used by the R
        CITATION file and the manuscript), a BibTeX-friendly citation
        line, and links to the webtool, GitHub, PyPI, CRAN, and the
        Zenodo concept DOI.
        """
        _print_credits()
