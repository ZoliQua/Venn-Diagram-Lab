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
