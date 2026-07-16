# 70 — Daypart-Driven Kid Flow + Parent/Kid Bifurcation (change spec)

Status: ready to build. Targeted iteration on the shipped app (298 tests green).
Hard rules preserved throughout: **ZERO AI**, **anti-shame** (incomplete = "finish later",
never "failed"/streak-loss), **no component branches on raw `ageMode`** (use
`src/theme` resolvers + capability flags), **web-safe** (AsyncStorage default, no native
clock APIs). Verify each milestone with `npx tsc --noEmit`, `npm test`,
`npx expo export --platform web`.

Root cause recap (from diagnosis, do not re-derive): the kid runner never consults the
clock — `app/(kid)/index.tsx` L37-40 picks `routines.find(r=>r.active) ?? routines[0]`,
and seeded routine order makes `routines[0]` always **morning**. Onboarding activates
exactly one (morning). Separately `runProgressStore.markStepResolved` auto-clears the run
to `null` on the last step, so on remount `TaskRunner`'s start effect (L93-108) finds no
matching run, re-arms every step to `todo` and `startRun`s again — the "goes back to
morning" loop. There is no persisted "this daypart is done today" marker.

---

## (A) DAYPART ENGINE

### A1 — Domain model (`src/domain/dates.ts`, `src/domain/types.ts`)
Add a **pure, deterministic** daypart resolver next to the existing tz-correct helpers
(reuse `isoDay`/`formatInTimeZone`; keep `now`/`tz` passed in so it stays unit-testable
like the rest of `src/domain`).

`src/domain/types.ts` (additions, no breaking changes):
```ts
export type Daypart = "morning" | "afternoon" | "evening" | "night";

/** Local-hour boundaries [start,end) per daypart; parent-tunable later. */
export interface DaypartWindows {
  morning: number;   // default 5
  afternoon: number; // default 12
  evening: number;   // default 17
  night: number;     // default 21  (>= this hour, and wraps until `morning`)
}
```
- Add optional `daypart?: Daypart` to **`Routine`** (L158) and **`RoutineTemplate`** (L690).
  Optional keeps existing persisted `Routine[]` valid without migration; selection falls
  back to `daypartFromSchedule(schedule.timeOfDay)` when the field is absent.
- Extend **`ActiveRunProgress`** is NOT changed; instead add a NEW persisted shape (A3).

`src/domain/dates.ts` (additions):
```ts
import type { Daypart, DaypartWindows } from "./types";

export const DEFAULT_DAYPART_WINDOWS: DaypartWindows =
  { morning: 5, afternoon: 12, evening: 17, night: 21 };

/** Local hour (0-23) for `ts` in `tz` — reuses formatInTimeZone ('H'). */
export function localHour(ts: number, tz: string): number { /* parseInt(formatInTimeZone(ts,tz,"H")) */ }

/** The daypart for `now` in the child's tz. Pure; night wraps past midnight. */
export function getDaypart(now: number, tz: string, w = DEFAULT_DAYPART_WINDOWS): Daypart {
  const h = localHour(now, tz);
  if (h >= w.night || h < w.morning) return "night";
  if (h >= w.evening) return "evening";
  if (h >= w.afternoon) return "afternoon";
  return "morning";
}

/** Map a routine's 'HH:mm' anchor to a bucket (fallback when Routine.daypart absent). */
export function daypartFromSchedule(timeOfDay: string | undefined, w = DEFAULT_DAYPART_WINDOWS): Daypart { /* parse HH -> same bucketing */ }

/** Ordered forward chain used for the "see you this <next>" copy. */
export const DAYPART_ORDER: Daypart[] = ["morning", "afternoon", "evening", "night"];
export function nextDaypart(d: Daypart): Daypart { /* cycles morning after night */ }
```
`night` exists so late-evening opens don't fall back to morning. Night maps to the same
routine list as `evening` for selection (there is no separate night routine); it only
changes the "see you tomorrow morning" copy.

### A2 — Assign dayparts to routines (`src/data/routinePresets.ts`)
Set explicit `daypart` on the 3 presets so selection/grouping share one source of truth
(this also directly serves the "bifurcate chores by daypart" ask):
`morning -> "morning"`, `after_school -> "afternoon"`, `bedtime -> "evening"`.
(Keep `schedule.timeOfDay` for notifications; `daypartFromSchedule` remains the fallback.)

### A3 — Per-day daypart completion marker (`src/state/runProgressStore.ts`)
This is the fix that lets a finished routine STAY finished (calm state) instead of
re-arming. Add a persisted, per-child, per-**local-day** record:
```ts
interface DaypartCompletion { day: IsoDay; completed: Daypart[] }
// state:
completedDayparts: Record<string, DaypartCompletion | null>;
markDaypartComplete: (cid: string, day: IsoDay, dp: Daypart) => void; // resets list if day changed
isDaypartComplete: (cid: string, day: IsoDay, dp: Daypart) => boolean; // false if stored day != day
```
- Add `completedDayparts` to `partialize` so it persists.
- `markDaypartComplete`: if `stored?.day !== day` start a fresh `{ day, completed:[dp] }`
  (this is the **local-midnight rollover** — stale marks auto-drop); else union `dp`.
- Reset path: no explicit cron needed — `isDaypartComplete` returns false whenever the
  stored `day` differs from today, so a new day is automatically "not done".

### A4 — Bug fix: stop the auto-clear → re-arm loop
Two coordinated changes:
1. **`runProgressStore.markStepResolved`** (L56-59): keep auto-clearing the `active` run
   pointer on the last step (resume-after-kill semantics stay clean), BUT the runner must
   no longer treat "no active run" as "start a fresh morning run". The daypart marker (A3)
   is the durable "done" signal.
2. **`TaskRunner` start effect** (L93-108, see B2): only `startRun`/re-arm when
   `!isDaypartComplete(childId, today, routineDaypart)` **and** there is no matching
   persisted run. If the daypart is already complete-for-today, render the calm done panel
   and do NOT re-arm. Reserve re-arm strictly for (a) a true new day (existing
   local-midnight rollover in `reconcileChild`) or (b) an explicit parent/child "do it
   again". Completing the last step must call `markDaypartComplete(childId, isoDay(now,tz),
   routineDaypart)` (in the runner `isLast` branch, alongside the celebrate navigation).

Resume-after-kill: `TaskRunner` continues to match the persisted run by its own
`routineId` + step-id set. Because selection (B1) now resolves the current-daypart routine,
a persisted run for that daypart resumes correctly; a persisted run for a *different*
daypart is simply not surfaced (not abandoned/re-armed) — its progress remains until its
own window or new-day rollover.

---

## (B) KID TIME-DRIVEN EXPERIENCE

### B1 — Time-aware selection (`app/(kid)/index.tsx`)
Replace the time-blind L37-40 selection. New logic (still a thin screen):
- Read child `profile.timeZone` (from `childStore.profiles[cid].timeZone`, L531/childStore
  L52) and `Date.now()`.
- `const dp = getDaypart(now, tz)`.
- Choose the **active** routine whose daypart (explicit `routine.daypart` else
  `daypartFromSchedule(routine.schedule.timeOfDay)`) equals `dp` (night resolves against
  `evening`). Honor `schedule.daysOfWeek` via the existing `isScheduledToday` semantics so
  weekday-only routines don't show on weekends.
- **Forward-only, no morning fallback.** If no active routine matches the current daypart,
  OR `isDaypartComplete(cid, today, dp)` is true, render the calm done state (B3) — NEVER
  `routines[0]`.
- Pass `daypart={dp}` down to `TaskRunner` (new optional prop) so it can stamp completion
  and pick copy.

### B2 — Runner remount safety (`components/task/TaskRunner.tsx`)
- Accept optional `daypart: Daypart`. In the start effect, gate re-arm on
  `!isDaypartComplete(...)` (A4.2). Keep `sameSet` resume matching.
- In `onDone` `isLast` branch: call `markDaypartComplete(...)` before/with the celebrate
  push. In `onSkip` last-step branch: same (skipping to the end still settles calmly).
- Replace **CompletionPanel** copy + affordances: remove the always-present "Do it again"
  as the primary CTA and the "Back home" that `router.replace('/(kid)')` re-enters the loop.
  Instead show the anti-shame daypart done state (B3). Keep a small, secondary,
  non-looping "Do it again" ONLY as an explicit opt-in (calls `restart()` which re-arms
  just this routine) — it must not be the default focus and must not fire on remount.

### B3 — Calm "all done for now" state (new: `components/kid/DaypartDonePanel.tsx` + copy)
A dedicated, reusable panel rendered by `(kid)/index.tsx` (empty/complete) and by
`TaskRunner`'s allDone branch. Big/playful, one message, zero guilt:
- Headline from resolver (B4), e.g. young "All done! See you this afternoon 🌤" /
  older "All set for now — next up this afternoon".
- Uses `nextDaypart(dp)` for the "see you this <next>" line; if `dp==="evening"`/night the
  line becomes "see you tomorrow morning".
- Shows the buddy + running bubble balance (reuse existing BalanceChip). No restart as the
  primary action.

### B4 — Content keys (`src/theme/resolveContent.ts`)
Add to the `COPY` table (each MUST carry BOTH `young` + `older` — the `satisfies
Record<string, ModeKeyed<string>>` constraint enforces it at compile time). Suggested keys:
```
"daypart.done.morning"   { young: "Morning done! See you this afternoon 🌤", older: "Morning routine complete. Next up this afternoon." }
"daypart.done.afternoon" { young: "Nice! See you this evening 🌙",           older: "Afternoon done. Next up this evening." }
"daypart.done.evening"   { young: "All done! See you tomorrow ☀️",            older: "Evening done. See you tomorrow morning." }
"daypart.empty"          { young: "Nothing to do right now 🫧",               older: "Nothing scheduled right now." }
"daypart.peek"           { young: "See what's later",                         older: "Peek at later" }
```
(Resolve via the existing `resolveContent(key, { ageMode })` seam; components never branch
on `ageMode` themselves.)

### B5 — Gentle peek at later dayparts (no active-routine hijack)
Add a low-emphasis "See what's later" affordance on the done/empty panel that opens a
**read-only** modal (new `app/(kid)/peek.tsx`, pushed route) listing the other dayparts'
routines + steps as static chips. It must NOT call `startRun`/`setRoutineActive` or change
the active run — purely informational, forward-only preserved. Auto-speak the daypart names
for non-readers via the existing TTS path.

---

## (C) PARENT OVERALL DASHBOARD (mission control)

### C1 — Rebuild `app/(parent)/dashboard.tsx` into a control surface
Currently a nav menu that never reads routines/run progress. Rework per-child card to read
`taskStore.routines[cid]` + `taskStore.tasks[cid]` + `runProgressStore.active[cid]` +
`runProgressStore.isDaypartComplete`. For each child:
- **Routines grouped by daypart** (Morning / Afternoon / Evening) with live today
  completion, e.g. "Morning 3/6 · Afternoon not started · Evening 0/5". Highlight the
  routine matching `getDaypart(now, tz)` so the parent sees what the kid sees right now.
  Completion = `completedStepIds` for an in-progress run, or "done for today" via
  `isDaypartComplete`, else count of `status==='done'` steps. Anti-shame labels only
  ("not started"/"finish later", never "missed"/"failed").
- **Tokens**: show balance + held/escrow + lifetimeEarned (data already in ledger; today
  only shows a single balance number).
- **Pending reward redemptions**: read `rewardStore.redemptions[cid]` where
  `status==='requested'`; render an Approve/Deny strip wired to the EXISTING
  `approveReward(cid, requestId)` / `declineReward(cid, requestId, reasonKidSafe)` in
  `src/state/gameplay.ts` (this capability exists but is surfaced only to the kid today —
  the single biggest missing parent action).
- **Quick actions**: inline toggle a routine active/inactive (`taskStore.setRoutineActive`),
  a "＋ add task to <daypart>" shortcut that deep-links `app/(parent)/tasks.tsx` with the
  target daypart preselected, and "Manage rewards" → `rewards-setup`.
- Keep the existing "Done" (lock + return to kid) and Plus/PIN-gated purchase row.

### C2 — Group chores by daypart in `app/(parent)/tasks.tsx`
Change the flat routines list into Morning / Afternoon / Evening sections (derive bucket
from `routine.daypart ?? daypartFromSchedule(...)`). Accept an optional `daypart` route
param (from C1's quick-add) to scroll/expand that section and default the assign sheet's
target. Additive only — keep existing toggle/add-step/proposal-approval behavior.

All parent surfaces stay dense/utilitarian and behind the PIN gate; no `ageMode` branching
(use resolvers/`ageModeLabel`).

---

## (D) ROLE SPLIT / BIFURCATION AT LAUNCH

- **Default landing stays kid** (`app/index.tsx`: onboarding-complete → `/(kid)`) — correct
  per product intent. No change to boot redirect logic.
- **Consistent grown-ups door**: today the only entry is a link at the bottom of
  `app/(kid)/rewards.tsx` (L199), absent from the young single-surface shell's other
  screens. Move a small, persistent, PIN-gated "Grown-ups 🔒" affordance into the kid shell
  **`app/(kid)/_layout.tsx`** (a corner/header control rendered in BOTH `YoungStack` and
  `OlderTabs`) so it exists on every kid surface. It pushes `/(gate)/parental-gate`; on pass
  the gate `router.replace('/(parent)')` lands on the upgraded dashboard (C1). Remove the
  now-redundant inline link from `rewards.tsx` (or keep as secondary — pick one, don't
  duplicate the concept twice).
- **Visually/functionally distinct, one codebase**: kid = big/playful/one-thing-at-a-time
  (`TaskRunner` + daypart done panel); parent = dense mission-control dashboard behind the
  gate. `app/(parent)/_layout.tsx` guard on `sessionStore.parentUnlocked` is unchanged; the
  flag still clears on app-background (ThemedRoot). No second app, no new route group.

---

## (E) SEED DATA (additive, anti-shame, per-daypart real chores)

### E1 — New task templates (`src/data/taskTemplates.ts`)
Add (keep the existing 15; append so `TASK_TEMPLATES_BY_ID` gains keys — additive):
```
tpl("have_snack",   "Have a snack",        "🍎", "#FFB4A2", "meals",      BOTH)
tpl("eat_dinner",   "Eat dinner",          "🍽️", "#F4A261", "meals",      BOTH)
tpl("go_to_bed",    "Get into bed",        "🛌", "#8E7DBE", "bedtime",    BOTH)
```
(`pack_bag` 🎒 already covers "backpack"; `brush_teeth`/`bath_time`/`pajamas`/`homework`/
`tidy_toys`/`get_dressed`/`eat_breakfast` already exist. Only snack/dinner/get-into-bed are
missing.)

### E2 — Fill out the 3 daypart routines (`src/data/routinePresets.ts`)
Give each a real, ordered, spoken-labeled chore list and a `daypart` field:
- **morning** (`daypart:"morning"`): `get_dressed`, `eat_breakfast`, `brush_teeth`,
  `pack_bag` (+ keep `wash_hands`/`put_on_shoes` as-is if desired). Weekday `daysOfWeek
  [1-5]` retained.
- **after_school → afternoon** (`daypart:"afternoon"`): `have_snack`, `homework`(older),
  `tidy_toys`(young via existing `ageOnly`), `water_drink`, `calm_breaths`.
- **bedtime → evening** (`daypart:"evening"`): `eat_dinner`, `bath_time`, `pajamas`,
  `brush_teeth`, `story_time`, `go_to_bed`. Set `daysOfWeek: []` (every day) so evenings are
  never empty (today bedtime already uses `[]`).

All labels already carry `spokenLabel` + `emoji` (non-reader support). No verification/no
guilt — `verification.mode:"none"` inherited from templates.

### E3 — Activate all three by default (`src/data/seed.ts` + onboarding, see F)
Because the experience is now daypart-driven, empty afternoons/evenings look broken. Either:
(a) seed all 3 routines `active: true` (change L156 `active: false` → true), OR
(b) keep seeding inactive but have onboarding auto-activate all three for the seeded child.
**Recommend (b)** to keep seed neutral and let onboarding own activation (F4). Whichever is
chosen, the end state after onboarding MUST be: one active routine per daypart.

---

## (F) ONBOARDING STREAMLINE (per diagnosis: 8 → ~4 screens)

Update the canonical order + union + test **together** (they're locked):
`components/onboarding/steps.ts` (`ONBOARDING_ORDER`), `src/domain/types.ts`
(`OnboardingStep` union L611), `__tests__/components/onboardingSteps.test.ts` (CANONICAL
array + gate-before-child invariant). Preserve invariants: PIN/gate step precedes child
creation; `privacyConsentAckAt` still written; a child + ≥1 live routine before `(kid)`;
resume-after-kill `currentStep` mapping intact.

Target sequence (4 steps):
1. **`welcome`** — merge welcome + privacy: one honest line ("A calm, playful way to build
   routines — not a medical treatment"), 2 short data lines + expandable full facts, and the
   PRIMARY button IS the single consent ("I'm the grown-up — continue" → writes
   `privacyConsentAckAt`). Remove the separate "I'm a parent" toggle (no double consent).
2. **`parent_gate_setup`** — PIN only. Remove the inline "Save" button and the entry-
   challenge Segmented from onboarding (default challenge to `math` silently; it's already
   editable in `settings.tsx`). Add a confirm-PIN field (or type-once + show/hide);
   auto-enable sticky Continue when a valid 4-8 digit PIN matches its confirm; call
   `hashPin`/`configureParentGate` on Continue (not mid-screen). Keeps gate-before-child.
3. **`child_setup`** — name + age → `createChildWithSeed` (unchanged core). Make
   `ChildModePreview` lighter/collapsible. Fold `calm_offer` in as one optional inline note
   ("Prefer no tokens/confetti? Switch to calm mode in Settings") — drop the whole
   `calm_offer` screen (still set `calmModeOffered` here to preserve the "offered once"
   invariant).
4. **`done`** (hand-off) — merge `pick_buddy` + `first_task` + `done`: **auto-activate all
   three daypart routines** (replaces the manual single-routine pick that conflicts with the
   time-driven model), show the seeded buddy with an optional inline rename (defer color to
   Settings), one line teaching the bifurcation ("Open the grown-up dashboard any time with
   your PIN"), then `completeOnboarding()` + `router.replace('/(kid)')`.

Delete the now-unused route files (`privacy-consent.tsx`, `pick-buddy.tsx`,
`first-task.tsx`, `calm-offer.tsx`) OR collapse their logic into the 4 remaining screens;
update `app/(onboarding)/_layout.tsx` Stack screens accordingly. Reduce OnboardingShell TTS
auto-speak on the PIN/consent (grown-up) screens; keep auto-speak on the kid-facing hand-off.

Removed `OnboardingStep` members: `privacy_consent`, `pick_buddy`, `first_task`,
`calm_offer`. Add a `currentStep` migration/clamp so a persisted in-flight value that no
longer exists maps to a valid step (e.g. any removed value → `welcome`, or nearest survivor)
to keep resume-after-kill safe.

---

## MILESTONE → FILE MAP (ordered)

### I1 — Daypart engine + bug fix + seed (foundation; land first, keep green)
CREATE: (none required; all edits) — optionally `__tests__/domain/daypart.test.ts`.
MODIFY:
1. `src/domain/types.ts` — add `Daypart`, `DaypartWindows`; optional `daypart` on `Routine`
   + `RoutineTemplate`.
2. `src/domain/dates.ts` — `localHour`, `getDaypart`, `daypartFromSchedule`,
   `DEFAULT_DAYPART_WINDOWS`, `DAYPART_ORDER`, `nextDaypart`.
3. `src/state/runProgressStore.ts` — `completedDayparts` map + `markDaypartComplete` /
   `isDaypartComplete`; add to `partialize`. (Keep `markStepResolved` auto-clear.)
4. `src/data/taskTemplates.ts` — add `have_snack`, `eat_dinner`, `go_to_bed`.
5. `src/data/routinePresets.ts` — set `daypart` on 3 presets; fill step lists (E2);
   bedtime `daysOfWeek: []`.
6. `src/data/seed.ts` — (if using E3-a) `active: true`; else no change.
7. TESTS: new `__tests__/domain/daypart.test.ts`; extend
   `__tests__/domain/tasks.test.ts` only if selection helpers move there. Guard
   `edge-dst.test.ts`, `gameplay.test.ts`.

### I2 — Kid time-driven flow (depends on I1)
CREATE: `components/kid/DaypartDonePanel.tsx`, `app/(kid)/peek.tsx`.
MODIFY:
1. `app/(kid)/index.tsx` — time-aware selection (B1); render `DaypartDonePanel` on
   empty/complete; pass `daypart` to runner.
2. `components/task/TaskRunner.tsx` — `daypart` prop; gate re-arm on `isDaypartComplete`
   (A4/B2); stamp `markDaypartComplete` on last done/skip; replace CompletionPanel with the
   calm done state; demote "Do it again".
3. `src/theme/resolveContent.ts` — add `daypart.done.*` / `daypart.empty` / `daypart.peek`
   copy (both variants).
4. `app/(kid)/_layout.tsx` — register `peek` as a pushed/modal route.
5. TESTS: extend TaskRunner/kid-home coverage — remount after complete stays on done panel
   (no loop); afternoon open selects afternoon; weekend hides weekday-only.

### I3 — Parent dashboard mission control + role split (depends on I1)
CREATE: (none required).
MODIFY:
1. `app/(parent)/dashboard.tsx` — per-child daypart grouping + completion + tokens +
   pending-redemption Approve/Deny (wire `approveReward`/`declineReward`) + quick actions
   (C1).
2. `app/(parent)/tasks.tsx` — group routines by daypart; accept `daypart` route param (C2).
3. `app/(kid)/_layout.tsx` — persistent PIN-gated "Grown-ups 🔒" control in both shells (D).
4. `app/(kid)/rewards.tsx` — remove/relegate the duplicate inline grown-ups link.
5. (read-only deps, no change): `app/(gate)/parental-gate.tsx`, `app/(parent)/_layout.tsx`,
   `src/state/gameplay.ts`, `src/state/rewardStore.ts`, `src/state/sessionStore.ts`.
6. TESTS: dashboard renders daypart completion + redemption approve path.

### I4 — Onboarding streamline (depends on I1 for auto-activate-all)
CREATE: (none).
MODIFY / DELETE:
1. `src/domain/types.ts` — trim `OnboardingStep` union (F) + `currentStep` clamp/migration.
2. `components/onboarding/steps.ts` — new 4-step `ONBOARDING_ORDER`.
3. `__tests__/components/onboardingSteps.test.ts` — update `CANONICAL`; keep gate-before-
   child + every-step-has-route invariants.
4. `app/(onboarding)/index.tsx` (welcome+privacy merge), `parent-gate-setup.tsx`
   (PIN-only + confirm + auto-enable), `child-setup.tsx` (inline calm note, lighter
   preview), `done.tsx` (hand-off: auto-activate all 3 routines, buddy rename, bifurcation
   line, complete+replace).
5. DELETE (or collapse): `privacy-consent.tsx`, `pick-buddy.tsx`, `first-task.tsx`,
   `calm-offer.tsx`; update `app/(onboarding)/_layout.tsx` Stack screen list.
6. `components/onboarding/OnboardingShell.tsx` / `useOnboardingVoice.ts` — mute auto-speak on
   grown-up (PIN/consent) screens; keep it on the hand-off.
7. TESTS: onboarding step-map test; add a resume-clamp test for removed `currentStep` values.

---

## GUARDRAILS CHECKLIST (every milestone)
- No AI anywhere; companion stays a non-AI pet.
- Anti-shame copy only: "finish later"/"see you this afternoon"; never "failed"/"missed"/
  streak-loss. Skipping stays free.
- No component reads raw `ageMode` — go through `resolveContent` / capability flags
  (`multiStepVisible`, etc.).
- Web-safe: `getDaypart` uses `date-fns-tz` `formatInTimeZone` (already a dep), no native
  clock. All new persisted state via existing `createTbPersistOptions` (AsyncStorage).
- Deterministic domain: `now`/`tz` passed in; keep suites green
  (`npx tsc --noEmit && npm test && npx expo export --platform web`).
