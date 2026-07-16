# Feature Spec — Focus / Calm Soundscapes (`soundscapes`)

Status: ready to build. Additive delta on the shipped, green app (`npx tsc --noEmit` = 0; 34 suites / 335 tests).
Research tier: **later / feature #20** ("Optional calm/focus soundscape") in `_build/research/01-feature-matrix.md`. Gap-list item **#11 [PARTIAL]** in `_build/spec/01-current-state.md` §4.4: *"Basic ambient toggle works; `calmSoundscape` premium flag exists but no premium pack content is wired."*

Hard rules preserved throughout (locked — do not relitigate): **ZERO AI** (no "recommended for you" scene, no adaptive/generative audio, no listening/analysis — a fixed curated catalog only); **anti-shame** (audio is never a nag, never a guilt lever, never "you forgot to turn on focus mode" — it is opt-in and silent by default); **mix-not-hijack** (a soundscape MIXES/ducks; it NEVER seizes or stops a child's or parent's own music/podcast — the shipped `duckOthers` session already guarantees this); **full volume control** (a real user-set bed volume, 0..1, persisted); **project-authored / CC0 audio ONLY** (every bundled loop is original or CC0 / Pixabay-license, listed in `THIRD_PARTY_NOTICES.md`; the donor `bubble-pop` mp3 and any unverifiable asset are never used, doc 66 §1b.9); **no component branches on raw `ageMode`** (only `src/theme` resolvers + capability flags); **offline / Expo-Go / web-safe** (bundled assets, no streaming, no network, no background audio). Verify each change with `npx tsc --noEmit`, `npm test`, `npx expo export --platform web`.

> Framing (honest, per the fact-check `_build/research/01-feature-matrix.md` #20 and `_build/research/00-SYNTHESIS.md`): white/pink/brown-noise + attention in ADHD has *plausible* support (stochastic-resonance hypothesis) and Endel-style focus audio is heavily used, but the company-funded focus figures are **directional only**. So we ship this as an **optional regulation + transition lever**, never as a treatment claim. Copy says "sounds to help you focus / wind down," never "improves attention" or "clinically proven." A calm soundscape is also part of the **calm/non-gamified path** the research requires (`00` §2.3; `30` §3.6) — which is exactly why at least one scene must stay FREE (see §8).

---

## 1. Overview + user value

An **optional, looping ambient soundscape** the child (or a parent) can turn on in two places:

1. **Calm corner** (`app/(kid)/calm.tsx`) — the existing un-gamified breathing screen already has a single on/off "calm sounds" toggle backed by one fixed loop (`calm.ambient`). This feature **generalises that** into: pick a scene from a curated list, set the bed **volume**, on/off. (Calm/regulation use.)
2. **During a routine** (the core-loop runner, `components/task/TaskRunner.tsx`) — an **optional focus bed** that plays quietly while the child works through a routine, then stops when the routine is done / the screen is left / the app backgrounds. (Focus/transition use.)

It is:

- **Opt-in and silent by default.** Nothing auto-plays on app open. Audio starts only from an explicit toggle (child in the calm corner / older runner) or a parent-set "play focus sounds during routines" preference. There is **no** looping audio the child didn't ask for.
- **Mix-not-hijack.** It reuses the app's already-configured audio session (`src/services/sound.ts` → `setAudioModeAsync({ interruptionMode: "duckOthers", playsInSilentMode: false, shouldPlayInBackground: false })`). The soundscape plays *alongside* other media (ducking it while active), and **never seizes, pauses, or stops** the user's own audio — the direct answer to the Brili "the timer audio takes over my podcast" complaint (`30` §2.10).
- **Full volume control.** A real, persisted bed volume (`0..1`) applied to the loop player — not a fixed constant. The child can make it barely-there or prominent.
- **Age-adaptive + sensory-safe** via resolvers/flags only (young: big on/off + up to 3 large scene tiles, parent-managed focus bed; older: scene chips + a continuous volume slider + an in-runner focus toggle; scene list sliced by `maxChoices`).
- **Project-authored / CC0 only** — the free scene reuses the shipped `assets/sounds/calm-ambient.wav`; premium scenes are new CC0/original seamless loops bundled under `assets/sounds/soundscapes/`.

**Why it earns its place (honest):** it is a low-risk, non-screen regulation + transition lever that supports the calm path and smoother routines (which keeps parents subscribed — the retention throughline in `00` §6), and it turns the already-present `calmSoundscape` premium flag + paywall line into real content. The science supports it only as an optional aid, which is exactly how it is framed and copy-gated.

**The seams already exist** (this spec mostly *wires and expands* them):
- Audio session + a resilient, mix-not-hijack looping-bed player: `src/services/sound.ts` (`startAmbient`/`stopAmbient`, the `ambient` mixer category, per-cue volume, `duckOthers` session).
- A premium flag: `src/services/entitlements.ts` → `FEATURE_GATES.calmSoundscape = { kind: "flag", free: false }` (+ `isFeatureUnlocked`).
- A paywall benefit line: `app/(parent)/paywall.tsx` line ~47 — *"A calm-mode ambient soundscape for wind-downs."*
- A theme hint: `resolveTokens`/`tokens.ts` → `soundscapeDefault: boolean` (currently `base && !lowStim`).
- A calm-corner toggle to upgrade: `app/(kid)/calm.tsx` (`startAmbient`/`stopAmbient`, stop-on-blur already wired).

What is missing and this spec adds: (a) a **scene catalog** (free + premium), (b) a **scene-switchable, volume-controllable loop player** (kept separate from the sub-300ms one-shot cue registry), (c) **persisted per-child soundscape settings**, (d) a reusable **volume slider** + **scene picker**, (e) **calm-corner** and **in-runner** wiring with correct lifecycle (stop on blur / done / background), (f) **parent controls** + premium gating, and (g) age/sensory copy.

---

## 2. UX behavior — screen by screen

### 2.1 Contexts and defaults
- **Default: OFF, silent.** `soundscape.focusDuringTasks` defaults `false`; the calm-corner toggle starts OFF on every visit (as it does today). No surprise audio, ever.
- Two selectable scenes per child are remembered: `calmSceneId` (calm corner) and `focusSceneId` (during routines, nullable). Both come from the curated catalog (§3.2); only **owned/free** scenes are selectable (premium ones are gated, §2.6).
- One bed volume (`soundscape.volume`, `0..1`) applies to whichever soundscape is playing.

### 2.2 Calm corner — `app/(kid)/calm.tsx` (upgrade the existing toggle)
Keep the breathing visual and the drifting-bubbles background exactly as today. Replace the single "Play calm sounds" `Pressable` with a **`<SoundscapePicker context="calm">`** block:
- **On/off** — the same big, friendly toggle affordance (accessibilityRole `switch`), now labelled with the selected scene ("Play calm sounds · Gentle Waves").
- **Scene tiles/chips** — the catalog `kind: 'calm'` (and any owned focus scene) sliced to `capabilities.maxChoices` (3 young / 6 older). Each tile shows the scene's emoji + `spokenLabel` (auto-spoken on young via `SpokenLabel`). Tapping a tile selects it and, if sound is currently on, **crossfades/swaps** to it live.
- **Volume** — a **`<VolumeSlider>`** (§4 create #3). Young: a large, high-contrast slider with big thumb + increment/decrement affordances (accessible). Older: a slim continuous slider. Adjusting it applies to the live bed immediately and persists.
- **Lifecycle:** the soundscape **stops on blur / unmount** (the `useFocusEffect` + unmount `stopSoundscape()` already present, extended to the new player). It never plays on in the background.

### 2.3 During a routine — the focus bed (`components/task/TaskRunner.tsx`)
Only when the parent (or older child) has enabled it and a `focusSceneId` is set:
- **Start** when a routine run becomes active (a fresh/resumed run with steps to do) AND `soundscape.focusDuringTasks === true` AND `focusSceneId` is set AND master sound is on.
- **Stop** when: the daypart/routine completes (`allDone`), the runner loses focus (navigate to buddy/rewards/calm/celebrate/peek/parent), or the app backgrounds. Use `useFocusEffect` on the runner screen + the app-background listener (§4 modify #5). The `DaypartDonePanel` state shows **no** focus bed (the work is done).
- It is deliberately quiet (bed volume, ducking) so it sits *under* the child's attention, not over it.

### 2.4 YOUNG (`multiStepVisible === false`) — no in-runner control
The young one-focal-step surface stays uncluttered: there is **no** in-runner soundscape control. The focus bed for young is entirely **parent-managed** (parent enables `focusDuringTasks` + picks `focusSceneId` in Settings); when a routine starts it just begins quietly and stops when done. Young children get scene choice + volume only in the calm corner (big tiles, up to 3).

### 2.5 OLDER (`multiStepVisible === true`) — an in-runner focus toggle
A small, low-emphasis **soundscape toggle chip** in the runner header row (next to `BalanceChip`, respecting the reserved right padding for the Grown-ups 🔒 door). Tapping it turns the focus bed on/off for this session and remembers the state. When on, it shows the scene emoji; tapping and holding (or a small "change" affordance) opens the same `<SoundscapePicker context="focus">` as a compact sheet to pick a scene + volume. This never appears in `young` (gated by `capabilities.multiStepVisible`).

### 2.6 Premium scenes (acquisition-only gate)
- **Free** children see the free scene(s) as fully usable tiles, plus premium scenes shown as **preview tiles with a small "✨ premium" affordance**. Tapping a premium tile does **not** shame or dead-end — it routes through the parent gate to the paywall (`(gate)/parental-gate` → `(parent)/paywall`), exactly like other premium surfaces. It never removes or greys a scene the child already had.
- **Premium/trial** children can select any scene.
- **Acquisition-only, per doc 66 §1b.11:** if a trial ends, a premium scene the child had selected **stays selectable and keeps playing** (nothing owned/equipped is ever stripped). `isFeatureUnlocked('calmSoundscape', entitlement)` gates only *newly choosing a not-yet-unlocked premium scene*; a previously-selected scene id in `soundscape.calmSceneId`/`focusSceneId` is always honoured. (See §6 + §7 for the exact rule + its test.)

### 2.7 Parent settings — `app/(parent)/settings.tsx`
A new **"Soundscapes"** `Card` (under "Sound & motion"), for the active child:
- **"Play focus sounds during routines"** `Toggle` → `soundscape.focusDuringTasks` (default OFF).
- **Calm-corner scene** and **Focus scene** — small pickers (reuse `Segmented`/scene chips) over owned scenes; premium scenes show the ✨ and deep-link to the paywall.
- **Bed volume** — a `<VolumeSlider>` (or the curated `Segmented` Quiet/Medium/Full fallback, §9) → `soundscape.volume`.
- **Unlock more soundscapes** — a `<PremiumGate feature="calmSoundscape">`-wrapped row that opens the paywall (only shown to non-premium).
- Hint copy: *"Optional background sounds. They mix with — never interrupt — other audio, and never play in the background."*

### 2.8 Calm mode / lowStim / Reduce-Motion
- A soundscape is **audio, not motion** — it is a regulation aid and is **allowed** in `calmMode` and `lowStim` (unlike confetti/parallax). `resolveTokens.soundscapeDefault` being `false` under lowStim only means *don't auto-suggest an on-state*; the child/parent can still turn it on. Do **not** couple soundscape playback to `motion.loopsEnabled`.
- `calmMode` keeps the calm-corner soundscape fully available (calm keeps "routine + audio," drops gamification, doc 66 §1b.5).
- The hardware silent switch is respected (`playsInSilentMode: false`) and nothing plays backgrounded (`shouldPlayInBackground: false`) — both already set by `initSoundRegistry`.

---

## 3. Data-model additions (exact TS types + which store) + migration notes

### 3.1 New per-child settings on `ChildSettings` (persisted in `childStore`)
`src/domain/types.ts` — add the scene id alias + the settings sub-shape, and an **optional additive** field on `ChildSettings`:

```ts
/** A soundscape scene id from the catalog (src/data/soundscapes.ts). */
export type SoundscapeId = string;

/** Per-child soundscape preferences (doc: feature `soundscapes`). */
export interface SoundscapeSettings {
  /** bed volume 0..1 (FULL control) applied to the looping player. Default 0.55
   *  (matches the shipped ambient volume). */
  volume: number;
  /** selected calm-corner scene id (must be owned/free). Default 'waves' (free). */
  calmSceneId: SoundscapeId;
  /** selected during-routine focus scene id, or null = none chosen. Default null. */
  focusSceneId: SoundscapeId | null;
  /** play the focus scene automatically while a routine runs. Default false. */
  focusDuringTasks: boolean;
}

export interface ChildSettings {
  // ...all existing fields unchanged...
  /**
   * Optional + additive (doc 66 §3 migration rule): absence => resolve to
   * DEFAULT_SOUNDSCAPE_SETTINGS. Merges cleanly through mergeWithDefaults /
   * validateAndRepair with NO SCHEMA_VERSION bump (same pattern as the optional
   * `finish?`, `savingTowardRewardId?`, `proposed?` additions).
   */
  soundscape?: SoundscapeSettings;
}
```

> Why optional (not required like `soundEnabled`): an optional field merges into every already-persisted `ChildSettings` blob with zero migration and zero risk to the 335 green tests. A resolver (`resolveSoundscapeSettings(settings)` — §4 create #2) fills defaults so components read a total value. The build-agent MAY instead make it required and seed it in `defaultChildSettings` + `mergeWithDefaults`; either is acceptable (see §9).

### 3.2 New catalog type (data, not persisted)
`src/domain/types.ts` (or co-located in `src/data/soundscapes.ts`):

```ts
export type SoundscapeKind = "calm" | "focus";

export interface Soundscape {
  id: SoundscapeId;
  label: VisualLabel;          // spokenLabel (required) + emoji + color
  kind: SoundscapeKind;        // suggested context; any scene is selectable in either
  /** premium ACQUISITION gate (calmSoundscape). Free scenes: premium=false. */
  premium: boolean;
  /** key into the sound service's SOUNDSCAPE_ASSET require() map. */
  assetKey: string;
}
```

### 3.3 Defaults + factory
`src/domain/constants.ts` — add:
```ts
export const DEFAULT_SOUNDSCAPE_SETTINGS: SoundscapeSettings = {
  volume: 0.55,
  calmSceneId: "waves",   // the FREE scene (reuses assets/sounds/calm-ambient.wav)
  focusSceneId: null,
  focusDuringTasks: false,
};
```
`defaultChildSettings(ageMode)` MAY include `soundscape: DEFAULT_SOUNDSCAPE_SETTINGS` (harmless for new children); existing children get it via the resolver / merge.

### 3.4 Migration notes (additive, versioned)
- `SCHEMA_VERSION` stays **1**. `ChildSettings.soundscape?` is an optional field on an already-persisted shape → merges cleanly through `src/storage/migrations.ts` (`mergeWithDefaults` / `validateAndRepair`); an older blob simply lacks it. **No `MIGRATIONS` entry needed.**
- `validateAndRepair` additions (defensive; `src/storage/migrations.ts`) — never throw, never a shame state:
  - If `soundscape` present: clamp `volume` to `[0, 1]` (NaN/absent → `0.55`).
  - If `calmSceneId` / `focusSceneId` references a **non-existent** scene id (catalog lookup) → coerce `calmSceneId` to `'waves'` and `focusSceneId` to `null`. (A scene that is *premium-locked* is NOT invalid — it is preserved; the ownership check is separate, §6.)
  - Coerce `focusDuringTasks` to a boolean.
- If a later change makes any soundscape field required or changes meaning, add a forward-only `MIGRATIONS` entry then (engine is ready). Not needed now.

### 3.5 In-memory service state (not persisted)
The loop player, current scene, and applied volume live in the module state of `src/services/soundscape.ts` (§4 create #1), mirrored from the active child's persisted `soundscape` on child-switch (root layout, §4 modify #5) — the same pattern as `setSoundEnabled`/`setHapticsEnabled` mirroring today. No store change beyond `ChildSettings`.

---

## 4. EXACT files to CREATE and MODIFY (real paths under `tiny-bubbles/`)

> **BUILD DEFAULT — code stays green with ZERO new audio assets (READ FIRST).** Metro resolves
> `require("../../assets/sounds/soundscapes/rain.wav")` at bundle time, so a `require()` for a file
> that does not exist **fails `npx expo export --platform web`** — the verify-floor command at every
> milestone boundary. A code-only build-agent cannot author or source CC0 `.wav` loops. Therefore:
> **register ONLY scenes whose asset file actually exists on disk.** Ship M-C1 with the single free
> `waves` scene (which reuses the already-bundled `assets/sounds/calm-ambient.wav`). Write each
> premium scene's catalog entry + `SOUNDSCAPE_ASSET` `require()` **only after** its CC0 loop file has
> been dropped into `assets/sounds/soundscapes/` (an out-of-band orchestrator prerequisite, roadmap
> §6 / BUILD-GUIDE §0). Do **not** write a `require()` for a missing file. The premium *mechanism*
> (catalog `premium:true` flag, `isSceneAvailable`, `<PremiumGate>` wiring, paywall deep-link) is
> fully built and tested against `waves` + any premium entries whose assets are present — so the
> feature is complete and green even if only `waves` ships. The exact premium set below is the
> TARGET catalog; the buildable default is "every scene whose file exists, ≥1 free."

### CREATE
1. **`src/services/soundscape.ts`** — a scene-switchable, volume-controllable **looping-bed player**, deliberately SEPARATE from the sub-300ms one-shot cue registry in `sound.ts` (so scene loads/swaps never touch the celebration hot path). Pure-ish service module; every native call guarded (never throws). API:
   - `const SOUNDSCAPE_ASSET: Record<string, number>` — `require()` map. Free `waves` reuses `require("../../assets/sounds/calm-ambient.wav")`. **Include a premium key's `require()` ONLY if its `.wav` exists on disk** (see BUILD DEFAULT above) — a `require()` of a missing file breaks `expo export`. Ship with just `{ waves: require("../../assets/sounds/calm-ambient.wav") }` until premium loops are dropped in; add each premium key when its file lands.
   - `playSoundscape(sceneId: SoundscapeId): void` — resolve the scene's `assetKey`; if a *different* scene is active, `stopSoundscape()` then create a new looping `AudioPlayer` (via `createAudioPlayer`, `loop = true`); apply the current volume; `seekTo(0)` + `play()`. No-op if master sound off / `ambient` category off (consult `isSoundEnabled()` / `isCategoryEnabled("ambient")` exported from `sound.ts`).
   - `stopSoundscape(): void` — `pause()` (and `remove()` the player on scene switch / teardown) the active loop.
   - `setSoundscapeVolume(v: number): void` — clamp `[0,1]`, store, apply to the active player's `volume`.
   - `getSoundscapeState()` — `{ activeSceneId, volume, playing }` for tests/debug.
   - **Does NOT call `setAudioModeAsync`** — it relies on the mix-not-hijack session already configured by `initSoundRegistry` at boot. (Document this dependency in the header.)
   - Header comment must restate: mix-not-hijack, no background, silent-switch-respecting, CC0 assets only.
2. **`src/domain/soundscapes.ts`** (pure, RN-free, unit-testable) — resolver + lookups:
   - `resolveSoundscapeSettings(s?: Partial<SoundscapeSettings>): SoundscapeSettings` — spread over `DEFAULT_SOUNDSCAPE_SETTINGS`, clamp volume.
   - `findSoundscape(id: SoundscapeId): Soundscape | undefined`.
   - `isSceneAvailable(scene: Soundscape, entitlement): boolean` — `!scene.premium || isPremium(entitlement)` OR the scene is already the child's selected one (ownership-honoured; see §6). Keep the "already-selected stays available" rule here so UI + repair share it.
   - `pickableScenes(kind, maxChoices, entitlement, selectedId)` — the curated, sliced list for a picker (free + owned + preview-premium), capped at `maxChoices`.
3. **`components/ui/VolumeSlider.tsx`** — a reusable, accessible bed-volume control built on **`react-native-gesture-handler`** (`Pan`) + **`react-native-reanimated`** (already in-stack; no new dep). Props: `value: number` (0..1), `onChange: (v: number) => void`, `size?: "young" | "older"` (resolved by the caller from `useThemeTokens()`, NOT read here), `accessibilityLabel`. Renders a track + thumb; `accessibilityRole="adjustable"` with `accessibilityActions` increment/decrement (±0.1) so it works without a drag (web + a11y). Colors from `useThemeTokens()`. (Fallback: a curated `Segmented` level control — see §9 open assumption.)
4. **`components/kid/SoundscapePicker.tsx`** — composes: an on/off affordance, the sliced scene tiles/chips (`pickableScenes` from `src/domain/soundscapes.ts` × `capabilities.maxChoices`), and a `<VolumeSlider>`. Props: `context: "calm" | "focus"`, `childId`. Reads `useThemeTokens()` / `useCapabilities()` / `useEntitlements()`; writes selection/volume through `childStore.updateSettings(childId, { soundscape: {...} })`; drives `playSoundscape`/`stopSoundscape`/`setSoundscapeVolume`. Premium tiles route to the paywall via the parent gate. **No raw `ageMode`.**
5. **`__tests__/services/soundscape.test.ts`**, **`__tests__/domain/soundscapes.test.ts`** — see §7 for the exact assertions (catalog validity, volume clamp, ownership-honoured availability, mix-not-hijack config untouched, master/category muting).
6. **`assets/sounds/soundscapes/*.wav`** (or `.m4a`) — new **CC0 / project-authored** seamless loops for premium scenes (e.g. `rain.wav`, `brown-noise.wav`, `forest.wav`, `soft-piano.wav`, `cafe-hum.wav`, `night-crickets.wav`). Short (~20–60s), seamless, low-level. **These binaries are an out-of-band ORCHESTRATOR prerequisite — a code-agent cannot produce them (roadmap §6 / BUILD-GUIDE §0).** Until they are dropped in, do NOT register them (BUILD DEFAULT above). Each supplied file MUST be added to the `THIRD_PARTY_NOTICES.md` "Bundled assets (audio/fonts/images)" section (`filename, source URL, author, license, commercial-OK`). The **free** `waves` scene reuses the existing `assets/sounds/calm-ambient.wav` — no new free asset required, so M-C1 is buildable and green with zero new files.

### MODIFY
7. **`src/domain/types.ts`** — add `SoundscapeId`, `SoundscapeSettings`, `SoundscapeKind`, `Soundscape`; add optional `soundscape?: SoundscapeSettings` to `ChildSettings` (§3.1/§3.2).
8. **`src/domain/constants.ts`** — add `DEFAULT_SOUNDSCAPE_SETTINGS`; optionally include it in `defaultChildSettings` (§3.3).
9. **`src/data/soundscapes.ts`** — the catalog array `SOUNDSCAPES: Soundscape[]`: **free** = `waves` (kind `calm`, `premium:false`, reuses `calm-ambient.wav`) is ALWAYS present; **premium** TARGET set = `rain`, `brown_noise`, `forest`, `soft_piano`, `cafe`, `night` (mix of `calm`/`focus`, `premium:true`) — **list only the premium entries whose asset file exists in `SOUNDSCAPE_ASSET`** (BUILD DEFAULT above); a catalog entry must never reference an `assetKey` with no `require()`. Every scene has a `spokenLabel` + emoji + color. Export a `SOUNDSCAPE_ASSET` key map consumed by `soundscape.ts` (or keep the require-map in `soundscape.ts` and reference `assetKey`s from here — keep the two in sync; the service is canonical for `require()`). A `soundscapes.test.ts` assertion enforces `SOUNDSCAPES.every(s => s.assetKey in SOUNDSCAPE_ASSET)`.
10. **`src/storage/migrations.ts`** — the `validateAndRepair` clamps/coercions in §3.4.
11. **`app/(kid)/calm.tsx`** — replace the single toggle `Pressable` (lines ~174–204) with `<SoundscapePicker context="calm" childId={activeChildId} />`. Keep the breathing visual, drifting bubbles, and the stop-on-blur `useFocusEffect`/unmount `stopSoundscape()` (swap `stopAmbient` → `stopSoundscape`). The screen still needs the active `childId` (read from `settingsStore.meta.activeChildId`).
12. **`components/task/TaskRunner.tsx`** (and/or `app/(kid)/index.tsx`) — the focus-bed lifecycle (§2.3): on active run start, if `resolveSoundscapeSettings(settings.soundscape).focusDuringTasks` && `focusSceneId` && `toggles.soundEnabled`, call `playSoundscape(focusSceneId)`; `stopSoundscape()` on `allDone`, on `useFocusEffect` cleanup, and on app-background. Add the **older-only** in-runner toggle chip (gated by `caps.multiStepVisible`) that flips `focusDuringTasks` for the session + opens `<SoundscapePicker context="focus">`. No change to completion/token/celebration logic.
13. **`app/_layout.tsx`** — extend the existing per-child mirroring `useEffect` (lines ~131–134, `setSoundEnabled`/`setHapticsEnabled`): also `setSoundscapeVolume(resolveSoundscapeSettings(profile?.settings.soundscape).volume)` on child-switch, and **`stopSoundscape()` on app background** (extend the `AppState` background listener at lines ~174–181, alongside `lockParent()`), so a focus bed can never continue playing while backgrounded. (`shouldPlayInBackground:false` is the OS-level backstop; this is the explicit app-level stop.)
14. **`app/(parent)/settings.tsx`** — add the "Soundscapes" `Card` (§2.7): the `focusDuringTasks` `Toggle`, scene pickers, a `<VolumeSlider>` (or `Segmented` fallback), and a `<PremiumGate feature="calmSoundscape">` "Unlock more soundscapes" row deep-linking to the paywall. All for the active child via `updateSettings`.
15. **`src/theme/resolveContent.ts`** — add `ModeKeyed` copy keys (both `young`/`older` required by the `satisfies` constraint), e.g.:
    - `"soundscape.calmTitle"`: `{ young: "Calm sounds", older: "Calm sounds" }`
    - `"soundscape.play"`: `{ young: "Play calm sounds", older: "Play calm sounds" }`
    - `"soundscape.focusToggle"`: `{ young: "Focus sounds", older: "Focus sounds" }`
    - `"soundscape.pick"`: `{ young: "Pick a sound", older: "Choose a soundscape" }`
    - `"soundscape.volume"`: `{ young: "How loud?", older: "Volume" }`
    - `"soundscape.premium"`: `{ young: "Ask a grown-up ✨", older: "Premium — unlock in settings" }`
    (Scene *names* live in the catalog `label.spokenLabel`, not here.)
16. **`src/services/sound.ts`** — no behavior change required; optionally make `startAmbient`/`stopAmbient` thin back-compat wrappers that delegate to `soundscape.ts` (`playSoundscape(DEFAULT calm scene)` / `stopSoundscape`) so any remaining callers/tests keep working, OR leave them and migrate `calm.tsx` to the new API (preferred: migrate `calm.tsx`, keep `startAmbient`/`stopAmbient` as-is for the existing `sound.test.ts` unless that test is updated). Ensure `isSoundEnabled()` + `isCategoryEnabled("ambient")` remain exported for `soundscape.ts` to consult (they already are).
17. **`app/(parent)/paywall.tsx`** — optional copy refinement of the existing soundscape benefit line to reflect the multi-scene pack ("A pack of calm & focus soundscapes for wind-downs and focus time"). No structural change.
18. **`THIRD_PARTY_NOTICES.md`** — append every new CC0/original loop asset to the "Bundled assets" section (§4 create #6).
19. **`src/services/entitlements.ts`** — no change (the `calmSoundscape` flag already exists and is correct). Referenced only.

> Golden-rule check for the build-agent: `SoundscapePicker`, `VolumeSlider`, `TaskRunner`, `calm.tsx`, and `settings.tsx` resolve every age/sensory difference through `useThemeTokens()` / `useCapabilities()` / `resolveContent` — **no `ageMode`/`sensoryMode`/`reducedMotion` string reads, no `ageMode` prop.** The scene list is sliced by `capabilities.maxChoices`; the in-runner control is gated by `capabilities.multiStepVisible`.

---

## 5. Reused prebuilt libraries (prefer existing deps)

All already in the stack — **no new dependency required**:
- **`expo-audio`** (`~56.0.12`) — `createAudioPlayer` + `player.loop`/`player.volume`/`seekTo`/`play`/`pause`/`remove` for the looping bed; the session is already configured by `initSoundRegistry` (`setAudioModeAsync`). This is the same library the shipped `startAmbient`/`stopAmbient` uses; the feature extends the pattern to multiple scenes + a settable volume.
- **`react-native-gesture-handler`** (`~2.31.1`) + **`react-native-reanimated`** (`4.3.1`) — the `<VolumeSlider>` drag (Pan) + thumb animation. No slider dependency needed.
- **`react-native-svg`** (`15.15.4`) — optional for the slider track/thumb or scene-tile art (plain `View`s also suffice).
- `src/theme/*` resolvers + `useThemeTokens` / `useCapabilities` / `resolveContent` — colors, `maxChoices`, `multiStepVisible`, type scale, the `soundscapeDefault` hint.
- `src/services/entitlements.ts` (`isFeatureUnlocked`, `useEntitlements`) + `components/parent/PremiumGate.tsx` — premium gating.
- `components/parent/ui.tsx` (`Card`, `SectionTitle`, `SettingRow`, `Toggle`, `Segmented`, `Note`) + `components/ui/SpokenLabel.tsx` — parent controls + spoken scene labels.

**No new MIT lib is needed.** If a build-agent strongly prefers a native slider over the custom one, **`@react-native-community/slider`** (MIT, Expo-Go/dev-client compatible, web-safe) is the named acceptable alternative — but the custom `<VolumeSlider>` (gesture-handler + reanimated) avoids the dependency and matches the codebase's "own the primitive" preference (as done for the bubble-fill ring). Do **not** add any audio/streaming/DSP library — the loops are bundled CC0 assets played by `expo-audio`.

---

## 6. ANTI-SHAME + no-AI rules that apply

- **Opt-in, never a nag.** No soundscape auto-plays on app open; the calm-corner toggle starts OFF; the focus bed starts only when a parent/older-child explicitly enabled it. There is **no** notification, reminder, or copy that says "you forgot to turn on focus mode" or "your buddy likes the calm sounds." Audio is offered, never pushed.
- **Mix-not-hijack (hard).** Reuses the shipped `setAudioModeAsync({ interruptionMode: "duckOthers", playsInSilentMode: false, shouldPlayInBackground: false })` session; the soundscape **ducks** other media while playing and **never seizes/stops** it. This feature adds **no** session change and **no** background audio. (Grep-gated, §7.)
- **No auto-penalty / no loss.** A soundscape is orthogonal to tokens, streaks, celebration, and completion — turning it on/off changes nothing about the loop. There is no "focus score," no bonus for using it, no penalty for not.
- **Never strips owned content (anti-shame downgrade, doc 66 §1b.11).** If a trial ends, a premium scene the child selected keeps playing and stays selectable; only *newly choosing a not-yet-unlocked premium scene* is gated. `isSceneAvailable` honours the currently-selected id. (Tested, §7.)
- **Sensory respect.** Full user volume control (0..1); the hardware silent switch is honoured (`playsInSilentMode:false`); nothing plays backgrounded (`shouldPlayInBackground:false` + explicit `stopSoundscape()` on background). A soundscape is audio (a regulation aid), so it is permitted in `lowStim`/`calmMode`/Reduce-Motion — but its default is still OFF.
- **Zero AI.** The catalog is a fixed, hand-authored list. There is **no** "recommended scene," no adaptive/generative/AI audio, no microphone/listening, no analysis of the child. The parent/child picks from a curated list; the app never proposes, ranks, or personalises a scene.
- **Curated autonomy.** The scene list is curated and **sliced by `maxChoices`** (3 young / 6 older) — never an open catalog; volume is a bounded 0..1 control.
- **Honest, non-clinical copy.** "Sounds to help you focus / wind down" — never "improves attention," "clinically proven," or "fixes focus." No medical claim anywhere in the feature's copy.

---

## 7. Acceptance criteria + verify steps

### Acceptance criteria
1. **Calm corner** offers scene selection (curated, sliced by `maxChoices`), a working **volume** control, and on/off; the breathing visual + drifting bubbles are unchanged. Selecting a scene while sound is on swaps the loop live; adjusting volume applies to the live bed and persists.
2. **During a routine**, when `focusDuringTasks` is on and a `focusSceneId` is set, a focus bed plays; it **stops** on routine completion, on leaving the runner, and on app background — and never plays in the background.
3. **Mix-not-hijack:** enabling a soundscape while a podcast/music plays **ducks** (lowers) the other audio and lets it keep playing; it **never** pauses or stops it. The `duckOthers` / `shouldPlayInBackground:false` / `playsInSilentMode:false` session is unchanged.
4. **Full volume control:** the bed volume is a real persisted `0..1` value applied to the player (not a fixed constant); `0` is effectively silent, `1` is prominent; out-of-range/NaN persisted values are clamped by `validateAndRepair`.
5. **Premium gating is acquisition-only:** a free child can play the free scene(s); premium scenes preview + deep-link to the paywall; a premium/trial child can select any scene. Simulating trial-expiry with a premium scene already selected leaves it **selectable and playing** (zero visible strip).
6. **Age-adaptive via resolvers only:** young has no in-runner control and up to 3 big calm-corner tiles; older has an in-runner focus toggle and up to 6 chips + a slim slider. No component reads raw `ageMode`/`sensoryMode`/`reducedMotion`; no `ageMode` prop is passed.
7. **Opt-in default:** fresh install / new child → every soundscape OFF and silent; nothing auto-plays.
8. **CC0-only assets:** every bundled loop is listed in `THIRD_PARTY_NOTICES.md`; no unverifiable/NC asset is bundled; the free scene reuses `calm-ambient.wav`.
9. **Offline / web-safe:** works in airplane mode; `npx expo export --platform web` builds (controls render; audio is N/A on web per the strict-subset rule, and the guarded player no-ops without throwing).
10. **Loop unchanged:** the daypart runner, completion, tokens, celebration, and all anti-shame states are byte-for-byte identical whether or not a soundscape is playing.

### Verify steps (an agent runs)
- `npx tsc --noEmit` → 0 errors (new types + copy keys compile; `ModeKeyed` forces both variants; `_AssertRewardCeiling`-style guards unaffected).
- `npm test` → all suites green incl. new `__tests__/services/soundscape.test.ts` + `__tests__/domain/soundscapes.test.ts`. Assert: catalog has ≥1 free scene with a valid `spokenLabel`; every `assetKey` exists in `SOUNDSCAPE_ASSET`; `resolveSoundscapeSettings` clamps volume to `[0,1]` and defaults a missing blob; `isSceneAvailable` returns true for a premium scene that is the currently-selected id even when not premium (ownership-honoured); `pickableScenes` never exceeds `maxChoices`; the service no-ops (no throw) when master sound / ambient category is off.
- `npx expo export --platform web` → succeeds (web-safe; guarded audio no-ops).
- Grep gates:
  - `grep -rn "setAudioModeAsync" src` → **only** in `src/services/sound.ts` with `interruptionMode: "duckOthers"`, `shouldPlayInBackground: false`, `playsInSilentMode: false` — the soundscape service must NOT call it (mix-not-hijack + no-background invariant).
  - `grep -rni "shouldPlayInBackground *: *true\|UIBackgroundModes\|staysActiveInBackground" app src` → zero.
  - `grep -rni "recommend\|suggest\|for you\|adaptive\|ai\b\|microphone\|listen" src/services/soundscape.ts src/data/soundscapes.ts components/kid/SoundscapePicker.tsx` → zero (zero-AI, no personalisation).
  - `grep -rni "improves attention\|clinically\|proven\|treat\|cure\|fixes focus" app src/data/soundscapes.ts src/theme/resolveContent.ts` → zero (no medical claim).
  - `grep -rn "ageMode" components/kid/SoundscapePicker.tsx components/ui/VolumeSlider.tsx` → no raw reads / no `ageMode` prop.
  - `grep -rn "soundscape\|Soundscape" src/data/soundscapes.ts src/services/soundscape.ts` → catalog + player only; scene labels carry `spokenLabel`.
- Manual (dev client, from `RUN.md`): open Calm corner → pick a scene, set volume, toggle on → loop plays; start a podcast then toggle on → podcast ducks but keeps playing; leave the screen → audio stops. Enable "focus sounds during routines" + pick a focus scene (older) → run a routine, bed plays; finish/leave/background → bed stops. As a free child tap a premium scene → routed to paywall (nothing stripped). Start a trial, select a premium scene, expire the trial → it still plays. Toggle master sound off → all soundscapes silent.

---

## 8. Dependencies + premium/free classification

### Depends on (all shipped/green — no unbuilt-spec blockers)
- Audio session + looping-bed pattern + mixer categories: `src/services/sound.ts` (`initSoundRegistry` session, `startAmbient`/`stopAmbient`, `isSoundEnabled`, `isCategoryEnabled`), `src/services/playCue.ts` (M13).
- Calm corner surface + stop-on-blur lifecycle: `app/(kid)/calm.tsx` (M13).
- Core loop runner (focus-bed host): `components/task/TaskRunner.tsx`, `app/(kid)/index.tsx`, `hooks/useCelebration.ts` (M7).
- Theming/age engine: `src/theme/*` — `useThemeTokens`, `resolveCapabilities` (`maxChoices`, `multiStepVisible`), `resolveContent` (`ModeKeyed`), `resolveTokens` (`soundscapeDefault`) (M2).
- Data + stores: `ChildSettings` + `childStore.updateSettings` (M4/M9), `src/domain/constants.ts` factory, `src/storage/migrations.ts` merge/repair (M3/M4).
- Entitlements + paywall + gate: `src/services/entitlements.ts` (`calmSoundscape`, `isFeatureUnlocked`), `components/parent/PremiumGate.tsx`, `app/(parent)/paywall.tsx`, `app/(gate)/parental-gate.tsx` (M12).
- Parent settings host + UI kit: `app/(parent)/settings.tsx`, `components/parent/ui.tsx`, `components/ui/SpokenLabel.tsx` (M9/M2).
- Root mirroring hook + background listener: `app/_layout.tsx` (M5/M13).

### Related specs (no hard dependency; do not couple)
- **`visual-timers`** — a sibling in-runner sensory aid; both must respect the same ducking session and stay decoupled. A *future* premium "timer soundscape" would route through this feature's `calmSoundscape` flag, but the visual timer's optional chime is separate — do not merge.
- **`novelty-refresh`** — soundscapes could later ship as an additive **seasonal pack** (a `SeasonalPack` of scenes) via the novelty seam; build that as a consumer later, not a blocker now.
- **`mood-checkin` / calm path** — the calm corner is a shared neighbour; keep the soundscape independent of mood logging.

### Premium vs free (locked-decision-aligned)
- **FREE (never paywalled):** at least **one calm soundscape** in the calm corner (`waves`) + on/off + full volume. The calm/regulation path is an accessibility/sensory axis (`src/services/entitlements.ts` never-gated list) and must never be gated — the calm corner always has usable ambient audio. The core loop is fully playable with **no** soundscape.
- **PREMIUM (`FEATURE_GATES.calmSoundscape`, already defined):** the **expanded scene pack** (additional calm + focus scenes) **and** the **focus-during-tasks** enhancement (a soundscape while doing routines). These are retention/focus add-ons, not the core loop. Gating is **acquisition-only** — anything a child already selected/owns keeps working after any downgrade (doc 66 §1b.11). No new gate key is added; the existing `calmSoundscape` flag is the single source of truth.

---

## 9. Open assumptions

1. **Optional-vs-required `ChildSettings.soundscape`.** Baseline makes it **optional + additive** (zero migration, resolver fills defaults). The build-agent MAY instead make it required and seed it in `defaultChildSettings` + `mergeWithDefaults` (still no `MIGRATIONS` entry needed since merge fills it). Either is anti-shame-safe.
2. **Custom slider vs community slider.** Baseline ships a custom `<VolumeSlider>` (gesture-handler + reanimated, no new dep). Acceptable fallbacks: `@react-native-community/slider` (MIT, named), **or** a curated `Segmented` level control (Quiet 0.3 / Medium 0.55 / Full 0.85) reusing `components/parent/ui.tsx` — the latter is the simplest and still satisfies "user-set volume," though less granular than the "full volume control" brief. Prefer the continuous slider; the Segmented is an explicit fallback.
3. **Focus-during-tasks is premium.** Baseline classifies the *during-routine* focus bed (and the expanded pack) as premium under `calmSoundscape`, keeping ≥1 free calm scene. An acceptable alternative is: focus-during-tasks is **free** and only the *expanded scene library* is premium. Chosen baseline matches the existing paywall line + flag; note the alternative if product wants focus audio free for all.
4. **Scene catalog contents.** Baseline: 1 free (`waves`) + ~6 premium (`rain`, `brown_noise`, `forest`, `soft_piano`, `cafe`, `night`). Exact set/count is adjustable as long as ≥1 is free and every asset is CC0/original and license-listed. Keep the list short and curated.
5. **Live crossfade vs hard swap.** Baseline allows a hard stop→start scene swap (simplest, no throw). A short crossfade (two players, fade volumes) is a nice-to-have, not required; do not add complexity or a dependency for it.
6. **In-runner control placement (older).** Baseline puts the focus toggle chip in the runner header next to `BalanceChip` (respecting the reserved Grown-ups-door padding). If UX prefers it elsewhere (e.g. a small footer control), that is an additive move; young never gets an in-runner control regardless.
7. **No background execution.** Baseline assumes the soundscape never needs to run while backgrounded (Expo-Go/offline/anti-nag). A backgrounded app stops the bed and does not resume it automatically on return (the child re-toggles) — this is intentional, not a bug.
8. **`startAmbient`/`stopAmbient` back-compat.** Baseline migrates `calm.tsx` to the new `soundscape.ts` API and leaves `sound.ts`'s `startAmbient`/`stopAmbient` (+ its `sound.test.ts`) intact unless the agent chooses to delegate them. If the existing `sound.test.ts` asserts on `startAmbient`, keep those functions working (thin wrappers) to preserve the 335-green baseline.
