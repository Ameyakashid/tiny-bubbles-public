# Feature Spec — If-Then "When X, I will Y" Plans (`if-then-plans`)

Status: ready to build (additive delta on the shipped app). Research tier: later (#21).
Premium/free: **authoring + firing a small library of plans (free ceiling 2) + all
point-of-performance cue firing for owned plans = FREE**; **a larger plan library = PREMIUM
(new `ifThenPlans` count gate, mock-gated)**. The core loop is always free.

Hard rules preserved throughout (do not relitigate):
**ZERO AI** — plans are authored from CURATED cue/action templates only; there is no
natural-language parsing, no "we noticed you always…" suggestion engine, no LLM, no situational
auto-detection. The app stores and displays exactly the cue + action the family picked.
**ANTI-SHAME** — a plan is never "failed"/"missed"; there is no adherence tracking, no streak,
no nag, no token clawback; the optional "I did it!" acknowledgement is purely positive and
gives nothing punitive. Notification copy passes the existing banned-phrase gate.
**OFFLINE / on-device only** — plans live in a new persisted `planStore` slice (`tb/plans`,
AsyncStorage behind the storage port); nothing is uploaded. **Age-adaptive ONLY via `src/theme`
resolvers + capability flags** — no component reads raw `ageMode`, no `ageMode` prop.
**Expo Go / web-safe** — pushed-modal routes, reuse the existing `expo-notifications` +
`expo-speech` seams (no new native module), animations gated on `t.motion`.

Verify every milestone with: `npx tsc --noEmit`, `npm test`, `npx expo export --platform web`.

---

## 1. Overview + user value

Kid **and** caregiver sit together and author a small "**when X, I will Y**" plan — an
*implementation intention* that couples a concrete cue to a concrete action (e.g. "When I
finish breakfast, I will pack my bag" · "When I get home from school, I will take three calm
breaths"). The app then **fires the cue at the point of performance** through the mechanisms it
can honestly support offline with no AI:

- **Time cues** → a gentle local notification at the chosen time (reusing the shipped reminder
  pipeline, so it is quiet-hours-aware and budget-capped).
- **After-a-step cues** → an in-app "now your plan" card that appears the moment the linked
  routine step is completed in the runner (genuine point-of-performance).
- **After-a-routine cues** → surfaced on the calm daypart-done panel when that daypart finishes.
- **Situational cues** (e.g. "when I feel wiggly") → the app **cannot and does not claim to
  detect** these offline; they live as a glanceable "My Plans" card the child/parent can open
  as a reminder, with an OPTIONAL, purely-positive "I did it!" nod. This honesty is a feature,
  not a gap.

**Why (honest, cited):**
- **Community/market demand.** If-then plans help task initiation and distraction resistance and
  pair naturally with point-of-performance prompts (`_build/research/01-feature-matrix.md` #21;
  `_build/research/00-SYNTHESIS.md` §2.1 step 3 — reinforce *at the moment of behavior*). The
  daypart engine already anchors the kid experience to real local time, so cue firing has a
  natural home (`_build/plan/70-daypart-bifurcation.md`).
- **Verified science, stated modestly (this is load-bearing for the copy).** Per the adversarial
  fact-check, implementation intentions help children but the effect is **small (g≈0.31, likely
  lower after bias correction)** and the ADHD evidence is **lab-only** (response inhibition, not
  real-world task completion). It is **low-cost, low-harm; calibrate expectations**
  (`01-feature-matrix.md` #21 `implementation-intentions`). We therefore: make **zero clinical
  claims**, frame plans as "a little reminder you make for yourself," keep the whole feature
  optional, and never present a plan as a treatment or a guaranteed behavior change. This is the
  "honest low-cost framing" the brief requires.
- **Anti-dark-pattern.** No streak on plans, no guilt for not doing one, no daily nag — consistent
  with the must-avoid list (`00-SYNTHESIS.md` §4.1/§4.3) and the reminder-tone guarantee
  (`_build/plan/66-MASTER-PLAN.md` §1b.14).

**Donor grounding (concept only, no code copied):** the point-of-performance cue-firing reuses
the shipped `src/services/notifications.ts` (itself re-authored from the lockin notifications
*pattern*, MIT). Plan authoring is NEW glue over the existing curated pickers
(`components/parent/pickers.tsx`) and the task/reward authoring patterns already in the repo.

---

## 2. UX behavior, screen-by-screen

### 2.0 Where plans are authored (parent-gated, co-authored)

Authoring lives in the PIN-gated `(parent)` area — the same place tasks and rewards are authored
— so "kid + caregiver author" means the grown-up unlocks the gate and they build the plan
**together**, and curated autonomy (no free-text from a child) is preserved by construction.
Older kids granted `delegateToChild`/`canAddTasks` may additionally **propose** a plan into the
parent-approval queue (mirrors the shipped task-proposal flow), but a plan is never live until a
parent confirms it.

### 2.1 Parent authoring — `app/(parent)/plans.tsx` (new, PIN-gated)

A dense, utilitarian surface (like `app/(parent)/rewards-setup.tsx`), reachable from a new
"Plans" row on the dashboard management area. Uses `components/parent/ui.tsx`
(`Card`, `SectionTitle`, `PrimaryButton`, `Segmented`, `Note`) + `components/parent/pickers.tsx`
(`EmojiField`, `TimeField`, `DayPicker`).

Flow (2–4 taps, template-first):
1. **Pick a cue** (`components/plans/PlanAuthor.tsx`, "cue" step). A `Segmented` chooses the cue
   *type* (When it's a time · After a step · After a routine · A situation), then a curated
   list of cue templates from `src/data/planTemplates.ts` fills the "when X":
   - **time** → pick from `TimeField` + `DayPicker` (e.g. 16:00 weekdays); phrase = "When it's
     4:00".
   - **afterStep** → pick one of the child's existing routine steps (from `taskStore.tasks[cid]`);
     phrase = "After I finish {step}".
   - **afterRoutine** → pick one of the child's routines / a daypart; phrase = "When my morning
     is done".
   - **situational** → pick a curated `SITUATION_TEMPLATES` entry (e.g. "When I get home", "When
     I feel wiggly", "When the timer beeps"); phrase = that entry's label. A `Note` states
     plainly: *"The app can't sense this one — it's a plan you'll remember together."*
2. **Pick an action** ("action" step): either **link an existing task** (from the child's tasks,
   so completing it pays tokens normally) OR pick a curated `PLAN_ACTION_TEMPLATES` entry
   ("take 3 calm breaths", "start my homework", "put my shoes away", "drink some water"). The
   action carries its own `spokenLabel` + emoji.
3. **Preview + save.** The assembled sentence renders via `assemblePlanPhrase(plan, ageMode)`
   ("When I finish breakfast, I will pack my bag") and can be **spoken aloud** (a "🔊 Hear it"
   button → `speak(...)`), so a non-reading child hears the plan they co-authored. Save is gated
   by `<PremiumGate feature="ifThenPlans" currentCount={activePlans.length}>` (§9).
4. **Manage list.** Existing plans list with the assembled phrase, an active toggle
   (`setPlanActive`), edit, and archive. A pending kid-proposal queue (when `canAddTasks`) shows
   Approve / Dismiss (never a shaming "reject").

Parent surfaces stay dense, behind the gate, and use `ageModeLabel` (no raw `ageMode`).

### 2.2 Kid "My Plans" glance — `app/(kid)/plans.tsx` (new pushed-modal route, both shells)

A calm, read-only surface modeled on `app/(kid)/peek.tsx` (pushed modal, ✕ close, `router.back()`),
listing the child's **active** plans as if-then cards (`components/plans/PlanCard.tsx`). It never
starts a run and never gates anything. Each card:
- Shows the assembled "when X → I will Y" phrase with the cue + action emoji, resolver-styled
  (young: two big stacked lines with an arrow; older: one sentence).
- Auto-speaks on open for `young` / speaks on tap for `older` (respect `spokenLabelsEnabled`),
  reusing `SpokenLabel` / `speak(...)` exactly like `peek.tsx`.
- For a **situational** plan, shows an OPTIONAL, low-emphasis "I did it! 🫧" nod. Tapping it fires
  a gentle buddy `happy` mood via `buddyStore.applyEvent(cid, "stepDone")` (a positive-only event)
  and a soft `playCue("tap.soft")` — **no tokens, no streak, no record of not doing it**. This is
  the only "did you do it" affordance in the whole feature and it can only ever be positive.

Entry points to `/(kid)/plans` (only shown when the child has ≥1 active plan):
- A low-emphasis "My plans" chip on `components/kid/DaypartDonePanel.tsx` (peer of the existing
  "See what's later" peek link).
- In `young` the single-Stack surface reaches it via that chip; in `older` it is reachable from
  the same chip (kept as a pushed modal, NOT a fifth tab, to avoid tab-bar clutter).

### 2.3 Point-of-performance cue firing (the core of the feature)

**(a) Time cues → a gentle notification.** A `time` plan is mapped to a `ReminderAnchor` via
`planToReminderAnchor(plan)` and fed into the EXISTING `rescheduleReminders(...)` alongside
routine reminders — so plan cues automatically inherit quiet-hours suppression, the per-day
`maxPerDay` budget (they can NEVER become a notification flood), the deferred permission prompt,
and the fixed friendly copy + banned-phrase gate. The anchor's `spokenLabel` is the assembled
if-then phrase, which the existing `buildReminderContent` wraps ("Whenever you're ready: When
it's homework time, I'll start my homework. 🫧"). On tap-through, the app foregrounds and speaks
the plan phrase (the existing `addReminderTapListener` path in `app/_layout.tsx`).

**(b) After-a-step cues → an in-app card.** In `components/task/TaskRunner.tsx`, right after a
step is completed (`onDone`), the runner looks up any active `afterStep` plan whose
`cue.taskId === task.id` (selector `plansForStep(plans, taskId)`) and, if found, shows a calm,
non-blocking `components/plans/PlanCuePanel.tsx` ("Now your plan: **pack your bag** 🎒") below the
focal step (young) / above the checklist (older). It is dismissible, never gates the next step,
and — if the plan's action links a task (`action.linkedTaskId`) — offers a low-emphasis "Do it
now" that scrolls to / activates that task. It is NOT a celebration (a cue is not a reward): no
confetti, no token, no haptic beyond a soft tick.

**(c) After-a-routine cues → the daypart-done panel.** When a daypart finishes,
`components/kid/DaypartDonePanel.tsx` (mode `"done"`) surfaces any active `afterRoutine` plan for
that routine/daypart as a single calm line under the headline ("Next, your plan: put your shoes
by the door 👟").

**(d) Situational cues → self-checked only.** No firing; they live on the "My Plans" glance
(§2.2). The app never claims to detect them; this is stated in the parent authoring `Note` and by
the absence of any time/step wiring.

### 2.4 YOUNG vs OLDER differences (via resolvers + capability flags)

| Derived (resolver/flag) | `young` | `older` |
|---|---|---|
| Plan sentence framing | `resolveContent("plans.arrow"...)` two stacked lines + arrow; auto-speak on open | one-sentence "When X, I will Y"; speak on tap |
| Cue-card emphasis in runner | large, single, below the focal step | compact, above the checklist |
| "My plans" entry | done-panel chip (no tab) | done-panel chip (pushed modal, not a tab) |
| Propose-a-plan (kid) | off (parent authors) | available only when `canAddTasks`/`delegateToChild` granted |
| Situational "I did it!" nod | large tap target, auto-spoken | standard |

No component reads `ageMode` — the table is produced entirely by `resolveContent(...)` (the
if-then framing keys) and the resolved `caps.canAddTasks` flag.

### 2.5 Low-stim / calm variants

- `sensoryMode === "lowStim"` OR OS Reduce-Motion (`t.motion.loopsEnabled === false`): the
  `PlanCuePanel` appears with no spring/scale animation (instant, static), matching the calm-
  select discipline used in `calm.tsx`; the "My Plans" glance uses the desaturated palette
  automatically (tokens already resolve lowStim); no drifting-bubble background.
- `calmMode` (non-gamified child): fully compatible. Plans are inherently non-gamified (no
  tokens/celebration), so this feature is at home here. The situational "I did it!" nod still
  fires only the positive buddy mood — never anything scored.

---

## 3. Data-model additions (exact types + store + migration)

### 3.1 New types — `src/domain/types.ts` (ADDITIVE; no existing type changes)

```ts
/** How a plan's cue fires. Only `time`/`afterStep`/`afterRoutine` are auto-fired;
 *  `situational` is self-checked (the app never claims to detect it) — anti-overclaim. */
export type PlanCueType = "time" | "afterStep" | "afterRoutine" | "situational";

export interface PlanCue {
  type: PlanCueType;
  /** the "when X" phrase, spoken + shown (REQUIRED spokenLabel for non-readers) */
  label: VisualLabel;
  // type: 'time' — point-of-performance notification
  time?: string;            // 'HH:mm' local
  daysOfWeek?: number[];    // 0-6; empty => every day (matches TaskSchedule)
  // type: 'afterStep' — surfaced in-app when this task/step completes in the runner
  taskId?: string;
  // type: 'afterRoutine' — surfaced on the daypart-done panel
  routineId?: string;
  daypart?: Daypart;        // for grouping / the after-routine surface
  // type: 'situational' — a curated, human-recognizable trigger the app CANNOT sense
  situationId?: string;
}

export interface PlanAction {
  /** the "I will Y" phrase, spoken + shown */
  label: VisualLabel;
  /** optional link to an existing task the plan initiates; completing it pays tokens
   *  normally through the existing loop — a plan itself never pays tokens. */
  linkedTaskId?: string | null;
}

export interface Plan {
  id: string;
  childId: string;
  cue: PlanCue;
  action: PlanAction;
  active: boolean;
  /** always co-authored; default 'together'. A kid-proposed plan is held until approved. */
  authoredBy?: "together" | "parent" | "child";
  /** child-PROPOSED plan awaiting parent approval (mirrors Task.proposed) — never live
   *  in the kid surfaces until a parent approves it. Absent/false => a normal plan. */
  proposed?: boolean;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  archived: boolean;
}

/** Curated authoring library entries (seed data, §5). No free-text kid input (no-AI). */
export interface PlanCueTemplate {
  id: string;
  type: PlanCueType;
  label: VisualLabel;      // "When I get home from school" etc.
  situationId?: string;    // set for `situational` templates
}
export interface PlanActionTemplate {
  id: string;
  label: VisualLabel;      // "Take 3 calm breaths" etc.
}
```

`Daypart`, `VisualLabel`, `EpochMs` already exist in `src/domain/types.ts` — reused, not
redefined. `Plan` carries **no field that can represent failure/loss/decay** (anti-shame
invariant, `types.ts` L59-66): there is no "missed", no adherence counter, no streak.

### 3.2 New store — `src/state/planStore.ts` (persisted `tb/plans`)

A new Zustand persisted store, same shape/discipline as `taskStore`/`rewardStore` (flat key,
keyed by childId internally):

```ts
export interface PlanStoreState {
  plans: Record<string, Plan[]>;                 // childId -> plans
  addPlan: (cid: string, plan: Plan) => void;
  updatePlan: (cid: string, planId: string, patch: Partial<Plan>) => void;
  setPlanActive: (cid: string, planId: string, active: boolean) => void;
  archivePlan: (cid: string, planId: string) => void;
  // kid proposal queue (only when caps.canAddTasks) — mirrors gameplay's task proposals
  proposePlan: (cid: string, plan: Plan) => void;   // sets proposed:true
  approvePlan: (cid: string, planId: string) => void; // clears proposed
  dismissPlan: (cid: string, planId: string) => void; // archives (never a "reject")
}
```

Persisted via `createTbPersistOptions<PlanStoreState>({ name: "plans", partialize: s => ({ plans: s.plans }) })`
and registered with `registerPersistedStore(usePlanStore.persist)` (the exact pattern in
`src/state/taskStore.ts` L164-176). Key resolves to `tb/plans` via `namespacedStoreKey`.

### 3.3 Wiring the new slice into delete / review (must-not-miss)

- `src/state/gameplay.ts#wipeAllChildData` (L368-384): add `usePlanStore.setState({ plans: {} })`
  so "delete all child data" clears plans too (COPPA on-device delete).
- If a per-child reset path exists (`resetChildData` per the current-state doc §1.6), it must
  delete this child's `plans[cid]` entry as well.
- `app/(parent)/settings.tsx` `DataReview` (L312-355): add `plans: sumLen(plan.plans)` to
  `counts` and `plans: plan.plans` to `stored`, so "Review what's stored" shows plans and any
  local backup/export includes them.

### 3.4 Migration notes (additive → no global schema bump)

`tb/plans` is a **brand-new persist key**: existing installs have no such key, so it hydrates to
the default `{ plans: {} }` — nothing to migrate. All new types are additive and optional where
attached to shared shapes, so `mergeWithDefaults` / `validateAndRepair`
(`src/storage/migrations.ts`) are unaffected and **`SCHEMA_VERSION` stays 1**; `MIGRATIONS` stays
empty for this feature. If the `Plan` shape later changes in a breaking way, bump the planStore's
own `version` in `createTbPersistOptions({ name: "plans", version: 2, migrate })` (the per-store
migrate seam already exists, `src/storage/persist.ts` L61) — a store-local migration, not a global
one. No anti-shame invariant is added or weakened (a `Plan` cannot represent failure), so
`validateAndRepair` needs no new rule.

---

## 4. Age-adaptation: resolver + capability wiring

### 4.1 No new capability flag required — reuse `canAddTasks`

The kid **propose-a-plan** path reuses the resolved `caps.canAddTasks` flag
(`src/theme/resolveCapabilities.ts` L37/L127) — the same grant that governs child task proposals.
Authoring is otherwise parent-gated (no kid capability). The "My Plans" glance is available
whenever the child has ≥1 active plan (a data condition, not a capability).

### 4.2 New copy keys — `src/theme/resolveContent.ts`

Add to `COPY` (each MUST carry BOTH `young` + `older`; the
`satisfies Record<string, ModeKeyed<string>>` constraint enforces both variants at compile time —
see `src/theme/__typetests__/content-typetest.ts`):

```
"plans.title"      { young: "My plans",                 older: "My plans" }
"plans.when"       { young: "When",                     older: "When" }
"plans.thenYoung"  { young: "I'll",                     older: "I will" }   // sentence glue
"plans.now"        { young: "Now your plan!",           older: "Now your plan" }
"plans.doItNow"    { young: "Do it now",                older: "Do it now" }
"plans.didIt"      { young: "I did it! 🫧",              older: "Did it" }
"plans.hearIt"     { young: "🔊 Hear it",               older: "🔊 Hear it" }
"plans.emptyKid"   { young: "No plans yet 🫧",           older: "No plans yet." }
"plans.entry"      { young: "My plans",                 older: "My plans" }
```

The assembled sentence is produced by a PURE helper `assemblePlanPhrase(plan, ageMode)` in
`src/domain/plans.ts` (§5) that composes the cue label + `plans.thenYoung` glue + action label,
so the exact wording flows from the resolver and no component branches on `ageMode`. Parent-facing
strings (authoring labels) use plain text + `ageModeLabel` only.

---

## 5. Files to CREATE and MODIFY (real paths under `tiny-bubbles/`)

### CREATE

1. `src/domain/types.ts` additions are listed under MODIFY (they extend the canonical file).
2. `src/domain/plans.ts` — PURE, unit-testable, no React/store:
   - `assemblePlanPhrase(plan, ageMode): { cue: string; action: string; spoken: string }` —
     composes the if-then sentence + a single TTS string.
   - `planToReminderAnchor(plan): ReminderAnchor | null` — maps a `type:'time'` active plan to a
     `ReminderAnchor` (id `plan:${plan.id}`, `time`, `daysOfWeek`, `spokenLabel` = assembled
     phrase). Returns null for non-time / inactive / invalid-time plans.
   - selectors: `activePlans(plans)`, `plansForStep(plans, taskId)`, `plansForRoutine(plans, routineId)`,
     `plansForDaypart(plans, daypart)`, `situationalPlans(plans)`.
   - `assertPlanCopyClean(phrase): void` — dev guard that runs the assembled phrase through the
     notifications module's `isReminderCopyClean` so an authored plan can never smuggle a banned
     tone into a notification (throws in `__DEV__`; asserted in tests).
3. `src/data/planTemplates.ts` — curated content (like `taskTemplates.ts`):
   `PLAN_CUE_TEMPLATES` (time/afterStep/afterRoutine builders + a handful of situational),
   `SITUATION_TEMPLATES`, `PLAN_ACTION_TEMPLATES`, and a `planFromTemplates({cueTemplate, actionTemplate, ...})`
   builder. All entries carry `spokenLabel` + `emoji` + `color`.
4. `src/state/planStore.ts` — the persisted store (§3.2) + `registerPersistedStore`.
5. `components/plans/PlanCard.tsx` — the read-only if-then card (spoken; resolver-styled;
   no `ageMode`). Reused by the kid glance.
6. `components/plans/PlanCuePanel.tsx` — the in-runner / done-panel point-of-performance cue
   surface (calm, non-blocking, dismissible; optional "Do it now" when the action links a task).
7. `components/plans/PlanAuthor.tsx` — the parent authoring form (cue-type `Segmented` → curated
   cue picker → action picker → speak-preview), reusing `components/parent/pickers.tsx` +
   `components/parent/ui.tsx`.
8. `app/(parent)/plans.tsx` — the parent-gated authoring + management screen (§2.1). Thin: reads
   the active child, composes `PlanAuthor`, writes via `planStore`, gates the add with
   `<PremiumGate feature="ifThenPlans" currentCount={...}>`.
9. `app/(kid)/plans.tsx` — the read-only "My Plans" pushed-modal glance (§2.2) + the situational
   "I did it!" positive nod.
10. Tests:
    - `__tests__/domain/plans.test.ts` — `assemblePlanPhrase` both age variants; `planToReminderAnchor`
      (time only, respects active/valid time); selectors; `assertPlanCopyClean` accepts the
      seed templates and rejects a planted banned phrase.
    - `__tests__/state/planStore.test.ts` — CRUD, active toggle, propose→approve→live, archive,
      persistence via `partialize`.
    - EXTEND `__tests__/theme/resolveContent.test.ts` (new `plans.*` keys resolve both variants).
    - EXTEND `__tests__/services/notifications.test.ts` (a plan anchor is budget-capped +
      quiet-hours-suppressed + copy-clean, mixed with routine anchors).
    - EXTEND `__tests__/state/entitlements.test.ts` (`ifThenPlans` count gate: free 2 / premium 8;
      `canAddMore` blocks the 3rd free plan, allows it on premium/trial).

### MODIFY

1. `src/domain/types.ts` — add `PlanCueType`, `PlanCue`, `PlanAction`, `Plan`, `PlanCueTemplate`,
   `PlanActionTemplate` (§3.1).
2. `src/theme/resolveContent.ts` — add the `plans.*` copy keys (§4.2).
3. `src/services/entitlements.ts` — add `ifThenPlans: { kind: "count", free: 2, premium: 8 }` to
   `FEATURE_GATES`; widen the `canAddMore` feature union to include `"ifThenPlans"` (L124) and add
   `"ifThenPlans"` to `COUNT_FEATURES` in `components/parent/PremiumGate.tsx` (L42).
4. `app/_layout.tsx` (`ThemedRoot`, the reminders `useEffect` L141-157): read the active child's
   plans (`usePlanStore((s) => activeChildId ? s.plans[activeChildId] : undefined)`), map active
   `time` plans via `planToReminderAnchor`, and CONCAT them into the `anchors` array passed to
   `rescheduleReminders({ ... })`. Add `plans` to the effect dep array. This is the only wiring
   needed for time-cue firing — quiet-hours, the per-day budget, permission, and copy-cleanliness
   are all already enforced by `rescheduleReminders` / `buildReminderPlan`.
5. `components/task/TaskRunner.tsx` — in `onDone` (L154-196), after `completeStep`, read
   `plansForStep(usePlanStore.getState().plans[childId] ?? [], task.id)` and, if any active plan
   matches, render `PlanCuePanel` (state held locally, cleared on the next step). Non-blocking;
   does NOT alter the celebration or token path.
6. `components/kid/DaypartDonePanel.tsx` — when `mode === "done"`, surface `plansForDaypart(...)`
   for the finished daypart under the headline; add the low-emphasis "My plans" chip (peer of the
   existing peek link, L134-148) routing to `/(kid)/plans`, shown only when the child has ≥1
   active plan.
7. `app/(kid)/_layout.tsx` — register `plans` as a pushed **modal** route in BOTH shells:
   `<Stack.Screen name="plans" options={{ presentation: "modal" }} />` in `YoungStack` and
   `<Tabs.Screen name="plans" options={{ href: null }} />` in `OlderTabs` (exactly like `peek`);
   add `"plans"` to the `GrownUpsDoor` hide list (L104) so the door does not overlap the modal.
8. `app/(parent)/dashboard.tsx` — add a "Plans" management row/card linking to
   `app/(parent)/plans.tsx` (alongside "Manage rewards"). `(parent)/_layout.tsx` needs no change:
   it renders a bare guarded `<Stack>` that auto-registers any `app/(parent)/*` file (verified
   L21), so `plans.tsx` inherits the `parentUnlocked` guard.
9. `src/state/gameplay.ts` — `wipeAllChildData` clears `usePlanStore` (§3.3); optionally add thin
   re-exports if the propose/approve helpers are surfaced from the orchestrator (or keep them in
   `planStore`).
10. `app/(parent)/settings.tsx` — `DataReview`: include plan counts + stored plans in the snapshot
    (§3.3).
11. Barrels: export from `src/domain/index.ts` (`plans` selectors), `src/state/index.ts`
    (`usePlanStore`), `src/data/index.ts` (plan templates), `src/theme/index.ts` (no change —
    copy keys ride on `resolveContent`).

---

## 6. Reused prebuilt libraries

Prefer existing deps — **no new dependency is required.**

- **Notifications (point-of-performance time cue):** `expo-notifications` via the shipped
  `src/services/notifications.ts` — reused unchanged (anchors in, budget/quiet-hours/copy-gate
  applied). No new scheduling code.
- **TTS (spoken plans, non-readers):** `expo-speech` via `src/services/tts.ts` + `SpokenLabel`.
- **State/persistence:** `zustand` + the `persist` adapter over the storage port
  (`src/storage/persist.ts`) — the new `planStore` uses the identical pattern.
- **Authoring pickers:** `components/parent/pickers.tsx` (`TimeField`, `DayPicker`, `EmojiField`)
  — already re-authored against the installed `@react-native-community/datetimepicker@9.1`,
  `rn-emoji-keyboard@1.7`. No color-picker/emoji library added.
- **Premium gate:** `components/parent/PremiumGate.tsx` + `src/services/entitlements.ts`
  (new `ifThenPlans` count gate; mock entitlement — purchase stays MOCKED behind the existing seam).
- **Animation / sound cues:** `react-native-reanimated` (gated on `t.motion`) for the cue-panel
  entrance; `playCue` (`src/services/playCue.ts`) for the soft situational-nod tick.
- **Domain time:** `date-fns` / `date-fns-tz` via `src/domain/dates.ts` (`isoDay`, `getDaypart`)
  where a plan needs a daypart bucket.

**New MIT libs:** none.

---

## 7. Anti-shame + no-AI rules that apply here

- **No adherence tracking, ever.** The model has no "missed"/"failed"/"done-rate" field on a
  plan. There is no streak on plans, no count of un-done plans, no badge for compliance. A plan
  the child doesn't act on simply does nothing — silent and free (`00-SYNTHESIS.md` §4.3).
- **The only "did you do it" is positive and optional.** The situational "I did it! 🫧" nod fires
  a positive-only buddy mood (`CompanionMood` has no negative member) and a soft tick — **no
  tokens** (so it can't be gamed) and no negative counterpart. There is no "you didn't do it"
  button anywhere.
- **Honest, low-cost framing in copy (load-bearing).** Plans are framed as "a little reminder you
  make for yourself," never as a treatment, cure, or guaranteed behavior change — consistent with
  the small, lab-only, expectation-calibrated evidence (`01-feature-matrix.md` #21). No clinical
  claim appears in any kid or parent copy.
- **Notification tone is guaranteed by the existing gate.** Plan time-cues route through
  `rescheduleReminders` → `buildReminderPlan` → the fixed friendly copy set + `BANNED_REMINDER_PATTERNS`
  (`src/services/notifications.ts` L102-135), so a plan cue can never nag, guilt, use urgency,
  or invoke companion re-engagement. `assertPlanCopyClean` (§5) additionally asserts the assembled
  phrase itself is clean before it can become a notification.
- **Never a flood.** Plan time-cues share the routine reminders' `maxPerDay` budget and quiet-
  hours window — they cannot add unbounded notifications.
- **ZERO AI.** Plans are assembled from curated cue/action templates only. There is no NL parsing
  of a typed plan, no suggestion/inference engine, no "we noticed…", no LLM, and — critically —
  **no situational auto-detection**: the app explicitly tells the family it cannot sense "when I
  feel wiggly," so there is no hidden inference. There is no "AI off" toggle because there is no AI.
- **Age-adaptive via resolvers only** — `resolveContent` (the if-then framing keys) + the resolved
  `canAddTasks` flag; no component reads raw `ageMode`, no `ageMode` prop (grep proves it).
- **Premium never punishes.** The `ifThenPlans` gate blocks only ADDING a NEW plan past the free
  ceiling; every already-authored plan keeps firing after a downgrade (`entitlements.ts` §1b.11 —
  acquisition, never retention).

---

## 8. Acceptance criteria + verify steps

**Acceptance criteria**
1. A parent (behind the PIN gate) can author a plan in ≤4 taps: pick a cue type + curated cue,
   pick an action (curated or a linked existing task), preview the spoken sentence, and save. The
   plan persists to `planStore.plans[cid]` and survives a force-quit.
2. A `time` plan produces a local notification at its time that is **suppressed inside quiet
   hours**, **counted against the same `maxPerDay` budget** as routine reminders, and whose copy
   passes `isReminderCopyClean`. Tapping it foregrounds the app and speaks the plan phrase.
   *(Automated acceptance asserts the MOCKED scheduler calls — `scheduleNotificationAsync` args,
   the `remindAt`/anchor math, quiet-hours suppression, budget count, and `assertPlanCopyClean` —
   using the same `SchedulableTriggerInputTypes.DATE` trigger shape as the shipped routine
   scheduler. **Live on-device firing is a dev-client-only manual check**, since local scheduled
   notifications are caveated in Expo Go — it is NOT part of the jest/web floor.)*
3. An `afterStep` plan surfaces `PlanCuePanel` at the exact moment its linked step is completed in
   the runner — with no confetti, no token, and without blocking the next step; dismissing it
   leaves the loop unchanged.
4. An `afterRoutine` plan appears on the calm daypart-done panel when that daypart finishes; a
   `situational` plan appears ONLY on the "My Plans" glance and is never auto-fired.
5. `/(kid)/plans` lists active plans as spoken if-then cards; the situational "I did it!" nod fires
   a positive buddy mood + soft tick and grants **no tokens and no streak**; there is no negative
   or "not done" affordance anywhere.
6. Young shows the two-line arrow framing + auto-speaks on open; older shows the one-sentence
   framing + speaks on tap — produced ONLY by `resolveContent` / `assemblePlanPhrase`, with no
   `ageMode` read in any plan component (grep proves it).
7. lowStim / OS Reduce-Motion: the cue panel appears instantly (no spring); verified via
   `t.motion.loopsEnabled` gating.
8. The `ifThenPlans` gate lets a free family keep 2 active plans and blocks the 3rd with a calm,
   no-urgency upsell (`<PremiumGate>`); premium/trial raises the ceiling to 8; a downgrade never
   removes or stops any already-authored plan.
9. Plans appear in Settings → "Review what's stored" and are cleared by "Delete all child data";
   nothing is uploaded.
10. New types/store are additive: `SCHEMA_VERSION` stays 1, `MIGRATIONS` stays empty, and an
    install created before this feature loads cleanly with an empty `tb/plans`.

**Verify steps an agent runs**
- `npx tsc --noEmit` → 0 errors (the `plans.*` copy keys satisfy `ModeKeyed`; `planToReminderAnchor`
  returns a valid `ReminderAnchor`; the `ifThenPlans` gate satisfies `CountGate`).
- `npm test` → all suites green, including the new `plans` domain + `planStore` suites and the
  extended `resolveContent` / `notifications` / `entitlements` suites (target ≥ 340 tests, never
  fewer than the current 335).
- `npx expo export --platform web` → succeeds (modal routes + reanimated + notifications wrapper
  are web-safe; the notification schedule no-throws on web/Expo Go).
- Manual (Expo Go / native): author one plan of each cue type for a young and an older child;
  confirm the §2.3 firing behaviors, quiet-hours suppression of a time cue, the premium ceiling,
  and that deleting data clears plans.
- `grep -rn "ageMode" components/plans app/(kid)/plans.tsx app/(parent)/plans.tsx` returns **no
  raw reads** (only resolver / `ageModeLabel` usage in parent surfaces).
- `grep -rn "Math.random" src/domain/plans.ts src/state/planStore.ts` returns **zero** (cue firing
  is deterministic, never randomized).

---

## 9. Dependencies on other feature specs + premium/free classification

**Depends on (all already shipped in the repo):**
- **Reminders / notifications** — `src/services/notifications.ts` (`rescheduleReminders`,
  `buildReminderPlan`, `ReminderAnchor`, the banned-phrase gate) is the point-of-performance
  firing engine for `time` cues. (Hard dependency.)
- **Daypart engine** — `src/domain/dates.ts` (`getDaypart`/`selectionDaypart`/`isoDay`) +
  `DaypartDonePanel` for `afterRoutine` surfacing. (Hard for that cue type; soft otherwise.)
- **Core loop / runner** — `components/task/TaskRunner.tsx` + `gameplay.completeStep` for
  `afterStep` surfacing and for linked-task token payout. (Hard for `afterStep`.)
- **Theming / age engine** — `resolveContent` (`ModeKeyed` copy), `resolveCapabilities`
  (`canAddTasks`), `useThemeTokens`. (Hard.)
- **Mock paywall / entitlements** — `FEATURE_GATES` + `<PremiumGate>` for the plan-library ceiling
  (purchase stays MOCKED behind the existing seam). (Hard for gating.)

**Cross-refs (other feature specs should include plan data):**
- **Local backup / restore** spec — the export/import MUST include the new `tb/plans` slice
  (ensure the serializer enumerates it alongside `tb/tasks` / `tb/rewards`).
- **Printable / shareable clinician report** spec — MAY list the family's active plans as
  descriptive context ("Plans in use: 3"), non-diagnostic, counts only.
- **Verify-undo / visual-timers** specs — a plan's action can link a task; the "When the timer
  beeps" situational template pairs naturally with the visual-timer feature (no code coupling,
  just a shared vocabulary).

**Premium/free classification**
- **FREE (never gated):** all point-of-performance cue firing for owned plans (notifications,
  in-app after-step/after-routine cards, the "My Plans" glance, the situational nod) and authoring
  the first **2** active plans per child. Rationale: cue firing is accessibility/scaffolding in the
  same never-gated category as reminders and calm mode (`entitlements.ts` NEVER-GATED note); the
  free tier must genuinely work (`00-SYNTHESIS.md` §3).
- **PREMIUM (`ifThenPlans` count gate, mock-gated):** raising the active-plan ceiling from 2 → 8.
  Gating blocks only NEW authoring past the free ceiling — it never disables or removes an
  already-authored plan (retention untouched, `66-MASTER-PLAN.md` §1b.11). This is a NEW gate key,
  additive to `FEATURE_GATES`.

---

## 10. Open assumptions

1. **Gate the library, don't gate firing.** We assume plans should be free-to-try (2) with a
   premium ceiling (8), mirroring `rewardMenuSize`/`multiChild`. If product prefers plans be
   **entirely free** (like reminders), drop the `ifThenPlans` gate and the `<PremiumGate>` wrap —
   no other change is needed. Documented as a switch, not baked into the loop.
2. **Situational cues are self-checked, by design.** Offline + no-AI + no-sensor means "when I
   feel wiggly" cannot be auto-detected; the honest interpretation is a glanceable card + optional
   positive nod. If a future build adds an explicit kid-tappable "it's happening now" trigger, it
   must stay opt-in and never track non-use.
3. **Time cues reuse the reminder budget.** Plan time-cues count against the same per-child
   `maxPerDay` as routine reminders (anti-flood). If a family wants plans to have their own budget,
   add a second budget knob later; not built now.
4. **Co-authoring happens behind the parent gate.** "Kid + caregiver author" is interpreted as
   the grown-up unlocks the gate and they build it together (curated pickers, no free-text kid
   input). A dedicated in-kid-surface authoring flow is out of scope (it would risk free-text /
   un-curated input). Older kids may PROPOSE via the existing `canAddTasks` queue.
5. **A plan pays no tokens itself.** Only a plan's *linked task*, completed through the normal
   runner, pays tokens. This avoids gaming the economy by tapping "I did my plan." If product wants
   a tiny reinforcement for acting on a plan, route it through a real task completion, not the plan.
6. **Curated template breadth.** The seed cue/action/situation templates in `planTemplates.ts` are
   a starter set; expanding them is additive content work (no schema change), and any new template
   phrase must pass `assertPlanCopyClean`.
