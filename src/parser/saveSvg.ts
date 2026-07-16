import { saveSvg as coreSaveSvg } from '@venn-diagram-lab/core';
import type { VennDocument, VennText } from '@venn-diagram-lab/core';
import { isEmptyCountValue } from '../utils/regionDisplay.ts';

export type { VennDocument, VennText } from '@venn-diagram-lab/core';

export interface SaveSvgOptions {
  /**
   * When true, omit `Count_*` value texts whose content is `"0"` from the
   * serialized output (web-only rendering concern; does not affect
   * `packages/core`'s byte-parity contract). Defaults to false, which
   * produces output identical to calling the core `saveSvg` directly.
   */
  hideEmptyCounts?: boolean;
}

function isHiddenEmptyCount(t: VennText): boolean {
  return t.id.startsWith('Count_') && isEmptyCountValue(t.content);
}

export function saveSvg(doc: VennDocument, opts?: SaveSvgOptions): string {
  if (!opts?.hideEmptyCounts) {
    return coreSaveSvg(doc);
  }

  const filteredValues = doc.texts.values.filter((t) => !isHiddenEmptyCount(t));
  if (filteredValues.length === doc.texts.values.length) {
    return coreSaveSvg(doc);
  }

  const filteredDoc: VennDocument = {
    ...doc,
    texts: {
      ...doc.texts,
      values: filteredValues,
    },
  };
  return coreSaveSvg(filteredDoc);
}
