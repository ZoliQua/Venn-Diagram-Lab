#!/usr/bin/env python3
"""
unify_svgs.py - Transform all SVG files in models/ to a unified structure.
SVG Version: 3.0.0

Processes:
  - edwards-venn-2-set.svg through edwards-venn-7-set.svg
  - venn-2-set.svg through venn-7-set.svg, venn-7-set-work.svg
"""

import re
import os

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

COMMENT = '<!-- Created by Zoltan Dul in 2026 - free to use with MIT license. Part of React Venn Diagram Analyzer - https://github.com/ZoliQua/React-Venn-Diagram-Analyser - SVG Version: 3.0.0 -->'

LETTERS = "ABCDEFG"

EDWARDS_BULLET_COLORS = {
    "A": "#FFF200",
    "B": "#2E3192",
    "C": "#ED1C24",
    "D": "#58595B",
    "E": "#3C2415",
    "F": "#9E1F63",
    "G": "#F7941E",
}

TEXT_STYLE_DARK = "fill:#262262;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';"
TEXT_STYLE_WHITE = "fill:#FFFFFF;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';"
TEXT_STYLE_HEADER = f"{TEXT_STYLE_DARK}font-size:14;"


def make_bullet(letter, color, cx, cy, indent="\t"):
    return f'{indent}<circle id="Bullet{letter}" style="opacity:0.2;fill:{color};stroke:#010101;stroke-width:2;" cx="{cx}" cy="{cy}" r="6.9"/>'


def extract_viewbox(content):
    """Extract viewBox dimensions from SVG."""
    m = re.search(r'viewBox="0 0 (\d+) (\d+)"', content)
    if m:
        return int(m.group(1)), int(m.group(2))
    return 700, 700


def build_svg_wrapper(viewbox_w, viewbox_h, inner):
    """Build the full SVG wrapper."""
    return f'''<?xml version="1.0" encoding="utf-8"?>
{COMMENT}
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
\t x="0px" y="0px" viewBox="0 0 {viewbox_w} {viewbox_h}" style="enable-background:new 0 0 {viewbox_w} {viewbox_h};" xml:space="preserve">
{inner}
</svg>
'''


# ============================================================
# edwards-venn-7-set.svg - Already well-structured, just add IDs to texts
# ============================================================
def process_edwards_venn_7(content):
    print("  Processing edwards-venn-7-set.svg...")

    # Add id="Title" to the header text
    content = re.sub(
        r'(<text )(transform="matrix\(1 0 0 1 87\.875 127\.2716\)" style="[^"]*">Edwards-Venn 7-set diagram</text>)',
        r'\1id="Title" \2',
        content
    )

    # Add id="NameX" to each name text
    for letter in LETTERS:
        content = re.sub(
            rf'(<text )(transform="[^"]*" style="[^"]*">Name{letter}</text>)',
            rf'\1id="Name{letter}" \2',
            content
        )

    # Add id="Count_X" to each value text
    # Find all text elements in Group_Values that don't have IDs
    # Match text content to determine the ID
    def add_count_id(m):
        prefix = m.group(1)
        rest = m.group(2)
        text_content = m.group(3)
        if f'id="Count_{text_content}"' in prefix:
            return m.group(0)
        return f'{prefix}id="Count_{text_content}" {rest}>{text_content}</text>'

    content = re.sub(
        r'(<text )(transform="[^"]*" style="[^"]*")>([A-G]+)</text>',
        add_count_id,
        content
    )

    # Update version
    content = re.sub(r'SVG Version: [0-9.]+', 'SVG Version: 3.0.0', content)

    return content


# ============================================================
# edwards-venn-6-set.svg - Has Layer_1 group + Text group, flat circles
# ============================================================
def process_edwards_venn_6(content):
    print("  Processing edwards-venn-6-set.svg...")

    vw, vh = extract_viewbox(content)

    # Extract shape paths from <g id="Layer_1">
    shapes_block = re.search(r'<g id="Layer_1">(.*?)</g>', content, re.DOTALL)
    shape_paths = re.findall(r'(<path[^>]*/>)', shapes_block.group(1)) if shapes_block else []

    # Shape order in file: A(brown #3C2415), B(gray #58595B), C(red #ED1C24), D(yellow #FFF200), E(blue #2E3192), F(purple #9E1F63)
    shape_letters = ["A", "B", "C", "D", "E", "F"]

    shapes_out = ['<g id="Shapes">']
    shape_colors = {}
    for i, path in enumerate(shape_paths):
        letter = shape_letters[i]
        # Add id to shape
        path_with_id = re.sub(r'<path ', f'<path id="Shape{letter}" ', path)
        shapes_out.append(f'\t{path_with_id}')
        # Extract fill color
        fill_m = re.search(r'fill:(#[0-9A-Fa-f]{6})', path)
        if fill_m:
            shape_colors[letter] = fill_m.group(1)
    shapes_out.append('</g>')

    # Extract text elements from <g id="Text">
    text_block = re.search(r'<g id="Text">(.*?)</g>', content, re.DOTALL)
    if not text_block:
        # Flat text elements outside groups - find all
        text_block_str = content
    else:
        text_block_str = text_block.group(1)

    all_texts = re.findall(r'<text[^>]*>[^<]+</text>', text_block_str)

    header_texts = []
    name_texts = []
    value_texts = []
    for t in all_texts:
        text_content = re.search(r'>([^<]+)</text>', t).group(1)
        if "set diagram" in text_content:
            header_texts.append((text_content, t))
        elif text_content.startswith("Name"):
            name_texts.append((text_content, t))
        elif re.match(r'^[A-G]+$', text_content):
            value_texts.append((text_content, t))

    # Build texts
    texts_out = ['<g id="Texts">']
    texts_out.append('\t<g id="Header">')
    for tc, t in header_texts:
        t_with_id = re.sub(r'<text ', '<text id="Title" ', t)
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Names">')
    for tc, t in name_texts:
        letter = tc.replace("Name", "")
        t_with_id = re.sub(r'<text ', f'<text id="Name{letter}" ', t)
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Values">')
    for tc, t in value_texts:
        t_with_id = re.sub(r'<text ', f'<text id="Count_{tc}" ', t)
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')
    texts_out.append('</g>')

    # Extract bullet circles
    bullet_circles = re.findall(r'<circle[^>]*r="6\.9"[^>]*/>', content)
    if not bullet_circles:
        bullet_circles = re.findall(r'<circle[^>]*/>', content)

    bullets_out = ['<g id="Group_Bullets">']
    # Edwards bullets: A, B, C, D, E, F
    for i, circ in enumerate(bullet_circles):
        letter = shape_letters[i]
        circ_with_id = re.sub(r'<circle ', f'<circle id="Bullet{letter}" ', circ)
        # Ensure style attribute format
        if 'style="' not in circ_with_id:
            circ_with_id = re.sub(
                r'opacity="([^"]*)" fill="([^"]*)" stroke="([^"]*)" stroke-width="([^"]*)"',
                r'style="opacity:\1;fill:\2;stroke:\3;stroke-width:\4;"',
                circ_with_id
            )
        bullets_out.append(f'\t{circ_with_id}')
    bullets_out.append('</g>')

    inner = '\n'.join(shapes_out) + '\n' + '\n'.join(texts_out) + '\n' + '\n'.join(bullets_out)
    return build_svg_wrapper(vw, vh, inner)


# ============================================================
# edwards-venn-2 through edwards-venn-5 (flat structure)
# ============================================================
def process_edwards_venn_flat(content, n_sets, filename):
    print(f"  Processing {filename}...")

    vw, vh = extract_viewbox(content)
    letters = list(LETTERS[:n_sets])

    # Remove id="Layer_1" from svg tag if present
    # Extract all paths (shapes)
    all_paths = re.findall(r'<path[^>]*(?:/>|>[^<]*</path>)', content)

    # Extract all texts
    all_texts = re.findall(r'<text[^>]*>[^<]+</text>', content)

    # Extract all circles (bullets)
    all_circles = re.findall(r'<circle[^>]*/>', content)

    # Build shapes
    shapes_out = ['<g id="Shapes">']
    shape_colors = {}
    for i, path in enumerate(all_paths):
        if i < n_sets:
            letter = letters[i]
            path_with_id = re.sub(r'<path ', f'<path id="Shape{letter}" ', path)
            shapes_out.append(f'\t{path_with_id}')
            fill_m = re.search(r'fill:(#[0-9A-Fa-f]{6})', path)
            if fill_m:
                shape_colors[letter] = fill_m.group(1)
    shapes_out.append('</g>')

    # Categorize texts
    header_texts = []
    name_texts = []
    value_texts = []
    for t in all_texts:
        text_content = re.search(r'>([^<]+)</text>', t).group(1)
        if "set diagram" in text_content:
            header_texts.append((text_content, t))
        elif text_content.startswith("Name"):
            name_texts.append((text_content, t))
        elif re.match(r'^[A-G]+$', text_content):
            value_texts.append((text_content, t))

    # Determine type name
    type_name = "Edwards-Venn"

    texts_out = ['<g id="Texts">']
    texts_out.append('\t<g id="Header">')
    if header_texts:
        for tc, t in header_texts:
            t_with_id = re.sub(r'<text ', '<text id="Title" ', t)
            texts_out.append(f'\t\t{t_with_id}')
    else:
        texts_out.append(f'\t\t<text id="Title" transform="matrix(1 0 0 1 77.875 127.2716)" style="{TEXT_STYLE_HEADER}">{type_name} {n_sets}-set diagram</text>')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Names">')
    for tc, t in name_texts:
        letter = tc.replace("Name", "")
        t_with_id = re.sub(r'<text ', f'<text id="Name{letter}" ', t)
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Values">')
    for tc, t in value_texts:
        t_with_id = re.sub(r'<text ', f'<text id="Count_{tc}" ', t)
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')
    texts_out.append('</g>')

    # Bullets
    bullets_out = ['<g id="Group_Bullets">']
    for i, circ in enumerate(all_circles):
        if i < n_sets:
            letter = letters[i]
            circ_with_id = re.sub(r'<circle ', f'<circle id="Bullet{letter}" ', circ)
            if 'style="' not in circ_with_id:
                circ_with_id = re.sub(
                    r'opacity="([^"]*)" fill="([^"]*)" stroke="([^"]*)" stroke-width="([^"]*)"',
                    r'style="opacity:\1;fill:\2;stroke:\3;stroke-width:\4;"',
                    circ_with_id
                )
            bullets_out.append(f'\t{circ_with_id}')
    bullets_out.append('</g>')

    inner = '\n'.join(shapes_out) + '\n' + '\n'.join(texts_out) + '\n' + '\n'.join(bullets_out)
    return build_svg_wrapper(vw, vh, inner)


# ============================================================
# venn-2-set.svg - Flat circles + texts
# ============================================================
def process_venn_2(content):
    print("  Processing venn-2-set.svg...")

    vw, vh = extract_viewbox(content)

    # Extract circles (shapes)
    all_circles = re.findall(r'<circle[^>]*/>', content)
    # Extract texts
    all_texts = re.findall(r'<text[^>]*>[^<]+</text>', content)

    # Shape circles: opacity="0.2"
    shape_circles = [c for c in all_circles if 'opacity' in c]

    # Shape colors
    shape_letters = ["A", "B"]
    shapes_out = ['<g id="Shapes">']
    shape_colors = {}
    for i, circ in enumerate(shape_circles):
        letter = shape_letters[i]
        # Convert attribute-based to style-based and add ID
        circ_styled = convert_circle_to_style(circ, f"Shape{letter}")
        shapes_out.append(f'\t{circ_styled}')
        fill_m = re.search(r'fill[=:]"?(#[0-9A-Fa-f]{6})', circ)
        if fill_m:
            shape_colors[letter] = fill_m.group(1)
    shapes_out.append('</g>')

    # Categorize texts
    name_texts = []
    value_texts = []
    for t in all_texts:
        text_content = re.search(r'>([^<]+)</text>', t).group(1)
        if text_content.startswith("Name"):
            name_texts.append((text_content, t))
        elif re.match(r'^[A-G]+$', text_content):
            value_texts.append((text_content, t))

    texts_out = ['<g id="Texts">']
    texts_out.append('\t<g id="Header">')
    texts_out.append(f'\t\t<text id="Title" transform="matrix(1 0 0 1 252 134.6837)" style="{TEXT_STYLE_DARK}font-size:14;">Venn 2-set diagram</text>')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Names">')
    for tc, t in name_texts:
        letter = tc.replace("Name", "")
        t_with_id = convert_text_to_style(t, f"Name{letter}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Values">')
    for tc, t in value_texts:
        t_with_id = convert_text_to_style(t, f"Count_{tc}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')
    texts_out.append('</g>')

    # Add bullets
    bullets_out = ['<g id="Group_Bullets">']
    bullet_y = 134.7
    for i, letter in enumerate(shape_letters):
        color = shape_colors.get(letter, "#000000")
        by = bullet_y + i * 18.7
        bullets_out.append(make_bullet(letter, color, "59.2", f"{by:.1f}"))
    bullets_out.append('</g>')

    inner = '\n'.join(shapes_out) + '\n' + '\n'.join(texts_out) + '\n' + '\n'.join(bullets_out)
    return build_svg_wrapper(vw, vh, inner)


def convert_circle_to_style(circ, id_val):
    """Convert attribute-based circle to style-based with ID."""
    # Extract attributes
    opacity = re.search(r'opacity="([^"]*)"', circ)
    fill = re.search(r'fill="([^"]*)"', circ)
    stroke = re.search(r'stroke="([^"]*)"', circ)
    stroke_width = re.search(r'stroke-width="([^"]*)"', circ)
    stroke_ml = re.search(r'stroke-miterlimit="([^"]*)"', circ)
    cx = re.search(r'cx="([^"]*)"', circ)
    cy = re.search(r'cy="([^"]*)"', circ)
    r = re.search(r'r="([^"]*)"', circ)

    style_parts = []
    if opacity:
        style_parts.append(f"opacity:{opacity.group(1)}")
    if fill:
        style_parts.append(f"fill:{fill.group(1)}")
    if stroke:
        style_parts.append(f"stroke:{stroke.group(1)}")
    if stroke_width:
        style_parts.append(f"stroke-width:{stroke_width.group(1)}")
    if stroke_ml:
        style_parts.append(f"stroke-miterlimit:{stroke_ml.group(1)}")
    style = ";".join(style_parts) + ";"

    return f'<circle id="{id_val}" style="{style}" cx="{cx.group(1)}" cy="{cy.group(1)}" r="{r.group(1)}"/>'


def convert_text_to_style(text_el, id_val):
    """Convert attribute-based text to style-based with ID."""
    # Check if already style-based
    if 'style="' in text_el:
        return re.sub(r'<text ', f'<text id="{id_val}" ', text_el)

    # Extract attributes
    transform = re.search(r'transform="([^"]*)"', text_el)
    fill = re.search(r'fill="([^"]*)"', text_el)
    stroke = re.search(r'stroke="([^"]*)"', text_el)
    stroke_width = re.search(r'stroke-width="([^"]*)"', text_el)
    stroke_ml = re.search(r'stroke-miterlimit="([^"]*)"', text_el)
    font_family = re.search(r'font-family="([^"]*)"', text_el)
    font_size = re.search(r'font-size="([^"]*)"', text_el)
    text_content = re.search(r'>([^<]+)</text>', text_el).group(1)

    style_parts = []
    if fill:
        style_parts.append(f"fill:{fill.group(1)}")
    if stroke:
        style_parts.append(f"stroke:{stroke.group(1)}")
    if stroke_width:
        style_parts.append(f"stroke-width:{stroke_width.group(1)}")
    if stroke_ml:
        style_parts.append(f"stroke-miterlimit:{stroke_ml.group(1)}")
    if font_family:
        style_parts.append(f"font-family:{font_family.group(1)}")
    if font_size:
        style_parts.append(f"font-size:{font_size.group(1)}")
    style = ";".join(style_parts) + ";"

    trans = f' transform="{transform.group(1)}"' if transform else ""

    return f'<text id="{id_val}"{trans} style="{style}">{text_content}</text>'


def convert_path_to_style(path_el, id_val):
    """Convert attribute-based path to style-based with ID."""
    if 'style="' in path_el:
        return re.sub(r'<path ', f'<path id="{id_val}" ', path_el)

    # Extract attributes
    opacity = re.search(r'opacity="([^"]*)"', path_el)
    fill = re.search(r'fill="([^"]*)"', path_el)
    stroke = re.search(r'stroke="([^"]*)"', path_el)
    stroke_width = re.search(r'stroke-width="([^"]*)"', path_el)
    stroke_ml = re.search(r'stroke-miterlimit="([^"]*)"', path_el)
    d_match = re.search(r'd="([^"]*)"', path_el, re.DOTALL)

    style_parts = []
    if opacity:
        style_parts.append(f"opacity:{opacity.group(1)}")
    if fill:
        style_parts.append(f"fill:{fill.group(1)}")
    if stroke:
        style_parts.append(f"stroke:{stroke.group(1)}")
    if stroke_width:
        style_parts.append(f"stroke-width:{stroke_width.group(1)}")
    if stroke_ml:
        style_parts.append(f"stroke-miterlimit:{stroke_ml.group(1)}")
    style = ";".join(style_parts) + ";"

    d_val = d_match.group(1) if d_match else ""
    return f'<path id="{id_val}" style="{style}" d="{d_val}"/>'


def convert_ellipse_to_style(el, id_val):
    """Convert attribute-based ellipse to style-based with ID."""
    if 'style="' in el:
        return re.sub(r'<ellipse ', f'<ellipse id="{id_val}" ', el)

    transform = re.search(r'transform="([^"]*)"', el)
    opacity = re.search(r'opacity="([^"]*)"', el)
    fill = re.search(r'fill="([^"]*)"', el)
    stroke = re.search(r'stroke="([^"]*)"', el)
    stroke_width = re.search(r'stroke-width="([^"]*)"', el)
    stroke_ml = re.search(r'stroke-miterlimit="([^"]*)"', el)
    cx = re.search(r'cx="([^"]*)"', el)
    cy = re.search(r'cy="([^"]*)"', el)
    rx = re.search(r'rx="([^"]*)"', el)
    ry = re.search(r'ry="([^"]*)"', el)

    style_parts = []
    if opacity:
        style_parts.append(f"opacity:{opacity.group(1)}")
    if fill:
        style_parts.append(f"fill:{fill.group(1)}")
    if stroke:
        style_parts.append(f"stroke:{stroke.group(1)}")
    if stroke_width:
        style_parts.append(f"stroke-width:{stroke_width.group(1)}")
    if stroke_ml:
        style_parts.append(f"stroke-miterlimit:{stroke_ml.group(1)}")
    style = ";".join(style_parts) + ";"

    trans = f' transform="{transform.group(1)}"' if transform else ""

    return f'<ellipse id="{id_val}"{trans} style="{style}" cx="{cx.group(1)}" cy="{cy.group(1)}" rx="{rx.group(1)}" ry="{ry.group(1)}"/>'


# ============================================================
# venn-3-set.svg - Flat circles + texts
# ============================================================
def process_venn_3(content):
    print("  Processing venn-3-set.svg...")

    vw, vh = extract_viewbox(content)

    all_circles = re.findall(r'<circle[^>]*/>', content)
    all_texts = re.findall(r'<text[^>]*>[^<]+</text>', content)

    shape_circles = [c for c in all_circles if 'opacity' in c]
    shape_letters = ["A", "B", "C"]

    shapes_out = ['<g id="Shapes">']
    shape_colors = {}
    for i, circ in enumerate(shape_circles):
        letter = shape_letters[i]
        circ_styled = convert_circle_to_style(circ, f"Shape{letter}")
        shapes_out.append(f'\t{circ_styled}')
        fill_m = re.search(r'fill="(#[0-9A-Fa-f]{6})"', circ)
        if fill_m:
            shape_colors[letter] = fill_m.group(1)
    shapes_out.append('</g>')

    name_texts = []
    value_texts = []
    for t in all_texts:
        tc = re.search(r'>([^<]+)</text>', t).group(1)
        if tc.startswith("Name"):
            name_texts.append((tc, t))
        elif re.match(r'^[A-G]+$', tc):
            value_texts.append((tc, t))

    texts_out = ['<g id="Texts">']
    texts_out.append('\t<g id="Header">')
    texts_out.append(f'\t\t<text id="Title" transform="matrix(1 0 0 1 252 75.1879)" style="{TEXT_STYLE_DARK}font-size:14;">Venn 3-set diagram</text>')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Names">')
    for tc, t in name_texts:
        letter = tc.replace("Name", "")
        t_with_id = convert_text_to_style(t, f"Name{letter}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Values">')
    for tc, t in value_texts:
        t_with_id = convert_text_to_style(t, f"Count_{tc}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')
    texts_out.append('</g>')

    bullets_out = ['<g id="Group_Bullets">']
    bullet_y = 75.2
    for i, letter in enumerate(shape_letters):
        color = shape_colors.get(letter, "#000000")
        by = bullet_y + i * 18.7
        bullets_out.append(make_bullet(letter, color, "59.2", f"{by:.1f}"))
    bullets_out.append('</g>')

    inner = '\n'.join(shapes_out) + '\n' + '\n'.join(texts_out) + '\n' + '\n'.join(bullets_out)
    return build_svg_wrapper(vw, vh, inner)


# ============================================================
# venn-4-set.svg - Has Layer_1_copy (ellipses) + Layer_1 (texts)
# ============================================================
def process_venn_4(content):
    print("  Processing venn-4-set.svg...")

    vw, vh = extract_viewbox(content)

    # Extract ellipses from Layer_1_copy
    layer_copy = re.search(r'<g id="Layer_1_copy">(.*?)</g>', content, re.DOTALL)
    ellipses = re.findall(r'<ellipse[^>]*/>', layer_copy.group(1)) if layer_copy else []

    # Shape order: B(blue), C(red), D(gray), A(yellow) based on fill colors
    # Looking at the file: #2E3192(blue=B), #ED1C24(red=C), #808285(gray=D), #FFF200(yellow=A)
    shape_mapping = [
        ("B", "#2E3192"),
        ("C", "#ED1C24"),
        ("D", "#808285"),
        ("A", "#FFF200"),
    ]

    shapes_out = ['<g id="Shapes">']
    shape_colors = {}
    for i, el in enumerate(ellipses):
        letter = shape_mapping[i][0]
        shape_colors[letter] = shape_mapping[i][1]
        el_styled = convert_ellipse_to_style(el, f"Shape{letter}")
        shapes_out.append(f'\t{el_styled}')
    shapes_out.append('</g>')

    # Extract texts from Layer_1
    layer_1 = re.search(r'<g id="Layer_1">(.*?)</g>', content, re.DOTALL)
    all_texts = re.findall(r'<text[^>]*>[^<]+</text>', layer_1.group(1)) if layer_1 else []

    name_texts = []
    value_texts = []
    for t in all_texts:
        tc = re.search(r'>([^<]+)</text>', t).group(1)
        if tc.startswith("Name"):
            name_texts.append((tc, t))
        elif re.match(r'^[A-G]+$', tc):
            value_texts.append((tc, t))

    texts_out = ['<g id="Texts">']
    texts_out.append('\t<g id="Header">')
    texts_out.append(f'\t\t<text id="Title" transform="matrix(1 0 0 1 252 120.4988)" style="{TEXT_STYLE_DARK}font-size:14;">Venn 4-set diagram</text>')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Names">')
    for tc, t in name_texts:
        letter = tc.replace("Name", "")
        t_with_id = convert_text_to_style(t, f"Name{letter}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Values">')
    for tc, t in value_texts:
        t_with_id = convert_text_to_style(t, f"Count_{tc}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')
    texts_out.append('</g>')

    bullets_out = ['<g id="Group_Bullets">']
    ordered_letters = ["A", "B", "C", "D"]
    bullet_y = 120.5
    for i, letter in enumerate(ordered_letters):
        color = shape_colors.get(letter, "#000000")
        by = bullet_y + i * 18.7
        bullets_out.append(make_bullet(letter, color, "59.2", f"{by:.1f}"))
    bullets_out.append('</g>')

    inner = '\n'.join(shapes_out) + '\n' + '\n'.join(texts_out) + '\n' + '\n'.join(bullets_out)
    return build_svg_wrapper(vw, vh, inner)


# ============================================================
# venn-5a-set.svg - Flat ellipses + texts
# ============================================================
def process_venn_5a(content):
    print("  Processing venn-5a-set.svg...")

    vw, vh = extract_viewbox(content)

    # Extract ellipses
    all_ellipses = re.findall(r'<ellipse[^>]*/>', content)
    # Extract texts
    all_texts = re.findall(r'<text[^>]*>[^<]+</text>', content)

    # Ellipse order: A(yellow #FFF200), E(brown #3C2415), D(gray #58595B), C(red #ED1C24), B(blue #2E3192)
    shape_mapping = [
        ("A", "#FFF200"),
        ("E", "#3C2415"),
        ("D", "#58595B"),
        ("C", "#ED1C24"),
        ("B", "#2E3192"),
    ]

    shapes_out = ['<g id="Shapes">']
    shape_colors = {}
    for i, el in enumerate(all_ellipses):
        letter = shape_mapping[i][0]
        shape_colors[letter] = shape_mapping[i][1]
        el_styled = convert_ellipse_to_style(el, f"Shape{letter}")
        shapes_out.append(f'\t{el_styled}')
    shapes_out.append('</g>')

    name_texts = []
    value_texts = []
    for t in all_texts:
        tc = re.search(r'>([^<]+)</text>', t).group(1)
        if tc.startswith("Name"):
            name_texts.append((tc, t))
        elif re.match(r'^[A-G]+$', tc):
            value_texts.append((tc, t))

    texts_out = ['<g id="Texts">']
    texts_out.append('\t<g id="Header">')
    texts_out.append(f'\t\t<text id="Title" transform="matrix(1 0 0 1 252 37.6956)" style="{TEXT_STYLE_DARK}font-size:14;">Venn 5a-set diagram</text>')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Names">')
    for tc, t in name_texts:
        letter = tc.replace("Name", "")
        t_with_id = convert_text_to_style(t, f"Name{letter}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Values">')
    for tc, t in value_texts:
        t_with_id = convert_text_to_style(t, f"Count_{tc}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')
    texts_out.append('</g>')

    bullets_out = ['<g id="Group_Bullets">']
    ordered_letters = ["A", "B", "C", "D", "E"]
    bullet_y = 37.7
    for i, letter in enumerate(ordered_letters):
        color = shape_colors.get(letter, "#000000")
        by = bullet_y + i * 18.7
        bullets_out.append(make_bullet(letter, color, "59.2", f"{by:.1f}"))
    bullets_out.append('</g>')

    inner = '\n'.join(shapes_out) + '\n' + '\n'.join(texts_out) + '\n' + '\n'.join(bullets_out)
    return build_svg_wrapper(vw, vh, inner)


# ============================================================
# venn-5b-set.svg - Has Shape_A..Shape_E groups + Text group
# ============================================================
def process_venn_5b(content):
    print("  Processing venn-5b-set.svg...")

    vw, vh = extract_viewbox(content)

    # Extract shapes from Shape_X groups
    shape_letters_order = ["E", "D", "C", "B", "A"]  # order in file
    shapes_out = ['<g id="Shapes">']
    shape_colors = {}

    for letter in shape_letters_order:
        shape_group = re.search(rf'<g id="Shape_{letter}">\s*(.*?)\s*</g>', content, re.DOTALL)
        if shape_group:
            path_match = re.search(r'<path[^>]*(?:/>|>[^<]*</path>)', shape_group.group(1))
            if path_match:
                path = path_match.group(0)
                path_with_id = convert_path_to_style(path, f"Shape{letter}")
                shapes_out.append(f'\t{path_with_id}')
                fill_m = re.search(r'fill[=:]"?(#[0-9A-Fa-f]{6})', path)
                if fill_m:
                    shape_colors[letter] = fill_m.group(1)
    shapes_out.append('</g>')

    # Extract texts from Text group
    text_group = re.search(r'<g id="Text">(.*?)</g>', content, re.DOTALL)
    all_texts = re.findall(r'<text[^>]*>[^<]+</text>', text_group.group(1)) if text_group else []

    name_texts = []
    value_texts = []
    for t in all_texts:
        tc = re.search(r'>([^<]+)</text>', t).group(1)
        if tc.startswith("Name"):
            name_texts.append((tc, t))
        elif re.match(r'^[A-G]+$', tc):
            value_texts.append((tc, t))

    texts_out = ['<g id="Texts">']
    texts_out.append('\t<g id="Header">')
    texts_out.append(f'\t\t<text id="Title" transform="matrix(1 0 0 1 252 35.2443)" style="{TEXT_STYLE_DARK}font-size:14;">Venn 5b-set diagram</text>')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Names">')
    for tc, t in name_texts:
        letter = tc.replace("Name", "")
        t_with_id = convert_text_to_style(t, f"Name{letter}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Values">')
    for tc, t in value_texts:
        t_with_id = convert_text_to_style(t, f"Count_{tc}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')
    texts_out.append('</g>')

    bullets_out = ['<g id="Group_Bullets">']
    ordered_letters = ["A", "B", "C", "D", "E"]
    bullet_y = 35.2
    for i, letter in enumerate(ordered_letters):
        color = shape_colors.get(letter, "#000000")
        by = bullet_y + i * 18.7
        bullets_out.append(make_bullet(letter, color, "59.2", f"{by:.1f}"))
    bullets_out.append('</g>')

    inner = '\n'.join(shapes_out) + '\n' + '\n'.join(texts_out) + '\n' + '\n'.join(bullets_out)
    return build_svg_wrapper(vw, vh, inner)


# ============================================================
# venn-6-set.svg - Groups with style="opacity:0.2;" + flat texts
# ============================================================
def process_venn_6(content):
    print("  Processing venn-6-set.svg...")

    vw, vh = extract_viewbox(content)

    # Extract shape groups: <g style="opacity:0.2;"> containing paths
    shape_groups = re.findall(r'<g style="opacity:0\.2;">\s*(<path[^>]*(?:/>|>[^<]*</path>))\s*</g>', content, re.DOTALL)

    # Also find the filler path (M244,440.1) which is not a shape - skip it
    # Shape order based on fill colors:
    # B(blue #2E3192), C(red #ED1C24), D(gray #58595B), E(brown #3C2415), F(purple #9E1F63), A(yellow #FFF200)
    shape_mapping = [
        ("B", "#2E3192"),
        ("C", "#ED1C24"),
        ("D", "#58595B"),
        ("E", "#3C2415"),
        ("F", "#9E1F63"),
        ("A", "#FFF200"),
    ]

    shapes_out = ['<g id="Shapes">']
    shape_colors = {}
    for i, path in enumerate(shape_groups):
        letter = shape_mapping[i][0]
        shape_colors[letter] = shape_mapping[i][1]
        # Path already has style with fill etc, but opacity is on the group
        # Add opacity to the path style and add ID
        if 'opacity' not in path:
            path = re.sub(r'style="', 'style="opacity:0.2;', path)
        path_with_id = re.sub(r'<path ', f'<path id="Shape{letter}" ', path)
        shapes_out.append(f'\t{path_with_id}')
    shapes_out.append('</g>')

    # Extract all text elements (flat, outside groups)
    all_texts = re.findall(r'<text[^>]*>[^<]+</text>', content)

    name_texts = []
    value_texts = []
    for t in all_texts:
        tc = re.search(r'>([^<]+)</text>', t).group(1)
        if tc.startswith("Name"):
            name_texts.append((tc, t))
        elif re.match(r'^[A-G]+$', tc):
            value_texts.append((tc, t))

    texts_out = ['<g id="Texts">']
    texts_out.append('\t<g id="Header">')
    texts_out.append(f'\t\t<text id="Title" transform="matrix(1 0 0 1 252 34.0233)" style="{TEXT_STYLE_DARK}font-size:14;">Venn 6-set diagram</text>')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Names">')
    for tc, t in name_texts:
        letter = tc.replace("Name", "")
        # These texts use style="" already
        t_with_id = re.sub(r'<text ', f'<text id="Name{letter}" ', t)
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Values">')
    for tc, t in value_texts:
        t_with_id = re.sub(r'<text ', f'<text id="Count_{tc}" ', t)
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')
    texts_out.append('</g>')

    bullets_out = ['<g id="Group_Bullets">']
    ordered_letters = ["A", "B", "C", "D", "E", "F"]
    bullet_y = 34.0
    for i, letter in enumerate(ordered_letters):
        color = shape_colors.get(letter, "#000000")
        by = bullet_y + i * 18.7
        bullets_out.append(make_bullet(letter, color, "59.2", f"{by:.1f}"))
    bullets_out.append('</g>')

    inner = '\n'.join(shapes_out) + '\n' + '\n'.join(texts_out) + '\n' + '\n'.join(bullets_out)
    return build_svg_wrapper(vw, vh, inner)


# ============================================================
# venn-7-set.svg - Has Area_A..Area_G + Text group
# ============================================================
def process_venn_7(content):
    print("  Processing venn-7-set.svg...")

    vw, vh = extract_viewbox(content)

    # Extract shapes from Area_X groups
    shapes_out = ['<g id="Shapes">']
    shape_colors = {}

    for letter in LETTERS:
        area_group = re.search(rf'<g id="Area_{letter}">\s*(.*?)\s*</g>', content, re.DOTALL)
        if area_group:
            path_match = re.search(r'<path[^>]*(?:/>|>[^<]*</path>)', area_group.group(1))
            if path_match:
                path = path_match.group(0)
                path_with_id = convert_path_to_style(path, f"Shape{letter}")
                shapes_out.append(f'\t{path_with_id}')
                fill_m = re.search(r'fill="(#[0-9A-Fa-f]{6})"', path)
                if fill_m:
                    shape_colors[letter] = fill_m.group(1)
    shapes_out.append('</g>')

    # Extract texts from Text group
    text_group = re.search(r'<g id="Text">(.*?)</g>', content, re.DOTALL)
    all_texts = re.findall(r'<text[^>]*>[^<]+</text>', text_group.group(1)) if text_group else []

    name_texts = []
    value_texts = []
    for t in all_texts:
        tc = re.search(r'>([^<]+)</text>', t).group(1)
        if tc.startswith("Name"):
            name_texts.append((tc, t))
        elif re.match(r'^[A-G]+$', tc):
            value_texts.append((tc, t))

    texts_out = ['<g id="Texts">']
    texts_out.append('\t<g id="Header">')
    texts_out.append(f'\t\t<text id="Title" transform="matrix(1 0 0 1 350 54.5105)" style="{TEXT_STYLE_DARK}font-size:14;">Venn 7-set diagram</text>')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Names">')
    for tc, t in name_texts:
        letter = tc.replace("Name", "")
        t_with_id = convert_text_to_style(t, f"Name{letter}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')

    texts_out.append('\t<g id="Group_Values">')
    for tc, t in value_texts:
        t_with_id = convert_text_to_style(t, f"Count_{tc}")
        texts_out.append(f'\t\t{t_with_id}')
    texts_out.append('\t</g>')
    texts_out.append('</g>')

    bullets_out = ['<g id="Group_Bullets">']
    bullet_y = 54.5
    for i, letter in enumerate(LETTERS):
        color = shape_colors.get(letter, "#000000")
        by = bullet_y + i * 18.7
        bullets_out.append(make_bullet(letter, color, "59.2", f"{by:.1f}"))
    bullets_out.append('</g>')

    inner = '\n'.join(shapes_out) + '\n' + '\n'.join(texts_out) + '\n' + '\n'.join(bullets_out)
    return build_svg_wrapper(vw, vh, inner)


# ============================================================
# venn-7-set-work.svg - MOST COMPLEX: defs/CSS classes, duplicate texts
# ============================================================
def process_venn_7_work(content):
    print("  Processing venn-7-set-work.svg...")

    vw, vh = extract_viewbox(content)

    # CSS class to inline style mapping for shapes
    shape_class_styles = {
        "cls-14": "opacity:0.2;fill:#7F1416;stroke:#000000;stroke-miterlimit:10;stroke-width:3;",
        "cls-15": "opacity:0.2;fill:#FEDA00;stroke:#000000;stroke-miterlimit:10;stroke-width:3;",
        "cls-6":  "opacity:0.2;fill:#78C143;stroke:#000000;stroke-miterlimit:10;stroke-width:3;",
        "cls-4":  "opacity:0.2;fill:#E7E6AA;stroke:#000000;stroke-miterlimit:10;stroke-width:3;",
        "cls-10": "opacity:0.2;fill:#283277;stroke:#000000;stroke-miterlimit:10;stroke-width:3;",
        "cls-7":  "opacity:0.2;fill:#4F53A3;stroke:#000000;stroke-miterlimit:10;stroke-width:3;",
        "cls-3":  "opacity:0.2;fill:#CA4B9B;stroke:#000000;stroke-miterlimit:10;stroke-width:3;",
    }

    shape_colors = {
        "A": "#7F1416",
        "B": "#FEDA00",
        "C": "#78C143",
        "D": "#E7E6AA",
        "E": "#283277",
        "F": "#4F53A3",
        "G": "#CA4B9B",
    }

    # CSS class to inline style mapping for texts
    text_class_styles = {
        "cls-2":  "fill:#262262;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';font-size:36;",
        "cls-5":  "fill:#FFFFFF;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';font-size:36;",
        "cls-17": "fill:#262262;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';font-size:12;",
        "cls-13": "fill:#262262;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';font-size:10;",
        "cls-18": "fill:#262262;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';font-size:24;",
        "cls-1":  "fill:#262262;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';font-size:21;",
        "cls-19": "fill:#000000;font-family:'MyriadPro-Regular','Myriad Pro';font-size:18;",
    }

    # Extract shapes from Area_X groups
    shapes_out = ['<g id="Shapes">']

    area_letters = list(LETTERS)
    area_class_map = {
        "A": "cls-14",
        "B": "cls-15",
        "C": "cls-6",
        "D": "cls-4",
        "E": "cls-10",
        "F": "cls-7",
        "G": "cls-3",
    }

    for letter in area_letters:
        area_group = re.search(
            rf'<g id="Area_{letter}"[^>]*>\s*(<path[^>]*/>)\s*</g>',
            content, re.DOTALL
        )
        if area_group:
            path_el = area_group.group(1)
            # Extract d attribute
            d_match = re.search(r'd="([^"]*)"', path_el, re.DOTALL)
            d_val = d_match.group(1) if d_match else ""
            # Get inline style
            cls = area_class_map[letter]
            style = shape_class_styles[cls]
            shapes_out.append(f'\t<path id="Shape{letter}" style="{style}" d="{d_val}"/>')
    shapes_out.append('</g>')

    # Process text elements
    # Pattern: duplicate texts where first has visible class, second has id
    # Extract all text elements from <g id="Text">
    text_section = re.search(r'<g id="Text">(.*?)</g>\s*</svg>', content, re.DOTALL)
    if not text_section:
        text_section = re.search(r'<g id="Text">(.*)', content, re.DOTALL)

    text_content = text_section.group(1) if text_section else ""

    # Find all text pairs and single texts
    # Pattern for paired texts (visible + id):
    # <text class="cls-XX" transform="translate(X Y)"><tspan x="0" y="0">TEXT</tspan></text>
    # <text id="ID" data-name="..." class="cls-YY" transform="translate(X Y)"><tspan x="0" y="0">TEXT</tspan></text>
    #
    # Pattern for CountSUM texts (single, no ID):
    # <text class="cls-19" transform="translate(X Y)"><tspan x="0" y="0">CountSUM_X</tspan></text>

    # Parse all text elements in order
    text_pattern = re.compile(
        r'<text\s+(?:id="([^"]*)"(?:\s+data-name="[^"]*")?\s+)?class="([^"]*)"\s+transform="translate\(([^)]+)\)">'
        r'<tspan[^>]*>([^<]*)</tspan></text>'
    )

    all_text_matches = list(text_pattern.finditer(text_content))

    # Group paired texts: texts without id followed by text with id at same position
    merged_texts = []
    i = 0
    while i < len(all_text_matches):
        m = all_text_matches[i]
        text_id = m.group(1)
        cls = m.group(2)
        coords = m.group(3)
        display = m.group(4)

        if text_id is None and i + 1 < len(all_text_matches):
            # Check if next is the ID version
            m2 = all_text_matches[i + 1]
            if m2.group(1) is not None and m2.group(4) == display:
                # Paired: use first's class for style, second's id
                merged_texts.append({
                    "id": m2.group(1),
                    "visible_class": cls,
                    "coords": coords,
                    "display": display,
                })
                i += 2
                continue

        # Single text (CountSUM or unpaired)
        merged_texts.append({
            "id": text_id,
            "visible_class": cls,
            "coords": coords,
            "display": display,
        })
        i += 1

    # Categorize merged texts
    name_texts = []
    count_sum_texts = []
    value_texts = []

    for t in merged_texts:
        display = t["display"]
        if display.startswith("Name"):
            name_texts.append(t)
        elif display.startswith("CountSUM_"):
            count_sum_texts.append(t)
        elif display.startswith("Count_"):
            # Strip "Count_" prefix for display
            value_texts.append(t)

    # Build text output
    texts_out = ['<g id="Texts">']

    # Header
    texts_out.append('\t<g id="Header">')
    texts_out.append(f'\t\t<text id="Title" transform="matrix(1 0 0 1 350 54.5105)" style="{TEXT_STYLE_DARK}font-size:14;">Venn 7-set diagram</text>')
    texts_out.append('\t</g>')

    # Group Names
    texts_out.append('\t<g id="Group_Names">')
    for t in name_texts:
        letter = t["display"].replace("Name", "")
        style = text_class_styles.get(t["visible_class"], TEXT_STYLE_DARK + "font-size:24;")
        coords_parts = t["coords"].strip().split()
        x, y = coords_parts[0], coords_parts[1]
        texts_out.append(f'\t\t<text id="Name{letter}" transform="matrix(1 0 0 1 {x} {y})" style="{style}">{t["display"]}</text>')
    texts_out.append('\t</g>')

    # Group Values (Count_ and CountSUM_)
    texts_out.append('\t<g id="Group_Values">')
    for t in value_texts:
        # Strip "Count_" prefix for display
        raw_label = t["display"]
        label_letters = raw_label.replace("Count_", "")
        text_id = t["id"] if t["id"] else f"Count_{label_letters}"
        style = text_class_styles.get(t["visible_class"], TEXT_STYLE_DARK + "font-size:10;")
        coords_parts = t["coords"].strip().split()
        x, y = coords_parts[0], coords_parts[1]
        texts_out.append(f'\t\t<text id="{text_id}" transform="matrix(1 0 0 1 {x} {y})" style="{style}">{label_letters}</text>')

    for t in count_sum_texts:
        raw_label = t["display"]
        label = raw_label  # Keep CountSUM_X as-is for the id
        letter = raw_label.replace("CountSUM_", "")
        text_id = f"CountSUM_{letter}"
        style = text_class_styles.get(t["visible_class"], "fill:#000000;font-family:'MyriadPro-Regular','Myriad Pro';font-size:18;")
        coords_parts = t["coords"].strip().split()
        x, y = coords_parts[0], coords_parts[1]
        texts_out.append(f'\t\t<text id="{text_id}" transform="matrix(1 0 0 1 {x} {y})" style="{style}">{raw_label}</text>')

    texts_out.append('\t</g>')
    texts_out.append('</g>')

    # Bullets
    bullets_out = ['<g id="Group_Bullets">']
    bullet_y = 54.5
    for i, letter in enumerate(LETTERS):
        color = shape_colors[letter]
        by = bullet_y + i * 18.7
        bullets_out.append(make_bullet(letter, color, "59.2", f"{by:.1f}"))
    bullets_out.append('</g>')

    inner = '\n'.join(shapes_out) + '\n' + '\n'.join(texts_out) + '\n' + '\n'.join(bullets_out)
    return build_svg_wrapper(vw, vh, inner)


# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 60)
    print("SVG Unification Script - Version 3.0.0")
    print("=" * 60)

    files_to_process = [
        # Edwards-Venn family
        ("edwards-venn-2-set.svg", lambda c: process_edwards_venn_flat(c, 2, "edwards-venn-2-set.svg")),
        ("edwards-venn-3-set.svg", lambda c: process_edwards_venn_flat(c, 3, "edwards-venn-3-set.svg")),
        ("edwards-venn-4-set.svg", lambda c: process_edwards_venn_flat(c, 4, "edwards-venn-4-set.svg")),
        ("edwards-venn-5-set.svg", lambda c: process_edwards_venn_flat(c, 5, "edwards-venn-5-set.svg")),
        ("edwards-venn-6-set.svg", lambda c: process_edwards_venn_6(c)),
        ("edwards-venn-7-set.svg", lambda c: process_edwards_venn_7(c)),
        # Classic Venn family
        ("venn-2-set.svg", lambda c: process_venn_2(c)),
        ("venn-3-set.svg", lambda c: process_venn_3(c)),
        ("venn-4-set.svg", lambda c: process_venn_4(c)),
        ("venn-5a-set.svg", lambda c: process_venn_5a(c)),
        ("venn-5b-set.svg", lambda c: process_venn_5b(c)),
        ("venn-6-set.svg", lambda c: process_venn_6(c)),
        ("venn-7-set.svg", lambda c: process_venn_7(c)),
        ("venn-7-set-work.svg", lambda c: process_venn_7_work(c)),
    ]

    for filename, processor in files_to_process:
        filepath = os.path.join(MODELS_DIR, filename)
        if not os.path.exists(filepath):
            print(f"\n  SKIP: {filename} not found")
            continue

        print(f"\n  Reading {filename}...")
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        result = processor(content)

        # Clean up trailing whitespace and ensure single newline at end
        result = result.rstrip() + "\n"

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(result)

        print(f"  Written {filename} ({len(result)} bytes)")

    print("\n" + "=" * 60)
    print("All files processed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
