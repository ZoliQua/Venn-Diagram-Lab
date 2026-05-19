"""Region enumeration, model lookup, and the analyze() entry point.

A RegionResult bundles the per-region item membership (both exclusive and
inclusive variants), the model used, and a lazy StatisticsResult.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import cached_property, lru_cache
from importlib import resources
from os import PathLike
from pathlib import Path
from typing import TYPE_CHECKING

from venn_diagram_lab.errors import IncompatibleModelError, UnknownModelError
from venn_diagram_lab.io import Dataset

# Anything Path() accepts. Avoids importing every variant at every call site.
PathInput = str | PathLike[str]

if TYPE_CHECKING:
    from collections.abc import Mapping

    from venn_diagram_lab.render.image import MplImage
    from venn_diagram_lab.render.network import EdgeMetric
    from venn_diagram_lab.render.svg import SvgImage
    from venn_diagram_lab.render.upset import ColorMode, SortBy
    from venn_diagram_lab.statistics import StatisticsResult


@dataclass(frozen=True)
class RegionData:
    """One region in a Venn diagram.

    Bitmask convention: bit ``i`` set means "in set with index ``i``"
    (e.g. ``0b001`` = "set 0 only", ``0b011`` = "sets 0 AND 1"). Both
    exclusive and inclusive item lists are kept because the web tool
    surfaces both: "exclusive" = items in exactly these sets,
    "inclusive" = items in at least these sets.

    Attributes:
        bitmask: Region bitmask (1..2^n - 1).
        label: Human-readable label like ``"AB"`` or ``"ABC"``.
        set_indices: Indices of the sets in this region.
        set_names: Names of the sets in this region.
        exclusive_items: Items present in exactly these sets.
        inclusive_items: Items present in at least these sets.
    """

    bitmask: int
    label: str  # e.g. "ABC"
    set_indices: tuple[int, ...]
    set_names: tuple[str, ...]
    exclusive_items: frozenset[str]
    inclusive_items: frozenset[str]

    @property
    def exclusive_count(self) -> int:
        return len(self.exclusive_items)

    @property
    def inclusive_count(self) -> int:
        return len(self.inclusive_items)


@dataclass(frozen=True)
class ModelInfo:
    """Metadata about a bundled SVG model.

    Attributes:
        name: Canonical identifier (filename stem, e.g. ``"venn-5a-set-edwards"``).
        set_count: Number of sets the model supports (2 through 9).
        display_name: Human-readable label from the JSON ``name`` field.
    """

    name: str
    set_count: int
    display_name: str


def _models_dir() -> Path:
    """Resolve the bundled `_data/models/json/` directory."""
    pkg_root = resources.files("venn_diagram_lab")
    return Path(str(pkg_root)) / "_data" / "models" / "json"


@lru_cache(maxsize=1)
def _model_index() -> dict[str, ModelInfo]:
    """Scan _data/models/json/ and return name -> ModelInfo. Cached after first call."""
    json_dir = _models_dir()
    if not json_dir.is_dir():
        raise FileNotFoundError(
            f"Bundled model directory not found: {json_dir}. "
            "Run `python python/scripts/sync_data.py` to populate it."
        )
    index: dict[str, ModelInfo] = {}
    for path in sorted(json_dir.glob("*.json")):
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        name = path.stem
        index[name] = ModelInfo(
            name=name,
            set_count=int(data["n"]),
            display_name=str(data["name"]),
        )
    return index


def list_models() -> list[ModelInfo]:
    """Return all bundled models, sorted by ``(set_count, name)``.

    Returns:
        List of :class:`ModelInfo` objects covering the 44 bundled SVG
        templates plus the ``proportional`` synthetic generator.
    """
    return sorted(_model_index().values(), key=lambda m: (m.set_count, m.name))


# ---------------------------------------------------------------------------
# Region enumeration
# ---------------------------------------------------------------------------

_LETTERS = "ABCDEFGHI"


def _label_for_bitmask(bitmask: int) -> str:
    """Convert a bitmask into the canonical label (e.g. 0b101 -> 'AC')."""
    return "".join(_LETTERS[i] for i in range(len(_LETTERS)) if bitmask & (1 << i))


def _enumerate_regions(dataset: Dataset) -> dict[int, RegionData]:
    """Compute per-region exclusive and inclusive item sets via bitmask iteration.

    Each item is assigned a membership bitmask reflecting which sets it belongs
    to. Exclusive items for a region are those whose bitmask equals that region's
    mask exactly. Inclusive items are those whose bitmask is a superset of the
    region's mask (i.e. they belong to at least all sets in the region).

    Empty regions (no exclusive and no inclusive items) are omitted so the dict
    is sparse for high set counts with few overlaps.

    Mirrors the TypeScript calculateVennCountsFromAggregated logic in
    src/utils/csvParser.ts but operates directly on Dataset.items.
    """
    n = len(dataset.set_names)
    if n == 0:
        return {}

    sets_by_idx: list[set[str]] = [dataset.items[name] for name in dataset.set_names]

    # Build the universe and compute each item's membership bitmask.
    universe: set[str] = set()
    for s in sets_by_idx:
        universe |= s

    item_mask: dict[str, int] = {}
    for item in universe:
        mask = 0
        for i, s in enumerate(sets_by_idx):
            if item in s:
                mask |= 1 << i
        if mask:
            item_mask[item] = mask

    # exclusive_items[mask] = items present in exactly those sets
    exclusive: dict[int, set[str]] = {}
    for item, mask in item_mask.items():
        exclusive.setdefault(mask, set()).add(item)

    # inclusive_items[mask] = items present in at least all sets of that region
    inclusive: dict[int, set[str]] = {}
    for region_mask in range(1, 1 << n):
        for item, item_bitmask in item_mask.items():
            if (item_bitmask & region_mask) == region_mask:
                inclusive.setdefault(region_mask, set()).add(item)

    out: dict[int, RegionData] = {}
    for mask in range(1, 1 << n):
        excl = exclusive.get(mask, set())
        incl = inclusive.get(mask, set())
        if not excl and not incl:
            continue
        set_indices = tuple(i for i in range(n) if mask & (1 << i))
        set_names_for_region = tuple(dataset.set_names[i] for i in set_indices)
        out[mask] = RegionData(
            bitmask=mask,
            label=_label_for_bitmask(mask),
            set_indices=set_indices,
            set_names=set_names_for_region,
            exclusive_items=frozenset(excl),
            inclusive_items=frozenset(incl),
        )
    return out


# ---------------------------------------------------------------------------
# RegionResult
# ---------------------------------------------------------------------------

_MIN_SETS_FOR_STATISTICS = 2
_MAX_ALTERNATIVES_IN_MESSAGE = 5
_PROPORTIONAL_APPROXIMATE_SET_COUNT = 3


@dataclass(frozen=True)
class RegionResult:
    """Result of :func:`analyze`. Bundles dataset, chosen model, region map,
    set sizes, and a lazy :attr:`statistics` property.

    Attributes:
        dataset: The input Dataset.
        model: Resolved model name (e.g. ``"venn-4-set"`` or ``"proportional"``).
        regions: Dict ``bitmask -> RegionData`` for every non-empty region.
            Bitmask convention: bit ``i`` set means "in set with index ``i``"
            in ``dataset.set_names``.
        set_sizes: Map ``set_name -> inclusive size`` (number of items in
            that set, regardless of membership in others).
        is_approximate: ``True`` only for the proportional 3-set layout
            where exact areas can't be achieved with circles.

    Methods:
        statistics: Lazy :class:`StatisticsResult` (Jaccard, Dice, OC, FE, hypergeometric).
        effective_universe(): Hypergeometric N (``dataset.universe_size`` when set,
            else |union of items in regions|). Used by ``statistics`` and the TSV writers.
        render_venn(**opts): Render the Venn diagram as an SvgImage.
        render_upset(**opts): Render the UpSet plot as an MplImage.
        render_network(**opts): Render the set-relationship network as an MplImage.
        to_pdf_report(path, **opts): Write a multi-page PDF report.
        to_region_summary_tsv(path): Write the webapp's Region Summary TSV.
        to_matrix_tsv(path): Write the webapp's Item Matrix TSV.
        to_statistics_tsv(path): Write the webapp's pairwise Statistics TSV.

    Example:
        >>> from venn_diagram_lab import load_sample, analyze
        >>> result = analyze(load_sample("dataset_real_cancer_drivers_4"))
        >>> result.set_sizes
        {'Vogelstein': 138, 'COSMIC_CGC': 581, 'OncoKB': 1231, 'IntOGen': 633}
        >>> result.effective_universe()
        20000
        >>> result.to_pdf_report("report.pdf")
    """

    dataset: Dataset
    model: str
    regions: dict[int, RegionData]
    set_sizes: dict[str, int]
    is_approximate: bool = False  # always False in Phase 1; True for proportional 3-set in Phase 3

    def effective_universe(self) -> int:
        """Hypergeometric universe N consistent with the React webapp.

        Binary CSV/TSV: ``dataset.universe_size`` = ``csv.rows.length`` (includes
        all-zero rows representing items in the file's universe but in none of
        the selected sets). Aggregated / GMT / GMX / from_dict: |union of items|.
        """
        if self.dataset.universe_size is not None:
            return self.dataset.universe_size
        return sum(r.exclusive_count for r in self.regions.values())

    @cached_property
    def statistics(self) -> StatisticsResult:
        """Lazily compute pairwise statistics on first access."""
        # Imported here to avoid a top-level cycle and to keep statistics optional.
        from venn_diagram_lab.statistics import compute_pairwise  # noqa: PLC0415

        n = len(self.dataset.set_names)
        if n < _MIN_SETS_FOR_STATISTICS:
            import pandas as pd  # noqa: PLC0415

            from venn_diagram_lab.statistics import StatisticsResult  # noqa: PLC0415

            empty = pd.DataFrame()
            return StatisticsResult(
                jaccard=empty,
                dice=empty,
                overlap_coefficient=empty,
                fold_enrichment=empty,
                hypergeometric=empty,
            )

        # Build pairwise intersections from regions: (A, B) -> |A & B| inclusive
        pair_inter: dict[tuple[str, str], int] = {}
        for i in range(n):
            for j in range(i + 1, n):
                mask = (1 << i) | (1 << j)
                # Inclusive intersection = sum of exclusive items in any region
                # containing both i and j
                inter = 0
                for region_mask, region in self.regions.items():
                    if (region_mask & mask) == mask:
                        inter += region.exclusive_count
                pair_inter[(self.dataset.set_names[i], self.dataset.set_names[j])] = inter

        universe = self.effective_universe()

        return compute_pairwise(
            set_names=list(self.dataset.set_names),
            inclusive_sizes=self.set_sizes,
            pairwise_intersections=pair_inter,
            universe_size=universe,
        )

    def render_venn(
        self,
        *,
        model: str | None = None,
        set_names: Mapping[str, str] | None = None,
        colors: Mapping[str, str] | None = None,
        title: str | None = None,
        show_names: bool = True,
        show_counts: bool = True,
    ) -> SvgImage:
        """Render this result's diagram and return an SvgImage.

        See :func:`venn_diagram_lab.render.svg.render_venn_svg` for parameter docs.
        """
        # Local import -- keeps render.svg an opt-in import (cycle-free).
        from venn_diagram_lab.render.svg import render_venn_svg  # noqa: PLC0415

        return render_venn_svg(
            self,
            model=model,
            set_names=set_names,
            colors=colors,
            title=title,
            show_names=show_names,
            show_counts=show_counts,
        )

    def render_upset(
        self,
        *,
        max_columns: int = 20,
        sort_by: SortBy = "size",
        threshold: int | None = None,
        color_mode: ColorMode = "depth",
        colors: Mapping[str, str] | None = None,
    ) -> MplImage:
        """Render this result as an UpSet plot and return an MplImage.

        See :func:`venn_diagram_lab.render.upset.render_upset` for parameter docs.
        """
        from venn_diagram_lab.render.upset import render_upset  # noqa: PLC0415

        return render_upset(
            self,
            max_columns=max_columns,
            sort_by=sort_by,
            threshold=threshold,
            color_mode=color_mode,
            colors=colors,
        )

    def render_network(
        self,
        *,
        edge_metric: EdgeMetric = "intersection",
        seed: int = 42,
        significance_threshold: float = 0.05,
        node_color_map: Mapping[str, str] | None = None,
    ) -> MplImage:
        """Render this result as a force-directed network and return an MplImage.

        See :func:`venn_diagram_lab.render.network.render_network` for parameter docs.
        """
        from venn_diagram_lab.render.network import render_network  # noqa: PLC0415

        return render_network(
            self,
            edge_metric=edge_metric,
            seed=seed,
            significance_threshold=significance_threshold,
            node_color_map=node_color_map,
        )

    def to_pdf_report(
        self,
        path: PathInput,
        *,
        title: str | None = None,
        include_network: bool = True,
        include_about: bool = True,
    ) -> None:
        """Write a multi-page PDF report to disk.

        See :func:`venn_diagram_lab.render.pdf.render_pdf_report` for parameter docs.
        """
        from venn_diagram_lab.render.pdf import render_pdf_report  # noqa: PLC0415

        render_pdf_report(
            self, Path(path),
            title=title,
            include_network=include_network,
            include_about=include_about,
        )

    def to_region_summary_tsv(self, path: PathInput) -> None:
        """Write the Region Summary TSV (matches the webapp's Export Region Summary).

        Columns: Region, Sets, Depth, Exclusive_Count, Inclusive_Count, Exclusive_Pct, Items
        Rows: every non-empty region of the diagram. Sorted by Depth ASC, then Region label ASC.
        Items: semicolon-joined, ordered by self.dataset.item_order (insertion order from source).
        Cells starting with =/+/-/@ are escape-prefixed with a single quote.

        Exclusive_Pct denominator mirrors the webapp's ``totalUniqueItems``:
        for binary CSV/TSV (``dataset.universe_size`` populated) it's the row
        count; for aggregated/GMT/GMX it's the union of items across sets
        (== sum of exclusive counts).
        """
        from pathlib import Path  # noqa: PLC0415

        from venn_diagram_lab._tsv_escape import (  # noqa: PLC0415
            escape_spreadsheet_cell,
            js_to_fixed,
        )

        n = len(self.dataset.set_names)
        letters = "ABCDEFGHI"[:n]
        names_by_letter = dict(zip(letters, self.dataset.set_names, strict=True))
        order_index = {item: i for i, item in enumerate(self.dataset.item_order)}
        total = self.effective_universe()

        rows: list[tuple[int, str, str]] = []  # (depth, region_label, full_line)
        intersect = " ∩ "
        for mask in range(1, 1 << n):
            label = "".join(letters[i] for i in range(n) if mask & (1 << i))
            depth = bin(mask).count("1")
            region = self.regions.get(mask)
            ex_count = region.exclusive_count if region else 0
            in_count = region.inclusive_count if region else 0
            pct = js_to_fixed(ex_count / total * 100, 2) if total > 0 else "0.00"
            sets_col = intersect.join(
                escape_spreadsheet_cell(names_by_letter[c]) for c in label
            )
            items: list[str] = []
            if region is not None:
                items = sorted(
                    region.exclusive_items,
                    key=lambda it: order_index.get(it, len(order_index)),
                )
            items_col = ";".join(escape_spreadsheet_cell(i) for i in items)
            line = "\t".join(
                [label, sets_col, str(depth), str(ex_count), str(in_count), pct, items_col]
            )
            rows.append((depth, label, line))

        rows.sort(key=lambda r: (r[0], r[1]))
        header = "\t".join([
            "Region", "Sets", "Depth",
            "Exclusive_Count", "Inclusive_Count",
            "Exclusive_Pct", "Items",
        ])
        # `newline=""` keeps the LF-only output on Windows; the default
        # text-mode write would translate "\n" -> "\r\n" and break the
        # byte-parity tests against the React webapp's TSV fixtures.
        Path(path).write_text(
            "\n".join([header, *(r[2] for r in rows)]),
            encoding="utf-8",
            newline="",
        )

    def to_statistics_tsv(self, path: PathInput) -> None:
        """Write the pairwise Statistics TSV (matches DataSummaryPanel.handleExportStats).

        Columns: Set_A, Set_B, Name_A, Name_B, Size_A, Size_B, Intersection, Union,
        Jaccard, Overlap_Coeff, Dice, Expected, Fold_Enrichment, P_value, FDR, Significant.

        Float formatting mirrors the webapp byte-for-byte:
        * Jaccard / Overlap_Coeff / Dice: 4 decimals
        * Expected: 2 decimals
        * Fold_Enrichment: 3 decimals
        * P_value / FDR: scientific (JS style) if < 0.001, else 6 decimals
        * Significant: one of "***", "**", "*", "ns"

        Rows are sorted by P_value ascending (matches statistics.hypergeometric ordering).
        """
        from pathlib import Path  # noqa: PLC0415

        from venn_diagram_lab._tsv_escape import (  # noqa: PLC0415
            js_to_exponential_2,
            js_to_fixed,
        )
        from venn_diagram_lab.statistics import (  # noqa: PLC0415
            dice,
            fold_enrichment,
            jaccard,
            overlap_coefficient,
        )

        _stats_header = "\t".join([
            "Set_A", "Set_B", "Name_A", "Name_B", "Size_A", "Size_B",
            "Intersection", "Union", "Jaccard", "Overlap_Coeff", "Dice",
            "Expected", "Fold_Enrichment", "P_value", "FDR", "Significant",
        ])
        _p_scientific_threshold = 0.001
        _fdr_triple_star = 0.001
        _fdr_double_star = 0.01
        _fdr_single_star = 0.05

        n = len(self.dataset.set_names)
        if n < _MIN_SETS_FOR_STATISTICS:
            Path(path).write_text(_stats_header, encoding="utf-8", newline="")
            return

        letters = "ABCDEFGHI"[:n]
        universe = self.effective_universe()

        stats_table = self.statistics.hypergeometric  # already sorted by p_value asc

        def fmt_p(x: float) -> str:
            return js_to_exponential_2(x) if x < _p_scientific_threshold else js_to_fixed(x, 6)

        rows: list[tuple[float, str]] = []  # sort key + line
        for _, row in stats_table.iterrows():
            a_name = str(row["set_a"])
            b_name = str(row["set_b"])
            a_letter = letters[self.dataset.set_names.index(a_name)]
            b_letter = letters[self.dataset.set_names.index(b_name)]
            size_a = self.set_sizes[a_name]
            size_b = self.set_sizes[b_name]
            inter = int(row["intersection"])
            union_size = size_a + size_b - inter
            jac = jaccard(size_a, size_b, inter)
            oc = overlap_coefficient(size_a, size_b, inter)
            dic = dice(size_a, size_b, inter)
            expected = float(row["expected"])
            fe = fold_enrichment(universe, size_a, size_b, inter)
            p_val = float(row["p_value"])
            fdr = float(row["p_adjusted"])

            if fdr < _fdr_triple_star:
                sig_label = "***"
            elif fdr < _fdr_double_star:
                sig_label = "**"
            elif fdr < _fdr_single_star:
                sig_label = "*"
            else:
                sig_label = "ns"

            line = "\t".join([
                a_letter, b_letter, a_name, b_name,
                str(size_a), str(size_b),
                str(inter), str(union_size),
                js_to_fixed(jac, 4), js_to_fixed(oc, 4), js_to_fixed(dic, 4),
                js_to_fixed(expected, 2), js_to_fixed(fe, 3),
                fmt_p(p_val), fmt_p(fdr), sig_label,
            ])
            rows.append((p_val, line))

        rows.sort(key=lambda r: r[0])
        Path(path).write_text(
            "\n".join([_stats_header, *(r[1] for r in rows)]),
            encoding="utf-8",
            newline="",
        )

    def to_matrix_tsv(self, path: PathInput) -> None:
        """Write the Item Matrix TSV (matches the webapp's Export Matrix).

        Columns: Item, <SetName_A>, <SetName_B>, ..., Region
        Rows: one per item. Iteration order: mask 1..(2^n - 1); within each mask,
        items in self.dataset.item_order.
        """
        from pathlib import Path  # noqa: PLC0415

        from venn_diagram_lab._tsv_escape import escape_spreadsheet_cell  # noqa: PLC0415

        n = len(self.dataset.set_names)
        letters = "ABCDEFGHI"[:n]
        order_index = {item: i for i, item in enumerate(self.dataset.item_order)}

        header_cols = (
            ["Item"]
            + [escape_spreadsheet_cell(name) for name in self.dataset.set_names]
            + ["Region"]
        )
        out_lines = ["\t".join(header_cols)]

        for mask in range(1, 1 << n):
            region = self.regions.get(mask)
            if region is None or not region.exclusive_items:
                continue
            label = "".join(letters[i] for i in range(n) if mask & (1 << i))
            membership = ["1" if mask & (1 << i) else "0" for i in range(n)]
            fallback = len(order_index)
            items = sorted(region.exclusive_items, key=lambda it: order_index.get(it, fallback))
            for item in items:
                row = [escape_spreadsheet_cell(item), *membership, label]
                out_lines.append("\t".join(row))

        Path(path).write_text("\n".join(out_lines), encoding="utf-8", newline="")


# ---------------------------------------------------------------------------
# Model resolution + public entry point
# ---------------------------------------------------------------------------


def _resolve_model(model: str, set_count: int) -> str:
    """Validate the model identifier and return its canonical name.

    Accepts "auto" -> first model matching the set count (alphabetical order).
    Accepts "proportional" -> deferred to render path (set-count validation there).
    """
    if model == "proportional":
        return "proportional"  # Set-count validation deferred to render path.

    index = _model_index()

    if model == "auto":
        candidates = sorted(
            (m for m in index.values() if m.set_count == set_count),
            key=lambda m: m.name,
        )
        if not candidates:
            raise IncompatibleModelError(
                f"No bundled model supports {set_count} sets",
                alternatives=[],
            )
        return candidates[0].name

    if model not in index:
        raise UnknownModelError(
            f"Model {model!r} not found. Use list_models() to see available models."
        )

    info = index[model]
    if info.set_count != set_count:
        alternatives = sorted(m.name for m in index.values() if m.set_count == set_count)
        shown = alternatives[:_MAX_ALTERNATIVES_IN_MESSAGE]
        ellipsis = "..." if len(alternatives) > _MAX_ALTERNATIVES_IN_MESSAGE else ""
        raise IncompatibleModelError(
            f"Model {model!r} requires {info.set_count} sets but dataset has {set_count}. "
            f"Alternatives ({set_count}-set): {shown}{ellipsis}",
            alternatives=alternatives,
        )
    return model


def analyze(dataset: Dataset, model: str = "auto") -> RegionResult:
    """Compute the Venn region map for a Dataset and bind it to a model.

    Args:
        dataset: Loaded Dataset (from one of the ``load_*`` functions or
            ``Dataset.from_dict``).
        model: Model identifier. ``"auto"`` picks the canonical model for
            the dataset's set count (alphabetical first match), e.g.
            4 sets -> ``venn-4-set``. ``"proportional"`` requests an
            area-proportional layout (only supports 2-3 sets). Otherwise
            pass an explicit name from ``list_models()``.

    Returns:
        RegionResult with the per-region item membership, set sizes, and a
        lazy :attr:`RegionResult.statistics` property.

    Example:
        >>> from venn_diagram_lab import load_sample, analyze
        >>> ds = load_sample("dataset_real_cancer_drivers_4")
        >>> result = analyze(ds, model="auto")
        >>> result.model
        'venn-4-set'
        >>> result.regions[0b0001].label  # only-set-A region
        'A'
    """
    n = len(dataset.set_names)
    canonical = _resolve_model(model, n)

    regions = _enumerate_regions(dataset)
    set_sizes = {name: len(items) for name, items in dataset.items.items()}

    # Proportional 3-set is mathematically approximate; flag it for downstream
    # renderers / PDF reports.
    is_approximate = canonical == "proportional" and n == _PROPORTIONAL_APPROXIMATE_SET_COUNT

    return RegionResult(
        dataset=dataset,
        model=canonical,
        regions=regions,
        set_sizes=set_sizes,
        is_approximate=is_approximate,
    )
