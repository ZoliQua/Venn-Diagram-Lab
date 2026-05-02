"""SVG rendering: template the 44 bundled model SVGs from a RegionResult."""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass
from importlib import resources
from itertools import combinations
from pathlib import Path
from typing import TYPE_CHECKING

from lxml import etree  # type: ignore[import-untyped]

from venn_diagram_lab.errors import UnknownModelError

if TYPE_CHECKING:
    from lxml.etree import _Element  # type: ignore[import-untyped]

# Module-level constant duplicating analysis._LETTERS so render.svg has no
# import dependency on analysis (cycle avoidance for D1's RegionResult.render_venn).
_LETTERS = "ABCDEFGHI"


@dataclass(frozen=True)
class SvgImage:
    """Wrapper around a serialised SVG string with save/Jupyter helpers."""

    svg: str

    def __str__(self) -> str:
        return self.svg

    def _repr_svg_(self) -> str:
        """Jupyter inline-render hook."""
        return self.svg

    def save(self, path: Path | str, *, dpi: int = 96) -> None:
        """Write the SVG to disk.

        Format is auto-detected from the extension:
        - `.svg` writes the raw text (dpi ignored).
        - `.png` rasterises via cairosvg at `dpi` (default 96, matching SVG units).
        - `.pdf` exports via cairosvg (vector; dpi only affects embedded raster fallbacks).
        """
        p = Path(path)
        ext = p.suffix.lower()
        if ext == ".svg":
            p.write_text(self.svg, encoding="utf-8")
            return
        if ext in {".png", ".pdf"}:
            import cairosvg  # type: ignore[import-untyped]  # noqa: PLC0415  # lazy import — cairosvg is a heavy native dep
            # cairosvg's `dpi` only affects SVGs with physical units (mm/cm); for
            # pixel-unit SVGs we must use `scale` to control output resolution.
            # We map dpi to scale relative to the standard screen baseline of 96 dpi.
            scale = dpi / 96.0
            if ext == ".png":
                cairosvg.svg2png(  # type: ignore[import-untyped]
                    bytestring=self.svg.encode("utf-8"), write_to=str(p), scale=scale
                )
            else:
                cairosvg.svg2pdf(  # type: ignore[import-untyped]
                    bytestring=self.svg.encode("utf-8"), write_to=str(p), scale=scale
                )
            return
        raise ValueError(
            f"Unsupported output extension {ext!r}. Use .svg, .png, or .pdf."
        )


def _models_svg_dir() -> Path:
    """Resolve the bundled `_data/models/svg/` directory."""
    pkg_root = resources.files("venn_diagram_lab")
    return Path(str(pkg_root)) / "_data" / "models" / "svg"


def _is_venn_model(name: str) -> bool:
    """True iff `name` is a Venn model (i.e. starts with 'venn').

    Filters the bundled `names-bar.svg` (a non-Venn helper SVG) out of any
    enumeration that asks "give me the diagram models".
    """
    return name.startswith("venn")


def _load_template(name: str) -> str:
    """Load a bundled model SVG as raw text. Raises UnknownModelError on miss."""
    if not _is_venn_model(name):
        raise UnknownModelError(
            f"{name!r} is not a venn model (use list_models() to see available)"
        )
    path = _models_svg_dir() / f"{name}.svg"
    if not path.is_file():
        raise UnknownModelError(
            f"Model {name!r} not found in bundled SVG directory. "
            "Run `python python/scripts/sync_data.py` to populate _data/models/svg/."
        )
    return path.read_text(encoding="utf-8")


# Match `fill:#XXXXXX` (3- or 6-digit hex) inside an inline style attribute.
_FILL_RE = re.compile(r"fill:\s*#[0-9A-Fa-f]{3,6}")


def _find_by_id(root: _Element, id_value: str) -> _Element | None:
    """Locate an element by its `id` attribute. Namespace-agnostic.

    The web tool's renderer uses `document.getElementById`; we replicate that
    semantics by walking every descendant and matching the `id` attribute,
    which sidesteps lxml's XPath/namespace gymnastics.
    """
    for el in root.iter():
        if el.attrib.get("id") == id_value:
            return el
    return None


def _set_text(root: _Element, id_value: str, text: str) -> None:
    """Overwrite the text content of the element with the given id. No-op if missing."""
    el = _find_by_id(root, id_value)
    if el is not None:
        el.text = text


def _replace_fill_color(root: _Element, id_value: str, hex_color: str) -> None:
    """Replace the `fill:#...` portion of the element's inline style. No-op if missing."""
    el = _find_by_id(root, id_value)
    if el is None:
        return
    style = el.attrib.get("style", "")
    new_style, n = _FILL_RE.subn(f"fill:{hex_color}", style)
    if n > 0:
        el.attrib["style"] = new_style


def _count_ids_for_set_count(n: int) -> list[str]:
    """Enumerate every Count_<label> id present on a Venn template for n sets.

    Mirrors the web tool's region label generator: subsets of letters[:n] sized 1..n,
    emitted by length then alphabetically.
    """
    labels: list[str] = []
    letters = _LETTERS[:n]
    for size in range(1, n + 1):
        for combo in combinations(letters, size):
            labels.append("".join(combo))
    return [f"Count_{label}" for label in labels]


def _apply_counts(root: _Element, result, *, show: bool) -> None:
    """Write (or blank) all Count_* and CountSUM_* text elements.

    Extracted to keep render_venn_svg's branch count within ruff PLR0912 limit.
    """
    n = len(result.dataset.set_names)
    count_ids = _count_ids_for_set_count(n)
    if show:
        for cid in count_ids:
            _set_text(root, cid, "0")
        for region in result.regions.values():
            _set_text(root, f"Count_{region.label}", str(region.exclusive_count))
        # CountSUM_X -- inclusive set total. Present on ALL 44 bundled models.
        for i, name in enumerate(result.dataset.set_names):
            _set_text(root, f"CountSUM_{_LETTERS[i]}", str(result.set_sizes[name]))
    else:
        for cid in count_ids:
            _set_text(root, cid, "")
        for i in range(n):
            _set_text(root, f"CountSUM_{_LETTERS[i]}", "")


def render_venn_svg(
    result,
    *,
    model: str | None = None,
    set_names: Mapping[str, str] | None = None,
    colors: Mapping[str, str] | None = None,
    title: str | None = None,
    show_names: bool = True,
    show_counts: bool = True,
) -> SvgImage:
    """Render a RegionResult onto its model SVG and return an SvgImage.

    Parameters
    ----------
    result : RegionResult from venn_diagram_lab.analyze().
    model : explicit model id override (filename stem). Default = result.model.
    set_names : per-letter (A..I) display name override. Unspecified letters
        fall back to result.dataset.set_names (in order).
    colors : per-letter (A..I) fill color override (e.g. ``{"A": "#FF0000"}``).
        Applies to BulletX, ShapeX, and ShapeX2 (Euler extra shapes).
        Unspecified letters keep the template defaults.
    title : diagram title override. If None, the template default is kept.
    show_names : if False, blank every NameA-I element.
    show_counts : if False, blank every Count_* and CountSUM_* element.
    """
    model_name = model if model is not None else result.model

    # Proportional path: bypass template loading, generate synthetic SVG.
    if model_name == "proportional":
        from venn_diagram_lab.proportional import generate_proportional_svg  # noqa: PLC0415
        return SvgImage(svg=generate_proportional_svg(result))

    template = _load_template(model_name)
    root = etree.fromstring(template.encode())

    n = len(result.dataset.set_names)
    name_overrides = dict(set_names or {})

    # Names -- Letter -> display name (override > dataset default).
    if show_names:
        for i, dataset_name in enumerate(result.dataset.set_names):
            letter = _LETTERS[i]
            name = name_overrides.get(letter, dataset_name)
            _set_text(root, f"Name{letter}", name)
    else:
        for i in range(n):
            _set_text(root, f"Name{_LETTERS[i]}", "")

    # Counts (exclusive regions) and CountSUM (inclusive set totals).
    _apply_counts(root, result, show=show_counts)

    # Title -- only override if the caller passed one. Default leaves template intact.
    if title is not None:
        _set_text(root, "Title", title)

    # Colors -- per-letter override applies to BulletX, ShapeX, and ShapeX2 (Euler).
    if colors:
        for letter, hex_color in colors.items():
            _replace_fill_color(root, f"Bullet{letter}", hex_color)
            _replace_fill_color(root, f"Shape{letter}", hex_color)
            _replace_fill_color(root, f"Shape{letter}2", hex_color)  # no-op if absent

    return SvgImage(svg=etree.tostring(root, encoding="unicode"))
