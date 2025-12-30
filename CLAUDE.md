# CLAUDE.md — 2-venn-diagram

## Projekt célja

React Venn Diagram Modifier — Venn diagramok megtekintése, szerkesztése és adatokkal való vizuális bemutatása. 32 SVG modell (2–8 set), interaktív viewer régió detektálással, és SVG editor.

## Strict Rules

### 1. Tudományos alaposság
- **NEM hallucinálok adatokat.** Ha nem vagyok biztos → jelzem és visszakérdezek.
- **Mindig visszakérdezek** ha bizonytalan vagyok egy döntésben.
- **Először terv, aztán végrehajtás.** Nem-triviális módosítás előtt tervet írok.
- **Mindent ellenőrzök.** Mielőtt hivatkoznék egy fájlra, beolvasom.
- **Teszteket írok és futtatom.** Ami DONE az tesztelt és működik.
- **Nem írok placeholder/stub kódot.**

### 2. Commit szabályok
- Minden commit kizárólag a felhasználó (Zoltán Dul) nevében megy.
- Claude NEM szerepel co-author-ként a commitokban.
- Csak kérésre commitolok.

### 3. Verzió követés
- **Szigorú szemantikus verzionálás (SemVer).**
- Nagyobb módosítás (új funkció, UI változás): **+0.1** verzió ugrás (pl. 1.0.0 → 1.1.0)
- Minimál módosítás (bugfix, szöveg javítás): **+0.0.1** verzió ugrás (pl. 1.0.0 → 1.0.1)
- A verzió a `src/version.ts` fájlban van, minden commit előtt frissíteni kell.
- A `CHANGELOG.md` fájlba be kell jegyezni a változásokat.

### 4. Kód minőség
- Nem "javítok" kódot amit nem olvastam el.
- Nem terjeszkedem ok nélkül.

## Mappa struktúra

```
2-venn-diagram/
├── src/                   React + TypeScript forrás
│   ├── App.tsx            Fő komponens (View/Edit/Summary módok)
│   ├── components/        UI komponensek
│   ├── hooks/             React hookok
│   ├── parser/            SVG parser/serializer
│   ├── utils/             Segéd modulok
│   ├── models.ts          Modell katalógus + fetch
│   └── version.ts         Verzió szám
├── models/
│   ├── svg/               32 SVG Venn diagram modell
│   └── json/              32 JSON régió adat (pre-computed paths)
├── publications/          Kutatási publikációk (PDF)
├── public/                Statikus fájlok
├── *.py                   Python szkriptek
├── CHANGELOG.md           Verzió történet
├── VENN_PROJECT.md        Standard szín mapping
├── package.json           Node projekt
├── vite.config.ts         Vite konfiguráció
└── index.html             HTML belépési pont
```
