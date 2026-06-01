"""Item Share Distribution: per-membership-count item totals.

Mirror of the webtool's ``src/utils/shareDistribution.ts``.
"""

from __future__ import annotations

from typing import Any

import numpy.typing as npt

__all__ = ["item_share_distribution"]

_MATRIX_NDIM = 2


def item_share_distribution(matrix: npt.NDArray[Any]) -> dict[int, int]:
    """Count items per set-membership level.

    Parameters
    ----------
    matrix
        Binary item-by-set matrix (rows = items, cols = sets, cells in {0, 1}).

    Returns
    -------
    dict
        ``{k: count}`` for ``k`` in ``1..n_sets``. All bins are present
        even when their count is zero. Rows that sum to zero are skipped
        (universe-rule violation; defensive).
    """
    if matrix.size == 0:
        n_sets = matrix.shape[1] if matrix.ndim == _MATRIX_NDIM else 0
        return {k: 0 for k in range(1, n_sets + 1)}

    n_sets = matrix.shape[1]
    row_sums = (matrix > 0).sum(axis=1).astype(int)
    counts: dict[int, int] = {k: 0 for k in range(1, n_sets + 1)}
    for k in row_sums:
        kk = int(k)
        if 1 <= kk <= n_sets:
            counts[kk] += 1
    return counts
