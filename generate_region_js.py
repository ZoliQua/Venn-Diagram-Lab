"""Generate computed region JS files for all SVG Venn diagrams.

For each SVG in models/, this script:
  1. Loads the diagram via SVGVennDiagram
  2. Computes all 2^n regions using Shapely Boolean operations
  3. Writes an individual .js file next to the SVG
  4. Writes a combined all_venn_diagrams.js file

Usage:
    python src/venn7/generate_region_js.py [models_dir]
"""

import json
import pathlib
import sys
import time

import venn7.svg_loader as sl


def generate_single_js(diagram, output_path):
    """Generate a JS file for a single diagram."""
    data = diagram.export_webapp_json()
    js_var = output_path.stem.replace("-", "_")

    with open(output_path, "w") as f:
        f.write(f"const {js_var} = ")
        json.dump(data, f)
        f.write(";\n")


def generate_all(models_dir=None):
    """Generate JS files for all SVG diagrams in models_dir."""
    if models_dir is None:
        models_dir = pathlib.Path(__file__).parent.parent.parent / "models"
    models_dir = pathlib.Path(models_dir)

    output_dir = models_dir / "generated"
    output_dir.mkdir(exist_ok=True)

    diagrams = sl.discover_models(models_dir)
    all_data = {
        "diagrams_list": [],
    }

    total = len(diagrams)
    for idx, (name, diagram) in enumerate(sorted(diagrams.items()), 1):
        print(f"[{idx}/{total}] {name} (n={diagram.n})...", end=" ", flush=True)
        t0 = time.time()

        try:
            data = diagram.export_webapp_json()
            region_count = sum(1 for r in data["regions"] if r)

            # Individual JS file
            js_path = output_dir / f"{name}.js"
            js_var = name.replace("-", "_")
            with open(js_path, "w") as f:
                f.write(f"const {js_var} = ")
                json.dump(data, f)
                f.write(";\n")

            # Add to combined data
            all_data["diagrams_list"].append(name)
            all_data[name] = data

            elapsed = time.time() - t0
            print(f"OK ({region_count} regions, {elapsed:.1f}s)")

        except Exception as e:
            elapsed = time.time() - t0
            print(f"FAILED ({elapsed:.1f}s): {e}")

    # Write combined JS file
    combined_path = output_dir / "all_venn_diagrams.js"
    with open(combined_path, "w") as f:
        f.write("const all_venn_diagrams = ")
        json.dump(all_data, f)
        f.write(";\n")

    # Also copy to app/ directory for the web app
    import shutil
    app_dir = models_dir.parent / "app"
    if app_dir.exists():
        app_copy = app_dir / "all_venn_diagrams.js"
        shutil.copy2(combined_path, app_copy)
        print(f"Copied to {app_copy}")

    print(f"\nGenerated {len(all_data['diagrams_list'])} diagram files in {output_dir}/")
    print(f"Combined file: {combined_path}")


if __name__ == "__main__":
    models_dir = sys.argv[1] if len(sys.argv) > 1 else None
    generate_all(models_dir)
