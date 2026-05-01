#!/usr/bin/env python3
"""
Add text-anchor:middle to all Group_Values texts in SVG files.
For venn-7-set-work.svg: positions are already centered, just add text-anchor.
For all others: shift x by half the estimated text width, then add text-anchor.

Created by Zoltan Dul in 2026 - free to use with MIT license. 
Part of Venn Diagram Lab Module - https://github.com/ZoliQua/Venn-Diagram-Lab
"""

import re
import os
import glob

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')

# Approximate character width as fraction of font-size for Tahoma uppercase
CHAR_WIDTH_RATIO = 0.58


def estimate_text_width(text_content, font_size):
    """Estimate rendered text width in SVG units."""
    return len(text_content) * CHAR_WIDTH_RATIO * font_size


def get_font_size(style_str):
    """Extract font-size value from style string."""
    m = re.search(r'font-size:\s*(\d+)', style_str)
    return int(m.group(1)) if m else 12


def process_file(filepath):
    """Process a single SVG file to add text-anchor:middle to Group_Values texts."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    filename = os.path.basename(filepath)
    is_work = filename == 'venn-7-set-work.svg'

    # Find the Group_Values section
    gv_start = content.find('<g id="Group_Values">')
    if gv_start == -1:
        print(f"  SKIP {filename}: no Group_Values found")
        return 0

    gv_end = content.find('</g>', gv_start)
    # Make sure we find the RIGHT closing </g> - could be nested
    # Group_Values has no nested groups, so first </g> after start is correct
    gv_section = content[gv_start:gv_end + 4]

    count = 0

    def replace_text(m):
        nonlocal count
        full_match = m.group(0)

        # Skip if already has text-anchor
        if 'text-anchor' in full_match:
            return full_match

        style = m.group('style')
        text_content = m.group('text')
        font_size = get_font_size(style)

        # Add text-anchor:middle to style
        new_style = style.rstrip(';') + ';text-anchor:middle;'

        if is_work:
            # venn-7-set-work: positions already centered, don't shift
            result = full_match.replace(style, new_style)
        else:
            # All other files: shift x by half text width
            transform_match = re.search(
                r'matrix\(([^,)\s]+[\s,]+[^,)\s]+[\s,]+[^,)\s]+[\s,]+[^,)\s]+[\s,]+)([\d.]+)([\s,]+[\d.]+)\)',
                full_match
            )
            if transform_match:
                prefix = transform_match.group(1)
                old_x = float(transform_match.group(2))
                y_part = transform_match.group(3)

                shift = estimate_text_width(text_content, font_size) / 2
                new_x = round(old_x + shift, 1)

                old_transform = transform_match.group(0)
                new_transform = f'matrix({prefix}{new_x}{y_part})'

                result = full_match.replace(old_transform, new_transform)
                result = result.replace(style, new_style)
            else:
                # Fallback: just add text-anchor without shifting
                result = full_match.replace(style, new_style)

        count += 1
        return result

    # Match text elements: <text ... style="STYLE">TEXT</text>
    pattern = re.compile(
        r'<text\s[^>]*style="(?P<style>[^"]*)"[^>]*>(?P<text>[^<]+)</text>'
    )

    new_gv_section = pattern.sub(replace_text, gv_section)
    new_content = content[:gv_start] + new_gv_section + content[gv_end + 4:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  {filename}: {count} texts centered")
    return count


def main():
    svg_files = sorted(glob.glob(os.path.join(MODELS_DIR, '*.svg')))
    total = 0

    print("Adding text-anchor:middle to Group_Values texts:\n")
    for filepath in svg_files:
        total += process_file(filepath)

    print(f"\nTotal: {total} text elements updated")


if __name__ == '__main__':
    main()
