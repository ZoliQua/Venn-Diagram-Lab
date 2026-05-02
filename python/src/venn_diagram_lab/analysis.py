"""Region enumeration, model lookup, and the analyze() entry point.

A RegionResult bundles the per-region item membership (both exclusive and
inclusive variants), the model used, and a lazy StatisticsResult.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import cached_property, lru_cache
from importlib import resources
from pathlib import Path
from typing import TYPE_CHECKING

from venn_diagram_lab.errors import IncompatibleModelError, UnknownModelError
from venn_diagram_lab.io import Dataset

if TYPE_CHECKING:
    from venn_diagram_lab.statistics import StatisticsResult


@dataclass(frozen=True)
class RegionData:
    """One region in a Venn diagram (bitmask = 1 means "set 0 only", 0b11 = "sets 0 AND 1").

    Both exclusive and inclusive item lists are kept because the web tool
    surfaces both: "exclusive" = items in exactly these sets, "inclusive" =
    items in at least these sets.
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
    """Metadata about a bundled model.

    Attributes
    ----------
    name : canonical identifier (filename stem, e.g. "venn-5a-set-edwards").
    set_count : number of sets the model supports (2 through 9).
    display_name : human-readable label from the JSON `name` field.
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
    """Return all bundled models, sorted by (set_count, name)."""
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
    """Result of analyze(). Bundles the input dataset, chosen model, region map,
    and a lazy StatisticsResult.
    """

    dataset: Dataset
    model: str
    regions: dict[int, RegionData]
    set_sizes: dict[str, int]
    is_approximate: bool = False  # always False in Phase 1; True for proportional 3-set in Phase 3

    @cached_property
    def statistics(self) -> StatisticsResult:
        """Lazily compute pairwise statistics on first access."""
        # Imported here to avoid a top-level cycle and to keep statistics optional.
        from venn_diagram_lab.statistics import compute_pairwise  # noqa: PLC0415

        n = len(self.dataset.set_names)
        if n < _MIN_SETS_FOR_STATISTICS:
            import pandas as pd  # type: ignore[import-untyped]  # noqa: PLC0415

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

        universe = sum(r.exclusive_count for r in self.regions.values())

        return compute_pairwise(
            set_names=list(self.dataset.set_names),
            inclusive_sizes=self.set_sizes,
            pairwise_intersections=pair_inter,
            universe_size=universe,
        )

    def render_venn(self, **opts):  # type: ignore[no-untyped-def]
        """Render this result's diagram and return an SvgImage.

        Accepts the same kwargs as render.svg.render_venn_svg (model, set_names,
        colors, title, show_names, show_counts).
        """
        # Local import -- keeps render.svg an opt-in import (cycle-free).
        from venn_diagram_lab.render.svg import render_venn_svg  # noqa: PLC0415

        return render_venn_svg(self, **opts)

    def render_upset(self, **opts):  # type: ignore[no-untyped-def]
        """Render this result as an UpSet plot and return an MplImage.

        Accepts the same kwargs as render.upset.render_upset (max_columns,
        sort_by, threshold, color_mode, colors).
        """
        from venn_diagram_lab.render.upset import render_upset  # noqa: PLC0415

        return render_upset(self, **opts)

    def render_network(self, **opts):  # type: ignore[no-untyped-def]
        """Render this result as a force-directed network and return an MplImage.

        Accepts the same kwargs as render.network.render_network (edge_metric,
        seed, significance_threshold, node_color_map).
        """
        from venn_diagram_lab.render.network import render_network  # noqa: PLC0415

        return render_network(self, **opts)


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
    """Compute Venn-diagram regions for a dataset using the named model.

    Parameters
    ----------
    dataset : input Dataset (loaded via io.load_*).
    model : model identifier (filename stem, e.g. "venn-3-set"); pass "auto" to
        let the package pick the first model matching the dataset's set count.
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
