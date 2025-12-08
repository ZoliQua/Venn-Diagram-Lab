# CLAUDE.md — 2-venn-diagram

## Projekt célja

Venn diagramok készítése, szerkesztése és adatokkal való vizuális bemutatása. Ez a mappa a Venn diagram kutatási publikációkat, SVG modelleket, Python feldolgozó szkripteket és egy React+TypeScript editort tartalmaz.

## Strict Rules

### 1. Tudományos alaposság
- **NEM hallucinálok adatokat.** Nem találok ki adatokat, fájlneveket, struktúrákat vagy bármilyen információt. Ha nem vagyok biztos → jelzem és visszakérdezek.
- **Mindig visszakérdezek** ha bizonytalan vagyok egy döntésben, megközelítésben vagy ha a kérés nem egyértelmű.
- **Először terv, aztán végrehajtás.** Minden nem-triviális módosítás előtt tervet írok és jóváhagyást kérek.
- **Mindent ellenőrzök.** Mielőtt hivatkoznék egy fájlra, struktúrára vagy adatra, beolvasom és ellenőrzöm.
- **Teszteket írok és futtatom.** Minden módosítást tesztelek mielőtt átadom. Ami DONE az tesztelt és működik.
- **Nem írok placeholder/stub kódot.** Ha valamit nem tudok befejezni, jelzem az okkal együtt.

### 2. Commit szabályok
- Minden commit kizárólag a felhasználó (Zoltán Dul) nevében megy.
- Claude NEM szerepel co-author-ként a commitokban.
- Csak kérésre commitolok.

### 3. Kód minőség
- Nem "javítok" kódot amit nem olvastam el.
- Nem terjeszkedem ok nélkül — nem adok hozzá funkciókat indoklás nélkül.

## Mappa struktúra

```
2-venn-diagram/
├── publications/          Venn diagram kutatási publikációk (R package tarballs)
├── models/                SVG Venn diagram modellek
│   └── archive/           Archivált SVG modellek (7-set variációk)
├── samples/               Minta SVG/PNG diagramok (4-8 set)
├── test/                  Generált teszt SVG fájlok (edwards és standard Venn, 2-7 set)
├── editor/                React + TypeScript + Vite SVG Venn diagram szerkesztő
├── *.py                   Python szkriptek (SVG normalizálás, transzformáció, teszt generálás)
├── VENN-INFO.md           Referencia linkek és inspiráció források
└── .gitignore
```
