/**
 * Truncate a display name to a given maximum character length, appending a
 * single-character ellipsis (U+2026 "…") when the name is actually shortened.
 *
 * Contract:
 *   - If maxChars >= raw.length or maxChars is a non-finite / non-positive
 *     number, the raw name is returned unchanged (no ellipsis).
 *   - Otherwise the return value is exactly `maxChars` characters long,
 *     consisting of the first `maxChars - 1` characters of `raw` followed
 *     by the ellipsis character.
 *   - For `maxChars === 1` the return is just the ellipsis character.
 *
 * The function is pure and side-effect free; used by the Data mode
 * "Max name length" sidebar slider (v1.13.4).
 */
export function truncateName(raw: string, maxChars: number): string {
  if (!Number.isFinite(maxChars) || maxChars <= 0) return raw;
  if (maxChars >= raw.length) return raw;
  if (maxChars === 1) return '…';
  return raw.slice(0, maxChars - 1) + '…';
}
