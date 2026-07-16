# Workstream w4 — AAC Communication Board

*Durable, buildable spec. Authored 2026-07-09. Owner surface: `apps/kid` (renderer + on-device store) +
`packages/shared` (the Symbol/Board primitive + `.obf` import) + Firestore schema (parent-authored boards sync
down). Feature-matrix rows: **A1** (AAC communication board, `strong`), **A11** (AAC beyond requesting, later).
This workstream also **owns the shared `Symbol`/`Board` primitive** that w-schedules (A2), w-first-then (A3) and
choice/token boards consume — those workstreams constrain it; they do not redefine it.*

Authoritative inputs (read, verified in-repo):
`_build/research2/00-SYNTHESIS2.md` §1.1/§5.1, `_build/research2/01-v2-feature-matrix.md` §A (A1/A11),
`_build/inventory2/aac-communication.md`, `_build/spec2/01-current-and-target.md` §1/§3/§4B,
v1 spec `_build/spec/02-architecture.md`. Donor code under `/Users/ameyakashid/Desktop/adhd india/_sources2/`.
Shipped app verified at `/Users/ameyakashid/Desktop/adhd india/tiny-bubbles/` (Expo SDK 56 / RN 0.85.3 /
React 19.2.3 / TS 6.0.3 / zustand 5.0.14 / NativeWind 4.2.6, `SCHEMA_VERSION = 1`, `MIGRATIONS = []`).
Post-migration paths are under `apps/kid/` (was `tiny-bubbles/`); relative-import behaviour is unchanged
(current-and-target §2.1). Mind the SPACE in every absolute path.

> ## Locked decisions this workstream implements (do NOT relitigate)
> - AAC is the **single highest-value autism feature and the accessibility keystone**. It is a **voice, not a
>   chore**: AAC taps **never** fire the token/celebration/reward loop and are **never** premium-gated.
> - The **`speakeasy-aac` `Symbol`/`Board` TS primitive** (MIT) is the one model behind AAC + choice + first-then
>   + schedules. Adopt it in `packages/shared`; adapt web→RN + offline + Firestore + provenance.
> - **Grid board + sentence bar + TTS (`expo-speech`)**, core-word + fringe vocab, category folders, **offline**,
>   reachable in **≤1 tap from anywhere**.
> - Ship a **CLEARED CC-BY / CC0 / public-domain / original symbol set**. **EXCLUDE ARASAAC (CC-BY-NC-SA) and
>   Sclera (CC-BY-NC)** — non-commercial. Enforced by a build-time provenance test.
> - **`.obf` import** (Open Board Format, MIT spec) for cboard/CoughDrop interop.
> - **NEVER promise speech gains.** AAC is strong EBP for *communication access*; the copy gate forbids
>   speech-gain / cure claims.
> - Works fully with **network + LLM OFF**. The only LLM touch is the LATER A11 "suggest a symbol" helper
>   (premium, parent-gated, behind the Bloop proxy) — AAC never depends on it.

> ## ⟦v2 FINAL reconciliation — `02-architecture.md` §8 OVERRIDES this §3 (§8 #33)⟧
> - **ONE symbol manifest, ONE path, ONE format: `apps/kid/assets/symbols/manifest.json` (JSON)** (§8 #22). The
>   `src/data/aacSymbolManifest.ts` module + `assets/aac/symbols/` paths in §4 are **replaced** by
>   `assets/symbols/` + `manifest.json`. The w8 gate (`assertSymbolManifestClean` + `symbol-license.test.ts`) and
>   the BUILD-GUIDE §3.1 grep all target that ONE file, plus a **completeness assertion** (every file under
>   `assets/symbols/` MUST have a clean manifest row — an NC/renamed asset cannot slip through).
> - **`SymbolLicense` + `SymbolAssetManifestEntry` are OWNED by `compliance/symbolLicense.ts` (w8, ship-gate
>   authority)** — w4's `aac/types.ts` **imports/extends** it, does NOT re-declare (§8 #22). `user`/`unknown`
>   model **never-ship** (personal `.obf`/custom-tile import only, on-device).
> - **The cleared symbol set is a `[HUMAN]` art deliverable** (like w7's `.riv`): M4.1 ships a **small original/
>   placeholder set** (generated via `speakeasy-aac/scripts/generatePlaceholderSymbols.js`) + its manifest rows so
>   the renderer + gate go green NON-vacuously; the final cleared **Mulberry-CC-BY-SA-with-attribution** (any
>   recolored/tinted Mulberry derivative is re-published CC-BY-SA, or prefer CC0/original to avoid share-alike) /
>   CC0 / original art lands before ship (SHIP-GATE license-reviewer row).
> - **Parent-app AAC board authoring** is `apps/parent/app/(authoring)/board-builder.tsx`, built in **w5's
>   authoring cluster (M4.2)** — NOT the phantom "w-parent-authoring". §8.1 below is corrected.
> - **Copy gate bans the near-miss speech claims too** (§8 #23): `may (increase|improve|help).*speech`, `does not
>   inhibit speech`, `talk more` — only neutral "communication access" ships; the Pope-2024 "does not suppress
>   speech" reassurance stays in CITED-EVIDENCE, never in shippable copy.

---

## 1. Overview, user value, and VERIFIED evidence

### 1.1 What it is / user value
A tap-a-symbol-to-speak augmentative & alternative communication board that gives a **non-speaking or
minimally-verbal** autistic (and/or ADHD) child a **voice** on a device the family already owns. The child taps
picture tiles; each tile appends a word to a **sentence bar** and/or speaks immediately via device TTS; the
"speak" button voices the assembled utterance. Vocabulary is organised as **core words** (high-frequency,
fixed-position, on every board) plus **fringe** nouns/verbs in **category folders**. Parents author and extend
boards in the Parent app (the `board-builder` in w5's authoring cluster, M4.2); the child app renders them
**offline** and reachable in **≤1 tap from anywhere in the kid shell**.

Market white space this fills (`market-teardown.md` §A/§G3): premium AAC (Proloquo2Go, TouchChat, LAMP) is
**\$249–\$300 and iOS-only**. Cross-platform (Expo → Android+iOS from day one) + affordable + multilingual +
**AAC free (never paywalled)** is wide open.

### 1.2 Evidence (cited honestly)
- **AAC = strong evidence, named EBP.** Augmentative & Alternative Communication is a named NCAEP/EBP
  (Steinbrenner et al. 2020; Hume et al. 2021). Adding aided AAC to naturalistic intervention produced **very
  large language gains (Tau-U 0.85)** and **AAC does NOT suppress speech and may increase it** (Pope, Light &
  Laubscher 2024, *J Autism Dev Disord* 55(9):3078–3099, DOI 10.1007/s10803-024-06382-7). PECS meta-analysis
  (Flippin 2010) confirms **communication gains but null speech gains**.
- **The honest claim:** promise **communication access**; reassure parents AAC does not inhibit speech. **Never
  promise speech gains, "learning to talk", or cure** (hard copy-gate rule §6.3). Stand on the *practice*, not
  the *product* — the app is a scaffold/tool, not therapy.
- **Design targets grounded in evidence:** ~**200–400 core words ≈ 80% of daily communication** (AssistiveWare
  Crescendo); **core-word position consistency** supports motor planning (do not usage-reorder core tiles);
  **build beyond "I want"** — commenting/social language is the documented under-served gap (A11, later).
- **Weak-evidence flags:** none in the AAC core (it is `strong`). The A11 "suggest a symbol" LLM helper is an
  *un-evidenced convenience*, explicitly optional and off by default — never framed as a communication benefit.

---

## 2. UX behaviour — screen by screen

**Golden rule (v1 invariant, enforced):** no component reads raw `ageMode`/`neuroProfile`/`sensoryMode`. AAC
presentation is produced by a dedicated resolver **`resolveAacPresentation`** (§2.1). Every symbol carries a
**required `spokenLabel`** so a non-reader runs the whole surface via TTS.

### 2.0 Entry point — "Talk" is always ≤1 tap away
A persistent **`AacQuickAccess`** affordance (a large speech-bubble tile) is mounted in the kid shell chrome
(`app/(kid)/_layout.tsx`) so from **any** kid screen one tap opens `app/(kid)/talk.tsx`. It is **not** gated by
premium, not behind the parent gate, never hidden by low-stim mode (it may only shrink/mute animation). This
directly answers the keystone requirement: *reachable in ≤1 tap from anywhere, offline.*

### 2.1 The AAC board screen (`app/(kid)/talk.tsx`)
Top-to-bottom layout:
1. **Sentence bar** (`SentenceBar.tsx`) — a horizontal strip of the tiles tapped so far (mini image + label).
   Controls: **Speak** (voices the whole utterance via `speak()`), **Backspace** (remove last), **Clear** (empty
   the bar). The bar is **in-memory only** — cleared on Speak (configurable) and never persisted (an utterance is
   ephemeral speech, not a record). No token, no confetti, no score — communicating is not a task.
2. **Folder breadcrumb / Home / Back** (`AacFolderCrumbs.tsx`) — shows the current board name + a Home tile and a
   Back tile when inside a category (`navigationStack`). Core words remain visible in a pinned region on every
   board (core-word consistency).
3. **Symbol grid** (`AacBoardGrid.tsx`) — an RN `FlatList` with `numColumns = GRID_DIMENSIONS[gridSize]`. Each
   cell is a **`SymbolTile.tsx`** (image/photo/emoji + label + category `backgroundColor`, press-scale feedback).
   - Tap a **word tile** → append to sentence bar; if `speakOnTap` (resolved) also speak that single word.
   - Tap a **category tile** (`isCategory`) → `navigateToCategory` drills into the sub-board (folder).

### 2.1a `resolveAacPresentation({ ageMode, neuroProfile, sensoryMode })` → `AacPresentation`
The single place age/neuro/sensory differences are turned into flags (pattern mirrors
`src/theme/resolveMoodCheckin.ts` / `resolveCelebration.ts`). **AAC is EXEMPT from the curated-autonomy 3/6
`maxChoices` cap** — you cannot cap a *vocabulary*; grid density is an accessibility/motor decision, not a
choice menu. Resolved fields:

| Field | young | older / preteen | autism override | ADHD override |
|---|---|---|---|---|
| `gridSize` | `3x3` (bigger tiles, motor-friendly) | `4x4`→`6x6` (parent-set per board, capped by this) | keep smaller/stable | may allow denser |
| `stablePositions` | `true` | `true` | **`true` (never usage-reorder)** | `true` (core stays stable; fringe may reorder if parent opts in) |
| `speakOnTap` | `true` | `true` (mutable) | `true` | `true` |
| `tileScale` | large | medium | large | medium |
| `showLabels` | `true` (label under image) | `true` | `true` | `true` |
| `fitzgeraldColors` | optional | optional | on (predictable colour-coding) | on |
| `celebrateUtterance` | **`false` always** | **`false` always** | `false` | `false` |
| `animationIntensity` | from `sensoryMode` (lowStim → minimal) | from `sensoryMode` | forced minimal | brighter allowed |

`neuroProfile` **autism** default = predictable, stable-position, low-stim, minimal animation; **ADHD** =
brighter feedback allowed but the **core word grid stays positionally stable** (motor planning is a hard AAC
principle regardless of profile). `sensoryMode: lowStim` (and OS Reduce-Motion) force `animationIntensity`
minimal. **`celebrateUtterance` is hard-`false` in all branches** — the anti-shame/evidence rule that AAC is a
voice, not a reward loop.

### 2.2 Custom tile creation (parent-gated, on-device-only)
"Add a tile" is reachable via the parent gate (`src/services/parentGate.ts`) — a bottom sheet
(`AddCustomTileSheet.tsx`): pick a **photo** (`expo-image-picker`) and/or **record audio** (`expo-audio`) and
type a `spokenLabel`. The image/audio is written to a **`file://` on-device URI** and stored as
`AacSymbol.pictureUri` / `audioUri`. **Custom child photos/recordings are NEVER uploaded, synced, or analysed**
(carries v1's `photoVerify` invariant verbatim — COPPA §6). They live only in `tb/boards` and the local backup.

### 2.3 `.obf` import (parent-gated)
Import a single-board `.obf` (JSON) file via `expo-document-picker`/share intent → `parseObf()` maps it to an
`AacBoard` + `AacSymbol[]`, imported symbols flagged `provenance.license = "unknown"` (personal import is fine;
only the **bundled default set** must be cleared — see §6.1). `.obz` (zipped multi-board + assets) is deferred
(needs a zip dependency).

### 2.4 Low-stim / predictability specifics
- No auto-advance, no surprise re-layout, no motion on the board when `lowStim`/Reduce-Motion.
- The board's look, tile positions, and voice never change unexpectedly (autism predictability invariant,
  synthesis §3.3 rule 5). A parent adding vocab appends; it never reshuffles the child's learned positions.
- The "**I need a break**" core tile is present on the home board and deep-links to the calm/break surface
  (w-sensory, A5) — turning a would-be meltdown into a communicative request (the single most therapeutically
  valuable use, synthesis §1.1.5). Cross-workstream link only; the break UI is not owned here.

---

## 3. Data model (exact TS)

### 3.1 The shared Symbol/Board primitive — `packages/shared/src/aac/types.ts`
Adopted from `speakeasy-aac/src/types/index.ts` (MIT), adapted for RN (asset key / `file://` instead of web
`imageUrl`), offline TTS (required `spokenLabel`), Firestore (epoch-ms timestamps, not `Date`), and provenance.

```ts
import type { EpochMs } from "@tiny-bubbles/shared/domain/types"; // reuse v1 EpochMs

export type GridSize = "2x2" | "3x3" | "4x4" | "5x5" | "6x6" | "8x8";
export const GRID_DIMENSIONS: Record<GridSize, number> = {
  "2x2": 2, "3x3": 3, "4x4": 4, "5x5": 5, "6x6": 6, "8x8": 8,
};

/** Which use-case a board serves; constrains gridSize/behaviour for the consumers. */
export type BoardKind = "aac" | "choice" | "firstThen" | "schedule";

/** Optional Fitzgerald-key part of speech for consistent colour-coding. */
export type PartOfSpeech =
  | "pronoun" | "verb" | "adjective" | "noun" | "social" | "question"
  | "negation" | "preposition" | "determiner" | "other";

/** CANONICAL SymbolLicense lives in @tiny-bubbles/shared/compliance/symbolLicense.ts (w8, ship-gate
 *  authority — §8 #22). Import it; extend locally only with the NON-SHIPPING import markers.
 *  "user"/"unknown" model a PARENT'S personal .obf/custom import (on-device only, NEVER shipped;
 *  the completeness gate forbids them in the bundled manifest). Do NOT re-declare the shared union. */
import type { SymbolLicense as ClearedSymbolLicense } from "@tiny-bubbles/shared/compliance/symbolLicense";
export type SymbolLicense = ClearedSymbolLicense | "user" | "unknown";

export interface SymbolProvenance {
  /** e.g. "mulberry" | "original-tinybubbles" | "obf-import" | "user" */
  source: string;
  license: SymbolLicense;
  /** required when license is CC-BY / CC-BY-SA (attribution + share-alike) */
  attribution?: string;
}

export interface AacSymbol {
  id: string;
  /** display text (shown under the image when showLabels) */
  label: string;
  /** REQUIRED TTS string — the v1 non-reader invariant (VisualLabel.spokenLabel) */
  spokenLabel: string;
  // image source — the renderer resolves the first present, in this order:
  /** key into the bundled cleared-set require() map (src/data/aacAssets.ts) */
  assetKey?: string;
  /** on-device custom photo file:// URI (NEVER uploaded/analysed — COPPA §6) */
  pictureUri?: string;
  /** unicode fallback glyph */
  emoji?: string;
  /** icon-set name fallback (last resort) */
  icon?: string;
  /** optional on-device custom recording file:// URI (played instead of TTS) */
  audioUri?: string;
  /** category colour-coding (hex) */
  backgroundColor: string;
  /** logical category / folder slug */
  category: string;
  /** true => tapping navigates to a sub-board (folder), does not speak */
  isCategory: boolean;
  /** core vocabulary (fixed position, on every board) vs fringe */
  isCore: boolean;
  /** user/parent-authored vs seeded */
  isCustom: boolean;
  partOfSpeech?: PartOfSpeech;
  provenance: SymbolProvenance;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export interface AacBoard {
  id: string;
  name: string;
  /** folder tree parent; null = a home/root board */
  parentId: string | null;
  kind: BoardKind;
  /** ordered symbol ids rendered in the grid (order = motor-planning layout) */
  symbolIds: string[];
  gridSize: GridSize;
  backgroundColor?: string;
  isDefault: boolean;
  sortOrder: number;
  /** BCP-47 locale for i18n vocab (reuse v1 src/i18n locale codes) */
  locale: string;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

/** One item in the transient sentence bar (in-memory only, never persisted). */
export interface UtteranceItem {
  symbolId: string;
  spokenLabel: string;
  assetKey?: string;
  pictureUri?: string;
  emoji?: string;
}
```

### 3.2 On-device store — `apps/kid/src/state/boardStore.ts` (persisted `tb/boards`)
Follows the shipped standalone-store pattern **exactly** (`src/state/planStore.ts` / `questStore.ts`): a
`create(persist(...))` store keyed at `tb/boards` via `createTbPersistOptions` + `registerPersistedStore`, with
**per-child maps** inside. Navigation + the sentence bar are **runtime-only** and `partialize`d OUT of
persistence (same discipline as the in-memory `focusSessionStore`).

```ts
interface BoardStoreState {
  // PERSISTED (partialized in):
  symbols: Record<string /*childId*/, Record<string /*symbolId*/, AacSymbol>>;
  boards:  Record<string /*childId*/, Record<string /*boardId*/, AacBoard>>;

  // RUNTIME ONLY (partialized OUT):
  currentBoardId: string | null;
  navigationStack: string[];      // folder drill-down (ported from boardStore.ts)
  utterance: UtteranceItem[];     // the sentence bar

  // board CRUD (parent-authored, and custom-tile add):
  upsertSymbol: (cid: string, s: AacSymbol) => void;
  upsertBoard:  (cid: string, b: AacBoard) => void;
  removeSymbol: (cid: string, symbolId: string) => void;
  // navigation (ported 1:1 from speakeasy boardStore.ts):
  loadBoard: (cid: string, boardId: string) => void;
  navigateToBoard: (cid: string, boardId: string) => void;
  navigateToCategory: (cid: string, categorySymbolId: string) => void;
  goBack: () => void;
  goHome: (cid: string) => void;
  canGoBack: () => boolean;
  // sentence bar:
  appendToUtterance: (item: UtteranceItem) => void;
  backspaceUtterance: () => void;
  clearUtterance: () => void;
  // lifecycle (mirrors planStore.clearChild — wired into wipe/removeChild §4):
  seedChild: (cid: string) => void;  // idempotent: install cleared default set if empty
  clearChild: (cid: string) => void;
}
```

- **Seeding:** `seedChild` installs the cleared default board set (`packages/shared/src/aac/defaultBoards.ts`)
  the first time a child has no boards (idempotent, like v1 `createChildWithSeed`).
- **Backup:** `tb/boards` is auto-covered by `src/services/backup.ts#collectTbSlices()` (whole-`tb/`-keyspace
  `getAllKeys` enumeration) — no change needed there.
- **`DataReview` count:** add a boards/symbols count to the parent Data Review screen
  (`app/(parent)/settings.tsx` DataReview) for COPPA transparency (§6).

### 3.3 Additive persistence / migration
- **`SCHEMA_VERSION` stays `1`; `MIGRATIONS` stays `[]`.** `tb/boards` is a **brand-new standalone slice** that
  hydrates from `{ symbols: {}, boards: {} }` on first read (nothing to migrate — same as `tb/plans` landed).
- `AacSymbol`/`AacBoard` are **new shapes**; adding them plus the `NeuroProfile` union widening (§8) are
  additive → **no bump** (the exact discipline documented across `src/domain/types.ts`).
- Extend the migration-forward fixture (`__tests__/storage/*`) with a `tb/boards` sample so the "additive, no
  bump" claim is proven in CI (current-and-target §1.10).

### 3.4 Firestore (oversight system-of-record; on-device stays source of truth)
Schema owned here; the **sync adapter** (w-firebase-sync / D9) does the mirroring. Under the child doc
(current-and-target §3.4):
```
children/{childId}/boards/{boardId}    AacBoard (parent-authored; kid caches + renders offline)
children/{childId}/symbols/{symbolId}  AacSymbol (library/cleared-set + parent-authored)
children/{childId}/activity/{eventId}  AAC-usage AGGREGATE for A13 (privacy-min: {tileCategory, count, day};
                                       NO utterance text, NO free text — see §6)
```
- **Direction:** parent authors → Firestore → sync adapter pulls **down** into `tb/boards` → kid renders
  **offline**. The kid **reads** boards/symbols; only the parent **writes** library/authored symbols.
- **Custom child-photo/recording tiles stay on-device only** — `pictureUri`/`audioUri` are `file://` and are
  **never** synced or uploaded to Storage (COPPA §6). A synced parent-authored board references cleared-library
  `assetKey`s, never a child photo.
- **Security rules** (start from the donor locked default `allow read, write: if false`,
  `firebase-cloud-functions-typescript-example`): a `children/{id}/boards|symbols` doc is **readable by the
  owning child + the guardian parent**, **writable only by the guardian parent**. `activity` is
  parent-readable, written by the sync adapter with the child's auth.

### 3.5 Pure domain helpers — `packages/shared/src/aac/`
- `boardSymbols(board, symbolMap): AacSymbol[]` — resolve ordered ids → symbols (skips missing, never throws).
- `buildUtterancePhrase(items): string` — join `spokenLabel`s with spaces (ported from
  `speechService.speakSequence`) for the Speak button.
- `coreVocab.ts` — the fixed core-word list (`I, you, want, need, help, more, stop, go, yes, no, please,
  thank-you, like, don't-like, done, break, feelings…`) + the fixed core-word layout constant so core positions
  are identical across boards (motor planning).
- `obf.ts` — `parseObf(json): { board: AacBoard; symbols: AacSymbol[] }` mapping the Open Board Format
  (`format`, `id`, `locale`, `name`, `buttons[{id,label,image_id,sound_id,load_board,border_color,
  background_color}]`, `grid{rows,columns,order}`, `images[]`, `sounds[]`) → the primitive; `grid.order` → the
  ordered `symbolIds[]`; `load_board` buttons → `isCategory` navigation.

---

## 4. Exact files to CREATE / MODIFY (real monorepo paths)

### CREATE — `packages/shared/src/aac/` (the shared primitive; born shared)
- `packages/shared/src/aac/types.ts` — `AacSymbol`, `AacBoard`, `GridSize`, `BoardKind`, `UtteranceItem`,
  `SymbolProvenance`, `SymbolLicense`, `GRID_DIMENSIONS` (§3.1).
- `packages/shared/src/aac/coreVocab.ts` — core-word list + fixed layout constant (§3.5).
- `packages/shared/src/aac/defaultBoards.ts` — cleared default board set (port `speakeasy-aac/src/data/
  defaultData.ts`, re-point `imageUrl`→`assetKey`, add `provenance`, `spokenLabel`, epoch-ms timestamps).
- `packages/shared/src/aac/obf.ts` — `.obf` parser/mapper (§3.5).
- `packages/shared/src/aac/phrase.ts` — `buildUtterancePhrase`, `boardSymbols` (§3.5).
- `packages/shared/src/aac/index.ts` — barrel export.

### CREATE — `apps/kid` (renderer + store + assets)
- `apps/kid/app/(kid)/talk.tsx` — the AAC board route (§2.1).
- `apps/kid/components/aac/AacQuickAccess.tsx` — the ≤1-tap "Talk" affordance for the shell (§2.0).
- `apps/kid/components/aac/AacBoardGrid.tsx` — `FlatList` grid (`numColumns` from `GRID_DIMENSIONS`).
- `apps/kid/components/aac/SymbolTile.tsx` — one tile (press-scale; port `aac-native/components/card.js` +
  `touchable-scale/` feedback; render `assetKey`→require, else `pictureUri`, else `emoji`/`icon`).
- `apps/kid/components/aac/SentenceBar.tsx` — utterance strip + Speak/Backspace/Clear (port
  `aac-native/components/speaking.js` / `announcer.js`).
- `apps/kid/components/aac/AacFolderCrumbs.tsx` — Home/Back/breadcrumb.
- `apps/kid/components/aac/AddCustomTileSheet.tsx` — parent-gated custom photo/record tile (§2.2).
- `apps/kid/src/state/boardStore.ts` — persisted `tb/boards` store (§3.2).
- `apps/kid/src/theme/resolveAac.ts` — `resolveAacPresentation` + `AacPresentation` (§2.1a).
- `apps/kid/src/services/aacSpeech.ts` — thin AAC facade over `src/services/tts.ts` (`speakUtterance(items,
  {ageMode, enabled})`) and `audioUri` playback via `expo-audio`.
- `apps/kid/src/data/aacAssets.ts` — the `assetKey → require("../../assets/symbols/…")` map (mirror
  `src/data/soundscapes.ts` / `buddyCosmetics.ts` asset-map pattern).
- `apps/kid/assets/symbols/manifest.json` — the ONE canonical per-asset **license manifest** (JSON:
  `{file, source, license, attribution}` rows, `SymbolAssetManifestEntry` from `compliance/symbolLicense.ts`);
  the source of truth `assertSymbolManifestClean` + the BUILD-GUIDE §3.1 grep scan (§8 #22). **Do NOT create the
  divergent `src/data/aacSymbolManifest.ts`.**
- `apps/kid/assets/symbols/…` — the **cleared** symbol image set (CC0/CC-BY/CC-BY-SA-with-attribution/original);
  M4.1 ships a small `[HUMAN]` original/placeholder set + its manifest rows (non-vacuous gate), final art before ship.
- `apps/kid/hooks/useAacBoard.ts` — selector hook binding `boardStore` + `resolveAacPresentation` for `talk.tsx`.

### MODIFY — `apps/kid` (additive, invariant-preserving)
- `apps/kid/src/domain/types.ts` — add `export type NeuroProfile = "adhd" | "autism" | "both";` (union widening,
  additive; if a core workstream has already added it, skip — coordinate, do not duplicate).
- `apps/kid/src/theme/resolveCapabilities.ts` — add `neuroProfile?: NeuroProfile` to `ResolveCapabilitiesInput`
  (feeds `resolveAac`); no component reads the raw axis.
- `apps/kid/app/(kid)/_layout.tsx` — mount `AacQuickAccess` in the kid shell chrome (≤1-tap rule).
- `apps/kid/src/state/gameplay.ts` — at the two existing call sites: `removeChild` (~line 673, beside
  `usePlanStore.getState().clearChild(cid)`) add `useBoardStore.getState().clearChild(cid)`; `wipeAllChildData`
  (~line 927, beside `usePlanStore.setState({ plans: {} })`) add
  `useBoardStore.setState({ symbols: {}, boards: {} })`; in `createChildWithSeed` call
  `useBoardStore.getState().seedChild(cid)`.
- `apps/kid/app/(parent)/settings.tsx` — add boards/symbols count to `DataReview` (COPPA transparency).
- `apps/kid/__tests__/storage/*` — extend the migration-forward fixture with a `tb/boards` sample.
- `apps/kid/THIRD_PARTY_NOTICES.md` + `apps/kid/PROVENANCE.md` — append the cleared symbol-set sources +
  `react-native-svg` (already present) + any CC-BY attribution/share-alike notes.

### MODIFY / CREATE — copy + gate
- `apps/kid/src/i18n/en.ts` (+ `catalog.ts`, `types.ts`) — new AAC copy through the `ModeKeyed` key space;
  literal-language autism variants slot in via the existing resolver.
- Extend the copy-gate test (pattern of `notifications.ts#BANNED_REMINDER_PATTERNS`) with **speech-gain/cure
  banned phrases** (§6.3, §7).

---

## 5. Reused donor parts (repo · license · files)

**Ship-safe (permissive):**
- **`speakeasy-aac`** — **MIT** ✅ ship. `src/types/index.ts` `Symbol`/`Board`/`GridSize`/`GRID_DIMENSIONS` →
  the shared primitive (§3.1); `src/stores/boardStore.ts` `loadBoard`/`navigateToBoard`/`navigateToCategory`/
  `goBack`/`goHome`/`canGoBack` → ported 1:1 into `boardStore.ts` (§3.2); `src/data/defaultData.ts` seed vocab
  + `categoryToBoardMap` → `defaultBoards.ts`; `src/services/speechService.ts` `speakSequence` → `phrase.ts`
  `buildUtterancePhrase` (swap Web Speech → `expo-speech`). Web→RN: port pure TS; reimplement grid as `FlatList`.
- **`aac-native`** (Leeloo) — **MIT** ✅ ship. `components/card.js` (tappable tile) → `SymbolTile.tsx`;
  `components/speaking.js` + `announcer.js` (sentence strip / speak bar) → `SentenceBar.tsx`;
  `components/touchable-scale/` (press-scale) → tile feedback; `api.js` `expo-speech` TTS pattern (already
  matches v1 `src/services/tts.ts`); `data/languages/card_*.json` (`{type,title,slug,parents[],color}`) +
  `data/text.json` → i18n reference for multilingual vocab. **Bump Expo 37 APIs → SDK 56.** Bundled
  `data/images/` PNGs are **provenance-unverified** → do NOT ship without clearing (§6.1).
- **`openboardformat`** — **MIT** ✅ ship (spec). The Ruby code is not reusable; the **`.obf`/`.obz` format
  spec** is MIT → implement `parseObf()` (`buttons`/`grid{rows,columns,order}`/`images`/`sounds`/`load_board`).
- **`OpenAAC-flutter`** — **Apache-2.0** ✅ ship (reference). Flutter, not RN → the **text→symbol-via-embeddings
  pattern** is the reference for the LATER A11 "suggest a symbol" Gemini helper (behind the Bloop proxy).
- v1 (shipped) reuse: `src/services/tts.ts` (`speak`, `voiceParamsFor`), `src/services/parentGate.ts`,
  `src/services/photoVerify.ts` (on-device-only photo invariant), `expo-image-picker`/`expo-audio`/
  `expo-file-system`/`react-native-svg` (all present in `package.json`), `src/storage/persist.ts` +
  `schemaVersion.ts` (persistence seam), `src/domain/types.ts#VisualLabel`/`EpochMs`.

**Reference-only (copyleft / unlicensed — do NOT ship their code; UX/flow only):**
- `cboard` — **GPL-3.0** ⚠️ ref-only. Gold-standard board-builder UX: category colour-coding, board builder,
  `.obf` import, symbol search. Study IA, write our own.
- `otsimo-archive/aac`, `coughdrop`, `sweet-suite-aac` — **AGPL-3.0** ⚠️ ref-only. PECS / phrase-building /
  board-data-model UX reference only.
- `AntVo/AAC-Autism-App`, `jgawrylkowicz/aac`, `open-aac/opensymbols` — **no license** ⚠️ ref-only (UX skim;
  OpenSymbols is a hosted API aggregating ~60k symbols — filter per-asset license if ever pulled).

**Symbol art (assets — license bites, §6.1):** **Mulberry** = **CC-BY-SA** (usable *with attribution +
share-alike*); **ARASAAC** = **CC-BY-NC-SA** and **Sclera** = **CC-BY-NC** → **NON-COMMERCIAL, EXCLUDE from the
shipping build**. Ship a **CC-BY / CC0 / public-domain / original** set.

---

## 6. Safety, anti-shame, and COPPA rules that apply

### 6.1 Symbol-license discipline (the landmine)
- The **bundled default set** must be **cleared**: every row in `apps/kid/assets/symbols/manifest.json` (the ONE
  canonical manifest, §8 #22) has `license ∈ {CC0, CC-BY, CC-BY-SA, public-domain, original}`. **No `CC-BY-NC*` /
  `CC-*-ND`.** `assertSymbolManifestClean` (§7) fails the build if an NC/ND asset appears **or** if any file under
  `assets/symbols/` lacks a manifest row (completeness).
- CC-BY / CC-BY-SA assets require **attribution** (and share-alike for BY-SA) recorded in `PROVENANCE.md` +
  `THIRD_PARTY_NOTICES.md`.
- Parent-imported `.obf`/custom tiles may carry `license: "unknown"` (personal use is not "shipping"); they are
  flagged in provenance and never redistributed.

### 6.2 AAC-specific anti-shame invariants
- **AAC is a voice, not a chore.** AAC taps **never** award tokens, **never** fire the celebration/reward loop,
  **never** show a streak/score. `celebrateUtterance` is hard-`false` (§2.1a). There is **no "wrong" utterance**
  and no correction — the child can say anything; the board never scolds, blocks, or "grades".
- **Never premium-gate AAC.** A non-speaking child's voice is accessibility, not monetization — same principle
  as v1 where `ageMode`/`sensoryMode`/reduced-motion/calm-mode are **never** wrapped in `<PremiumGate>`
  (`src/services/entitlements.ts`). AAC core is **free forever** (§8).
- **Predictability:** never surprise-rearrange tiles or change the voice (autism invariant). Adding vocab
  appends; it never reshuffles learned positions.

### 6.3 Evidence-honesty copy gate (enforced like `BANNED_REMINDER_PATTERNS`)
All AAC-facing copy passes an `assertAacCopyClean` gate that **bans speech-gain / therapy / cure claims**:
banned substrings incl. `learn to speak`, `learn to talk`, `will talk`, `speech gains`, `improve(s) speech`,
`teaches speech`, `cure`, `fix`, `therapy`, `treatment`. Approved framing: **"gives them a voice",
"communication access", "say what they mean"**. (Verified evidence §1.2 — communication access, not speech.)

### 6.4 COPPA-2025 + UK Children's Code
- **Custom child photos/recordings are on-device-only** (`file://`), **never uploaded, synced, or analysed**
  (reuse v1 `photoVerify` invariant). No biometric/voiceprint processing.
- **No ad/analytics SDKs** in the kid app; AAC has **zero egress** (no-network gate §7).
- **AAC-usage analytics (A13)** are **privacy-min aggregates** only (`{tileCategory, count, day}`) — **no
  utterance text, no free text** ever leaves the device except this parent-facing aggregate, and only when the
  parent has enabled monitoring. Retention TTL applies (config §3.4).
- **Data review + delete:** boards/symbols counted in `DataReview`; cleared by `wipeAllChildData` (§4) and the
  parent review+delete flow (w-parent).
- **LLM binding:** the A11 helper (later) uses the provider as a **bound non-training processor** behind the
  proxy; PII refused both directions; off by default, parent-gated.

---

## 7. Acceptance criteria + verify steps

**Type + lint**
- [ ] `npm -w @tiny-bubbles/kid run typecheck` = 0 and `npm -w @tiny-bubbles/shared run typecheck` = 0.

**Unit tests (jest, no network)**
- [ ] `packages/shared/aac/obf.test.ts` — `parseObf` maps a sample `.obf` (grid order, `load_board`→
  `isCategory`, images/sounds) → correct `AacBoard.symbolIds[]` + `AacSymbol[]`.
- [ ] `phrase.test.ts` — `buildUtterancePhrase(["I","want","more"])` → `"I want more"`; empty → `""`.
- [ ] `resolveAac.test.ts` — autism ⇒ `stablePositions:true`, `celebrateUtterance:false`, minimal animation;
  ADHD ⇒ brighter but core stays stable; lowStim/Reduce-Motion ⇒ minimal animation; young ⇒ smaller grid; the
  resolver **never** returns a maxChoices-capped vocabulary.
- [ ] `boardStore.test.ts` — seed/upsert/navigate (drill-in via `navigateToCategory`, `goBack`, `goHome`),
  sentence-bar append/backspace/clear, `clearChild` removes only that child; runtime nav/utterance are
  **partialized OUT** (not persisted).
- [ ] **Provenance test** — `assertSymbolManifestClean(apps/kid/assets/symbols/manifest.json)` (the ONE canonical
  path, §8 #22): assert **no** `license` matching `/-NC|ND|GPL|AGPL|ARASAAC|Sclera/`, every bundled entry ∈ the
  cleared set, every CC-BY/BY-SA entry has an `attribution`, **and completeness** — every file under
  `assets/symbols/` has a manifest row (no orphan/renamed asset ships).
- [ ] **Copy-gate test** — `assertAacCopyClean` rejects each banned speech-gain phrase (§6.3); every AAC copy
  string passes.
- [ ] **spokenLabel invariant** — every `AacSymbol` in `defaultBoards.ts` has a non-empty `spokenLabel`.

**Persistence / migration**
- [ ] Migration-forward fixture includes `tb/boards`; loads from default `{symbols:{},boards:{}}`;
  `SCHEMA_VERSION` stays `1`, `MIGRATIONS` stays `[]`.
- [ ] `collectTbSlices()` round-trips `tb/boards` in a backup export/import (`src/services/backup.ts`).

**No-egress + a11y grep gates**
- [ ] `__tests__/config/no-network.test.ts` stays green — `apps/kid/{app,src,components}` contains no
  `fetch(`/`axios`/`http(s)://` in the AAC files (AAC is fully offline).
- [ ] grep: `components/aac/**` and `talk.tsx` contain **no raw** `ageMode`/`neuroProfile`/`sensoryMode` reads
  (must go through `resolveAac`) — extend the existing anti-branch grep test.

**Build / route smoke**
- [ ] `npx expo export` (kid) succeeds; `/talk` route registers; `AacQuickAccess` renders in the shell and
  opens `/talk` in ≤1 tap; a tap on a word tile appends to the bar and speaks; Speak voices the phrase; a
  category tile drills into its folder and Back returns.

**Functions (LATER — A11 only)**
- [ ] Firebase emulator unit test: the "suggest a symbol" endpoint runs the input+output shields, returns only
  cleared-set symbol ids, never auto-adds, and is a no-op when `bloopEnabled=false`.

---

## 8. Dependencies, premium/free, LLM on/off

### 8.1 Depends on (other workstreams)
- **w-monorepo-migration (G0.x)** — HARD: `packages/shared`, `apps/kid`, root workspaces, `tsconfig.base.json`
  path aliases, monorepo Metro (`extraNodeModules`) must exist first (current-and-target §2).
- **w-neuroprofile / resolver-core** — adds `NeuroProfile` to `types.ts` + `resolveCapabilities` input. If not
  yet present, THIS workstream adds the union (additive); coordinate to avoid a duplicate definition.
- **w-firebase-sync (D9)** — the sync adapter that pulls parent-authored boards **down** into `tb/boards` and
  pushes the AAC-usage aggregate **up**. AAC works fully **without** it (offline). Custom photo tiles are never
  synced.
- **Parent-app board authoring (D6)** — `apps/parent/app/(authoring)/board-builder.tsx`, built in **w5's authoring
  cluster (M4.2)** (NOT a phantom "w-parent-authoring"). It writes Firestore `children/{id}/boards|symbols`
  (cleared `assetKey`s only; never a child photo) and consumes the shared primitive defined here.
- **w-tts** — already shipped (`src/services/tts.ts`); reused directly.

### 8.2 Consumed BY (this workstream owns the primitive)
- **w-schedules (A2)** — `AacBoard.kind:"schedule"` (ordered strip); **w-first-then (A3)** —
  `kind:"firstThen"` (2-cell); **choice/token boards** — `kind:"choice"`. They **constrain** `gridSize`/count;
  they must not redefine `AacSymbol`/`AacBoard`.
- **w-sensory (A5)** — the "I need a break" AAC tile deep-links to the calm/break surface.
- **w-emotion (A7)** — the feelings folder overlaps the emotion vocabulary; may deep-link to the strategy menu.

### 8.3 Premium / free
- **AAC core = FREE, never gated** (accessibility, §6.2): full board, core+fringe vocab, custom tiles, TTS,
  offline, `.obf` import.
- **Premium (acquisition-only, later, never retention):** large cleared symbol **expansion packs**, AAC
  **vocabulary analytics** (A13, Parent app), the A11 **"suggest a symbol" LLM helper**. Downgrade never removes
  a board/tile the child already has (v1 acquisition-only-downgrade invariant).

### 8.4 LLM on/off
- **LLM OFF (default) and network OFF:** the **entire** AAC surface works — board, folders, sentence bar, TTS,
  custom tiles, import. No degradation. This is the "never brick the child's voice" (Moxie) invariant.
- **LLM ON:** only the **optional, later A11** "suggest a symbol for ___" helper calls the Bloop proxy
  (Gemini Flash) — parent-gated, off by default; the suggestion must pass the **output shield** and may surface
  **only cleared-set symbols**; it **never auto-adds** a tile and **never speaks unmoderated text**. AAC itself
  has no model in the loop.

---

## 9. Open assumptions
1. **Cleared symbol art sourcing** is a design/art deliverable: either commission an **original** set, use a
   **CC0/public-domain** set, or use **Mulberry (CC-BY-SA)** honoring attribution + share-alike. Dev can bootstrap
   with a placeholder generator (pattern: `speakeasy-aac/scripts/generatePlaceholderSymbols.js`). Final art +
   its rows in `apps/kid/assets/symbols/manifest.json` (§8 #22) gate ship.
2. **`.obz` (zipped multi-board + bundled assets)** import is deferred (needs a zip dependency); **`.obf`
   (single JSON board)** ships first.
3. **AAC boards are per-child** (not shared across siblings) — assumed; revisit if families want a shared board.
4. **Fitzgerald-key colour-coding** is optional and off unless the author sets `partOfSpeech`; default is the
   author's `backgroundColor`.
5. **Custom-tile audio** uses `expo-audio` recording to a `file://` URI (confirm the SDK 56 recording API);
   playback prefers `audioUri` over TTS when present.
6. **`speakOnTap` default** (speak each word on tap vs only on Speak) — assumed ON for young/non-readers; a
   per-child/board setting can override. Confirm with an SLP-informed default.
7. **Sentence-bar clear-on-speak** — assumed ON (utterance is ephemeral); confirm whether power users want the
   bar to persist for editing.
8. **Word prediction + grammar/inflection (A11)** are deferred; the primitive leaves room (`partOfSpeech`) but
   no prediction engine is specified here.
9. **Whether AAC fires ANY companion (Bloop) reaction** — decided **no reward/celebration**; a *neutral,
   non-scoring* Bloop "listening/talking" acknowledgement (no tokens) is possible but left to w-bloop-character;
   default here is a silent, non-gamified board.
