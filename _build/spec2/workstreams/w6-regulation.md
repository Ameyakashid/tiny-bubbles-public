# Workstream w6 — Regulation (emotion ID · sensory profile · break · breathing/calm)

*Durable, buildable spec. Authored 2026-07-09. Owner scope: the **kid app's** regulation surfaces —
emotion identification + a strategy menu, a sensory profile + a persistent BREAK button + low-stim mode,
and breathing/calm. Extends the SHIPPED v1 app (`tiny-bubbles/` → post-migration `apps/kid/`); it does NOT
rewrite it. Authoritative inputs: `_build/research2/00-SYNTHESIS2.md` §1.1(5)/§1.2(7)/§1.2(10),
`_build/research2/01-v2-feature-matrix.md` rows **A5, A6, A7, A10** (+ B5 sensory panel overlap),
`_build/inventory2/emotion-regulation.md`, `_build/spec2/01-current-and-target.md`. Donor code under
`/Users/ameyakashid/Desktop/adhd india/_sources2/`. Mind the SPACE in every path.*

> ## Locked v2 decisions this workstream implements (do NOT relitigate)
> - **EXTEND v1, don't rewrite.** New surfaces reuse v1 engines (`breathing.ts`, `moodInsight`, MoodLog slice,
>   soundscapes, focus-break catalog, resolvers) and follow the shipped `tb/*` storage pattern. `SCHEMA_VERSION`
>   stays **1**, `MIGRATIONS` stays **[]** — every field here is additive/optional.
> - **Build the GENERIC mechanism; do NOT brand or claim "Zones of Regulation".** Mason, Leaf & Gerhardt 2024
>   found Zones™ cannot be categorized as an EBP and one study found it *increased* challenging behavior. The
>   color-arousal abstraction is the reusable, evidence-aligned pattern — never the trademark, never an efficacy
>   claim. **Scaffolds, not therapy.** No sensory-integration-therapy claim (Ayres SI is clinic OT).
> - **`neuroProfile` axis** (autism = predictable/low-stim · ADHD = novelty/bright · both = deterministic core +
>   opt-in previewed novelty) joins `ageMode` as a **resolver input** — NEVER a raw read in a component.
> - **Offline-first, LLM-OFF.** Every feature in this workstream works fully with the network AND the LLM off.
>   No Cloud Function, no proxy call, no egress lives here. Firebase mirroring is additive (parent monitoring).
> - **Anti-shame invariants carry forward:** no failure/loss/guilt state; the companion mood union is
>   positive-only; no saturated "danger red" alarm hue; no auto-advance under the autism preset; every sensory
>   channel is opt-out-able.
> - **License:** ship only MIT/Apache/BSD donor code. Here: `stillwave` (MIT) + `feelings-wheel` (MIT, data).
>   Zones/mood-check-in reference repos are unlicensed → **reference-only** (reimplement the flow, ship no code).
>   `stillwave`'s MIT is verified against the **author's grant** (not just the Expo-template header) before ship;
>   if unverifiable, the breathing visuals are reimplemented as original art (PROVENANCE records the verification).

> ## ⟦v2 FINAL reconciliation — `02-architecture.md` §8 (§8 #33)⟧
> - **`neuroProfile` absent-default = NEUTRAL** (byte-identical v1), NOT `"both"` as the *technical absent-value*
>   (§8 #13). Fix §3.1/§9.3: `ThemeInputs`/`DEFAULT_INPUTS` resolve absent → the neutral preset; `"both"` stands
>   only as the *recommended new-child pick*. (Existing children still render byte-identically either way.)
> - **Regulation activity does NOT write Firestore directly.** `emotion_logged`/`break_taken`/`breathing_done`/
>   `movement_break` are routed through the SHARED `emitActivity(kind,payload)` seam (w1 `src/sync/cloudSync.ts`,
>   §2.4) — w6 calls it from the moods slice + the break/breathing/movement handlers; the outbox + TTL + redaction
>   are w1's. Use the canonical `ActivityKind` names (`breathing_done`, not `breathing_session`; §8 #6).
> - **Evidence-honesty gate bans the BARE trademark** (§8 #23): `regulation-copy-clean.test.ts` matches the shared
>   `assertEvidenceHonestCatalog` standard (bare "zones of regulation" is a hit, independent of an efficacy word).

---

## 1. Overview + user value + verified evidence

### 1.1 What this delivers
A comorbid ADHD + autistic child gets three regulation scaffolds, all non-reading-first, all TTS-everywhere,
all fully offline:

1. **Emotion identification + strategy menu** (feature **A7**). "How do I feel?" → an **age-tiered feelings
   vocabulary** (6 core → 24 → 48, from the MIT `feelings-wheel` taxonomy) with an optional **intensity**
   pick and an optional soft **color-arousal** tint → **"what could help?"** → a curated strategy menu
   (breathe · take a break · move · fidget · tell a grown-up). Extends the shipped `mood-checkin`.
2. **Sensory profile + persistent BREAK button + low-stim mode** (features **A5, A6**). Per-child toggles
   (sound / haptics / motion / dim), a **low-stim master** that composes with the existing `sensoryMode` axis,
   and a low-emphasis **"I need a break"** button reachable from *every* kid surface (mirrors the shipped
   `GrownUpsDoor` overlay pattern) → a break menu offering breathe / calm soundscape / a short movement break /
   dim. Requesting a break — turning a would-be meltdown into a *communicative choice* — is the highest-value use.
3. **Breathing / calm** (enriches the shipped calm corner). Reuses the shipped v1 breathing engine
   (`src/domain/breathing.ts` + `BreathingBubble`) and **enriches** it with `stillwave`'s MIT SVG breathing
   visuals + haptic phase cues, plus a short **guided movement / "wiggle" break** (feature **A10**) from the
   existing curated movement-prompt catalog.

### 1.2 Verified evidence (cite honestly; scaffolds flagged)
- **Emotion-Regulation mechanism — STRONG.** Emotion-Regulation Training is well supported for autistic
  children (Nuske 2023, RCT-graded). Naming/identifying emotions with a graded vocabulary is the evidence-aligned
  core. **BUT the branded "Zones of Regulation™" curriculum is NOT an EBP** (Mason, Leaf & Gerhardt 2024,
  *J Special Education* 57(4):219–229; one study found *increased* challenging behavior). → **Build the generic
  color-arousal + feelings-vocabulary mechanism; never license, name, or claim efficacy for "Zones".**
- **The break / movement — MODERATE (scaffold).** Exercise & Movement is a named EBP; 3–15 min movement reduces
  stereotypy and increases on-task (Fournier 2022; Tarr 2020). The single most therapeutically valuable framing
  is letting the child **request** the break (communicative act), not imposing it. **The app cannot and must not
  claim to deliver sensory-integration therapy** (Ayres SI is clinic OT; Schaaf 2014). Frame as a self-regulation
  *choice*.
- **Predictable, low-stim, non-reading UI — STRONG (cross-cutting).** Intolerance-of-uncertainty predicts autism
  anxiety (Jenkinson 2020, pooled r=0.62); autistic children engage *more* with familiar than novel agent behavior
  (Rakhymbayeva 2021). → deterministic, identical-every-time surfaces; the autism preset defaults to low novelty /
  no auto-advance / sound+haptics off. Competitor failure mode = *requires reading + an adult* (the Zones app has
  no voiceover) — **TTS-everywhere is table stakes.**
- **Breathing — practice-common (scaffold).** The calm corner is a self-paced calming *activity*, **never** a
  health tool: nothing about the child's body is read, no biofeedback, no efficacy/health claim (carried verbatim
  from v1's `breathing.ts` header discipline).

---

## 2. UX behavior — screen by screen (with neuroProfile × ageMode × low-stim variants)

**Golden rule (enforced):** no component reads raw `ageMode` or `neuroProfile`. All variation flows through
resolvers (`resolveEmotionCheckin`, `resolveSensoryProfile`, `resolveCapabilities`, `resolveContent`,
`useThemeTokens`). `neuroProfile` becomes a **resolver input**, never a prop or a branch.

### 2.1 The `neuroProfile` presets (how autism vs ADHD change these surfaces)
Resolved once (see §3.4). Applied consistently across all three surfaces:

| Preset | Emotion surface | Sensory / break | Breathing / calm |
|---|---|---|---|
| **autism** | starts at the SMALLEST tier for the age (6 core faces even for older); intensity + arousal-color **off by default**; **no auto-advance** — child taps "next"; literal-language copy variant | low-stim master **on** by default; sound + pacing-haptics **off** by default; motion = reduced; dim available; break menu ordered calm-first (breathe/dim before movement) | static/low-motion visual default; identical layout every visit; no surprise skin changes |
| **ADHD** | age-default tier; intensity + arousal-color **on**; faster tap-select feedback | low-stim **off**; sound + haptics on; break menu ordered **movement-first** (wiggle break surfaced first) | livelier visual; movement break emphasized |
| **both** (default) | age-default tier; opt-in previewed extras; deterministic core | standard defaults; balanced break menu | deterministic core + opt-in previewed visual skins |

The preset only sets **defaults**; every value remains parent-overridable per child (and OS Reduce-Motion always
clamps motion to off, as today). Existing installs with no `neuroProfile` resolve to **both** → behavior is
byte-identical to v1 for current children (see §3.2 default-safety).

### 2.2 Emotion identification + strategy menu — `app/(kid)/emotions.tsx` (new pushed modal)
Entry points: (a) a low-emphasis **"name it more"** chip added to the existing `mood.tsx` after a weather-face
pick; (b) the **strategy menu is also reachable directly** from the BREAK button and from a `rough`/heightened
mood; (c) from the calm corner. Gated by the same consent as mood check-in (`caps.moodCheckin` AND
`parentSettings.moodLoggingEnabled` AND `settings.moodCheckinEnabled`).

Flow (all steps skippable; nothing is ever required):
1. **"How do you feel?"** — a tap-a-feeling grid/wheel (`EmotionWheel`). Shows exactly `cfg.tier` options
   (young/autism = 6 core; older = 6 core, each expandable to 4 nuanced; preteen = full 48). Each tile carries a
   REQUIRED `spokenLabel` (TTS) + emoji + the emotion's **category color** (soft, desaturated — see anti-shame
   §6). Auto-speaks the prompt for young (pervasive TTS); older speaks on tap.
2. **(optional) intensity** — a 3-cell "a little / medium / a lot" ramp (`cfg.showIntensity`; off by default for
   autism). Skippable.
3. **(optional) arousal color** — a soft 4-tint band (Calm/green · Sad/blue · Angry/red-desaturated ·
   Heightened/yellow) shown ONLY when `cfg.showArousalColor`. **Framed as a neutral category cue, never an
   alarm, never a judgment** — there is no flashing, no "you are in the wrong zone" language, and the label reads
   as a color name, not a trademark.
4. **Log** (one tap) — writes an extended `MoodLog` (§3.1) to the on-device `moods` slice IF logging is enabled
   (defensively re-gated, like `mood.tsx`). A warm "thanks for naming that 💛" line shows; the companion mood
   NEVER turns negative.
5. **"What could help?"** (`EmotionStrategyMenu`) — a curated strategy menu (≤ `caps.maxChoices` = 3 young / 6
   older): **Breathe** → `/(kid)/calm`, **Take a break** → `/(kid)/break`, **Move** → the wiggle break,
   **Fidget** (a calm on-screen fidget or "grab your fidget"), **Tell a grown-up** (a warm prompt — NOT an LLM
   call, NOT a crisis escalation; just "let's find a grown-up"). Offered warmly for any feeling; never a
   correction. The menu order follows the neuroProfile preset (calm-first vs movement-first).

`emotions.tsx` reuses the exact visual/anti-shame discipline of `mood.tsx` (un-gamified pushed modal, no tokens,
no confetti, no streak, no score, close/skip always present).

### 2.3 The persistent BREAK button + break menu — `BreakButton` overlay + `app/(kid)/break.tsx`
- **`BreakButton`** — a low-emphasis, always-present overlay in the kid shell (`app/(kid)/_layout.tsx`), built
  exactly like the shipped `GrownUpsDoor` (absolute-positioned, `zIndex` overlay, hidden over pushed modals so it
  never overlaps their controls). Positioned opposite the grown-ups door (top-left). Label = 🫧 "Break" +
  spoken. One tap → `router.push('/(kid)/break')`. **Reachable from every kid surface** (both the young Stack and
  the older Tabs). Also surfaced as an **AAC "break" tile** — see the AAC workstream dependency (§8); this
  workstream owns the destination route, the AAC workstream owns the tile.
- **`break.tsx`** — an un-gamified menu (no tokens/score): **Breathe** (→ calm), **Calm sounds** (a soundscape
  toggle reusing `SoundscapePicker`), **Move** (the wiggle break, §2.4), **Dim** (toggles the low-stim dim scrim,
  §2.5). Ordered per neuroProfile preset. Big targets, TTS labels, close always present. Choosing a break settles
  the buddy to a positive restful mood (`applyBuddyEvent('rest')`) — never a token, never a celebration (the calm
  contract). Optional on-device event log only when `localAnalyticsEnabled`.

### 2.4 Guided movement / "wiggle" break (feature A10)
A 30–90s optional guided-movement sequence inside the break menu (and as a strategy). Reuses the shipped curated
`MOVEMENT_PROMPTS` (`src/data/focusBreaks.ts`) advanced by the deterministic rotating index already in
`src/domain/focus.ts` (`nextMovementPrompt`) — **no `Math.random`, no AI, no "recommended move"**. Each prompt is
home-safe, equipment-free, TTS-labeled. Framed as positive movement, never "your reward for suffering". A soft
timer/rest visual (reuse `VisualTimer` shape) with **no fail state, no "you missed N"**. Emphasized-first in the
ADHD preset; available but calm-ordered in autism.

### 2.5 Sensory profile + low-stim mode (features A5, A6)
- **Where it's edited:** primarily in the **Parent app** (dependency §8) via `children/{id}/settings`; a
  read-only/self-serve subset (the per-channel toggles the child is allowed to touch) can appear in the kid
  **Sensory & autonomy panel** (shared with Bloop's B5 panel — see §8). This workstream owns the *resolver* and
  the *data shape*; the parent-editing UI is the Parent workstream.
- **Channels:** sound, haptics, motion (animation intensity), and **dim** (a low-stim scrim). The first three
  already exist as `ChildSettings.soundEnabled / hapticsEnabled / reducedMotion` + the `sensoryMode` axis;
  this workstream **consolidates + adds `dim`** via an additive `sensoryProfile` field group (§3.1) and wires the
  `neuroProfile`-derived defaults through `resolveSensoryProfile`.
- **Low-stim master:** `sensoryProfile.lowStim` (default derived from neuroProfile) composes with the existing
  `sensoryMode: "lowStim"` and `parentSettings.lowStimTheme` — when on, it forces the pastel low-arousal palette
  (feed `stillwave`'s tokens into `resolveTokens`, §5), disables decorative motion/particles, and mutes pacing
  haptics. **Never removes a channel the parent explicitly enabled** (opt-out, not a lock).
- **Dim:** implemented as an in-app semi-transparent scrim overlay (NOT system brightness — avoids a new native
  permission; see open assumption §9), toggled from the break menu and persisted per child.

### 2.6 Breathing / calm enrichment — `app/(kid)/calm.tsx` + `BreathingBubble`
- **Keep v1's engine as the source of truth.** `src/domain/breathing.ts` (`BREATH_PATTERNS`, `breathPhaseAt`,
  `growStage`, `defaultBreathPatternId`) and the deterministic phase math stay unchanged — the shipped calm
  corner keeps working exactly. This preserves the invariant that the animation and the Reduce-Motion stepped
  label derive from the *same* pure function and can never drift.
- **Enrich the visual.** Port 2–3 `stillwave` SVG breathing visuals (Bloom / Ocean / Wave) into
  `apps/kid/components/kid/visuals/` and let `BreathingBubble` render one as an optional **skin** driven by the
  same normalized `breathPhaseAt(...).scale` value (additive `visual?` prop; default = the current bubble, so
  existing behavior is unchanged). Skins are an **opt-in, previewed** novelty layer (predictable core stays);
  extra skins are premium ACQUISITION-only (never gate the base breathing — §8).
- **Haptics + TTS** already flow through v1's `fireHaptic`/`speak` behind `hapticsEnabled`/`spokenLabelsEnabled`
  + lowStim + quiet-hours gates (see `calm.tsx`); `stillwave`'s `engine/haptics.ts` `buzz()` phase→cue mapping is
  a **reference** for richer phase/segment/complete cues (v1 `fireHaptic` remains primary).
- **Optional richer session:** `stillwave`'s `useBreathSession` (pause/resume/retention/countdown) may be adopted
  behind a capability for a richer guided session; it uses a different `Segment[]` model, so ship a pure adapter
  `breathPatternToSegments(BreathPattern): Segment[]`. **Recommended default = enrich the existing bubble**
  (keeps the tree green with zero engine swap); adopting `useBreathSession` is an option flagged in §9.

---

## 3. Data model

All additions are **additive + optional** → merge through `mergeWithDefaults` / `validateAndRepair`, are
auto-covered by `collectTbSlices()` backup (whole-`tb/` keyspace), cleared by `wipeAllChildData`, counted in
`DataReview`, and extend the migration-forward fixture. **`SCHEMA_VERSION` stays 1; `MIGRATIONS` stays [].**

### 3.1 Exact TS types (in `packages/shared/src/domain/types.ts`, pre-extraction: `apps/kid/src/domain/types.ts`)

```ts
// --- NEW AXIS (additive union) --------------------------------------------
/** neuroProfile — the predictability/novelty axis (autism vs ADHD). A RESOLVER
 *  INPUT only, never read raw in a component. Existing children without it resolve
 *  to "both" (deterministic core + opt-in novelty) → no behavior change. */
export type NeuroProfile = "adhd" | "autism" | "both";

// --- ChildProfile gains neuroProfile (additive optional) ------------------
export interface ChildProfile {
  // ...existing fields unchanged...
  /** the predictability/novelty axis; absent ⇒ resolves to "both". Parent-set at
   *  child setup, per-child overridable. Additive/optional → NO schema bump. */
  neuroProfile?: NeuroProfile;
}

// --- Sensory profile (additive field group on ChildSettings) --------------
export type MotionLevel = "full" | "reduced" | "off";
export interface SensoryProfile {
  /** master low-stim toggle; composes with sensoryMode + parentSettings.lowStimTheme */
  lowStim: boolean;
  /** animation intensity ceiling (composes with OS Reduce-Motion, which clamps to off) */
  motionLevel: MotionLevel;
  /** in-app dim scrim 0..0.6 (0 = off). NOT system brightness. */
  dimLevel: number;
  /** per-channel opt-outs (mirror/authoritative-over the existing flat booleans) */
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}
export interface ChildSettings {
  // ...existing fields unchanged...
  /** Optional consolidated sensory profile. Absent ⇒ derived from neuroProfile +
   *  the existing soundEnabled/hapticsEnabled/reducedMotion/sensoryMode via
   *  resolveSensoryProfile(). Additive/optional → NO schema bump. */
  sensoryProfile?: SensoryProfile;
}

// --- Emotion log = ADDITIVE optional fields on the shipped MoodLog ---------
/** Reuses the existing `moods` slice + addMood(). Values are LITERAL taps from
 *  the taxonomy (enum-like), never an interpretation (ZERO-AI, banned-token gate). */
export interface MoodLog {
  // ...existing fields unchanged...
  /** canonical core emotion key from the taxonomy, e.g. "happy" | "angry" | "calm" */
  emotionCore?: EmotionCoreId;
  /** optional nuanced ring-2/ring-3 leaf key, e.g. "frustrated" | "playful" */
  emotionLeaf?: string;
  /** 1..3 intensity (a little / medium / a lot); absent ⇒ not asked */
  intensity?: 1 | 2 | 3;
  /** the strategy the child chose from the menu, e.g. "breathe" | "break" | "move" */
  strategyId?: string;
}
```

### 3.2 Emotion taxonomy (born-shared) — `packages/shared/src/emotion/taxonomy.ts`
Port the MIT `feelings-wheel` `languages/en.toml` (+ `de/es/fr/tr`) into a typed constant. Preserve
`ATTRIBUTION.md`.

```ts
export type EmotionCoreId = "happy" | "surprised" | "angry" | "scared" | "sad" | "calm";
export interface EmotionCore {
  id: EmotionCoreId;
  /** REQUIRED spokenLabel (TTS) + display text + emoji */
  label: VisualLabel;
  /** soft, desaturated category tint (from PALETTE, languages.py:15) — NOT an alarm hue */
  color: string;
  /** ring-2: 4 nuanced feelings (ages ~9–12) */
  feelings: string[];
  /** ring-3: [a,b] leaf pairs per ring-2 feeling (ages 12+) */
  leaves: [string, string][];
}
export const EMOTIONS: readonly EmotionCore[]; // 6 cores, canonical order
/** age/neuro-tiered accessors: coresOnly() | withFeelings() | full() */
```
- **PALETTE mapping (source of truth for arousal color):** Green=Calm `#56B27E`, Blue=Sad `#4F8FCB`,
  Red=Angry `#DB504A`, Yellow=Happy/heightened `#F4C430`, Surprised `#E8833A`, Scared `#9B6FB0`. These are
  **desaturated/softened** before use (anti-shame §6) so "angry red" is a calm category tint, never a danger alarm.
- **Age tiers = built-in complexity ramp:** 1 ring (6 core) young/autism · 2 rings (6→24) older · 3 rings (48)
  preteen. Fewer options = lower cognitive/sensory load.

### 3.3 Which slice / collection
- **On-device (source of truth, offline-first):**
  - Emotion logs → existing per-child **`moods`** slice (`tb/child/<cid>/moods`) via the shipped `addMood()`.
    No new slice.
  - Sensory profile + neuroProfile → existing per-child **`profile`** slice (`ChildProfile.neuroProfile`,
    `ChildSettings.sensoryProfile`) via `updateProfile` / `updateSettings`. No new slice.
  - Dim scrim state → `ChildSettings.sensoryProfile.dimLevel` (persisted).
- **Firestore (additive oversight/sync; owned by the sync workstream, shape proposed here):**
  - `children/{childId}` gains `neuroProfile`, `sensoryProfile` (parent edits down, kid caches).
  - `children/{childId}/settings/{doc}` mirrors the per-child controls for parent editing.
  - `children/{childId}/activity/{eventId}` gets **privacy-minimal** mirrored regulation events for the parent
    glance: `emotion_logged` (core + intensity + strategy, **no free-text note**), `break_taken`,
    `breathing_session`, `movement_break`. **PII-redacted before storage** (the `note` field is NEVER synced),
    TTL-expiring. This is monitoring only; the child's tools never depend on it.

### 3.4 Additive-sync + offline-first + the resolver threading
- **Source of truth stays on-device** (the "never brick the child" substrate). The Firebase sync adapter (sync
  workstream) mirrors *up* the minimal activity events for monitoring and pulls *down* parent-authored
  neuroProfile/sensory settings — when online. With network off, everything works.
- **neuroProfile flows through `ThemeInputs`:** add `neuroProfile: NeuroProfile` to `ThemeInputs` +
  `DEFAULT_INPUTS` (`= "both"`) in `src/theme/ThemeProvider.tsx`; the provider reads it from the active
  `ChildProfile.neuroProfile ?? "both"`. `useCapabilities`/`useThemeTokens` pass it into the resolvers. **No
  component ever reads it directly.**

---

## 4. Exact files to CREATE / MODIFY (real monorepo paths)

Paths are the post-migration `apps/kid/…` / `packages/shared/…` layout (`_build/spec2/01-current-and-target.md`
§2). Pre-migration equivalents drop the `apps/kid/` prefix (i.e. `tiny-bubbles/…`). If `packages/shared` is not
yet extracted, land shared modules under `apps/kid/src/…` and re-export later (extraction discipline, §8).

### CREATE
| Path | Purpose |
|---|---|
| `packages/shared/src/emotion/taxonomy.ts` | typed `EMOTIONS` + `EmotionCoreId` + PALETTE arousal colors + tier accessors (from `feelings-wheel`) |
| `packages/shared/src/emotion/index.ts` | barrel export |
| `apps/kid/src/domain/emotion.ts` | pure selectors: tier resolution, arousal-color softening, emotion-log counts (RN-free, unit-tested) |
| `apps/kid/src/data/emotionStrategies.ts` | curated strategy catalog (breathe/break/move/fidget/tell-a-grown-up), each `VisualLabel` + route + neuro-order weight |
| `apps/kid/src/theme/resolveEmotionCheckin.ts` | pure resolver: `{ ageMode, neuroProfile, sensoryMode } → { tier, showIntensity, showArousalColor, autoSpeakPrompt, autoAdvance }` |
| `apps/kid/src/theme/resolveSensoryProfile.ts` | pure resolver: `{ neuroProfile, ageMode, settings, os } → resolved SensoryProfile defaults` |
| `apps/kid/components/kid/EmotionWheel.tsx` | tap-a-feeling grid/wheel (age-tiered rings, TTS, no raw ageMode) |
| `apps/kid/components/kid/EmotionStrategyMenu.tsx` | "what could help?" curated menu |
| `apps/kid/components/kid/BreakButton.tsx` | persistent low-emphasis break overlay (mirrors `GrownUpsDoor`) |
| `apps/kid/components/kid/DimScrim.tsx` | in-app low-stim dim overlay (persisted `dimLevel`) |
| `apps/kid/components/kid/visuals/{BloomVisual,OceanVisual,WaveVisual,common}.tsx` | ported `stillwave` SVG breathing visuals (MIT) |
| `apps/kid/app/(kid)/emotions.tsx` | emotion-ID + strategy pushed-modal screen |
| `apps/kid/app/(kid)/break.tsx` | break-menu pushed-modal screen (breathe/sounds/move/dim) |
| `apps/kid/__tests__/domain/emotion.test.ts` | tier/selectors/arousal-softening + banned-token output gate |
| `apps/kid/__tests__/theme/resolveEmotionCheckin.test.ts` | exhaustive age×neuro×sensory table |
| `apps/kid/__tests__/theme/resolveSensoryProfile.test.ts` | neuroProfile defaults + opt-out-never-lock |
| `apps/kid/__tests__/config/regulation-copy-clean.test.ts` | grep gate: no "Zones of Regulation"/therapy/cure/efficacy strings |
| `apps/kid/__tests__/render/emotions.render.test.tsx`, `break.render.test.tsx` | render smoke |

### MODIFY
| Path | Change (additive) |
|---|---|
| `packages/shared/src/domain/types.ts` (or `apps/kid/src/domain/types.ts`) | add `NeuroProfile`, `MotionLevel`, `SensoryProfile`; `ChildProfile.neuroProfile?`; `ChildSettings.sensoryProfile?`; MoodLog `emotionCore?/emotionLeaf?/intensity?/strategyId?` |
| `apps/kid/src/theme/resolveCapabilities.ts` | add `neuroProfile?` to `ResolveCapabilitiesInput`; derive `predictableMode`/`noAutoAdvance` + default `sensoryMode` bias; unchanged when absent |
| `apps/kid/src/theme/ThemeProvider.tsx` | add `neuroProfile` to `ThemeInputs` + `DEFAULT_INPUTS` (`"both"`); read from active profile; pass into resolvers |
| `apps/kid/src/i18n/en.ts` | add `emotion.*`, `strategy.*`, `break.*` copy keys (both age variants; literal-language autism variants where relevant) |
| `apps/kid/app/(kid)/_layout.tsx` | mount `<BreakButton>` overlay in both shells; register `emotions` + `break` as `presentation:"modal"` routes; hide `BreakButton` over pushed modals (extend the existing `last === …` guard) |
| `apps/kid/app/(kid)/mood.tsx` | add a low-emphasis "name it more" chip → `/(kid)/emotions` (additive; mood.tsx otherwise unchanged) |
| `apps/kid/app/(kid)/calm.tsx` | render an optional `stillwave` SVG visual skin; add break/emotion entry chips (additive) |
| `apps/kid/components/kid/BreathingBubble.tsx` | accept optional `visual?` skin prop (default = current bubble); drive skin from the same `breathPhaseAt().scale` |
| `apps/kid/src/domain/moodInsight.ts` | add emotion-count selectors (literal counts only; extend the banned-interpretation gate whitelist with the taxonomy words) |
| `apps/kid/THIRD_PARTY_NOTICES.md`, `apps/kid/PROVENANCE.md` | add `stillwave` (MIT) + `feelings-wheel` (MIT, preserve its `ATTRIBUTION.md`) |
| `apps/kid/__tests__/storage/*` migration-forward fixture | add an old profile without `sensoryProfile`/`neuroProfile` and an old MoodLog without emotion fields → prove clean merge, `SCHEMA_VERSION` still 1 |

**No `functions/` changes.** This workstream adds no server code, no proxy call, no egress.

---

## 5. Reused donor parts (repo · license · files)

| Donor (local `_sources2/…`) | License | Ship? | Concrete parts used here |
|---|---|---|---|
| **`stillwave`** | **MIT** | ✅ ship | `src/components/visuals/{BloomVisual,OceanVisual,WaveVisual,common}.tsx` (port to `apps/kid/components/kid/visuals/`, drive from v1 `breathPhaseAt().scale`); `src/engine/haptics.ts` `buzz()` phase→cue mapping (**reference** for phase/segment/complete cues; v1 `fireHaptic` stays primary); `src/constants/theme.ts` pastel low-arousal tokens (feed `resolveTokens` lowStim); `src/engine/useBreathSession.ts` (**optional** richer session behind an adapter — see §2.6/§9); `src/data/methods.ts` (reference for pattern shape). *LICENSE file is the Expo-template MIT header — still genuinely MIT; attribute.* |
| **`feelings-wheel`** | **MIT** (data) | ✅ ship | `languages/en.toml` (+ `de/es/fr/tr`) → typed `EMOTIONS`; `PALETTE` (`languages.py:15`) → arousal category colors; kid copy (`subtitle`, `howto_*`, calendar prompts) as microcopy seeds. **Preserve `ATTRIBUTION.md`.** Python generator is not stack-relevant — the value is the **data + tiering + wording + palette**. |
| `speakeasy-aac` | MIT | ✅ (cross-ref) | `src/types/index.ts` `Symbol`/`Board` — only relevant for the **AAC "break" tile**; owned by the AAC workstream, referenced here for the break entry point. |
| `TheDormouse/ZOR`, `SharonBello/zones-of-regulation` | **NONE** (all-rights-reserved) | ❌ ref-only | Zones check-in *flow/interaction* reference — reimplement in RN, **ship no code**, and do **not** adopt the "Zones" branding. |
| `louiechristie/mood-check-in` | **NONE** | ❌ ref-only | Check-in UX / charting reference only. |
| `breathly-app` | MPL-2.0 (weak copyleft) | ❌ ref-only | Breathing-catalog reference; **`stillwave` (MIT) supersedes it.** |
| `tiratatp/feelings_wheel`, `Dimm-ddr/My-Feelings-Tracker` | MIT (off-stack, Android) | ❌ ref-only | Interaction / taxonomy reference (not cloned; off-stack). |

**v1 engines reused (not donors — the shipped tree):** `src/domain/breathing.ts`, `components/kid/{BreathingBubble,
CalmGarden,SoundscapePicker}.tsx`, `app/(kid)/calm.tsx`, `app/(kid)/mood.tsx`, `src/domain/moodInsight.ts`,
`src/data/moodScale.ts`, `src/data/focusBreaks.ts` + `src/domain/focus.ts` (`nextMovementPrompt`),
`src/services/{tts,haptics,soundscape}.ts`, `src/theme/resolveMoodCheckin.ts`, `src/theme/resolveCapabilities.ts`,
`app/(kid)/_layout.tsx` `GrownUpsDoor` (the overlay pattern for `BreakButton`).

---

## 6. Safety + anti-shame + COPPA rules that apply

1. **Evidence honesty / no-Zones (HARD).** Never use the string "Zones of Regulation", the trademark, or any
   efficacy/therapy/cure/"clinically proven"/"self-regulation therapy"/"sensory-integration therapy" claim in
   any kid- or parent-facing copy. Build the **generic** color-arousal + feelings-vocabulary mechanism. Enforce
   with a **copy gate** (`__tests__/config/regulation-copy-clean.test.ts`) modeled on the shipped
   `BANNED_REMINDER_PATTERNS` / `isReminderCopyClean` discipline — grep `app/`, `src/`, `components/`, and the
   resolved i18n catalog for banned patterns → 0 hits. Copy stands on the *practice*, never the *product*.
2. **Anti-shame invariants (carried from v1).** No failure/loss/guilt state anywhere; the companion mood union
   stays **positive-only** (naming "angry"/"rough" never makes the buddy sad/angry — it offers warmth + a
   strategy). **No saturated danger-red alarm:** the Angry category tint is desaturated and used as a neutral
   identifier, never a flashing/error state (consistent with `moodScale.ts` deliberately having no red danger
   hue). The strategy menu is offered warmly for *any* feeling — never a correction.
3. **Predictability (autism).** Under the autism preset: **no auto-advance** (the child taps "next"); identical
   layout/reactions every visit; the breathing visual + Bloop co-regulation are deterministic and never
   surprise-change. Novelty (extra visual skins) is **opt-in + previewed**, never a surprise UI change.
4. **Every sensory channel is opt-out-able.** Sound, haptics, motion, dim — each independently. Low-stim mode
   *composes* (never forces on a channel the parent explicitly enabled); OS Reduce-Motion always clamps motion.
   Pacing haptics stay off by default, gated by `hapticsEnabled` + lowStim + quiet-hours (as shipped).
5. **Scaffold, not therapy.** Breathing reads nothing about the child's body (no biofeedback, no health claim).
   The break is a self-regulation *choice*, not SI therapy. Movement prompts are curated + deterministic.
6. **COPPA-2025 / UK Children's Code.** Emotion logging is **opt-in + off by default** (reuses the shipped
   `moodLoggingEnabled` master + per-child `moodCheckinEnabled`, defensively re-gated on write). **No ad/analytics
   SDKs** in the kid app. If mirrored to Firestore for parent monitoring: **PII-redacted before storage** (the
   free-text `note` is NEVER synced — only enum core/intensity/strategy), **minimal**, **TTL-expiring**. Everything
   works fully offline. **No LLM in this workstream** → no PII-to-model risk, no crisis path here (the "tell a
   grown-up" strategy is a warm in-app prompt, not an LLM call and not a crisis escalation).
7. **"Tell a grown-up" ≠ crisis pipeline.** This strategy simply encourages finding a trusted grown-up; it does
   not invoke Bloop, the proxy, or the crisis-hotline machinery (that lives in the Bloop-proxy workstream).

---

## 7. Acceptance criteria + verify steps

**Functional acceptance**
- [ ] Emotion screen shows exactly the resolved tier (6 young/autism · 6→24 older · 48 preteen); every tile has a
      spoken label; auto-speaks the prompt in young; older speaks on tap.
- [ ] Intensity + arousal-color are hidden by default under the autism preset and shown under ADHD/older; the
      arousal band is desaturated, non-flashing, non-alarming.
- [ ] Logging an emotion writes an extended `MoodLog` to the `moods` slice **only** when logging is enabled;
      companion mood never goes negative; a warm thanks line shows.
- [ ] The BREAK button is present on every kid surface, hidden over pushed modals, and routes to the break menu;
      the menu offers breathe/sounds/move/dim, ordered per neuroProfile preset.
- [ ] The wiggle break rotates deterministically through `MOVEMENT_PROMPTS` (no RNG), with no fail/miss state.
- [ ] Low-stim master forces the pastel palette + kills decorative motion/particles + mutes pacing haptics, and
      never disables a channel the parent explicitly enabled; OS Reduce-Motion still clamps motion to off.
- [ ] The calm corner renders unchanged by default; an opt-in `stillwave` skin renders when selected, driven by
      the same phase math (animation + Reduce-Motion label cannot drift).
- [ ] Existing children (no `neuroProfile`/`sensoryProfile`) behave byte-identically to v1.

**Verify commands** (root workspace; pre-migration: run in `tiny-bubbles/`)
```bash
# types + tests green
npm -w @tiny-bubbles/kid run typecheck            # tsc = 0
npm -w @tiny-bubbles/kid test                     # all suites incl. new ones
# shared (if extracted)
npm -w @tiny-bubbles/shared run typecheck && npm -w @tiny-bubbles/shared test
# no-egress gate still green over the app tree (this workstream adds none)
npm -w @tiny-bubbles/kid test -- no-network
# additive persistence proof
npm -w @tiny-bubbles/kid test -- storage          # SCHEMA_VERSION stays 1, MIGRATIONS []
# evidence-honesty copy gate
npm -w @tiny-bubbles/kid test -- regulation-copy-clean
# golden-rule: no raw ageMode/neuroProfile branch in components
grep -rnE '\b(ageMode|neuroProfile)\s*===' apps/kid/components apps/kid/app | grep -v '__tests__' # → expect none
# export smoke
npm -w @tiny-bubbles/kid run export   # or: npx expo export
```
- [ ] `grep -rin "zones of regulation\|sensory integration therapy\|clinically proven\|cure" apps/kid/{app,src,components}` → **0**.
- [ ] Migration-forward fixture: an old profile blob (no `sensoryProfile`/`neuroProfile`) + an old MoodLog (no
      emotion fields) load, merge, and round-trip; no bump.
- [ ] `THIRD_PARTY_NOTICES.md` lists `stillwave` (MIT) + `feelings-wheel` (MIT); `feelings-wheel/ATTRIBUTION.md`
      preserved. (No `functions/` emulator step — nothing server-side in this workstream.)

---

## 8. Dependencies · premium/free · LLM-on/off

**Depends on other workstreams**
- **Monorepo / shared (w1-ish):** `packages/shared` scaffold + the `NeuroProfile` union and `emotion/taxonomy.ts`
  ideally land shared. If not yet extracted, land under `apps/kid/src/` and re-export later (one module per
  commit, kid suite green each step).
- **AAC (w-aac):** owns the **AAC "break" tile** and the "tell a grown-up" AAC affordance; this workstream owns
  the `/(kid)/break` destination + strategy catalog. Shares the `Symbol`/`Board` model (speakeasy-aac).
- **Parent app (w-parent):** the sensory profile + `neuroProfile` + emotion-log **glance/edit** UI lives in the
  Parent app (`children/{id}/settings`, `/activity`); this workstream owns the shape + resolver + kid surfaces.
- **Sync/backend (w-sync):** mirrors the minimal regulation activity events up (monitoring) and pulls
  neuroProfile/sensory settings down. Offline-first: the on-device slices are the source of truth.
- **Bloop character (w-bloop-char):** Bloop's **Co-regulate/Breathe** and **Mood-mirror** states can subscribe to
  the breathing phase + the chosen emotion — deterministic, no LLM. This workstream exposes the breathing progress
  and the emotion pick; it does not depend on Bloop (works fully with Bloop off). The kid **Sensory & autonomy
  panel** is shared with Bloop's B5 panel — coordinate one panel, two feature owners.

**Premium / free**
- **FREE (always, never gated):** emotion identification + strategy menu, the BREAK button + break menu, low-stim
  mode, the sensory profile, base breathing/calm, the wiggle break. Regulation tools are safety infrastructure —
  never behind a paywall.
- **PREMIUM (acquisition-only, never retention):** extra breathing **visual skins** and extra soundscape beds
  (soundscape premium gating already exists in v1). Gating a *cosmetic* is fine; the underlying regulation tool is
  always available. No feature here is ever *removed* on downgrade (acquisition-only invariant).

**LLM-on vs LLM-off**
- **Identical.** This entire workstream is **LLM-off by construction** — no proxy call, no egress, no crisis
  path. With the LLM **on**, the only difference is cosmetic: Bloop's character layer *may* animate a
  co-regulation/mood-mirror loop alongside the (already fully functional) breathing/emotion surfaces. Nothing here
  breaks, changes behavior, or requires the network when the LLM is disabled or offline.

---

## 9. Open assumptions
1. **Breathing engine:** default = **enrich** the shipped `BreathingBubble` with ported `stillwave` SVG visuals
   driven by v1 `breathPhaseAt` (zero engine swap, tree stays green). Adopting `stillwave`'s `useBreathSession`
   wholesale (pause/resume/retention) is a flagged option requiring a `breathPatternToSegments` adapter — deferred
   unless a richer session is explicitly wanted.
2. **Emotion surface shape:** default = a **new `emotions.tsx`** route (richer feelings + strategy) plus a minimal
   "name it more" chip on the existing `mood.tsx` (quick weather check-in stays). Alternative: fold everything into
   `mood.tsx` — rejected to avoid bloating the shipped green file.
3. **`neuroProfile` default:** absent ⇒ **"both"** so existing children are unchanged. The autism/ADHD presets
   are opt-in (parent-set at child setup). If the product wants autism-safe-by-default, that's a product decision
   to flip the default — flagged, not assumed.
4. **Dim = in-app scrim**, not system brightness (avoids a new native permission / `expo-brightness`). If true
   system brightness control is required, add `expo-brightness` (new native dep + permission) — deferred.
5. **Arousal-color visual** ships in MVP but **off by default** for young/autism; whether it ships at all is a
   product/clinical-review call (it is the closest thing to the Zones abstraction — kept generic + desaturated to
   stay evidence-honest).
6. **Which `stillwave` visuals** to port: Bloom / Ocean / Wave (read as friendly expanding bubbles). Others
   (Box/Feather/Moon/Lotus/Ember/Aurora) available if wanted.
7. **Firestore mirroring shape** for regulation events is proposed here but **owned/finalized by the sync
   workstream**; on-device remains source of truth regardless.
8. **i18n:** the `feelings-wheel` taxonomy ships 5 languages (en/de/es/fr/tr); the kid app ships `en` first with
   the others available when the locale catalog is wired (reuses v1 `src/i18n/` + `parentSettings.locale`).
