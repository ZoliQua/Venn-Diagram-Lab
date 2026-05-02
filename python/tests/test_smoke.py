"""Phase 0 smoke tests — verify the package skeleton is in place."""

import re

import venn_diagram_lab


def test_package_imports() -> None:
    """The package must be importable."""
    assert venn_diagram_lab is not None


def test_version_attribute_exists() -> None:
    """`venn_diagram_lab.__version__` is exposed and is a non-empty string."""
    assert hasattr(venn_diagram_lab, "__version__")
    assert isinstance(venn_diagram_lab.__version__, str)
    assert len(venn_diagram_lab.__version__) > 0


def test_version_format_is_semver() -> None:
    """Version follows MAJOR.MINOR.PATCH semver format."""
    pattern = re.compile(r"^\d+\.\d+\.\d+(?:[-+].+)?$")
    assert pattern.match(venn_diagram_lab.__version__), (
        f"Version '{venn_diagram_lab.__version__}' does not match semver pattern"
    )


def test_version_is_phase_three() -> None:
    """During Phase 3 development, version is 0.4.0."""
    assert venn_diagram_lab.__version__ == "0.4.0"
