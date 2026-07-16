# Feature Spec — Calm Breathing / Regulation Mini-Game (`breathing-regulation`)

Status: ready to build. Additive delta on the shipped, green app (tsc 0, 34 suites / 335 tests).
Research tier: **later / feature #19** ("calm-to-progress / breathing-gated regulation mini-game"), with a free slice of **#20** (optional calm soundscape) (`_build/research/01-feature-matrix.md`). Gap-list items **#10 [PARTIAL]** and **#11 [PARTIAL]** in `_build/spec/01-current-state.md` §4.4.

Hard rules preserved throughout (do not relitigate — locked): **ZERO AI** (no adaptive/LLM guidance, no "recommended pattern," the pet stays a non-AI companion); **NO hardware, NO biofeedback, NO measurement of the child's body/calm** (the "stay-calm-to-grow" growth is driven by *time spent breathing*, never by any sensor or inferred calm); **NO efficacy claims** (never "reduces anxiety / calms your ADHD / regulates you" — it is framed as "a quiet way to slow down and breathe"); **anti-shame** (self-paced, never blocks a routine, no timer-out/fail state, "incomplete is fine"); **no component branches on raw `ageMode`** (only `src/theme` resolvers + capability flags, never an `ageMode` prop); **offline / Expo-Go / web-safe** (deterministic wall-clock/elapsed math, no native timers on the hot path, no background execution). Verify each change with `npx tsc --noEmit`, `npm test`, `npx expo export --platform web`.

> Framing (say this in copy and code comments, never the opposite): this is **a transferable calming skill offered as a self-paced activity**, not a treatment and not a measurement. The verified science (fact-check `biofeedback-emotion-regulation`, `_build/research/01-feature-matrix.md` #19) is that "down-regulate-to-win" biofeedback has only an **emerging** signal (Ducharme 2021) whose **primary anger outcome was null**, in an **ODD (not ADHD)** population, in a **commercially conflicted** trial — i.e. hypothesis-generating only. The safe, honest build the research prescribes is exactly this one: **a no-hardware, self-paced "breathe then proceed" loop** with no efficacy claim. Emotional dysregulation is common in pediatric ADHD and a transferable calming skill is a genuine differentiator (Mightier's niche, `_build/research/00-SYNTHESIS.md`; `40` §10), and the calm/non-gamified path also serves the vocal neurodivergent segment that rejects reward framing (`00-SYNTHESIS` §2.3; `30` §3.6). The optional soundscape leans on white/pink-noise-and-attention evidence that is **plausible but company-funded** (#20) — cite directionally, never as proof.

---

## 1. Overview + user value

A **calm, self-paced breathing activity** that lives on the existing calm destination (`app/(kid)/calm.tsx`) and is optionally offer-able (never forced) from inside the routine loop. It has three honest jobs:

1. **Breathe-with-the-bubble** — a large, glanceable bubble that inflates on the in-breath, holds, and deflates on the out-breath, following a curated, **kid-framed breathing pattern** (e.g. "Bubble breath" 4-in/4-out; older kids can pick "Box breath" or a longer-exhale "Calm 4-6"). Slow, wordless-capable, spoken for non-readers.
2. **Stay-calm-to-grow** — as the child completes breathing **cycles**, a gentle "calm garden"/bubble-cluster **grows one stage per completed cycle**, *purely as a function of cycles finished* (elapsed time on the activity), **never** of any measured calm. The growth is **within-session and resets each visit** — there is no persistent score, so nothing can ever be *lost* (anti-shame). It is a soft "look what a calm minute looks like," not a leaderboard.
3. **A transferable calming skill in the loop** — an optional, **never-blocking** "Take a breath 🫧" offer surfaced on the runner (and specifically on `regulation`-category steps like the seeded `calm_breaths` template). Tapping it runs a short guided set; the child then completes/skips the step exactly as before. This is the *safe* version of "regulate then proceed": **an offer, not a gate.**

It is:

- **Always FREE and calm-mode-friendly.** Regulation is an accessibility/well-being surface, not monetization — it is on the never-gated list (`src/services/entitlements.ts`). Only *extra cosmetic soundscape beds / visual scenes* sit behind the existing `calmSoundscape` premium flag; the full breathing activity + at least one soundscape + all functional patterns are free.
- **Age-adaptive and sensory-safe via resolvers/flags only** (young: one calm default pattern, no chooser, auto-spoken guidance, no numbers; older: a curated pattern picker + an optional cycle count when `showNumbersAndCharts`; lowStim: muted single-hue, no drifting bubbles; Reduce-Motion: a static mid-pose with stepped phase labels, no continuous animation).
- **Non-gamified by construction.** No tokens, no confetti, no celebration overlay, no streak. Finishing a set settles the buddy to a positive restful mood (`rest` → `sleepy`/`content`) and nothing else. This matches the existing calm destination's contract ("NO tokens, NO confetti, NO celebration here").

**The seam already exists.** `app/(kid)/calm.tsx` today renders a single hard-coded 4-in/4-out breathing circle + halo + an ambient-soundscape toggle (`startAmbient`/`stopAmbient` in `src/services/sound.ts`, the `calm.ambient` cue), already honoring `t.motion.loopsEnabled` for lowStim/Reduce-Motion and already stopping audio on blur/unmount. The `calmSoundscape` premium flag already exists in `FEATURE_GATES`. The `calm_breaths` regulation task template already exists (`src/data/taskTemplates.ts`). What is missing is: (a) real, curated multi-phase **patterns** instead of one hard-coded rhythm, (b) the **grow** visual + cycle model, (c) the age-adaptive **picker + guidance copy**, (d) the **non-blocking "breathe" offer** in the runner, (e) the young-shell **entry affordance**, and (f) an optional **premium soundscape/scene** hook. This spec adds only those, additively.

---

## 2. UX behavior — screen by screen

### 2.1 The calm destination (`app/(kid)/calm.tsx`) — upgraded in place

Reachability today: older shell reaches it via the **Calm** tab (`app/(kid)/_layout.tsx` `OlderTabs`); the young single-surface shell registers the `calm` Stack screen but currently exposes **no** way to open it (see §2.5 — this spec adds the young entry affordance). The screen keeps its current contract (no tokens/confetti/celebration; soundscape stops on blur/unmount) and gains:

- **Header:** unchanged calm title ("Calm corner") + one-line subtitle, both via `SpokenLabel` (auto-spoken in young). No token meter, no progress, no score.
- **The breathing bubble:** replaced by the reusable `<BreathingBubble>` (§4 CREATE #2) driven by the **active pattern**. It inflates on inhale, holds at full on hold, deflates on exhale, rests small on hold-out, looping the pattern. A calm phase label ("Breathe in" / "Hold" / "Breathe out" / "Rest") sits inside/under the bubble, resolved via `resolveContent` (auto-spoken in young; on-tap in older). The label + scale are driven by the pure `src/domain/breathing.ts` helper so the animation and the text can never drift apart.
- **Pattern chooser (older / when `breathingChoice`):** a small curated Segmented/Chip row (reusing `components/parent/ui.tsx`/`components/parent/pickers.tsx` chip patterns or a lightweight kid chip) of **3** curated patterns. Young (`breathingChoice === false`) shows **no** chooser — just the single age-resolved default. Choosing a pattern updates the visual immediately and persists the child's preference (§3).
- **Grow visual ("stay-calm-to-grow"):** a gentle "calm garden" / bubble-cluster that starts at stage 0 and advances **one stage each time a full cycle completes**, up to the pattern's `cyclesTarget` (e.g. 4–6). It is a soft, low-motion accretion (a new small bubble/leaf drifts in per cycle), never a bar or number-driven meter for young. On reaching the target, the garden is "full for now," the buddy settles to `rest` (→ sleepy/content), and an optional soft `calm`-level chime plays (see §2.6). The child may keep breathing (it just stays full) or leave. **Leaving/returning resets the grow visual to stage 0** — there is no persistent count to lose.
- **Cycle readout (older only, `showNumbersAndCharts`):** a small tabular-nums "3 of 5 breaths" line. Never shown to young. Never red, never "you missed N."
- **Soundscape toggle:** the existing `startAmbient`/`stopAmbient` toggle stays. On premium (`calmSoundscape` unlocked) a small **bed picker** lets the child switch between extra soundscape beds; free tier shows the single base bed only (see §2.7, §8).

### 2.2 YOUNG (`multiStepVisible === false` / `breathingChoice === false`)

- **One** calm default pattern (age-resolved, e.g. "Bubble breath" 4-in/4-out — no holds, which are hard for little kids), **no** pattern chooser, **no** numbers.
- Guidance auto-speaks the phase ("Breathe in…", "Breathe out…") slowly (calm TTS pitch/rate), and the bubble is large and high-contrast. Framing copy is playful/effort-free ("Blow up the bubble… let it go 🫧").
- The grow visual is the primary "reward" — watching the little garden fill — deliberately gentle, not a score.

### 2.3 OLDER (`multiStepVisible === true` / `breathingChoice === true`)

- A curated **3-pattern** picker (Box breath 4-4-4-4; Calm 4-6 with a longer exhale for down-regulation; Bubble breath 4-4). Respectful, non-babyish copy.
- Optional cycle readout when `showNumbersAndCharts`. Phase label shown as text (spoken on tap, not force-spoken).
- Same grow visual, slightly cooler styling (Tide palette resolves automatically).

### 2.4 Low-stim / calm / Reduce-Motion variants

- **lowStim (`t.motion.loopsEnabled === false`, Stillwater palette):** no drifting background bubbles (already gated in `calm.tsx`), single muted hue, no color-ease drama, no chime by default. The breathing bubble uses a **single, purposeful** `withTiming` per phase (allowed — it is the point of the screen, not decorative parallax) OR the stepped path below.
- **Reduce-Motion (`t.animationDurationScale === 0`):** do **not** run a continuous Reanimated loop. Instead settle the bubble to a **static mid-pose** (the existing `breath.value = 0.5` fallback) and drive the **phase label + grow stage** from a 1 Hz JS interval that reads the pure `breathPhaseAt(pattern, elapsedMs)` helper (deterministic, wall-clock-anchored). No smooth sweep, no worklet loop. The activity is fully usable as a paced *text/spoken* guide even with motion off.
- **calmMode child / `mode:'calm'` routine:** consistent with "calm keeps the routine + audio, drops gamification" — the breathing activity is itself the calm surface; no celebration ever fires here regardless.

### 2.5 Young-shell entry affordance (nav gap fix)

Because the young shell has no tab bar, add a small **oversized "Calm 🌊"** affordance so a young child (or a co-regulating parent) can reach the breathing activity:

- Primary placement: on `components/kid/DaypartDonePanel.tsx` (which young sees when a daypart is done/empty) as a low-emphasis button next to the existing "See what's later" peek → `router.push('/(kid)/calm')`.
- Secondary placement: a small calm affordance in the `TaskRunner` surface (see §2.6). Both use resolved tokens, never raw ageMode.

### 2.6 The non-blocking "breathe" offer in the loop (safe "regulate then proceed")

Inside `components/task/TaskRunner.tsx`, add an **optional, low-emphasis** "Take a breath 🫧" affordance. It **never** blocks, dims, or gates the `DoneButton`; it never changes tokens or celebration. Two concrete surfaces:

- **Global (both shells):** a small calm chip in/near the runner header (or above the young Skip link) → opens the breathing activity. Baseline behavior: `router.push('/(kid)/calm')` (self-contained, simplest). It returns the child to the same routine exactly where they were (the persisted run pointer in `runProgressStore` already preserves position).
- **Regulation-step integration:** when the **active step** is a regulation step — detected by `getTaskTemplate(currentStep.templateId)?.category === 'regulation'` (true for the seeded `calm_breaths`, no data-model change needed) — render a **"Breathe with me"** secondary action beside Done. Tapping runs a short guided set (either navigating to calm, or an inline `<BreathingBubble>` overlay — baseline: navigate). On return, the child taps **Done** as normal. The set is **advisory**: doing it is optional, and *not* doing it never affects completion, tokens, or celebration.

> Anti-shame guardrail for the offer: it is phrased as an invitation ("Feeling wobbly? Take a breath"), never a demand or a precondition ("You must calm down first"). There is no "you're not calm enough" state — the app cannot and does not judge the child's state.

### 2.7 Audio (decoupled, ducking, never hijack)

- The optional **soundscape** reuses the existing `calm.ambient` loop (`startAmbient`/`stopAmbient`), which already routes through the mix-not-hijack session (`setAudioModeAsync({ interruptionMode: 'duckOthers', … })` in `src/services/sound.ts`) — it **ducks** a child's music/podcast, never stops it, and stops on blur/unmount. Off by default; the child toggles it.
- **No looping tick, no per-breath beeping.** Optional soft **pacing cues** (see §2.8) are opt-in and one-shot per phase, not a loop.
- A completed set may play **one** soft `calm`/`gentle`-level chime (reuse an existing soft cue such as `routine.complete` at low volume, or ship a dedicated `calm.chime` cue) — off in lowStim/quiet-hours, and never a "you failed" sting. Baseline: **no chime** (visual-only) to guarantee no hijack; the chime is an opt-in nicety.

### 2.8 Haptics (opt-in, positive-only)

- Optional **breath pacing haptic**: a single soft `impactAsync(Light)` at each phase transition (inhale↔exhale), gated by the child's `hapticsEnabled` **and** a new default-**OFF** "breath pacing" toggle. **Never** `NotificationFeedbackType.Warning`/`Error` (no scolding by vibration — the palette/haptic rules forbid it toward a child), **never** continuous buzzing. Off by default; off in lowStim; off in quiet hours.

---

## 3. Data-model additions (exact TS types/fields + which store) + migration notes

### 3.1 New pure domain module (no persisted change): `src/domain/breathing.ts`

A curated pattern table + deterministic phase math (RN-free, unit-testable):

```ts
import type { AgeMode, VisualLabel } from "./types";

/** One kid-framed breathing pattern (curated; NOT free-form — curated autonomy). */
export interface BreathPattern {
  id: string;                 // 'bubble' | 'box' | 'calm46' (stable ids)
  label: VisualLabel;         // spokenLabel REQUIRED (non-reader support)
  inhaleMs: number;           // > 0
  holdMs: number;             // >= 0 (young default uses 0 — holds are hard for little kids)
  exhaleMs: number;           // > 0
  holdOutMs: number;          // >= 0
  cyclesTarget: number;       // grow stages / "N breaths" for one full set (e.g. 4–6)
  suggestedAgeModes: AgeMode[];
}

export type BreathPhase = "inhale" | "hold" | "exhale" | "holdOut";

/** The curated set (3). Young default = 'bubble'; older picks among all three. */
export const BREATH_PATTERNS: BreathPattern[];          // see §4 for contents
export const BREATH_PATTERNS_BY_ID: Record<string, BreathPattern>;
export function getBreathPattern(id: string | undefined): BreathPattern | undefined;

/** Age-resolved default id (young -> 'bubble', older -> 'calm46'). Overridable. */
export function defaultBreathPatternId(ageMode: AgeMode): string;

/** Total ms for one cycle of a pattern. */
export function cycleMs(p: BreathPattern): number;

/**
 * DETERMINISTIC phase state at a given elapsed time (ms since the set started).
 * Pure — powers BOTH the animation and the Reduce-Motion stepped label, so they
 * can never drift. Returns the phase, its 0..1 progress, the completed-cycle
 * index, and `scale` in [0,1] (inhale 0->1, hold 1, exhale 1->0, holdOut 0).
 */
export function breathPhaseAt(p: BreathPattern, elapsedMs: number): {
  phase: BreathPhase;
  phaseProgress: number;   // 0..1 within the current phase
  cycleIndex: number;      // how many FULL cycles completed
  scale: number;           // 0..1 bubble size
};

/** Completed cycles clamped to cyclesTarget (drives the grow stage 0..target). */
export function growStage(p: BreathPattern, elapsedMs: number): number;
```

Guards: any non-finite/negative phase duration coerces to a safe floor; `inhaleMs`/`exhaleMs` are always positive; an unknown pattern id falls back to the age default via the caller.

### 3.2 One optional, additive per-child setting: preferred pattern

`src/domain/types.ts` — extend `ChildSettings` (additive optional field, same no-migration rule as prior additive fields like `savingTowardRewardId`):

```ts
export interface ChildSettings {
  // …existing fields unchanged…
  /**
   * The child's chosen breathing pattern id (breathing-regulation feature).
   * Optional + additive: absent => the age-resolved default
   * (`defaultBreathPatternId(ageMode)`). A precocious/older kid can pick a
   * different curated pattern; young kids get the single default and no chooser.
   */
  breathingPatternId?: string;
  /**
   * Opt-in soft haptic pulse at each breath phase change. DEFAULT false. Gated by
   * `hapticsEnabled` too; never a Warning/Error haptic; off in lowStim/quiet hours.
   */
  breathingPacingHaptics?: boolean;
}
```

Wire the writes through the existing `useChildStore.updateSettings(cid, patch)` (childStore) — no new store or action needed. `src/domain/constants.ts#defaultChildSettings` may leave both **absent** (so the resolver default applies) or set `breathingPacingHaptics: false` explicitly; either is additive.

### 3.3 Optional opt-in session log (for the future clinician report) — NO new slice

To let the (separate, not-yet-built) **printable clinician progress report** honestly show "used the calming activity," emit an **opt-in, on-device-only** event through the existing path — **only** when `parentSettings.localAnalyticsEnabled === true` (default OFF, §1b.12):

```ts
// in app/(kid)/calm.tsx on a COMPLETED set, gated by localAnalyticsEnabled:
useChildStore.getState().addEvent(cid, {
  ts: now(),
  type: "breathing_session",
  payload: { patternId, cycles, durationMs },
});
```

This reuses `ActivityEvent` + `childStore.addEvent` (already capped at `EVENTS_CAP`, already on the never-leaves-device slice `tb/child/<cid>/events`). **No new persisted slice, no migration.** When analytics is off, nothing is logged (the activity still works fully — logging is never required). *Baseline alternative (open assumption §9):* a dedicated capped `breathingSessions` slice if the report wants richer, always-on (still on-device) history; not required for MVP.

### 3.4 Migration notes (additive, versioned)

- `SCHEMA_VERSION` stays **1**. `breathingPatternId` / `breathingPacingHaptics` are **optional** fields on an already-persisted shape → they merge cleanly via the existing `mergeWithDefaults` / `validateAndRepair` path (`src/storage/migrations.ts`); an older blob simply lacks them (treated as `undefined`). No `MIGRATIONS` entry needed.
- `validateAndRepair` addition (defensive, optional): if `breathingPatternId` is present but not a known id in `BREATH_PATTERNS_BY_ID`, coerce to `undefined` (falls back to the resolved default) — never throw. Coerce a non-boolean `breathingPacingHaptics` to `undefined`.
- If a later change makes a breathing field **required** or changes its meaning, add a forward-only `MIGRATIONS` entry then (engine ready). Not needed now.

---

## 4. EXACT files to CREATE and MODIFY (real paths under `tiny-bubbles/`)

### CREATE

1. `src/domain/breathing.ts` — the pure pattern table + phase math from §3.1. Curated contents:
   - `bubble` — "Bubble breath", 🫧, `inhaleMs 4000 / holdMs 0 / exhaleMs 4000 / holdOutMs 0`, `cyclesTarget 5`, `[young, older]`. (Matches the current `calm.tsx` 4-in/4-out feel; no holds for young.)
   - `box` — "Box breath", ⬜, `4000 / 4000 / 4000 / 4000`, `cyclesTarget 4`, `[older]`.
   - `calm46` — "Calm 4-6" (longer exhale to down-regulate), 🌙, `inhaleMs 4000 / holdMs 0 / exhaleMs 6000 / holdOutMs 0`, `cyclesTarget 5`, `[older]`.
   - `defaultBreathPatternId`: young → `bubble`, older → `calm46`.
2. `components/kid/BreathingBubble.tsx` — the reusable, self-contained animated visual. Props: `pattern: BreathPattern`, `animate: boolean` (from `t.motion.loopsEnabled`), `reducedMotion: boolean` (from `t.animationDurationScale === 0`), `ttsEnabled: boolean`, `pacingHaptics: boolean`, `onCycle?: (cycleIndex: number) => void`, `onComplete?: () => void`, `size?: number`. Reads `useThemeTokens()` for colors/motion; drives the bubble scale from a Reanimated shared value per phase (generalizing the existing `calm.tsx` `withSequence(withTiming…)` approach to arbitrary inhale/hold/exhale/holdOut), OR the static mid-pose + 1 Hz `breathPhaseAt` stepping under Reduce-Motion. Renders the phase label (resolved copy) + optional pacing haptic on phase change. **Never** reads raw `ageMode`/`sensoryMode`/`reducedMotion`-string or takes an `ageMode` prop (it takes resolved booleans).
3. `components/kid/CalmGarden.tsx` (or inline in `BreathingBubble`) — the "stay-calm-to-grow" accretion visual: given `stage` (0..`cyclesTarget`) render N gentle bubbles/leaves drifting in; a soft "full for now" resting state at the top. Purely presentational; resolved tokens only.
4. `__tests__/domain/breathing.test.ts` — unit tests for §3.1: `cycleMs`, `breathPhaseAt` phase boundaries + `scale` monotonicity (inhale rises 0→1, exhale falls 1→0, holds flat), `growStage` clamping at `cyclesTarget`, deterministic recompute across a simulated background gap, guards for zero/negative/NaN durations and unknown ids.
5. `__tests__/components/breathingBubble.test.tsx` — render test: renders a phase label from `resolveContent` (both variants exist); `onCycle`/`onComplete` fire the right number of times for a fixed elapsed sequence; Reduce-Motion path uses the stepped update (no thrown worklet); no red/danger token used (assert against the palette's danger-absence); no `ageMode` prop accepted.

### MODIFY

6. `app/(kid)/calm.tsx` — upgrade in place (§2.1): replace the inline hard-coded circle/halo with `<BreathingBubble pattern={activePattern} …>`; resolve `activePattern` from `getBreathPattern(settings.breathingPatternId) ?? getBreathPattern(defaultBreathPatternId(ageMode))`; render the curated **pattern chooser** only when `caps.breathingChoice`; render `<CalmGarden stage={growStage(...)}/>`; render the older-only cycle readout when `caps.showNumbersAndCharts`; keep the existing soundscape toggle (+ premium bed picker, §8); on a completed set call `buddyStore.applyEvent(cid, 'rest')` and emit the opt-in event (§3.3). Read `ageMode` via `useThemeInputs()`, flags via `useCapabilities()`, tokens via `useThemeTokens()`. Persist a pattern choice via `useChildStore.getState().updateSettings(cid, { breathingPatternId })`.
7. `src/theme/resolveCapabilities.ts` — add `breathingChoice: boolean` to `ModeCapabilities`, `AgeCapBase`, `AGE_CAP_BASE` (young `false`, older `true`), the `ResolveCapabilitiesInput` optional override, and the `resolveCapabilities` return. This is the flag that decides whether the pattern chooser shows (young non-readers get one calm default, no chooser).
8. `src/theme/resolveContent.ts` — add `ModeKeyed` copy keys (both variants required by the `satisfies Record<string, ModeKeyed<string>>` constraint), e.g.:
   - `"breathe.title"`: `{ young: "Breathe with the bubble", older: "Breathe" }`
   - `"breathe.in"`: `{ young: "Breathe in…", older: "Breathe in" }`
   - `"breathe.hold"`: `{ young: "Hold…", older: "Hold" }`
   - `"breathe.out"`: `{ young: "Breathe out…", older: "Breathe out" }`
   - `"breathe.rest"`: `{ young: "Rest…", older: "Rest" }`
   - `"breathe.grow"`: `{ young: "Your calm garden is growing 🫧", older: "Nice and calm." }`
   - `"breathe.offer"`: `{ young: "Take a breath?", older: "Take a breath" }` (the never-blocking loop offer)
   - `"breathe.withMe"`: `{ young: "Breathe with me", older: "Breathe with me" }` (regulation-step action)
   - Keep every string free of urgency/measurement/efficacy words (§6 grep gate).
9. `src/theme/__typetests__/content-typetest.ts` — if it enumerates copy keys, add the new `breathe.*` keys; if it relies on the `satisfies` on `COPY`, no change (auto-covered).
10. `components/task/TaskRunner.tsx` — add the **non-blocking** "Take a breath" affordance (§2.6): a low-emphasis chip that `router.push('/(kid)/calm')`, and a **"Breathe with me"** secondary action on the active step when `getTaskTemplate(currentStep.templateId)?.category === 'regulation'`. **No change** to `onDone`/`onSkip`/token/celebration logic — the offer is purely additive and never gates completion. Import `getTaskTemplate` from `src/data/taskTemplates`; resolve copy via `resolveContent`.
11. `components/kid/DaypartDonePanel.tsx` — add the young-reachable **"Calm 🌊"** entry affordance (§2.5) → `router.push('/(kid)/calm')`, low-emphasis, beside the existing peek button; resolved tokens only.
12. `src/domain/types.ts` — add the two optional `ChildSettings` fields (§3.2).
13. `src/domain/constants.ts` — (optional) set `breathingPacingHaptics: false` in `defaultChildSettings` (or leave absent). Leave `breathingPatternId` absent so the resolver default applies.
14. `app/(parent)/settings.tsx` — add, under the existing "Sound & motion" section, two rows: a **"Default breathing pattern"** control (a curated Segmented of the age-appropriate `BREATH_PATTERNS` → writes `updateSettings(cid, { breathingPatternId })`) and a **"Breath pacing vibration"** `Toggle` (default OFF → `breathingPacingHaptics`). Both persist via the existing per-child settings path. Copy must not claim any calming/therapeutic effect.
15. `src/services/entitlements.ts` — **no change to the gate matrix** (`calmSoundscape` already exists as a premium flag). Confirm breathing itself is **not** added to `FEATURE_GATES` and stays on the never-gated list (regulation/accessibility). Only the *extra soundscape beds/scenes* consult `isFeatureUnlocked('calmSoundscape', …)`.
16. `src/services/sound.ts` + `src/services/playCue.ts` — (only if the premium extra-beds / optional completion chime ship) add the new `CueId`(s) (e.g. `calm.ambient2`, `calm.chime`) to the `CueId` union + `CUE_ASSET`/`CUE_CATEGORY`(`ambient`/`celebration`)/`CUE_VOLUME`, plus a `setAmbientBed(cueId)` selector so the child can switch premium beds. Base bed (`calm.ambient`) stays free. Bundled assets are **CC0/original** and added to `THIRD_PARTY_NOTICES.md` "Bundled assets" section.
17. `assets/sounds/calm-ambient2.wav` (+ optional `calm-chime.wav`) — new bundled **CC0/original** loop/one-shot for the premium bed / optional chime. Only if §16 ships.
18. `components/parent/PremiumGate.tsx` (reuse, no change) — wrap ONLY the premium extra-bed/scene acquisition control in the calm screen's bed picker; never wrap the base breathing activity, base bed, patterns, or grow visual.

> Golden-rule check for the build-agent: `BreathingBubble`, `CalmGarden`, `calm.tsx`, and the runner offer must resolve every age/sensory difference through `useThemeTokens()` / `useCapabilities()` / `useThemeInputs()` / `resolveContent` — **no `ageMode`/`sensoryMode`/`reducedMotion` string reads, no `ageMode` prop.** The breathing pattern is chosen by the parent/older-child from a curated list; the app **never** proposes or adapts one (zero AI).

---

## 5. Reused prebuilt libraries (prefer existing deps)

All already in the stack — **no new dependency required**:
- `react-native-reanimated` (v4) + `react-native-worklets` — the per-phase `withTiming`/`withSequence` bubble scale (exact pattern already in `app/(kid)/calm.tsx`) and the drifting garden bubbles.
- `react-native-svg` (15) — optional for the garden/bubble rendering (or plain animated `View`s; SVG not required).
- `src/theme/*` resolvers + `useThemeTokens`/`useCapabilities`/`useThemeInputs` — colors, `motion.loopsEnabled`, `animationDurationScale`, type scale, the new `breathingChoice` flag, `resolveContent` copy.
- `src/services/sound.ts` (`startAmbient`/`stopAmbient`/`setSoundCategoryEnabled`, the `ambient` category, `duckOthers` session) — the soundscape, unchanged infra; `src/services/playCue.ts` for any optional chime.
- `src/services/tts.ts` + `components/ui/SpokenLabel.tsx` — spoken phase guidance (calm pitch/rate) for non-readers.
- `src/services/haptics.ts` (`expo-haptics` `impactAsync(Light)`) — the opt-in pacing pulse (never Warning/Error).
- `components/parent/ui.tsx` / `components/parent/pickers.tsx` `Segmented`/`Chip` — the curated pattern picker (kid) + the parent default-pattern control.
- `src/state/childStore.ts` (`updateSettings`, `addEvent`) + `src/state/buddyStore.ts` (`applyEvent`) — persistence + the positive `rest` mood.

**No new MIT lib is needed.** (Do not add a "breathing/meditation" package — the pacing is one deterministic elapsed-time function + one shared value; a dependency would be gold-plating and would risk pulling in analytics/hardware/AI surfaces the constraints forbid.)

---

## 6. ANTI-SHAME + no-AI + no-biofeedback rules that apply

- **No measurement, no hardware, no biofeedback.** The app never reads a microphone, camera, sensor, HR, or any signal to infer the child's calm. "Stay-calm-to-grow" grows on **completed cycles only** (elapsed time on the activity). The word "measure"/"detect"/"sensor"/"heart" appears in **no** kid-facing copy (grep-gated).
- **No efficacy / medical claim.** Copy frames it as "a quiet way to slow down and breathe," never "reduces anxiety / calms your ADHD / helps you regulate / improves focus." Both `resolveContent` variants are reviewed and grep-gated.
- **No gate, no block, no fail.** The loop offer is an *invitation*; skipping it never affects completion, tokens, or celebration. The breathing set has no timer-out/"you failed to stay calm"/"try again" state. Reaching the grow target is "full for now"; not reaching it is fine (incomplete is fine). Leaving resets the grow visual — nothing is ever *lost*.
- **No tokens / no celebration here.** Consistent with the calm destination's existing contract: no token payout, no confetti, no `CelebrationOverlay`. A finished set only settles the buddy to a positive restful mood (`applyEvent(cid,'rest')` → `sleepy`/`content` via the positive-only `CompanionMood` union — a negative mood is structurally impossible).
- **No nagging / no companion guilt.** No notification, no "come breathe, Buddy misses you." The buddy is never sad/anxious; it only rests.
- **Zero AI.** Deterministic patterns from a curated table; the parent/older-child picks; the app never proposes, adapts, or "recommends" a pattern, and there is no LLM/assistant anywhere near this surface.
- **Curated autonomy.** Exactly 3 curated patterns (never a free-form duration entry); young gets one default and no chooser.
- **Sensory respect.** lowStim = muted single hue, no drift, no chime; Reduce-Motion = static pose + stepped label; every channel (sound/haptic/TTS/soundscape) independently toggleable; quiet-hours softens audio like every other cue.
- **Audio never hijacks.** The soundscape uses the existing `duckOthers` session; it lowers, never stops, other media, and stops on blur/unmount. No looping tick.

---

## 7. Acceptance criteria + verify steps

### Acceptance criteria
1. The calm screen shows a `<BreathingBubble>` that inflates/holds/deflates following the **active pattern**; young sees one age-default pattern with **no** chooser, older sees a **3-pattern curated chooser** (gated by `breathingChoice`).
2. Guidance phase labels ("Breathe in/Hold/Breathe out/Rest") resolve via `resolveContent` (both variants), auto-speak in young, and stay in sync with the bubble (both driven by `breathPhaseAt`).
3. The **grow** visual advances exactly one stage per completed cycle up to `cyclesTarget`, then rests "full for now"; **leaving and returning resets it to 0**; there is no persistent score and nothing can be lost.
4. Completing a set fires **no** token, **no** confetti, **no** `CelebrationOverlay`; it settles the buddy to a positive restful mood; any completion chime is soft, one-shot, off in lowStim/quiet-hours, and never a "fail" sting.
5. The runner "Take a breath" offer and the regulation-step "Breathe with me" action are **non-blocking**: using or ignoring them never changes completion, tokens, or celebration; the run resumes at the same step afterward.
6. A young child can reach the calm/breathing screen via the new `DaypartDonePanel` "Calm 🌊" affordance (young shell has no tab bar).
7. lowStim uses a muted single hue with no drift; Reduce-Motion uses a static pose + 1 Hz stepped label/grow (no continuous worklet loop); the soundscape ducks (never stops) other audio and stops on blur/unmount.
8. The optional breath-pacing haptic and the premium extra-soundscape bed are **off/locked by default**; the base breathing activity + patterns + one soundscape are fully FREE and never wrapped in `<PremiumGate>`.
9. The child's chosen pattern persists (`ChildSettings.breathingPatternId`) and survives force-quit; an unknown/removed id falls back to the age default without crashing.
10. No component reads raw `ageMode`/`sensoryMode`/`reducedMotion`; no `ageMode` prop is passed to any breathing component. Offline: works in airplane mode; web export builds (visual renders; audio/haptics N/A on web per the strict-subset rule).
11. Opt-in only: a `breathing_session` `ActivityEvent` is logged **only** when `parentSettings.localAnalyticsEnabled === true`; with it off, nothing is logged and the activity still works fully; the event never leaves the device.
12. Existing behavior unchanged: the daypart loop, task completion, tokens, celebration, and every anti-shame state are byte-for-byte the same for children who never open the breathing activity.

### Verify steps (an agent runs)
- `npx tsc --noEmit` → 0 errors (new types + `breathingChoice` flag + `breathe.*` copy compile; `ModeKeyed` forces both variants).
- `npm test` → all suites green incl. new `__tests__/domain/breathing.test.ts` and `__tests__/components/breathingBubble.test.tsx`.
- `npx expo export --platform web` → succeeds (web-safe; audio/haptics degrade to no-op).
- Grep gates:
  - `grep -rni "reduces anxiety\|treats\|cure\|calms your\|regulate you\|heart rate\|biofeedback\|sensor\|measure\|detect\b" app/\(kid\)/calm.tsx components/kid/BreathingBubble.tsx components/kid/CalmGarden.tsx src/domain/breathing.ts src/theme/resolveContent.ts` → zero (no efficacy/measurement claims in copy).
  - `grep -rni "time's up\|failed\|not calm\|try again\|you must\|hurry" app/\(kid\)/calm.tsx components/kid/*.tsx src/theme/resolveContent.ts` → zero (anti-shame copy gate).
  - `grep -rn "ageMode" components/kid/BreathingBubble.tsx components/kid/CalmGarden.tsx` → no raw reads / no `ageMode` prop.
  - `grep -rn "withRepeat\|setInterval" components/kid/BreathingBubble.tsx` → `withRepeat` drives the breathing loop only (standard motion); any `setInterval` is the Reduce-Motion stepping path only; **no** looping audio tick cue.
  - `grep -rn "PremiumGate\|calmSoundscape" app/\(kid\)/calm.tsx` → wraps ONLY the extra-bed/scene picker, never the base activity.
  - `grep -rn "recordCompletion\|completeStep\|earn(\|CelebrationOverlay" app/\(kid\)/calm.tsx` → zero (no tokens/celebration on the calm surface).
- Manual (dev client, from `RUN.md`): open the older Calm tab → pick each of the 3 patterns → bubble paces correctly, garden grows one stage per breath, "full for now" at the target; toggle Reduce-Motion → static pose + stepped label; toggle lowStim → muted single hue, no drift; enable soundscape while a podcast plays → it ducks (not stops); flip to young → single default pattern, no chooser, auto-spoken; from the young runner, complete a `calm_breaths` step's "Breathe with me" then Done → normal completion, no token change; ignore the offer entirely → identical completion.

---

## 8. Dependencies + premium/free classification

### Depends on (all shipped/green — no unbuilt-spec blockers)
- Calm destination + soundscape: `app/(kid)/calm.tsx`, `src/services/sound.ts` (`startAmbient`/`stopAmbient`, `ambient` category, `duckOthers` session), `src/services/playCue.ts` (M13).
- Theming/age engine: `src/theme/*` — `useThemeTokens` (`motion.loopsEnabled`, `animationDurationScale`), `useCapabilities` (+ new `breathingChoice`, `showNumbersAndCharts`), `useThemeInputs` (`ageMode`), `resolveContent` (`ModeKeyed`) (M2).
- Companion mood: `components/buddy/BubbleBuddy.tsx` + `src/state/buddyStore.ts#applyEvent` + `src/domain/companionMood.ts` (`rest` → positive restful mood) (M6).
- Data/stores: `ChildSettings` (M4), `useChildStore.updateSettings`/`addEvent`, `ActivityEvent` opt-in slice; `src/data/taskTemplates.ts` (`calm_breaths`, `getTaskTemplate`, `category:'regulation'`).
- Runner + nav: `components/task/TaskRunner.tsx`, `components/kid/DaypartDonePanel.tsx`, `app/(kid)/_layout.tsx` (the `calm` route is already registered in both shells).
- Parent authoring: `app/(parent)/settings.tsx`, `components/parent/ui.tsx`/`pickers.tsx`.
- Premium seam: `src/services/entitlements.ts` (`calmSoundscape` flag), `components/parent/PremiumGate.tsx` (M12).

### Related specs (no hard dependency)
- **Printable clinician progress report (offline "portal" replacement)** — a *consumer* of the opt-in `breathing_session` `ActivityEvent` (§3.3); this feature only *emits* it (opt-in). Do not couple; the report is a separate spec.
- **Calm/focus soundscape (#20, `calmSoundscape`)** — the premium extra-bed/scene picker rides on that existing flag; the base breathing + one bed + all patterns are FREE and standalone. Do not gate the base.
- **Novelty refresh (#12, `noveltyPipeline`)** — could later rotate new breathing *scenes/soundscapes* additively (nothing earnable ever disappears); build as a consumer, not a blocker.
- **Visual transition timers (#14)** — shares the "calm depleting visual, never an alarm, wall-clock math" philosophy and the `resolveContent`/motion patterns; independent feature, no shared code required.

### Premium vs free
**Core is FREE.** The breathing activity, all 3 curated patterns, the grow visual, the phase guidance/TTS, the non-blocking loop offer, and **one** soundscape bed are always free — regulation is an accessibility/well-being surface on the never-gated list (`src/services/entitlements.ts`), and the locked rule is "the core loop / calm path is always free." It is **not** added to `FEATURE_GATES` and must **never** be wrapped in `<PremiumGate>`.
**Premium (existing `calmSoundscape` flag only):** *extra* cosmetic soundscape beds and optional visual scenes for the calm screen (acquisition only — anything owned stays owned forever on downgrade, §1b.11). This is the sole paid hook; it can never gate the ability to breathe.

---

## 9. Open assumptions

1. **In-place upgrade vs a separate route.** Baseline upgrades `app/(kid)/calm.tsx` (one destination, less surface, no new nav plumbing). If the team wants the "mini-game" to be a distinct pushed route (e.g. `app/(kid)/breathe.tsx`) separate from a bare calm corner, that is an easy additive change (register it in `app/(kid)/_layout.tsx` both shells and point the entry affordances at it); `BreathingBubble`/`CalmGarden`/`breathing.ts` are unchanged either way.
2. **Grow is within-session only.** Baseline assumes the "calm garden" resets each visit so nothing can be lost (anti-shame). If product later wants a persistent, *never-losable* keepsake (e.g. a cosmetic that only ever accretes), model it exactly like companion nurture (monotonic from a lifetime counter) — not a streak — as a separate additive change.
3. **Opt-in event vs dedicated slice (§3.3).** Baseline logs breathing sessions as an opt-in `ActivityEvent` (no new slice, no migration). If the clinician report needs richer/always-on (still on-device) history, a dedicated capped `tb/child/<cid>/breathing` slice can be added additively; not required for MVP.
4. **Regulation-step detection.** Baseline detects a "breathe with me" step via `getTaskTemplate(templateId)?.category === 'regulation'` (no data-model change). If parents should mark *any* task as a breathing step, add an optional `Task.breathing?: boolean` (additive, like `proposed?`) and seed it `true` on `calm_breaths`.
5. **Curated pattern set.** Baseline ships 3 patterns (`bubble`/`box`/`calm46`). Adjustable, but keep it a short curated list (never a free-form seconds field) to honor curated autonomy; young always gets exactly one default and no chooser.
6. **Optional chime + pacing haptic ship OFF.** Baseline is visual-first: the completion chime and pacing haptic are opt-in and default OFF; if audio/haptic polish is deferred, ship the visual-only activity and skip files #16–#17 and the haptic wiring — everything else is unchanged.
7. **Premium beds are cosmetic-only.** Baseline assumes the `calmSoundscape`-gated extras are purely additional *ambience/scenes*, never additional *patterns* (patterns are a calming skill and stay free). If a future premium "pattern pack" is wanted, re-confirm it does not gate a regulation ability before shipping.
8. **No background execution / notifications.** The breathing activity never runs or notifies while backgrounded (Expo-Go/offline constraint); returning simply re-derives the correct phase from elapsed time. There is deliberately no "come back and breathe" reminder (that would risk the nag rule).
