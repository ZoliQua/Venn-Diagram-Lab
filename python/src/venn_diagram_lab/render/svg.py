"""SVG rendering: template the 44 bundled model SVGs from a RegionResult."""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass
from importlib import resources
from itertools import combinations
from pathlib import Path
from typing import TYPE_CHECKING, cast

from lxml import etree

from venn_diagram_lab.errors import UnknownModelError

if TYPE_CHECKING:
    import numpy as np
    import pandas as pd
    from lxml.etree import _Element

    from venn_diagram_lab.analysis import RegionResult
    from venn_diagram_lab.cluster import Merge
    from venn_diagram_lab.io import Dataset

__all__ = [
    "SvgImage",
    "render_cluster_heatmap_svg",
    "render_share_distribution_svg",
    "render_venn_svg",
]

# Module-level constant duplicating analysis._LETTERS so render.svg has no
# import dependency on analysis (cycle avoidance for D1's RegionResult.render_venn).
_LETTERS = "ABCDEFGHI"


@dataclass(frozen=True)
class SvgImage:
    """SVG image emitted by :func:`render_venn_svg` and the plot renderers.

    Attributes:
        svg: The SVG document as a string.
        width: Optional pixel width of the rendered SVG (set by the plot
            renderers — :func:`render_share_distribution_svg`,
            :func:`render_cluster_heatmap_svg`). ``None`` for the
            template-based Venn renderer where the model's own viewBox
            governs sizing.
        height: Optional pixel height; same semantics as ``width``.

    Methods:
        save(path): Write to disk; format auto-detected from extension
            (``.svg``, ``.png``, ``.pdf``). PNG/PDF go through cairosvg.

    Properties:
        content: Alias for ``svg`` — mirrors the webtool's TS-side
            ``{ content, width, height }`` shape so cross-package parity
            tests can use a uniform attribute name.
    """

    svg: str
    width: int | None = None
    height: int | None = None

    @property
    def content(self) -> str:
        """Return the SVG document string (parity-friendly alias for ``svg``)."""
        return self.svg

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
            # `newline=""` keeps LF line endings on Windows so the SVG
            # bytes match the React webapp's output (the TSV exports use
            # the same pattern — see analysis.py for the parity-test
            # rationale).
            p.write_text(self.svg, encoding="utf-8", newline="")
            return
        if ext in {".png", ".pdf"}:
            import cairosvg  # noqa: PLC0415  # lazy import — cairosvg is a heavy native dep
            # cairosvg's `dpi` only affects SVGs with physical units (mm/cm); for
            # pixel-unit SVGs we must use `scale` to control output resolution.
            # We map dpi to scale relative to the standard screen baseline of 96 dpi.
            scale = dpi / 96.0
            if ext == ".png":
                cairosvg.svg2png(
                    bytestring=self.svg.encode("utf-8"), write_to=str(p), scale=scale
                )
            else:
                cairosvg.svg2pdf(
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


def _apply_counts(root: _Element, result: RegionResult, *, show: bool) -> None:
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
    result: RegionResult,
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


# ---------------------------------------------------------------------------
# Item Share Distribution renderer (v2.2.2)
#
# Mirrors src/utils/shareDistributionSvgBuilder.ts (commit 9159d49). Pure
# string construction — no lxml — so the output stays byte-stable across
# Python versions and matches the webtool's PDF embed.
# ---------------------------------------------------------------------------

_SD_WIDTH = 480
_SD_HEIGHT = 280
_SD_MARGIN_TOP = 30
_SD_MARGIN_RIGHT = 20
_SD_MARGIN_BOTTOM = 40
_SD_MARGIN_LEFT = 50
_SD_GRAD_LOW = "#ffe4b5"  # webtool tier-gradient low
_SD_GRAD_HIGH = "#7e14ff"  # webtool tier-gradient high


def _lerp_hex(a: str, b: str, t: float) -> str:
    """Linear interpolation between two ``#RRGGBB`` colors, returning ``rgb(...)``."""
    ar, ag, ab = int(a[1:3], 16), int(a[3:5], 16), int(a[5:7], 16)
    br, bg, bb = int(b[1:3], 16), int(b[3:5], 16), int(b[5:7], 16)
    return (
        f"rgb({round(ar + (br - ar) * t)},"
        f"{round(ag + (bg - ag) * t)},"
        f"{round(ab + (bb - ab) * t)})"
    )


def _dataset_to_binary_matrix(dataset: Dataset) -> np.ndarray:
    """Build a binary item-by-set matrix from a :class:`Dataset`.

    Uses ``dataset.item_order`` as the row order when populated; otherwise
    falls back to the sorted union of items. Mirrors the webtool's
    ``CsvData.matrix`` shape (rows = items, cols = sets, cells in ``{0, 1}``).
    """
    import numpy as np  # noqa: PLC0415  # local import keeps numpy out of module load

    set_names = dataset.set_names
    if dataset.item_order:
        rows = list(dataset.item_order)
    else:
        seen: dict[str, None] = {}
        for name in set_names:
            for item in dataset.items.get(name, set()):
                if item not in seen:
                    seen[item] = None
        rows = list(seen.keys())

    matrix = np.zeros((len(rows), len(set_names)), dtype=int)
    row_idx = {item: i for i, item in enumerate(rows)}
    for j, name in enumerate(set_names):
        for item in dataset.items.get(name, set()):
            i = row_idx.get(item)
            if i is not None:
                matrix[i, j] = 1
    return matrix


def render_share_distribution_svg(dataset: Dataset) -> SvgImage:
    """Render the Item Share Distribution bar chart for a :class:`Dataset`.

    Mirrors the webtool's ``buildShareDistributionSvg`` layout (480x280
    viewBox, tier-gradient fill from ``#ffe4b5`` to ``#7e14ff``, bins
    ``k = 1..N`` along the X axis). Each bar carries a ``sd-bar`` CSS
    class so downstream stylesheets / PDF capture can key on it.

    Parameters
    ----------
    dataset
        The input :class:`Dataset`. Items are aggregated via
        :func:`venn_diagram_lab.share_distribution.item_share_distribution`
        on a derived binary item-by-set matrix.

    Returns
    -------
    SvgImage
        The rendered chart with ``content`` (string), ``width=480``,
        ``height=280``.
    """
    from venn_diagram_lab.share_distribution import (  # noqa: PLC0415
        item_share_distribution,
    )

    matrix = _dataset_to_binary_matrix(dataset)
    dist = item_share_distribution(matrix)

    width = _SD_WIDTH
    height = _SD_HEIGHT
    plot_w = width - _SD_MARGIN_LEFT - _SD_MARGIN_RIGHT
    plot_h = height - _SD_MARGIN_TOP - _SD_MARGIN_BOTTOM

    bins = sorted(dist.items())
    n_bins = len(bins)
    max_v = max((v for _, v in bins), default=1) or 1
    bar_w = plot_w / n_bins * 0.7 if n_bins else 0.0
    bar_gap = plot_w / n_bins * 0.3 if n_bins else 0.0

    parts: list[str] = []
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}">'
    )
    parts.append(f'<rect width="{width}" height="{height}" fill="#ffffff"/>')
    parts.append(
        f'<text x="{width / 2}" y="{_SD_MARGIN_TOP - 12}" text-anchor="middle" '
        f'fill="#333" font-family="Tahoma,sans-serif" font-size="12">'
        f"Item Share Distribution</text>"
    )

    for i, (k, v) in enumerate(bins):
        t = i / (n_bins - 1) if n_bins > 1 else 0.0
        fill = _lerp_hex(_SD_GRAD_LOW, _SD_GRAD_HIGH, t)
        x = _SD_MARGIN_LEFT + i * (bar_w + bar_gap) + bar_gap / 2
        y_top = _SD_MARGIN_TOP + plot_h * (1 - v / max_v)
        h = (_SD_MARGIN_TOP + plot_h) - y_top
        parts.append(
            f'<rect class="sd-bar" x="{x:.2f}" y="{y_top:.2f}" '
            f'width="{bar_w:.2f}" height="{h:.2f}" fill="{fill}"/>'
        )
        parts.append(
            f'<text x="{(x + bar_w / 2):.2f}" y="{(y_top - 4):.2f}" '
            f'text-anchor="middle" fill="#333" font-family="Tahoma,sans-serif" '
            f'font-size="11">{v}</text>'
        )
        tick = "1 set" if k == 1 else f"{k} sets"
        parts.append(
            f'<text x="{(x + bar_w / 2):.2f}" '
            f'y="{(_SD_MARGIN_TOP + plot_h + 16):.2f}" '
            f'text-anchor="middle" fill="#333" font-family="Tahoma,sans-serif" '
            f'font-size="11">{tick}</text>'
        )

    parts.append(
        f'<line x1="{_SD_MARGIN_LEFT}" x2="{_SD_MARGIN_LEFT + plot_w}" '
        f'y1="{_SD_MARGIN_TOP + plot_h}" y2="{_SD_MARGIN_TOP + plot_h}" '
        f'stroke="#333" stroke-width="1"/>'
    )
    parts.append("</svg>")
    return SvgImage(svg="".join(parts), width=width, height=height)


# ---------------------------------------------------------------------------
# Cluster Heatmap renderer (v2.2.2)
#
# Mirrors the cluster-aware path of src/utils/enrichmentPlotSvg.ts
# (buildEnrichmentHeatmapSvg, commit a628475) restricted to the Jaccard
# similarity matrix. Distance D = 1 - Jaccard feeds cluster_set_order, then
# leaf-order permutes both axes and L-shaped dendrograms are drawn in the
# `hm-dendro-col` / `hm-dendro-row` groups expected by downstream styling
# and PDF capture.
# ---------------------------------------------------------------------------

_HM_CELL = 36
_HM_LEFT_LABEL_W = 110
_HM_TOP_LABEL_H = 82
_HM_PAD_R = 14
_HM_PAD_T = 20
_HM_PAD_B = 18
_HM_GRAD_LOW = "#ffffff"
_HM_GRAD_HIGH = "#0072B2"


_MIN_SETS_FOR_CLUSTER = 2
_HM_NAME_TRIM = 10
_HM_TEXT_LIGHT_THRESHOLD = 0.55


def _jaccard_distance_matrix(result: RegionResult) -> np.ndarray:
    """Return ``D = 1 - Jaccard`` for cluster_set_order, with diagonal zeroed."""
    import numpy as np  # noqa: PLC0415

    jacc = result.statistics.jaccard
    n = len(result.dataset.set_names)
    if jacc.empty or n < _MIN_SETS_FOR_CLUSTER:
        return np.zeros((n, n), dtype=float)
    arr = jacc.to_numpy(dtype=float, copy=True)
    distance = 1.0 - arr
    # Force zero diagonal — the analytic diagonal is 1.0 (identity Jaccard),
    # but scipy's squareform requires zero on the diagonal of a distance matrix.
    np.fill_diagonal(distance, 0.0)
    # Symmetrize defensively (Jaccard is symmetric, but compute_pairwise fills
    # only the upper triangle in some webtool paths — mirror to lower).
    distance = (distance + distance.T) / 2.0
    return np.asarray(distance, dtype=float)


def render_cluster_heatmap_svg(
    result: RegionResult,
    *,
    linkage: str = "average",
    show_row_dendrogram: bool = True,
    show_col_dendrogram: bool = True,
    dendrogram_fraction: float = 0.12,
) -> SvgImage:
    """Render a clustered Jaccard similarity heatmap with L-shaped dendrograms.

    Mirrors the webtool's cluster-aware ``buildEnrichmentHeatmapSvg`` path.
    Distance ``D = 1 - Jaccard`` is fed to
    :func:`venn_diagram_lab.cluster.cluster_set_order`; the resulting
    ``leaf_order`` permutes both axes, and merge heights drive the L-shaped
    overlays emitted under ``<g class="hm-dendro-col">`` (top band) and
    ``<g class="hm-dendro-row">`` (left band).

    Parameters
    ----------
    result
        :class:`RegionResult` from :func:`venn_diagram_lab.analyze`.
    linkage
        Linkage method for :func:`cluster_set_order` — ``"average"`` (UPGMA,
        default), ``"complete"``, or ``"single"``.
    show_row_dendrogram, show_col_dendrogram
        Whether to draw the corresponding dendrogram band. When ``False``,
        the band is omitted from layout entirely (no reserved gap).
    dendrogram_fraction
        Fraction of the grid extent reserved per dendrogram band (default
        ``0.12``, minimum effective height 20 pixels). Matches the
        webtool's ``dendrogramFraction`` option.

    Returns
    -------
    SvgImage
        The rendered heatmap; ``width`` and ``height`` are set from the
        computed layout extents.
    """
    from venn_diagram_lab.cluster import (  # noqa: PLC0415
        LinkageMethod,
        cluster_set_order,
    )

    set_names = list(result.dataset.set_names)
    n_sets = len(set_names)
    set_letters = list(_LETTERS[:n_sets])

    distance = _jaccard_distance_matrix(result)
    cluster = cluster_set_order(distance, method=linkage)  # type: ignore[arg-type]
    _ = LinkageMethod  # keep type-import live for static checkers

    order = cluster.leaf_order if len(cluster.leaf_order) == n_sets else list(range(n_sets))
    merges = cluster.merges

    dendro_px = (
        max(20, round(n_sets * _HM_CELL * dendrogram_fraction))
        if (show_row_dendrogram or show_col_dendrogram)
        else 0
    )
    dendro_col_h = dendro_px + 6 if show_col_dendrogram and dendro_px > 0 else 0
    dendro_row_w = dendro_px + 6 if show_row_dendrogram and dendro_px > 0 else 0

    grid_x = _HM_LEFT_LABEL_W + dendro_row_w
    grid_y = _HM_TOP_LABEL_H + dendro_col_h
    grid_w = n_sets * _HM_CELL
    grid_h = n_sets * _HM_CELL

    width = grid_x + grid_w + _HM_PAD_R
    height = grid_y + grid_h + _HM_PAD_B

    parts: list[str] = []
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}">'
    )
    parts.append(f'<rect width="{width}" height="{height}" fill="#ffffff"/>')
    parts.append(
        f'<text x="{grid_x + grid_w / 2}" y="{_HM_PAD_T}" '
        f'fill="#555" font-family="Tahoma,sans-serif" font-size="10" '
        f'text-anchor="middle">Jaccard similarity</text>'
    )

    _append_hm_labels(parts, set_names, set_letters, order, grid_x, grid_y, n_sets)
    _append_hm_cells(parts, result.statistics.jaccard, order, grid_x, grid_y, n_sets)
    _append_hm_dendrograms(
        parts,
        merges=merges,
        order=order,
        n_sets=n_sets,
        grid_x=grid_x,
        grid_y=grid_y,
        dendro_px=dendro_px,
        dendro_col_h=dendro_col_h,
        dendro_row_w=dendro_row_w,
        show_row=show_row_dendrogram,
        show_col=show_col_dendrogram,
    )

    parts.append("</svg>")
    return SvgImage(svg="".join(parts), width=width, height=height)


def _append_hm_labels(
    parts: list[str],
    set_names: list[str],
    set_letters: list[str],
    order: list[int],
    grid_x: int,
    grid_y: int,
    n_sets: int,
) -> None:
    """Emit column (top, rotated -45) and row (left) labels for the cluster heatmap."""
    def _trim(name: str) -> str:
        return name[:_HM_NAME_TRIM] if len(name) > _HM_NAME_TRIM else name

    trimmed = [f"{_trim(set_names[i])} ({set_letters[i]})" for i in range(n_sets)]
    for c in range(n_sets):
        ci = order[c]
        cx = grid_x + c * _HM_CELL + _HM_CELL / 2
        cy = grid_y - 6
        parts.append(
            f'<text x="{cx}" y="{cy}" fill="#222" font-family="Tahoma,sans-serif" '
            f'font-size="7" text-anchor="start" '
            f'transform="rotate(-45 {cx} {cy})">{trimmed[ci]}</text>'
        )
    for r in range(n_sets):
        ri = order[r]
        ly = grid_y + r * _HM_CELL + _HM_CELL / 2
        parts.append(
            f'<text x="{grid_x - 6}" y="{ly + 3}" fill="#222" '
            f'font-family="Tahoma,sans-serif" font-size="7" text-anchor="end">'
            f"{trimmed[ri]}</text>"
        )


def _append_hm_cells(
    parts: list[str],
    jacc: pd.DataFrame,
    order: list[int],
    grid_x: int,
    grid_y: int,
    n_sets: int,
) -> None:
    """Emit the NxN heatmap cells, with diagonal marked and off-diagonal filled."""
    scale_max = 1.0  # Jaccard is in [0, 1].
    for r in range(n_sets):
        ri = order[r]
        for c in range(n_sets):
            ci = order[c]
            x = grid_x + c * _HM_CELL
            y = grid_y + r * _HM_CELL
            if ri == ci:
                parts.append(
                    f'<rect data-diag="true" x="{x}" y="{y}" '
                    f'width="{_HM_CELL}" height="{_HM_CELL}" fill="#eeeeee" '
                    f'stroke="#e8e8e8" stroke-width="0.8"/>'
                )
                parts.append(
                    f'<text x="{x + _HM_CELL / 2}" y="{y + _HM_CELL / 2 + 3}" '
                    f'fill="#555" font-family="Tahoma,sans-serif" font-size="9" '
                    f'text-anchor="middle">—</text>'
                )
                continue
            # jacc.iat returns a pandas scalar; explicit cast tolerates any
            # numeric dtype across pandas-stubs versions (CI vs local).
            v = float(cast(float, jacc.iat[ri, ci])) if not jacc.empty else 0.0
            t = v / scale_max if scale_max > 0 else 0.0
            fill = _lerp_hex(_HM_GRAD_LOW, _HM_GRAD_HIGH, max(0.0, min(1.0, t)))
            parts.append(
                f'<rect x="{x}" y="{y}" width="{_HM_CELL}" height="{_HM_CELL}" '
                f'fill="{fill}" stroke="#e8e8e8" stroke-width="0.8"/>'
            )
            text_color = "#ffffff" if t > _HM_TEXT_LIGHT_THRESHOLD else "#222"
            parts.append(
                f'<text x="{x + _HM_CELL / 2}" y="{y + _HM_CELL / 2 + 3}" '
                f'fill="{text_color}" font-family="Tahoma,sans-serif" '
                f'font-size="8" text-anchor="middle">{v:.2f}</text>'
            )


def _append_hm_dendrograms(
    parts: list[str],
    *,
    merges: list[Merge],
    order: list[int],
    n_sets: int,
    grid_x: int,
    grid_y: int,
    dendro_px: int,
    dendro_col_h: int,
    dendro_row_w: int,
    show_row: bool,
    show_col: bool,
) -> None:
    """Emit `<g class="hm-dendro-col">` and/or `<g class="hm-dendro-row">` overlays.

    Mirrors the cluster overlay block in
    ``buildEnrichmentHeatmapSvg`` (enrichmentPlotSvg.ts).
    """
    if not (show_row or show_col) or n_sets < _MIN_SETS_FOR_CLUSTER or not merges:
        return

    max_height = max((m.height for m in merges), default=0.0) or 1.0
    stroke = "#555"

    # Position map: leaf k has visual position order.index(k); each
    # internal node id = n_sets + mi carries the merged children.
    positions_by_id: dict[int, list[float]] = {
        k: [float(order.index(k))] for k in range(n_sets)
    }
    merge_pos: list[float] = []
    for mi, m in enumerate(merges):
        left_pos = positions_by_id.get(m.left, [])
        right_pos = positions_by_id.get(m.right, [])
        positions_by_id[n_sets + mi] = left_pos + right_pos
        left_mean = sum(left_pos) / len(left_pos) if left_pos else 0.0
        right_mean = sum(right_pos) / len(right_pos) if right_pos else 0.0
        merge_pos.append((left_mean + right_mean) / 2.0)

    def _node_pos(node_id: int) -> float:
        if node_id < n_sets:
            return float(order.index(node_id))
        return merge_pos[node_id - n_sets]

    def _node_height(node_id: int) -> float:
        if node_id < n_sets:
            return 0.0
        return float(merges[node_id - n_sets].height)

    if show_col and dendro_col_h > 0:
        band_top = _HM_PAD_T + 6
        band_bottom = band_top + dendro_px
        parts.append(
            f'<g class="hm-dendro-col" stroke="{stroke}" '
            f'stroke-width="1" fill="none">'
        )
        for m in merges:
            x_left = grid_x + _node_pos(m.left) * _HM_CELL + _HM_CELL / 2
            x_right = grid_x + _node_pos(m.right) * _HM_CELL + _HM_CELL / 2
            y_left_child = band_bottom - (_node_height(m.left) / max_height) * (
                band_bottom - band_top
            )
            y_right_child = band_bottom - (_node_height(m.right) / max_height) * (
                band_bottom - band_top
            )
            y_merge = band_bottom - (m.height / max_height) * (band_bottom - band_top)
            parts.append(
                f'<line x1="{x_left}" y1="{y_left_child}" '
                f'x2="{x_left}" y2="{y_merge}"/>'
            )
            parts.append(
                f'<line x1="{x_right}" y1="{y_right_child}" '
                f'x2="{x_right}" y2="{y_merge}"/>'
            )
            parts.append(
                f'<line x1="{x_left}" y1="{y_merge}" '
                f'x2="{x_right}" y2="{y_merge}"/>'
            )
        parts.append("</g>")

    if show_row and dendro_row_w > 0:
        left_pad = 6
        band_left = left_pad
        band_right = left_pad + dendro_px
        parts.append(
            f'<g class="hm-dendro-row" stroke="{stroke}" '
            f'stroke-width="1" fill="none">'
        )
        for m in merges:
            y_top = grid_y + _node_pos(m.left) * _HM_CELL + _HM_CELL / 2
            y_bot = grid_y + _node_pos(m.right) * _HM_CELL + _HM_CELL / 2
            x_left_child = band_right - (_node_height(m.left) / max_height) * (
                band_right - band_left
            )
            x_right_child = band_right - (_node_height(m.right) / max_height) * (
                band_right - band_left
            )
            x_merge = band_right - (m.height / max_height) * (band_right - band_left)
            parts.append(
                f'<line x1="{x_left_child}" y1="{y_top}" '
                f'x2="{x_merge}" y2="{y_top}"/>'
            )
            parts.append(
                f'<line x1="{x_right_child}" y1="{y_bot}" '
                f'x2="{x_merge}" y2="{y_bot}"/>'
            )
            parts.append(
                f'<line x1="{x_merge}" y1="{y_top}" '
                f'x2="{x_merge}" y2="{y_bot}"/>'
            )
        parts.append("</g>")
