# Feature Spec — Visual Transition Timers (`visual-timers`)

Status: ready to build. Additive delta on the shipped, green app (tsc 0, 34 suites / 335 tests).
Research tier: **v1 / feature #14** (`_build/research/01-feature-matrix.md`). Gap-list item **#6 [MISSING]** in `_build/spec/01-current-state.md` §4.3.

Hard rules preserved throughout (do not relitigate — locked): **ZERO AI**; **anti-shame** (no "time's up / failed / out of time" — a depleted timer is never a loss); **audio DECOUPLED** (a timer never hijacks a child's music/podcast — the app's audio session already ducks, never seizes); **no component branches on raw `ageMode`** (only `src/theme` resolvers + capability flags); **offline / Expo-Go / web-safe** (wall-clock math, no native timer APIs, no background execution). Verify each change with `npx tsc --noEmit`, `npm test`, `npx expo export --platform web`.

> Framing (say this in copy and code comments, never the opposite): the timer is **external scaffolding for a transition**, *not* a device that "fixes the internal clock." The verified science (fact-check `time-perception-visual-timer`, `_build/research/01-feature-matrix.md` #14) is that ADHD time-perception deficits are sub-second and child-specific; a minute-scale visual aid supports *on-task behavior and transitions*, it does not remediate the perceptual deficit. Market/community demand: parents explicitly ask for a color-changing timer "viewable from across the room," and the top competitor complaint (Brili) is that the **timer's audio "takes over" podcasts** — this feature's audio-decoupling is the direct answer to that complaint.

---

## 1. Overview + user value

A **calm, depleting visual** attached to a routine step that has a `timerSeconds` budget. It shows *how much time is left for this step / transition* as a smoothly shrinking bar or draining wedge, in the shared bubble language, big enough to read across a room. It is:

- **Advisory, never coercive.** When it reaches empty it simply *rests* — it does NOT auto-complete, auto-skip, lock the child out, nag, flash red, or change the token payout. The child completes (or skips) exactly as before; the timer is a pacing aid only.
- **Audio-decoupled by default.** No sound is required for the timer to work. Any optional completion chime is **off by default**, one-shot, and routed through the existing `duckOthers` audio session (`src/services/sound.ts`) so it lowers — never stops — other media. There is deliberately **no looping tick** and no per-second beeping.
- **Age-adaptive and sensory-safe** via resolvers/flags only (young focal wedge vs older slim bar; numeric readout only when `showNumbersAndCharts`; discrete/stepped depletion under Reduce-Motion; muted single-hue under lowStim).

**Why it earns its place (honest):** it targets the #1 category retention risk indirectly (smoother transitions = calmer routines = parents stay subscribed) and closes a *specifically requested* Joon/Brili white-space, while the science supports it only as a transition/on-task scaffold — which is exactly how it is framed and copy-gated.

**The data seam already exists.** `Task.timerSeconds?: number` is defined in `src/domain/types.ts` (line ~139) and `TaskTemplate` retains it; `src/data/seed.ts` (line ~77) already copies `timerSeconds` from template → instantiated task. What is missing is: (a) a component that renders the depleting visual, (b) wiring it into the runner's active step, (c) a parent control to set the per-task budget at assign time, and (d) age/sensory copy. This spec adds only those.

---

## 2. UX behavior — screen by screen

### 2.1 Where it appears
Only inside the **core loop runner** (`components/task/TaskRunner.tsx`), attached to the **currently active step** when that step's `timerSeconds` is a positive number. A step without `timerSeconds` renders exactly as today (no timer, no layout shift beyond the reserved slot collapsing). The timer belongs to the *active* step only — upcoming/resolved steps never show one.

### 2.2 Lifecycle (presentational, wall-clock anchored)
- When a step becomes the active step, the runner records a **start wall-clock ms** for that step and computes `endAt = startedAt + timerSeconds*1000`.
- Remaining is always `max(0, endAt - Date.now())` — recomputed from the wall clock, so backgrounding/foregrounding, JS-timer throttling, and resume-after-kill all show the *correct* remaining time (or a calmly-rested empty) without drift. This mirrors the codebase's "pass `now`/`tz` in, never trust a native clock" domain rule.
- Advancing to the next step (Done or Skip) **resets** the timer for the new active step. Reordering (older) does not restart the current active step's timer (same active id → same `startedAt`).
- **Empty state:** the visual settles to a calm "rested" fill (see §2.5). No modal, no sound (unless the opt-in chime is on), no auto-advance, no shame copy. The child may still complete or skip. If they do nothing, it just stays rested — this is fine (incomplete is fine).

### 2.3 YOUNG (`multiStepVisible === false`) — focal wedge
- A large **draining radial wedge / ring** rendered between the focal `StepCard` tile and the giant `DoneButton` (reusing the `react-native-svg` `Circle` + `strokeDashoffset` technique already proven in `components/progress/BubbleMeter.tsx`). Big, high-contrast, glanceable across a room.
- **No numbers** (young `showNumbersAndCharts === false`). The passage of time is conveyed purely by the shrinking wedge + a gentle color ease.
- Spoken/label copy is calm and effort-framed via `resolveContent` (e.g. young: *"A little time for this"*), auto-spoken only if TTS is already the pervasive-young default and the label is present; the timer itself does **not** auto-speak a countdown (no "10… 9…").

### 2.4 OLDER (`multiStepVisible === true`) — slim depleting bar
- A **slim horizontal depleting bar** rendered just above the bottom `DoneButton` (which already shows the current step in the older shell), so it reads as "time for *this* step."
- When `showNumbersAndCharts === true`, a small **tabular-nums `m:ss` readout** sits beside the bar (Lexend tabular). It counts down calmly; at 0 it shows `0:00` in `textDim` (never red).
- Optionally a thin depleting underline could sit under the active row in the checklist; baseline is the single bar above the Done button (simplest, one instance, unambiguous).

### 2.5 Color + motion (anti-alarm)
- Fill color eases from a calm start hue to a **warm accent** as it drains: `colors.primary`/`colors.grow` → `colors.accent`. It **never** uses red/danger (there is no child-facing danger color in the palette by design, `src/theme/tokens.ts`) and **never** flashes.
- At empty, the fill rests at a neutral calm tone (`colors.surfaceSunken` track showing through / `colors.textDim` cap) — a quiet "that's the time" state, not an alarm.
- **Standard / lowStim:** one non-looping `withTiming(0, { duration: remainingMs * animationDurationScale? })` shared value drives the smooth depletion. (This is a single purposeful animation, not decorative parallax, so it is allowed under lowStim; lowStim simply uses the Stillwater single-hue palette and no color-ease drama.)
- **Reduce-Motion (`animationDurationScale === 0`):** do **not** run a continuous Reanimated animation. Instead update a **discrete stepped fraction** on a 1 Hz JS interval that recomputes remaining from the wall clock (e.g. the bar empties in visible segments / the readout ticks each second). No smooth sweep, no worklet loop.
- All motion honors `t.animationDurationScale` / `t.motion.loopsEnabled` read from `useThemeTokens()`; the component never reads `reducedMotion`/`sensoryMode` directly.

### 2.6 Calm path
- The un-gamified `(kid)/calm.tsx` screen is unchanged and shows **no** timer (it has no steps). If a routine's `mode === 'calm'` or the child is in `calmMode`, timers on steps still render (they are a neutral scaffold, not a gamified reward) but with the muted palette and no chime — consistent with "calm keeps the routine + audio, drops the gamification."

### 2.7 Audio (decoupled)
- Default: **silent.** The visual is complete on its own.
- Optional per-app **"Timer sound" toggle (default OFF)** in Settings → Sound & motion. When ON, a **single soft one-shot** `timer.done` chime fires when a step's timer reaches empty (not before, not repeatedly), through the existing ducking session. It is a `celebration`-adjacent one-shot but must be its own low-volume cue so it can be muted independently and never reads as a "you failed" sting. Quiet-hours + master-sound-off suppress it like every other cue.
- There is **never** a looping `timer.tick` in this feature (doc 61 §9.2 lists `timer.tick` as "off by default"; this spec ships it **not at all** to guarantee no hijack/nag). If a future iteration wants a tick, it must be opt-in, ducking, and separately gated — out of scope here.

---

## 3. Data-model additions (exact types + store) + migration notes

### 3.1 No new *task* field is required
`Task.timerSeconds?: number` and `TaskTemplate.timerSeconds?` already exist and are already threaded through `src/data/seed.ts`. Reuse them. `timerSeconds` is **seconds**, a positive integer; `undefined`/`0`/absent ⇒ no timer.

### 3.2 One optional, additive persisted field for resume-accuracy (recommended)
To make resume-after-kill show the *correct* remaining time (rather than restarting the visual), add ONE optional field to the persisted active-run pointer:

`src/domain/types.ts` — extend `ActiveRunProgress`:
```ts
export interface ActiveRunProgress {
  // ...existing fields unchanged...
  /**
   * Wall-clock ms when the CURRENT active step's visual timer started. Optional +
   * presentational: absence just restarts the step's timer visual on resume (no
   * data loss, no shame). Set when a timed step becomes active; cleared/replaced
   * when the active step advances. Never affects tokens or completion.
   */
  stepTimerStartedAt?: EpochMs;
}
```

`src/state/runProgressStore.ts` — add one setter (and include `stepTimerStartedAt` in `partialize` via the existing `active` slice, which is already persisted):
```ts
setStepTimerStart: (cid: string, startedAt: EpochMs | undefined) => void;
// impl: shallow-update s.active[cid] = { ...run, stepTimerStartedAt: startedAt, updatedAt: now() }
```
`startRun` and `markStepResolved` should leave `stepTimerStartedAt` alone except: on `markStepResolved` (step advances) the runner will call `setStepTimerStart(cid, undefined)` (or set the new step's start) so a stale start never bleeds into the next step.

**Simpler fallback (acceptable):** keep the timer **purely presentational** in `TaskRunner` component state seeded on active-step change, and skip §3.2 entirely. A force-quit then restarts the active step's visual from full — which is anti-shame-fine (a longer-than-real budget never punishes). Choose §3.2 only if resume-accuracy is wanted; the field is optional either way.

### 3.3 Migration notes (additive, versioned)
- `SCHEMA_VERSION` stays **1**. `stepTimerStartedAt` is an **optional** field on an already-persisted shape → it merges cleanly through the existing `mergeWithDefaults` / `validateAndRepair` path (`src/storage/migrations.ts`); an older blob simply lacks it (treated as `undefined`). No data transform, no `MIGRATIONS` entry needed.
- If a later change makes any timer field **required** or changes its meaning, add a forward-only `MIGRATIONS` entry then (the engine is ready). Not needed now.
- `validateAndRepair` addition (defensive, optional): if `stepTimerStartedAt` is present but not a finite number, coerce to `undefined`. `timerSeconds` on tasks: coerce a negative/NaN to `undefined` (no timer) — never throw.

### 3.4 Parent-assign threading (small type change, not persisted-shape)
`src/state/gameplay.ts` — add `timerSeconds` to the assign input so a parent can set/override the per-task budget at assign time:
```ts
export interface AssignTaskInput {
  // ...existing...
  /** optional visual-transition budget in seconds; undefined/0 => no timer */
  timerSeconds?: number;
}
// in makeTaskFromTemplate(): return { ...base, label, schedule,
//   tokenValue: input.tokenValue ?? base.tokenValue,
//   timerSeconds: input.timerSeconds ?? base.timerSeconds };
```

---

## 4. EXACT files to CREATE and MODIFY (real paths under `tiny-bubbles/`)

### CREATE
1. `src/domain/timer.ts` — **pure** helpers (RN-free, unit-testable), e.g.:
   - `timerRemainingMs(startedAt: EpochMs, timerSeconds: number, now: EpochMs): number` → `clamp(0, endAt - now)`.
   - `timerFraction(startedAt, timerSeconds, now): number` → remaining/total in `[0,1]` (1 = full, 0 = empty).
   - `formatMSS(remainingMs: number): string` → `"m:ss"` (tabular readout).
   - Guards: `timerSeconds <= 0` / non-finite ⇒ fraction 0 / "no timer" sentinel.
2. `components/task/VisualTimer.tsx` — the depleting visual. Props: `timerSeconds`, `startedAt`, `variant: "wedge" | "bar"`, `showNumbers: boolean`, `spokenLabel?: string`, `onEmpty?: () => void` (fires once when it first reaches 0 — used only for the optional chime). Reads `useThemeTokens()` for colors/motion; picks smooth `withTiming` vs 1 Hz discrete stepping off `t.animationDurationScale`; SVG wedge via `react-native-svg` `Circle`/`strokeDashoffset` (BubbleMeter pattern) for `wedge`, an animated width bar for `bar`. Never reads raw ageMode/sensoryMode.
3. `__tests__/domain/timer.test.ts` — unit tests for §domain helpers (remaining/fraction/format, clamping, zero/negative/NaN budgets, wall-clock recompute across a simulated background gap).
4. `__tests__/components/visualTimer.test.tsx` — render test: renders nothing / a slot when no `timerSeconds`; renders numeric readout only when `showNumbers`; `onEmpty` fires exactly once; no red/danger color token used (assert against `tokens` danger-absence); reduced-motion path uses stepped update (no thrown worklet).

### MODIFY
5. `components/task/TaskRunner.tsx` — render `<VisualTimer>` for `currentStep` when `currentStep.timerSeconds` > 0, in **both** shells (young: between `StepCard` focal and `DoneButton`; older: just above the bottom `DoneButton`). Manage the active step's `startedAt`: seed on active-step change (component state, or `runProgressStore.setStepTimerStart` if §3.2 chosen); pass `showNumbers={caps.showNumbersAndCharts}`, `variant={caps.multiStepVisible ? "bar" : "wedge"}`, and the toggles. Wire `onEmpty` → optional chime only when the Timer-sound setting is on (reuse `playCue("timer.done")`). No change to completion/token logic.
6. `src/state/gameplay.ts` — add `timerSeconds` to `AssignTaskInput` + thread it in `makeTaskFromTemplate` (§3.4).
7. `app/(parent)/tasks.tsx` — add `timerSeconds?: number` to `AssignDraft`; add a **"Timer for this step"** control in the Assign bottom-sheet (a `Segmented`/`Chip` row of curated durations: **Off · 30s · 1m · 2m · 5m · 10m** — curated-autonomy, no free-form field); default from the template's `timerSeconds` (usually Off); pass `timerSeconds: draft.timerSeconds` into `assignTaskFromTemplate`.
8. `components/parent/pickers.tsx` — add a small reusable `TimerField` (the curated duration Segmented above) so tasks-setup and any future reward/step editor share it. (Optional if inlined in tasks.tsx; prefer the shared field.)
9. `src/theme/resolveContent.ts` — add `ModeKeyed` copy keys (both variants required by the `satisfies` constraint), e.g.:
   - `"timer.label"`: `{ young: "A little time for this", older: "Time for this step" }`
   - `"timer.rested"`: `{ young: "Take your time 🫧", older: "That's the time — finish when you're ready." }` (the calm empty-state line; **never** "time's up").
   - `"timer.a11y"`: `{ young: "Time left", older: "Time remaining" }` (accessibility label prefix).
10. `src/theme/__typetests__/content-typetest.ts` — no change needed (the `satisfies` on `COPY` auto-covers the new keys); if the type-test enumerates keys, add the three.
11. `src/services/playCue.ts` — add `"timer.done"` to the `CueId` union (optional, decoupled chime).
12. `src/services/sound.ts` — register `timer.done`: add to `CUE_ASSET` (a new CC0/original one-shot chime asset), `CUE_CATEGORY` (`"celebration"` or a new `"timer"` category — prefer reusing `celebration` to avoid a mixer-category change, OR add `timer` if independent muting is wanted), and `CUE_VOLUME` (low, ~0.5). Ships **muted-by-default** at the feature level via the Settings toggle, not by mixer default.
13. `assets/sounds/timer-done.wav` — new bundled **CC0 / original** one-shot chime (add to `THIRD_PARTY_NOTICES.md` "Bundled assets" section). Soft, short (~0.6s), non-alarming. Only needed if the optional chime ships.
14. `app/(parent)/settings.tsx` — add a **"Timer sound"** `SettingRow` + `Toggle` (default **OFF**) under the existing "Sound & motion" `SectionTitle`, with hint copy: *"A soft chime when a step's timer ends. Off by default; never interrupts other audio."* Persist to a new `ParentSettings.timerSoundEnabled?: boolean` (optional, default false — additive, same no-migration rule as §3.3) OR reuse an existing per-category sound toggle if one is added; simplest is the new optional flag.
15. `src/domain/types.ts` — add optional `ParentSettings.timerSoundEnabled?: boolean` (default false) for #14, and the `ActiveRunProgress.stepTimerStartedAt?` from §3.2 (if chosen).
16. `src/data/taskTemplates.ts` and/or `src/data/routinePresets.ts` — **optionally** seed sensible default budgets so the feature is demonstrable day one (additive; keep most Off): e.g. `brush_teeth` 120s, `calm_breaths` 30s, `tidy_toys` 300s, `get_dressed` 300s. Set via the `tpl()` helper's `timerSeconds` (extend the helper signature if it doesn't already accept it). Keep budgets generous/forgiving.

> Golden-rule check for the build-agent: `VisualTimer`, `StepCard`, and `TaskRunner` must resolve every age/sensory difference through `useThemeTokens()` / `useCapabilities()` / `resolveContent` — **no `ageMode`/`sensoryMode`/`reducedMotion` string reads, no `ageMode` prop.** `StepCard` needs **no** timer logic (keep it presentational); the timer is a sibling rendered by the runner.

---

## 5. Reused prebuilt libraries (prefer existing deps)

All already in the stack — **no new dependency required**:
- `react-native-reanimated` (v4) + `react-native-worklets` — the single `withTiming` depletion driver + `useAnimatedProps` (exact pattern in `components/progress/BubbleMeter.tsx`).
- `react-native-svg` (15) — the wedge/ring via `Circle` + `strokeDashoffset` (BubbleMeter reference); the bar can be a plain animated `View` width (no SVG needed).
- `src/theme/*` resolvers + `useThemeTokens` — colors, `animationDurationScale`, `motion.loopsEnabled`, type scale (tabular Lexend for the readout).
- `src/services/sound.ts` + `playCue` — the ducking one-shot for the optional chime (no new audio infra).
- `expo-audio` (already the audio backend) — no new import beyond the existing registry.
- `@gorhom/bottom-sheet` + `components/parent/ui.tsx` `Segmented`/`Chip`/`Stepper` — the parent duration control (no new picker lib).

**No new MIT lib is needed.** (If a build-agent is tempted to add a countdown lib, do not — the depletion is one `withTiming` and a wall-clock subtraction; a dependency would be gold-plating.)

---

## 6. ANTI-SHAME + no-AI rules that apply

- **No failure/loss framing.** A depleted timer is a *rested* neutral state, never "time's up / out of time / failed / you were too slow." Copy is compile-gated through `resolveContent` (both variants reviewed); the empty-state key is `timer.rested`, never an urgency string.
- **No auto-penalty.** Reaching empty does NOT auto-skip, auto-complete, lock the UI, reduce tokens, dim the Done button, or change celebration size. Tokens/celebration come from the unchanged `completeStep` → `resolveCelebration` path (celebration size is decoupled from time and from reinforcement phase).
- **No alarm sensory.** No red/danger color (none exists for kids in the palette), no flashing, no looping tick, no haptic on empty (haptics are positive-only; there is no Warning cue toward a child). The one optional chime is soft, one-shot, off by default, and ducks other audio.
- **Audio never hijacks** — the existing `setAudioModeAsync({ interruptionMode: "duckOthers" })` session guarantees it; this feature adds no session change and no background audio.
- **Sensory respect** — lowStim uses the muted single-hue Stillwater palette; Reduce-Motion uses discrete stepping (no continuous sweep); every channel remains individually toggleable.
- **Zero AI** — the timer is deterministic wall-clock math; no suggestion, no "recommended duration," no adaptive/LLM logic. The parent sets the budget from a curated list; the app never proposes one.
- **Curated autonomy** — durations are a curated short list (Off/30s/1m/2m/5m/10m), not a free-form number entry.

---

## 7. Acceptance criteria + verify steps

### Acceptance criteria
1. A step with `timerSeconds > 0` shows a depleting timer on the active step in **both** shells (young focal wedge, older slim bar); a step without it shows no timer and no layout jump.
2. The timer depletes smoothly in standard/lowStim and in **discrete 1 Hz steps** under OS Reduce-Motion (no continuous worklet animation when `animationDurationScale === 0`).
3. Remaining time is **wall-clock correct** across background/foreground and resume-after-kill (background for N seconds → foreground shows ~N fewer seconds, or a calm empty), with no drift and no crash.
4. Reaching empty produces **no** auto-advance, **no** token/celebration change, **no** red/flash, and **no** sound unless the Settings "Timer sound" toggle is ON — in which case exactly **one** soft chime fires, ducking (not stopping) any other audio.
5. Numeric `m:ss` readout appears **only** when `showNumbersAndCharts` is true (older); young shows the visual only.
6. Copy for the label + empty state resolves through `resolveContent` with both `young`/`older` variants and contains no urgency/shame words.
7. A parent can set/clear a per-step timer from a curated list in the Assign sheet; the value persists on the task and drives the kid runner; templates may carry a default budget.
8. No component reads raw `ageMode`/`sensoryMode`/`reducedMotion`; no `ageMode` prop is passed to any timer/step component.
9. Offline: everything works in airplane mode; web export builds (visual renders; audio/haptics are N/A on web per the strict-subset rule).
10. Existing behavior unchanged: the daypart loop, completion, tokens, celebration, and anti-shame states are byte-for-byte the same for steps with no timer.

### Verify steps (an agent runs)
- `npx tsc --noEmit` → 0 errors (new types + copy keys compile; `ModeKeyed` forces both variants).
- `npm test` → all suites green incl. new `__tests__/domain/timer.test.ts` and `__tests__/components/visualTimer.test.tsx`.
- `npx expo export --platform web` → succeeds (web-safe).
- Grep gates:
  - `grep -rn "timerSeconds" src app components` → renders in `VisualTimer`/`TaskRunner`, set in `gameplay`/`tasks.tsx`/seed only.
  - `grep -rni "time's up\|out of time\|too slow\|failed\|hurry" components/task src/theme/resolveContent.ts` → zero (anti-shame copy gate).
  - `grep -rn "ageMode" components/task/VisualTimer.tsx components/task/TaskRunner.tsx` → no raw reads / no `ageMode` prop.
  - `grep -rn "loop\|withRepeat\|setInterval" components/task/VisualTimer.tsx` → any `setInterval` is the reduced-motion stepping path only; **no** `withRepeat` on the depletion; no looping tick cue.
- Manual (dev client, from `RUN.md`): assign a 1-minute timer to a step; open the kid loop → wedge/bar drains; background 20s → foreground shows ~40s; let it hit 0 → calm rested state, child still completes → normal celebration + token; toggle Reduce-Motion → stepped depletion; toggle lowStim → muted single hue; enable "Timer sound" → one soft chime at 0 that ducks a playing podcast.

---

## 8. Dependencies + premium/free classification

### Depends on (all shipped/green — no unbuilt-spec blockers)
- Core loop runner + celebration: `components/task/TaskRunner.tsx`, `StepCard.tsx`, `DoneButton.tsx`, `hooks/useCelebration.ts`, `components/celebration/*` (M7).
- Theming/age engine: `src/theme/*` — `useThemeTokens`, `resolveCapabilities` (`multiStepVisible`, `showNumbersAndCharts`), `resolveContent` (`ModeKeyed`), `resolveTokens` (`animationDurationScale`, `motion.loopsEnabled`) (M2).
- Data model + stores: `Task.timerSeconds` (M4), `runProgressStore` active-run pointer (M4/doc 70), `src/data/seed.ts` timer copy-through.
- Sensory services: `src/services/sound.ts` / `playCue.ts` (ducking session) for the optional chime (M13).
- Parent authoring: `app/(parent)/tasks.tsx`, `components/parent/pickers.tsx`, `components/parent/ui.tsx` (M9).

### Related specs (no hard dependency)
- **Calm/focus soundscape (#20, `calmSoundscape` premium flag)** — a *future* premium timer soundscape could route through that flag; the **basic visual timer + soft chime here is FREE and standalone**. Do not couple.
- **If-then plans (#21) / Pomodoro (#22)** — may later reuse `VisualTimer` + `src/domain/timer.ts`; build those as consumers, not blockers.

### Premium vs free
**FREE.** The visual transition timer is an executive-function/accessibility scaffold inside the always-free core loop; classifying it premium would gate a transition aid, contradicting the locked "core loop is always free" + "sensory/accessibility axes are never paywalled" rules (`src/services/entitlements.ts` never-gated list). It is **not** added to `FEATURE_GATES` and must **never** be wrapped in `<PremiumGate>`. (Only a hypothetical future *premium timer soundscape pack* would sit behind `calmSoundscape` — out of scope here.)

---

## 9. Open assumptions

1. **Presentational-vs-persisted resume.** Baseline assumes the optional `ActiveRunProgress.stepTimerStartedAt` (§3.2) is added for wall-clock-correct resume. If the build-agent prefers minimal surface, the purely-presentational fallback (§3.2, restart-visual-on-resume) is acceptable and anti-shame-safe. Either is fine; the persisted field is the recommended default.
2. **Single bar location (older).** Assumes one timer instance above the bottom `DoneButton` rather than a per-row underline in the checklist. If UX later wants the underline, it's an additive `StepCard` prop; baseline keeps `StepCard` untouched.
3. **Optional chime ships.** Assumes the `timer.done` cue + `assets/sounds/timer-done.wav` + Settings toggle are in scope (all default-OFF). If audio is deferred, ship the visual-only timer and skip files #11–#14 + the `onEmpty` chime wiring; everything else is unchanged.
4. **Seeded default budgets.** Assumes seeding a few forgiving default `timerSeconds` (§4 #16) for demo value; if the team wants zero default timers, leave templates timer-less and let parents opt in per task. No behavior depends on the seed.
5. **Curated duration set.** Assumes Off/30s/1m/2m/5m/10m is the right curated list; adjustable, but keep it a short curated Segmented (no free-form entry) to honor curated-autonomy.
6. **No background execution.** Assumes the timer never needs to run/notify while the app is backgrounded (Expo-Go/offline constraint). A backgrounded timer simply shows the correct remaining on return; there is no scheduled "timer ended" notification (that would risk the nag/hijack rules).
