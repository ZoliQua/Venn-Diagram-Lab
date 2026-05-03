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


def test_version_format_is_pep440() -> None:
    """Version follows MAJOR.MINOR.PATCH plus optional PEP 440 pre-release / build segments."""
    # PEP 440 lite: 2.0.0, 2.0.0rc2, 2.0.0a1, 2.0.0b3, 2.0.0.post1, 2.0.0+build.1
    pattern = re.compile(r"^\d+\.\d+\.\d+(?:(?:a|b|rc|\.post|\.dev)\d+)?(?:\+[\w.]+)?$")
    assert pattern.match(venn_diagram_lab.__version__), (
        f"Version '{venn_diagram_lab.__version__}' does not match PEP 440 pattern"
    )


def test_version_is_v2() -> None:
    """v2.0.0 is the first unified PyPI release (frontend + python share major version).

    Accepts release-candidate suffixes (e.g. 2.0.0rc2) used during TestPyPI dry-runs.
    """
    v = venn_diagram_lab.__version__
    assert v == "2.0.0" or v.startswith("2.0.0rc"), f"unexpected version: {v}"
