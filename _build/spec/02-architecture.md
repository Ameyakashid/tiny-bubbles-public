# 02 — Architecture + Data-Model Evolution (feature-complete Tiny Bubbles)

*Authored 2026-07-06 against the shipped, green baseline (`_build/spec/01-current-state.md`:
`npx tsc --noEmit` = 0, `npx jest` = 34 suites / 335 tests) and a full read of the 15 feature
specs in `_build/spec/features/`. This is the CONSOLIDATED, de-duplicated architecture: it unifies
every new entity/field across all features into one canonical model, states the single migration
story, resolves the cross-spec conflicts, and orders the build. It is a DELTA on the shipped app —
nothing here rewrites the core loop, daypart engine, companion, token economy, theming/age engine,
or offline persistence. Mind the SPACE in the repo path
`/Users/ameyakashid/Desktop/adhd india/tiny-bubbles`.*

**Locked architecture (do not relitigate):** OFFLINE-FIRST, no accounts, no servers — all data
on-device via AsyncStorage behind the `storage` port. The cloud-portal replacements are **local
backup/restore** (export/import a JSON file) + an **on-device printable clinician report**.
Billing is spec'd fully but **purchase stays MOCKED** behind `src/services/purchases.ts`. **ZERO
AI**, **anti-shame** (no failure/streak-loss/guilt), **curated autonomy**, **age-adaptive ONLY via
`src/theme` resolvers + capability flags** (never raw `ageMode` in a component, never an `ageMode`
prop). Expo Go / web-safe / offline throughout.

---

## 0. How to read this document

- **§1** is the single canonical data model — every union widening, every additive field, every new
  store, every new type, with the ONE canonical name where specs overlapped (§1.7 lists the merges).
- **§2** is the store + migration plan: one versioned story, additive and forgiving.
- **§3** is the cross-cutting layer: age-adaptive resolver/flag additions, anti-shame invariants,
  the backup/restore data format, and theming/token additions.
- **§4** is the build-order dependency graph.
- **§5** is the integration map onto the existing daypart / loop / parent-dashboard surfaces.
- **§6** enumerates the resolved contradictions (also surfaced in the structured summary's
  `openAssumptions`).

Baseline structures this doc treats as ground truth (verified in-repo):
`SCHEMA_VERSION = 1`, `MIGRATIONS = []`. Persisted zustand stores (by persist `name` → key
`tb/<name>`): **settings, children, tasks, rewards, buddy, runProgress**. Per-child slices under
`tb/child/<cid>/<slice>` for `CHILD_SLICES = [profile, companion, routines, tasks, runs, ledger,
reinforcement, progress, rewards, redemptions, moods, events]`. In-memory only: `sessionStore`.
`FEATURE_GATES` today: `multiChild {1,8}`, `rewardMenuSize {3,6}`, `companionThemes {2,24}`,
`noveltyPipeline {flag}`, `calmSoundscape {flag}`, `advancedInsights {flag}`;
`CURATED_REWARD_CEILING = 6`. `ModeCapabilities` today: `textPrimary, maxChoices(3|6),
multiStepVisible, showNumbersAndCharts, canPickColor/Accessory/Theme, companionFraming(care|levelup),
delegateToChild, canAddTasks, moodCheckin`.

---

## 1. Consolidated data-model evolution

Guiding rule, satisfied by every addition below: **additive optional fields on existing persisted
shapes, brand-new independently-persisted store slices, union-member widenings, or non-persisted
derived/catalog types.** No existing persisted field changes shape or meaning → **no
`SCHEMA_VERSION` bump** (see §2).

### 1.1 Union / literal widenings (source of truth: `src/domain/types.ts`)

These are member additions to existing unions. Existing persisted values remain valid members; new
values are only ever *written* after the relevant feature ships. `Record<Union, …>` maps become the
compiler's checklist (exhaustiveness errors force every new branch to be filled).

| Union | Add | Feature | Ripples (must fill every `Record<Union>`) |
|---|---|---|---|
| `AgeMode = "young" \| "older"` | `+ "preteen"` | aging-up | `resolveTokens` (AGE_BASE, RESPONSIVE, TYPE_*), `resolveCapabilities` (AGE_CAP_BASE), `AGE_MODE_LABEL`, `defaultChildSettings`, `tts.voiceParamsFor`, `resolveMoodCheckin`, and **every** `ModeKeyed` copy key (preteen falls back to `older`, §3.1) |
| `CompanionStyle = "cuddly" \| "cool"` | `+ "avatar"` | aging-up | `BUDDY_ART`, `VARIANT_PRESETS`, `resolveCapabilities.companionFraming`, companion seed data |
| `BuddyArtVariant = "bloop" \| "orbit"` | `+ "nova"` | aging-up | `BUDDY_ART`, `VARIANT_PRESETS` (`nova` preset) |
| `companionFraming = "care" \| "levelup"` (in `ModeCapabilities`) | `+ "identity"` | aging-up | `resolveCapabilities` return |
| `TokenReason` | `+ "quest_reward"` | novelty-refresh | none (string-union widen; `validateAndRepair` doesn't validate `reason`). `"undo"` **already present** |
| `RedemptionStatus` | `+ "reversed"` | verify-undo | `isRewardAvailable.isGrant` already excludes it (counts only approved/fulfilled) → availability recovers correctly |
| `PlanCueType`, `RotationCadence`, `QuestGoalKind`, `SoundscapeKind`, `FocusPhase`, `BreathPhase` | NEW unions | if-then / multi-child / novelty / soundscapes / focus / breathing | own new types; no ripple into existing maps |

> **Canonical note (aging-up × child-autonomy):** `resolveCapabilities` must additionally EXPOSE the
> resolved `companionStyle: CompanionStyle` on `ModeCapabilities` (both specs need it). This replaces
> the shipped `companionFraming === "care" ? "cuddly" : "cool"` round-trip (which structurally cannot
> reach `"avatar"`). Do this widening **once** (§1.7, §6-C1).

### 1.2 Additive OPTIONAL fields on existing persisted interfaces

Every row is `?`-optional (or a new required field seeded into its default factory so
`mergeWithDefaults` backfills it) → merges into old blobs with no migration. Canonical field names
are de-duplicated across specs.

| Interface (store) | New field | Type | Feature | Notes / canonical |
|---|---|---|---|---|
| `ParentSettings` (settings) | `locale?` | `string` (`"en"`) | accessibility-i18n | household language; `defaultParentSettings.locale = "en"` |
| `ParentSettings` (settings) | `lastBackupAt?` | `EpochMs` | clinician-reporting | display-only ("last backed up…") |
| `ParentSettings` (settings) | `quickChildSwitch` | `boolean` (false) | multi-child | ungated kid switcher opt-in; seed in `defaultParentSettings` |
| `ParentSettings` (settings) | `timerSoundEnabled?` | `boolean` (false) | visual-timers | one-shot chime toggle |
| `Entitlement` (settings) | `trialEndReminderAt?` | `EpochMs` | billing | idempotency/debug marker for the trial reminder |
| `AppMeta` (settings) | `lastRecoveredAt?` | `EpochMs` | production-readiness | ErrorBoundary breadcrumb (optional) |
| `ChildSettings` (children/profile) | `breathingPatternId?` | `string` | breathing | absent ⇒ age-resolved default |
| `ChildSettings` (children/profile) | `breathingPacingHaptics?` | `boolean` (false) | breathing | opt-in pacing haptic |
| `ChildSettings` (children/profile) | `focusIntervals?` | `FocusIntervalConfig` | focus-intervals | absent ⇒ `DEFAULT_FOCUS_INTERVALS` (enabled:false) |
| `ChildSettings` (children/profile) | `soundscape?` | `SoundscapeSettings` | soundscapes | absent ⇒ `DEFAULT_SOUNDSCAPE_SETTINGS` |
| `ChildSettings` (children/profile) | `questsEnabled?` | `boolean` | novelty-refresh | absent ⇒ `!calmMode` |
| `ChildSettings` (children/profile) | `rewardFavorites?` | `string[]` | child-autonomy (optional) | absent ⇒ no favorites |
| `ChildSettings` (children/profile) | `moodCheckinEnabled?` | `boolean` | mood-checkin | per-child mood consent; absent ⇒ `true` (ANDed with parent-global `moodLoggingEnabled`) |
| `MoodLog` (children/moods) | `daypart?` | `Daypart` | mood-checkin | supersedes legacy `context` for grouping |
| `MoodLog` (children/moods) | `energyScaleMax?` | `number` | mood-checkin | 3 (young) / 5 (older); normalizes across an ageMode switch |
| `MoodLog` (children/moods) | `source?` | `"kid" \| "parent"` | mood-checkin | default `"kid"` |
| `Task` (tasks/routines) | `choreId?` | `string` | multi-child | provenance of a materialised rotating chore |
| `Task` (tasks/routines) | `choreHolderDay?` | `IsoDay` | multi-child | idempotency key for one holder-day instance |
| `ActiveRunProgress` (runProgress) | `stepTimerStartedAt?` | `EpochMs` | visual-timers | wall-clock start of the active step's timer (resume accuracy) |

**Already present in the model (WIRE, do not add):** `Task.timerSeconds?` (visual-timers reuses it),
`Task.verification { mode: none\|self\|photo\|parent; required; photoUri?; verifiedBy?; verifiedAt? }`
(verify-undo wires it — the runner IGNORES `required`; verify is never a gate),
`Task.proposed?`, `MoodLog.mood/energy/note/context`, `TokenReason "undo"`,
`ChildSettings.autonomy.{canPickReward, canCustomizeCompanion}` (child-autonomy wires the two
dormant grants), `parentSettings.moodLoggingEnabled` + `parentSettings.localAnalyticsEnabled`
(both default OFF), `Cosmetic.seasonalPackId`, `SeasonalPack` + `registerSeasonalPack`,
`ProgressState.savingTowardRewardId?`.

### 1.3 New PERSISTED store slices (three new `tb/*` keys)

Each mirrors the shipped `runProgressStore`/`rewardStore` pattern (zustand + `persist` via
`createTbPersistOptions({ name, partialize })` + `registerPersistedStore`). A brand-new slice
hydrates from its own default on first run — nothing to migrate.

| Store (key) | Shape | Scope | Feature |
|---|---|---|---|
| `planStore` (`tb/plans`) | `plans: Record<childId, Plan[]>` + CRUD/propose/approve/archive | per-child (keyed internally) | if-then-plans |
| `choreStore` (`tb/chores`) | `chores: SharedChore[]` + CRUD/`advanceChore`/`passChoreToNext`/`pruneChild` | **parent-global** (spans children) | multi-child |
| `questStore` (`tb/quests`) | `quests: Record<childId, ChildQuestState>` + `ensureRotation`/`onSignal`/`clearChild` | per-child | novelty-refresh |

**Wiring invariants for all three (must-not-miss):** each must be (a) enumerated by the backup
export (auto-covered — export reads the whole `tb/` keyspace via `storage.getAllKeys()`, §3.3),
(b) cleared by `gameplay.wipeAllChildData` (`setState({ … empty … })`), and (c) counted in
Settings → "Review what's stored" `DataReview`. `choreStore.pruneChild(cid)` runs on child removal
to keep rosters referentially clean.

### 1.4 New IN-MEMORY store (not persisted)

| Store | Shape | Feature | Rationale |
|---|---|---|---|
| `focusSessionStore` | `session: FocusSession \| null` + `start/toBreak/toFocus/finish/pause/resume/stop` | focus-intervals | a short self-directed session; a force-quit simply drops it (anti-shame-fine, zero migration surface). Same non-persisted discipline as `sessionStore`; all time math delegated to pure `src/domain/focus.ts` (receives `now`, never calls `Date.now()`). |

### 1.5 New NON-persisted domain / catalog / config types

Pure data + logic (RN-free, unit-testable, `now`/`tz` passed in). None touch a persisted shape.

- **Breathing (breathing):** `BreathPattern`, `BreathPhase`; `BREATH_PATTERNS` (`bubble`/`box`/
  `calm46`) in `src/domain/breathing.ts` (+ `breathPhaseAt`, `growStage`, `cycleMs`,
  `defaultBreathPatternId`).
- **Focus (focus-intervals):** `FocusIntervalConfig`, `FocusPhase`, `MovementPrompt`, `FocusSession`;
  `FOCUS_MINUTE_OPTIONS [10,15,20,25]`, `BREAK_MINUTE_OPTIONS [3,5,10]`, `DEFAULT_FOCUS_INTERVALS`
  (`src/domain/focus.ts` + `src/data/focusBreaks.ts` `MOVEMENT_PROMPTS`).
- **Chores (multi-child):** `SharedChore`, `RotationCadence`; pure rotation in `src/domain/chores.ts`
  (`currentHolderId`, `choreTaskFor`, `rotationPreview`, `isChoreScheduledToday`) + `CHORE_TEMPLATES`
  in `src/data/choreTemplates.ts`.
- **Quests / novelty (novelty-refresh):** `QuestDef`, `QuestProgress`, `ChildQuestState`,
  `QuestGoalKind`, `QuestSignal`, `QuestClaim`; pure `src/domain/quests.ts` + `src/domain/novelty.ts`
  (`featuredDaypartFor`, `FEATURED_DAYPART_BONUS`, `featuredPackFor`, `isSeasonalNew`);
  `src/data/questPool.ts`, `src/data/seasonalPacks.ts`. New tz helpers `isoWeekKey`, `dayOfYear` in
  `src/domain/dates.ts`.
- **Plans (if-then):** `PlanCue`, `PlanAction`, `Plan`, `PlanCueType`, `PlanCueTemplate`,
  `PlanActionTemplate`; pure `src/domain/plans.ts` (`assemblePlanPhrase`, `planToReminderAnchor`,
  selectors, `assertPlanCopyClean`) + `src/data/planTemplates.ts`.
- **Soundscapes (soundscapes):** `SoundscapeId`, `SoundscapeSettings`, `SoundscapeKind`, `Soundscape`;
  `DEFAULT_SOUNDSCAPE_SETTINGS`, catalog `src/data/soundscapes.ts`, pure `src/domain/soundscapes.ts`,
  looping-bed service `src/services/soundscape.ts` (§3.4, §6-C4).
- **Timers (visual-timers):** pure `src/domain/timer.ts` (`timerRemainingMs`, `timerFraction`,
  `formatMSS`) — the **canonical** shared timer helper (focus-intervals soft-reuses `formatMSS`).
- **Report + backup (clinician-reporting):** `ReportRangeKey`, `ReportRange`, `ReportModel`,
  `DaypartTally`, `MoodTally`, `BuildReportInput` (`src/domain/report.ts`); `BackupFile`,
  `ExportResult`, `ImportResult` (`src/services/backup.ts`); `renderReportHtml` HTML string
  (`src/services/reportHtml.ts`).
- **Mood insight (mood-checkin):** `MoodCheckinConfig` (`src/theme/resolveMoodCheckin.ts`); pure
  `src/domain/moodInsight.ts` selectors (counts/timelines only — **no interpretation**);
  `src/data/moodScale.ts` (`MOOD_FACES`, energy cells).
- **i18n + a11y (accessibility-i18n):** `Locale`, `ModeKeyed<T>` (**canonical single definition**,
  §1.7), `CatalogEntry`, `MessageKey` (`src/i18n/*`); `src/a11y/{announce,props}.ts`;
  `src/theme/{useReduceTransparency,useOSFontScale,contrast,resolveStatusPresentation}.ts`;
  `components/ui/{AppText,AppTextInput}.tsx`. **`components/ui/VolumeSlider.tsx` is owned/created by
  soundscapes (M-C1)** — accessibility-i18n only *consumes* the `accessibilityRole="adjustable"`
  pattern; it does NOT create the file (single owner = M-C1, avoids a double-create/merge conflict).
- **Config (production-readiness):** `src/config/flags.ts` `DEV_SCREENS_ENABLED` (not persisted).

### 1.6 New RESOLVER OUTPUTS (not persisted — computed by resolvers)

**`ModeCapabilities` additions** (in `src/theme/resolveCapabilities.ts`). Classified by whether the
flag is a **hard age ceiling** (read straight from `AGE_CAP_BASE`, NOT in the input-override set) or
**grant-overridable** (parent grant can flip it on top of the age default):

| Flag | Type | Ceiling vs grant | Feature |
|---|---|---|---|
| `companionStyle` | `CompanionStyle` | resolved output (from `input.companionStyle ?? defaultCompanionStyle(ageMode)`) | aging-up × child-autonomy |
| `companionFraming` | `"care"\|"levelup"\|"identity"` | derived from `companionStyle` | aging-up |
| `canPickReward` | `boolean` | grant-overridable (default true) | child-autonomy |
| `canCustomizeCompanion` (input master gate) | `boolean` | grant-overridable; when false forces `canPickColor/Accessory/Theme` off | child-autonomy |
| `breathingChoice` | `boolean` | **hard ceiling** (young false / older true) | breathing |
| `focusIntervalsAvailable` | `boolean` | **hard ceiling** (young false / older true) | focus-intervals |
| `moodCheckin` | `boolean` (existing) | grant-overridable — WIRE the grant from `parentSettings.moodLoggingEnabled` | mood-checkin |

**`ThemeTokens` additions** (in `src/theme/tokens.ts`/`resolveTokens.ts`, accessibility-i18n):
`maxFontSizeMultiplier: number` (Dynamic-Type cap, `DYNAMIC_TYPE_MAX_MULTIPLIER = 1.3`),
`reduceTransparency: boolean`. Plus the effective-reduced-motion fix:
`resolveEffectiveReducedMotion(childReduced, globalReducedDefault, osReduced)` folded into
`useThemeTokens` (wires the persisted `settings.reducedMotion` + `parentSettings.reducedMotionDefault`
that today never reach the resolver).

### 1.7 Canonical-name resolutions where specs overlapped (de-dup table)

| Concept | Specs that referenced it | ONE canonical name / location |
|---|---|---|
| Age-variant copy map type | i18n, aging-up, + every copy-adding spec | **`ModeKeyed<T> = { young: T; older: T; preteen?: T }`** — defined ONCE in `src/i18n/types.ts` (or `resolveContent.ts` if i18n lands later), re-exported from `resolveContent`. `young`+`older` compile-required; `preteen` optional (falls back to `older`). |
| Resolved companion art axis | aging-up, child-autonomy, breathing/novelty (buddy renders) | **`caps.companionStyle`** on `ModeCapabilities` (replaces the `companionFraming` round-trip). `resolveContent("buddy.artVariant", { companionStyle })` → `BUDDY_ART`. |
| Looping ambient audio bed | soundscapes, breathing-regulation | **`src/services/soundscape.ts`** scene-switchable/volume player. Breathing's "one free bed" == the free `waves` scene. `startAmbient`/`stopAmbient` become thin wrappers (back-compat). |
| Pure countdown/format helper | visual-timers, focus-intervals | **`src/domain/timer.ts`** (`formatMSS`, remaining/fraction). Focus imports `formatMSS`; does not re-author. |
| Depleting-ring visual | visual-timers (`VisualTimer`), focus-intervals (`FocusRing`), quests progress | Reuse the shipped `components/progress/BubbleMeter.tsx` `Circle`+`strokeDashoffset` technique; `FocusRing` MAY reuse `VisualTimer`. One primitive family. |
| Premium "extended insight depth" gate | clinician-reporting (90-day/per-routine/multi-child report), mood-checkin (multi-week mood trend) | **`FEATURE_GATES.advancedInsights`** (existing flag) — one gate, two consumer surfaces. |
| Premium "extra audio content" gate | soundscapes (scene pack + focus-during-tasks), breathing (extra beds) | **`FEATURE_GATES.calmSoundscape`** (existing flag) — one gate; ≥1 free calm scene always. |
| Volume control primitive | soundscapes (OWNS/creates it, M-C1), a11y (consumes the adjustable pattern) | **`components/ui/VolumeSlider.tsx`** (gesture-handler + reanimated, `accessibilityRole="adjustable"`) — **single owner = soundscapes M-C1**; a11y does not re-create it. |
| Opt-in on-device event log | breathing (`breathing_session`), clinician report, novelty (`everCompleted`) | Reuse `ActivityEvent` + `childStore.addEvent` (capped, `tb/child/<cid>/events`), gated by `localAnalyticsEnabled`. No new slice. |
| Kid entry-chip hub | mood, breathing, focus, novelty, if-then, multi-child | **`components/kid/DaypartDonePanel.tsx`** — the shared, capability-gated launcher surface (§5). |

---

## 2. Store / state changes + the single versioned migration plan

### 2.1 Persisted-store inventory (after)

- **Existing (unchanged persist wiring, additive field content only):** `settings` (meta /
  parentSettings / entitlement), `children` (index/profiles/ledgers/progress/reinforcement/moods/
  events/seed), `tasks` (tasks/routines/runs), `rewards` (rewards/redemptions), `buddy`
  (companions), `runProgress` (active/completedDayparts).
- **New:** `plans` (`tb/plans`), `chores` (`tb/chores`), `quests` (`tb/quests`).
- **In-memory (never persisted):** `sessionStore` (existing), `focusSessionStore` (new).

### 2.2 The migration story: ONE version, additive, forgiving, offline

**`SCHEMA_VERSION` stays `1`; `MIGRATIONS` stays `[]`.** Every addition in §1 is one of exactly
three additive shapes, all handled by the SHIPPED engine (`src/storage/migrations.ts`) with **no
migration entry**:

1. **Optional field on an existing persisted interface** (§1.2) → `mergeWithDefaults` overlays the
   default (walks `Object.keys(defaults)`) and preserves unknown keys, so an old blob simply lacks
   the field (read as `undefined` / its resolver default). This is the exact pattern doc 70 used for
   `Routine.daypart`.
2. **Union-member widening** (§1.1) → a string-union grows; existing persisted values were already
   valid members and `validateAndRepair` does not validate these fields (`ageMode`,
   `companionStyle`, `reason`, `status`). Safe.
3. **Brand-new independently-persisted store slice** (§1.3) → hydrates from its own `partialize`
   default (`{ plans: {} }` / `{ chores: [] }` / `{ quests: {} }`) on first read; there is no prior
   key to transform.

**Forward-safety (rollback):** `runMigrations` returns a future blob untouched, and an older build
reading a `preteen`/`avatar`/`reversed`/`quest_reward` value degrades into its own binary/default
branch (never crashes, never data-loses) — the doc 62 §3 forward/backward-safety contract holds.

**`SEED_VERSION`** (separate from `SCHEMA_VERSION`) may bump when new *bundled content* lands (new
quests, seasonal packs, chore/plan/soundscape templates, the `nova` companion seed) — the by-id
re-merge in `seedChild` is idempotent; this is NOT a schema migration.

### 2.3 Per-store `version` seam (for the future, not now)

Each persisted store already carries its own `version` (defaults to `SCHEMA_VERSION` via
`persist.ts`) with a per-store `migrate` seam. If ONE feature ever needs a non-additive change to
ONE slice, prefer a **store-local** `createTbPersistOptions({ name, version: 2, migrate })` bump
(e.g. `planStore` alone) over a global `SCHEMA_VERSION` bump — keep the global version and a store's
version from silently disagreeing (align them, or set explicit per-store versions when they diverge).
None of the 15 features needs this now.

### 2.4 `validateAndRepair` additions (defensive coercions — never punitive)

All are coherence-only, coerce toward safe/positive, and never zero a balance/streak or invent a
failure state (anti-shame invariant of the repair layer is preserved):

- **breathing:** unknown `breathingPatternId` → `undefined` (falls back to age default); non-boolean
  `breathingPacingHaptics` → `undefined`.
- **focus-intervals:** clamp `focusMinutes`/`breakMinutes` to the nearest curated option (or default);
  coerce non-boolean flags to their default.
- **soundscapes:** clamp `volume` to `[0,1]` (NaN → 0.55); a `calmSceneId`/`focusSceneId` pointing
  at a **non-existent** scene → coerce to `"waves"`/`null` (a *premium-locked* scene is NOT invalid
  — ownership is a separate check, §3.5); coerce `focusDuringTasks` to boolean.
- **verify-undo:** none needed — `repairLedger` already keeps any valid non-negative `balance` and
  never lowers `lifetimeEarned`/`cumulativeCount`, so `undoEarn`'s lowered balance survives.
- **visual-timers:** non-finite `stepTimerStartedAt` → `undefined`; negative/NaN `timerSeconds` →
  `undefined` (no timer).
- **billing (recommended):** `repairEntitlement` — coerce `mockPurchases` to an array if corrupt;
  coerce a corrupt "premium with no basis" (tier premium, source none, expired trial, no
  premiumSince) to a clean free record — **only** the billing record; cosmetics live in
  `buddyStore.unlockedItems`, never in `Entitlement`, so nothing owned is ever stripped.
- **aging-up (optional hardening):** resolvers fall back to the `older` branch for an unrecognized
  `ageMode`/`companionStyle` string (`?? AGE_BASE.older`) so a corrupt value can't produce an
  undefined token lookup.

Import (restore) reuses these same primitive repair fns (`repairLedger`/`repairProgress`/
`repairCompanion`/`repairTask`) mapped across the real store shapes (§3.3).

### 2.5 The shared migration regression harness (owned by production-readiness)

Two NEW tests are the safety net that lets every feature honestly claim "additive, no bump":

- `__tests__/storage/migration-forward.test.ts` — a **golden v1 pre-feature fixture** (a realistic
  `RawState`-era blob) run through `migrateAndRepair(fixture, 1)` *after* all v1 feature fields exist,
  asserting: never throws; every new optional field present-with-default; no existing value lost;
  anti-shame invariants intact (mood valid-positive, balances ≥ 0, no `failed` status). **Every
  feature that adds a persisted field/slice must extend this fixture + the schema-round-trip audit as
  it lands.**
- `__tests__/storage/schema-roundtrip.test.ts` — for each persisted store: default →
  `JSON.parse(JSON.stringify(...))` → `mergeWithDefaults` → deep-equal; and assert every
  `CHILD_SLICES` name has a store default. This doubles as the backup import-path regression.

### 2.6 When a bump WOULD be required (documented procedure, not needed now)

Only if a change removes/renames an existing field or changes its meaning: bump `SCHEMA_VERSION` → 2,
add `{ from: 1, to: 2, migrate }` that spread-merges the new default and transforms only the changed
key (engine preserves unknown keys), align the affected store's `version`. The migration-forward
fixture is the guard; the FIRST non-additive change triggers this — expected, not a failure.

---

## 3. Cross-cutting concerns

### 3.1 Age-adaptive: resolver / capability-flag additions

**The golden rule is preserved everywhere:** no component reads raw `ageMode` or takes an `ageMode`
prop; every young/older/preteen difference is produced by `resolveTokens` / `resolveCapabilities` /
`resolveContent` / `resolveCelebration` / `resolveMoodCheckin` / `resolveStatusPresentation`, and
parent surfaces use `ageModeLabel`. Components read `ageMode` only to *feed* a resolver (the
sanctioned `useThemeInputs()` pattern).

- **The `preteen` ripple (aging-up).** Widening `AgeMode` forces every `Record<AgeMode, …>` map
  (§1.1) to gain a `preteen` entry — the compiler is the checklist. `preteen` mirrors `older`
  metrics/palette (Tide) with identity framing overrides. **`ModeKeyed` gains optional `preteen?`**
  and the resolver falls back to `older` (never `young`) when omitted — so unmigrated copy keys keep
  their respectful voice and only identity keys (`buddy.tabTitle`→"Avatar", `buddy.stat.bond`→"Level",
  etc.) override. Any spec adding a `Record<AgeMode>` (e.g. `resolveMoodCheckin`'s young/older table,
  focus's `AGE_CAP_BASE`) must include the `preteen` branch (or land before aging-up and be surfaced
  by the union-widening's compiler errors). **Recommendation:** land aging-up early (§4) so the union
  exists before the content specs fan out.

- **Hard ceilings vs grant-overridable (§1.6).** New hard ceilings (`breathingChoice`,
  `focusIntervalsAvailable`) are read straight from `AGE_CAP_BASE` and are NOT in the
  `ResolveCapabilitiesInput` override set — a 4–7 non-reader can never be granted them. New
  grant-overridable flags (`canPickReward`, `canCustomizeCompanion` master gate) flow from
  `ChildAutonomy` through `ThemeProvider.grants`; `moodCheckin` is wired from
  `parentSettings.moodLoggingEnabled` (the one missing wire). `canCustomizeCompanion === false`
  forces `canPickColor/Accessory/Theme` off inside the resolver (master gate), but the buddy Name
  field stays ungated.

- **i18n keeps age variants flowing.** The `en` catalog is `ModeKeyed`, so `resolveContent`
  delegating to `getMessage` preserves the compile-time both-variants guarantee. New copy keys from
  ALL specs are authored through the same key space (physically in `src/i18n/en.ts` once i18n lands;
  in `resolveContent.COPY` if a spec ships first — then migrated as a pure data move, §6-C2).

- **New resolver output surface for triple-coding.** `resolveStatusPresentation(status)` /
  `resolveDaypartPresentation(daypart)` → `{ icon, shape, colorKey, labelKey }` so every status is
  icon+shape+label, never color-only (blue↔gold, never red↔green). New status surfaces (verify chips,
  timer rested state, quest done ✓, chore "turn today", plan cue) route through it.

### 3.2 Anti-shame invariants the new features MUST hold (structural, enumerable)

The union-level guarantees stay: `TaskStatus` has no `failed` member; `CompanionMood` is positive-only;
`ProgressState.cumulativeCount`/`lifetimeEarned`/`longestStreakDays` are monotonic and never lowered;
streak is `active`/`resting` (never "0"/"broken"); reminders pass `BANNED_REMINDER_PATTERNS`. The new
features add these invariants:

1. **Verify is never a gate.** Completion + token payout are immediate on Done regardless of
   `verification.mode`; `verification.required` is ignored by the runner and never surfaced.
2. **Undo splits currency from felt progress.** `undoEarn` lowers spendable `balance` (floored ≥ 0),
   appends a `reason:"undo"` entry, and leaves `lifetimeEarned`/`lifetimeSpent`/`cumulativeCount`/
   streak/buddy growth **UNCHANGED** (buddy never shrinks, never frowns). Redemption undo = `refund`
   + status `reversed`; a stale reverse is a no-op.
3. **Timers/focus/breathing never fail.** A depleted timer/focus block/breathing set "rests" — no
   auto-complete, auto-skip, red, flash, alarm, token change, or "time's up" copy. Breathing's grow
   visual is within-session and resets on leave (nothing to lose). Focus is token-neutral (no
   focus-for-rewards grind). Pause/Stop are always neutral one-taps.
4. **Novelty is deterministic, never a slot machine or FOMO.** Variety is magnitude/content only
   (ISO-week quest rotation, day-of-year spotlight) — **never a variable schedule**; `Math.random` is
   forbidden in `quests.ts`/`novelty.ts`/`questStore.ts`/every payout path. `SeasonalPack` has no
   `availableUntil` (content only ever appears); quests auto-grant on target (no missable "Claim");
   an unfinished quest rotates out with zero penalty; `everCompleted` + owned cosmetics are kept
   forever. `calmMode`/`questsEnabled:false` hides the whole novelty layer.
5. **Plans have no adherence tracking.** No "missed"/streak/nag; the only "did you do it" is the
   positive-only situational "I did it! 🫧" nod (buddy `happy` + soft tick, **no tokens**). Time cues
   share the routine reminder budget + quiet hours + banned-phrase gate; `assertPlanCopyClean` guards
   the assembled phrase.
6. **Rotation is "whose turn," never punishment; no cross-child comparison.** No leaderboard, no
   "Ana > Beto," no other-child token counts on the switcher. A non-holder sees nothing about "not
   picked." Time-cadences advance on schedule (a child never gets "stuck" holding a chore); a
   `perCompletion` chore has an always-available "Pass to next."
7. **Mood is never required/nagged/interpreted.** No auto-popup; a "rough" mood → optional calm
   offer only (buddy untouched); parent insight is descriptive counts, never a computed emotional
   label (that would be AI). Off by default (`moodLoggingEnabled`).
8. **Billing/soundscape/novelty downgrade is acquisition-only.** Trial-end/decline blocks only NEW
   acquisition; nothing owned/equipped/selected/generated is removed, hidden, unequipped, or greyed
   (the shipped §1b.11 test stays green; extended per new gate).
9. **The clinician report cannot reintroduce shame.** It uses `streakDisplay` (resting/active only),
   leads with monotonic `cumulativeCount`, omits declined/canceled redemptions, frames zero-completion
   forwardly, and carries the fixed non-diagnostic disclaimer. `reportHtml.test.ts` bans
   `missed/failed/broken/0-day`.
10. **Error/empty states stay calm.** The `ErrorScreen` says "Let's try that again 🫧" (no red/scary
    tone, no telemetry); empty states say "check back soon", never "you did nothing".

### 3.3 Offline / backup-restore data format

**The offline replacement for a cloud portal's "your data".** All on-device; the file goes only where
the parent explicitly sends it via the OS share sheet.

- **Envelope** (`src/services/backup.ts`):
  ```ts
  const BACKUP_FORMAT = "tiny-bubbles-backup";
  interface BackupFile {
    app: "tiny-bubbles-backup";
    schemaVersion: number;                 // SCHEMA_VERSION at export time (stamp is load-bearing)
    exportedAt: EpochMs;
    slices: Record<string, unknown>;       // every tb/ key → its raw persisted envelope { state, version }
  }
  ```
- **Export** = `collectTbSlices()` reads **every** `tb/`-namespaced key via the `storage` port
  (`getAllKeys` → filter `tb/` → `getString`), wraps into the envelope, writes a cache file
  (`tiny-bubbles-backup-YYYY-MM-DD.json`), hands it to `Sharing.shareAsync`. Because it enumerates
  the whole keyspace, the new `tb/plans` / `tb/chores` / `tb/quests` slices and every additive field
  are **automatically included** — no per-feature serializer edits (this resolves the "our spec's
  slice must be in the export" note repeated across if-then/multi-child/novelty/mood/soundscapes).
- **Import** = pick (`DocumentPicker`, `application/json`) → parse → `validateBackupFile` shape guard
  → **`repairBackupSlices`** maps the primitive repair fns across the REAL per-store shapes
  (`tb/children.state`: `repairLedger`/`repairProgress` per child; `tb/buddy.state`: `repairCompanion`;
  `tb/tasks.state`: `repairTask`; `tb/settings.state`: as-is) → **mandatory confirm-replace gate**
  ("This replaces the data on this device…") → per-store `setState` (persist middleware writes disk)
  → set a valid active child. If `file.schemaVersion < SCHEMA_VERSION`, run each store envelope
  through the (currently empty) `MIGRATIONS` chain before `setState`. A foreign/empty/canceled file
  touches **nothing** and shows a gentle note. Repair only ever coerces UP to safe positives — never
  zeroes.
- **New Expo deps (clinician-reporting):** `expo-print`, `expo-sharing`, `expo-file-system`,
  `expo-document-picker` — all MIT, first-party, Expo-Go-bundled, plugin-free, no network. Web
  degrades (these grown-up tools are N/A/degraded on web; the core loop stays web-safe).
- **Photo boundary:** `Task.verification.photoUri` is a `file://` outside the `tb/` AsyncStorage
  slices; the backup includes URIs only (not image bytes) in v1 (§6-C9); photos live in an
  excluded-from-OS-backup dir and are guaranteed-deleted on re-verify/wipe/restore (§6-C9).
- **Sensitive-action PIN:** export, restore-replace, and delete-all require the parent **PIN**
  (`mode:'sensitive'`, `clinician-reporting.md` §2.3) — not merely the math/long-press entry
  challenge — because they move/destroy the whole family's data. Restore additionally requires the
  mandatory confirm-replace step and reconciles in-memory `sessionStore`/`focusSessionStore` + the
  OS-scheduled trial reminder after apply (`clinician-reporting.md` §3.5).
- **No egress, enforced:** a CI grep gate (`__tests__/config/no-network.test.ts`) fails on any
  `fetch(`/`axios`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/`http(s)://` in `app`/`src`/`components`
  (replicating the BUILD-GUIDE §3 exclusion set — comments/`docs.expo.dev`/`schema`/`xmlns` — so a
  generated report SVG namespace never false-positives). The `ActivityEvent`/`MoodLog`/photo slices
  must never be read by an upload path (there is none).
- **OS-level backup exclusion (the load-bearing privacy fix — production-readiness §2.7):** the
  grep gate only inspects app code; it cannot stop **iOS iCloud Backup / Android Auto Backup** from
  sweeping the AsyncStorage container + photo files off-device by default. Feature-complete sets
  `android.allowBackup:false` and excludes the photo dir from iOS backup so the store "No data
  collected/shared / nothing leaves the device" claim is TRUE. Without §2.7 that claim is inaccurate.

### 3.4 Theming / design-token additions

- **`ThemeTokens`** gains `maxFontSizeMultiplier` (Dynamic-Type cap 1.3) and `reduceTransparency`
  (flatten scrim / drop gradients); `resolveEffectiveReducedMotion` finally wires the persisted
  reduced-motion settings into the resolver (bug fix). New primitives: `AppText`/`AppTextInput`
  (apply the cap), `useReduceTransparency`, `useOSFontScale`, `contrast.ts` (machine-checked WCAG AA
  guard on all palettes), `resolveStatusPresentation` (triple-coding).
- **No new palette** — `preteen` reuses `tb-tide`/`tb-tide-dark` (a dedicated "Slate" palette is a
  deferred 1-line `pickPalette` swap). No new NativeWind CSS-var class.
- **New shared UI primitives:** `VolumeSlider` (soundscapes + a11y), `VisualTimer`/`FocusRing`
  (BubbleMeter ring family), `BreathingBubble`/`CalmGarden`, `NoveltyBadge`, `QuestBoard`/`QuestCard`,
  `MoodGrid`/`EnergyGrid`/`MoodTrend`, `PlanCard`/`PlanCuePanel`, `ChildSwitcher`/`RotationPreview`,
  `UndoBar`/`VerifyPrompt`/`VerifyQueue`, `ErrorScreen`, `NextStepChooser`, `SoundscapePicker`.
- **Copy tone gates extend:** every new `resolveContent`/catalog key carries both `young`+`older`
  variants (`satisfies` enforced), must contain no urgency/shame/efficacy/medical words (per-spec
  grep gates), and reminder/plan/billing notification copy stays under `BANNED_REMINDER_PATTERNS`.

### 3.5 Premium / free classification (authoritative — from billing-entitlements §8)

`billing-entitlements.md` is the SINGLE SOURCE OF TRUTH; `FEATURE_GATES` is its machine-readable
form. Sibling specs gate ONLY through `src/services/entitlements.ts` (`isFeatureUnlocked`/`canAddMore`)
— **no scattered `entitlement.tier === 'premium'` checks**. The core loop is always free.

- **FREE — never gated (accessibility/safety/core, must never be `<PremiumGate>`-wrapped):** the
  whole task→celebrate→token→nurture→redeem loop; `ageMode`/`companionStyle`/`sensoryMode`/
  reduced-motion/low-stim/**calm mode**/OpenDyslexic/**TTS**; **accessibility + i18n (§accessibility)**;
  aging-up (`preteen`+`avatar`+identity framing); daypart engine + parent mission-control; onboarding
  + parental gate/PIN; reminders + trial-end reminder; **1 child**; child-autonomy grants; visual
  timers; mood check-in (kid + recent-list glance); verify + undo; breathing (activity + all 3
  patterns + 1 soundscape bed); if-then plan firing + first 2 plans; base weekly quest rotation +
  spotlight magnitude; **local backup/restore**; **basic clinician report (7d+30d, single child) +
  PDF/print/share**; fast child switcher; rotating chores (once ≥2 children); focus intervals;
  error/empty/loading states; offline/no-egress; performance; migrations.
- **PREMIUM (existing gate keys):** `multiChild` (2nd–8th child); `rewardMenuSize` (menu 3→6,
  **ceiling 6, never unlimited**); `companionThemes` (cosmetics 2→24, acquisition-only);
  `noveltyPipeline` (seasonal packs + premium quest pool); `calmSoundscape` (expanded scene pack +
  focus-during-tasks); `advancedInsights` (report 90-day/custom + per-routine + multi-child combined,
  **and** multi-week mood trend).
- **NEW gate key:** `ifThenPlans { kind:"count", free:2, premium:8 }` (if-then-plans) — add to
  `FEATURE_GATES`, widen `canAddMore`'s union, add to `PremiumGate`'s `COUNT_FEATURES`.
- **Delta code (billing):** the honest trial-end reminder (one-shot ~24h before `trialEndsAt`,
  quiet-hours-shifted, `assertBillingCopyClean`, canceled on `mockCancel`, tagged
  `data.kind:"billing_trial_end"` for selective cancel), a "Tiny Bubbles Plus" Settings row, wiring
  the four unconsumed gates, and the documented MOCK→real RevenueCat seam. **Purchase stays mocked.**

---

## 4. Feature dependency graph (build order)

Everything sits on the SHIPPED foundation (theme resolvers, stores, storage/migration engine, core
loop, daypart engine, mock entitlements/paywall, notifications, companion). Build in waves; within a
wave, features are independent.

```
SHIPPED FOUNDATION  (theme • stores • storage+migrations • core loop • daypart • entitlements(mock) • notifications • companion)
        │
Wave A — cross-cutting foundations (land FIRST; unblock the rest)
  ├─ billing-entitlements   → owns the premium/free CLASSIFICATION + the 4 gate seams + ifThenPlans key
  ├─ aging-up               → widens AgeMode/CompanionStyle unions + exposes caps.companionStyle (do the union early)
  ├─ accessibility-i18n     → ModeKeyed canonical + catalog + AppText + a11y props + resolveStatusPresentation (others route copy/status through it)
  └─ production-readiness    → migration-forward + schema-roundtrip test harness + ErrorBoundary + empty states + dev-screen gating
        │                       (its harness validates every later "additive, no bump" claim; extend it per feature)
        ▼
Wave B — independent v1 features (foundation + Wave A only)
  ├─ visual-timers          → src/domain/timer.ts (canonical timer helper)
  ├─ verify-undo            → undoEarn/reverseRedemption/photoVerify (new dep expo-image-picker)
  ├─ child-autonomy         → shares caps.companionStyle exposure with aging-up (do it ONCE); canPickReward/master gate
  ├─ mood-checkin           → wires moodCheckin grant; premium trend via advancedInsights (needs billing)
  └─ multi-child            → choreStore(tb/chores) + rotation; multiChild gate (shipped)
        ▼
Wave C — features that consume a Wave-A gate or a Wave-B primitive
  ├─ soundscapes            → owns src/services/soundscape.ts audio-bed layer; calmSoundscape gate (needs billing)
  ├─ breathing-regulation   → CONSUMES soundscapes' bed (free waves scene); calmSoundscape for extra beds
  ├─ focus-intervals        → soft-reuses visual-timers' formatMSS; focusSessionStore (in-memory)
  ├─ novelty-refresh        → questStore(tb/quests) + spotlight; noveltyPipeline+companionThemes gates; optional avatar packs (aging-up)
  └─ if-then-plans          → planStore(tb/plans); reuses notifications budget; ifThenPlans gate (billing)
        ▼
Wave D — capstone aggregators (depend on many upstream slices)
  ├─ clinician-reporting    → report (reads ledger/runs/progress/MoodLog/breathing events/multi-child) +
  │                           LOCAL BACKUP/RESTORE (must enumerate ALL tb/ slices → build after new stores exist,
  │                           or rely on getAllKeys to auto-cover them); advancedInsights gate
  └─ production-readiness(2)→ final pass: backup-envelope schemaVersion stamp, extend migration fixture with EVERY
                              new slice, virtualize/memoize new lists, no-egress gate over new code, store metadata
```

**Hard edges (A → B/C/D):** aging-up's union widening should exist before other `Record<AgeMode>`
additions; billing's gate keys before novelty/soundscapes/clinician/mood/if-then wire them;
soundscapes' audio-bed layer before breathing consumes it; visual-timers' `timer.ts` before
focus-intervals' soft-reuse; the migration harness before (or alongside) each new slice. **Soft
edges:** clinician-reporting reads mood-checkin's `MoodLog` and breathing's opt-in events but
degrades gracefully if they ship later (the card simply doesn't render). **No cycles.**

---

## 5. Integration points with the existing daypart / loop / parent-dashboard

The features converge on a small set of shipped surfaces. These are the **hot shared files** — any
two features touching one must merge, not fork:

- **`components/task/TaskRunner.tsx` (the loop runner) — touched by 6 features.** visual-timers
  (`<VisualTimer>` on the active step), verify-undo (`UndoBar` after non-last Done, `VerifyPrompt`
  by `verification.mode`, `undoTaskId` param to `celebrate`), breathing (non-blocking "Take a
  breath" + "Breathe with me" on `category:'regulation'` steps), if-then-plans (`PlanCuePanel` on
  `afterStep` cue completion), soundscapes (focus-bed lifecycle + older-only toggle chip),
  child-autonomy (`NextStepChooser` in the young branch). **Invariant:** none of these change
  `onDone`/`onSkip`/token/celebration logic — all are additive, non-blocking, and read
  `caps.multiStepVisible`, never raw `ageMode`.
- **`components/kid/DaypartDonePanel.tsx` (the "all done for now" hub) — touched by 6 features.**
  It becomes the canonical capability-gated launcher: "Calm 🌊" (breathing), "How are you feeling?"
  (mood, when `caps.moodCheckin`), "🎯 Focus timer" (focus, when `focusIntervalsAvailable &&
  enabled`), quest chip (novelty, suppressed in calm), "My plans" chip (if-then), `ChildHandoffButton`
  (multi-child, when `quickChildSwitch`), plus `afterRoutine` plan lines. All low-emphasis peers of
  the existing peek link; each shown only on its data/capability condition.
- **`app/(kid)/calm.tsx` (calm corner) — touched by 3 features.** soundscapes generalises the
  ambient toggle into `<SoundscapePicker>` (scenes + volume, canonical audio layer); breathing
  replaces the hard-coded circle with `<BreathingBubble>` + `<CalmGarden>` + pattern chooser; mood
  adds a "Check in" affordance. Contract preserved: no tokens/confetti/celebration; audio stops on
  blur/unmount.
- **`app/(kid)/rewards.tsx` — novelty (`<QuestBoard>` above collection), child-autonomy
  (`canPickReward` gating of "Get this!" → "Ask a grown-up"; optional favorites-first),
  verify-undo (short-window "Undo" on auto-approved redemptions).**
- **`app/(parent)/dashboard.tsx` (mission control) — clinician "Progress report" row, multi-child
  "Switch" header action + shared-chore "turn today" row + management rows, mood "Recent check-ins"
  strip, verify-undo `VerifyQueue` + redemption "Undo", novelty "New this month" cadence readout.**
- **`app/(parent)/children.tsx` — 3-way age & companion Segmenteds (aging-up), 4 autonomy grant
  toggles (child-autonomy), Focus-timer card (focus), Shared-chores link + `removeChild` prune
  (multi-child).** Shared file: merge the Segmenteds with the switcher additions.
- **`app/(parent)/settings.tsx` — Language row (i18n), Soundscapes card (soundscapes), breathing
  pattern + pacing rows (breathing), Timer-sound toggle (visual-timers), quick-switch toggle
  (multi-child), Tiny Bubbles Plus row (billing), Backup/Restore rows (clinician), bounded
  DataReview (production).**
- **`app/(parent)/tasks.tsx` — "Ask to verify?" segmented (verify-undo), "Timer for this step"
  curated durations (visual-timers), FlatList virtualization (production).** Assign-sheet is shared.
- **`src/theme/resolveCapabilities.ts` — companionStyle exposure (aging-up × child-autonomy, do
  ONCE), canPickReward/master gate (child-autonomy), breathingChoice (breathing),
  focusIntervalsAvailable (focus), moodCheckin grant wire (mood).** The single most-merged resolver.
- **`src/theme/resolveContent.ts` (or `src/i18n/en.ts`) — every feature adds `ModeKeyed` copy keys;
  aging-up adds optional `preteen?`.** One key space.
- **`app/_layout.tsx` `ThemedRoot` — feed reduced-motion + moodCheckin + autonomy grants into the
  theme; concat plan reminder anchors; mirror soundscape volume + stop-on-background; schedule/cancel
  the trial reminder.** The single boot/orchestration seam.
- **`src/state/gameplay.ts` — orchestrators for undo/verify (verify-undo), switchActiveChild/chore
  materialisation in `reconcileChild` + `perCompletion` advance in `completeStep` (multi-child),
  quest signals + spotlight magnitude in `completeStep` + `rotateQuests` in `reconcileChild`
  (novelty); `wipeAllChildData` clears the 3 new stores.** The single write-orchestrator.
- **`app/(kid)/_layout.tsx` — register `mood`/`plans`/`focus` as pushed modal routes in both shells;
  add each to the `GrownUpsDoor` hide-list.**

---

## 6. Resolved conflicts (canonical picks)

Contradictions found across specs and the canonical resolution (mirrored in `openAssumptions`):

- **C1 — `caps.companionStyle` exposure is edited by two specs.** aging-up and child-autonomy both
  modify `resolveCapabilities` to expose the resolved `companionStyle` (replacing the
  `companionFraming` round-trip). **Resolve:** do the `ModeCapabilities.companionStyle` +
  `defaultCompanionStyle` widening ONCE (aging-up owns it; child-autonomy consumes). Land aging-up's
  union widening before child-autonomy's grant additions.
- **C2 — `ModeKeyed` definition + copy location.** i18n makes `src/i18n/en.ts` the string source and
  `resolveContent` a delegate; aging-up adds `preteen?` to `ModeKeyed` in `resolveContent.ts`; 8
  other specs "add keys to `resolveContent.COPY`". **Resolve:** ONE `ModeKeyed<T> = { young; older;
  preteen? }` defined in `src/i18n/types.ts` (or `resolveContent.ts` pre-i18n) and re-exported;
  new keys are authored in the canonical catalog (`en.ts` once i18n lands; `COPY` if a spec ships
  first, then migrated as a pure data move — zero component edits). `young`+`older` compile-required,
  `preteen` optional (falls back to `older`).
- **C3 — the calm-corner audio toggle is rewritten by two specs.** soundscapes generalises it into
  `<SoundscapePicker>`; breathing also upgrades the ambient toggle. **Resolve:** soundscapes owns the
  audio-bed layer (`src/services/soundscape.ts` + `SoundscapePicker`); breathing's "one free bed" is
  the free `waves` scene and it references that layer rather than adding a parallel toggle.
  `startAmbient`/`stopAmbient` become thin back-compat wrappers so `sound.test.ts` stays green.
- **C4 — timer helper duplicated.** visual-timers authors `src/domain/timer.ts`; focus-intervals
  needs the same math. **Resolve:** `src/domain/timer.ts` is canonical; focus-intervals imports
  `formatMSS`/remaining/fraction (soft reuse), and `FocusRing` may reuse `VisualTimer`.
- **C5 — `advancedInsights` scope across two consumers.** clinician-reporting (report depth) and
  mood-checkin (mood trend) both gate on it. **Resolve:** one gate = "extended on-device insight
  depth"; two surfaces; 7d/30d report + recent-mood-list stay free.
- **C6 — `calmSoundscape` scope + "is a calm sound free?"** breathing and soundscapes both use it,
  and calm/breathing must always have usable audio. **Resolve:** `calmSoundscape` gates only
  *extra* scene packs + focus-during-tasks; ≥1 free calm scene (`waves`) always; base breathing +
  all 3 patterns are free (never behind `<PremiumGate>`).
- **C7 — every new persisted slice claims "the backup spec must include us".** **Resolve:** backup
  export enumerates the whole `tb/` keyspace via `storage.getAllKeys()`, so any registered
  `tb/`-namespaced store (plans/chores/quests) and any additive field are auto-covered — no
  per-feature serializer edits. Only requirements: register the store, add it to `wipeAllChildData`,
  and count it in `DataReview`.
- **C8 — `preteen` breaks binary `Record<AgeMode>` maps that later specs add.** **Resolve:** land
  aging-up's union early; every later `Record<AgeMode>` (e.g. `resolveMoodCheckin`, focus
  `AGE_CAP_BASE`) includes `preteen`; the compiler forces it. `ModeKeyed` copy keys inherit the
  `older` fallback for `preteen`.
- **C9 — photo-in-backup boundary (verify-undo × clinician backup).** `photoUri` is a `file://`
  outside `tb/`. **Resolve (v1):** the backup includes photo *URIs* only (not image bytes); a durable
  photo-file bundle is a future enhancement. **A missing `photoUri` file (e.g. after cross-device
  restore) renders NOTHING — no broken-image icon** (`verify-undo.md` §2.4). Photos are written to an
  **excluded-from-OS-backup** dir and are **guaranteed deleted** on re-verify, on `wipeAllChildData`/
  `removeChild`, and on restore-replace (`verify-undo.md` §CREATE `photoVerify.ts` / §MODIFY
  `gameplay.ts`; production-readiness §2.7), so no orphan photo ever lingers or leaks via OS backup.
- **C10 — two separate on-device analytics opt-ins.** mood uses `moodLoggingEnabled`; breathing/
  report/quest event logging uses `localAnalyticsEnabled`. **Resolve:** keep both (distinct scopes),
  both default OFF, both on-device-only; the report's mood card keys off `moodLoggingEnabled`, its
  event context off `localAnalyticsEnabled`.
- **C11 — focus-intervals & novelty "keep-free-tier-useful" classification.** Some could arguably be
  premium. **Resolve:** per billing §8 they are FREE (a genuinely-working free tier); any could later
  move behind a NEW gate key for new-acquisition-only without a data migration.
- **C12 — energy scale (mood-checkin).** doc 62 said "older 0-10"; the buildable kid-grid is 3
  (young) / 5 (older). **Resolve:** 5-cell, with `energyScaleMax` stored so a later change never
  breaks old logs. The clinician report's mood card averages against each log's `energyScaleMax`
  (never the stale 0–10) — `clinician-reporting.md` §2.2/§3.2.
- **C13 — research feature #18 (Co-play / body-doubling): DEFERRED / out-of-scope for
  feature-complete (explicit disposition, was orphaned).** `01-current-state.md` §4.4 item 12 lists
  it `[MISSING]` with no spec. **Resolve:** real-time co-presence/body-doubling implies a **sync
  server / shared live session**, which violates the LOCKED **OFFLINE-FIRST, no-servers**
  architecture. It is therefore deferred out of the feature-complete set — dispositioned here the
  same way #23 (auto-breakdown, ZERO-AI `[N/A]`) and #25 (HSA/FSA, non-code) are, so it is not a
  silent gap. **Partial coverage already ships offline:** companion **co-presence** (the pet is
  "with" the child through the routine) + breathing's **"Breathe with me"** shared-pacing offer +
  the multi-child **hand-off** flow give a single-device, no-server flavor of body-doubling. A true
  networked co-play mode is a post-v1 item that would require lifting the no-server constraint. Also
  recorded in `00-MASTER-ROADMAP.md` §1.

---

## 7. One-line takeaway

Feature-complete is a **purely additive delta**: three new persisted slices (`tb/plans`, `tb/chores`,
`tb/quests`), one in-memory session store, a handful of union widenings and optional fields, and a
large set of non-persisted resolvers/catalogs/services — all merging into the shipped model with
**`SCHEMA_VERSION` staying 1 and `MIGRATIONS` empty**, guarded by one forward-migration fixture,
gated only through the existing `FEATURE_GATES` (+ one new `ifThenPlans` key), serialized wholesale
by an offline `tb/`-keyspace backup, kept age-adaptive through resolver/flag additions only, and kept
anti-shame by construction — with the cloud portal replaced by on-device backup/restore + a printable
clinician report, and purchase kept mocked behind the existing seam.
