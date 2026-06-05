"""Multi-page PDF report (matplotlib PdfPages composition)."""

from __future__ import annotations

import io
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, cast

import matplotlib.image as mpimg
import matplotlib.pyplot as plt
from matplotlib.figure import Figure

from venn_diagram_lab.version import __version__

# Minimum set count for pairwise statistics (need at least 2 sets to form a pair).
_MIN_SETS_FOR_STATS = 2

if TYPE_CHECKING:
    import pandas as pd
    from matplotlib.axes import Axes

    from venn_diagram_lab.analysis import RegionResult

# US Letter landscape, in inches.
_PAGE_WIDTH = 11.0
_PAGE_HEIGHT = 8.5

# Standard 9-set color palette (matches the 44 model SVGs and proportional renderer).
_DEFAULT_COLORS = (
    "#FFF200", "#2E3192", "#ED1C24", "#808285", "#3C2415",
    "#9E1F63", "#CA4B9B", "#21AED1", "#F7941E",
)

# PNG render resolution.
_DPI = 300
_MAX_UPSET_COLUMNS = 20

# Layout fractions for the 2-panel page (left venn, right upset).
_VENN_LEFT = 0.02
_VENN_BOTTOM = 0.05
_VENN_WIDTH = 0.48
_VENN_HEIGHT = 0.9
_UPSET_LEFT = 0.52
_UPSET_BOTTOM = 0.05
_UPSET_WIDTH = 0.46
_UPSET_HEIGHT = 0.9


_LETTERS = "ABCDEFGHI"
_NAME_FULL_MAX = 30   # truncate to 30 chars + "*" footnote
_NAME_SHORT_MAX = 10  # short form: first 10 chars + " (X)"


def _format_timestamp() -> str:
    """Format current UTC time as '3 May 2026 10:23:53' (no zero-padded day)."""
    now = datetime.now(timezone.utc)
    day = now.strftime("%d").lstrip("0")
    return f"{day} {now.strftime('%B %Y %H:%M:%S')} UTC"


def _short_name(name: str, letter: str) -> str:
    """Mirror web tool's trimmedNames: first 10 chars + ' (X)'."""
    short = name[:_NAME_SHORT_MAX] if len(name) > _NAME_SHORT_MAX else name
    return f"{short} ({letter})"


def _overview_metadata_rows(result: RegionResult) -> list[tuple[str, str]]:
    """Return the 11-field Data Overview rows in the web tool's order.

    Mirrors src/utils/pdfReport.ts overviewRows. For aggregated/from_dict
    datasets without a `universe_size`, falls back to |union of items|.
    """
    n = len(result.dataset.set_names)
    letters = _LETTERS[:n]
    full_label = "".join(letters)
    full_mask = (1 << n) - 1
    core_region = result.regions.get(full_mask)
    core_count = core_region.exclusive_count if core_region else 0

    largest_label = ""
    largest_count = 0
    empty_regions = 0
    filled_regions = 0
    for mask in range(1, 1 << n):
        label = "".join(letters[i] for i in range(n) if mask & (1 << i))
        region = result.regions.get(mask)
        count = region.exclusive_count if region else 0
        if count > largest_count:
            largest_count = count
            largest_label = label
        if count == 0:
            empty_regions += 1
        else:
            filled_regions += 1
    total_regions = (1 << n) - 1

    universe = result.effective_universe()
    items_assigned = sum(r.exclusive_count for r in result.regions.values())

    source_path = result.dataset.source_path
    source_file = source_path.rsplit("/", 1)[-1] if source_path else "(in-memory)"

    # Source data rows = csv.rows.length on web side. For binary CSV/TSV we
    # have it as universe_size; for aggregated/GMT/GMX/from_dict we expose
    # |unique items| from item_order as a close approximation.
    if result.dataset.universe_size is not None:
        source_data_rows = result.dataset.universe_size
    else:
        source_data_rows = len(result.dataset.item_order)

    return [
        ("Date", _format_timestamp()),
        ("Source file", source_file),
        ("Source data rows", str(source_data_rows)),
        ("Background universe", str(universe)),
        ("Items assigned to Venn regions", str(items_assigned)),
        ("Number of sets", str(n)),
        ("Total regions", str(total_regions)),
        (f"Core intersection ({full_label})", str(core_count)),
        ("Largest exclusive region", f"{largest_label} ({largest_count})"),
        ("Filled regions", f"{filled_regions} / {total_regions}"),
        ("Empty regions", f"{empty_regions} / {total_regions}"),
    ]


def _set_sizes_rows(result: RegionResult) -> tuple[list[list[str]], list[str]]:
    """Return (table_rows, truncated_full_names) for the 7-column Set Sizes table.

    Columns: Set, Name, Name (short), Size, Exclusive, Inclusive, %.
    "Inclusive" here means items in this set AND in at least one other (= size - exclusive),
    matching the web tool's terminology in the same table.
    """
    n = len(result.dataset.set_names)
    letters = _LETTERS[:n]
    inclusive_total = sum(result.set_sizes[name] for name in result.dataset.set_names)

    rows: list[list[str]] = []
    truncated: list[str] = []
    for i, name in enumerate(result.dataset.set_names):
        letter = letters[i]
        size = result.set_sizes[name]
        only_mask = 1 << i
        only_region = result.regions.get(only_mask)
        excl = only_region.exclusive_count if only_region else 0
        incl = size - excl
        pct = f"{(size / inclusive_total * 100):.1f}%" if inclusive_total > 0 else "0%"

        if len(name) > _NAME_FULL_MAX:
            full_display = name[:_NAME_FULL_MAX] + "*"
            truncated.append(f"{letter}: {name}")
        else:
            full_display = name

        rows.append([
            letter, full_display, _short_name(name, letter),
            str(size), str(excl), str(incl), pct,
        ])
    return rows, truncated


def _build_overview_page(result: RegionResult, *, title: str | None = None) -> Figure:
    """Page 1: Data Overview block + Set Sizes pie + 7-column table.

    Layout mirrors src/utils/pdfReport.ts page 1 (top to bottom):
      Title -> Subtitle -> Data Overview (label/value list)
      -> Set Sizes section heading -> pie chart -> table -> footnote.
    """
    fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))

    n = len(result.dataset.set_names)
    set_names = list(result.dataset.set_names)
    letters = _LETTERS[:n]
    sizes = [result.set_sizes[name] for name in set_names]
    colors = list(_DEFAULT_COLORS[:n])

    # ── Title (centered) ──
    fig.text(0.5, 0.95, title or "Data Report", ha="center",
             fontsize=20, fontweight="bold", color=(0.08, 0.08, 0.24))
    # Subtitle: model display
    fig.text(0.5, 0.91, f"Model: {result.model}",
             ha="center", fontsize=10, color="#666666")

    # ── Data Overview (left half) ──
    ax_overview = fig.add_axes((0.05, 0.40, 0.40, 0.50))
    ax_overview.set_axis_off()
    ax_overview.text(0.0, 1.0, "Data Overview",
                     fontsize=13, fontweight="bold", color=(0.08, 0.08, 0.24),
                     transform=ax_overview.transAxes)
    # Underline (visual rule)
    ax_overview.plot([0.0, 1.0], [0.965, 0.965], transform=ax_overview.transAxes,
                     color="#cccccc", linewidth=0.5)
    rows = _overview_metadata_rows(result)
    line_pitch = 0.072  # 11 rows x 0.072 ~ 0.79 of axes height
    for i, (label, value) in enumerate(rows):
        y = 0.92 - i * line_pitch
        ax_overview.text(0.0, y, f"{label}:", fontsize=9, color="#404040",
                         transform=ax_overview.transAxes)
        ax_overview.text(0.50, y, value, fontsize=9, fontweight="bold", color="#202020",
                         transform=ax_overview.transAxes)

    # ── Set Sizes pie chart (right half, top) ──
    ax_pie = fig.add_axes((0.55, 0.40, 0.40, 0.45))
    pie_labels = [_short_name(name, letters[i]) for i, name in enumerate(set_names)]
    ax_pie.pie(sizes, labels=pie_labels, colors=colors,
               autopct="%1.1f%%", startangle=90,
               textprops={"fontsize": 8})
    ax_pie.set_title("Set sizes", fontsize=11, fontweight="bold")

    # ── Set Sizes table (bottom span) ──
    table_rows, truncated = _set_sizes_rows(result)
    ax_table = fig.add_axes((0.05, 0.08, 0.90, 0.28))
    ax_table.set_axis_off()
    ax_table.text(0.0, 1.05, "Set Sizes",
                  fontsize=13, fontweight="bold", color=(0.08, 0.08, 0.24),
                  transform=ax_table.transAxes)
    ax_table.plot([0.0, 1.0], [1.04, 1.04], transform=ax_table.transAxes,
                  color="#cccccc", linewidth=0.5)
    headers = ["Set", "Name", "Name (short)", "Size", "Exclusive", "Inclusive", "%"]
    table = ax_table.table(
        cellText=table_rows, colLabels=headers,
        loc="upper left", cellLoc="left",
        colWidths=[0.05, 0.30, 0.20, 0.10, 0.10, 0.10, 0.10],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1.0, 1.4)
    # Style header row: bold + grey background
    for col_idx in range(len(headers)):
        header_cell = table[0, col_idx]
        header_cell.set_text_props(fontweight="bold")
        header_cell.set_facecolor("#dddddd")
    # Right-align numeric columns (Size, Exclusive, Inclusive, %)
    for row_idx in range(1, len(table_rows) + 1):
        for col_idx in (3, 4, 5, 6):
            table[row_idx, col_idx].set_text_props(ha="right")

    # ── Truncated names footnote ──
    if truncated:
        footnote = "* Names truncated for display. Full names: " + ", ".join(truncated) + "."
        fig.text(0.05, 0.05, footnote, fontsize=6, style="italic", color="#888888",
                 wrap=True)

    return fig


def _figure_to_png_bytes(fig: Figure, *, dpi: int = _DPI) -> bytes:
    """Render a matplotlib Figure to PNG bytes via savefig + BytesIO."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight")
    buf.seek(0)
    return buf.getvalue()


def _svg_string_to_png_bytes(svg: str, *, dpi: int = _DPI) -> bytes:
    """Convert an SVG string to PNG bytes via cairosvg."""
    import cairosvg  # noqa: PLC0415

    # cairosvg.svg2png(write_to=None) returns bytes; the stub-less return type is Any.
    raw = cairosvg.svg2png(bytestring=svg.encode("utf-8"), dpi=dpi)
    if not isinstance(raw, bytes):  # safety: cairosvg may return None on misuse
        raise TypeError(f"cairosvg.svg2png returned {type(raw).__name__}, expected bytes")
    return raw


def _build_venn_upset_page(result: RegionResult) -> Figure:
    """Page 2: Venn diagram (left) + UpSet plot (right) -- both as imshow panels.

    Renders each component to PNG bytes (cairosvg for venn, savefig for upset),
    then displays as imshow on a 2-panel matplotlib figure. Pixel-accurate
    reproduction of the source SVG/Figure at 300 dpi.
    """
    venn_img = result.render_venn()
    venn_png = _svg_string_to_png_bytes(venn_img.svg, dpi=_DPI)
    venn_arr = mpimg.imread(io.BytesIO(venn_png), format="png")

    upset_img = result.render_upset(max_columns=_MAX_UPSET_COLUMNS)
    upset_png = _figure_to_png_bytes(upset_img.fig, dpi=_DPI)
    upset_arr = mpimg.imread(io.BytesIO(upset_png), format="png")
    plt.close(upset_img.fig)  # Free the source figure; we have the PNG.

    fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
    ax_venn = fig.add_axes((_VENN_LEFT, _VENN_BOTTOM, _VENN_WIDTH, _VENN_HEIGHT))
    ax_venn.imshow(venn_arr)
    ax_venn.set_axis_off()

    ax_upset = fig.add_axes((_UPSET_LEFT, _UPSET_BOTTOM, _UPSET_WIDTH, _UPSET_HEIGHT))
    ax_upset.imshow(upset_arr)
    ax_upset.set_axis_off()

    return fig


# ---------------------------------------------------------------------------
# Statistics pages (Jaccard / Dice / Hypergeometric + BH-FDR)
# ---------------------------------------------------------------------------

# 2-6 sets fit on one page with all three tables; 7+ need a page per table.
_STATS_ONE_PAGE_MAX_SETS = 6

# FDR cell colors (match web tool).
_FDR_HIGHLY_SIG_BG = "#ffcccc"  # p_adjusted < 0.001
_FDR_SIG_BG = "#fff0f0"         # p_adjusted < 0.05
_FDR_NOT_SIG_BG = "#ffffff"     # not significant

_HIGHLY_SIG_THRESHOLD = 0.001
_SIG_THRESHOLD = 0.05

# Layout rectangles for the one-page combined layout (left=Jaccard, right=Dice, bottom=Hyp).
_COMBINED_JACCARD_RECT = (0.05, 0.65, 0.4, 0.25)
_COMBINED_DICE_RECT = (0.55, 0.65, 0.4, 0.25)
_COMBINED_HYP_RECT = (0.05, 0.05, 0.9, 0.55)

# Layout rectangle for the per-page (7+ sets) single-table layout.
_FULL_PAGE_RECT = (0.05, 0.05, 0.9, 0.85)


def _format_p(p: float) -> str:
    """Format a p-value: scientific notation if very small, else 3 decimal places."""
    if p < _HIGHLY_SIG_THRESHOLD:
        return f"{p:.2e}"
    return f"{p:.3f}"


def _build_table_axes(
    fig: Figure, rect: tuple[float, float, float, float], title: str,
) -> Axes:
    """Add a transparent axes at `rect` with the given title rendered above it."""
    ax = fig.add_axes(rect)
    ax.set_axis_off()
    ax.set_title(title, fontsize=12, fontweight="bold", loc="left")
    return ax


def _draw_square_metric_table(
    fig: Figure,
    df: pd.DataFrame,
    *,
    rect: tuple[float, float, float, float],
    title: str,
) -> None:
    """Draw an N x N pairwise metric table (Jaccard or Dice) on the figure."""
    ax = _build_table_axes(fig, rect, title)
    rows = list(df.index)
    cols = list(df.columns)
    cell_text = []
    for r in rows:
        cell_text.append([
            f"{df.loc[r, c]:.3f}" if isinstance(df.loc[r, c], float) else str(df.loc[r, c])
            for c in cols
        ])
    table = ax.table(
        cellText=cell_text,
        rowLabels=rows,
        colLabels=cols,
        loc="center",
        cellLoc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)


def _draw_hypergeometric_table(
    fig: Figure,
    df: pd.DataFrame,
    *,
    rect: tuple[float, float, float, float],
    title: str,
) -> None:
    """Draw the long-form hypergeometric pairwise table with FDR-based cell colors."""
    ax = _build_table_axes(fig, rect, title)
    columns = ["set_a", "set_b", "intersection", "expected", "p_value", "p_adjusted", "significant"]
    cell_text = []
    cell_colours = []
    for _, row in df.iterrows():
        cell_text.append([
            str(row["set_a"]),
            str(row["set_b"]),
            str(row["intersection"]),
            f"{row['expected']:.2f}",
            _format_p(row["p_value"]),
            _format_p(row["p_adjusted"]),
            "yes" if row["significant"] else "no",
        ])
        adj = row["p_adjusted"]
        if adj < _HIGHLY_SIG_THRESHOLD:
            bg = _FDR_HIGHLY_SIG_BG
        elif adj < _SIG_THRESHOLD:
            bg = _FDR_SIG_BG
        else:
            bg = _FDR_NOT_SIG_BG
        cell_colours.append([bg] * len(columns))
    table = ax.table(
        cellText=cell_text,
        colLabels=columns,
        cellColours=cell_colours,
        loc="center",
        cellLoc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)


# Layout rectangles for the network page (left = network image, right = edges list).
_NET_IMG_RECT = (0.02, 0.05, 0.55, 0.9)
_NET_LIST_RECT = (0.6, 0.05, 0.38, 0.9)

# Typography constants for the edges list.
_NET_HEADER_FONTSIZE = 12
_NET_LINE_FONTSIZE = 10
_NET_HEADER_Y = 0.97
_NET_NO_SIG_Y = 0.85
_NET_LINE_Y_START = 0.92
_NET_LINE_Y_STEP = 0.04
_NET_LINE_Y_MIN = 0.05

# FDR significance threshold for the edges list.
_NET_SIG_FDR = 0.05


def _build_network_page(result: RegionResult) -> Figure:
    """Page n-1: Network plot (left) + significant-edges list (right)."""
    net_img = result.render_network()
    net_png = _figure_to_png_bytes(net_img.fig, dpi=_DPI)
    net_arr = mpimg.imread(io.BytesIO(net_png), format="png")
    plt.close(net_img.fig)

    fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
    fig.suptitle("Set Relationship Network", fontsize=14, fontweight="bold")

    ax_net = fig.add_axes(_NET_IMG_RECT)
    ax_net.imshow(net_arr)
    ax_net.set_axis_off()

    # Edges list (significant only).
    ax_list = fig.add_axes(_NET_LIST_RECT)
    ax_list.set_axis_off()
    ax_list.text(0.0, _NET_HEADER_Y, "Significant edges (FDR < 0.05)",
                 fontsize=_NET_HEADER_FONTSIZE, fontweight="bold", va="top")

    edges = result.statistics.hypergeometric
    sig_edges = edges[edges["significant"]].sort_values("p_adjusted")
    if len(sig_edges) == 0:
        ax_list.text(0.0, _NET_NO_SIG_Y, "No significant edges at FDR < 0.05",
                     fontsize=_NET_LINE_FONTSIZE, va="top")
    else:
        for i, (_, row) in enumerate(sig_edges.iterrows(), start=1):
            jaccard_val = result.statistics.jaccard.loc[row["set_a"], row["set_b"]]
            line = (
                f"{row['set_a']} <-> {row['set_b']}  |  "
                f"intersection={row['intersection']}  Jaccard={jaccard_val:.3f}  "
                f"FDR={_format_p(row['p_adjusted'])}"
            )
            y = _NET_LINE_Y_START - i * _NET_LINE_Y_STEP
            if y < _NET_LINE_Y_MIN:
                ax_list.text(0.0, y, "...", fontsize=_NET_LINE_FONTSIZE, va="top")
                break
            ax_list.text(0.0, y, line, fontsize=_NET_LINE_FONTSIZE, va="top")

    return fig


# ---------------------------------------------------------------------------
# Item Share Distribution page (v2.2.3 — matches webtool's v2.2.2 PDF page)
# ---------------------------------------------------------------------------

# Layout: histogram image (left ~60%) + per-bin breakdown table (right ~38%);
# explanatory paragraph occupies the bottom band.
_SHARE_IMG_RECT = (0.04, 0.30, 0.55, 0.60)
_SHARE_TABLE_RECT = (0.62, 0.30, 0.34, 0.60)
_SHARE_TEXT_RECT = (0.05, 0.05, 0.90, 0.20)

_SHARE_EXPLAIN_TEXT = (
    "Item Share Distribution\n\n"
    "Counts how many items are shared by exactly k sets, for k = 1..N. "
    "The leftmost bar (k = 1) is the number of items unique to a single set; "
    "the rightmost bar (k = N) is the number of items shared by every set. "
    "Tall left bars indicate set-specific signal; tall right bars indicate a "
    "core shared by all sets. Bars use a tier-coloured gradient from "
    "low (orange) to high (purple) membership."
)


def _build_share_distribution_page(result: RegionResult) -> Figure:
    """Page: Item Share Distribution histogram + per-bin breakdown table.

    Mirrors the webtool's v2.2.2 PDF "Item Share Distribution" page: the
    SVG histogram (rendered via :func:`render_share_distribution_svg` and
    rasterised through cairosvg) sits on the left; a per-bin breakdown
    table sits on the right; an explanatory paragraph runs along the
    bottom.
    """
    from venn_diagram_lab.render.svg import (  # noqa: PLC0415
        render_share_distribution_svg,
    )
    from venn_diagram_lab.share_distribution import (  # noqa: PLC0415
        item_share_distribution,
    )

    fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
    fig.suptitle("Item Share Distribution", fontsize=15, fontweight="bold", y=0.97)

    # Histogram (SVG → PNG → imshow).
    sd_img = render_share_distribution_svg(result.dataset)
    sd_png = _svg_string_to_png_bytes(sd_img.svg, dpi=_DPI)
    sd_arr = mpimg.imread(io.BytesIO(sd_png), format="png")
    ax_img = fig.add_axes(_SHARE_IMG_RECT)
    ax_img.imshow(sd_arr)
    ax_img.set_axis_off()

    # Per-bin breakdown table.
    n = len(result.dataset.set_names)
    # Build the binary matrix the same way render_share_distribution_svg does.
    from venn_diagram_lab.render.svg import _dataset_to_binary_matrix  # noqa: PLC0415

    matrix = _dataset_to_binary_matrix(result.dataset)
    dist = item_share_distribution(matrix)
    total_items = sum(dist.values())

    table_rows = []
    for k in range(1, n + 1):
        count = dist.get(k, 0)
        pct = f"{(count / total_items * 100):.1f}%" if total_items > 0 else "0.0%"
        label = "1 set" if k == 1 else f"{k} sets"
        table_rows.append([label, str(count), pct])

    ax_table = fig.add_axes(_SHARE_TABLE_RECT)
    ax_table.set_axis_off()
    ax_table.text(0.0, 1.05, "Per-bin breakdown",
                  fontsize=11, fontweight="bold", color=(0.08, 0.08, 0.24),
                  transform=ax_table.transAxes)
    ax_table.plot([0.0, 1.0], [1.04, 1.04], transform=ax_table.transAxes,
                  color="#cccccc", linewidth=0.5)
    headers = ["Membership", "Items", "%"]
    table = ax_table.table(
        cellText=table_rows, colLabels=headers,
        loc="upper left", cellLoc="left",
        colWidths=[0.45, 0.30, 0.25],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1.0, 1.4)
    for col_idx in range(len(headers)):
        header_cell = table[0, col_idx]
        header_cell.set_text_props(fontweight="bold")
        header_cell.set_facecolor("#dddddd")
    for row_idx in range(1, len(table_rows) + 1):
        for col_idx in (1, 2):
            table[row_idx, col_idx].set_text_props(ha="right")

    # Bottom explanatory paragraph.
    ax_text = fig.add_axes(_SHARE_TEXT_RECT)
    ax_text.set_axis_off()
    ax_text.text(
        0.0, 1.0, _SHARE_EXPLAIN_TEXT,
        fontsize=9, va="top", wrap=True, color="#333333",
        transform=ax_text.transAxes,
    )

    return fig


# ---------------------------------------------------------------------------
# Cluster heatmap page (v2.2.3 — opt-in via render_pdf_report(cluster_heatmap=True))
# ---------------------------------------------------------------------------

_HEATMAP_RECT = (0.10, 0.10, 0.80, 0.78)


def _build_cluster_heatmap_page(result: RegionResult) -> Figure:
    """Page: cluster-ordered Jaccard similarity heatmap with L-shaped dendrograms.

    Opt-in via ``render_pdf_report(result, ..., cluster_heatmap=True)`` (or
    ``--cluster-heatmap`` on the CLI). Renders the cluster-aware
    Jaccard heatmap from :func:`render_cluster_heatmap_svg` (average
    linkage) and rasterises it through cairosvg, mirroring the webtool's
    "Cluster mode" axis-order toggle on the PDF report.
    """
    from venn_diagram_lab.render.svg import (  # noqa: PLC0415
        render_cluster_heatmap_svg,
    )

    fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
    fig.suptitle(
        "Clustered Jaccard Similarity Heatmap",
        fontsize=15, fontweight="bold", y=0.97,
    )

    hm_img = render_cluster_heatmap_svg(result, linkage="average")
    hm_png = _svg_string_to_png_bytes(hm_img.svg, dpi=_DPI)
    hm_arr = mpimg.imread(io.BytesIO(hm_png), format="png")

    ax = fig.add_axes(_HEATMAP_RECT)
    ax.imshow(hm_arr)
    ax.set_axis_off()
    return fig


# ---------------------------------------------------------------------------
# About / Credits page (v2.2.3 — mirrors the webtool's ABOUT_REPORT_SECTIONS
# byte-for-byte). 12 sections grouped into 3 bands (intro, plots, statistics)
# plus a Credits & Cite footer. Titles render in bold, bodies in plain weight,
# and the content auto-paginates across as many US Letter landscape pages as
# needed.
# ---------------------------------------------------------------------------

_ABOUT_SECTIONS: list[tuple[str, str]] = [
    # (title, body) — empty body means a group header.
    (
        "Venn Diagram Lab",
        "Venn Diagram Lab is an interactive tool for visualizing set "
        "relationships using Venn diagrams. It supports 2 to 9 overlapping "
        "sets across 44 diagram models, covering all major construction "
        "methods (Venn, Edwards, Anderson, Carroll, Bannier-Bodin, "
        "Grunbaum, Mamakani, and SUMO-Venn). Users can import their own "
        "datasets in CSV, TSV, GMT, or GMX format, map data columns to "
        "diagram sets, and generate intersection counts automatically. The "
        "tool calculates both exclusive counts (items belonging to exactly "
        "one specific combination of sets) and inclusive counts (items "
        "contained in every set of a given combination, regardless of "
        "whether they also appear in other sets).",
    ),
    ("Plots", ""),
    (
        "1. Venn Diagrams",
        "A Venn diagram displays all possible logical relations between a "
        "finite collection of sets. Each set is represented as a closed "
        "shape, and overlapping areas represent intersections -- items "
        "that belong to multiple sets simultaneously. For n sets, there "
        "are (2^n)-1 possible non-empty regions. The diagram allows "
        "researchers to visually identify which items are shared between "
        "groups, which are unique to a single group, and how extensively "
        "the groups overlap. In this report, exclusive region counts are "
        "shown: each item is counted exactly once, in the region "
        "corresponding to its precise combination of set memberships.",
    ),
    (
        "2. UpSet Plots",
        "An UpSet plot is a scalable alternative to Venn diagrams for "
        "quantifying set intersections. Instead of overlapping shapes, it "
        "uses a matrix layout: rows represent the sets, columns represent "
        "specific intersections, and filled dots connected by lines "
        "indicate which sets participate in each intersection. Vertical "
        "bars above the matrix show the size (item count) of each "
        "intersection, sorted by size in descending order. Horizontal "
        "bars on the left show the total size of each set. UpSet plots "
        "are particularly useful for more than 4 sets, where traditional "
        "Venn diagrams become visually complex. This report shows the "
        "top 20 intersections by size.",
    ),
    (
        "3. Set Relationship Network",
        "The network diagram is a force-directed graph that visualizes "
        "pairwise relationships between sets. Each node represents a "
        "set, sized proportionally to its cardinality and colored with "
        "the standard Venn color scheme. Edges connect pairs of sets "
        "that share items, with edge thickness proportional to the "
        "chosen weight metric (intersection count, Jaccard index, Fold "
        "Enrichment, or Overlap Coefficient). Edge color indicates "
        "statistical significance: green edges are significant "
        "(FDR < 0.05), grey edges are not. The layout is computed using "
        "a spring-embedder algorithm with repulsive forces between all "
        "nodes and attractive forces along edges. This visualization is "
        "especially useful for identifying clusters of related sets and "
        "understanding the overall topology of set relationships at a "
        "glance.",
    ),
    ("Statistics", ""),
    (
        "1. Pairwise Jaccard Index",
        "The Jaccard similarity index measures the overlap between two "
        "sets as the ratio of their intersection size to their union "
        "size: J(A,B) = |A inter B| / |A union B|. Values range from 0 "
        "(no shared items) to 1 (identical sets). A Jaccard index above "
        "0.7 suggests high similarity, while below 0.1 indicates very "
        "little overlap. The Overlap Coefficient is a related measure: "
        "OC(A,B) = |A inter B| / min(|A|, |B|), which is more useful "
        "when one set is much smaller than the other.",
    ),
    (
        "2. Sorensen-Dice Index",
        "The Sørensen-Dice coefficient is another similarity "
        "measure, defined as D(A,B) = 2*|A inter B| / (|A| + |B|). It "
        "gives more weight to shared items than the Jaccard index and "
        "is widely used in ecological and bioinformatics studies. Like "
        "Jaccard, values range from 0 to 1, with higher values "
        "indicating greater similarity between sets.",
    ),
    (
        "3. Intersection Enrichment (Hypergeometric Test)",
        "The hypergeometric test evaluates whether the observed overlap "
        "between two sets is greater than expected by chance. Given a "
        "total population of N items, where set A contains K items and "
        "set B contains n items, the test calculates the probability of "
        "observing k or more shared items under a random null model "
        "(sampling without replacement). The Fold Enrichment (FE) is "
        "the ratio of observed to expected overlap: "
        "FE = (k/n) / (K/N). An FE > 1 indicates more overlap than "
        "expected. The p-values are corrected for multiple testing "
        "using the Benjamini-Hochberg False Discovery Rate (FDR) "
        "method. Significance levels are marked as: *** (FDR < 0.001), "
        "** (FDR < 0.01), * (FDR < 0.05), ns (not significant).",
    ),
    (
        "4. Bar chart",
        "The bar chart plots one vertical bar per pair of sets. Bar "
        "height encodes -log10(FDR), so taller bars indicate more "
        "significant over-representation. Bars are coloured green when "
        "FDR < 0.05 and grey otherwise, and significance asterisks "
        "above each bar mark the classical thresholds: * (FDR < 0.05), "
        "** (FDR < 0.01), *** (FDR < 0.001). The bar chart is the most "
        "direct visual summary of which pairwise overlaps survive "
        "multiple-testing correction.",
    ),
    (
        "5. Lollipop chart",
        "The lollipop chart shares the x-axis and colour coding with "
        "the bar chart, but draws each pair as a thin stick topped by "
        "a dot. The stick length still encodes -log10(FDR), while the "
        "dot area is scaled by the observed intersection count. This "
        "double encoding highlights pairs that are both statistically "
        "significant and biologically sizeable: tall stick plus large "
        "dot. Small dots on tall sticks identify small-but-significant "
        "overlaps, while short sticks on large dots identify abundant "
        "overlaps that are nevertheless consistent with chance.",
    ),
    (
        "6. Heatmap",
        "The heatmap renders a symmetric n x n matrix of pairwise "
        "-log10(FDR) values. Each cell is shaded from white (no "
        "enrichment) to dark green (strong enrichment) according to a "
        "linear colour scale shown in the legend on the right. The "
        "diagonal is marked with an em-dash because a set is not "
        "tested against itself. The matrix is symmetric: the cell "
        "(A,B) and the cell (B,A) always share the same value. In the "
        "interactive Data-mode panel the same heatmap can be switched "
        "to display Fold Enrichment, using a white-to-purple scale "
        "instead.",
    ),
    (
        "7. Item Share Distribution",
        "For each set-membership count k = 1..N, the histogram shows "
        "how many items belong to exactly k sets. A right-skewed "
        "distribution indicates high redundancy across sets; a "
        "left-skewed distribution indicates set-specific items "
        "dominate. The accompanying breakdown table lists the exact "
        "item count and percentage share for each membership level.",
    ),
    (
        "8. Cluster Heatmap",
        "Rows and columns are reordered by hierarchical clustering on "
        "1 - Jaccard distance. The default linkage is average (UPGMA); "
        "single and complete linkage are also available. The "
        "dendrograms above and to the left of the grid show the "
        "cluster structure; closer joins indicate more similar set "
        "composition. The Original / Cluster toggle in the Data-mode "
        "panel controls which ordering is used in the live view and "
        "in this PDF.",
    ),
    (
        "Credits and Cite",
        "Venn Diagram Lab is developed and maintained by Zoltán "
        "Dul, Márton Ölbei, N. Shaun B. Thomas, Azeddine "
        "Si Ammour, and Attila Csikász-Nagy. The tool is "
        "open-source and free to use under the MIT License.\n\n"
        "Web tool:    https://venndiagramlab.org/\n"
        "GitHub:      https://github.com/ZoliQua/Venn-Diagram-Lab\n"
        "PyPI:        https://pypi.org/project/venn-diagram-lab/\n"
        "CRAN:        https://CRAN.R-project.org/package=vennDiagramLab\n"
        "Zenodo DOI:  10.5281/zenodo.19510813\n\n"
        "Citation:\n"
        "Dul Z., Ölbei M., Thomas N.S.B., Si Ammour A., "
        "Csikász-Nagy A. (2026). Venn Diagram Lab — "
        "Headless Venn diagram analysis and rendering. "
        "https://venndiagramlab.org/  doi:10.5281/zenodo.19510813",
    ),
]

# Layout constants for the About page.
_ABOUT_AX_LEFT = 0.05
_ABOUT_AX_BOTTOM = 0.05
_ABOUT_AX_WIDTH = 0.9
_ABOUT_AX_HEIGHT = 0.9
_ABOUT_TITLE_FONTSIZE = 11
_ABOUT_BODY_FONTSIZE = 9
# Vertical step per body wrap line (axes-fraction units).
_ABOUT_BODY_LINE_STEP = 0.018
# Extra spacing for the bold title row.
_ABOUT_TITLE_STEP = 0.025
# Vertical gap between consecutive sections.
_ABOUT_SECTION_GAP = 0.010
# Lower bound on the axes y-coordinate before we paginate to a new page.
# Slightly above 0 so the last line never collides with the footer.
_ABOUT_Y_MIN = 0.04
_ABOUT_Y_START = 0.97
# Per-page wrap width in characters (matches the 90% axes width on a
# US Letter landscape page at fontsize 9 for body text and 11 for title).
_ABOUT_BODY_WRAP = 115
_ABOUT_TITLE_WRAP = 100


def _wrap_paragraph(text: str, width: int) -> list[str]:
    """Wrap a paragraph preserving explicit ``\\n`` newlines.

    Each line in ``text.split("\\n")`` is wrapped independently via
    :func:`textwrap.wrap` (width = ``width``). Empty input lines become
    empty visual lines so URL / citation blocks keep their layout.
    """
    import textwrap  # noqa: PLC0415

    out: list[str] = []
    for raw_line in text.split("\n"):
        if not raw_line:
            out.append("")
            continue
        wrapped = textwrap.wrap(raw_line, width=width) or [""]
        out.extend(wrapped)
    return out


def _new_about_figure() -> tuple[Figure, Axes]:
    """Create a fresh About-page Figure + axes positioned for text layout."""
    fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
    fig.suptitle("About This Report", fontsize=15, fontweight="bold", y=0.985)
    ax = fig.add_axes(
        (_ABOUT_AX_LEFT, _ABOUT_AX_BOTTOM, _ABOUT_AX_WIDTH, _ABOUT_AX_HEIGHT),
    )
    ax.set_axis_off()
    return fig, ax


def _build_about_pages() -> list[Figure]:
    """Render :data:`_ABOUT_SECTIONS` across one or more US Letter pages.

    Titles render with ``fontweight='bold'`` (size 11) and bodies with
    ``fontweight='normal'`` (size 9). When the running y-cursor would drop
    below :data:`_ABOUT_Y_MIN` we open a new page and continue. Headers
    with empty bodies (e.g. ``("Plots", "")``) emit only a bold title.
    """
    pages: list[Figure] = []
    fig, ax = _new_about_figure()
    y = _ABOUT_Y_START

    for title, body in _ABOUT_SECTIONS:
        title_lines = _wrap_paragraph(title, _ABOUT_TITLE_WRAP)
        body_lines = _wrap_paragraph(body, _ABOUT_BODY_WRAP) if body else []
        # Cost = title rows + body rows + section gap.
        block_cost = (
            len(title_lines) * _ABOUT_TITLE_STEP
            + len(body_lines) * _ABOUT_BODY_LINE_STEP
            + _ABOUT_SECTION_GAP
        )
        if y - block_cost < _ABOUT_Y_MIN:
            pages.append(fig)
            fig, ax = _new_about_figure()
            y = _ABOUT_Y_START

        # Render title (bold).
        for line in title_lines:
            ax.text(
                0.0, y, line,
                fontsize=_ABOUT_TITLE_FONTSIZE, fontweight="bold",
                color=(0.12, 0.12, 0.32), va="top",
                transform=ax.transAxes,
            )
            y -= _ABOUT_TITLE_STEP

        # Render body (plain).
        for line in body_lines:
            if y - _ABOUT_BODY_LINE_STEP < _ABOUT_Y_MIN:
                pages.append(fig)
                fig, ax = _new_about_figure()
                y = _ABOUT_Y_START
            ax.text(
                0.0, y, line,
                fontsize=_ABOUT_BODY_FONTSIZE, fontweight="normal",
                color=(0.24, 0.24, 0.24), va="top",
                transform=ax.transAxes,
            )
            y -= _ABOUT_BODY_LINE_STEP

        y -= _ABOUT_SECTION_GAP

    pages.append(fig)
    return pages


def _build_about_page() -> Figure:
    """Back-compat shim: return only the first About page.

    Kept for legacy callers that expect a single Figure. New code should
    use :func:`_build_about_pages` and extend the page list directly.
    """
    return _build_about_pages()[0]


def _about_sections_to_plain_text() -> str:
    """Flatten :data:`_ABOUT_SECTIONS` to a single plain-text block.

    Used by the ZIP bundle's ``README.txt`` so the methodology text stays
    single-sourced with the PDF appendix. Titles render as their own line;
    body paragraphs follow on the next line; sections are separated by a
    blank line. Empty bodies (group headers) emit only the title.
    """
    parts: list[str] = []
    for title, body in _ABOUT_SECTIONS:
        parts.append(title)
        if body:
            parts.append("")
            parts.append(body)
        parts.append("")
    return "\n".join(parts).rstrip() + "\n"


# Back-compat: callers in cli/_report.py import this constant. Derive once
# at module-load time from the structured _ABOUT_SECTIONS so the README.txt
# bundle bodies always match the PDF page content.
_ABOUT_TEXT = _about_sections_to_plain_text()


# Long-form pair-table column widths (sum to 1.0).
_PAIR_W_LABEL = 0.32
_PAIR_W_NUM = 0.10

# Highlight colors mirroring the web tool's table backgrounds.
_JAC_HIGH = "#e8f5e9"   # jaccard >= JAC_HIGH_THRESHOLD (green)
_JAC_LOW = "#fce4ec"    # jaccard <= JAC_LOW_THRESHOLD (pink)
_ENR_VERY = "#e8f5e9"   # fdr < HIGHLY_SIG_THRESHOLD (green)
_ENR_SOME = "#fff8e1"   # fdr < SIG_THRESHOLD (light yellow)
_BG_DEFAULT = "#ffffff"

# Jaccard highlight thresholds (match web tool).
_JAC_HIGH_THRESHOLD = 0.7
_JAC_LOW_THRESHOLD = 0.1

# Three-tier significance thresholds (match web tool's sigLabel).
_SIG_VERY_THRESHOLD = 0.001
_SIG_MID_THRESHOLD = 0.01

# One-page-vs-split heuristic: max fraction of page height for stacked tables.
_ONE_PAGE_FILL_LIMIT = 0.80
_PER_ROW_HEIGHT = 0.024


def _sig_label(fdr: float) -> str:
    """Three-tier significance label matching the web tool."""
    if fdr < _SIG_VERY_THRESHOLD:
        return "***"
    if fdr < _SIG_MID_THRESHOLD:
        return "**"
    if fdr < _SIG_THRESHOLD:
        return "*"
    return "ns"


def _draw_pair_table(
    fig: Figure,
    rect: tuple[float, float, float, float],
    title: str,
    headers: list[str],
    cell_text: list[list[str]],
    col_widths: list[float],
    *,
    aligns: list[str] | None = None,
    row_bg_colors: list[str | None] | None = None,
    fontsize: int = 8,
) -> None:
    """Draw one long-form pair table inside `rect`.

    Mirrors the web tool's drawTable helper used by Pairwise Jaccard / Dice /
    Enrichment sections — single header row + body rows, optional per-row
    background highlight (e.g. green for high Jaccard, yellow for FDR < 0.05).
    """
    ax = fig.add_axes(rect)
    ax.set_axis_off()
    ax.text(0.0, 1.05, title,
            fontsize=11, fontweight="bold", color=(0.08, 0.08, 0.24),
            transform=ax.transAxes)
    ax.plot([0.0, 1.0], [1.04, 1.04], transform=ax.transAxes,
            color="#cccccc", linewidth=0.5)

    cell_colours = None
    if row_bg_colors is not None:
        cell_colours = [
            [bg if bg is not None else _BG_DEFAULT] * len(headers)
            for bg in row_bg_colors
        ]

    table = ax.table(
        cellText=cell_text,
        colLabels=headers,
        cellColours=cell_colours,
        loc="upper left",
        cellLoc="left",
        colWidths=col_widths,
    )
    table.auto_set_font_size(False)
    table.set_fontsize(fontsize)
    table.scale(1.0, 1.3)

    # Header styling.
    for col_idx in range(len(headers)):
        header_cell = table[0, col_idx]
        header_cell.set_text_props(fontweight="bold")
        header_cell.set_facecolor("#dddddd")

    # Per-column alignment.
    if aligns is not None:
        for row_idx in range(1, len(cell_text) + 1):
            for col_idx, align in enumerate(aligns):
                table[row_idx, col_idx].set_text_props(ha=align)


def _pair_label(set_a: str, set_b: str, set_names: list[str], letters: str) -> str:
    """Format 'NameA (A) - NameB (B)' for a hypergeometric row."""
    a_letter = letters[set_names.index(set_a)]
    b_letter = letters[set_names.index(set_b)]
    return f"{_short_name(set_a, a_letter)} - {_short_name(set_b, b_letter)}"


@dataclass(frozen=True)
class _PairRow:
    """One pair-row of derived stats — keeps mypy happy across the 3 section builders."""
    pair: str
    intersection: int
    union: int
    jaccard: float
    overlap: float
    dice: float
    expected: float
    fold_enrichment: float
    p_value: float
    fdr: float


def _pair_rows(result: RegionResult) -> list[_PairRow]:
    """Build the per-pair derived rows from the hypergeometric long-form table."""
    set_names = list(result.dataset.set_names)
    n = len(set_names)
    letters = _LETTERS[:n]
    stats = result.statistics
    out: list[_PairRow] = []
    for _, row in stats.hypergeometric.iterrows():
        a_name = str(row["set_a"])
        b_name = str(row["set_b"])
        size_a = result.set_sizes[a_name]
        size_b = result.set_sizes[b_name]
        inter = int(row["intersection"])
        out.append(_PairRow(
            pair=_pair_label(a_name, b_name, set_names, letters),
            intersection=inter,
            union=size_a + size_b - inter,
            jaccard=float(cast(float, stats.jaccard.loc[a_name, b_name])),
            overlap=float(cast(float, stats.overlap_coefficient.loc[a_name, b_name])),
            dice=float(cast(float, stats.dice.loc[a_name, b_name])),
            expected=float(row["expected"]),
            fold_enrichment=float(cast(float, stats.fold_enrichment.loc[a_name, b_name])),
            p_value=float(row["p_value"]),
            fdr=float(row["p_adjusted"]),
        ))
    return out


def _jaccard_section(rows: list[_PairRow]) -> tuple[
    str, list[str], list[list[str]], list[float], list[str], list[str | None],
]:
    """(title, headers, cell_text, col_widths, aligns, row_bg)."""
    headers = ["Pair", "Inter", "Union", "Jaccard", "Overlap"]
    widths = [_PAIR_W_LABEL, 0.10, 0.12, 0.13, 0.13]
    aligns = ["left", "right", "right", "right", "right"]
    text = [[r.pair, str(r.intersection), str(r.union),
             f"{r.jaccard:.4f}", f"{r.overlap:.4f}"] for r in rows]
    bg: list[str | None] = [
        _JAC_HIGH if r.jaccard >= _JAC_HIGH_THRESHOLD
        else _JAC_LOW if r.jaccard <= _JAC_LOW_THRESHOLD
        else None
        for r in rows
    ]
    return "Pairwise Jaccard Index", headers, text, widths, aligns, bg


def _dice_section(rows: list[_PairRow]) -> tuple[
    str, list[str], list[list[str]], list[float], list[str], list[str | None],
]:
    """(title, headers, cell_text, col_widths, aligns, row_bg)."""
    headers = ["Pair", "Dice"]
    widths = [0.55, 0.15]
    aligns = ["left", "right"]
    text = [[r.pair, f"{r.dice:.4f}"] for r in rows]
    return "Sørensen-Dice Index", headers, text, widths, aligns, [None] * len(rows)


def _enrichment_section(rows: list[_PairRow]) -> tuple[
    str, list[str], list[list[str]], list[float], list[str], list[str | None],
]:
    """(title, headers, cell_text, col_widths, aligns, row_bg)."""
    headers = ["Pair", "Obs", "Exp", "FE", "p-value", "FDR", "Sig"]
    widths = [0.28, 0.07, 0.09, 0.09, 0.13, 0.13, 0.07]
    aligns = ["left", "right", "right", "right", "right", "right", "center"]
    text = [[r.pair, str(r.intersection),
             f"{r.expected:.1f}", f"{r.fold_enrichment:.2f}",
             _format_p(r.p_value), _format_p(r.fdr), _sig_label(r.fdr)]
            for r in rows]
    bg: list[str | None] = [
        _ENR_VERY if r.fdr < _SIG_VERY_THRESHOLD
        else _ENR_SOME if r.fdr < _SIG_THRESHOLD
        else None
        for r in rows
    ]
    return "Intersection Enrichment (Hypergeometric Test)", headers, text, widths, aligns, bg


def _build_statistics_pages(result: RegionResult) -> list[Figure]:
    """Return Figure(s) carrying the three long-form pairwise tables, stacked.

    Mirrors src/utils/pdfReport.ts page 'Statistics':
      * Pairwise Jaccard Index (Pair, Inter, Union, Jaccard, Overlap)
      * Sorensen-Dice Index (Pair, Dice)
      * Intersection Enrichment (Pair, Obs, Exp, FE, p-value, FDR, Sig)

    For small pair counts all three fit on one page; for many pairs each table
    gets its own page to avoid crowding.
    """
    n = len(result.dataset.set_names)
    if n < _MIN_SETS_FOR_STATS:
        return []

    rows = _pair_rows(result)
    sections = [_jaccard_section(rows), _dice_section(rows), _enrichment_section(rows)]
    n_pairs = len(rows)
    pages: list[Figure] = []

    one_page = n_pairs * 3 * _PER_ROW_HEIGHT < _ONE_PAGE_FILL_LIMIT
    if one_page:
        fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
        fig.suptitle("Statistics", fontsize=15, fontweight="bold", y=0.97)
        section_h = 0.06 + n_pairs * _PER_ROW_HEIGHT
        gap = 0.025
        top = 0.92
        for idx, (title, headers, text, widths, aligns, bg) in enumerate(sections):
            bottom = top - (idx + 1) * section_h - idx * gap
            _draw_pair_table(fig, (0.05, bottom, 0.90, section_h),
                             title, headers, text, widths,
                             aligns=aligns, row_bg_colors=bg, fontsize=8)
        pages.append(fig)
    else:
        for title, headers, text, widths, aligns, bg in sections:
            fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
            fig.suptitle("Statistics", fontsize=15, fontweight="bold", y=0.97)
            _draw_pair_table(fig, (0.05, 0.05, 0.90, 0.86),
                             title, headers, text, widths,
                             aligns=aligns, row_bg_colors=bg, fontsize=8)
            pages.append(fig)

    return pages


# ---------------------------------------------------------------------------
# Footer constants.
# ---------------------------------------------------------------------------

_FOOTER_X = 0.5
_FOOTER_Y = 0.02
_FOOTER_FONTSIZE = 7
_FOOTER_COLOR = "#888888"


def _add_footer(fig: Figure, page_num: int, total_pages: int) -> None:
    """Add the standard footer to a page figure."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    footer = (
        f"vdl {__version__}  -  Generated {timestamp}"
        f"  -  page {page_num} of {total_pages}"
    )
    fig.text(_FOOTER_X, _FOOTER_Y, footer, fontsize=_FOOTER_FONTSIZE,
             color=_FOOTER_COLOR, ha="center")


def render_pdf_report(
    result: RegionResult,
    path: Path | str,
    *,
    title: str | None = None,
    include_network: bool = True,
    include_about: bool = True,
    cluster_heatmap: bool = False,
) -> None:
    """Compose all pages into a multi-page PDF report.

    The report structure (US Letter landscape):
    - Page 1: dataset overview — pie chart + set-size table.
    - Page 2: Venn diagram (left) + UpSet plot (right).
    - Page 3+: pairwise statistics (Jaccard, Dice, Hypergeometric+BH-FDR).
    - Page n-2: Item Share Distribution histogram + per-bin breakdown.
    - Optional: cluster-ordered Jaccard heatmap (when ``cluster_heatmap=True``).
    - Optional: set-relationship network page.
    - Optional: methodology / About page.

    Parameters
    ----------
    result : RegionResult from analyze()
    path : output PDF path (str or Path)
    title : optional override for the page-1 title
    include_network : if False, skip the network page
    include_about : if False, skip the methodology page
    cluster_heatmap : if True, append a cluster-ordered Jaccard heatmap page
        (mirrors the webtool's *Cluster* axis-order toggle on the PDF report);
        defaults to ``False`` to preserve byte-stable output for callers that
        rely on the original page count.

    Returns
    -------
    None
        Writes the PDF to *path*. All intermediate matplotlib figures are
        closed automatically after saving.
    """
    from matplotlib.backends.backend_pdf import PdfPages  # noqa: PLC0415  # lazy, ~400 KB

    p = Path(path)
    pages: list[Figure] = []

    pages.append(_build_overview_page(result, title=title))
    pages.append(_build_venn_upset_page(result))
    pages.extend(_build_statistics_pages(result))
    pages.append(_build_share_distribution_page(result))
    if cluster_heatmap and len(result.dataset.set_names) >= _MIN_SETS_FOR_STATS:
        pages.append(_build_cluster_heatmap_page(result))
    if include_network:
        pages.append(_build_network_page(result))
    if include_about:
        pages.extend(_build_about_pages())

    total = len(pages)
    for i, fig in enumerate(pages, start=1):
        _add_footer(fig, page_num=i, total_pages=total)

    with PdfPages(str(p)) as pdf:
        for fig in pages:
            pdf.savefig(fig)
            plt.close(fig)
