# Feature Spec — Multi-Child Management

**Slug:** `multi-child` · **Feature Matrix #15** · **Status:** buildable delta on the shipped app
**Owner doc:** this file. Companion reads: `_build/spec/01-current-state.md`,
`_build/plan/62-data-model.md`, `_build/plan/70-daypart-bifurcation.md`,
`_build/research/01-feature-matrix.md` (#15), `_build/research/00-SYNTHESIS.md` (§2.9 Joon gaps).

> **Build note (read first).** Most of "multi-child" is ALREADY SHIPPED and green
> (see §0). This spec is a **DELTA**, not a rebuild. The two genuinely new pieces are
> **(A) a fast child switcher** and **(B) rotating/assignable chores across siblings**
> (the documented Joon white-space). Everything else here is hardening + wiring. Do
> not re-implement the parts marked DONE — reuse them. Every path below is real.
> Mind the SPACE in the repo path `/Users/ameyakashid/Desktop/adhd india/tiny-bubbles`.

---

## 0. What already exists (DO NOT rebuild)

Verified by reading the code on 2026-07-06. These are DONE and tested:

| Capability | Where | State |
|---|---|---|
| Multiple child profiles (index + per-child slices) | `src/state/childStore.ts` (`index`, `profiles`, `ledgers`, `progress`, `reinforcement`, `moods`, `events`), `createChild`, `updateProfile`, `updateSettings`, `archiveChild` | DONE |
| Create child + seed content | `src/state/gameplay.ts#createChildWithSeed` (routines/rewards/companion via `src/data/seed.ts#seedChild`) | DONE |
| Per-child SETTINGS / age / companion editor | `app/(parent)/children.tsx` (name, `ageMode` + live preview, `companionStyle`, `textFirst`, `sensoryMode`, spoken labels, calm mode, autonomy) | DONE |
| Per-child data isolation | EVERY store keys by `cid`: `childStore`, `taskStore`, `rewardStore`, `buddyStore`, `runProgressStore`; storage keys namespaced `tb/child/<cid>/<slice>` (`src/storage/schemaVersion.ts#childKey`) | DONE |
| Active child drives the whole kid app | `app/_layout.tsx#ThemedRoot` re-themes from `activeChildId`; `settingsStore.meta.activeChildId` + `setActiveChild` | DONE |
| Free 1 / premium up to 8 gate | `src/services/entitlements.ts` (`FEATURE_GATES.multiChild = { free:1, premium:8 }`), `components/parent/PremiumGate.tsx` wrapping the Add-child button in `children.tsx` | DONE |
| Per-child "delete my data" | `src/state/gameplay.ts#wipeAllChildData`; per-child key scoping in `src/storage/schemaVersion.ts` | DONE |
| Parent mission-control per child | `app/(parent)/dashboard.tsx` (per-child card, tokens, daypart roll-up, redemption approve) | DONE |

**The DELTA this spec adds:**
1. **Fast child switcher** — a quick, parent-safe way to change `activeChildId` when a
   device is shared (hand-off between siblings). Today the only way to switch is a `Chip`
   buried inside parent screens (`children.tsx`, `tasks.tsx`, dashboard "Manage").
2. **Rotating / assignable chores across kids** (`SharedChore`) — the Joon white-space
   (`30 §2.9`: "rotate chores between children"). Today tasks/routines are wholly
   per-child with no shared/rotating concept.
3. **Roster hygiene** — when a child is removed, prune them from any shared-chore roster;
   reset shared chores on full data wipe.
4. **Small switcher/handoff copy + an opt-in kid-facing quick-switch.**

---

## 1. Overview + user value

Families with more than one ADHD child are a core segment, and the single **most-cited
missing feature** in the competitor (Joon) is exactly this: *"missing basic organizing for
multiple kids… rotate chores between children"* plus a real multi-device / multi-profile
story (`research/01-feature-matrix.md` #15; `research/00-SYNTHESIS.md` §2.9). Attacking
Joon's documented gaps — not "another chore app" — is the survival strategy
(`00-SYNTHESIS.md` §6.6).

**User value, honestly scoped:**
- **Each child gets their own everything** — profile, age mode, companion, tokens, streak,
  reward menu, routines — with **hard data isolation** so one child can never see, spend, or
  dent another's progress. This is a privacy/fairness property, not a science claim.
- **One shared device, fast hand-off.** A parent running the morning routine with three
  kids can switch "who's using it" in one or two taps instead of digging through settings.
- **Chores that rotate fairly.** "Trash goes out Monday-you, Tuesday-your-sister" is
  authored once and the app deterministically assigns it to the right child each day/week —
  **offline, on-device, no AI** (it is date math, not a suggestion engine). Each assignment
  materialises as a **normal task in the assigned child's own loop**, so it earns tokens,
  fires the same celebration, and nurtures that child's own companion — full reuse of the
  shipped core loop.

**Science framing (verified, modest):** rotation/assignment is a **product/market**
requirement, not a treatment mechanism — there is no efficacy claim attached to it. The
underlying loop it feeds (immediate token at point-of-completion, forgiving progress, a
never-punishing companion) carries the evidence (delay-discounting `g≈0.47`, token-economy
`SMD 0.66–0.72`, PTBM Grade-A) — see `00-SYNTHESIS.md` §2. **Do not** market sibling
rotation as improving symptoms; market it as reducing household conflict and parent admin
burden (the retention lever: calmer mornings keep parents subscribed, `00-SYNTHESIS.md`
§2.2/§3).

---

## 2. UX behavior — screen by screen

All parent surfaces stay dense/utilitarian behind the PIN gate. All kid surfaces stay
big/playful. **No component reads raw `ageMode`** — presentation comes from resolved
capability flags / `resolveContent` / `ageModeLabel` (golden rule, `01-current-state.md`
§1.5). Copy goes through `resolveContent` (both `young` + `older` variants forced at compile
time).

### 2.1 Fast child switcher (`components/parent/ChildSwitcher.tsx` + `app/(parent)/switch-child.tsx`)

A reusable avatar grid: one round `avatarColor` bubble per non-archived child (first
initial), name under it, the active child ringed with `colors.primary`. Tapping a child:
1. calls `switchActiveChild(cid)` (new orchestrator, §3.4) → sets `activeChildId`, clears the
   in-memory `sessionStore.activeRunId`, runs `reconcileChild(cid)` (forgiving rollover +
   chore materialisation), and
2. on the dedicated `switch-child` screen, `router.replace('/(kid)')` hands the device to
   that child (the parent zone re-locks on background as usual).

**Entry points (reuse existing surfaces):**
- **Parent dashboard header** (`app/(parent)/dashboard.tsx`): a `right` action "Switch"
  (only when ≥2 non-archived children) opening `switch-child`.
- **Add "＋ Add child"** tile inside the switcher grid, wrapped in the existing
  `<PremiumGate feature="multiChild" currentCount={list.length}>` (same gate as `children.tsx`).

**Optional kid-facing quick-switch** (`components/kid/ChildHandoffButton.tsx`), rendered on
`components/kid/DaypartDonePanel.tsx` ONLY when `parentSettings.quickChildSwitch === true`
(new setting, default **false**). It shows a low-emphasis "Someone else's turn?" avatar row.
Because switching changes whose tokens are spendable, the DEFAULT (`false`) keeps switching
behind the grown-ups gate; a parent on a trusted single-family device can opt in to the
ungated kid picker. When enabled, tapping a sibling avatar calls `switchActiveChild` directly
(no gate). This is the ONLY kid-facing multi-child affordance; it never shows other children's
token counts or progress (no cross-child comparison — §6).

**Young vs older (switcher presentation follows the CURRENTLY-active child's resolved flags,
since that is the theme in context):**
- **young** (`multiStepVisible === false`, `ttsDefault === true`): oversized avatar bubbles
  (~96px), each child's **name auto-spoken** via `speak()` on focus (non-reader hand-off),
  ≤3 visible then horizontal scroll (respects `maxChoices` spirit), no text required.
- **older** (`multiStepVisible === true`, `textPrimary === true`): compact avatar row with
  text names, no auto-TTS (speak on tap only).
- **low-stim / calm** (`sensoryMode === 'lowStim'` or child `calmMode`): no bounce/scale
  animation on the avatars (gate any Reanimated entrance on `useReducedMotion()`), muted
  ring, no confetti. The switcher never celebrates.

### 2.2 Shared / rotating chores — parent authoring (`app/(parent)/chores.tsx`)

New parent screen (dense), reachable from the dashboard management `Card` (a new
`SettingRow` "🔁 Shared chores — rotate across kids") and from `children.tsx`. Requires ≥2
non-archived children; with <2 it shows a `Note`: *"Add a second child to rotate chores."*

Per shared chore the parent sets:
- **Label** — emoji + color + name via the EXISTING pickers (`components/parent/pickers.tsx`
  `EmojiField`/`ColorField`) and a text field; seeded suggestions from `CHORE_TEMPLATES`
  (§4) or any `TASK_TEMPLATES` entry (e.g. `feed_pet`, `tidy_toys`).
- **Roster** — ordered multi-select `Chip` list of children (the rotation order).
- **Cadence** — `Segmented`: **Daily**, **Weekly**, **Each time it's done**, **Manual**.
- **Daypart** — `Segmented` Morning / Afternoon / Evening (which daypart's routine the task
  drops into for the assigned child; reuses `PARENT_DAYPARTS`).
- **Bubbles earned** — `Stepper` (1–5), the assigned child's `tokenValue`.
- **Days active** — `DayPicker` (empty = every day), reusing the pattern from `tasks.tsx`.

**Empty state (≥2 children, zero chores defined yet):** the screen leads with a calm CTA — copy key
`chore.empty` ({young/older: "Add a shared chore to rotate across your kids."}) + the "＋ Add a chore"
button — never a blank list or an error. (This is distinct from the <2-children `Note` above.)

Below the form, a **rotation preview** (`components/parent/RotationPreview.tsx`, pure): the
next 5 active days rendered as "Mon → Ana · Tue → Beto · Wed → Ana …" from
`currentHolderId(chore, day, tz)`, plus a **"Pass to next now"** button (manual advance /
override) that is anti-shame framed ("hand this chore to the next child") — never "take it
away." Editing a chore never deletes any child's already-earned tokens or completed history.

### 2.3 Shared chore in the kid loop (NO new kid UI)

The current holder's chore **materialises as an ordinary `Task`** (carrying `choreId`
provenance) inside their routine-for-that-daypart (or standalone if none), via the reconciler
(§3.5). From there it is indistinguishable from any other task: it flows through
`components/task/TaskRunner.tsx` → `completeStep` → tokens/celebration/companion, honoring the
child's own young/older shell, calm/low-stim clamps, and skip-is-free semantics. A child who
is **not** today's holder simply does not have the task in their list — they see nothing about
"not being picked" (§6). **No kid-facing chore/rotation screen is built.**

### 2.4 Parent dashboard reflection (`app/(parent)/dashboard.tsx`)

Additive, per-child card: under the daypart roll-up, if the child is **today's holder** of any
active shared chore, show a one-line dim row: `🔁 <chore label> · <child>'s turn today`.
Never shows other children's turns on this child's card (isolation). The header gains the
"Switch" action (§2.1). No cross-child leaderboard anywhere.

---

## 3. Data-model additions

All additions are **additive + optional** (new optional field, or a brand-new independently
persisted store slice). See §3.6 for why this needs **no schema-version bump**.

### 3.1 `Task` provenance field — `src/domain/types.ts`

Add ONE optional field to the existing `Task` interface (near `proposed?`):

```ts
export interface Task {
  // …existing fields unchanged…
  /**
   * Provenance: set when this task was MATERIALISED from a rotating SharedChore
   * (§ multi-child). Absent for normal parent/seed tasks. Used for idempotent
   * re-materialisation and to advance a `perCompletion` rotation on completion.
   * Combined with `choreHolderDay` it uniquely identifies one holder-day instance.
   */
  choreId?: string;
  /** the local 'YYYY-MM-DD' this chore instance was assigned for (idempotency key) */
  choreHolderDay?: IsoDay;
}
```

### 3.2 `SharedChore` + rotation types — `src/domain/types.ts`

```ts
/** How a rotating chore advances its holder. All are deterministic + offline. */
export type RotationCadence = "daily" | "weekly" | "perCompletion" | "manual";

/**
 * A parent-authored chore that rotates across a roster of children (feature #15).
 * PARENT-GLOBAL scope (spans children) — lives in choreStore (`tb/chores`), NOT a
 * per-child slice. The rotation is pure date math (src/domain/chores.ts); each
 * assignment materialises as a normal per-child Task carrying `choreId`.
 */
export interface SharedChore {
  id: string;
  /** own emoji/color/spokenLabel, like a Task label (non-reader support) */
  label: VisualLabel;
  /** ordered child ids the chore rotates among (rotation order). Length >= 2 to be active. */
  childIds: string[];
  cadence: RotationCadence;
  /** 'YYYY-MM-DD' the rotation counts from (set at create time, in device tz) */
  rotationAnchorDay: IsoDay;
  /** manual/override holder index into childIds (used by `manual`, or a one-off "pass to next") */
  manualHolderIndex?: number;
  /** advances by 1 on each completion; drives `perCompletion` holder = count % roster */
  completionAdvanceCount: number;
  /** which daypart the materialised task drops into for the holder */
  daypart: Exclude<Daypart, "night">;
  /** base immediate payout the assigned child earns (>=1) */
  tokenValue: number;
  /** provenance if built from a chore/task template */
  templateId: string | null;
  /** when the chore is active at all (empty daysOfWeek => every day) */
  schedule: TaskSchedule;
  active: boolean;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}
```

### 3.3 New store — `src/state/choreStore.ts` (`tb/chores`, parent-global)

Mirrors the shape/conventions of `rewardStore`/`taskStore` (persisted via
`createTbPersistOptions` + `registerPersistedStore`). Parent-global because a chore spans
children (like `childIndex`).

```ts
export interface ChoreStoreState {
  chores: SharedChore[];
  setChores: (chores: SharedChore[]) => void;              // used by wipe/reset
  addChore: (chore: SharedChore) => void;
  updateChore: (choreId: string, patch: Partial<SharedChore>) => void;
  removeChore: (choreId: string) => void;                  // hard-delete (parent-owned metadata)
  /** advance the perCompletion pointer (called from completeStep when a chore task is done) */
  advanceChore: (choreId: string) => void;
  /** manual "pass to next": bump manualHolderIndex to the next roster slot */
  passChoreToNext: (choreId: string, now: number) => void;
  /** drop a removed child from every roster; deactivate chores left with < 2 members */
  pruneChild: (childId: string) => void;
}
```

`partialize` persists only `{ chores }`. `pruneChild` filters `childIds`, and sets
`active:false` on any chore whose roster falls below 2 (a rotation of one is not a rotation —
never auto-delete, so the parent can re-add a sibling).

### 3.4 New `ParentSettings` field — `src/domain/types.ts` + `src/domain/constants.ts`

```ts
export interface ParentSettings {
  // …existing…
  /** DEFAULT false — surface an UNGATED kid-facing child switcher on the done panel */
  quickChildSwitch: boolean;
}
```
Add `quickChildSwitch: false` to `defaultParentSettings()` in `src/domain/constants.ts`.
`mergeWithDefaults` fills it for existing installs (§3.6).

### 3.5 Pure rotation domain — `src/domain/chores.ts` (new)

All pure, `now`/`tz` passed in (matches `src/domain/dates.ts`/`tasks.ts` style, unit-testable,
web-safe, no native clock). Reuses `isoDay`, `diffDays` from `src/domain/dates.ts`.

```ts
/** Whole local days from anchor→today (>=0). Uses dates.diffDays on isoDay strings. */
export function daysSinceAnchor(anchorDay: IsoDay, now: number, tz: string): number;
/** Whole weeks (floor(days/7)). */
export function weeksSinceAnchor(anchorDay: IsoDay, now: number, tz: string): number;

/** The roster INDEX whose turn it is now (pure). Empty roster => -1. */
export function currentHolderIndex(chore: SharedChore, now: number, tz: string): number {
  const n = chore.childIds.length;
  if (n === 0) return -1;
  switch (chore.cadence) {
    case "manual":        return (chore.manualHolderIndex ?? 0) % n;
    case "perCompletion": return ((chore.completionAdvanceCount + (chore.manualHolderIndex ?? 0)) % n + n) % n;
    case "weekly":        return ((weeksSinceAnchor(chore.rotationAnchorDay, now, tz) + (chore.manualHolderIndex ?? 0)) % n + n) % n;
    case "daily":
    default:              return ((daysSinceAnchor(chore.rotationAnchorDay, now, tz) + (chore.manualHolderIndex ?? 0)) % n + n) % n;
  }
}

/** The child id whose turn it is now, or null. */
export function currentHolderId(chore: SharedChore, now: number, tz: string): string | null;

/** Reuses the weekday semantics of tasks.isRoutineScheduledToday for the chore schedule. */
export function isChoreScheduledToday(chore: SharedChore, now: number, tz: string): boolean;

/** Build the per-child Task for the current holder (materialisation). Pure — no store write. */
export function choreTaskFor(
  chore: SharedChore, holderId: string, taskId: string, now: number, tz: string,
): Task; // { choreId, choreHolderDay: isoDay(now,tz), routineId:null, templateId, label, tokenValue,
          //   verification:{mode:'none',required:false}, status:'todo', deadline:'today', schedule,
          //   order:0, archived:false, createdAt/updatedAt }

/** Next-N-days holder preview for RotationPreview (pure). */
export function rotationPreview(
  chore: SharedChore, startNow: number, tz: string, days: number,
): Array<{ day: IsoDay; holderId: string | null }>;
```

### 3.6 Migration / versioning (additive — no bump required)

`SCHEMA_VERSION` **stays 1**. Justification, per the shipped migration engine
(`src/storage/migrations.ts`):
- `Task.choreId` / `Task.choreHolderDay` are **optional** → `mergeWithDefaults` leaves
  existing tasks untouched; absence is valid.
- `ParentSettings.quickChildSwitch` → `mergeWithDefaults` overlays the default (`false`) onto
  any older persisted `parentSettings` blob (it walks `Object.keys(defaults)`), so old installs
  get it automatically.
- `choreStore` is a **brand-new independently-persisted slice** (`tb/chores`) → hydrates from
  its own `partialize` default `{ chores: [] }`; nothing to migrate.
- `validateAndRepair` invariants are unaffected (chores carry no shame-bearing field; a
  materialised chore Task is a normal Task and is repaired by `repairTask` like any other).

**IF a future change makes any of these non-additive**, bump `SCHEMA_VERSION` to 2 and add a
`{ from: 1, to: 2, migrate }` entry to `MIGRATIONS` that spread-merges the new default (the
engine preserves unknown keys — `01-current-state.md` §4.5 #19). No such entry is needed now.

**Roster referential integrity** is maintained by code, not migration: `choreStore.pruneChild`
is called whenever a child is archived/removed (§4), and `wipeAllChildData` resets the store.

---

## 4. Files to CREATE / MODIFY (real paths under `tiny-bubbles/`)

### CREATE
| Path | Purpose |
|---|---|
| `src/domain/chores.ts` | Pure rotation resolver + `choreTaskFor` materialisation + `rotationPreview` (§3.5). |
| `src/state/choreStore.ts` | Persisted `tb/chores` store (§3.3). Register with `registerPersistedStore`. |
| `src/data/choreTemplates.ts` | `CHORE_TEMPLATES: {id,label,defaultDaypart,defaultCadence,suggestedTokenValue}[]` — e.g. `take_out_trash 🗑️`, `feed_pet 🐶`, `set_table 🍽️`, `wash_dishes 🧽`, `water_plants 🪴`, `tidy_shared 🧸`. Reuse `VisualLabel` shape; MIT-free content. |
| `app/(parent)/chores.tsx` | Parent authoring screen (§2.2). |
| `app/(parent)/switch-child.tsx` | Dedicated fast-switcher screen → `router.replace('/(kid)')` on pick (§2.1). |
| `components/parent/ChildSwitcher.tsx` | Reusable avatar-grid switcher (used by dashboard header + `switch-child` + optional kid handoff). |
| `components/parent/RotationPreview.tsx` | Pure next-N-days holder preview + "Pass to next" (§2.2). |
| `components/kid/ChildHandoffButton.tsx` | Opt-in kid-facing quick-switch on the done panel (gated by `quickChildSwitch`) (§2.1). |
| `__tests__/domain/chores.test.ts` | Rotation math (daily/weekly/perCompletion/manual, mod wraparound, DST-safe day diff, empty/1-member roster). |
| `__tests__/state/chores.test.ts` | Store CRUD + `pruneChild` (roster prune, <2 → inactive) + materialisation idempotency via the gameplay reconciler. |

### MODIFY
| Path | Change |
|---|---|
| `src/domain/types.ts` | Add `choreId?`/`choreHolderDay?` to `Task`; add `RotationCadence` + `SharedChore`; add `quickChildSwitch` to `ParentSettings`. |
| `src/domain/constants.ts` | `defaultParentSettings()` → add `quickChildSwitch: false`. |
| `src/state/gameplay.ts` | Add: `switchActiveChild(cid)` (setActiveChild + `sessionStore.setActiveRun(null)` + `reconcileChild`); chore CRUD orchestrators (`createSharedChore`, `updateSharedChore`, `deleteSharedChore`, `passChoreToNext`); `removeChild(cid)` (archive + `choreStore.pruneChild` + reassign `activeChildId` to next non-archived or null). Hook into `completeStep`: if `task.choreId` and its chore cadence is `perCompletion`, call `choreStore.advanceChore`. Extend `reconcileChild(cid)`: after task rollover, **materialise** the current-holder chore tasks for `cid` and **archive stale** chore tasks (whose `choreHolderDay !== today` and still `todo`). Extend `wipeAllChildData`: `useChoreStore.setState({ chores: [] })`. |
| `app/(parent)/children.tsx` | Change the "Remove <name>" handler to call `removeChild(selectedId)` (prunes rosters); add a `SettingRow`/`PrimaryButton` "Shared chores" → `router.push('/(parent)/chores')` (only when ≥2 children). |
| `app/(parent)/dashboard.tsx` | Header `right`: add "Switch" `TextButton` (→ `switch-child`) when ≥2 children (keep existing "Done"). Add a management `SettingRow` "🔁 Shared chores". In `ChildCard`, add the dim "today's turn" chore row (§2.4). |
| `app/(parent)/settings.tsx` | Add a `SettingRow` + `Toggle` for `quickChildSwitch` under a "Sharing this device" section (`updateParentSettings({ quickChildSwitch: v })`). **Also extend `DataReview`: count `tb/chores` (e.g. "Shared chores: N")** so the new persisted slice is reflected in "Review what's stored" (roadmap invariant #8(d) / arch §1.3(c); matches the if-then §3.3 precedent). |
| `components/kid/DaypartDonePanel.tsx` | Conditionally render `<ChildHandoffButton>` when `parentSettings.quickChildSwitch` AND ≥2 non-archived children. |
| `src/theme/resolveContent.ts` | Add copy keys (both variants): `switch.title` (young "Who's playing?" / older "Switch profile"), `switch.handoff` (young "Someone else's turn?" / older "Hand off to…"), `chore.turn` (young "Your turn! 🔁" / older "Your rotating chore"), `chore.empty` (young "Add a shared chore to rotate across your kids." / older "Add a shared chore to rotate across your kids."). |
| `app/(parent)/_layout.tsx` | No screen list to edit (it renders a bare `<Stack>`), but confirm `chores` + `switch-child` resolve as routes (expo-router file-based — they will). No change needed unless screen options are added. |
| `__tests__/state/entitlements.test.ts` | Extend: adding a 2nd child still gated by `multiChild`; rotation available once ≥2 children (no separate gate). |
| `__tests__/state/gameplay.test.ts` | Extend: `switchActiveChild` clears active run + reconciles; `removeChild` prunes rosters; chore materialises only for the holder; `perCompletion` advances on done. |

---

## 5. Reused prebuilt libraries (prefer existing deps)

No new dependency is required. Everything reuses installed deps:
- **State/persist:** `zustand` v5 + the repo's `createTbPersistOptions`/`registerPersistedStore`
  (`src/storage/persist.ts`) — same pattern as `rewardStore`.
- **Date math:** `date-fns` v4 / `date-fns-tz` v3 via the existing `src/domain/dates.ts`
  (`isoDay`, `diffDays`) — rotation is pure day/week arithmetic, DST-safe, web-safe.
- **Pickers/UI:** `components/parent/pickers.tsx` (`EmojiField`, `ColorField`, `DayPicker`,
  `TimeField`) and `components/parent/ui.tsx` (`ParentScreen`, `Card`, `Chip`, `Segmented`,
  `Stepper`, `Toggle`, `SettingRow`, `PrimaryButton`, `TextButton`, `Note`). The chore form
  reuses the exact widgets the shipped `tasks.tsx` assign-sheet uses.
- **Entitlement gate:** `components/parent/PremiumGate.tsx` + `src/services/entitlements.ts`
  (`FEATURE_GATES.multiChild`) — unchanged.
- **TTS:** `src/services/tts.ts#speak` for the young switcher name auto-speak.
- **Navigation:** `expo-router` (file-based routes under `app/(parent)/`).

**No new MIT lib needed.** (Explicitly NOT adding a drag-reorder lib for the roster — an
ordered `Chip` add/remove with up/down `TextButton`s is sufficient and dependency-free.)

---

## 6. Anti-shame + no-AI rules that apply

Hard constraints (`00-SYNTHESIS.md` §4; `01-current-state.md` §4.6). This feature must
uphold ALL of them:
- **ZERO AI.** Rotation is deterministic date math (`src/domain/chores.ts`), explicitly NOT
  an "AI assignment/suggestion." No LLM, no "smart" allocation, no chatbot. Each child's
  companion remains a non-AI pet. There is no "AI off" toggle because there is no AI.
- **No cross-child comparison / competition.** Never render a leaderboard, "Ana has more
  bubbles than Beto," ranking, or "who did more." Per-child isolation is also an anti-shame
  property: a child never sees another child's balance, streak, or misses. The switcher shows
  names + avatar colors ONLY — no token counts, no progress.
- **Rotation is "whose turn," never punishment.** A chore passing to a sibling is never
  framed as "you failed so they take it." A non-holder child sees nothing about "not being
  picked." Manual advance copy is "hand off / pass to next," never "take away."
- **Incomplete is fine.** A materialised chore task is a normal task: skipping is free
  (`skipStep`), and an unfinished chore rolls forward (`today → someday`, never `failed`) via
  the shipped forgiving rollover. Time-based cadences (daily/weekly) advance on schedule
  regardless of completion, so no child gets "stuck" holding a chore as a penalty. For
  `perCompletion`, provide the manual "pass to next" so a stalled chore never traps a child.
- **No loss on switch.** Switching the active child never zeroes, hides, or alters the
  previous child's tokens, streak, companion, or completed history (data is per-`cid` and
  untouched). `switchActiveChild` only changes `activeChildId` and reconciles.
- **Premium gating is acquisition-only.** Reaching the free 1-child ceiling swaps the Add
  button for a calm upsell (`PremiumGate`); it NEVER removes or hides an existing child or
  any owned content (`entitlements.ts` §5.7 rule). A downgrade to free with 3 existing
  children keeps all 3 usable — only *adding a 4th* is blocked.

---

## 7. Acceptance criteria + verify steps

### Acceptance criteria
1. **Isolation:** completing a task / spending tokens as child A leaves child B's `ledger`,
   `progress`, `companion`, `tasks`, `rewards`, `redemptions` byte-identical. (Store slices
   are keyed by `cid`; assert no cross-write.)
2. **Fast switch:** from the parent dashboard with ≥2 children, "Switch" → pick B →
   `router.replace('/(kid)')` shows B's themed kid app (B's age mode/companion), `activeRunId`
   cleared, `reconcileChild(B)` ran. `<2` children → no "Switch" action shown.
3. **Gate:** free tier blocks adding a 2nd child (upsell shown), never removes children;
   premium/trial allows up to 8. Existing children always remain usable after downgrade.
4. **Rotation correctness (pure):** for `daily` with roster `[A,B]` anchored today,
   `currentHolderId` = A today, B tomorrow, A day-after; `weekly` flips each 7 days;
   `perCompletion` advances only on a `done`; `manual` follows `manualHolderIndex`. Wraparound
   is modulo-safe for any roster length; empty/1-member roster is inactive.
5. **Materialisation + idempotency:** on reconcile, exactly ONE chore task (with `choreId` +
   today's `choreHolderDay`) exists in the current holder's list; re-running reconcile does not
   duplicate it; a non-holder has none; a stale (`choreHolderDay !== today`, still `todo`)
   chore task is archived.
6. **Core-loop reuse:** a materialised chore task earns tokens, fires the resolved
   celebration, and nurtures the holder's companion identically to a seeded task (goes through
   `completeStep`). `perCompletion` chores advance their pointer on that completion.
7. **Roster hygiene:** removing/archiving a child drops them from every roster; a chore left
   with <2 members becomes `active:false` (not deleted). `wipeAllChildData` empties
   `tb/chores`.
8. **Anti-shame/no-AI:** no failure/streak-loss/comparison/AI anywhere in the new surfaces;
   `TaskStatus` union still has no failure member; the chore path introduces no negative state.
9. **Age/sensory:** switcher renders young (big avatars + name TTS) vs older (compact text)
   from resolved flags only; low-stim/calm removes motion + celebration; no component reads
   raw `ageMode`.

### Verify steps (an agent runs these)
```bash
# from the repo root (mind the space in the path)
cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles"
npx tsc --noEmit                 # 0 errors (types compile, incl. new SharedChore/choreStore)
npx jest                         # all suites green, incl. new chores.test.ts + chores state test
npx expo export --platform web   # web-safe bundle succeeds (no native clock / AI import)
```
Then a manual smoke (Expo Go or web): create 2 children → PIN → dashboard shows "Switch";
switch A↔B and confirm the kid app re-themes and B's data is intact; author a Daily shared
chore roster `[A,B]` → verify it appears in today's holder's morning routine and rotates the
next day; toggle `quickChildSwitch` and confirm the kid done-panel handoff appears; remove a
child and confirm the chore roster prunes and (if now single-member) deactivates. Grep guard:
`grep -rniE "\bai\b|leaderboard|compare|rank(ed|ing)|\bfailed\b|streak.?(lost|broken)" app/\(parent\)/chores.tsx components/parent/ChildSwitcher.tsx` returns no offending usage. **(Word boundaries are load-bearing: the earlier bare `ai` alternative matched `available`/`again`/`detail`/`email`/`maintain`, drowning the gate in false positives. Use `\bai\b`; BUILD-GUIDE §3 carries the same corrected pattern.)**

---

## 8. Dependencies + premium/free classification

**Depends on (all shipped):**
- Child profiles / per-child stores (`childStore`, `taskStore`, `rewardStore`, `buddyStore`,
  `runProgressStore`) and `createChildWithSeed`.
- The daypart engine (`src/domain/dates.ts`, `src/domain/tasks.ts`) — chores drop into a
  daypart routine and reuse `PARENT_DAYPARTS`, `routineDaypartOf`, `isRoutineScheduledToday`.
- The forgiving reconciler (`gameplay.reconcileChild`) — extended to materialise chores.
- The core loop (`completeStep`) — reused unchanged for chore completion.
- Entitlements / paywall (`entitlements.ts`, `PremiumGate`, mock `purchases.ts`) — the
  `multiChild` count gate.
- Theme resolvers (`resolveCapabilities`, `resolveContent`, `ThemeProvider`).

**Cross-feature spec dependencies:** none blocking. Adjacent (not required): the printable
**clinician report** spec should treat each child independently (per-child report); the
**backup/restore** spec must serialise the new `tb/chores` slice + the `Task.choreId` fields
(they are plain JSON, so a whole-namespace export already includes them — just confirm the
`tb/chores` key is in the export set).

**Premium / free classification (core loop always free — `00-SYNTHESIS.md` §3):**
| Sub-capability | Tier |
|---|---|
| Full core loop for **1 child** | **Free** |
| Per-child settings / age / companion / isolation | **Free** (accessibility/safety, never gated) |
| **2nd–8th child profile** | **Premium** (existing `FEATURE_GATES.multiChild` = free 1 / premium 8) |
| Fast child switcher | **Free** (only meaningful with the children you already have) |
| Rotating / assignable shared chores | **Free once ≥2 children exist** — no separate paywall; it is part of the multi-child value, gated only *transitively* by needing a 2nd (premium) child. Keeps the paywall honest (one axis: child count). |
| Opt-in kid quick-switch (`quickChildSwitch`) | **Free** |

Billing stays **MOCKED** behind the existing `src/services/purchases.ts` seam — no
RevenueCat/StoreKit wiring in this feature.

---

## 9. Open assumptions

1. **Switcher is parent-gated by default.** We assume the safe default is: switching lives in
   the PIN-gated parent area, with an opt-in ungated kid picker (`quickChildSwitch`, default
   off). If product wants an always-available kid switcher, flip the default — but then a kid
   could complete a sibling's tasks (low-harm, anti-shame, but worth a product call).
2. **Rotation cadence set = {daily, weekly, perCompletion, manual}.** Assumed sufficient; a
   custom "every N days" is out of scope (add later as another cadence + a `nDays` field).
3. **Chore drops into the daypart's routine if one exists, else standalone.** Assumed the
   holder has a routine for the chosen daypart (they do post-onboarding — all 3 are
   auto-activated). If not, materialise a standalone `today` task; it still runs in the loop.
4. **Rotation tz.** Assumed computed in the *holder child's* timezone at materialisation time
   (each child has `profile.timeZone`). The `rotationAnchorDay` is stored once in device tz;
   holder resolution uses the child being reconciled. Cross-tz siblings on one device is an
   edge case; day-granularity rotation tolerates it (documented, not blocking).
5. **`perCompletion` can stall** if the holder never completes and the parent never passes.
   Mitigated by the always-available "Pass to next" and by recommending daily/weekly as the
   default in the UI. No auto-advance-on-skip (that could feel like "punished for skipping").
6. **No cross-device sync** (offline-first, locked). Rosters/rotation are single-device; the
   model is sync-ready (uuids, additive slices) but a sync layer is explicitly out of scope
   (`62-data-model.md` §16).
7. **8-child premium ceiling** is inherited from `FEATURE_GATES.multiChild.premium = 8`; if
   product wants "unlimited," that is an entitlements change, not a multi-child change.
8. **Materialisation runs in `reconcileChild`** (app-open + local-midnight). We assume that
   cadence is frequent enough; if a chore should appear the instant a parent authors it,
   also call the materialiser for the current holder at the end of `createSharedChore`.
