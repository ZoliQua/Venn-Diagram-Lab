"""Generate computed region JSON files for SVG Venn diagrams.

For each SVG in models/svg/, this script:
  1. Parses shape geometries (circle, ellipse, rect, path)
  2. Computes all 2^n region polygons using Shapely Boolean operations
  3. Writes a JSON file to models/json/

Usage:
    python generate_region_json.py                    # all missing JSONs
    python generate_region_json.py --all              # regenerate all
    python generate_region_json.py venn-3e-set-rectangles  # specific diagram
"""

import json
import math
import pathlib
import re
import sys
import time
import warnings
from itertools import combinations

from shapely.geometry import Point, Polygon, box
from shapely.validation import make_valid

warnings.filterwarnings("ignore")

MODELS_DIR = pathlib.Path(__file__).parent / "models"
SVG_DIR = MODELS_DIR / "svg"
JSON_DIR = MODELS_DIR / "json"

STANDARD_COLORS = {
    "A": "#FFF200", "B": "#2E3192", "C": "#ED1C24", "D": "#808285",
    "E": "#3C2415", "F": "#9E1F63", "G": "#CA4B9B", "H": "#21AED1",
}


# ── SVG Shape Parsing ──────────────────────────────────────────────

def parse_svg_shapes(svg_content):
    """Extract shapes from SVG content, return dict of label → Shapely polygon."""
    shapes = {}
    viewbox = re.search(r'viewBox="([^"]+)"', svg_content)
    vb = [float(x) for x in viewbox.group(1).split()] if viewbox else [0, 0, 700, 700]

    # Find all shape elements inside <g id="Shapes">
    shapes_block = re.search(r'<g\s+id="Shapes"[^>]*>(.*?)</g>', svg_content, re.DOTALL)
    if not shapes_block:
        return shapes, vb

    block = shapes_block.group(1)

    # Parse circles
    for m in re.finditer(r'<circle\s+id="Shape([A-Z])"[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"[^>]*r="([^"]+)"', block):
        label, cx, cy, r = m.group(1), float(m.group(2)), float(m.group(3)), float(m.group(4))
        shapes[label] = Point(cx, cy).buffer(r, resolution=64)

    # Parse ellipses
    for m in re.finditer(r'<ellipse\s+id="Shape([A-Z])"[^>]*', block):
        label = m.group(1)
        elem = m.group(0)
        cx = float(re.search(r'cx="([^"]+)"', elem).group(1))
        cy = float(re.search(r'cy="([^"]+)"', elem).group(1))
        rx = float(re.search(r'rx="([^"]+)"', elem).group(1))
        ry = float(re.search(r'ry="([^"]+)"', elem).group(1))
        # Check for transform
        tr = re.search(r'transform="matrix\(([^"]+)\)"', elem)
        if tr:
            vals = [float(x) for x in tr.group(1).split()]
            # Create ellipse points and apply transform
            pts = []
            for i in range(128):
                t = 2 * math.pi * i / 128
                x = cx + rx * math.cos(t)
                y = cy + ry * math.sin(t)
                if len(vals) == 6:
                    a, b, c, d, e, f = vals
                    nx = a * x + c * y + e
                    ny = b * x + d * y + f
                    pts.append((nx, ny))
                else:
                    pts.append((x, y))
            pts.append(pts[0])
            shapes[label] = Polygon(pts)
        else:
            pts = [(cx + rx * math.cos(2 * math.pi * i / 128),
                     cy + ry * math.sin(2 * math.pi * i / 128)) for i in range(128)]
            pts.append(pts[0])
            shapes[label] = Polygon(pts)

    # Parse rects
    for m in re.finditer(r'<rect\s+id="Shape([A-Z])"[^>]*', block):
        label = m.group(1)
        elem = m.group(0)
        x = float(re.search(r'\sx="([^"]+)"', elem).group(1))
        y = float(re.search(r'\sy="([^"]+)"', elem).group(1))
        w = float(re.search(r'width="([^"]+)"', elem).group(1))
        h = float(re.search(r'height="([^"]+)"', elem).group(1))
        shapes[label] = box(x, y, x + w, y + h)

    # Parse polygons
    for m in re.finditer(r'<polygon\s+id="Shape([A-Z])"[^>]*\spoints="([^"]+)"', block):
        label, points_str = m.group(1), m.group(2)
        nums = [float(x) for x in points_str.split()]
        coords = [(nums[i], nums[i + 1]) for i in range(0, len(nums) - 1, 2)]
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        if len(coords) >= 3:
            shapes[label] = Polygon(coords)

    # Parse paths
    for m in re.finditer(r'<path\s+id="Shape([A-Z])"[^>]*\sd="([^"]+)"', block):
        label, d = m.group(1), m.group(2)
        poly = path_d_to_polygon(d)
        if poly and not poly.is_empty:
            shapes[label] = poly

    # Validate all polygons
    for label in list(shapes.keys()):
        p = shapes[label]
        if not p.is_valid:
            p = make_valid(p)
        if p.geom_type == "MultiPolygon":
            p = max(p.geoms, key=lambda g: g.area)
        elif p.geom_type == "GeometryCollection":
            polys = [g for g in p.geoms if g.geom_type == "Polygon"]
            p = max(polys, key=lambda g: g.area) if polys else Polygon()
        shapes[label] = p

    return shapes, vb


def path_d_to_polygon(d_str, n_seg=12):
    """Convert SVG path d attribute to Shapely Polygon (handles M,L,l,H,h,V,v,C,c,s,Z)."""
    tokens = [m.group() for m in re.finditer(
        r'[MmLlCcHhVvZzSsQqTtAa]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', d_str)]

    pts = []
    cx, cy, sx, sy = 0, 0, 0, 0
    last_cx2, last_cy2 = None, None
    i = 0

    def num():
        nonlocal i; i += 1; return float(tokens[i])
    def is_num(idx):
        return idx < len(tokens) and tokens[idx][0] not in 'MmLlCcHhVvZzSsQqTtAa'
    def bez3(p0, p1, p2, p3):
        return [((1 - t / n_seg) ** 3 * p0[0] + 3 * (1 - t / n_seg) ** 2 * (t / n_seg) * p1[0] +
                 3 * (1 - t / n_seg) * (t / n_seg) ** 2 * p2[0] + (t / n_seg) ** 3 * p3[0],
                 (1 - t / n_seg) ** 3 * p0[1] + 3 * (1 - t / n_seg) ** 2 * (t / n_seg) * p1[1] +
                 3 * (1 - t / n_seg) * (t / n_seg) ** 2 * p2[1] + (t / n_seg) ** 3 * p3[1])
                for t in range(1, n_seg + 1)]

    while i < len(tokens):
        cmd = tokens[i]
        if cmd == 'M':
            cx, cy = num(), num(); sx, sy = cx, cy; pts.append((cx, cy))
            while is_num(i + 1): cx, cy = num(), num(); pts.append((cx, cy))
        elif cmd == 'm':
            cx += num(); cy += num(); sx, sy = cx, cy; pts.append((cx, cy))
        elif cmd == 'L':
            while is_num(i + 1): cx, cy = num(), num(); pts.append((cx, cy))
            last_cx2, last_cy2 = None, None
        elif cmd == 'l':
            while is_num(i + 1): cx += num(); cy += num(); pts.append((cx, cy))
            last_cx2, last_cy2 = None, None
        elif cmd == 'H':
            while is_num(i + 1): cx = num(); pts.append((cx, cy))
        elif cmd == 'h':
            while is_num(i + 1): cx += num(); pts.append((cx, cy))
        elif cmd == 'V':
            while is_num(i + 1): cy = num(); pts.append((cx, cy))
        elif cmd == 'v':
            while is_num(i + 1): cy += num(); pts.append((cx, cy))
        elif cmd == 'C':
            while is_num(i + 1):
                x1, y1, x2, y2, x3, y3 = num(), num(), num(), num(), num(), num()
                pts.extend(bez3((cx, cy), (x1, y1), (x2, y2), (x3, y3)))
                last_cx2, last_cy2 = x2, y2; cx, cy = x3, y3
        elif cmd == 'c':
            while is_num(i + 1):
                d1, d2, d3, d4, d5, d6 = num(), num(), num(), num(), num(), num()
                p1, p2, p3 = (cx + d1, cy + d2), (cx + d3, cy + d4), (cx + d5, cy + d6)
                pts.extend(bez3((cx, cy), p1, p2, p3))
                last_cx2, last_cy2 = p2; cx, cy = p3
        elif cmd == 's':
            while is_num(i + 1):
                d3, d4, d5, d6 = num(), num(), num(), num()
                p1 = (2 * cx - last_cx2, 2 * cy - last_cy2) if last_cx2 is not None else (cx, cy)
                p2, p3 = (cx + d3, cy + d4), (cx + d5, cy + d6)
                pts.extend(bez3((cx, cy), p1, p2, p3))
                last_cx2, last_cy2 = p2; cx, cy = p3
        elif cmd == 'S':
            while is_num(i + 1):
                x2, y2, x3, y3 = num(), num(), num(), num()
                p1 = (2 * cx - last_cx2, 2 * cy - last_cy2) if last_cx2 is not None else (cx, cy)
                pts.extend(bez3((cx, cy), p1, (x2, y2), (x3, y3)))
                last_cx2, last_cy2 = (x2, y2); cx, cy = x3, y3
        elif cmd in ('Z', 'z'):
            if pts and (cx != sx or cy != sy):
                pts.append((sx, sy))
            cx, cy = sx, sy
        i += 1

    if len(pts) < 3:
        return Polygon()
    if pts[0] != pts[-1]:
        pts.append(pts[0])
    try:
        return Polygon(pts)
    except Exception:
        return Polygon()


# ── Coordinate Transform ───────────────────────────────────────────

def compute_transform(shapes):
    """Compute transform from SVG coords to normalized [-50,50] coords."""
    all_xs, all_ys = [], []
    for p in shapes.values():
        if p.is_empty:
            continue
        bounds = p.bounds  # (minx, miny, maxx, maxy)
        all_xs.extend([bounds[0], bounds[2]])
        all_ys.extend([bounds[1], bounds[3]])

    if not all_xs:
        return 350, 350, 7.0

    min_x, max_x = min(all_xs), max(all_xs)
    min_y, max_y = min(all_ys), max(all_ys)
    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2
    span = max(max_x - min_x, max_y - min_y)
    scale = span / 100.0 if span > 0 else 1.0

    return cx, cy, scale


def polygon_to_path_normalized(polygon, cx, cy, scale):
    """Convert Shapely polygon to SVG path string in normalized coordinates."""
    if polygon.is_empty:
        return ""
    coords = list(polygon.exterior.coords)
    if len(coords) < 3:
        return ""

    parts = []
    for i, (x, y) in enumerate(coords[:-1]):  # skip closing duplicate
        nx = round((x - cx) / scale, 2)
        ny = round(-(y - cy) / scale, 2)  # Y flipped
        prefix = "M" if i == 0 else "L"
        parts.append(f"{prefix} {nx} {ny}")
    parts.append("Z")
    return " ".join(parts)


# ── Region Computation ─────────────────────────────────────────────

def compute_regions(shapes, sets):
    """Compute all 2^n region polygons. Returns dict of label → polygon."""
    n = len(sets)
    regions = {}

    for mask in range(1, 2 ** n):
        included = [sets[i] for i in range(n) if mask & (1 << i)]
        excluded = [sets[i] for i in range(n) if not (mask & (1 << i))]
        label = "".join(sorted(included))

        region = shapes[included[0]]
        for s in included[1:]:
            region = region.intersection(shapes[s])
        for s in excluded:
            region = region.difference(shapes[s])

        if not region.is_empty and region.area > 0.5:
            if region.geom_type == "MultiPolygon":
                region = max(region.geoms, key=lambda g: g.area)
            elif region.geom_type == "GeometryCollection":
                polys = [g for g in region.geoms if g.geom_type == "Polygon"]
                region = max(polys, key=lambda g: g.area) if polys else Polygon()
            regions[label] = region

    return regions


def region_centroid(region):
    """Get a point guaranteed inside the region."""
    c = region.centroid
    if region.contains(Point(c.x, c.y)):
        return c.x, c.y
    rp = region.representative_point()
    return rp.x, rp.y


# ── JSON Generation ────────────────────────────────────────────────

def generate_json_for_svg(svg_path):
    """Generate JSON data for a single SVG file."""
    with open(svg_path) as f:
        content = f.read()

    shapes, vb = parse_svg_shapes(content)
    if not shapes:
        raise ValueError(f"No shapes found in {svg_path}")

    sets = sorted(shapes.keys())
    n = len(sets)

    # Extract name from Title text
    title_match = re.search(r'id="Title"[^>]*>([^<]+)<', content)
    name = title_match.group(1) if title_match else svg_path.stem.replace("-", " ").title()

    # Extract colors from SVG
    colors = {}
    for letter in sets:
        m = re.search(rf'id="Shape{letter}"[^>]*fill:([#\w]+)', content)
        if m:
            colors[letter] = m.group(1)
        else:
            colors[letter] = STANDARD_COLORS.get(letter, "#000000")

    # Extract set names
    set_names = {}
    for letter in sets:
        m = re.search(rf'id="Name{letter}"[^>]*>([^<]+)<', content)
        set_names[letter] = m.group(1) if m else f"Name{letter}"

    # Compute transform
    cx, cy, scale = compute_transform(shapes)

    # Generate normalized curve paths
    curves = []
    for letter in sets:
        curves.append(polygon_to_path_normalized(shapes[letter], cx, cy, scale))

    # Compute region polygons
    regions_dict = compute_regions(shapes, sets)

    # Build regions array (indexed by bitmask) and region_labels
    total_regions = 2 ** n
    regions_array = [""] * total_regions  # index 0 = exterior (empty)
    region_labels = {}

    for mask in range(1, total_regions):
        included = [sets[i] for i in range(n) if mask & (1 << i)]
        label = "".join(sorted(included))

        if label in regions_dict:
            region = regions_dict[label]
            regions_array[mask] = polygon_to_path_normalized(region, cx, cy, scale)

            # Region label position in SVG coordinates
            rx, ry = region_centroid(region)
            region_labels[label] = [round(rx, 1), round(ry, 1)]

    data = {
        "name": name,
        "n": n,
        "sets": sets,
        "curves": curves,
        "regions": regions_array,
        "colors": colors,
        "region_labels": region_labels,
        "set_names": set_names,
    }

    return data


# ── Main ───────────────────────────────────────────────────────────

def main():
    JSON_DIR.mkdir(exist_ok=True)

    # Determine which files to process
    if len(sys.argv) > 1 and sys.argv[1] != "--all":
        # Specific file(s)
        targets = []
        for arg in sys.argv[1:]:
            name = arg.replace(".svg", "").replace(".json", "")
            svg_path = SVG_DIR / f"{name}.svg"
            if svg_path.exists():
                targets.append((name, svg_path))
            else:
                print(f"NOT FOUND: {svg_path}")
    elif "--all" in sys.argv:
        # All SVGs
        targets = [(p.stem, p) for p in sorted(SVG_DIR.glob("*.svg"))]
    else:
        # Only missing JSONs
        targets = []
        for svg_path in sorted(SVG_DIR.glob("*.svg")):
            json_path = JSON_DIR / f"{svg_path.stem}.json"
            if not json_path.exists():
                targets.append((svg_path.stem, svg_path))

    if not targets:
        print("Nothing to generate. Use --all to regenerate all.")
        return

    print(f"Generating {len(targets)} JSON file(s)...\n")

    for idx, (name, svg_path) in enumerate(targets, 1):
        json_path = JSON_DIR / f"{name}.json"
        print(f"[{idx}/{len(targets)}] {name}...", end=" ", flush=True)
        t0 = time.time()

        try:
            data = generate_json_for_svg(svg_path)
            region_count = len(data["region_labels"])
            expected = 2 ** data["n"] - 1

            with open(json_path, "w") as f:
                json.dump(data, f)

            elapsed = time.time() - t0
            status = "OK" if region_count == expected else f"PARTIAL ({region_count}/{expected})"
            print(f"{status} (n={data['n']}, {region_count} regions, {elapsed:.1f}s)")

        except Exception as e:
            elapsed = time.time() - t0
            print(f"FAILED ({elapsed:.1f}s): {e}")

    print("\nDone!")


if __name__ == "__main__":
    main()
