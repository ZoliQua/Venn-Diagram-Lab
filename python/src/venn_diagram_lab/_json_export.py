"""Cross-language number rendering + serializer for the JSON result export.

Mirrors ``packages/core/src/jsonExport.ts`` byte-for-byte. Kept private
(leading underscore) because it is tightly coupled to the webapp's JSON
export format and not part of the public API.

The single source of truth for number rendering is the TypeScript
``formatJsonNumber``; :func:`format_json_number` here reproduces its bytes
for every value ``>= 1e-6`` (smaller values round to ``0``) WITHOUT ever
round-tripping through a native float repr — Python's ``str(float(...))``
switches to exponential notation in ``[1e-6, 1e-4)`` (e.g.
``str(float("0.000083"))`` -> ``"8.3e-05"``), which would break parity with
the goldens (which contain Bonferroni values like ``0.000083``).
"""

from __future__ import annotations

import json

from venn_diagram_lab._tsv_escape import js_to_fixed

_JSON_DECIMALS = 6


def format_json_number(v: float) -> str:
    """Render a number exactly like the TS ``formatJsonNumber(v)``.

    1. Integer-valued -> the integer string (``"2"``, ``"0"``).
    2. Otherwise ``s = js_to_fixed(v, 6)`` (fixed 6-decimal string), then
       strip trailing zeros; if it then ends with ``.``, drop the ``.``
       (``"0.500000"`` -> ``"0.5"``, ``"2.000000"`` -> ``"2"``,
       ``"0.000083"`` -> ``"0.000083"``).
    3. Never emit exponential notation; never parse ``s`` back to a float.
    """
    if float(v).is_integer():
        return str(int(v))
    s = js_to_fixed(v, _JSON_DECIMALS)
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s


def serialize(value: object, indent: str = "") -> str:  # noqa: PLR0911
    """Serialize a nested dict/list/str/number structure.

    Mirrors ``JSON.stringify(value, null, 2)`` layout byte-for-byte, EXCEPT
    every number is emitted through :func:`format_json_number`:

      * 2-space indentation; ``": "`` after each object key; ``,\\n`` between
        entries; newline + indent before the closing ``}`` / ``]``.
      * Empty object -> ``{}``; empty array -> ``[]``.
      * Strings escaped per JSON (``ensure_ascii=False`` to keep non-ASCII
        characters literal, matching JS ``JSON.stringify``).
      * Object key order = dict insertion order (pinned by the builder).
    """
    # bool is a subclass of int; the schema has no booleans, but guard anyway.
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return format_json_number(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        if not value:
            return "[]"
        inner = indent + "  "
        items = [inner + serialize(v, inner) for v in value]
        return "[\n" + ",\n".join(items) + "\n" + indent + "]"
    if isinstance(value, dict):
        if not value:
            return "{}"
        inner = indent + "  "
        items = [
            inner + json.dumps(k, ensure_ascii=False) + ": " + serialize(v, inner)
            for k, v in value.items()
        ]
        return "{\n" + ",\n".join(items) + "\n" + indent + "}"
    if value is None:
        return "null"
    raise TypeError(f"Cannot serialize value of type {type(value).__name__}")
