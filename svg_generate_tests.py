#!/usr/bin/env python3
"""
Generate test SVGs: replace Group_Values placeholder letters with numbers.
Test 1: replace with "1"
Test 2: replace with "123"

Created by Zoltan Dul in 2026 - free to use with MIT license. 
Part of Venn Diagram Lab Module - https://github.com/ZoliQua/Venn-Diagram-Lab
"""

import re
import os
import glob

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test')


def replace_values(content, replacement):
    """Replace text content in Group_Values texts with the given replacement."""
    gv_start = content.find('<g id="Group_Values">')
    if gv_start == -1:
        return content

    # Find closing </g> for Group_Values
    gv_end = content.find('</g>', gv_start)
    gv_section = content[gv_start:gv_end + 4]

    def replace_text_content(m):
        before = m.group(1)
        old_text = m.group(2)
        after = m.group(3)
        return f'{before}{replacement}{after}'

    # Match: ...>TEXT</text>  — replace the text content between > and </text>
    pattern = re.compile(r'(>[^<]*>)([^<]+)(</text>)')
    # Simpler: match the actual text content right before </text>
    pattern = re.compile(r'>([A-G]{1,7}|CountSUM_[A-G])</text>')

    def do_replace(m):
        return f'>{replacement}</text>'

    new_gv = pattern.sub(do_replace, gv_section)
    return content[:gv_start] + new_gv + content[gv_end + 4:]


def main():
    os.makedirs(TEST_DIR, exist_ok=True)

    svg_files = sorted(glob.glob(os.path.join(MODELS_DIR, '*.svg')))

    replacements = [
        ('1', 'test-1'),
        ('123', 'test-2'),
    ]

    for filepath in svg_files:
        filename = os.path.basename(filepath)
        stem = filename.replace('.svg', '')

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        for value, suffix in replacements:
            new_content = replace_values(content, value)
            out_name = f'{stem}-{suffix}.svg'
            out_path = os.path.join(TEST_DIR, out_name)

            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(new_content)

        print(f"  {filename} → {stem}-test-1.svg, {stem}-test-2.svg")

    print(f"\nDone: {len(svg_files) * 2} test files in test/")


if __name__ == '__main__':
    main()
