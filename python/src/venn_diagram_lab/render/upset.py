"""UpSet plot: 3-panel matplotlib visualization of set intersections."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import numpy as np

from venn_diagram_lab.render.image import MplImage

ColorMode = Literal["depth", "heatmap", "custom"]
SortBy = Literal["size", "degree"]


def _bar_colors(
    intersections: list[UpsetIntersection],
    mode: ColorMode,
    custom: Mapping[str, str] | None,
) -> list[str]:
    """Compute per-bar colors based on the selected color_mode."""
    if mode == "custom":
        custom = custom or {}
        return [custom.get(i.label, "#cccccc") for i in intersections]

    if mode == "heatmap":
        sizes = [i.size for i in intersections]
        if not sizes or max(sizes) == min(sizes):
            return ["#888888"] * len(intersections)
        cmap = plt.get_cmap("Reds")
        norm = mcolors.Normalize(vmin=min(sizes), vmax=max(sizes))
        return [mcolors.to_hex(cmap(norm(s))) for s in sizes]

    # depth (default): map degree to a viridis colormap.
    degrees = [len(i.members) for i in intersections]
    if not degrees or max(degrees) == min(degrees):
        return ["#444444"] * len(intersections)
    cmap = plt.get_cmap("viridis")
    norm = mcolors.Normalize(vmin=min(degrees), vmax=max(degrees))
    return [mcolors.to_hex(cmap(norm(d))) for d in degrees]


@dataclass(frozen=True)
class UpsetIntersection:
    """One row in the UpSet long-form table.

    members : ordered tuple of single-letter set ids (e.g. ('A', 'C'))
    size    : exclusive count of items in this exact intersection
    label   : concatenated members (e.g. 'AC')
    """

    members: tuple[str, ...]
    size: int
    label: str


@dataclass(frozen=True)
class UpsetData:
    """All non-empty intersections of a Venn analysis.

    sets : tuple of single-letter set ids (e.g. ('A', 'B', 'C'))
    intersections : tuple of UpsetIntersection in build-time order
    """

    sets: tuple[str, ...]
    intersections: tuple[UpsetIntersection, ...]


_LETTERS = "ABCDEFGHI"


def upset_data_from_region_result(result) -> UpsetData:  # type: ignore[no-untyped-def]
    """Build UpsetData from a Phase 1 RegionResult.

    Uses each region's ``exclusive_count`` (items in exactly these sets),
    matching the web tool's Data-mode UpSet (vs. View-mode which reads SVG
    Count_* text). Empty regions are omitted from the output.
    """
    n = len(result.dataset.set_names)
    sets = tuple(_LETTERS[:n])
    intersections: list[UpsetIntersection] = []
    for region in result.regions.values():
        if region.exclusive_count == 0:
            continue
        intersections.append(
            UpsetIntersection(
                members=tuple(_LETTERS[i] for i in region.set_indices),
                size=region.exclusive_count,
                label=region.label,
            )
        )
    return UpsetData(sets=sets, intersections=tuple(intersections))


def sort_by_size(data: UpsetData) -> list[UpsetIntersection]:
    """Sort intersections by size descending. Returns a new list."""
    return sorted(data.intersections, key=lambda i: i.size, reverse=True)


def sort_by_degree(data: UpsetData) -> list[UpsetIntersection]:
    """Sort by membership degree (ascending), then alphabetically by label."""
    return sorted(data.intersections, key=lambda i: (len(i.members), i.label))


def render_upset(  # type: ignore[no-untyped-def]
    result,
    *,
    max_columns: int = 20,
    sort_by: SortBy = "size",
    threshold: int | None = None,
    color_mode: ColorMode = "depth",
    colors: Mapping[str, str] | None = None,
) -> MplImage:
    """Render an UpSet plot (3-panel matplotlib) from a RegionResult.

    Parameters
    ----------
    result : RegionResult
    max_columns : int, default 20 -- limit displayed intersections (top by size).
    sort_by : "size" | "degree", default "size"
        Sort intersections by size descending, or by membership degree ascending.
    threshold : int | None, default None
        When set, exclude intersections with size strictly below this value.
    color_mode : "depth" | "heatmap" | "custom", default "depth"
        How to color the intersection bars.  "depth" maps degree to viridis;
        "heatmap" maps size to Reds; "custom" uses the *colors* mapping.
    colors : Mapping[str, str] | None
        Label-to-hex mapping used when color_mode="custom".
        Labels not present fall back to "#cccccc".
    """
    data = upset_data_from_region_result(result)
    sorter = sort_by_size if sort_by == "size" else sort_by_degree
    intersections = sorter(data)
    if threshold is not None:
        intersections = [i for i in intersections if i.size >= threshold]
    intersections = intersections[:max_columns]

    sets = list(data.sets)
    sizes = [i.size for i in intersections]
    labels = [i.label for i in intersections]
    set_sizes = {
        s: sum(i.size for i in data.intersections if s in i.members)
        for s in sets
    }

    n_cols = len(intersections)
    n_sets = len(sets)
    fig = plt.figure(
        figsize=(max(8, 0.5 * n_cols + 3), max(4, 0.4 * n_sets + 3))  # matplotlib sizing
    )
    gs = fig.add_gridspec(
        nrows=2,
        ncols=2,
        width_ratios=[1.5, max(4, n_cols)],  # matplotlib sizing
        height_ratios=[2, max(2, n_sets)],  # matplotlib sizing
        hspace=0.05,
        wspace=0.05,
    )
    ax_top = fig.add_subplot(gs[0, 1])
    ax_dot = fig.add_subplot(gs[1, 1])
    ax_left = fig.add_subplot(gs[1, 0])

    # Top: intersection size bars
    x = np.arange(n_cols)
    bar_colors = _bar_colors(intersections, color_mode, colors)
    ax_top.bar(x, sizes, color=bar_colors)
    ax_top.set_ylabel("Intersection size")
    ax_top.set_xticks([])
    ax_top.set_xlim(-0.5, n_cols - 0.5)
    for i, s in enumerate(sizes):
        ax_top.text(i, s, str(s), ha="center", va="bottom", fontsize=8)  # matplotlib styling

    # Middle: dot matrix
    for col, intersection in enumerate(intersections):
        for row, set_id in enumerate(sets):
            in_set = set_id in intersection.members
            ax_dot.scatter(
                col,
                row,
                s=80,  # matplotlib marker size
                c="#444444" if in_set else "#dddddd",
                zorder=2,
            )
        ys = [sets.index(s) for s in intersection.members]
        if len(ys) > 1:
            ax_dot.plot(
                [col, col],
                [min(ys), max(ys)],
                color="#444444",
                linewidth=1.5,  # matplotlib styling
                zorder=1,
            )
    ax_dot.set_yticks(range(n_sets))
    ax_dot.set_yticklabels(sets)
    ax_dot.set_xticks(range(n_cols))
    ax_dot.set_xticklabels(labels, rotation=45, ha="right", fontsize=8)  # matplotlib styling
    ax_dot.set_xlim(-0.5, n_cols - 0.5)
    ax_dot.set_ylim(-0.5, n_sets - 0.5)

    # Left: per-set total-size bars (horizontal, inverted so bars grow leftward)
    set_total = [set_sizes[s] for s in sets]
    ax_left.barh(range(n_sets), set_total, color="#888888")
    ax_left.invert_xaxis()
    ax_left.set_yticks([])
    ax_left.set_xlabel("Set size")

    fig.tight_layout()
    return MplImage(fig=fig)
