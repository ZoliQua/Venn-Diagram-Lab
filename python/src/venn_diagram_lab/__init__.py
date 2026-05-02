"""venn-diagram-lab — headless Venn diagram analysis and rendering.

Companion Python package to the Venn Diagram Lab web tool
(https://github.com/ZoliQua/Venn-Diagram-Lab).

Phase 1 public API: data loading (load_csv, load_tsv, load_gmt, load_gmx,
load_sample), region computation (analyze), statistics (lazy on RegionResult),
model discovery (list_models). Rendering and CLI land in Phases 2-5.
"""

from venn_diagram_lab.analysis import (
    ModelInfo,
    RegionData,
    RegionResult,
    analyze,
    list_models,
)
from venn_diagram_lab.errors import (
    IncompatibleModelError,
    InvalidDatasetError,
    UnknownModelError,
    VennDiagramError,
)
from venn_diagram_lab.io import (
    Dataset,
    load_csv,
    load_gmt,
    load_gmx,
    load_tsv,
)
from venn_diagram_lab.proportional import generate_proportional_svg
from venn_diagram_lab.render.image import MplImage
from venn_diagram_lab.render.network import render_network
from venn_diagram_lab.render.svg import SvgImage, render_venn_svg
from venn_diagram_lab.render.upset import render_upset
from venn_diagram_lab.samples import list_samples, load_sample
from venn_diagram_lab.statistics import StatisticsResult
from venn_diagram_lab.version import __version__

__all__ = [
    "Dataset",
    "IncompatibleModelError",
    "InvalidDatasetError",
    "ModelInfo",
    "MplImage",
    "RegionData",
    "RegionResult",
    "StatisticsResult",
    "SvgImage",
    "UnknownModelError",
    "VennDiagramError",
    "__version__",
    "analyze",
    "generate_proportional_svg",
    "list_models",
    "list_samples",
    "load_csv",
    "load_gmt",
    "load_gmx",
    "load_sample",
    "load_tsv",
    "render_network",
    "render_upset",
    "render_venn_svg",
]
