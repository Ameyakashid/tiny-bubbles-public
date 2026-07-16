# Feature Spec — Adjustable Focus Intervals + Active Breaks (`focus-intervals`)

Status: ready to build. Additive delta on the shipped, green app (tsc 0, 34 suites / 335 tests).
Research tier: **later / feature #22** (`_build/research/01-feature-matrix.md`). Gap-list item **#14 [MISSING]** in `_build/spec/01-current-state.md` §4.4 ("#22 Adjustable focus intervals + active breaks (Pomodoro)").

Hard rules preserved throughout (do not relitigate — locked): **ZERO AI** (durations from a curated list, movement prompts from a fixed curated array, no "recommended length", no adaptive/LLM logic); **anti-shame** (no "you lost focus / gave up / broke your streak"; pausing and stopping are always free and neutral; incomplete is fine); **NON-rigid** (user-adjustable focus AND break length, deliberately NOT a fixed 25/5); **older-kids-only** via a capability flag (never raw `ageMode`, never an `ageMode` prop); **offline / Expo-Go / web-safe** (wall-clock math, no native timer, no background execution). Verify each change with `npx tsc --noEmit`, `npm test`, `npx expo export --platform web`.

> **Science framing (say this in copy + code comments; never the opposite).** Pomodoro/time-boxing evidence is **thin, mixed, and NOT ADHD-specific**, and a rigid 25/5 cadence actually *increased* fatigue in the cited work (fact-check `pomodoro-timeboxing`, `_build/research/01-feature-matrix.md` #22; `_build/research/00-SYNTHESIS.md` — moderate-not-magic rule). So this ships as an **optional organizational scaffold**, offered and never forced, with **user-adjustable** intervals biased toward **shorter blocks + active movement breaks** for kids. Market/community demand is real but modest (`20` §10: an offered, non-forced focus scaffold for older kids). **Never** market it as "ADHD-proven", "improves focus/attention", or a treatment — this feature closes an *organizational-tool* gap, not a clinical one.

---

## 1. Overview + user value

An **optional, adjustable focus/break cycle** that an OLDER child can launch to work in short, self-chosen blocks separated by **active movement breaks**. It is:

- **Opt-in twice over.** It is **older-mode only** (a hard age ceiling via `capabilities.focusIntervalsAvailable`; a 4–7 non-reader never sees it) AND a **parent toggle** (`ChildSettings.focusIntervals.enabled`, default **off**). Only when both are true does any entry point appear.
- **Non-rigid.** The child picks the focus length and break length from **curated short lists** at the start of every session ("be the boss" autonomy, `40` §9), pre-filled from the parent's defaults but adjustable. The default is **15 min focus / 5 min break** — deliberately not the fatiguing rigid 25/5.
- **Movement-first breaks.** Each break shows one **active-movement prompt** ("Do 5 star jumps", "Stretch up high") from a fixed curated list — the science-honest bit for kids (shorter blocks + get-up-and-move, not sit-and-wait).
- **Advisory, never coercive.** A block ending never auto-completes anything, never locks the UI, never flashes red, never nags, never changes tokens. **Pause** and **Stop** are always one tap and always neutral. Ending early is calm ("Nice focusing — come back any time"). Incomplete is fine.
- **Token-neutral by default.** A focus session is a *self-directed scaffold*, not a parent-assigned chore, so it earns **no tokens** in the baseline — this keeps it from becoming a "focus-for-rewards" grind/compulsion (the loot-box line we refuse, `40` §11). The economy stays anchored to real routines. (See §9 open assumption for an optional gentle completion token if a team wants one.)

**Why it earns its place (honest):** it is a lightweight executive-function scaffold that a specific, vocal older-kid segment asks for, offered inside a calm frame and gated by the anti-shame/no-AI rules so it can't degrade into a countdown-doom or compulsion mechanic. It is **not** load-bearing for retention and is correctly a "later"-tier differentiator.

**What already exists to build on:** the core loop runner, the calm depleting-ring pattern (`components/progress/BubbleMeter.tsx` — hand-rolled Reanimated + `react-native-svg` `Circle` `strokeDashoffset`), the theming/age engine (`resolveCapabilities`/`resolveContent`/`useThemeTokens`), the ducking sound registry (`src/services/sound.ts`), and the kid shell routing (`app/(kid)/_layout.tsx`). This spec adds the session state machine, the screen, the movement-prompt data, the age/copy plumbing, and the parent controls — nothing else.

---

## 2. UX behavior — screen by screen

### 2.0 Availability + entry point
- Rendered **only** when `capabilities.focusIntervalsAvailable === true` (older) **AND** `settings.focusIntervals?.enabled === true`. If either is false, **no entry point renders anywhere** and nothing else in this spec is reachable.
- **Entry point (low-emphasis):** a small "🎯 Focus timer" launcher on the OLDER Today surface — added to `components/kid/DaypartDonePanel.tsx` (the calm "all done for now" / "nothing scheduled" state is a natural moment to offer focused work) and, optionally, a compact launcher in `app/(kid)/index.tsx`. It pushes the `/(kid)/focus` route. It is never a primary CTA and never auto-opens.
- The launcher is **never shown in the young single-surface shell** (the capability is false there), so `StepCard`/`TaskRunner`/`DaypartDonePanel` gate it purely on `capabilities`, never a raw `ageMode` read.

### 2.1 `app/(kid)/focus.tsx` — a four-state screen (all older-mode)
The screen is a thin host around `components/focus/FocusSession.tsx`, which is a small state machine driven by `src/state/focusSessionStore.ts`. Phases: **`setup` → `focus` → `break` → (`focus`…) → `done`**. Backing out (the modal close / hardware back) at any point simply stops the session (neutral).

#### (a) `setup`
- Three curated controls, pre-filled from `settings.focusIntervals` (parent defaults) but freely adjustable by the child this session:
  - **Focus length** — a `Segmented`/`Chip` row of `FOCUS_MINUTE_OPTIONS = [10, 15, 20, 25]` (default 15). No free-form entry (curated autonomy).
  - **Break length** — `BREAK_MINUTE_OPTIONS = [3, 5, 10]` (default 5).
  - **Movement breaks** — a `Toggle` (default on). Off = a plain "rest" break with no movement prompt.
- One honest line (via `resolveContent("focus.setupHint")`): *"Pick a length that feels right — short is fine."* Never "focus longer to do better."
- A big primary **"Start focusing"** button. There is no "you must finish N blocks" commitment.

#### (b) `focus` (a block running)
- A large, calm **depleting ring** (`components/focus/FocusRing.tsx`, reusing the BubbleMeter `Circle`+`strokeDashoffset` technique) showing time left for this block. Big, high-contrast, glanceable across a room. Color eases from `colors.primary`/`colors.grow` toward a warm `colors.accent` as it drains — **never** red/danger (there is no child-facing danger colour in the palette by design, `src/theme/tokens.ts`), **never** flashes.
- A small **`m:ss` readout** beside/under the ring **only** because older ⇒ `capabilities.showNumbersAndCharts === true`. It counts down calmly; at 0 it shows `0:00` in `textDim` (never red). (The component still reads the flag, not the age.)
- Controls: **Pause** (freezes remaining) and **Stop** (ends the session → `done`). Both are neutral, always available, never framed as failure.
- **On empty:** the ring settles to a calm "rested" fill, a soft one-shot transition cue fires (see §2.5), and the screen advances to `break` (or, if movement breaks are off and the child prefers, offers "one more block" / "I'm done"). No modal, no alarm, no auto-penalty, no token change.

#### (c) `break` (active movement)
- A **movement-break card** (`components/focus/MovementBreakCard.tsx`): one prompt from the curated list — emoji + big spoken-label text (e.g. 🤸 *"Do 5 star jumps"*) — plus a shorter depleting break ring.
- The prompt is chosen **deterministically** by a rotating index (`nextMovementPrompt`, index++ mod length) so it is predictable and testable — **no `Math.random`** anywhere.
- Controls: **"I moved!"** / **"Skip break"** (both advance immediately), and, when the break ring empties, a calm **"Back to focus"** and **"I'm done"**. If movement breaks are off, the card shows a plain "Take a breather" rest instead of a movement prompt.
- Breaks are framed as **positive movement**, never "your reward for suffering through focus."

#### (d) `done`
- A calm close: buddy shown `proud`/`happy` (mood via the existing companion path — see §6), one warm line (`resolveContent("focus.done")` → older: *"Nice focusing. Come back any time."*). **No** pomodoro tally shaming, **no** "you only did 1 block," **no** streak.
- At most a **neutral, non-losable** stat when `showNumbersAndCharts` (older) **AND `N >= 1`**: "Focus blocks today: N" as a plain count — never a target, never a current-vs-best drop, never adjacent to a goal the child "missed." **Suppress the line entirely when `blocksCompleted === 0`** (a child who opens setup and Stops during their first block reaches `done` with `blocksCompleted:0`; showing "Focus blocks today: 0" would read as a shaming zero, like the clinician report's banned `0`). At N=0 show ONLY the neutral close line ("Nice focusing — come back any time"). Add this to §6 anti-shame rules + §7 acceptance.
- A single "Done" / close returns to Today.

### 2.2 Pause / resume / stop (anti-shame lifecycle)
- **Pause** stores the frozen `remainingMs` and marks the session paused; the ring holds. **Resume** re-anchors `phaseStartedAt = now - (phaseMs - remainingMs)` so wall-clock recompute stays correct afterward. No time is "lost," nothing is penalised.
- **Stop** (or backing out of the screen) ends the session and returns to Today. Ending early is always fine; the copy is neutral.

### 2.3 Wall-clock correctness (offline / background-safe)
- Remaining time is **always** `max(0, phaseStartedAt + phaseMinutes*60000 - Date.now())`, recomputed from the wall clock — mirroring the codebase rule "pass `now`/`tz` in, never trust a native clock" and the sibling `visual-timers` design. Backgrounding during a movement break (phone in a pocket) and returning shows the **correct** remaining (or a calm "break's done"), with no drift and no crash.
- There is **no background execution** and **no scheduled OS "time's up" notification** in the baseline (that would risk the nag/hijack rules and has Expo-Go caveats). A backgrounded session simply shows the right state on return. (An optional, default-off, quiet-hours-gated single block-end notification is an explicit open assumption, §9, not baseline.)

### 2.4 Sensory + motion (age/sensory via resolvers only)
- **Standard / lowStim:** one non-looping `withTiming` shared value drives the smooth ring depletion (a single purposeful animation, allowed under lowStim, which just uses the muted single-hue Stillwater palette + no colour-ease drama). Driven off `useThemeTokens()` colours + `t.animationDurationScale` / `t.motion.loopsEnabled` — **never** a raw `sensoryMode`/`reducedMotion` read.
- **Reduce-Motion (`animationDurationScale === 0`):** do **not** run a continuous Reanimated loop; update a **discrete stepped fraction** on a 1 Hz JS interval that recomputes remaining from the wall clock (the exact pattern the `visual-timers` spec uses). No smooth sweep.
- No decorative parallax, no flashing, no red, no looping tick, no negative haptic. A block/break transition may fire a single positive-only success haptic **only if** haptics are enabled (there is no Warning/alarm haptic toward a child).

### 2.5 Audio (decoupled, ducking, optional)
- **Default block/break transition cue:** reuse the existing **`transition.swoosh`** cue (already registered, `ui` category, ducking session) fired once at a phase change via `playCue("transition.swoosh")`. It **ducks — never stops** other media (the `src/services/sound.ts` `duckOthers` session), respects the master + per-category toggles, and is suppressed by quiet-hours / sound-off like every cue.
- Gated by `settings.focusIntervals.chime` (default **on**) so a family can silence transitions independently.
- There is **never** a looping tick and **no per-second beeping**. (A dedicated soft `focus.transition` cue + `assets/sounds/focus-transition.wav` is an optional enhancement — §9 — not required; reusing `transition.swoosh` needs no new asset.)

### 2.6 Calm path interaction
- `(kid)/calm.tsx` is unchanged and unrelated (it has no steps and no focus timer). A child in `calmMode`/`lowStim` who still has focus-intervals enabled sees the muted-palette version with no chime — consistent with "calm keeps the tool, drops the drama."

---

## 3. Data-model additions (exact TS types + store) + migration notes

### 3.1 `src/domain/types.ts` — per-child config (optional, additive)
```ts
/**
 * Optional, adjustable focus/break scaffold (feature #22, "later" tier). NON-rigid:
 * user-adjustable focus AND break length; default 15/5 (never the fatiguing 25/5).
 * Older-mode only is enforced by the `focusIntervalsAvailable` capability, NOT this
 * flag — `enabled` is the PARENT opt-in on top of the age ceiling. NOT ADHD-proven;
 * an organizational tool, not a treatment (fact-check `pomodoro-timeboxing`).
 */
export interface FocusIntervalConfig {
  /** parent opt-in; default false. The capability gates AVAILABILITY (older only). */
  enabled: boolean;
  /** default focus block length in minutes (one of FOCUS_MINUTE_OPTIONS); default 15 */
  focusMinutes: number;
  /** default break length in minutes (one of BREAK_MINUTE_OPTIONS); default 5 */
  breakMinutes: number;
  /** show an active-movement prompt on breaks (vs a plain rest); default true */
  movementBreaks: boolean;
  /** fire the soft ducking transition cue on phase change; default true */
  chime: boolean;
}
```
Add ONE optional field to `ChildSettings` (immediately after `reminders`/`autoApproveRedeemUnderTokens`):
```ts
export interface ChildSettings {
  // ...existing fields unchanged...
  /**
   * Optional adjustable focus/break scaffold (feature #22). Optional + additive so
   * pre-existing persisted profiles stay valid with no migration; absence => the
   * feature is off and the UI/domain falls back to DEFAULT_FOCUS_INTERVALS.
   */
  focusIntervals?: FocusIntervalConfig;
}
```

### 3.2 `src/domain/types.ts` — runtime session shapes (NOT persisted in baseline)
```ts
export type FocusPhase = "setup" | "focus" | "break" | "done";

/** One curated active-movement prompt (fixed list; non-reader-friendly spoken label). */
export interface MovementPrompt {
  id: string;
  /** REQUIRED TTS/label string, e.g. "Do 5 star jumps" */
  spokenLabel: string;
  emoji: string;
}

/**
 * Live focus-session runtime (held in the in-memory focusSessionStore, NOT persisted
 * in the baseline — a killed session is simply gone, which is anti-shame-fine, never
 * a "loss"). Wall-clock anchored: remaining is always recomputed from `phaseStartedAt`.
 */
export interface FocusSession {
  childId: string;
  phase: FocusPhase;
  /** wall-clock ms the CURRENT phase started (re-anchored on resume) */
  phaseStartedAt: EpochMs;
  focusMinutes: number;
  breakMinutes: number;
  movementBreaks: boolean;
  /** rotating index into the curated movement-prompt list (deterministic, no RNG) */
  promptIndex: number;
  /** neutral count of completed focus blocks this session (never a target/streak) */
  blocksCompleted: number;
  /** paused holds a frozen remaining; resume re-anchors phaseStartedAt */
  paused: boolean;
  pausedRemainingMs?: number;
}
```

### 3.3 `src/state/focusSessionStore.ts` — in-memory store (baseline)
A zustand store **without `persist`** (like `sessionStore.ts`) holding the single live session:
```ts
interface FocusSessionStoreState {
  session: FocusSession | null;
  start: (cfg: { childId: string; focusMinutes: number; breakMinutes: number; movementBreaks: boolean }, now: number) => void;
  toBreak: (now: number) => void;   // focus block ended -> break; blocksCompleted++, rotate promptIndex
  toFocus: (now: number) => void;   // break ended/skipped -> next focus block
  finish: () => void;               // -> phase 'done'
  pause: (now: number) => void;     // freeze pausedRemainingMs
  resume: (now: number) => void;    // re-anchor phaseStartedAt
  stop: () => void;                 // session = null
}
```
All time math delegates to the pure helpers in `src/domain/focus.ts` (below) so transitions are unit-testable without RN. The store never calls `Date.now()` itself except by receiving `now` from callers (keeps it deterministic/testable, matching `runProgressStore`/`gameplay` conventions).

> **Baseline = in-memory (recommended).** No persisted slice, no migration surface, and a force-quit mid-session just drops it (anti-shame-fine). Resume-across-kill is a low-value nicety for a short self-directed session; if wanted later, persist `session` via `createTbPersistOptions` with a stale-guard (drop a session whose `phaseStartedAt` is older than, say, focus+break minutes) — see §9.

### 3.4 Curated constants + defaults
`src/domain/focus.ts`:
```ts
export const FOCUS_MINUTE_OPTIONS = [10, 15, 20, 25] as const; // default 15, NOT rigid 25
export const BREAK_MINUTE_OPTIONS = [3, 5, 10] as const;       // default 5
export const DEFAULT_FOCUS_INTERVALS: FocusIntervalConfig = {
  enabled: false, focusMinutes: 15, breakMinutes: 5, movementBreaks: true, chime: true,
};
```
`src/domain/constants.ts` — populate the new field in `defaultChildSettings` so the parent settings UI has a stable object to bind (still optional on the type):
```ts
// inside defaultChildSettings(ageMode):
focusIntervals: { ...DEFAULT_FOCUS_INTERVALS }, // enabled:false; availability gated by capability
```

### 3.5 Migration notes (additive, versioned)
- `SCHEMA_VERSION` stays **1**. `focusIntervals?` is an **optional** field on an already-persisted shape (`ChildSettings`) → it merges cleanly through the existing `mergeWithDefaults` in `src/storage/migrations.ts`; an older blob simply lacks it (treated as "off / defaults"). **No `MIGRATIONS` entry needed.** (Same rule the `visual-timers` spec uses for its additive fields.)
- `validateAndRepair` addition (defensive, optional): if `focusIntervals` is present, coerce `focusMinutes`/`breakMinutes` to the nearest member of the curated option arrays (or the default) and non-boolean flags to their default — never throw. Absent ⇒ leave undefined (the UI falls back to `DEFAULT_FOCUS_INTERVALS`).
- If a later change makes the session **persisted** (§9), add the store to `partialize` + a stale-guard then; the engine is ready. Not needed now.

---

## 4. EXACT files to CREATE and MODIFY (real paths under `tiny-bubbles/`)

### CREATE
1. `src/domain/focus.ts` — **pure**, RN-free, unit-testable:
   - `DEFAULT_FOCUS_INTERVALS`, `FOCUS_MINUTE_OPTIONS`, `BREAK_MINUTE_OPTIONS`.
   - `focusConfigOf(settings: ChildSettings): FocusIntervalConfig` → `settings.focusIntervals ?? DEFAULT_FOCUS_INTERVALS`.
   - `focusRemainingMs(phaseStartedAt: EpochMs, minutes: number, now: EpochMs): number` → `clamp(0, start + minutes*60000 - now)`.
   - `focusFraction(phaseStartedAt, minutes, now): number` → remaining/total in `[0,1]` (1 = full, 0 = empty); guards `minutes <= 0`/non-finite ⇒ 0.
   - `formatMSS(ms: number): string` → `"m:ss"` (or import from `src/domain/timer.ts` if the `visual-timers` feature has landed — soft reuse, not a hard dep).
   - `nextMovementPrompt(index: number, prompts: MovementPrompt[]): { prompt: MovementPrompt; nextIndex: number }` (deterministic rotation, no RNG).
2. `src/data/focusBreaks.ts` — the fixed curated `MOVEMENT_PROMPTS: MovementPrompt[]` (see §5). Each carries a `spokenLabel` + `emoji`.
3. `src/state/focusSessionStore.ts` — the in-memory session store (§3.3).
4. `app/(kid)/focus.tsx` — thin screen: resolves the active child + settings, guards on `capabilities.focusIntervalsAvailable && config.enabled` (redirect/close if not), renders `<FocusSession>`. `SafeAreaView` + `colors.canvas` like other kid screens.
5. `components/focus/FocusSession.tsx` — the stateful view (setup / focus / break / done) reading `focusSessionStore`, `useCapabilities()` (`showNumbersAndCharts`), `useThemeTokens()`, `resolveContent`. Fires `playCue("transition.swoosh")` (when `config.chime`) + optional positive haptic on phase change. Uses the pure helpers for all time math; picks smooth `withTiming` vs 1 Hz discrete stepping off `t.animationDurationScale`.
6. `components/focus/FocusRing.tsx` — the depleting ring (reuse the BubbleMeter `Svg`+`Circle`+`strokeDashoffset` pattern; props: `fraction`, `label?`, `size`, `showNumbers`, `remainingMs`). **Or** reuse `components/task/VisualTimer.tsx` from the `visual-timers` feature if it exists (soft reuse). Never reads raw ageMode/sensoryMode.
7. `components/focus/MovementBreakCard.tsx` — emoji + spoken-label prompt + break ring + "I moved!/Skip".
8. `__tests__/domain/focus.test.ts` — remaining/fraction/format clamping, zero/negative/NaN minutes, wall-clock recompute across a simulated background gap, deterministic `nextMovementPrompt` rotation.
9. `__tests__/state/focusSession.test.ts` — store transitions: start→focus, focus→break (blocksCompleted++, promptIndex rotates), break→focus, pause/resume re-anchoring keeps remaining stable, stop clears, no `Math.random`.

### MODIFY
10. `src/domain/types.ts` — add `FocusIntervalConfig`, `FocusPhase`, `MovementPrompt`, `FocusSession`; add optional `ChildSettings.focusIntervals?` (§3.1/§3.2).
11. `src/theme/resolveCapabilities.ts` — add `focusIntervalsAvailable: boolean` to `ModeCapabilities` and `AGE_CAP_BASE` (**young: false, older: true**), read straight from `base` in `resolveCapabilities` (a **hard age ceiling — NOT in the input-override set**, like `maxChoices`/`multiStepVisible`/`showNumbersAndCharts`). A 4–7 child can never be granted this.
12. `src/theme/resolveContent.ts` — add `ModeKeyed` copy keys (the `satisfies Record<string, ModeKeyed<string>>` constraint **forces both `young` and `older` variants**; provide `young` variants even though unused — they must compile). Suggested keys (older is the live one):
    - `"focus.title"`: `{ young: "Focus time", older: "Focus timer" }`
    - `"focus.setupHint"`: `{ young: "Pick a little time", older: "Pick a length that feels right — short is fine." }`
    - `"focus.start"`: `{ young: "Start", older: "Start focusing" }`
    - `"focus.focusing"`: `{ young: "Focusing", older: "Focusing" }`
    - `"focus.pause"`: `{ young: "Pause", older: "Pause" }`
    - `"focus.resume"`: `{ young: "Keep going", older: "Resume" }`
    - `"focus.stop"`: `{ young: "Stop", older: "Stop" }`
    - `"focus.breakTitle"`: `{ young: "Move time!", older: "Movement break" }`
    - `"focus.breakHint"`: `{ young: "Wiggle it out 🫧", older: "Get up and move for a bit." }`
    - `"focus.backToFocus"`: `{ young: "More focus", older: "Back to focus" }`
    - `"focus.done"`: `{ young: "Nice job! 🫧", older: "Nice focusing. Come back any time." }`
    - `"focus.blocks"`: `{ young: "Focus blocks", older: "Focus blocks today" }`
    - `"focus.launch"`: `{ young: "Focus", older: "Focus timer" }` (the launcher label)
13. `src/theme/__typetests__/content-typetest.ts` — no change needed (the `satisfies` on `COPY` auto-covers new keys); if the type-test enumerates keys, add them.
14. `src/domain/constants.ts` — add `DEFAULT_FOCUS_INTERVALS` usage in `defaultChildSettings` (§3.4); import from `src/domain/focus.ts`.
15. `components/kid/DaypartDonePanel.tsx` — render the low-emphasis "🎯 Focus timer" launcher **only** when `caps.focusIntervalsAvailable && config.enabled` (read `settings.focusIntervals` for the active `childId` via `useChildStore`); pushes `/(kid)/focus`. Gated on the capability flag, never raw ageMode. (This is the primary entry point.)
16. `app/(kid)/index.tsx` — (optional) also render a compact focus launcher in the older Today surface header under the same guard; simplest baseline is the DaypartDonePanel launcher only.
17. `app/(kid)/_layout.tsx` — register the `focus` route in **both** shells: `<Stack.Screen name="focus" options={{ presentation: "modal" }} />` in `YoungStack` (unreachable there, registered for router completeness) and `<Tabs.Screen name="focus" options={{ href: null }} />` in `OlderTabs` (reachable via push, never a tab). Add `focus` to the `GrownUpsDoor` hidden-over segments check (`last === "celebrate" || last === "peek" || last === "focus"`) so the door never overlaps the focus controls.
18. `app/(parent)/children.tsx` — add a **"Focus timer"** `Card` shown **only** when the selected child is older (gate via `resolveCapabilities({ ageMode: profile.ageMode }).focusIntervalsAvailable`, not a raw `=== "older"` — parent surfaces still go through the resolver). Controls, all writing through `updateSettings(selectedId, { focusIntervals: { ...focusConfigOf(profile.settings), <field>: v } })`:
    - `Toggle` "Focus timer (older kids)" → `enabled` (default off), hint: *"An optional, adjustable focus/break timer. Not a treatment — just a tool."*
    - `Segmented<number>` focus length (10/15/20/25) → `focusMinutes`.
    - `Segmented<number>` break length (3/5/10) → `breakMinutes`.
    - `Toggle` "Active movement breaks" → `movementBreaks`.
    - `Toggle` "Transition chime" → `chime`.
    Reuse `Card`/`Segmented`/`Toggle`/`SettingRow`/`Note` from `components/parent/ui.tsx`.
19. `src/state/index.ts` — export `useFocusSessionStore` (barrel).
20. `src/domain/index.ts` — export the `focus.ts` helpers (barrel).
21. `src/data/index.ts` — export `MOVEMENT_PROMPTS` (barrel).

> **Golden-rule check for the build-agent:** `FocusSession`, `FocusRing`, `MovementBreakCard`, and the launchers must resolve every age/sensory difference through `useThemeTokens()` / `useCapabilities()` / `resolveContent` — **no `ageMode`/`sensoryMode`/`reducedMotion` string reads, no `ageMode` prop.** `StepCard`/`TaskRunner` are untouched (focus intervals are a separate destination, not part of the routine runner).

---

## 5. Reused prebuilt libraries (prefer existing deps)

All already in the stack — **no new dependency required**:
- `react-native-reanimated` (v4) + `react-native-worklets` — the single `withTiming` ring depletion + `useAnimatedProps` (exact pattern in `components/progress/BubbleMeter.tsx`; also `app/(kid)/calm.tsx`).
- `react-native-svg` (15) — the ring via `Circle` + `strokeDashoffset` (BubbleMeter reference).
- `zustand` (v5) — the in-memory `focusSessionStore` (same shape as `sessionStore.ts`).
- `src/theme/*` resolvers + `useThemeTokens` / `useCapabilities` — colours, `animationDurationScale`, `motion.loopsEnabled`, tabular Lexend for the `m:ss` readout.
- `src/services/sound.ts` + `playCue` — the existing ducking one-shot `transition.swoosh` for phase changes (no new audio infra, no new asset in baseline).
- `expo-haptics` via `src/services/haptics.ts` — the optional positive-only success haptic on a transition (toggle-respecting).
- `components/parent/ui.tsx` `Card`/`Segmented`/`Toggle`/`SettingRow`/`Note` — the parent controls (no new picker lib).
- **Soft reuse (not a dependency):** if the `visual-timers` feature (#14) has landed, reuse `src/domain/timer.ts` (`formatMSS`, remaining/fraction) and/or `components/task/VisualTimer.tsx` instead of re-authoring — build focus-intervals as a *consumer*, never a blocker.

**No new MIT lib is needed.** (Do not add a countdown/pomodoro npm package — the depletion is one `withTiming` + a wall-clock subtraction; a dependency would be gold-plating and risks a New-Arch break.)

---

## 6. ANTI-SHAME + no-AI rules that apply

- **No failure / loss / giving-up framing.** A block ending is a calm "rested" state, never "time's up / you lost focus / you gave up / you only did 1." Pause and Stop are neutral, always available, one tap. Ending early is explicitly fine ("come back any time"). Copy is compile-gated through `resolveContent` (both variants reviewed).
- **No streak / score / target.** There is no pomodoro streak, no "N/N blocks" goal, no current-vs-best drop. `blocksCompleted` is at most a neutral, non-losable count shown only when `showNumbersAndCharts`.
- **No token grind.** Baseline is token-neutral (no ledger writes from focus sessions), so the feature can't become a "focus-for-rewards" compulsion. The economy stays tied to real routines.
- **No alarm sensory.** No red/danger colour (none exists for kids), no flashing, no looping tick, no per-second beep, no negative/Warning haptic. The transition cue is a single soft ducking `transition.swoosh`, gated by `chime` + the master/category toggles + quiet-hours.
- **Audio never hijacks** — the existing `setAudioModeAsync({ interruptionMode: "duckOthers" })` session guarantees the cue ducks, not stops, a child's music/podcast. This feature adds no session change and no background audio.
- **Sensory respect** — lowStim uses the muted Stillwater single hue; Reduce-Motion uses discrete 1 Hz stepping (no continuous worklet loop); every channel remains individually toggleable via the existing settings.
- **Curated autonomy** — focus/break lengths are curated short lists (no free-form number entry); the child adjusts within the session ("be the boss"), the parent sets the defaults.
- **ZERO AI** — durations are curated constants; movement prompts are a fixed curated array chosen by a deterministic rotating index (no `Math.random`, no adaptive/LLM "recommended length", no "AI focus coach"). The companion stays a non-AI pet; the `done` state uses the existing positive-only mood path (no new mood, no negative state).
- **Non-rigid (locked)** — user-adjustable focus AND break length; default 15/5, never a forced 25/5; shorter blocks + active movement are the biased-for-kids defaults. Copy/marketing never claims ADHD efficacy.

---

## 7. Acceptance criteria + verify steps

### Acceptance criteria
1. The focus entry point appears **only** for older children (`capabilities.focusIntervalsAvailable`) with the parent toggle on (`settings.focusIntervals.enabled`); it is **absent** for young and when disabled — verified with no raw `ageMode` read in any kid component.
2. Setup lets the child pick focus length (10/15/20/25) and break length (3/5/10) from curated lists (no free-form entry) and toggle movement breaks; values pre-fill from the parent config and are adjustable per session.
3. A focus block depletes a calm ring smoothly in standard/lowStim and in **discrete 1 Hz steps** under OS Reduce-Motion (no continuous worklet loop when `animationDurationScale === 0`).
4. Remaining time is **wall-clock correct** across background/foreground (background N s during a break → foreground shows ~N fewer seconds, or a calm "break's done"), with no drift and no crash.
5. A block reaching empty produces **no** auto-complete/skip of any routine, **no** token change, **no** red/flash/alarm, and **no** sound unless `chime` is on — in which case exactly **one** soft `transition.swoosh` fires, ducking (not stopping) other audio.
6. Break shows a movement prompt from the curated list via a **deterministic** rotating index (same session start → same prompt order); no `Math.random` anywhere in the feature.
7. Pause freezes remaining; resume continues from the same remaining with no time lost; Stop / backing out ends the session neutrally.
8. `done` shows a calm close with no score/streak/target; at most a neutral non-losable "focus blocks today: N" when `showNumbersAndCharts`.
9. Numeric `m:ss` readout appears (older ⇒ `showNumbersAndCharts` true); the component reads the flag, never the age.
10. Copy for every focus string resolves through `resolveContent` with both `young`/`older` variants and contains no urgency/shame/efficacy words.
11. No kid-facing component reads raw `ageMode`/`sensoryMode`/`reducedMotion`; no `ageMode` prop is passed to any focus component.
12. Offline: everything works in airplane mode; web export builds (rings render; audio/haptics are N/A on web per the strict-subset rule).
13. Existing behavior unchanged: the daypart loop, routine completion, tokens, celebration, and anti-shame states are byte-for-byte the same; a child with the feature disabled sees zero difference.

### Verify steps (an agent runs)
- `npx tsc --noEmit` → 0 errors (new types + copy keys compile; `ModeKeyed` forces both variants; the `focusIntervalsAvailable` capability is present on `ModeCapabilities`).
- `npm test` → all suites green incl. new `__tests__/domain/focus.test.ts` and `__tests__/state/focusSession.test.ts`.
- `npx expo export --platform web` → succeeds (web-safe; no native-only import at module scope).
- Grep gates:
  - `grep -rni "time's up\|out of time\|too slow\|failed\|gave up\|lost focus\|hurry\|streak" app/\(kid\)/focus.tsx components/focus src/theme/resolveContent.ts` → zero (anti-shame copy gate).
  - `grep -rni "adhd\|treat\|cure\|attention span\|proven" app/\(kid\)/focus.tsx components/focus src/theme/resolveContent.ts` → zero (no efficacy/medical claim in kid copy).
  - `grep -rn "Math.random" src/domain/focus.ts src/state/focusSessionStore.ts src/data/focusBreaks.ts components/focus` → zero (deterministic).
  - `grep -rn "ageMode" components/focus app/\(kid\)/focus.tsx` → no raw reads / no `ageMode` prop.
  - `grep -rn "withRepeat\|setInterval" components/focus` → any `setInterval` is the reduced-motion stepping path only; **no** `withRepeat` on the ring depletion; no looping tick cue.
- Manual (dev client, from `RUN.md`): set a child to older, enable Focus timer in Parent → Children → Focus timer; open the kid Today → tap "🎯 Focus timer" → pick 10 min / 3 min break → Start; the ring drains; background 20 s → foreground shows ~20 s less; let a block hit 0 → soft swoosh + break card with a movement prompt; "I moved!" → back to focus; Stop → calm done; toggle Reduce-Motion → stepped ring; toggle lowStim → muted single hue; set the child to young → the entry point disappears entirely.

---

## 8. Dependencies + premium/free classification

### Depends on (all shipped/green — no unbuilt-spec blockers)
- Theming/age engine: `src/theme/*` — `resolveCapabilities` (+ the new `focusIntervalsAvailable`), `resolveContent` (`ModeKeyed`), `useThemeTokens` (`animationDurationScale`, `motion.loopsEnabled`, tabular type) (M2).
- Ring pattern: `components/progress/BubbleMeter.tsx` (Reanimated + `react-native-svg` `Circle`/`strokeDashoffset`) (M8).
- Kid shell + routing: `app/(kid)/_layout.tsx`, `components/kid/DaypartDonePanel.tsx`, `app/(kid)/index.tsx` (M5 / doc 70).
- Companion mood on `done`: `components/buddy/BubbleBuddy.tsx` + the existing positive-only mood path (M6) — no new mood.
- Sensory services: `src/services/sound.ts` / `playCue.ts` (`transition.swoosh`, ducking session) + `src/services/haptics.ts` (M13).
- Data model + factories: `ChildSettings` (M4), `defaultChildSettings` (`src/domain/constants.ts`), the persist/merge path (`src/storage/migrations.ts`).
- Parent authoring: `app/(parent)/children.tsx` + `components/parent/ui.tsx` (M9).

### Related specs (no hard dependency)
- **Visual transition timers (#14, `visual-timers.md`)** — sibling timer feature. **Soft reuse only:** if built, share `src/domain/timer.ts` (`formatMSS`, remaining/fraction) and/or `components/task/VisualTimer.tsx`. Neither blocks the other; do not couple beyond shared pure helpers.
- **If-then "when X, I will Y" plans (#21)** — a future consumer could launch a focus session from a plan; build that as a consumer, not a blocker.
- **Premium calm/focus soundscape (#20, `calmSoundscape` flag)** — a *future* premium focus soundscape could route through that flag; the **focus timer itself here is FREE and standalone**. Do not couple.

### Premium vs free
**FREE.** The focus timer is an optional executive-function/organizational scaffold; classifying it premium would gate a self-regulation tool, contradicting the locked "core loop is always free" + "accessibility/self-regulation axes are never paywalled" rules (`src/services/entitlements.ts` never-gated list). It is **not** added to `FEATURE_GATES` and must **never** be wrapped in `<PremiumGate>`. (Only a hypothetical future *premium focus soundscape pack* would sit behind `calmSoundscape` — out of scope here.)

---

## 9. Open assumptions

1. **In-memory session (baseline) vs persisted resume.** Baseline keeps the live `FocusSession` in an in-memory store (a force-quit drops it — anti-shame-fine for a short self-directed session). If resume-across-kill is later wanted, persist the store via `createTbPersistOptions` with a stale-guard (drop a session whose `phaseStartedAt` is older than `focusMinutes+breakMinutes`), add it to `partialize`, and keep `SCHEMA_VERSION` at 1 (additive). Either is acceptable; in-memory is the recommended default (smallest surface, no migration).
2. **Token-neutral (baseline).** Focus sessions earn **no** tokens to avoid a focus-for-rewards compulsion. If a team wants a small, gentle completion acknowledgement, wire a single optional token on `done` via the existing ledger with `reason: "adjustment"` or `"parent_gift"` (never a per-block payout, never a schedule) — but the baseline ships token-neutral, and marketing must not imply "earn by focusing."
3. **No block-end OS notification (baseline).** Because the screen may sleep during a long focus block, an optional **single, default-off, quiet-hours-gated** local notification at block end (via the existing `src/services/notifications.ts` gating, honest non-nag copy, canceled if the child returns/stops) could improve the transition. It is deferred to avoid the nag surface + Expo-Go local-notification caveats; baseline relies on the foreground in-app chime + wall-clock recompute on return.
4. **Entry-point location.** Baseline places the launcher on the older `DaypartDonePanel` (the "all done / nothing scheduled" moment) plus an optional compact launcher on the Today header. If UX prefers a 5th "Focus" tab in the older shell, that is an additive `_layout.tsx` change (gate the tab on the capability + `enabled`); baseline avoids a 5th tab to keep the shell calm.
5. **Dedicated transition cue.** Baseline reuses `transition.swoosh` (no new asset). If a distinct focus sound is wanted, add `focus.transition` to `CueId` (`src/services/playCue.ts`) + register it in `src/services/sound.ts` + bundle `assets/sounds/focus-transition.wav` (CC0/original, listed in `THIRD_PARTY_NOTICES.md` "Bundled assets") — all default-audible-but-toggleable; muting is via the `chime` config, not a mixer default.
6. **Curated option sets.** Assumes focus 10/15/20/25 and break 3/5/10 are the right curated lists (default 15/5). Adjustable, but keep them short curated Segmenteds (no free-form entry) to honor curated-autonomy, and keep the default off the fatiguing rigid 25/5.
7. **Movement-prompt list.** Assumes ~6–8 fixed, home-safe, equipment-free prompts (e.g. star jumps, sky stretch, march in place, shoulder rolls, wiggle it out, drink of water). A team can extend the curated array; keep it deterministic (rotating index, no RNG) and each prompt spoken-label-friendly.
8. **Older-only is a hard ceiling.** Assumes `focusIntervalsAvailable` is non-overridable (a 4–7 child never gets timed focus sessions). If a team later wants a parent override for a precocious younger child, add it as an input override in `resolveCapabilities` (like `moodCheckin`) — a deliberate, small change, not the baseline.
