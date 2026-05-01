#!/usr/bin/env python3
"""
Normalize SVG files after Adobe Illustrator export.
Reverses Illustrator's changes to restore the unified structure:
  1. Merges duplicate text pairs (visible + invisible ID version) → single text with ID
  2. Removes <tspan> wrappers
  3. Removes 'isolation: isolate' from styles
  4. Converts translate(X Y) → matrix(1 0 0 1 X Y)
  5. Re-adds text-anchor:middle to Group_Values texts
  6. Normalizes style formatting (removes extra spaces, px units)

Usage:
  python3 normalize_after_illustrator.py models/venn-7-set.svg
  python3 normalize_after_illustrator.py models/*.svg
  python3 normalize_after_illustrator.py  # processes all models/*.svg

Created by Zoltan Dul in 2026 - free to use with MIT license. 
Part of Venn Diagram Lab Module - https://github.com/ZoliQua/Venn-Diagram-Lab
"""

import re
import os
import sys
import glob

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')

# Approximate character width for text-anchor centering
CHAR_WIDTH_RATIO = 0.58


def clean_style(style):
    """Clean up Illustrator style artifacts."""
    # Remove isolation: isolate
    style = re.sub(r'\s*isolation:\s*isolate;?\s*', '', style)
    # Normalize spaces around colons and semicolons
    style = re.sub(r'\s*:\s*', ':', style)
    style = re.sub(r'\s*;\s*', ';', style)
    # Remove trailing/leading semicolons and spaces
    style = style.strip(' ;')
    # Remove double semicolons
    style = re.sub(r';+', ';', style)
    return style


def merge_duplicate_texts(content):
    """
    Merge Illustrator's duplicate text pairs.
    Pattern: visible text (fill:color) followed by invisible text (fill:none, with ID).
    Keep visible styling, take ID from invisible version.
    """
    # Pattern for a duplicate pair:
    # <text transform="...">...<tspan>TEXT</tspan></text>
    # <text id="ID" transform="...">...<tspan>TEXT</tspan></text>
    #
    # The second one has fill:none and an id attribute.

    # Match pairs of text elements at the same position
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

        # Clean up the visible style
        style = clean_style(visible_style)

        # Convert translate to matrix
        translate_match = re.match(r'translate\(([\d.]+)\s+([\d.]+)\)', transform)
        if translate_match:
            x, y = translate_match.group(1), translate_match.group(2)
            transform = f'matrix(1 0 0 1 {x} {y})'

        return f'{indent}<text id="{element_id}" transform="{transform}" style="{style}">{text_content}</text>'

    result = pair_pattern.sub(merge_pair, content)
    return result


def remove_tspan_wrappers(content):
    """Remove <tspan x="0" y="0"> wrappers from text elements."""
    content = re.sub(
        r'<tspan[^>]*>([^<]+)</tspan>',
        r'\1',
        content
    )
    return content


def convert_translate_to_matrix(content):
    """Convert remaining translate(X Y) transforms to matrix(1 0 0 1 X Y)."""
    def replace_translate(m):
        x = m.group(1)
        y = m.group(2)
        return f'matrix(1 0 0 1 {x} {y})'

    content = re.sub(
        r'translate\(([\d.]+)\s+([\d.]+)\)',
        replace_translate,
        content
    )
    return content


def clean_all_styles(content):
    """Clean isolation:isolate and normalize styles throughout the file."""
    def clean_style_attr(m):
        style = clean_style(m.group(1))
        return f'style="{style}"'

    content = re.sub(r'style="([^"]*)"', clean_style_attr, content)
    return content


def add_text_anchor_middle(content, is_work_file=False):
    """Add text-anchor:middle to Group_Values texts (and adjust x if needed)."""
    gv_start = content.find('<g id="Group_Values">')
    if gv_start == -1:
        return content

    gv_end = content.find('</g>', gv_start)
    gv_section = content[gv_start:gv_end + 4]

    def add_anchor(m):
        full = m.group(0)
        if 'text-anchor' in full:
            return full

        style = m.group('style')
        text_content = m.group('text')

        new_style = style.rstrip(';') + ';text-anchor:middle;'
        return full.replace(f'style="{style}"', f'style="{new_style}"')

    pattern = re.compile(
        r'<text\s[^>]*style="(?P<style>[^"]*)"[^>]*>(?P<text>[^<]+)</text>'
    )

    new_gv = pattern.sub(add_anchor, gv_section)
    return content[:gv_start] + new_gv + content[gv_end + 4:]


def normalize_file(filepath):
    """Normalize a single SVG file after Illustrator export."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    filename = os.path.basename(filepath)
    is_work = filename == 'venn-7-set-work.svg'

    # Check if file has Illustrator artifacts
    has_tspan = '<tspan' in content
    has_duplicate = 'fill: none' in content or 'fill:none' in content
    has_isolation = 'isolation' in content
    has_translate = re.search(r'translate\(\d', content) is not None

    if not any([has_tspan, has_duplicate, has_isolation, has_translate]):
        print(f"  {filename}: already clean, skipping")
        return False

    changes = []

    # Step 1: Merge duplicate text pairs
    if has_duplicate:
        content = merge_duplicate_texts(content)
        changes.append('merged duplicates')

    # Step 2: Remove remaining tspan wrappers
    if '<tspan' in content:
        content = remove_tspan_wrappers(content)
        changes.append('removed tspan')

    # Step 3: Convert translate → matrix
    if re.search(r'translate\(\d', content):
        content = convert_translate_to_matrix(content)
        changes.append('translate→matrix')

    # Step 4: Clean styles (isolation, spacing)
    if 'isolation' in content:
        content = clean_all_styles(content)
        changes.append('cleaned styles')

    # Step 5: Update comment to show it's been normalized
    content = re.sub(
        r'<!--\s*Generator:.*?-->',
        '',
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  {filename}: {', '.join(changes)}")
    return True


def main():
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    else:
        files = sorted(glob.glob(os.path.join(MODELS_DIR, '*.svg')))
        # Exclude pure files
        files = [f for f in files if '-pure' not in f]

    print("Normalizing SVG files after Illustrator export:\n")

    changed = 0
    for filepath in files:
        if os.path.isfile(filepath):
            if normalize_file(filepath):
                changed += 1
        else:
            print(f"  WARNING: {filepath} not found")

    print(f"\nDone: {changed} files updated")


if __name__ == '__main__':
    main()
