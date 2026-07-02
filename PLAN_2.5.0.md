# Venn Diagram Lab v2.5.0 — Megvalósítási terv

**Dátum:** 2026-07-14  
**Célverzió:** 2.5.0 (+0.1 minor bump)  
**Funkciók:** Excel import (.xlsx), session save/restore, Python/R script export  

---

## Korlátozások a felhasználói döntések alapján

1. **Excel import:** csak `.xlsx`, `.xls` nem támogatott.
2. **Session restore:** csak a WelcomeDialog "Restore last session" gombjára; automatikus restore nincs.
3. **Script export:** a forrásfájl neve relatív útként szerepel a generált scriptben.
4. **Session scope:** első körben csak Data mód állapotának mentése; Edit mód session mentése későbbi iteráció.

---

## 1. Excel import (.xlsx)

### Új fájlok
- `packages/core/src/excelParser.ts`
  - `parseExcelFile(buffer: ArrayBuffer, opts?: { sheet?: number | string }): Promise<CsvData>`
  - `listExcelSheets(buffer: ArrayBuffer): Promise<string[]>`
  - Minden cellát stringgé konvertál, üres sorokat kiszűr.
  - Az első nem üres sor a header.

### Módosítandó fájlok
- `packages/core/src/index.ts` — exportáljuk az új függvényeket.
- `src/utils/csvParser.ts` — re-exportáljuk az Excel parsert.
- `src/App.tsx`
  - Fájlfeltöltésnél és URL-importnál detektáljuk az `.xlsx` kiterjesztést.
  - Excel esetén `ArrayBuffer`-ként olvassuk be, meghívjuk `parseExcelFile`-t.
  - A kapott `CsvData`-t átadjuk a `CsvImportDialog`-nak.
- `src/components/CsvImportDialog.tsx`
  - Új prop: `sheetNames?: string[]`, `initialSheet?: string`.
  - Ha több sheet van, sheet selector a dialógus tetején.
  - Delimiter-választó Excelnél rejtve marad.

### UX
- Engedélyezett kiterjesztések: `.xlsx, .csv, .tsv, .txt, .gmt, .gmx`.
- Hibaüzenetek: üres sheet, csak fejléc, >9 oszlop, nem támogatott formátum.
- 50 MB limit, async parsing, progress indicator.
- Lazy load: `exceljs` csak Excel feldolgozáskor töltődjön (`import()`).

---

## 2. Session save/restore

### Új fájlok
- `src/utils/session.ts`
  - `AppSession` interface:
    - `version: string`
    - `savedAt: string`
    - `mode: AppMode`
    - `data?: DataSession` — Data mód állapota
    - `plotSettings?: EnrichmentPlotSettings`
    - `theme?: ThemeMode`
  - `saveSession(session: AppSession): void`
  - `loadSession(): AppSession | null`
  - `clearSession(): void`
  - `isSessionCompatible(session: AppSession): boolean`

### DataSession tartalma
- `csvData: CsvData`
- `filename: string`
- `fileType: 'binary' | 'aggregated'`
- `itemDelimiter: Delimiter`
- `columnMapping: number[]`
- `model: string`
- `shapeColors: Record<string, string>`
- `nameFontSize, nameFontFamily, titleFontSize, titleFontFamily`
- `nameMaxChars: number | null`
- `shapeOpacity`
- `showTitle, showNames, showSums`
- `viewStyle, cutColorMode, upsetColorMode, upsetSortMode, upsetThreshold`
- `networkMetric, networkSigOnly, networkEdgeLabels, networkNodeSizes, networkMinWeight`
- `enrichmentMetric, enrichmentPlotSettings`
- `selectedRegionLabel` (ha egyszerű)

### Módosítandó fájlok
- `src/App.tsx`
  - Új `useEffect`, ami debounced (1 mp) elmenti a Data mód állapotát localStorage-ba.
  - `handleDataClose` törli a session-t.
  - Induláskor nem restore-ol automatikusan.
- `src/components/WelcomeDialog.tsx`
  - Új gomb: "Restore last session" (csak ha van érvényes session).
  - "Start new session" marad az alapértelmezett.

### Korlátok
- localStorage limit: max 5 MB SVG tartalomra; felette figyelmeztetés.
- Csak Data mód; View és Edit mód session mentése később.

---

## 3. Python/R script export

### Új fájlok
- `src/utils/scriptExport.ts`
  - `generatePythonScript(params: ScriptExportParams): string`
  - `generateRScript(params: ScriptExportParams): string`
  - `ScriptExportParams`:
    - `filename: string` (relatív)
    - `fileType: 'binary' | 'aggregated'`
    - `delimiter?: string`
    - `columnMapping: number[]`
    - `setNames: string[]`
    - `model: string`
    - `shapeColors: Record<string, string>`
    - `enrichmentMetric: EnrichmentMetric`
    - `n: number`

### Script tartalom
- Python: `venn-diagram-lab` (`analyzeCsv`, `toVennSvg`, `toUpsetSvg`, `toNetworkSvg`, `toStatisticsTsv`, stb.)
- R: `vennDiagramLab` (`analyze`, `render_venn`, `render_upset`, `render_network`, stb.)
- Tartalmazza a generálás időbélyegét, verziót, forrásfájlt, oszlopokat, modellt, színeket.

### Módosítandó fájlok
- `src/components/TestSidebar.tsx`
  - Export szekcióhoz két új gomb: "Export Python script" és "Export R script".
  - Csak számítás után aktívak.
- `src/App.tsx`
  - Új handler: `handleExportScript(kind: 'python' | 'r')`.
  - `downloadFile()`-lal letölti `.py` / `.R` kiterjesztéssel.
- `src/utils/exportData.ts` — re-exportáljuk a generátorokat.

---

## Közös infrastruktúra

- `CsvImportResult` kibővül: `sourceFormat?: 'csv' | 'excel' | 'gmt' | 'gmx' | 'paste' | 'url'`
- Verzióemelés: 2.4.1 → 2.5.0 minden érintett csomagban:
  - `src/version.ts`
  - `package.json`
  - `packages/core/package.json`
  - `packages/node/package.json`
- `CHANGELOG.md` új bejegyzés.

---

## Tesztelési terv

- `packages/core/src/__tests__/excelParser.test.ts` — binary/aggregated minta, több sheet, üres sheet, >9 oszlop.
- `src/__tests__/session.test.ts` — serialize/deserialize, verzió-inkompatibilitás.
- `src/__tests__/scriptExport.test.ts` — generált script tartalma.
- Integrációs teszt: `.xlsx` feltöltése → Data mode működik.
- `npm test` és `npm run build` zöld marad.

---

## Ütemezés

| Fázis | Funkció | Becsült idő |
|-------|---------|-------------|
| 1 | Excel parser core + tesztek | 3–4 óra |
| 2 | Excel upload/URL integráció + UI | 3–4 óra |
| 3 | Session save/restore | 4–5 óra |
| 4 | Python/R script export | 3–4 óra |
| 5 | Verzióbump, CHANGELOG, végső tesztek | 2–3 óra |

Összesen: **15–20 óra**.
