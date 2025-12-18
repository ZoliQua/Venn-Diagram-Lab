#!/usr/bin/env python3
"""
Fix Edwards-Venn shape IDs and reorder them alphabetically.
"""
import re
import os

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')

# Remapping: old_id → new_id
REMAPS = {
    'venn-3a-set-edwards.svg': {
        'ShapeA': 'ShapeC',
        'ShapeB': 'ShapeA',
        'ShapeC': 'ShapeB',
    },
    'venn-4a-set-edwards.svg': {
        'ShapeA': 'ShapeD',
        'ShapeB': 'ShapeC',
        'ShapeC': 'ShapeA',
        'ShapeD': 'ShapeB',
    },
    'venn-5a-set-edwards.svg': {
        'ShapeA': 'ShapeE',
        'ShapeB': 'ShapeD',
        # ShapeC stays
        'ShapeD': 'ShapeA',
        'ShapeE': 'ShapeB',
    },
    'venn-6a-set-edwards.svg': {
        'ShapeA': 'ShapeE',
        'ShapeB': 'ShapeD',
        # ShapeC stays
        'ShapeD': 'ShapeA',
        'ShapeE': 'ShapeB',
        # ShapeF stays
    },
    'venn-7a-set-edwards.svg': {
        'ShapeA': 'ShapeE',
        'ShapeB': 'ShapeD',
        # ShapeC stays
        'ShapeD': 'ShapeA',
        'ShapeE': 'ShapeB',
        # ShapeF stays
        # ShapeG stays
    },
}

# Also remap Bullet IDs to match
BULLET_PREFIX = 'Bullet'


def remap_ids(content, remap):
    """Remap Shape and Bullet IDs using temp placeholders to avoid collisions."""
    # Phase 1: old → temp
    for old, new in remap.items():
        old_letter = old.replace('Shape', '')
        new_letter = new.replace('Shape', '')
        content = content.replace(f'id="{old}"', f'id="__TEMP_Shape_{new_letter}__"')
        content = content.replace(f'id="Bullet{old_letter}"', f'id="__TEMP_Bullet_{new_letter}__"')

    # Phase 2: temp → new
    for letter in 'ABCDEFG':
        content = content.replace(f'id="__TEMP_Shape_{letter}__"', f'id="Shape{letter}"')
        content = content.replace(f'id="__TEMP_Bullet_{letter}__"', f'id="Bullet{letter}"')

    return content


def reorder_shapes(content):
    """Reorder <path>/<rect>/<circle>/<ellipse> elements inside <g id="Shapes"> alphabetically by ID."""
    shapes_match = re.search(
        r'(<g id="Shapes">)\s*(.*?)\s*(</g>)',
        content,
        re.DOTALL
    )
    if not shapes_match:
        return content

    prefix = shapes_match.group(1)
    shapes_block = shapes_match.group(2)
    suffix = shapes_match.group(3)

    # Extract individual shape elements (single-line or multi-line)
    # Match <TAG id="ShapeX" ... /> or <TAG id="ShapeX" ...>...</TAG>
    shape_pattern = re.compile(
        r'(\s*<(?:path|rect|circle|ellipse)\s+id="(Shape[A-Z])"\s.*?(?:/>|</(?:path|rect|circle|ellipse)>))',
        re.DOTALL
    )

    shapes = []
    for m in shape_pattern.finditer(shapes_block):
        shapes.append((m.group(2), m.group(1)))  # (id, full_element)

    if not shapes:
        return content

    # Sort by ID
    shapes.sort(key=lambda x: x[0])

    # Rebuild
    new_block = '\n'.join(el.strip() for _, el in shapes)
    # Indent each line with tab
    lines = new_block.split('\n')
    indented = '\n'.join(('\t' + line if line.strip() else line) for line in lines)

    new_shapes_section = f'{prefix}\n{indented}\n{suffix}'
    content = content[:shapes_match.start()] + new_shapes_section + content[shapes_match.end():]
    return content


def reorder_bullets(content):
    """Reorder circles inside <g id="Group_Bullets"> alphabetically by ID."""
    bullets_match = re.search(
        r'(<g id="Group_Bullets"[^>]*>)\s*(.*?)\s*(</g>)',
        content,
        re.DOTALL
    )
    if not bullets_match:
        return content

    prefix = bullets_match.group(1)
    block = bullets_match.group(2)
    suffix = bullets_match.group(3)

    bullet_pattern = re.compile(
        r'(\s*<circle\s+id="(Bullet[A-Z])"\s.*?/>)',
        re.DOTALL
    )

    bullets = []
    for m in bullet_pattern.finditer(block):
        bullets.append((m.group(2), m.group(1)))

    if not bullets:
        return content

    bullets.sort(key=lambda x: x[0])
    new_block = '\n'.join(el.strip() for _, el in bullets)
    indented = '\n'.join(('\t' + line if line.strip() else line) for line in new_block.split('\n'))

    new_section = f'{prefix}\n{indented}\n{suffix}'
    content = content[:bullets_match.start()] + new_section + content[bullets_match.end():]
    return content


def process_file(filename, remap):
    filepath = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  SKIP {filename}: not found")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Show before
    before_ids = re.findall(r'id="(Shape[A-G])"', content)
    print(f"  {filename}")
    print(f"    Before: {', '.join(before_ids)}")

    # Remap IDs
    content = remap_ids(content, remap)

    # Reorder shapes and bullets
    content = reorder_shapes(content)
    content = reorder_bullets(content)

    # Show after
    after_ids = re.findall(r'id="(Shape[A-G])"', content)
    print(f"    After:  {', '.join(after_ids)}")

    # Verify remapping
    for old, new in remap.items():
        print(f"    {old} → {new}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


def main():
    print("Fixing Edwards-Venn shape IDs:\n")
    for filename, remap in REMAPS.items():
        process_file(filename, remap)
        print()
    print("Done!")


if __name__ == '__main__':
    main()
