"""Bundled sample dataset loader.

Five curated datasets ship inside the wheel under `_data/samples/`. Three are
real biological datasets (cancer drivers, MSigDB cancer pathways, MSigDB immune
pathways); two are mock datasets (gene sets, streaming platforms) used for
demos and tests.

Reference files (e.g. .gmt MSigDB collections) are bundled too but excluded
from list_samples() -- call load_gmt(path) directly for those.
"""

from __future__ import annotations

from importlib import resources
from pathlib import Path
from typing import Literal, TypedDict

from venn_diagram_lab.io import Dataset, FileType, load_csv, load_csv_raw, load_tsv


class _SampleMeta(TypedDict):
    """Per-sample metadata. The companion ``SAMPLES`` table in
    ``scripts/generate-parity-fixtures.mts`` mirrors this — keep them in sync.
    """

    ext: Literal["csv", "tsv"]
    mode: Literal["binary", "aggregated"]
    prefix_cols: int


# Per-sample metadata (format, mode). Keep this in sync with the files in data/.
_SAMPLE_REGISTRY: dict[str, _SampleMeta] = {
    "dataset_mock_gene_sets": {"ext": "csv", "mode": "aggregated", "prefix_cols": 1},
    "dataset_mock_streaming_platforms": {"ext": "csv", "mode": "binary", "prefix_cols": 2},
    "dataset_real_cancer_drivers_4": {"ext": "tsv", "mode": "binary", "prefix_cols": 1},
    "dataset_real_msigdb_cancer_pathways": {"ext": "tsv", "mode": "binary", "prefix_cols": 1},
    "dataset_real_msigdb_immune_pathways": {"ext": "tsv", "mode": "binary", "prefix_cols": 1},
}


def _samples_dir() -> Path:
    """Resolve the bundled `_data/samples/` directory."""
    pkg_root = resources.files("venn_diagram_lab")
    return Path(str(pkg_root)) / "_data" / "samples"


def list_samples() -> list[str]:
    """Return the names of bundled sample datasets, sorted.

    Returns:
        List of sample identifiers (e.g. ``"dataset_real_cancer_drivers_4"``)
        suitable for passing to :func:`load_sample`.

    Example:
        >>> from venn_diagram_lab import list_samples
        >>> list_samples()
        ['dataset_mock_gene_sets', 'dataset_mock_streaming_platforms', ...]
    """
    return sorted(_SAMPLE_REGISTRY.keys())


def load_sample(name: str) -> Dataset:
    """Load a bundled sample dataset by name.

    Sample datasets ship inside the wheel under ``_data/samples/`` and cover
    biological (cancer drivers, MSigDB pathways) and mock (streaming
    platforms, gene sets) use cases. Use :func:`list_samples` to enumerate.

    Args:
        name: Sample identifier from :func:`list_samples`.

    Returns:
        Dataset with the appropriate format and mode applied automatically.

    Raises:
        KeyError: If ``name`` is not in the bundled registry.
        FileNotFoundError: If the data file is missing (run
            ``python python/scripts/sync_data.py`` to populate ``_data``).

    Example:
        >>> from venn_diagram_lab import load_sample, analyze
        >>> ds = load_sample("dataset_real_cancer_drivers_4")
        >>> analyze(ds).model
        'venn-4-set'
    """
    path, meta = _resolve_sample(name)
    binary = meta["mode"] == "binary"
    prefix_cols: int = meta.get("prefix_cols", 1)
    if meta["ext"] == "tsv":
        return load_tsv(path, binary=binary, prefix_cols=prefix_cols)
    return load_csv(path, binary=binary, prefix_cols=prefix_cols)


def _resolve_sample(name: str) -> tuple[Path, _SampleMeta]:
    """Look up a sample's file path + registry metadata, validating both exist."""
    if name not in _SAMPLE_REGISTRY:
        raise KeyError(
            f"{name!r} is not a known sample. Available: {list_samples()}"
        )
    meta = _SAMPLE_REGISTRY[name]
    path = _samples_dir() / f"{name}.{meta['ext']}"
    if not path.is_file():
        raise FileNotFoundError(
            f"Sample file missing: {path}. "
            "Run `python python/scripts/sync_data.py` to populate _data/samples/."
        )
    return path, meta


def load_sample_raw(name: str) -> tuple[list[str], list[list[str]], list[int], FileType]:
    """Companion to :func:`load_sample` returning the raw table for quality analysis.

    Used by ``vdl data validate`` to run
    :func:`venn_diagram_lab.io.analyze_data_quality` over bundled samples
    using the same mode/prefix_cols the registry says :func:`load_sample`
    itself would use, without re-deriving that metadata at the call site.

    Args:
        name: Sample identifier from :func:`list_samples`.

    Returns:
        ``(headers, rows, columns, file_type)`` — see
        :func:`venn_diagram_lab.io.load_csv_raw`.

    Raises:
        KeyError: If ``name`` is not in the bundled registry.
        FileNotFoundError: If the data file is missing.
    """
    path, meta = _resolve_sample(name)
    binary = meta["mode"] == "binary"
    prefix_cols: int = meta.get("prefix_cols", 1)
    delimiter = "\t" if meta["ext"] == "tsv" else None
    return load_csv_raw(path, binary=binary, delimiter=delimiter, prefix_cols=prefix_cols)
