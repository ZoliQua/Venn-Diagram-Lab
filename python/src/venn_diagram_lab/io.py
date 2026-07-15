"""Data-loading and parsing for venn-diagram-lab.

Supports CSV / TSV (binary or aggregated mode), GMT, GMX. Always returns a
canonical `Dataset` so downstream modules don't care about the source format.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from venn_diagram_lab.errors import InvalidDatasetError

DatasetFormat = Literal["csv", "tsv", "gmt", "gmx"]

MIN_SETS = 2
MAX_SETS = 9


@dataclass(frozen=True)
class Dataset:
    """In-memory representation of a Venn-diagram input.

    Attributes:
        set_names: Ordered set identifiers (preserving the order they
            appeared in the source).
        items: Map ``set_name -> set of item identifiers`` (gene symbols,
            titles, etc.).
        source_path: Original file path if loaded from disk; ``None`` for
            in-memory or sample-derived datasets.
        format: Source format (``csv``/``tsv``/``gmt``/``gmx``). For in-memory
            datasets the default is ``csv``; callers that care about format
            may override.
        item_order: First-seen insertion order across all sets, mirroring JS
            ``Set``/``Map`` semantics. Empty tuple when not populated (legacy
            callers). All bundled loaders and ``from_dict`` populate it.
        universe_size: Hypergeometric universe N from the source file, when
            known. Binary CSV/TSV loaders set this to the row count
            (matching the React webapp's ``csv.rows.length``); other formats
            leave it ``None``, signalling "compute as |union of items|"
            downstream.
    """

    set_names: list[str]
    items: dict[str, set[str]]
    source_path: str | None
    format: DatasetFormat
    item_order: tuple[str, ...] = ()
    universe_size: int | None = None

    @classmethod
    def from_dict(
        cls,
        data: Mapping[str, Iterable[str]],
        *,
        source_path: str | None = None,
        format: DatasetFormat = "csv",
    ) -> Dataset:
        """Build a Dataset from a plain dict of set_name -> iterable of items.

        Items are coerced to `str` and de-duplicated. Set count must be in [2, 9].
        Iterables are consumed exactly once; generators are safe to pass.
        """
        if len(data) < MIN_SETS:
            raise InvalidDatasetError(
                f"Dataset must have at least {MIN_SETS} sets, got {len(data)}"
            )
        if len(data) > MAX_SETS:
            raise InvalidDatasetError(
                f"Dataset must have at most {MAX_SETS} sets, got {len(data)}"
            )
        names = list(data.keys())
        # Materialise each iterable to a list so we can scan it twice (item_order + items).
        materialised: dict[str, list[str]] = {
            name: [str(x) for x in values] for name, values in data.items()
        }
        items = {name: set(vals) for name, vals in materialised.items()}
        seen: dict[str, None] = {}
        for name in names:
            for v in materialised[name]:
                if v not in seen:
                    seen[v] = None
        return cls(
            set_names=names,
            items=items,
            source_path=source_path,
            format=format,
            item_order=tuple(seen.keys()),
        )


def _split_line(line: str, delimiter: str) -> list[str]:
    """Split a CSV line respecting quoted fields and escaped quotes.

    Mirrors src/utils/csvParser.ts splitCsvLineWithDelimiter exactly so loaded
    datasets parse identically to the web tool.
    """
    result: list[str] = []
    current: list[str] = []
    in_quotes = False
    i = 0
    while i < len(line):
        ch = line[i]
        if ch == '"':
            if in_quotes and i + 1 < len(line) and line[i + 1] == '"':
                current.append('"')
                i += 2
                continue
            in_quotes = not in_quotes
        elif ch == delimiter and not in_quotes:
            result.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
        i += 1
    result.append("".join(current).strip())
    return result


_TRUTHY = {"1", "true", "yes"}
_FALSY = {"0", "false", "no", ""}

_DELIMITER_CANDIDATES: tuple[str, ...] = (",", ";", "\t", " ")


def _detect_delimiter(text: str) -> str:
    """Auto-detect the delimiter by scoring consistency across the first 5 lines.

    Mirrors src/utils/csvParser.ts detectDelimiter. Falls back to ',' if no
    candidate scores above zero (single-token lines, etc.).
    """
    lines = text.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")[:5]
    if not lines:
        return ","

    best_delim = ","
    best_score = -1
    for d in _DELIMITER_CANDIDATES:
        counts = []
        for line in lines:
            count = 0
            in_quotes = False
            for ch in line:
                if ch == '"':
                    in_quotes = not in_quotes
                elif ch == d and not in_quotes:
                    count += 1
            counts.append(count)
        if not counts:
            continue
        lo, hi = min(counts), max(counts)
        if lo >= 1 and hi - lo <= 1:
            score = lo * 10 + (5 if hi == lo else 0)
            if score > best_score:
                best_score = score
                best_delim = d
    return best_delim


# ---------------------------------------------------------------------------
# File I/O helpers
# ---------------------------------------------------------------------------


def _read_text(path: Path | str) -> tuple[str, str]:
    """Read the file contents and return (text, str(path))."""
    p = Path(path)
    return p.read_text(encoding="utf-8"), str(p)


def _parse_table(text: str, delimiter: str) -> tuple[list[str], list[list[str]]]:
    """Low-level: parse a delimited file into (headers, rows)."""
    lines = [
        line
        for line in text.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")
        if line.strip()
    ]
    min_lines = 2  # 1 header + at least 1 data row
    if len(lines) < min_lines:
        raise InvalidDatasetError("File must have at least a header and one data row")
    headers = _split_line(lines[0], delimiter)
    rows = [_split_line(line, delimiter) for line in lines[1:]]
    return headers, rows


def _binary_columns_to_dataset(
    headers: list[str],
    rows: list[list[str]],
    source_path: str,
    fmt: DatasetFormat,
    prefix_cols: int = 1,
) -> Dataset:
    """Treat the first *prefix_cols* columns as item metadata, remaining as binary sets.

    Parameters
    ----------
    prefix_cols:
        Number of leading columns to treat as item metadata (default 1).
        Column 0 is always the item id used for set membership; columns
        1..(prefix_cols-1) are ignored metadata fields.
    """
    if len(headers) < prefix_cols + MIN_SETS:
        raise InvalidDatasetError(
            f"Binary file must have at least {MIN_SETS} data columns"
        )

    set_names = headers[prefix_cols:]
    items: dict[str, set[str]] = {name: set() for name in set_names}
    item_order_seen: dict[str, None] = {}
    nonempty_row_count = 0

    for row_idx, row in enumerate(rows, start=2):  # row 1 is the header
        if not row or not row[0].strip():
            continue
        nonempty_row_count += 1
        item_id = row[0].strip()
        if item_id not in item_order_seen:
            item_order_seen[item_id] = None
        for col_offset, set_name in enumerate(set_names):
            col_idx = prefix_cols + col_offset
            cell = (row[col_idx] if col_idx < len(row) else "").strip().lower()
            if cell in _TRUTHY:
                items[set_name].add(item_id)
            elif cell in _FALSY:
                continue
            else:
                raw = row[col_idx] if col_idx < len(row) else ""
                raise InvalidDatasetError(
                    f"Column {set_name!r} row {row_idx} has invalid value {raw!r} "
                    "(expected 0/1/true/false/yes/no)"
                )

    return Dataset(
        set_names=set_names,
        items=items,
        source_path=source_path,
        format=fmt,
        item_order=tuple(item_order_seen.keys()),
        universe_size=nonempty_row_count,
    )


def _aggregated_columns_to_dataset(
    headers: list[str],
    rows: list[list[str]],
    source_path: str,
    format: DatasetFormat,
) -> Dataset:
    """Treat each column as a set; non-empty cells are item identifiers."""
    if len(headers) < MIN_SETS:
        raise InvalidDatasetError(f"Aggregated file must have at least {MIN_SETS} columns")

    set_names = list(headers)
    items: dict[str, set[str]] = {name: set() for name in set_names}
    seen: dict[str, None] = {}

    for row in rows:
        for col_idx, set_name in enumerate(set_names):
            cell = (row[col_idx] if col_idx < len(row) else "").strip()
            if cell:
                items[set_name].add(cell)
                if cell not in seen:
                    seen[cell] = None

    if not any(items.values()):
        raise InvalidDatasetError("Aggregated file has no non-empty cells")

    return Dataset(
        set_names=set_names,
        items=items,
        source_path=source_path,
        format=format,
        item_order=tuple(seen.keys()),
    )


# ---------------------------------------------------------------------------
# Data-quality analysis (Feature 4)
# ---------------------------------------------------------------------------

FileType = Literal["binary", "aggregated"]

MAX_DUPLICATE_EXAMPLES = 5
# An item's occurrence count at which it first becomes a duplicate (its 2nd
# sighting) — the point at which analyze_data_quality captures an example.
_SECOND_OCCURRENCE = 2


@dataclass(frozen=True)
class DuplicateColumnReport:
    """Duplicate-item summary for one column of a parsed table.

    Attributes:
        column: 0-based column index within the full parsed table.
        column_name: Header for ``column`` (falls back to ``Column {i+1}``).
        count: Redundant-occurrence count, i.e. ``sum(occurrences - 1)`` over
            every item that appears more than once in this column's scope.
            This is exactly the number of additions a Python ``set()`` would
            silently swallow when building the real :class:`Dataset`.
        examples: Up to :data:`MAX_DUPLICATE_EXAMPLES` item strings, each
            captured at the moment it became a duplicate (its 2nd
            occurrence), in encounter order.
    """

    column: int
    column_name: str
    count: int
    examples: list[str]


@dataclass(frozen=True)
class CaseCollisionGroup:
    """A group of distinct, case-sensitive spellings that share one lower-case form."""

    items: list[str]


@dataclass(frozen=True)
class DataQualityReport:
    """Pure, read-only summary of data-quality issues in a parsed table.

    Mirrors the semantics of the TypeScript ``analyzeDataQuality`` (see
    ``packages/core/src/csvParser.ts`` and
    ``.superpowers/sdd/task-F4-ts-report.md``) with two deliberate,
    Python-specific adjustments (both documented on
    :func:`analyze_data_quality`):

    1. No ``item_delimiter`` splitting in aggregated mode — Python's
       :func:`_aggregated_columns_to_dataset` treats a whole trimmed cell as
       one item, so there is nothing to split here either.
    2. Binary mode reports one entry **per set column** (like aggregated
       mode), not one flat entry keyed to the id column — because Python's
       :func:`_binary_columns_to_dataset` stores membership as one
       independent ``set()`` per target set, so silent collapsing happens
       per column, not per raw identifier across the whole table.

    Attributes:
        duplicates_removed: Per-column duplicate summaries (only columns
            with ``count > 0`` are included).
        empty_cells_skipped: Total blank/whitespace-only cells across the
            selected columns, exactly as counted during real ``Dataset``
            construction.
        case_collisions: Groups of item spellings that differ only by case
            (e.g. ``["TP53", "tp53"]``). Purely descriptive — item identity
            is never folded or merged.
        has_warnings: ``True`` if any of the above is non-empty.
    """

    duplicates_removed: list[DuplicateColumnReport]
    empty_cells_skipped: int
    case_collisions: list[CaseCollisionGroup]
    has_warnings: bool


def analyze_data_quality(  # noqa: PLR0912, PLR0915 - two flat, mirrored branches read clearer than nested helpers
    headers: list[str],
    rows: list[list[str]],
    columns: list[int],
    file_type: FileType,
    *,
    id_column: int = 0,
) -> DataQualityReport:
    """Analyze duplicate/empty-cell/case-collision issues over a parsed table.

    Pure and read-only: never mutates ``headers``/``rows`` and never folds
    item case — case collisions are reported, not normalised. This function
    describes what the *real* Dataset builders (`_binary_columns_to_dataset`,
    `_aggregated_columns_to_dataset`) silently do when they call
    ``set.add()``; it does not change that behaviour.

    Args:
        headers: Column headers of the parsed table.
        rows: Data rows (each a list of cell strings), as produced by
            ``_parse_table``.
        columns: 0-based indices of the columns that represent sets —
            for binary mode, the flag columns (id column excluded); for
            aggregated mode, normally every column.
        file_type: ``"binary"`` or ``"aggregated"``. See module docs and
            :class:`DataQualityReport` for how each mode is scored.
        id_column: Binary-mode only — index of the item-identifier column
            (default 0, matching ``_binary_columns_to_dataset``'s
            ``prefix_cols``-driven convention of column 0 always being the
            id). Ignored in aggregated mode.

    Returns:
        DataQualityReport summarizing duplicates, empty cells, and case
        collisions found in ``columns``.
    """
    duplicates_removed: list[DuplicateColumnReport] = []
    empty_cells_skipped = 0

    # Tracks, in order of first appearance, every distinct case-sensitive
    # item string considered "in scope" for case-collision detection.
    first_seen_order: list[str] = []
    # lower-case form -> distinct case-sensitive spellings seen (insertion order)
    case_groups: dict[str, list[str]] = {}

    def register_for_case_collision(item: str) -> None:
        lower = item.lower()
        variants = case_groups.setdefault(lower, [])
        if item not in variants:
            variants.append(item)
            first_seen_order.append(item)

    if file_type == "aggregated":
        for col_idx in columns:
            col_name = headers[col_idx] if col_idx < len(headers) else f"Column {col_idx + 1}"
            seen: dict[str, int] = {}
            example_order: list[str] = []

            for row in rows:
                cell = (row[col_idx] if col_idx < len(row) else "").strip()
                if not cell:
                    empty_cells_skipped += 1
                    continue
                count = seen.get(cell, 0) + 1
                seen[cell] = count
                if count == _SECOND_OCCURRENCE:  # first moment it becomes a duplicate
                    example_order.append(cell)
                register_for_case_collision(cell)

            col_duplicate_count = sum(c - 1 for c in seen.values() if c > 1)
            if col_duplicate_count > 0:
                duplicates_removed.append(
                    DuplicateColumnReport(
                        column=col_idx,
                        column_name=col_name,
                        count=col_duplicate_count,
                        examples=example_order[:MAX_DUPLICATE_EXAMPLES],
                    )
                )
    else:
        # Binary mode: identity = trimmed row[id_column], but (unlike the TS
        # surface) scored per set column, mirroring _binary_columns_to_dataset's
        # one-Python-set-per-target-set storage. A row is only in scope for a
        # given column if that column's cell is truthy for it (the same
        # condition under which the real loader calls items[set_name].add(id));
        # rows with a blank id are skipped entirely, matching the real loader's
        # `if not row or not row[0].strip(): continue`.
        for col_idx in columns:
            col_name = headers[col_idx] if col_idx < len(headers) else f"Column {col_idx + 1}"
            seen_binary: dict[str, int] = {}
            example_order_binary: list[str] = []

            for row in rows:
                if not row or not (row[id_column] if id_column < len(row) else "").strip():
                    continue  # real loader skips the whole row when id is blank
                cell = (row[col_idx] if col_idx < len(row) else "")
                if cell.strip() == "":
                    empty_cells_skipped += 1
                    continue
                if cell.strip().lower() not in _TRUTHY:
                    continue  # falsy: never reaches items[set_name].add(...)
                item_id = row[id_column].strip()
                count = seen_binary.get(item_id, 0) + 1
                seen_binary[item_id] = count
                if count == _SECOND_OCCURRENCE:
                    example_order_binary.append(item_id)
                register_for_case_collision(item_id)

            col_duplicate_count = sum(c - 1 for c in seen_binary.values() if c > 1)
            if col_duplicate_count > 0:
                duplicates_removed.append(
                    DuplicateColumnReport(
                        column=col_idx,
                        column_name=col_name,
                        count=col_duplicate_count,
                        examples=example_order_binary[:MAX_DUPLICATE_EXAMPLES],
                    )
                )

    case_collisions: list[CaseCollisionGroup] = []
    emitted_lower: set[str] = set()
    for item in first_seen_order:
        lower = item.lower()
        if lower in emitted_lower:
            continue
        variants = case_groups.get(lower)
        if variants and len(variants) > 1:
            case_collisions.append(CaseCollisionGroup(items=list(variants)))
            emitted_lower.add(lower)

    return DataQualityReport(
        duplicates_removed=duplicates_removed,
        empty_cells_skipped=empty_cells_skipped,
        case_collisions=case_collisions,
        has_warnings=bool(duplicates_removed) or empty_cells_skipped > 0 or bool(case_collisions),
    )


def load_csv_raw(
    path: Path | str,
    *,
    binary: bool = True,
    delimiter: str | None = None,
    prefix_cols: int = 1,
) -> tuple[list[str], list[list[str]], list[int], FileType]:
    """Parse a delimited file into the raw table :func:`analyze_data_quality` needs.

    Companion to :func:`load_csv` that stops short of building a
    :class:`Dataset`, for callers (e.g. `vdl data validate`) that want to run
    a quality analysis over exactly the columns the real loader would use.

    Args:
        path: Path to the file.
        binary: Same meaning as in :func:`load_csv`.
        delimiter: Explicit delimiter; ``None`` auto-detects.
        prefix_cols: Leading metadata columns in binary mode (default 1).

    Returns:
        ``(headers, rows, columns, file_type)`` where ``columns`` are the
        0-based indices :func:`analyze_data_quality` should treat as sets
        (matching what ``_binary_columns_to_dataset``/
        ``_aggregated_columns_to_dataset`` would use), and ``file_type`` is
        ``"binary"`` or ``"aggregated"``.
    """
    text, _src = _read_text(path)
    delim = delimiter if delimiter is not None else _detect_delimiter(text)
    headers, rows = _parse_table(text, delim)
    if binary:
        if len(headers) < prefix_cols + MIN_SETS:
            raise InvalidDatasetError(
                f"Binary file must have at least {MIN_SETS} data columns"
            )
        return headers, rows, list(range(prefix_cols, len(headers))), "binary"
    if len(headers) < MIN_SETS:
        raise InvalidDatasetError(f"Aggregated file must have at least {MIN_SETS} columns")
    return headers, rows, list(range(len(headers))), "aggregated"


# ---------------------------------------------------------------------------
# Public loaders
# ---------------------------------------------------------------------------


def load_csv(
    path: Path | str,
    *,
    binary: bool = True,
    delimiter: str | None = None,
    prefix_cols: int = 1,
) -> Dataset:
    """Load a delimited file into a :class:`Dataset`.

    Auto-detects the delimiter from ``,``, ``;``, ``<tab>``, and ``<space>``
    if not given. Supports two layouts:

    * **Binary mode** (default): one row per item, with 0/1 columns marking
      membership in each set. The first column (or first ``prefix_cols``
      columns) is item metadata; remaining columns are sets.
    * **Aggregated mode** (``binary=False``): each column is a set, and cells
      contain item identifiers. Empty cells are ignored.

    Args:
        path: Path to the file (str or Path).
        binary: Treat the file as binary 0/1 (default) or aggregated.
        delimiter: Explicit delimiter. ``None`` auto-detects.
        prefix_cols: Number of leading metadata columns in binary mode
            (default 1, meaning column 0 is the item id). Ignored when
            ``binary=False``.

    Returns:
        Dataset with ``set_names``, ``items``, and ``item_order`` populated.
        ``universe_size`` is the row count for binary files; ``None`` otherwise.

    Example:
        >>> from venn_diagram_lab import load_csv
        >>> ds = load_csv("genes.csv", binary=True)
        >>> ds.set_names
        ['SetA', 'SetB', 'SetC']
        >>> len(ds.items["SetA"])
        42
    """
    text, src = _read_text(path)
    delim = delimiter if delimiter is not None else _detect_delimiter(text)
    headers, rows = _parse_table(text, delim)
    fmt: DatasetFormat = "tsv" if delim == "\t" else "csv"
    if binary:
        return _binary_columns_to_dataset(headers, rows, src, fmt, prefix_cols=prefix_cols)
    return _aggregated_columns_to_dataset(headers, rows, src, fmt)


def load_tsv(path: Path | str, *, binary: bool = True, prefix_cols: int = 1) -> Dataset:
    """Load a tab-separated file into a :class:`Dataset`.

    Equivalent to ``load_csv(path, binary=binary, delimiter='\\t',
    prefix_cols=prefix_cols)``.

    Args:
        path: Path to the .tsv file.
        binary: Binary 0/1 mode (default) or aggregated (cells = item names).
        prefix_cols: Leading metadata columns in binary mode (default 1).

    Returns:
        Dataset.

    Example:
        >>> from venn_diagram_lab import load_tsv
        >>> ds = load_tsv("cancer_drivers.tsv", binary=True)
        >>> ds.universe_size  # source row count
        20000
    """
    return load_csv(path, binary=binary, delimiter="\t", prefix_cols=prefix_cols)


def load_gmt(path: Path | str) -> Dataset:
    """Load a GMT (Gene Matrix Transposed) file into a :class:`Dataset`.

    Each line is one set: ``set_name<TAB>description<TAB>item1<TAB>item2<TAB>...``.

    Args:
        path: Path to the .gmt file.

    Returns:
        Dataset.

    Example:
        >>> from venn_diagram_lab import load_gmt
        >>> ds = load_gmt("hallmark.gmt")
        >>> ds.set_names[:3]
        ['HALLMARK_HYPOXIA', 'HALLMARK_APOPTOSIS', 'HALLMARK_INFLAMMATORY_RESPONSE']
    """
    text, src = _read_text(path)
    lines = [
        line
        for line in text.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")
        if line.strip()
    ]
    if not lines:
        raise InvalidDatasetError("GMT file is empty")

    set_names: list[str] = []
    items: dict[str, set[str]] = {}
    seen: dict[str, None] = {}

    gmt_min_cols = 3  # name, description, at least one gene
    for line in lines:
        parts = line.split("\t")
        if len(parts) < gmt_min_cols:
            continue  # need at least name, description, one gene
        name = parts[0].strip()
        if not name:
            continue
        members = [p.strip() for p in parts[2:] if p.strip()]
        if not members:
            continue
        set_names.append(name)
        items[name] = set(members)
        for m in members:
            if m not in seen:
                seen[m] = None

    if not set_names:
        raise InvalidDatasetError("GMT file has no valid gene sets")
    if len(set_names) < MIN_SETS:
        raise InvalidDatasetError(
            f"GMT file must contain at least {MIN_SETS} sets, got {len(set_names)}"
        )
    if len(set_names) > MAX_SETS:
        raise InvalidDatasetError(
            f"GMT file has {len(set_names)} sets; the current version supports "
            f"at most {MAX_SETS} (limited by the bundled Venn templates, which "
            "cover 2-9 sets). Filter the file to <= 9 sets before loading. "
            "UpSet rendering for >9 sets without going through analyze() is on "
            "the roadmap for a future release; track it at "
            "https://github.com/ZoliQua/Venn-Diagram-Lab/issues."
        )

    return Dataset(
        set_names=set_names,
        items=items,
        source_path=src,
        format="gmt",
        item_order=tuple(seen.keys()),
    )


def load_gmx(path: Path | str) -> Dataset:
    """Load a GMX file (transposed GMT) into a :class:`Dataset`.

    Row 0 = set names, row 1 = descriptions, rows 2+ = items column-aligned.

    Args:
        path: Path to the .gmx file.

    Returns:
        Dataset.

    Example:
        >>> from venn_diagram_lab import load_gmx
        >>> ds = load_gmx("pathways.gmx")
        >>> sum(len(items) for items in ds.items.values())
        1234
    """
    text, src = _read_text(path)
    lines = [
        line
        for line in text.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")
        if line.strip()
    ]
    min_rows = 3
    if len(lines) < min_rows:
        raise InvalidDatasetError("GMX file must have at least 3 rows (names, descriptions, genes)")

    set_names = [h.strip() for h in lines[0].split("\t") if h.strip()]
    if len(set_names) < MIN_SETS:
        raise InvalidDatasetError(f"GMX file must have at least {MIN_SETS} columns")
    if len(set_names) > MAX_SETS:
        raise InvalidDatasetError(
            f"GMX file has {len(set_names)} sets; the current version supports "
            f"at most {MAX_SETS} (limited by the bundled Venn templates, which "
            "cover 2-9 sets). Filter the file to <= 9 sets before loading. "
            "UpSet rendering for >9 sets without going through analyze() is on "
            "the roadmap for a future release; track it at "
            "https://github.com/ZoliQua/Venn-Diagram-Lab/issues."
        )

    items: dict[str, set[str]] = {name: set() for name in set_names}
    seen: dict[str, None] = {}
    # Row-major scan: top-to-bottom rows, left-to-right columns within each row.
    # Matches the webapp's Set insertion order when GMX is read top-to-bottom.
    for line in lines[2:]:
        parts = [p.strip() for p in line.split("\t")]
        for col_idx, set_name in enumerate(set_names):
            cell = parts[col_idx] if col_idx < len(parts) else ""
            if cell:
                items[set_name].add(cell)
                if cell not in seen:
                    seen[cell] = None

    return Dataset(
        set_names=set_names,
        items=items,
        source_path=src,
        format="gmx",
        item_order=tuple(seen.keys()),
    )
