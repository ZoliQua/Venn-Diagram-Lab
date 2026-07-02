import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CsvData } from '../utils/csvParser.ts';
import type { AppSession, DataSession } from '../utils/session.ts';
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
    originalColumns: [0, 1, 2],
    geneSetMeta: null,
    model: 'venn-3-set.svg',
    calculated: true,
    vennResult: {
      inclusive: { A: 2, B: 2, C: 2, AB: 1, AC: 1, BC: 1, ABC: 0 },
      exclusive: { A: 1, B: 1, C: 1, AB: 1, AC: 1, BC: 1, ABC: 0 },
      inclusiveItems: { A: ['x'], B: ['y'], C: ['z'], AB: ['w'], AC: ['v'], BC: ['u'], ABC: [] },
      exclusiveItems: { A: ['x'], B: ['y'], C: ['z'], AB: ['w'], AC: ['v'], BC: ['u'], ABC: [] },
      totalUniqueItems: 6,
    },
    exclusiveItems: { A: ['x'], B: ['y'], C: ['z'] },
    inclusiveItems: { A: ['x'], B: ['y'], C: ['z'], AB: ['w'] },
    error: null,
    showTitle: true,
    showNames: true,
    showSums: true,
    nameFontSize: 24,
    nameFontFamily: 'Tahoma',
    titleFontSize: 24,
    titleFontFamily: 'Tahoma',
    nameMaxChars: null,
    shapeOpacity: 0.2,
    shapeColors: { A: '#FFF200', B: '#2E3192', C: '#ED1C24' },
    viewStyle: 'layer',
    cutColorMode: 'depth',
    heatmapColors: { low: '#2166AC', mid: '#F7F7F7', high: '#B2182B' },
    heatmapLegendPosition: 'bottom-left',
    upsetColorMode: 'depth',
    upsetSortMode: 'size',
    upsetThreshold: 0,
    upsetCustomColor: '#4a90d9',
    networkMetric: 'intersection',
    networkSigOnly: false,
    networkEdgeLabels: true,
    networkNodeSizes: true,
    networkMinWeight: 0,
    networkMoveNodes: true,
    plotBackground: 'dark',
    dataMoveNames: false,
    dataMoveNumbers: false,
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
  };
}

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
