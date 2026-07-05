import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CsvData } from '../utils/csvParser.ts';
import type { AppSession, DataSession, DataSessionInput } from '../utils/session.ts';
import {
  SESSION_STORAGE_KEY,
  mapToRecord,
  recordToMap,
  serializeVennResult,
  deserializeVennResult,
  saveSession,
  loadSession,
  clearSession,
  isSessionCompatible,
  exportSessionToFile,
  importSessionFromFile,
  buildDataSession,
  nextCutColorMode,
  shouldWarnBeforeDiscard,
} from '../utils/session.ts';

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const originalLocalStorage = globalThis.localStorage;

function installMockStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MockStorage(),
    configurable: true,
    writable: true,
  });
}

function restoreLocalStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    value: originalLocalStorage,
    configurable: true,
    writable: true,
  });
}

function makeSampleCsvData(): CsvData {
  return {
    headers: ['Set A', 'Set B', 'Set C'],
    rows: [
      ['1', '0', '1'],
      ['0', '1', '1'],
      ['1', '1', '0'],
    ],
  };
}

function makeSampleDataSession(): DataSession {
  return {
    csvData: makeSampleCsvData(),
    filename: 'sample.csv',
    fileType: 'binary',
    itemDelimiter: ',',
    columnMapping: [0, 1, 2],
    originalColumns: [2, 1, 0],
    geneSetMeta: null,
    model: 'venn-3-set.svg',
    calculated: true,
    error: null,
    showTitle: true,
    showNames: false,
    showSums: true,
    nameFontSize: 24,
    nameFontFamily: 'Tahoma',
    titleFontSize: 30,
    titleFontFamily: 'Arial',
    nameMaxChars: null,
    shapeOpacity: 0.2,
    shapeColors: { A: '#FFF200', B: '#2E3192', C: '#ED1C24' },
    viewStyle: 'layer',
    cutColorMode: 'depth',
    heatmapColors: { low: '#2166AC', mid: '#F7F7F7', high: '#B2182B' },
    heatmapLegendPosition: 'bottom-left',
    upsetColorMode: 'depth',
    upsetSortMode: 'size',
    upsetThreshold: 2,
    upsetCustomColor: '#4a90d9',
    networkMetric: 'intersection',
    networkSigOnly: false,
    networkEdgeLabels: true,
    networkNodeSizes: true,
    networkMinWeight: 5,
    networkMoveNodes: true,
    plotBackground: 'dark',
    dataMoveNames: false,
    dataMoveNumbers: true,
    enrichmentMetric: 'neglog10fdr',
    enrichmentPlotSettings: {
      bar: {
        sigColor: '#2e7d32',
        nsColor: '#888888',
        fontSize: 10,
        fontFamily: 'Tahoma,sans-serif',
        background: 'white',
        showAxisLabel: true,
        showPairLabels: true,
        showSigMarkers: true,
        showLegend: true,
        gradientLowColor: '#ffffff',
        gradientHighFdrColor: '#1b5e20',
        gradientHighFeColor: '#4a148c',
        axisOrder: 'original',
        linkageMethod: 'average',
        dendrogramFraction: 0.12,
        showRowDendrogram: true,
        showColDendrogram: true,
      },
      lollipop: {
        sigColor: '#2e7d32',
        nsColor: '#888888',
        fontSize: 10,
        fontFamily: 'Tahoma,sans-serif',
        background: 'white',
        showAxisLabel: true,
        showPairLabels: true,
        showSigMarkers: true,
        showLegend: true,
        gradientLowColor: '#ffffff',
        gradientHighFdrColor: '#1b5e20',
        gradientHighFeColor: '#4a148c',
        axisOrder: 'original',
        linkageMethod: 'average',
        dendrogramFraction: 0.12,
        showRowDendrogram: true,
        showColDendrogram: true,
      },
      heatmap: {
        sigColor: '#2e7d32',
        nsColor: '#888888',
        fontSize: 10,
        fontFamily: 'Tahoma,sans-serif',
        background: 'white',
        showAxisLabel: true,
        showPairLabels: true,
        showSigMarkers: true,
        showLegend: true,
        gradientLowColor: '#ffffff',
        gradientHighFdrColor: '#1b5e20',
        gradientHighFeColor: '#4a148c',
        axisOrder: 'original',
        linkageMethod: 'average',
        dendrogramFraction: 0.12,
        showRowDendrogram: true,
        showColDendrogram: true,
      },
      shareDistribution: {
        sigColor: '#2e7d32',
        nsColor: '#888888',
        fontSize: 10,
        fontFamily: 'Tahoma,sans-serif',
        background: 'white',
        showAxisLabel: true,
        showPairLabels: true,
        showSigMarkers: true,
        showLegend: true,
        gradientLowColor: '#ffffff',
        gradientHighFdrColor: '#1b5e20',
        gradientHighFeColor: '#4a148c',
        axisOrder: 'original',
        linkageMethod: 'average',
        dendrogramFraction: 0.12,
        showRowDendrogram: true,
        showColDendrogram: true,
      },
    },
    selectedRegionLabel: 'AB',
    sourceKind: 'url',
    hasHeader: false,
    sheetIndex: 2,
  };
}

/**
 * Raw (pre-serialization) state bag matching what App.tsx's `buildAppSession`
 * and the debounced autosave effect assemble from component state.
 */
function sampleStateBag(): DataSessionInput {
  const sample = makeSampleDataSession();
  return {
    csvData: sample.csvData,
    filename: sample.filename,
    fileType: sample.fileType,
    itemDelimiter: sample.itemDelimiter,
    columnMapping: sample.columnMapping,
    originalColumns: sample.originalColumns,
    geneSetMeta: sample.geneSetMeta,
    model: sample.model,
    calculated: sample.calculated,
    error: sample.error,
    showTitle: sample.showTitle,
    showNames: sample.showNames,
    showSums: sample.showSums,
    nameFontSize: sample.nameFontSize,
    nameFontFamily: sample.nameFontFamily,
    titleFontSize: sample.titleFontSize,
    titleFontFamily: sample.titleFontFamily,
    nameMaxChars: sample.nameMaxChars,
    shapeOpacity: sample.shapeOpacity,
    shapeColors: sample.shapeColors,
    viewStyle: sample.viewStyle,
    cutColorMode: sample.cutColorMode,
    heatmapColors: sample.heatmapColors,
    heatmapLegendPosition: sample.heatmapLegendPosition,
    upsetColorMode: sample.upsetColorMode,
    upsetSortMode: sample.upsetSortMode,
    upsetThreshold: sample.upsetThreshold,
    upsetCustomColor: sample.upsetCustomColor,
    networkMetric: sample.networkMetric,
    networkSigOnly: sample.networkSigOnly,
    networkEdgeLabels: sample.networkEdgeLabels,
    networkNodeSizes: sample.networkNodeSizes,
    networkMinWeight: sample.networkMinWeight,
    networkMoveNodes: sample.networkMoveNodes,
    plotBackground: sample.plotBackground,
    dataMoveNames: sample.dataMoveNames,
    dataMoveNumbers: sample.dataMoveNumbers,
    enrichmentMetric: sample.enrichmentMetric,
    enrichmentPlotSettings: sample.enrichmentPlotSettings,
    selectedRegionLabel: sample.selectedRegionLabel,
    sourceKind: sample.sourceKind,
    hasHeader: sample.hasHeader,
    sheetIndex: sample.sheetIndex,
  };
}

describe('nextCutColorMode', () => {
  it('preserves the restored cut color mode when restoring', () => {
    expect(nextCutColorMode(true, 'depth')).toBe('depth');
    expect(nextCutColorMode(true, 'heatmap')).toBe('heatmap');
  });

  it('defaults to heatmap for a fresh (non-restore) calculate', () => {
    expect(nextCutColorMode(false, 'depth')).toBe('heatmap');
    expect(nextCutColorMode(false, 'heatmap')).toBe('heatmap');
  });
});

describe('shouldWarnBeforeDiscard', () => {
  it('warns before discarding unsaved edit work on restore', () => {
    expect(shouldWarnBeforeDiscard(true, 'edit')).toBe(true);
    expect(shouldWarnBeforeDiscard(false, 'edit')).toBe(false);
  });

  it('does not warn for view or data mode, regardless of isModified', () => {
    expect(shouldWarnBeforeDiscard(true, 'view')).toBe(false);
    expect(shouldWarnBeforeDiscard(false, 'view')).toBe(false);
    expect(shouldWarnBeforeDiscard(true, 'data')).toBe(false);
    expect(shouldWarnBeforeDiscard(false, 'data')).toBe(false);
  });
});

describe('buildDataSession', () => {
  it('includes every DataSession key', () => {
    const ds = buildDataSession(sampleStateBag());
    const requiredKeys: (keyof DataSession)[] = [
      'csvData', 'filename', 'fileType', 'itemDelimiter', 'columnMapping',
      'originalColumns', 'geneSetMeta', 'model', 'calculated',
      'error', 'showTitle', 'showNames',
      'showSums', 'nameFontSize', 'nameFontFamily', 'titleFontSize',
      'titleFontFamily', 'nameMaxChars', 'shapeOpacity', 'shapeColors',
      'viewStyle', 'cutColorMode', 'heatmapColors', 'heatmapLegendPosition',
      'upsetColorMode', 'upsetSortMode', 'upsetThreshold', 'upsetCustomColor',
      'networkMetric', 'networkSigOnly', 'networkEdgeLabels', 'networkNodeSizes',
      'networkMinWeight', 'networkMoveNodes', 'plotBackground', 'dataMoveNames',
      'dataMoveNumbers', 'enrichmentMetric', 'enrichmentPlotSettings',
      'selectedRegionLabel', 'sourceKind', 'hasHeader', 'sheetIndex',
    ];
    for (const k of requiredKeys) expect(k in ds).toBe(true);
  });

  it('produces a DataSession deep-equal to a manually-serialized equivalent', () => {
    const bag = sampleStateBag();
    const ds = buildDataSession(bag);
    expect(ds).toEqual(makeSampleDataSession());
  });

  it('defaults null filename/model to empty string, like the App.tsx call sites', () => {
    const bag = sampleStateBag();
    bag.filename = null;
    bag.model = null;
    const ds = buildDataSession(bag);
    expect(ds.filename).toBe('');
    expect(ds.model).toBe('');
  });

  it('session payload excludes recomputed derived fields', () => {
    const ds = buildDataSession(sampleStateBag());
    expect('vennResult' in ds).toBe(false);
    expect('exclusiveItems' in ds).toBe(false);
    expect('inclusiveItems' in ds).toBe(false);
  });

  it('round-trips import provenance fields (sourceKind/hasHeader/sheetIndex)', () => {
    const bag = sampleStateBag();
    bag.sourceKind = 'paste';
    bag.hasHeader = false;
    bag.sheetIndex = 3;
    const ds = buildDataSession(bag);
    expect(ds.sourceKind).toBe('paste');
    expect(ds.hasHeader).toBe(false);
    expect(ds.sheetIndex).toBe(3);
  });
});

describe('session serialization helpers', () => {
  beforeEach(installMockStorage);
  afterEach(restoreLocalStorage);

  it('mapToRecord converts a Map to a Record', () => {
    const map = new Map<string, string[]>([
      ['A', ['x', 'y']],
      ['B', ['z']],
    ]);
    expect(mapToRecord(map)).toEqual({ A: ['x', 'y'], B: ['z'] });
  });

  it('mapToRecord returns empty object for null', () => {
    expect(mapToRecord(null)).toEqual({});
  });

  it('recordToMap converts a Record to a Map', () => {
    const record = { A: ['x', 'y'], B: ['z'] };
    const map = recordToMap(record);
    expect(map.get('A')).toEqual(['x', 'y']);
    expect(map.get('B')).toEqual(['z']);
    expect(map.size).toBe(2);
  });

  it('recordToMap returns empty Map for null', () => {
    expect(recordToMap(null).size).toBe(0);
  });

  it('serialize/deserialize VennResult round-trip preserves data', () => {
    const original = {
      inclusive: new Map<string, number>([['A', 5], ['AB', 3]]),
      exclusive: new Map<string, number>([['A', 2], ['AB', 3]]),
      inclusiveItems: new Map<string, string[]>([['A', ['p', 'q']]]),
      exclusiveItems: new Map<string, string[]>([['AB', ['r']]]),
      totalUniqueItems: 10,
    };
    const serialized = serializeVennResult(original);
    const deserialized = deserializeVennResult(serialized);

    expect([...deserialized.inclusive.entries()]).toEqual([['A', 5], ['AB', 3]]);
    expect([...deserialized.exclusive.entries()]).toEqual([['A', 2], ['AB', 3]]);
    expect([...deserialized.inclusiveItems.entries()]).toEqual([['A', ['p', 'q']]]);
    expect([...deserialized.exclusiveItems.entries()]).toEqual([['AB', ['r']]]);
    expect(deserialized.totalUniqueItems).toBe(10);
  });
});

describe('session localStorage lifecycle', () => {
  beforeEach(installMockStorage);
  afterEach(restoreLocalStorage);

  it('saveSession stores a valid AppSession and loadSession retrieves it', () => {
    const session: AppSession = {
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'data',
      theme: 'dark',
      data: makeSampleDataSession(),
    };
    saveSession(session);
    const loaded = loadSession();
    expect(loaded).toEqual(session);
  });

  it('clearSession removes the session key', () => {
    const session: AppSession = {
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'data',
      data: makeSampleDataSession(),
    };
    saveSession(session);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
    clearSession();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('loadSession returns null when no session is saved', () => {
    expect(loadSession()).toBeNull();
  });

  it('saveSession skips storage when serialized session exceeds 5 MB', () => {
    const largeSession: AppSession = {
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'data',
      data: {
        ...makeSampleDataSession(),
        csvData: {
          headers: ['h1'],
          rows: [['x'.repeat(6 * 1024 * 1024)]],
        },
      },
    };
    saveSession(largeSession);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});

function makeValidSession(): AppSession {
  return {
    version: '1',
    savedAt: new Date().toISOString(),
    mode: 'data',
    data: makeSampleDataSession(),
  };
}

describe('isSessionCompatible', () => {
  it('accepts a valid version 1 data session', () => {
    const session: AppSession = {
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'data',
      data: makeSampleDataSession(),
    };
    expect(isSessionCompatible(session)).toBe(true);
  });

  it('accepts a session built by makeValidSession', () => {
    expect(isSessionCompatible(makeValidSession())).toBe(true);
  });

  it('rejects a session missing heatmapColors (would crash TestSidebar)', () => {
    const s = makeValidSession();
    delete (s.data as Record<string, unknown>).heatmapColors;
    expect(isSessionCompatible(s)).toBe(false);
  });

  it('rejects a session with malformed heatmapColors (missing low)', () => {
    const s = makeValidSession();
    (s.data as unknown as { heatmapColors: unknown }).heatmapColors = { mid: '#fff', high: '#000' };
    expect(isSessionCompatible(s)).toBe(false);
  });

  it('rejects a session missing shapeColors', () => {
    const s = makeValidSession();
    delete (s.data as Record<string, unknown>).shapeColors;
    expect(isSessionCompatible(s)).toBe(false);
  });

  it('rejects a session missing enrichmentPlotSettings', () => {
    const s = makeValidSession();
    delete (s.data as Record<string, unknown>).enrichmentPlotSettings;
    expect(isSessionCompatible(s)).toBe(false);
  });

  it('rejects a session missing shapeOpacity', () => {
    const s = makeValidSession();
    delete (s.data as Record<string, unknown>).shapeOpacity;
    expect(isSessionCompatible(s)).toBe(false);
  });

  it('rejects a session missing nameFontSize', () => {
    const s = makeValidSession();
    delete (s.data as Record<string, unknown>).nameFontSize;
    expect(isSessionCompatible(s)).toBe(false);
  });

  it('accepts a session with geneSetMeta null (legitimately nullable field)', () => {
    const s = makeValidSession();
    (s.data as unknown as { geneSetMeta: unknown }).geneSetMeta = null;
    expect(isSessionCompatible(s)).toBe(true);
  });

  it('accepts a session with nameMaxChars null (legitimately nullable field)', () => {
    const s = makeValidSession();
    (s.data as unknown as { nameMaxChars: unknown }).nameMaxChars = null;
    expect(isSessionCompatible(s)).toBe(true);
  });

  it('rejects null session', () => {
    expect(isSessionCompatible(null)).toBe(false);
  });

  it('rejects wrong version', () => {
    const session = {
      version: '2',
      savedAt: new Date().toISOString(),
      mode: 'data',
      data: makeSampleDataSession(),
    } as unknown as AppSession;
    expect(isSessionCompatible(session)).toBe(false);
  });

  it('rejects non-data mode', () => {
    const session = {
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'view',
      data: makeSampleDataSession(),
    } as unknown as AppSession;
    expect(isSessionCompatible(session)).toBe(false);
  });

  it('rejects missing data', () => {
    const session = {
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'data',
    } as unknown as AppSession;
    expect(isSessionCompatible(session)).toBe(false);
  });

  it('rejects malformed csvData', () => {
    const session = {
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'data',
      data: {
        ...makeSampleDataSession(),
        csvData: { headers: 'bad' },
      },
    } as unknown as AppSession;
    expect(isSessionCompatible(session)).toBe(false);
  });
});

describe('session file export/import', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let anchorClicks: string[];
  const originalDocument = globalThis.document;

  beforeEach(() => {
    anchorClicks = [];
    const anchors: HTMLAnchorElement[] = [];
    const mockDocument = {
      createElement: (tagName: string) => {
        if (tagName.toLowerCase() === 'a') {
          const anchor = {
            href: '',
            download: '',
            click: () => { anchorClicks.push(anchor.download); },
          } as unknown as HTMLAnchorElement;
          anchors.push(anchor);
          return anchor;
        }
        return originalDocument?.createElement(tagName) ?? ({} as HTMLElement);
      },
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
    } as unknown as Document;
    vi.stubGlobal('document', mockDocument);

    const mockURL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    } as unknown as typeof URL;
    vi.stubGlobal('URL', mockURL);
    createObjectURLSpy = vi.spyOn(globalThis.URL, 'createObjectURL');
    revokeObjectURLSpy = vi.spyOn(globalThis.URL, 'revokeObjectURL');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exportSessionToFile downloads a timestamped JSON file', () => {
    const session: AppSession = {
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'data',
      data: makeSampleDataSession(),
    };
    exportSessionToFile(session);

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json;charset=utf-8');
    expect(anchorClicks.length).toBe(1);
    expect(anchorClicks[0]).toMatch(/^venn_session_\d{8}_\d{6}\.json$/);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('importSessionFromFile parses a valid session file', async () => {
    const session: AppSession = {
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'data',
      data: makeSampleDataSession(),
    };
    const file = new File([JSON.stringify(session)], 'venn_session.json', { type: 'application/json' });
    const imported = await importSessionFromFile(file);
    expect(imported).toEqual(session);
  });

  it('importSessionFromFile rejects invalid session file', async () => {
    const file = new File([JSON.stringify({ foo: 'bar' })], 'bad.json', { type: 'application/json' });
    await expect(importSessionFromFile(file)).rejects.toThrow('compatible');
  });

  it('importSessionFromFile rejects malformed JSON', async () => {
    const file = new File(['not json'], 'bad.json', { type: 'application/json' });
    await expect(importSessionFromFile(file)).rejects.toThrow(/JSON|Unexpected token/);
  });

  it('round-trip: export then import returns equivalent session', async () => {
    const session: AppSession = {
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'data',
      theme: 'dark',
      data: makeSampleDataSession(),
    };

    let exportedBlob: Blob | null = null;
    createObjectURLSpy.mockImplementation((blob: Blob | MediaSource) => {
      exportedBlob = blob as Blob;
      return 'blob:roundtrip-url';
    });

    exportSessionToFile(session);
    expect(exportedBlob).not.toBeNull();

    const text = await exportedBlob!.text();
    const file = new File([text], 'roundtrip.json', { type: 'application/json' });
    const imported = await importSessionFromFile(file);
    expect(imported).toEqual(session);
  });
});
