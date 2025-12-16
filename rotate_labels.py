#!/usr/bin/env python3
"""
Rotate Venn diagram labels in SVG files.

Performs a cyclic shift of set labels (A-H) in id attributes, text content,
fill colors, and re-sorts elements to maintain alphabetical order.

Rotation direction is "backward by one":
  B→A, C→B, D→C, ...  (and A wraps to the last letter)

Usage:
    python rotate_labels.py <input.svg> [--output <output.svg>] [--sets N] [--steps N]

Examples:
    python rotate_labels.py models/venn-6-set.svg
    python rotate_labels.py models/venn-6-set.svg -o rotated.svg
    python rotate_labels.py models/venn-7-set.svg --steps 2
    python rotate_labels.py models/venn-6-set.svg --dry-run
"""

import argparse
import re
import sys
from pathlib import Path

# Standard color mapping — consistent across all Venn diagram SVGs
STANDARD_COLORS = {
    'A': '#FFF200',  # Yellow
    'B': '#2E3192',  # Blue
    'C': '#ED1C24',  # Red
    'D': '#808285',  # Grey
    'E': '#3C2415',  # Brown
    'F': '#9E1F63',  # Magenta
    'G': '#CA4B9B',  # Pink
    'H': '#21AED1',  # Cyan
}


def detect_set_count(filename: str) -> int:
    """Try to detect set count from filename like 'venn-6-set.svg'."""
    match = re.search(r'venn-(\d+)', filename)
    if match:
        return int(match.group(1))
    return 0


def build_rotation_map(num_sets: int, steps: int = 1) -> dict[str, str]:
    """Build letter rotation mapping. B→A, C→B, ..., A→last."""
    letters = [chr(ord('A') + i) for i in range(num_sets)]
    mapping = {}
    for i, letter in enumerate(letters):
        new_index = (i - steps) % num_sets
        mapping[letter] = letters[new_index]
    return mapping


def translate_label(label: str, mapping: dict[str, str]) -> str:
    """Translate a label like 'ABCD' using the mapping, letter by letter."""
    return ''.join(mapping.get(ch, ch) for ch in label)


def sort_label(label: str) -> str:
    """Sort letters in a multi-char label to canonical order."""
    return ''.join(sorted(label))


def label_sort_key(label: str) -> tuple:
    """Sort key for Count labels: first by length, then alphabetically."""
    return (len(label), label)


def recolor_fill(style: str, new_color: str) -> str:
    """Replace fill color in a style attribute string."""
    return re.sub(r'fill:\s*#[a-fA-F0-9]+', f'fill:{new_color}', style)


def rotate_svg_labels(content: str, mapping: dict[str, str]) -> str:
    """Apply label rotation with color changes and re-sorting."""
    set_letters = set(mapping.keys())
    lines = content.split('\n')
    result_lines = []
    group_buffer = []  # Collects elements within a group for sorting
    current_group = None  # 'Shapes', 'Group_Names', 'Group_Values', 'Group_CountSums'

    def get_sort_key(element_line: str) -> tuple:
        """Extract sort key from an element line."""
        # Match Shape, Name, Count_, CountSUM_ ids
        m = re.search(r'id="(Shape|Name|Count_|CountSUM_)([A-Z]+)"', element_line)
        if m:
            prefix, label = m.group(1), m.group(2)
            return label_sort_key(label)
        return ('', '')

    def transform_element(line: str) -> str:
        """Transform a single element: rename labels, fix colors."""
        # 1. Rename id attributes
        def replace_id_match(m):
            full_id = m.group(1)
            def replace_inner(inner_m):
                prefix = inner_m.group(1)
                label = inner_m.group(2)
                new_label = translate_label(label, mapping)
                if len(new_label) > 1 and prefix == 'Count_':
                    new_label = sort_label(new_label)
                return f'{prefix}{new_label}'
            new_id = re.sub(r'(Shape|Name|Count_|CountSUM_)([A-Z]+)', replace_inner, full_id)
            return f'id="{new_id}"'

        line = re.sub(r'id="([^"]*)"', replace_id_match, line)

        # 2. Fix fill color for Shape elements based on new letter
        shape_m = re.search(r'id="Shape([A-Z])"', line)
        if shape_m:
            new_letter = shape_m.group(1)
            if new_letter in STANDARD_COLORS:
                line = re.sub(
                    r'fill:\s*#[a-fA-F0-9]+',
                    f'fill:{STANDARD_COLORS[new_letter]}',
                    line
                )

        # 3. Replace text content between > and <
        def replace_text(m):
            text = m.group(1)
            # "NameX" text
            name_m = re.fullmatch(r'(Name)([A-Z])', text)
            if name_m:
                return f'>{name_m.group(1)}{translate_label(name_m.group(2), mapping)}<'
            # "CountSUM_X" text
            cs_m = re.fullmatch(r'(CountSUM_)([A-Z])', text)
            if cs_m:
                return f'>{cs_m.group(1)}{translate_label(cs_m.group(2), mapping)}<'
            # Pure set label like "A", "AB", "ABCDEF"
            if text and all(ch in set_letters for ch in text):
                new_text = translate_label(text, mapping)
                if len(new_text) > 1:
                    new_text = sort_label(new_text)
                return f'>{new_text}<'
            return m.group(0)

        line = re.sub(r'>([^<]+)<', replace_text, line)
        return line

    def flush_group():
        """Sort buffered group elements and add to result."""
        nonlocal group_buffer
        if group_buffer:
            # Detect common indentation
            group_buffer.sort(key=lambda el: get_sort_key(el))
            result_lines.extend(group_buffer)
            group_buffer = []

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Detect group starts
        if re.search(r'id="(Shapes|Group_Names|Group_Values|Group_CountSums)"', stripped):
            flush_group()
            current_group = re.search(r'id="(\w+)"', stripped).group(1)
            result_lines.append(line)
            i += 1
            continue

        # Detect group ends
        if current_group and stripped in ('</g>', '</g> '):
            flush_group()
            current_group = None
            result_lines.append(line)
            i += 1
            continue

        # Inside a sortable group — buffer and transform elements
        if current_group and re.search(r'id="(Shape|Name|Count_|CountSUM_)', stripped):
            # Collect multi-line elements (path elements can span multiple lines)
            element_lines = [line]
            # Check if this line ends the element
            if not stripped.endswith('/>') and not stripped.endswith('</text>'):
                # Multi-line element — keep reading until closing
                i += 1
                while i < len(lines):
                    element_lines.append(lines[i])
                    if lines[i].strip().endswith('/>') or lines[i].strip().endswith('</text>'):
                        break
                    i += 1

            full_element = '\n'.join(element_lines)
            transformed = transform_element(full_element)
            group_buffer.append(transformed)
            i += 1
            continue

        # Lines not in a sortable group — pass through
        if current_group:
            # Non-element lines within a group (e.g., sub-group tags)
            flush_group()
            result_lines.append(line)
        else:
            result_lines.append(line)
        i += 1

    flush_group()
    return '\n'.join(result_lines)


def main():
    parser = argparse.ArgumentParser(description='Rotate Venn diagram labels in SVG files')
    parser.add_argument('input', help='Input SVG file')
    parser.add_argument('--output', '-o', help='Output file (default: overwrite input)')
    parser.add_argument('--sets', '-s', type=int, default=0,
                        help='Number of sets (default: auto-detect from filename)')
    parser.add_argument('--steps', '-n', type=int, default=1,
                        help='Number of rotation steps (default: 1)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show changes without writing')
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: {input_path} not found", file=sys.stderr)
        sys.exit(1)

    num_sets = args.sets or detect_set_count(input_path.name)
    if num_sets < 2:
        print("Error: Could not detect set count. Use --sets N", file=sys.stderr)
        sys.exit(1)

    mapping = build_rotation_map(num_sets, args.steps)
    print(f"Rotating {num_sets}-set diagram by {args.steps} step(s):")
    for src, dst in sorted(mapping.items()):
        print(f"  {src} → {dst}")

    original = input_path.read_text(encoding='utf-8')
    result = rotate_svg_labels(original, mapping)

    if args.dry_run:
        orig_lines = original.splitlines()
        result_lines = result.splitlines()
        changes = 0
        max_lines = max(len(orig_lines), len(result_lines))
        for i in range(max_lines):
            o = orig_lines[i] if i < len(orig_lines) else ''
            r = result_lines[i] if i < len(result_lines) else ''
            if o != r:
                changes += 1
                if changes <= 30:
                    print(f"  Line {i+1}:")
                    print(f"    - {o.strip()[:120]}")
                    print(f"    + {r.strip()[:120]}")
        if changes > 30:
            print(f"  ... and {changes - 30} more lines")
        print(f"\nTotal lines changed: {changes}")
        return

    output_path = Path(args.output) if args.output else input_path
    output_path.write_text(result, encoding='utf-8')
    print(f"Written to: {output_path}")


if __name__ == '__main__':
    main()
