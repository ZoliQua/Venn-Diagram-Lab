"""Parity tests against the React webapp.

For each (sample, kind) pair, regenerate the Python TSV in a temp dir, then
compare against the committed golden fixture in fixtures/expected/.

Two layers of comparison:

1. `assert_frame_equal` after pandas round-trip — diagnostic, surfaces
   per-cell differences with row/column context.
2. Raw byte-equality — catches sort-stability / trailing-whitespace
   divergences that pandas would silently normalize.

Fixtures are regenerated via `npm run fixtures:parity` from the repo root;
see scripts/generate-parity-fixtures.mts.

Historical note
---------------

``dataset_mock_streaming_platforms`` used to be ``xfail(strict=True)``: the
source CSV contains two rows with the same Title ("Dark Matter" — one Series
on Apple TV+, one Movie on Netflix/HBO/Disney/Amazon), and the webapp's
binary loader treated each *row* as a distinct item while Python's set-based
loader deduplicated by identifier. Since v2.7.0 the webapp loader also
merges repeated identifiers (OR semantics across the selected sets) and skips
blank-identifier rows, so all implementations agree and the sample is a
regular parity case again.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest
from pandas.testing import assert_frame_equal

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.samples import load_sample

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "expected"

# (sample_name, model_name) — must match scripts/generate-parity-fixtures.mts SAMPLES table.
PAIRS: list[tuple[str, str]] = [
    ("dataset_real_cancer_drivers_4",       "venn-4-set"),
    ("dataset_real_msigdb_immune_pathways", "venn-4-set"),
    ("dataset_real_msigdb_cancer_pathways", "venn-5-set-grunbaum"),
    ("dataset_mock_gene_sets",              "venn-6-set"),
    ("dataset_mock_streaming_platforms",    "venn-8-set"),
]

KINDS = ("region_summary", "matrix", "statistics", "one_vs_rest")

WRITER_BY_KIND = {
    "region_summary": "to_region_summary_tsv",
    "matrix":         "to_matrix_tsv",
    "statistics":     "to_statistics_tsv",
    "one_vs_rest":    "to_one_vs_rest_tsv",
}

@pytest.fixture(scope="module")
def results_by_sample() -> dict[str, object]:
    """Compute analyze() once per sample so 3 kinds x 5 samples don't re-load."""
    out: dict[str, object] = {}
    for sample_name, _model in PAIRS:
        ds = load_sample(sample_name)
        out[sample_name] = analyze(ds, model="auto")
    return out


def _write_python_tsv(result: object, kind: str, path: Path) -> None:
    method = getattr(result, WRITER_BY_KIND[kind])
    method(path)


@pytest.mark.parametrize(("sample_name", "model"), PAIRS, ids=[p[0] for p in PAIRS])
@pytest.mark.parametrize("kind", KINDS)
def test_python_matches_webapp_dataframe(
    sample_name: str,
    model: str,
    kind: str,
    results_by_sample: dict[str, object],
    tmp_path: Path,
) -> None:
    """Compare via pandas DataFrames — diagnostic, ignores trailing whitespace."""
    fixture = FIXTURES_DIR / f"{sample_name}__{model}__{kind}.tsv"
    assert fixture.is_file(), f"Missing fixture: {fixture} (run: npm run fixtures:parity)"

    actual_path = tmp_path / fixture.name
    _write_python_tsv(results_by_sample[sample_name], kind, actual_path)

    expected_df = pd.read_csv(fixture, sep="\t", dtype=str, keep_default_na=False)
    actual_df = pd.read_csv(actual_path, sep="\t", dtype=str, keep_default_na=False)

    assert list(actual_df.columns) == list(expected_df.columns), (
        f"Column mismatch for {sample_name}/{kind}:\n"
        f"  actual:   {list(actual_df.columns)}\n"
        f"  expected: {list(expected_df.columns)}"
    )
    assert_frame_equal(actual_df, expected_df, check_dtype=False)


@pytest.mark.parametrize(("sample_name", "model"), PAIRS, ids=[p[0] for p in PAIRS])
@pytest.mark.parametrize("kind", KINDS)
def test_python_matches_webapp_bytes(
    sample_name: str,
    model: str,
    kind: str,
    results_by_sample: dict[str, object],
    tmp_path: Path,
) -> None:
    """Strict byte-for-byte comparison — guards against sort-stability divergence."""
    fixture = FIXTURES_DIR / f"{sample_name}__{model}__{kind}.tsv"
    actual_path = tmp_path / fixture.name
    _write_python_tsv(results_by_sample[sample_name], kind, actual_path)

    expected_bytes = fixture.read_bytes()
    actual_bytes = actual_path.read_bytes()

    if expected_bytes != actual_bytes:
        # Provide a useful diff in the failure message rather than the raw 50KB blob.
        exp_lines = expected_bytes.decode("utf-8").splitlines()
        act_lines = actual_bytes.decode("utf-8").splitlines()
        max_diffs_shown = 5
        diff: list[str] = []
        for i, (e, a) in enumerate(zip(exp_lines, act_lines, strict=False)):
            if e != a:
                diff.append(f"  line {i + 1}:\n    expected: {e!r}\n    actual:   {a!r}")
                if len(diff) >= max_diffs_shown:
                    total_diffs = sum(
                        1
                        for ee, aa in zip(exp_lines, act_lines, strict=False)
                        if ee != aa
                    )
                    diff.append(
                        f"  ... and {total_diffs - max_diffs_shown} more diffs"
                    )
                    break
        if len(act_lines) != len(exp_lines):
            diff.append(f"  line count: actual={len(act_lines)} expected={len(exp_lines)}")
        raise AssertionError(f"Byte mismatch for {sample_name}/{kind}:\n" + "\n".join(diff))
