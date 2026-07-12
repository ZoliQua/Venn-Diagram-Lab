import type { VennResult } from './csvParser.ts';
import { pairwiseStatistics } from './statistics.ts';
import { sigLabel } from './exportData.ts';

/**
 * Cross-language number-rendering rule for the JSON result export.
 *
 * This is the single source of truth that the Python and R ports MUST
 * reproduce byte-for-byte. Do NOT rely on any language's native JSON number
 * serializer — they disagree (`1.0` vs `1`, differing shortest-repr choices).
 *
 * Rule:
 *   1. Integers render as integers (`1394`, never `1394.0`).
 *   2. Floats are rounded to 6 decimal places (ROUND_HALF_UP on the exact
 *      IEEE-754 value — identical to the repo's `js_to_fixed(v, 6)` helper),
 *      then rendered as the SHORTEST decimal string: trailing zeros stripped,
 *      and a value that rounds to a whole number renders WITHOUT a decimal
 *      point (e.g. `0.5`, `2`, `0.123457`, `0`).
 *
 * The TS reference implementation is `JSON.stringify(parseFloat(v.toFixed(6)))`.
 * Python reproduction: `js_to_fixed(v, 6)` → parse float → shortest repr with
 * trailing zeros / decimal point stripped for whole numbers.
 */
export function formatJsonNumber(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return JSON.stringify(parseFloat(v.toFixed(6)));
}

/**
 * Controlled, deterministic JSON serializer. Mirrors the byte layout of
 * `JSON.stringify(value, null, 2)` exactly, EXCEPT every number is emitted
 * through {@link formatJsonNumber} so cross-language parity is guaranteed.
 *
 * Format contract (so Python/R can match byte-for-byte):
 *   - 2-space indentation, `": "` after object keys, `,\n` between entries.
 *   - Empty object → `{}`; empty array → `[]`.
 *   - Strings escaped per JSON (JS `JSON.stringify` string escaping).
 *   - Object key order = insertion order (pinned by the builder below).
 */
function serialize(value: unknown, indent: string): string {
  if (typeof value === 'number') return formatJsonNumber(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const inner = indent + '  ';
    const items = value.map(v => inner + serialize(v, inner));
    return '[\n' + items.join(',\n') + '\n' + indent + ']';
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const inner = indent + '  ';
    const items = entries.map(([k, v]) => inner + JSON.stringify(k) + ': ' + serialize(v, inner));
    return '{\n' + items.join(',\n') + '\n' + indent + '}';
  }
  return JSON.stringify(value);
}

/**
 * Build the full Venn result + statistics as a canonical JSON string.
 *
 * Schema (key order PINNED — do not reorder):
 * ```
 * {
 *   "schemaVersion": "1",
 *   "model": "<model id, e.g. venn-4-set>",
 *   "setNames": { "A": "...", ... },
 *   "universeSize": <int>,
 *   "regions": [
 *     { "label", "sets": [...], "depth": <int>,
 *       "exclusiveCount": <int>, "inclusiveCount": <int>,
 *       "exclusiveItems": [...] }, ...
 *   ],
 *   "setSizes": { "A": <int>, ... },
 *   "statistics": [
 *     { "a", "b", "jaccard", "dice", "overlapCoeff",
 *       "intersection", "union", "expected", "foldEnrichment",
 *       "pValue", "fdr", "bonferroni", "pTwoSided",
 *       "significant": "***" | "**" | "*" | "ns" }, ...
 *   ]
 * }
 * ```
 *
 * - `regions` covers all `2^n - 1` non-empty subsets, sorted by depth ascending
 *   then label ascending (ASCII), matching the Region Summary TSV ordering.
 * - `statistics` is sorted by p-value ascending (as `pairwiseStatistics`),
 *   with `significant` rendered as the FDR star label (`sigLabel`).
 * - Item order in `exclusiveItems` is preserved from the analysis result.
 */
export function exportResultJson(
  result: VennResult,
  n: number,
  setNames: string[],
  totalItems: number,
  model: string,
): string {
  const letters = 'ABCDEFGHI'.slice(0, n).split('');

  const setNamesObj: Record<string, string> = {};
  for (let i = 0; i < n; i++) setNamesObj[letters[i]] = setNames[i] ?? letters[i];

  interface RegionJson {
    label: string;
    sets: string[];
    depth: number;
    exclusiveCount: number;
    inclusiveCount: number;
    exclusiveItems: string[];
  }
  const regions: RegionJson[] = [];
  for (let mask = 1; mask < (1 << n); mask++) {
    const sets = letters.filter((_, i) => mask & (1 << i));
    const label = sets.join('');
    regions.push({
      label,
      sets,
      depth: sets.length,
      exclusiveCount: result.exclusive.get(label) ?? 0,
      inclusiveCount: result.inclusive.get(label) ?? 0,
      exclusiveItems: result.exclusiveItems.get(label) ?? [],
    });
  }
  regions.sort((a, b) => a.depth - b.depth || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  const setSizes: Record<string, number> = {};
  for (const l of letters) setSizes[l] = result.inclusive.get(l) ?? 0;

  const stats = pairwiseStatistics(result, n, totalItems, setNames);
  const statistics = stats.map(s => ({
    a: s.a,
    b: s.b,
    jaccard: s.jaccard,
    dice: s.dice,
    overlapCoeff: s.overlapCoeff,
    intersection: s.intersection,
    union: s.union,
    expected: s.expected,
    foldEnrichment: s.foldEnrichment,
    pValue: s.pValue,
    fdr: s.fdr,
    bonferroni: s.bonferroni,
    pTwoSided: s.pTwoSided,
    significant: sigLabel(s.fdr),
  }));

  const obj = {
    schemaVersion: '1',
    model,
    setNames: setNamesObj,
    universeSize: totalItems,
    regions,
    setSizes,
    statistics,
  };

  return serialize(obj, '');
}
