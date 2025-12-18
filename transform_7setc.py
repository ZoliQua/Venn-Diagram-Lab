#!/usr/bin/env python3
"""
Transform venn-7-setc.svg:
1. Normalize Illustrator artifacts (merge duplicates, clean styles)
2. Remap letters: A→A, B→G, C→F, D→E, E→D, F→C, G→B
3. Apply standard color scheme for A-F, keep G color
4. Bump 2-letter Count font-size from 12→14
5. Update comment header to SVG Version 3.0.0
6. Add text-anchor:middle to Group_Values
"""

import re
import os

FILEPATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', 'venn-7-setc.svg')

# Letter permutation: old → new
LETTER_MAP = {'A': 'A', 'B': 'G', 'C': 'F', 'D': 'E', 'E': 'D', 'F': 'C', 'G': 'B'}

# Standard colors per NEW letter
COLORS = {
    'A': '#FFF200',
    'B': '#2E3192',
    'C': '#ED1C24',
    'D': '#58595B',
    'E': '#3C2415',
    'F': '#9E1F63',
    'G': '#CA4B9B',  # keep current
}

# Stroke colors for shapes (matching the standard)
STROKE_COLORS = {
    'A': '#000',
    'B': '#000',
    'C': '#000',
    'D': '#000',
    'E': '#000',
    'F': '#000',
    'G': '#000',
}


def remap_combo(combo):
    """Remap a letter combination using the permutation, return sorted."""
    new_letters = sorted(LETTER_MAP[ch] for ch in combo)
    return ''.join(new_letters)


def clean_style(style):
    """Clean Illustrator style artifacts."""
    style = re.sub(r'\s*isolation:\s*isolate;?\s*', '', style)
    style = re.sub(r'\s*:\s*', ':', style)
    style = re.sub(r'\s*;\s*', ';', style)
    style = style.strip(' ;')
    style = re.sub(r';+', ';', style)
    return style


def merge_duplicate_texts(content):
    """Merge Illustrator duplicate text pairs."""
    pair_pattern = re.compile(
        r'(\s*)<text\s+transform="([^"]+)"\s+style="([^"]*)"[^>]*>'
        r'\s*<tspan[^>]*>([^<]+)</tspan>\s*</text>\s*\n'
        r'\s*<text\s+id="([^"]+)"\s+transform="[^"]+"\s+style="[^"]*fill:\s*none[^"]*"[^>]*>'
        r'\s*<tspan[^>]*>[^<]+</tspan>\s*</text>',
        re.MULTILINE
    )

    def merge_pair(m):
        indent = m.group(1)
        transform = m.group(2)
        visible_style = m.group(3)
        text_content = m.group(4)
        element_id = m.group(5)

        style = clean_style(visible_style)

        # Convert translate to matrix
        t = re.match(r'translate\(([\d.]+)\s+([\d.]+)\)', transform)
        if t:
            transform = f'matrix(1 0 0 1 {t.group(1)} {t.group(2)})'

        return f'{indent}<text id="{element_id}" transform="{transform}" style="{style}">{text_content}</text>'

    return pair_pattern.sub(merge_pair, content)


def remap_shape_id(m):
    """Remap Shape ID and apply new color."""
    full = m.group(0)
    old_letter = m.group(1)
    new_letter = LETTER_MAP[old_letter]
    new_color = COLORS[new_letter]

    # Replace ID
    full = full.replace(f'id="Shape{old_letter}"', f'id="Shape{new_letter}"')

    # Replace fill color
    full = re.sub(r'fill:\s*#[0-9a-fA-F]+', f'fill:{new_color}', full)

    return full


def remap_text_content(content):
    """Remap all text IDs and content using the letter permutation."""

    # Remap Count IDs and text content
    def remap_count(m):
        prefix = m.group(1)  # everything before the combo in ID
        old_combo = m.group(2)  # the letter combo
        rest_before_text = m.group(3)  # between ID close and text content
        old_text = m.group(4)  # display text (should match combo)

        new_combo = remap_combo(old_combo)
        new_text = remap_combo(old_text) if re.match(r'^[A-G]+$', old_text) else old_text

        return f'{prefix}{new_combo}{rest_before_text}{new_text}'

    # Match: id="Count_COMBO" ... >TEXT</text>
    content = re.sub(
        r'(id="Count_)([A-G]+)("[^>]*>)([A-G]+)(</text>)',
        lambda m: f'{m.group(1)}{remap_combo(m.group(2))}{m.group(3)}{remap_combo(m.group(4))}{m.group(5)}',
        content
    )

    # Remap Name IDs and text
    for old, new in LETTER_MAP.items():
        if old == new:
            continue
        # Use placeholder to avoid double-mapping
        content = content.replace(f'id="Name{old}"', f'id="Name__TEMP_{new}__"')
    for new in LETTER_MAP.values():
        content = content.replace(f'id="Name__TEMP_{new}__"', f'id="Name{new}"')

    # Remap Name text content
    for old, new in LETTER_MAP.items():
        if old == new:
            continue
        content = content.replace(f'>Name{old}</text>', f'>Name__TEMP_{new}__</text>')
    for new in LETTER_MAP.values():
        content = content.replace(f'>Name__TEMP_{new}__</text>', f'>Name{new}</text>')

    # Remap Shape IDs and colors
    # First collect all shapes, then reassign
    shape_pattern = re.compile(r'<path\s+id="Shape([A-G])"[^/]*/>')
    shapes = {}
    for m in shape_pattern.finditer(content):
        old_letter = m.group(1)
        shapes[old_letter] = m.group(0)

    for old_letter, shape_xml in shapes.items():
        new_letter = LETTER_MAP[old_letter]
        new_color = COLORS[new_letter]

        new_shape = shape_xml.replace(f'id="Shape{old_letter}"', f'id="Shape{new_letter}"')
        new_shape = re.sub(r'fill:\s*#[0-9a-fA-F]+', f'fill:{new_color}', new_shape)
        # Use temp placeholder
        content = content.replace(shape_xml, f'__SHAPE_TEMP_{new_letter}__')

    for letter in 'ABCDEFG':
        placeholder = f'__SHAPE_TEMP_{letter}__'
        if placeholder in content:
            # Find the shape that maps to this letter
            for old, new in LETTER_MAP.items():
                if new == letter and old in shapes:
                    new_shape = shapes[old].replace(f'id="Shape{old}"', f'id="Shape{letter}"')
                    new_shape = re.sub(r'fill:\s*#[0-9a-fA-F]+', f'fill:{COLORS[letter]}', new_shape)
                    content = content.replace(placeholder, new_shape)
                    break

    # Remap Bullet IDs and colors
    for old, new in LETTER_MAP.items():
        if old == new:
            continue
        content = content.replace(f'id="Bullet{old}"', f'id="Bullet__TEMP_{new}__"')
    for new in LETTER_MAP.values():
        content = content.replace(f'id="Bullet__TEMP_{new}__"', f'id="Bullet{new}"')

    # Update bullet colors
    bullet_pattern = re.compile(r'(<circle\s+id="Bullet([A-G])"[^/]*)(fill:\s*#[0-9a-fA-F]+)([^/]*/>)')
    def fix_bullet_color(m):
        before = m.group(1)
        letter = m.group(2)
        after = m.group(4)
        return f'{before}fill:{COLORS[letter]}{after}'

    content = bullet_pattern.sub(fix_bullet_color, content)

    # Remap CountSUM if present
    for old, new in LETTER_MAP.items():
        if old == new:
            continue
        content = content.replace(f'id="CountSUM_{old}"', f'id="CountSUM___TEMP_{new}__"')
        content = content.replace(f'>CountSUM_{old}</text>', f'>CountSUM___TEMP_{new}__</text>')
    for new in LETTER_MAP.values():
        content = content.replace(f'id="CountSUM___TEMP_{new}__"', f'id="CountSUM_{new}"')
        content = content.replace(f'>CountSUM___TEMP_{new}__</text>', f'>CountSUM_{new}</text>')

    return content


def bump_2letter_font_size(content):
    """Change font-size from 12 to 14 for 2-letter Count texts."""
    # Match Count texts with exactly 2-letter combos
    def bump_if_2letter(m):
        full = m.group(0)
        combo = m.group(1)
        if len(combo) == 2:
            full = re.sub(r'font-size:\s*12', 'font-size:14', full)
        return full

    return re.compile(
        r'<text\s+id="Count_([A-G]{2,7})"[^>]*>[^<]*</text>'
    ).sub(bump_if_2letter, content)


def add_text_anchor_middle(content):
    """Add text-anchor:middle to Group_Values texts."""
    gv_start = content.find('<g id="Group_Values">')
    if gv_start == -1:
        return content
    gv_end = content.find('</g>', gv_start)
    gv_section = content[gv_start:gv_end + 4]

    def add_anchor(m):
        full = m.group(0)
        if 'text-anchor' in full:
            return full
        style = m.group(1)
        new_style = style.rstrip(';') + ';text-anchor:middle;'
        return full.replace(f'style="{style}"', f'style="{new_style}"')

    pattern = re.compile(r'<text\s[^>]*style="([^"]*)"[^>]*>[^<]+</text>')
    new_gv = pattern.sub(add_anchor, gv_section)
    return content[:gv_start] + new_gv + content[gv_end + 4:]


def main():
    with open(FILEPATH, 'r', encoding='utf-8') as f:
        content = f.read()

    print("1. Merging duplicate texts...")
    content = merge_duplicate_texts(content)

    print("2. Removing remaining tspan wrappers...")
    content = re.sub(r'<tspan[^>]*>([^<]+)</tspan>', r'\1', content)

    print("3. Converting translate → matrix...")
    content = re.sub(
        r'translate\(([\d.]+)\s+([\d.]+)\)',
        lambda m: f'matrix(1 0 0 1 {m.group(1)} {m.group(2)})',
        content
    )

    print("4. Cleaning styles (isolation, etc.)...")
    content = re.sub(r'style="([^"]*)"', lambda m: f'style="{clean_style(m.group(1))}"', content)

    print("5. Remapping letters (A→A, B→G, C→F, D→E, E→D, F→C, G→B)...")
    content = remap_text_content(content)

    print("6. Bumping 2-letter Count font-size 12→14...")
    content = bump_2letter_font_size(content)

    print("7. Adding text-anchor:middle to Group_Values...")
    content = add_text_anchor_middle(content)

    print("8. Updating header comment...")
    content = re.sub(
        r'<!--\s*Generator:.*?-->',
        '',
        content
    )
    content = content.replace(
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<?xml version="1.0" encoding="utf-8"?>'
    )
    # Add our comment after xml declaration
    content = content.replace(
        '<?xml version="1.0" encoding="utf-8"?>\n',
        '<?xml version="1.0" encoding="utf-8"?>\n<!-- Created by Zoltan Dul in 2026 - free to use with MIT license. Part of React Venn Diagram Analyzer - https://github.com/ZoliQua/React-Venn-Diagram-Analyser - SVG Version: 3.0.0 -->\n'
    )
    # Remove old comment if still present
    content = re.sub(r'\n\s*<!-- Generator:.*?-->\s*\n', '\n', content)

    # Clean up extra blank lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)

    with open(FILEPATH, 'w', encoding='utf-8') as f:
        f.write(content)

    # Verify
    print("\n=== Verification ===")
    for letter in 'ABCDEFG':
        count = content.count(f'id="Shape{letter}"')
        print(f"  Shape{letter}: {count} occurrence(s), color={COLORS[letter]}")

    count_ids = re.findall(r'id="Count_([A-G]+)"', content)
    print(f"  Total Count texts: {len(count_ids)}")
    print(f"  2-letter Counts with font-size:14: {len(re.findall(r'id="Count_[A-G]{2}"[^>]*font-size:14', content))}")

    print("\nDone!")


if __name__ == '__main__':
    main()
