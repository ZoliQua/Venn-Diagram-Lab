# venn-diagram-lab (Python package)

Headless Python companion to the [Venn Diagram Lab](https://github.com/ZoliQua/Venn-Diagram-Lab) web tool.

**Status:** Phase 0 — skeleton only. Real functionality lands in Phase 1+.

## Install (development)

From the repo root (`Venn-Diagram-Lab/`):

```bash
python -m venv .venv
source .venv/bin/activate                    # macOS/Linux
# .venv\Scripts\activate                     # Windows
python python/scripts/sync_data.py            # populates python/src/venn_diagram_lab/_data/
pip install -e python/[dev]
```

## Run tests

```bash
pytest python/tests/ -v
```

## More

See the design spec at `docs/superpowers/specs/2026-05-01-venn-diagram-lab-python-package-design.md`.
