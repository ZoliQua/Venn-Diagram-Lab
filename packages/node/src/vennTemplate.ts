import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODELS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'models');

/** Filenames of all bundled Venn model templates (e.g. "venn-4-set.svg"). */
export function listVennModels(): string[] {
  return readdirSync(MODELS_DIR).filter(f => f.endsWith('.svg')).sort();
}

/** Read a bundled template by filename (".svg" optional). Throws if unknown. */
export function loadVennTemplate(model: string): string {
  const filename = model.endsWith('.svg') ? model : `${model}.svg`;
  try {
    return readFileSync(join(MODELS_DIR, filename), 'utf8');
  } catch {
    throw new Error(`Unknown Venn model: ${model} (not found in bundled templates)`);
  }
}

const LETTERS = 'ABCDEFGHI';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replace the direct text content of the element with the given id. No-op if absent. */
function setElementText(svg: string, id: string, value: string): string {
  const re = new RegExp(`(id="${escapeRegExp(id)}"[^>]*>)([^<]*)(<)`);
  return svg.replace(re, (_m, open: string, _old: string, close: string) => open + escapeXml(value) + close);
}

export interface VennFill {
  title?: string;
  setNames: string[];
  counts: ReadonlyMap<string, number>;
}

/** Fill a Venn model template's Title / Name<L> / Count_<label> placeholders. Pure. */
export function fillVennTemplate(svg: string, fill: VennFill): string {
  let out = svg;
  if (fill.title !== undefined) out = setElementText(out, 'Title', fill.title);
  fill.setNames.forEach((name, i) => {
    out = setElementText(out, `Name${LETTERS[i]}`, name);
  });
  for (const [label, count] of fill.counts) {
    out = setElementText(out, `Count_${label}`, String(count));
  }
  return out;
}
