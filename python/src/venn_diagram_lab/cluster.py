"""Hierarchical clustering for the Cluster Heatmap.

Wraps ``scipy.cluster.hierarchy.linkage`` to produce a normalized output
that mirrors the webtool's pure-JS ``clusterSetOrder`` (leaf_order +
merge heights + sizes).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

import numpy.typing as npt
from scipy.cluster.hierarchy import linkage as scipy_linkage
from scipy.spatial.distance import squareform

__all__ = ["ClusterOrder", "LinkageMethod", "Merge", "cluster_set_order"]

LinkageMethod = Literal["average", "complete", "single"]

_MATRIX_NDIM = 2


@dataclass(frozen=True)
class Merge:
    """A single agglomerative merge step.

    Attributes
    ----------
    left, right
        Cluster ids being merged. Leaves are ``0..N-1``; the internal node
        formed by the i-th merge gets id ``N + i``.
    height
        Linkage distance at which the merge occurs.
    size
        Number of original leaves in the merged cluster.
    """

    left: int
    right: int
    height: float
    size: int


@dataclass(frozen=True)
class ClusterOrder:
    """Result of :func:`cluster_set_order`.

    Attributes
    ----------
    leaf_order
        Original set indices in left-to-right dendrogram order.
    merges
        The ``N-1`` merges in formation order.
    """

    leaf_order: list[int]
    merges: list[Merge]


def cluster_set_order(
    D: npt.NDArray[Any],  # noqa: N803  (D for distance matrix, math convention)
    *,
    method: LinkageMethod = "average",
) -> ClusterOrder:
    """Hierarchical agglomerative clustering on a symmetric distance matrix.

    Parameters
    ----------
    D
        Symmetric NxN distance matrix, ``D[i, j] >= 0``, ``D[i, i] == 0``.
    method
        Linkage method, one of ``"average"`` (UPGMA), ``"complete"``,
        ``"single"``.

    Returns
    -------
    ClusterOrder
        ``leaf_order`` lists the original set indices in left-to-right
        order; ``merges`` lists the ``N-1`` merges in formation order with
        ``left`` / ``right`` cluster ids (leaves: ``0..N-1``; internal
        nodes: ``N..2N-2``), ``height`` (linkage distance at merge time),
        and ``size`` (number of leaves in the merged cluster).

    Notes
    -----
    At each internal node the subtree whose minimum original leaf index
    is smaller is placed on the left. This deterministic convention
    matches the webtool's pure-JS ``clusterSetOrder`` so the Web, Python
    and R packages emit identical leaf orderings for the same input.
    """
    n = int(D.shape[0]) if D.ndim == _MATRIX_NDIM else 0
    if n == 0:
        return ClusterOrder(leaf_order=[], merges=[])
    if n == 1:
        return ClusterOrder(leaf_order=[0], merges=[])

    condensed = squareform(D, checks=False)
    linkage_matrix = scipy_linkage(condensed, method=method)
    merges = [
        Merge(
            left=int(row[0]),
            right=int(row[1]),
            height=float(row[2]),
            size=int(row[3]),
        )
        for row in linkage_matrix
    ]
    leaf_order = _ordered_leaves(linkage_matrix, n)
    return ClusterOrder(leaf_order=leaf_order, merges=merges)


def _ordered_leaves(linkage_matrix: npt.NDArray[Any], n: int) -> list[int]:
    """Extract a deterministic leaf order from a scipy linkage matrix.

    At every internal node the subtree whose minimum leaf index is
    smaller is placed on the left. Mirrors the webtool's
    ``clusterSetOrder`` ordering rule so the three packages
    (Web / Python / R) emit the same ``leaf_order`` for the same
    distance matrix.
    """
    # node id -> ordered list of leaves below it.
    # Leaves: 0..n-1; internal node formed by the i-th merge: n + i.
    leaves_by_node: dict[int, list[int]] = {i: [i] for i in range(n)}
    for i, row in enumerate(linkage_matrix):
        left = int(row[0])
        right = int(row[1])
        l_leaves = leaves_by_node[left]
        r_leaves = leaves_by_node[right]
        if l_leaves[0] <= r_leaves[0]:
            combined = l_leaves + r_leaves
        else:
            combined = r_leaves + l_leaves
        leaves_by_node[n + i] = combined
    root_id = n + len(linkage_matrix) - 1
    return list(leaves_by_node[root_id])
