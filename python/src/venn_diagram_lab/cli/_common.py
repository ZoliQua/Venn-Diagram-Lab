"""Shared CLI helpers: input auto-detect, output-path resolution, error exits."""

from __future__ import annotations

import sys
from pathlib import Path

import typer

from venn_diagram_lab.io import Dataset, load_csv, load_gmt, load_gmx, load_tsv
from venn_diagram_lab.samples import list_samples, load_sample

# Sentinel used by `--out -` (write to stdout). Callers check `is STDOUT_SENTINEL`.
STDOUT_SENTINEL: Path = Path("__VDL_STDOUT__")

# Default bundled sample used by `--sample` flag across all subcommands.
DEFAULT_SAMPLE_NAME = "dataset_real_cancer_drivers_4"


class AlphabeticalGroup(typer.core.TyperGroup):
    """Render commands + subapps interleaved in one alphabetical list.

    Typer's default rendering places `@app.command` entries before
    `add_typer` subapps; this subclass overrides `list_commands` to
    return a single alphabetically sorted name list so the user sees
    one merged listing under `Commands` in `--help`.
    """

    def list_commands(self, ctx):  # type: ignore[no-untyped-def]
        return sorted(self.commands)


def examples_epilog(*lines: str) -> str:
    """Build a `--help` epilog with a `How to try it` panel and example lines.

    Each *line* is rendered as its own paragraph so Rich/Typer keeps the
    one-command-per-line layout. (A single `\\n` between examples gets
    folded by Rich's paragraph wrapper; only `\\n\\n` produces a hard
    line break.)
    """
    body = "\n\n".join(lines)
    return f"How to try it:\n\n{body}\n"


def exit_error(msg: str, *, code: int = 1) -> None:
    """Print `msg` to stderr in red and raise typer.Exit(code)."""
    typer.secho(f"error: {msg}", fg=typer.colors.RED, err=True)
    raise typer.Exit(code=code)


def resolve_sample_or_input(input_value: str | None, sample: bool) -> str:
    """Return the dataset key to load.

    When `sample` is True and `input_value` is None, defaults to
    :data:`DEFAULT_SAMPLE_NAME`. When `input_value` is given (with or
    without `--sample`), passes it through unchanged. When both are
    absent, exits with a clear error.
    """
    if input_value:
        return input_value
    if sample:
        typer.secho(
            f"note: --sample → using bundled '{DEFAULT_SAMPLE_NAME}'",
            fg=typer.colors.CYAN,
            err=True,
        )
        return DEFAULT_SAMPLE_NAME
    exit_error(
        "INPUT required (or use --sample for a demo with the bundled cancer-drivers dataset)"
    )
    raise RuntimeError("unreachable")


def load_input(value: str, *, mode: str = "binary", format: str | None = None) -> Dataset:
    """Resolve `value` to a Dataset via path-first then sample-name lookup.

    Step 1: if Path(value).is_file(), load by extension.
    Step 2: elif value in list_samples(), call load_sample(value).
    Step 3: else, exit_error.
    """
    p = Path(value)
    if p.is_file():
        ext = (format or p.suffix.lstrip(".")).lower()
        if ext == "csv":
            return load_csv(p, binary=(mode == "binary"))
        if ext == "tsv":
            return load_tsv(p, binary=(mode == "binary"))
        if ext == "gmt":
            return load_gmt(p)
        if ext == "gmx":
            return load_gmx(p)
        exit_error(f"unknown file extension {p.suffix!r} for {p}")
    samples = set(list_samples())
    if value in samples:
        return load_sample(value)
    exit_error(
        f"{value!r} is neither a readable file path nor a bundled sample name. "
        "Try `vdl data samples` or `vdl list-samples` for the registry."
    )
    raise RuntimeError("unreachable")  # mypy hint; exit_error raises


def stem_for(value: str) -> str:
    """Return a stable stem string for default output filenames."""
    p = Path(value)
    if p.suffix:
        return p.stem
    return value


def resolve_out(
    out: Path | None,
    input_value: str,
    command: str,
    default_ext: str,
) -> Path:
    """Compute the final output path per the spec rules.

    See spec §8 for the full algorithm. Returns STDOUT_SENTINEL when `out` is `-`.
    """
    if out is not None and str(out) == "-":
        return STDOUT_SENTINEL
    if out is None:
        name = f"{stem_for(input_value)}__{command}.{default_ext}"
        target = (Path.cwd() / name).resolve()
        typer.secho(f"note: no --out given; writing {target}", fg=typer.colors.YELLOW, err=True)
        return target
    if out.is_dir():
        return out / f"{stem_for(input_value)}__{command}.{default_ext}"
    if out.suffix == "":
        return out.with_suffix(f".{default_ext}")
    return out


def write_text_out(target: Path, content: str) -> None:
    """Write `content` to `target` or stdout (when target is STDOUT_SENTINEL)."""
    if target is STDOUT_SENTINEL:
        sys.stdout.write(content)
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8", newline="")
