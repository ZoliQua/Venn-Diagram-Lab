import type { CsvData, FileType, Delimiter, GeneSetMeta, VennResult } from './csvParser.ts';
import type { EnrichmentMetric } from './enrichmentPlotSvg.ts';
import type { EnrichmentPlotSettings } from './enrichmentPlotStyle.ts';
import type { UpsetColorMode, UpsetSortMode } from '../components/UpsetPlot.tsx';
import type { EdgeWeightMetric } from './networkData.ts';
import type { AppMode, ThemeMode, ViewStyle } from '../App.tsx';

export const SESSION_STORAGE_KEY = 'vdl-session-v1';
export const SESSION_VERSION = '1';
const MAX_SESSION_SIZE = 5 * 1024 * 1024; // 5 MB

/** JSON-serializable counterpart of {@link VennResult}. */
export interface SerializableVennResult {
  inclusive: Record<string, number>;
  exclusive: Record<string, number>;
  inclusiveItems: Record<string, string[]>;
  exclusiveItems: Record<string, string[]>;
  totalUniqueItems: number;
}

/** Full Data-mode state persisted to localStorage. */
export interface DataSession {
  csvData: CsvData;
  filename: string;
  fileType: FileType;
  itemDelimiter: Delimiter;
  columnMapping: number[];
  originalColumns: number[];
  geneSetMeta: GeneSetMeta | null;
  model: string;
  calculated: boolean;
  vennResult: SerializableVennResult | null;
  exclusiveItems: Record<string, string[]> | null;
  inclusiveItems: Record<string, string[]> | null;
  error: string | null;
  showTitle: boolean;
  showNames: boolean;
  showSums: boolean;
  nameFontSize: number;
  nameFontFamily: string;
  titleFontSize: number;
  titleFontFamily: string;
  nameMaxChars: number | null;
  shapeOpacity: number;
  shapeColors: Record<string, string>;
  viewStyle: ViewStyle;
  cutColorMode: 'depth' | 'heatmap';
  heatmapColors: { low: string; mid: string; high: string };
  heatmapLegendPosition: string;
  upsetColorMode: UpsetColorMode;
  upsetSortMode: UpsetSortMode;
  upsetThreshold: number;
  upsetCustomColor: string;
  networkMetric: EdgeWeightMetric;
  networkSigOnly: boolean;
  networkEdgeLabels: boolean;
  networkNodeSizes: boolean;
  networkMinWeight: number;
  networkMoveNodes: boolean;
  plotBackground: 'dark' | 'white';
  dataMoveNames: boolean;
  dataMoveNumbers: boolean;
  enrichmentMetric: EnrichmentMetric;
  enrichmentPlotSettings: EnrichmentPlotSettings;
  selectedRegionLabel: string | null;
}

/** Top-level session envelope. */
export interface AppSession {
  version: string;
  savedAt: string;
  mode: AppMode;
  data: DataSession;
  theme?: ThemeMode;
}

/**
 * Raw (pre-serialization) Data-mode state used to build a {@link DataSession}.
 * Mirrors component state shapes (e.g. `Map` instead of `Record`, nullable
 * filename/model) so callers can pass their state as-is.
 */
export interface DataSessionInput {
  csvData: CsvData;
  filename: string | null;
  fileType: FileType;
  itemDelimiter: Delimiter;
  columnMapping: number[];
  originalColumns: number[];
  geneSetMeta: GeneSetMeta | null;
  model: string | null;
  calculated: boolean;
  vennResult: VennResult | null;
  exclusiveItems: Map<string, string[]> | null;
  inclusiveItems: Map<string, string[]> | null;
  error: string | null;
  showTitle: boolean;
  showNames: boolean;
  showSums: boolean;
  nameFontSize: number;
  nameFontFamily: string;
  titleFontSize: number;
  titleFontFamily: string;
  nameMaxChars: number | null;
  shapeOpacity: number;
  shapeColors: Record<string, string>;
  viewStyle: ViewStyle;
  cutColorMode: 'depth' | 'heatmap';
  heatmapColors: { low: string; mid: string; high: string };
  heatmapLegendPosition: string;
  upsetColorMode: UpsetColorMode;
  upsetSortMode: UpsetSortMode;
  upsetThreshold: number;
  upsetCustomColor: string;
  networkMetric: EdgeWeightMetric;
  networkSigOnly: boolean;
  networkEdgeLabels: boolean;
  networkNodeSizes: boolean;
  networkMinWeight: number;
  networkMoveNodes: boolean;
  plotBackground: 'dark' | 'white';
  dataMoveNames: boolean;
  dataMoveNumbers: boolean;
  enrichmentMetric: EnrichmentMetric;
  enrichmentPlotSettings: EnrichmentPlotSettings;
  selectedRegionLabel: string | null;
}

/**
 * Build the persisted {@link DataSession} object from raw Data-mode state.
 * Single source of truth used by both manual session export
 * (`buildAppSession`) and the debounced autosave effect in `App.tsx`, so a
 * field added to one path can't silently be missing from the other.
 */
export function buildDataSession(input: DataSessionInput): DataSession {
  return {
    csvData: input.csvData,
    filename: input.filename ?? '',
    fileType: input.fileType,
    itemDelimiter: input.itemDelimiter,
    columnMapping: input.columnMapping,
    originalColumns: input.originalColumns,
    geneSetMeta: input.geneSetMeta,
    model: input.model ?? '',
    calculated: input.calculated,
    vennResult: input.vennResult ? serializeVennResult(input.vennResult) : null,
    exclusiveItems: input.exclusiveItems ? mapToRecord(input.exclusiveItems) : null,
    inclusiveItems: input.inclusiveItems ? mapToRecord(input.inclusiveItems) : null,
    error: input.error,
    showTitle: input.showTitle,
    showNames: input.showNames,
    showSums: input.showSums,
    nameFontSize: input.nameFontSize,
    nameFontFamily: input.nameFontFamily,
    titleFontSize: input.titleFontSize,
    titleFontFamily: input.titleFontFamily,
    nameMaxChars: input.nameMaxChars,
    shapeOpacity: input.shapeOpacity,
    shapeColors: input.shapeColors,
    viewStyle: input.viewStyle,
    cutColorMode: input.cutColorMode,
    heatmapColors: input.heatmapColors,
    heatmapLegendPosition: input.heatmapLegendPosition,
    upsetColorMode: input.upsetColorMode,
    upsetSortMode: input.upsetSortMode,
    upsetThreshold: input.upsetThreshold,
    upsetCustomColor: input.upsetCustomColor,
    networkMetric: input.networkMetric,
    networkSigOnly: input.networkSigOnly,
    networkEdgeLabels: input.networkEdgeLabels,
    networkNodeSizes: input.networkNodeSizes,
    networkMinWeight: input.networkMinWeight,
    networkMoveNodes: input.networkMoveNodes,
    plotBackground: input.plotBackground,
    dataMoveNames: input.dataMoveNames,
    dataMoveNumbers: input.dataMoveNumbers,
    enrichmentMetric: input.enrichmentMetric,
    enrichmentPlotSettings: input.enrichmentPlotSettings,
    selectedRegionLabel: input.selectedRegionLabel,
  };
}

/** Convert a Map of string arrays to a plain Record for JSON serialization. */
export function mapToRecord(map: Map<string, string[]> | null): Record<string, string[]> {
  if (!map) return {};
  const record: Record<string, string[]> = {};
  for (const [key, value] of map) {
    record[key] = value;
  }
  return record;
}

/** Convert a plain Record back to a Map. */
export function recordToMap(record: Record<string, string[]> | null): Map<string, string[]> {
  if (!record) return new Map();
  const map = new Map<string, string[]>();
  for (const [key, value] of Object.entries(record)) {
    map.set(key, value);
  }
  return map;
}

function mapToNumberRecord(map: Map<string, number>): Record<string, number> {
  const record: Record<string, number> = {};
  for (const [key, value] of map) {
    record[key] = value;
  }
  return record;
}

function recordToNumberMap(record: Record<string, number>): Map<string, number> {
  const map = new Map<string, number>();
  for (const [key, value] of Object.entries(record)) {
    map.set(key, value);
  }
  return map;
}

/** Serialize a {@link VennResult} into a JSON-friendly shape. */
export function serializeVennResult(result: VennResult): SerializableVennResult {
  return {
    inclusive: mapToNumberRecord(result.inclusive),
    exclusive: mapToNumberRecord(result.exclusive),
    inclusiveItems: mapToRecord(result.inclusiveItems),
    exclusiveItems: mapToRecord(result.exclusiveItems),
    totalUniqueItems: result.totalUniqueItems,
  };
}

/** Deserialize a {@link SerializableVennResult} back into {@link VennResult}. */
export function deserializeVennResult(result: SerializableVennResult): VennResult {
  return {
    inclusive: recordToNumberMap(result.inclusive),
    exclusive: recordToNumberMap(result.exclusive),
    inclusiveItems: recordToMap(result.inclusiveItems),
    exclusiveItems: recordToMap(result.exclusiveItems),
    totalUniqueItems: result.totalUniqueItems,
  };
}

/** Persist a session to localStorage. Skips saves that exceed 5 MB. */
export function saveSession(session: AppSession): void {
  try {
    const serialized = JSON.stringify(session);
    if (serialized.length > MAX_SESSION_SIZE) {
      console.warn('Session too large to save (>5 MB); skipping.');
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, serialized);
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

/** Load the previously saved session, if any. */
export function loadSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppSession;
  } catch (e) {
    console.warn('Failed to load session:', e);
    return null;
  }
}

/** Remove the saved session from localStorage. */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear session:', e);
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function buildSessionFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  return `venn_session_${y}${m}${d}_${h}${min}${s}.json`;
}

/** Export a session to a downloadable JSON file. */
export function exportSessionToFile(session: AppSession): void {
  const serialized = JSON.stringify(session, null, 2);
  const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildSessionFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Read and validate a session from a user-selected file. */
export async function importSessionFromFile(file: File): Promise<AppSession> {
  try {
    const text = typeof file.text === 'function'
      ? await file.text()
      : await readFileWithFileReader(file);
    const parsed = JSON.parse(text) as unknown;
    if (!isSessionCompatible(parsed as AppSession | null)) {
      throw new Error('The selected file is not a compatible Venn Diagram Lab session.');
    }
    return parsed as AppSession;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to parse session file.';
    throw new Error(message);
  }
}

function readFileWithFileReader(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve(String(reader.result ?? '')); };
    reader.onerror = () => { reject(new Error('Failed to read the selected file.')); };
    reader.readAsText(file);
  });
}

/** Validate that a loaded session matches the expected schema and version. */
export function isSessionCompatible(session: AppSession | null): session is AppSession {
  if (!session) return false;
  if (session.version !== SESSION_VERSION) return false;
  if (session.mode !== 'data') return false;
  if (!session.data) return false;

  const d = session.data;
  if (!d.csvData || !Array.isArray(d.csvData.headers) || !Array.isArray(d.csvData.rows)) return false;
  if (typeof d.filename !== 'string') return false;
  if (d.fileType !== 'binary' && d.fileType !== 'aggregated') return false;
  if (typeof d.model !== 'string') return false;
  if (!Array.isArray(d.columnMapping)) return false;
  if (!Array.isArray(d.originalColumns)) return false;

  // Fields consumed without guards during restore — reject if missing/malformed.
  const hc = d.heatmapColors;
  if (!hc || typeof hc.low !== 'string' || typeof hc.mid !== 'string' || typeof hc.high !== 'string') return false;
  if (!d.shapeColors || typeof d.shapeColors !== 'object') return false;
  if (!d.enrichmentPlotSettings || typeof d.enrichmentPlotSettings !== 'object') return false;
  if (typeof d.shapeOpacity !== 'number') return false;
  if (typeof d.nameFontSize !== 'number') return false;

  return true;
}
