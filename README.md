# Venn Diagram

Venn diagramok készítése, szerkesztése és adatokkal való vizuális bemutatása.

## Tartalom

- **publications/** — Venn diagram kutatási publikációk (R `venn` package)
- **models/** — SVG Venn diagram modellek (2-7 set)
- **samples/** — Minta diagramok (SVG/PNG, 4-8 set)
- **test/** — Generált teszt SVG fájlok (Edwards és standard Venn, 2-7 set)
- **editor/** — Interaktív SVG Venn diagram szerkesztő (React + TypeScript + Vite)

## Python szkriptek

- `generate_tests.py` — Teszt SVG fájlok generálása
- `normalize_after_illustrator.py` — SVG normalizálás Illustrator export után
- `unify_svgs.py` — SVG fájlok egységesítése
- `center_texts.py` — Szöveg centrálás SVG-kben
- `transform_7setc.py` — 7-set Venn diagram transzformáció
- `fix_edwards_shapes.py` — Edwards Venn diagram alakzatok javítása

## Editor

A `editor/` mappában egy React + TypeScript + Vite alapú interaktív SVG Venn diagram szerkesztő található.

```bash
cd editor
npm install
npm run dev
```

## Szerző

Zoltán Dul
