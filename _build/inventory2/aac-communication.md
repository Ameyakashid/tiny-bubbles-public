# Inventory: AAC / Communication Boards (Tiny Bubbles v2)

Category: **AAC / augmentative communication / PECS / symbol boards**
Scope reminder: Kid app needs AAC/communication boards as an evidence-based autism support (tap-symbol-to-speak, PECS exchange, categorized vocabulary, TTS). Prefer MIT/Apache/BSD to *ship*; record GPL/AGPL/unlicensed as **reference-only** (do not ship their code) but mine them for symbol sets + UX.

Cloned into: `/Users/ameyakashid/Desktop/adhd india/_sources2`

---

## SHIPPABLE (permissive license — cloned to `_sources2`)

### 1. aac-native — **MIT** ⭐ primary pick
- Repo: https://github.com/btk/aac-native
- Local: `/Users/ameyakashid/Desktop/adhd india/_sources2/aac-native`
- License: **MIT** (`LICENSE`, Copyright 2020 Burak Tokak)
- Tech: **Expo + React Native** (JS, Expo SDK 37 — old but same family as our target SDK 56), `expo-speech` TTS, `expo-av`, `react-native-svg`, `react-navigation`, `react-native-storage` (AsyncStorage).
- What it is: This is the open-source **"Leeloo"** AAC app (published as `org.dreamoriented.leeloo` on Play Store). PECS-based symbol communication board for autistic / non-verbal kids. 158 bundled PNG symbols, 9 languages, category groups, TTS speak-bar, first-run setup wizard.
- Stars: 40. Last push: 2023. Not archived.

### 2. openboardformat — **MIT**
- Repo: https://github.com/open-aac/openboardformat
- Local: `/Users/ameyakashid/Desktop/adhd india/_sources2/openboardformat`
- License: **MIT** (`LICENSE`, Copyright 2020 OpenAAC)
- Tech: Ruby on Rails (the docs/reference website). NOTE: the *code* is Ruby (not reusable in RN); the value is the **`.obf` / `.obz` Open Board Format spec** — the de-facto open interchange format for AAC boards (used by CoughDrop, cboard, AsTeRICS Grid, etc.). MIT-licensed so we can implement/import the format freely.
- Use: reference for a board data schema (buttons, grid, images, sounds, load_board links) if we want import/export interop.

### 3. OpenAAC-flutter — **Apache-2.0**
- Repo: https://github.com/RonanOD/OpenAAC
- Local: `/Users/ameyakashid/Desktop/adhd india/_sources2/OpenAAC-flutter`
- License: **Apache-2.0** (`LICENSE`)
- Tech: **Flutter/Dart** app (`app/open_aac`) + `db/` Python tooling. Not RN — reference only in practice, but permissively licensed.
- What it is: Modern (2024, shipped on App Store) AAC app whose novelty is **AI symbol matching**: it embeds a symbol library into a vector DB (Pinecone) and matches free text/speech → the closest AAC pictogram, falling back to DALL-E 3 image generation when no good match. Uses OpenAI today; the *pattern* (text→symbol via embeddings) is a useful reference for a Gemini-Flash-powered "suggest a symbol" helper.
- Stars: 32.

### (bonus) speakeasy-aac — **MIT** *(present in `_sources2`, cloned by a parallel task)*
- Repo: SpeakEasy AAC (MIT, `LICENSE` Copyright 2024 SpeakEasy AAC Contributors)
- Local: `/Users/ameyakashid/Desktop/adhd india/_sources2/speakeasy-aac`
- Tech: **Vite + React + TypeScript + Tailwind** (web). Modern TS AAC board — good TS component/state reference even though it's web, not RN. Listed here for completeness since it landed in `_sources2`; not cloned by this task.

---

## REFERENCE-ONLY (copyleft or no license — DO NOT ship their code)

| Repo | License | Why reference-only | What to mine |
|---|---|---|---|
| https://github.com/cboard-org/cboard | **GPL-3.0** | Copyleft | Flagship web AAC (740★, actively maintained). Best-in-class **UX**: category color-coding, board builder, `.obf` import, TTS, 40 languages, ARASAAC/Mulberry symbol integration, symbol search. Study interaction/IA patterns, not code. |
| https://github.com/otsimo-archive/aac | **AGPL-3.0** | Strong copyleft (archived 2021) | React Native PECS app for autistic kids. UX reference for phrase-building by tapping words. |
| https://github.com/open-aac/sweet-suite-aac | **AGPL-3.0** | Strong copyleft | Web AAC suite (successor-ish to CoughDrop tooling). Board/activity support patterns. |
| https://github.com/bcarter/coughdrop | **AGPL-3.0** | Strong copyleft | **CoughDrop** — origin of the Open Board Format. Reference for board data model + speech-sequencing UX. |
| https://github.com/AntVo/AAC-Autism-App | **No license** (all rights reserved) | No license grant = cannot copy | React Native AAC board. UX skim only. |
| https://github.com/jgawrylkowicz/aac | **No license** | No license grant | Ionic tablet AAC for complex communication needs. UX skim only. |
| https://github.com/open-aac/opensymbols | **No license** | No license grant | Rails server + **OpenSymbols API** aggregating ~60k open-licensed symbols across libraries. Use the *hosted API / symbol libraries*, not the code. |

### Symbol sets (assets, not apps) — evaluate license per-asset
- **Mulberry Symbols** — https://github.com/mulberrysymbols/mulberry-symbols — **CC BY-SA** (repo LICENSE = "liberal Creative Commons", GitHub detects NOASSERTION). ~3,000 **SVG** symbols. Commercial use OK with **attribution + share-alike** on derivatives. Reference-only as a code repo; usable as an asset set if we honor CC BY-SA.
- **ARASAAC** — **CC BY-NC-SA** → **NON-COMMERCIAL**; do NOT use if Tiny Bubbles is commercial. ~13k colorful symbols. Reference only.
- **Sclera** — **CC BY-NC** → non-commercial. High-contrast. Reference only.
- **OpenSymbols API** (open-aac) — aggregates the above + others; each result carries its own license — filter to CC-BY / public-domain when pulling for a shippable set.

---

## Reusable for Tiny Bubbles v2 (concrete pointers)

**Primary source = `aac-native` (MIT, Expo/RN).** Directly adaptable to Expo SDK 56 / RN / TS:

- **Symbol assets (drop-in, MIT):** `aac-native/data/images/` — 158 categorized PNG symbols (feelings: happy/sad/angry/afraid/frustrated/exhausted…; food; people/family; activities; school; numbers; core words: yes/no/help/more/toilet/water). Registry map at `aac-native/js/assets.js` (`name → require('../data/images/x.png')`). These map cleanly onto our **emotion / zones-of-regulation** and **first-then** features too.
- **Board data schema + i18n (drop-in, MIT):** `aac-native/data/languages/card_en.json` (+ de/el/es/fr/pa/pl/ro/tr). JSON board model: `{ type:"group"|"card", title, slug, parents:[], color }` — a simple, RN-friendly hierarchical board format we can adopt instead of full `.obf`. UI strings in `aac-native/data/text.json`.
- **TTS / speak-bar pattern (MIT):** `aac-native/api.js` — uses `expo-speech` + `expo-localization` + `react-native-storage`(AsyncStorage) persistence. `expo-speech` is the exact TTS approach we want for the kid app.
- **Screens/components to port (MIT):**
  - `aac-native/layouts/` — `groups.js` (category grid), `cards.js` (symbol grid within a category), `search.js`, `setup.js`, `setting.js`.
  - `aac-native/components/` — `card.js` (tappable symbol tile), `speaking.js` (sentence/speak strip), `announcer.js` + `announcerButton.js`, `tabbar.js`, `swipeable-bottom/`, `touchable-scale/` (press feedback), `setup/setup-*.js` (onboarding wizard), `settings/` (`pack.js`, `user.js`, `add.js` for custom cards).
  - `aac-native/js/` — `language.js`, `makeid.js`, `event.js` (lightweight event bus).
  - Note: bump the old Expo 37 APIs (AsyncStorage import, `react-navigation` v3, expo-av) to SDK 56 equivalents; treat as pattern/asset source, not a plug-in.

**Interop:** implement `.obf`/`.obz` import via the **openboardformat** (MIT) spec if we want compatibility with cboard/CoughDrop boards families export.

**AI helper reference:** **OpenAAC-flutter** (Apache-2.0) text→symbol-via-embeddings pattern — reference for a future Bloop/Gemini "find me the symbol for ___" feature.

**Symbols to expand the set:** pull additional CC-BY / public-domain symbols via the OpenSymbols API; keep Mulberry only if we honor CC BY-SA; avoid ARASAAC/Sclera (non-commercial) for a shipping build.
