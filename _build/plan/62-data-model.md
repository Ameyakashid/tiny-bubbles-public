# Tiny Bubbles — Data Model & Local State (MVP, offline-first)

*Plan doc 62. Companion to `00-SYNTHESIS.md` and `01-feature-matrix.md`. Specifies the complete local data model (TypeScript), AsyncStorage layout, derived selectors, the reinforcement-thinning algorithm, the forgiving-streak algorithm, migration/versioning, and seed/template data. Grounded in the actual donor code under `_sources/` — every "port" note points at a real file, type, or function.*

**Stack assumptions (locked):** React Native + Expo SDK 54 (base = `lockin`), TypeScript strict, `@react-native-async-storage/async-storage` only (no backend, no accounts, no network in MVP). Cross-platform iOS/Android, phones + tablets.

**Hard rules this model encodes (non-negotiable):** never-punishing (no streak zeroing, no loss-aversion, no dying/sad companion, no FAILED task state for kids), immediate token payout at point-of-completion, age-adaptive (`ageMode` is first-class), curated autonomy (capped option lists), everything has a `spokenLabel` for non-readers, a calm/non-gamified path, AI off by default, designed-but-mocked paywall.

---

## 0. Where this model comes from (donor grounding)

| Concern | Donor source (real file) | What we take / change |
|---|---|---|
| Token economy | `tether/app/src/electron/services/GamificationService.ts` (`GamificationData`, `awardPoints()`, `unlockTheme()`, `DOCK_THEMES`, `mergeWithDefaults()`, `validateAndMigrate()`) | Port the **append-event + update-totals + cap-history** pattern into a `TokenLedger`; port `unlockTheme()` "spend points to unlock" into redemption spend; port `mergeWithDefaults`/`validateAndMigrate` into our migration layer. **Drop** focus-session/SWE coupling, badges/quests (defer to v1). |
| Forgiving streak | `momentum/backend/src/lib/streaks.ts` (`calculateTaskStreak`, `updateTaskStreak`; uses `date-fns` `startOfDay`/`differenceInDays` + `date-fns-tz` `toZonedTime`) | Port the timezone-aware day-diff logic. **Change the one punitive line**: where momentum does `return { streakDays: 1, wasReset: true }` on a gap > 1 day, we instead consume a freeze/grace day or *pause* the streak — **never zero it**. |
| Forgiving rollover | `momentum/backend/src/jobs/dailyRollover.ts` (incomplete `TODAY` → `SOMEDAY`, `TOMORROW` → `TODAY`, never "failed") | Port the rollover semantics into a local on-open/on-midnight reconciler. This is our anti-shame task lifecycle. |
| Mood/energy | `momentum/.../MoodSelector.tsx` + `Mood` enum (`ROUGH/OKAY/GOOD/GREAT`) in `schema.prisma` | Reuse the 4-level mood scale (lowercased) + a 3-level energy scale (ilseon `EnergyLevel.kt` pattern) for `young`. |
| Parent settings | `momentum/backend/prisma/schema.prisma` `User` fields (`timeZone`, `quietHoursStart/End`, `notificationsEnabled`, `soundEnabled`, `hapticEnabled`, reminder times) | Lift the field set into `ParentSettings`. **Drop** `email`/`passwordHash`/auth. |
| Persistence pattern | `lockin` AsyncStorage usage (`app/index.tsx` `hasOnboarded`, `app/(tabs)/index.tsx` `milestoneStack`/`activeMilestone`, `app/(tabs)/profile.tsx` `getAllKeys`+`multiRemove` reset) | Reuse key-namespaced AsyncStorage + JSON.stringify pattern and the all-keys reset. **Upgrade** ad-hoc keys into the structured namespace in §2. |
| Step/visual model | `lockin/types.ts` (`Milestone`, `Todo`, `MilestoneStatus`) + `habit-tracker-app/app/screens/create-new-habit.tsx` (EmojiPicker `rn-emoji-keyboard`, `reanimated-color-picker`, `reminders[]`, frequency days) | Reuse the ordered-step + emoji/color picker shape for task authoring. **Drop** `MilestoneStatus = 'FAILED'`, `impact: 'HIGH'|'CRITICAL'`, and `LockedGoal` (the "one immutable goal/year"). |
| Notifications | `lockin/services/notifications.ts` (`registerForPushNotificationsAsync`, `schedulePushNotification(title,body,seconds)`, `scheduleNotificationAtDate`, `cancelAllNotifications`) | Reuse as the reminder engine; gate every schedule call through quiet-hours + reminder budget (§9). |

**Explicitly NOT ported (license/safety):** any `adhd-india` / `adhd-focus-mate` code (reference-only). From tether: `ActivityLog`/`WindowData`/`TypingData`/surveillance + LLM types. From lockin: shame sprite states (`isAngry`), `LockedGoal`, "ruthless advisor" AI prompts. From momentum: Prisma/JWT/Postgres data layer.

---

## 1. Design overview

- **One JSON-able store, split across namespaced AsyncStorage keys.** A single blob would force a full rewrite on every token tap; per-domain keys keep the hot path (token earn) cheap. The in-memory shape is one `RootState` object; persistence is per-slice (§2, §11).
- **Three ownership scopes:** *app-global* (meta, onboarding), *parent-global* (settings, entitlement, parent gate), and *per-child* (everything the child interacts with). Multiple children are first-class.
- **Age-adaptive everywhere:** `ChildProfile.ageMode` (`'young' | 'older'`) is read by selectors to decide presentation (icon-first vs text-allowed), companion variant, default reinforcement density, energy-scale granularity, and autonomy surface. Stored data is identical across modes; only *derivation* differs, so a child can switch modes without data loss.
- **Never-punishing is structural, not cosmetic:** there is **no field anywhere that can represent failure, loss, debt, decay, or guilt.** Task lifecycle has no `FAILED`. Streaks cannot reach a "broken/0" state. Companion mood enum contains no negative state. Token entries are only ever `+earn` or explicit `-spend` (redemption/parent gift); nothing auto-deducts.
- **Everything spoken:** every user-facing entity carries a `VisualLabel` with a required `spokenLabel` (TTS via `expo-speech`), so non-readers run the whole loop.

---

## 2. Storage layout (AsyncStorage namespace)

All keys are prefixed `tb/` (Tiny Bubbles). Values are `JSON.stringify`'d slices. Lists of children are stored as an index plus per-child keys so we never load all children's ledgers at once.

```
tb/meta                         -> AppMeta           (schemaVersion, installId, activeChildId, onboarding)
tb/parentSettings               -> ParentSettings    (parent-global: gate, quiet hours, reminders, a11y)
tb/entitlement                  -> Entitlement       (free/premium, trial, MOCK purchase records)
tb/childIndex                   -> ChildIndexEntry[]  (ordered list: id, displayName, ageMode, avatarColor)
tb/seedState                    -> SeedState         (which seed packs/version applied, to avoid re-seeding)

# Per child <cid> (one key per slice; written independently):
tb/child/<cid>/profile          -> ChildProfile
tb/child/<cid>/companion        -> CompanionState
tb/child/<cid>/routines         -> Routine[]
tb/child/<cid>/tasks            -> Task[]            (standalone + routine steps; see §5)
tb/child/<cid>/runs             -> RoutineRun[]      (recent runtime records, capped)
tb/child/<cid>/ledger           -> TokenLedger       (balance + capped entries)
tb/child/<cid>/reinforcement    -> ReinforcementState (per-habit thinning counters)
tb/child/<cid>/progress         -> ProgressState     (forgiving streak + cumulative)
tb/child/<cid>/rewards          -> Reward[]          (caregiver-set real-world menu)
tb/child/<cid>/redemptions      -> RedemptionRequest[]
tb/child/<cid>/moods            -> MoodLog[]         (capped)
tb/child/<cid>/events           -> ActivityEvent[]   (local-only analytics, capped, opt-out)
```

**Conventions**
- `id`: `uuidv4()` (already a tether dep) or `crypto.randomUUID()`; string.
- Timestamps: epoch ms `number` (matches tether `timestamp: number`). Calendar days: ISO `'YYYY-MM-DD'` strings computed in the child's timezone (matches momentum's `startOfDay(toZonedTime(...))`).
- Capped collections (`ledger.entries`, `runs`, `moods`, `events`) keep the most recent N (default 500) — mirrors tether's `achievements.slice(0,100)`. Aggregates (`balance`, `lifetimeEarned`, `cumulativeCount`) are stored separately so capping never loses totals.
- **Reset / "delete my data":** `AsyncStorage.getAllKeys()` → filter `tb/` → `AsyncStorage.multiRemove()` (the `lockin/app/(tabs)/profile.tsx` pattern), with a per-child variant filtering `tb/child/<cid>/`.

---

## 3. Schema version & migration strategy

```ts
export const SCHEMA_VERSION = 1; // bump on any breaking shape change

export interface AppMeta {
  schemaVersion: number;
  installId: string;            // anonymous, local only
  createdAt: number;
  lastOpenedAt: number;
  activeChildId: string | null; // who the kid UI is currently showing
  onboarding: OnboardingState;
}

export interface OnboardingState {
  completed: boolean;
  currentStep:
    | 'welcome' | 'privacy_consent' | 'parent_gate_setup'
    | 'create_first_child' | 'pick_companion' | 'starter_routine' | 'done';
  privacyConsentAckAt: number | null; // COPPA-style local acknowledgement
  parentGateConfigured: boolean;
  firstChildCreated: boolean;
  calmModeOffered: boolean;            // we MUST surface the non-gamified path once
}
```

**Migration engine (ported from tether's `mergeWithDefaults` + `validateAndMigrate`).** tether's `GamificationService.load()` does: ensure dir → if missing, write defaults → else `JSON.parse` → `mergeWithDefaults(loaded)` → `validateAndMigrate()`. We generalize:

```ts
type Migration = { from: number; to: number; migrate: (slices: RawSlices) => RawSlices };

const MIGRATIONS: Migration[] = [
  // { from: 1, to: 2, migrate: (s) => ({ ...s, /* add new fields with defaults */ }) },
];

async function loadStore(): Promise<RootState> {
  const meta = (await getJSON<AppMeta>('tb/meta')) ?? freshMeta();
  let raw = await readAllSlices();                 // read every tb/ key
  if (meta.schemaVersion < SCHEMA_VERSION) {
    await backupSlices(raw);                        // write tb/_backup/v{n} once before migrating
    raw = runMigrations(raw, meta.schemaVersion);   // sequential from->to
  }
  const state = mergeWithDefaults(raw);             // fill missing fields per-entity (tether pattern)
  validateAndRepair(state);                         // clamp invalid values (tether pattern)
  return state;
}
```

`mergeWithDefaults` per entity (tether `mergeBadges`/`mergeQuests` style): for each child slice, spread entity defaults under loaded values so new fields appear with safe defaults; re-seed any missing built-in template/reward by `id`.

`validateAndRepair` invariants (tether `validateAndMigrate` style, extended for our hard rules):
- `ledger.balance = max(0, balance)`; recompute `balance` from `lifetimeEarned - lifetimeSpent - heldTokens` if inconsistent.
- `activeChildId` must exist in `childIndex`, else first child or `null`.
- Companion `mood` ∉ allowed set → coerce to `'content'`. Companion `bondLevel`/`growthStage` never decreased by repair.
- Any task with a stray `status` outside the allowed union → `'todo'` (never `'failed'` — that state does not exist).
- `progress.currentStreakDays` never set below `0`; never overwrite `longestStreakDays` downward.

**Backward/forward safety:** unknown keys are preserved through migration (spread-merge), so a newer build's data won't be silently dropped by an older build mid-rollout.

---

## 4. Child profiles, settings, age mode

```ts
export type AgeMode = 'young' | 'older';   // young ≈4-7 (non-reader, icon+audio first); older ≈8-12

export interface ChildIndexEntry {          // lightweight; loaded at app start
  id: string;
  displayName: string;
  ageMode: AgeMode;
  avatarColor: string;                      // hex; for the profile switcher
  createdAt: number;
  archived: boolean;                        // soft-hide, never hard-delete from UI without parent gate
}

export interface ChildProfile {
  id: string;
  displayName: string;                      // first name / nickname only (no PII beyond this)
  ageMode: AgeMode;
  birthMonth?: string;                      // optional 'YYYY-MM' to suggest ageMode; never required
  avatarColor: string;
  timeZone: string;                         // IANA, e.g. 'America/Mexico_City' (momentum User.timeZone)
  createdAt: number;
  updatedAt: number;
  archived: boolean;

  settings: ChildSettings;                  // per-child, parent-owned
}

export interface ChildSettings {
  calmMode: boolean;                        // non-gamified path: hides tokens/celebration intensity, keeps routine + audio
  celebrationIntensity: 'full' | 'medium' | 'gentle'; // default by ageMode; calmMode forces 'gentle'
  soundEnabled: boolean;                    // overrides parent-global when set
  hapticsEnabled: boolean;
  reducedMotion: boolean;                   // a11y; also auto-on if OS setting detected
  spokenLabelsEnabled: boolean;             // TTS; default true, MANDATORY-on for 'young'
  autonomy: {
    canReorderSteps: boolean;               // default true 'older', true-but-simplified 'young'
    canPickReward: boolean;                 // child may *request*, parent approves (§7)
    canCustomizeCompanion: boolean;
  };
  reinforcement: ReinforcementConfig;       // per-child thinning curve (§8)
  reminders: ReminderConfig;                // per-child schedule (§9)
  autoApproveRedeemUnderTokens: number;     // 0 = always require parent approval
}
```

**Age-mode derivation (selectors, not stored):**

| Derived | `young` | `older` |
|---|---|---|
| Primary label | picture/emoji + color, `spokenLabel` auto-plays | text allowed, `spokenLabel` on tap |
| Companion variant | `cuddly` art set | `cool`/avatar art set (same `CompanionState`) |
| One-step loop | strict one-step-at-a-time, big targets | one-step default, can preview list |
| Energy scale shown | 3-level (`low/ok/high`) | 5- or 10-level |
| Default `celebrationIntensity` | `full` | `medium` |
| Default reinforcement | longer dense phase | shorter dense phase |
| Autonomy surface | 3 options max | up to 6 options |

---

## 5. Tasks, routine steps, routines

We unify "task" and "routine step" into **one persisted shape** (`Task`), because the synthesis treats "small concrete tasks / routine steps" as the same atomic unit run one-at-a-time. A `Task` with `routineId === null` is a standalone task; with `routineId` set + `order` it is a routine step. `TaskTemplate` is the reusable library entry (seed data, §13).

```ts
// Shared visual payload — every kid-facing entity carries this (non-reader support).
export interface VisualLabel {
  text?: string;            // optional; hidden/secondary in 'young'
  spokenLabel: string;      // REQUIRED — TTS string ("Brush your teeth")
  emoji?: string;           // from rn-emoji-keyboard (habit-tracker create-new-habit)
  icon?: string;            // icon name from our icon set (fallback when no picture)
  color: string;            // hex; from reanimated-color-picker
  pictureUri?: string;      // optional local image (e.g. a real photo of the child's toothbrush)
}

export type VerificationMode = 'none' | 'self' | 'photo' | 'parent';
export interface Verification {
  mode: VerificationMode;       // default 'none' (light, optional — anti-burden)
  required: boolean;            // if false, child can complete without it; verify is a bonus
  photoUri?: string;            // captured at completion (local only)
  verifiedBy?: 'child' | 'parent';
  verifiedAt?: number;
}

export type TaskStatus = 'todo' | 'done' | 'skipped';   // NO 'failed' — by design
export type TaskDeadline = 'today' | 'tomorrow' | 'someday' | 'anytime'; // momentum TaskDeadline, + 'anytime'

export interface Task {
  id: string;
  childId: string;
  templateId: string | null;     // provenance if created from the starter library
  routineId: string | null;      // null => standalone task; set => routine step
  order: number;                  // position within routine (draggable; react-native-draggable-flatlist)
  label: VisualLabel;
  verification: Verification;
  tokenValue: number;             // BASE immediate payout on completion (always paid; never thinned to 0)
  timerSeconds?: number;          // optional visual transition timer (feature #14)
  deadline: TaskDeadline;
  schedule: TaskSchedule;         // when it appears
  status: TaskStatus;             // current instance status for the active period
  lastCompletedAt?: number;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

export interface TaskSchedule {
  daysOfWeek: number[];           // 0-6 (empty => every day); from create-new-habit frequency picker
  timeOfDay?: string;             // 'HH:mm' local; optional point-of-performance anchor
  oneOff?: string;                // 'YYYY-MM-DD' for a single-day assignment
}

export interface Routine {
  id: string;
  childId: string;
  label: VisualLabel;             // routine has its own icon/color/spokenLabel ("Morning routine")
  stepIds: string[];             // ordered Task ids where routineId === this.id (source of truth for order)
  schedule: TaskSchedule;
  mode: 'gamified' | 'calm';      // calm inherits ChildSettings.calmMode by default
  active: boolean;
  createdAt: number;
  updatedAt: number;
}
```

**Runtime record (feeds ledger + progress; capped list):**

```ts
export interface RoutineRun {
  id: string;
  childId: string;
  routineId: string | null;       // null for a standalone task run
  startedAt: number;
  completedAt?: number;
  steps: StepResult[];            // one per step attempted
  tokensAwarded: number;          // sum of immediate payouts this run
  allDone: boolean;               // true if every step done (NOT required for reward — partial is celebrated)
}

export interface StepResult {
  taskId: string;
  status: 'done' | 'skipped';     // skipping is free and never penalized
  completedAt?: number;
  tokensAwarded: number;          // base + reinforcement extras at the moment of the tap
  celebrationShown: CelebrationLevel;
}
```

**Lifecycle (forgiving, ports momentum `dailyRollover`):**
- On app open and at local midnight (timezone-aware, via the on-open reconciler), any `today` task still `todo` is **rolled to `someday`** — never marked failed (momentum `TODAY → SOMEDAY`). `tomorrow` → `today`. `status` resets to `todo` for the new period.
- Completing a step writes a `StepResult`, appends a `TokenEntry` **immediately** (§6), fires the celebration, and updates `ProgressState` (§10). Partial completion ("3 of 5") is celebrated; there is no all-or-nothing gate.
- **Undo** (feature #17): a `done` StepResult can be reverted within a short window; reverting appends a compensating ledger entry tagged `reason:'undo'` (not a punishment — it cancels an accidental tap).

---

## 6. Token ledger (immediate payout)

Ports the tether `GamificationData` totals + `awardPoints()` append pattern, restructured as an auditable ledger so spends/redemptions are traceable and balance can never go silently negative.

```ts
export type TokenReason =
  | 'task_complete' | 'routine_complete' | 'streak_bonus'
  | 'surprise_bonus' | 'redeem' | 'redeem_refund'
  | 'parent_gift' | 'undo' | 'seed' | 'adjustment';

export interface TokenEntry {
  id: string;
  ts: number;
  delta: number;            // +earn or -spend (spend only via redeem/adjustment)
  reason: TokenReason;
  refId?: string;           // taskId | routineId | redemptionId
  baseValue?: number;       // the task's base tokenValue (audit of thinning)
  multiplier?: number;      // reinforcement multiplier applied (audit; see §8)
  note?: string;            // kid-friendly text, e.g. "Brushed teeth!"
}

export interface TokenLedger {
  childId: string;
  balance: number;          // spendable now (>= 0 always)
  heldTokens: number;       // reserved by pending redemption requests (escrow; §7)
  lifetimeEarned: number;   // monotonic up (tether totalPointsEarned)
  lifetimeSpent: number;    // monotonic up
  lastEarnedAt: number;     // tether lastActivityTime
  entries: TokenEntry[];    // capped 500 (tether caps achievements at 100)
}
```

**Earn (the hot path — must be synchronous-feeling, sub-second):**
```ts
function earn(ledger, reinforcement, task): TokenEntry {
  const r = computeReinforcement(reinforcement, task, child);  // §8
  const delta = task.tokenValue + r.bonusTokens;               // base ALWAYS paid
  const entry = { id: uuid(), ts: now(), delta, reason: 'task_complete',
                  refId: task.id, baseValue: task.tokenValue, multiplier: r.multiplier,
                  note: task.label.spokenLabel };
  ledger.balance += delta; ledger.lifetimeEarned += delta; ledger.lastEarnedAt = entry.ts;
  ledger.entries.unshift(entry); capTo(ledger.entries, 500);
  return entry; // UI fires celebration of level r.celebration immediately
}
```
- **Never auto-deduct.** There is no code path that removes tokens for inactivity, lateness, or a missed task. The only negatives are explicit redemption spends and parent `adjustment`/`undo`.
- **`availableBalance` selector = `balance - heldTokens`** (so a pending redemption can't be double-spent, yet declining it costs nothing).
- Port note: replace tether's `level = floor(totalPointsEarned/100)+1` with companion `bondLevel`/`growthStage` (§9) — same monotonic idea, retoned to the pet, not a "level".

---

## 7. Reward catalog + redemption (caregiver-set, real-world)

```ts
export type RewardCategory =
  | 'screen_time' | 'treat' | 'activity' | 'outing' | 'privilege' | 'choice' | 'custom';

export interface Reward {
  id: string;
  childId: string;
  label: VisualLabel;
  category: RewardCategory;
  costTokens: number;
  screenTimeMinutes?: number;     // when category === 'screen_time' (the #1 requested backup reward)
  active: boolean;
  requiresParentApproval: boolean; // default true; auto-approve possible under threshold
  limitPerWeek?: number;           // optional guardrail (not a punishment; just availability)
  cooldownHours?: number;
  createdAt: number;
  updatedAt: number;
}

export type RedemptionStatus =
  | 'requested' | 'approved' | 'fulfilled' | 'declined' | 'expired' | 'canceled';

export interface RedemptionRequest {
  id: string;
  childId: string;
  rewardId: string;
  costTokens: number;             // snapshot of cost at request time
  status: RedemptionStatus;
  requestedAt: number;
  decidedAt?: number;
  fulfilledAt?: number;
  decidedBy?: 'parent';
  declineReasonKidSafe?: string;  // gentle, e.g. "Let's save up a little more!" — NEVER shaming
}
```

**Escrow flow (forgiving — declining never costs the child tokens):**
1. Child requests reward (if `canPickReward`). If `availableBalance >= costTokens`: create `RedemptionRequest{status:'requested'}`, **hold** tokens (`ledger.heldTokens += costTokens`). No spend entry yet.
2. If `costTokens <= settings.autoApproveRedeemUnderTokens` → auto-`approved`.
3. On parent **approve**: write `TokenEntry{delta:-costTokens, reason:'redeem'}`, `ledger.lifetimeSpent += costTokens`, release hold. Status → `approved` then `fulfilled` when handed over.
4. On parent **decline** / child **cancel** / **expire**: release hold (`heldTokens -= costTokens`), **no spend** (`redeem_refund` only if a spend had occurred). The child loses nothing — anti-loss-aversion rule.

This is the tether `unlockTheme()` "check affordability → subtract cost → grant" pattern (`if (this.data.points < theme.unlockCost) return false; this.data.points -= theme.unlockCost`), reworked into a two-phase, refundable, parent-gated flow with real-world rewards.

---

## 8. Reinforcement-density schedule (the thinning algorithm)

**Goal (from `00-SYNTHESIS` §2.1 step 6 + fact-check `reinforcement-frequency`):** reinforce *richly* at first, then *thin* as the habit forms — keep the practice, drop the "ADHD-specific / variable-ratio is superior" justification. **Hard constraint:** the *core* immediate token + a celebration for completing a task is **never removed** (removing it would be loss-aversion and contradicts the immediate-reinforcement evidence for ADHD). What thins is the **richness**: surprise *bonus* tokens, celebration *intensity*, and extra praise — not the base reward.

```ts
export type CelebrationLevel = 'full' | 'medium' | 'gentle' | 'calm';
export type ReinforcementPhase = 'dense' | 'thinning' | 'maintenance';

export interface ReinforcementConfig {           // per child (ChildSettings.reinforcement)
  denseUntilCompletions: number;                 // default 7  (young: 10)
  thinningUntilCompletions: number;              // default 21 (young: 28)
  baseBonusTokens: number;                       // default 1  (extra on top of task.tokenValue in dense)
  bonusEveryN_dense: number;                     // default 1  (every completion gets bonus)
  bonusEveryN_thinning: number;                  // default 3
  bonusEveryN_maintenance: number;               // default 7
  reWarmAfterIdleDays: number;                   // default 5  (lapse => step back toward dense, NEVER punish)
}

export interface ReinforcementState {            // per child, keyed by habitKey
  childId: string;
  habits: Record<string, HabitReinforcement>;    // habitKey = routineId ?? `task:${taskId}`
}
export interface HabitReinforcement {
  habitKey: string;
  completions: number;                           // lifetime, monotonic
  sinceLastBonus: number;                        // counter for the every-N gate
  lastCompletedAt: number;
}
```

**Algorithm:**
```ts
function computeReinforcement(state, task, child): {
  bonusTokens: number; multiplier: number; celebration: CelebrationLevel; phase: ReinforcementPhase;
} {
  const cfg = child.settings.reinforcement;
  const h = state.habits[habitKeyFor(task)] ?? newHabit();

  // 1) Lapse re-warm: if the child came back after a gap, soften the curve (welcome them, never punish).
  if (daysBetween(h.lastCompletedAt, now()) >= cfg.reWarmAfterIdleDays) {
    h.completions = Math.max(0, Math.floor(h.completions / 2)); // step back toward 'dense'
    h.sinceLastBonus = 0;
  }

  // 2) Phase by completion count.
  const phase: ReinforcementPhase =
    h.completions < cfg.denseUntilCompletions ? 'dense'
    : h.completions < cfg.thinningUntilCompletions ? 'thinning'
    : 'maintenance';

  // 3) Bonus cadence (the only thing that thins — base token already paid by earn()).
  const everyN = phase === 'dense' ? cfg.bonusEveryN_dense
               : phase === 'thinning' ? cfg.bonusEveryN_thinning
               : cfg.bonusEveryN_maintenance;
  h.sinceLastBonus += 1;
  const giveBonus = h.sinceLastBonus >= everyN;
  const bonusTokens = giveBonus ? cfg.baseBonusTokens : 0;
  if (giveBonus) h.sinceLastBonus = 0;

  // 4) Celebration intensity steps down with phase, but respects calm mode / child setting.
  const base: CelebrationLevel =
    phase === 'dense' ? 'full' : phase === 'thinning' ? 'medium' : 'gentle';
  const celebration = child.settings.calmMode ? 'calm'
                    : clampToMax(base, child.settings.celebrationIntensity);

  h.completions += 1; h.lastCompletedAt = now();
  state.habits[h.habitKey] = h;
  return { bonusTokens, multiplier: 1 + bonusTokens / Math.max(1, task.tokenValue), celebration, phase };
}
```

**Notes / guardrails**
- The cadence is a **fixed every-N**, deliberately *not* a randomized variable-ratio (we refuse the slot-machine/loot-box mechanism the fact-check flags). "Variety" lives in *content* (themes/skins/quests, v1), not in unpredictable payout timing.
- `calmMode` short-circuits to base token only + `'calm'` celebration; no bonuses, no thinning drama.
- Parent can reset a habit's curve (e.g., after illness) — `completions := 0` — which is welcomed re-warming, never a penalty.

---

## 9. Companion state (never-punishing)

```ts
// The full enumerable mood set contains NO negative/guilt state. There is no 'sad', 'sick',
// 'angry', 'hungry', 'dying', 'lonely'. Returning after a long absence => 'excited' (happy to see you).
export type CompanionMood = 'content' | 'happy' | 'excited' | 'sleepy' | 'celebrating';

export interface CompanionState {
  childId: string;
  speciesId: string;            // which buddy art set; 'cuddly' families for young, 'cool' for older
  name: string;                 // child-named (autonomy)
  mood: CompanionMood;          // derived from recent positive events; defaults 'content'
  bondLevel: number;            // monotonic non-decreasing (replaces tether 'level')
  growthStage: number;          // 0..n cosmetic growth; only ever advances
  lastInteractionAt: number;
  customization: CompanionCustomization;
  unlockedItems: string[];      // ids of owned cosmetics (tether unlockedThemes pattern)
  equipped: { outfitId?: string; hatId?: string; backgroundId?: string };
}

export interface CompanionCustomization {
  baseColor: string;            // reanimated-color-picker
  accentColor: string;
  accessories: string[];        // capped, curated set (autonomy without overload)
}
```

- **Bond/growth are cumulative and monotonic** — derived from `lifetimeEarned` and care interactions. There is no decay timer; skipping days does not shrink the companion. This is the structural opposite of lockin's shame sprites (`isAngry`, angry-jump in `ExecutionSprite.tsx`), which we do **not** port.
- `mood` is a *short-lived* expression of the last positive interaction (e.g., `'celebrating'` right after a completion, decaying to `'content'`/`'sleepy'`), never to a negative state.
- Cosmetic unlocks reuse tether `DOCK_THEMES` shape (`{ id, name, unlockCost, rarity, gradient }`) retoned as companion items; unlocking spends tokens via the §7 flow (or is free/seeded).

---

## 10. Forgiving streak / cumulative progress

Ports `momentum/.../streaks.ts` timezone-aware day math, **with the punitive reset removed**.

```ts
export interface ProgressState {
  childId: string;
  cumulativeCount: number;       // total steps/tasks ever completed — monotonic, NEVER decreases
  currentStreakDays: number;     // consecutive active days (forgiving)
  longestStreakDays: number;     // best ever (only ever increases)
  lastActiveDate: string | null; // 'YYYY-MM-DD' in child tz (momentum lastTaskCompletionDate)
  freezeTokens: number;          // grace days available (auto-earned; consumed before a streak pauses)
  freezeUsedDates: string[];     // audit of grace days applied
  weekCompletions: number;       // rolling count for "look how many bubbles you popped"
  paused: boolean;               // streak is RESTING (not broken); display "best: N", invite restart
}

export interface ProgressConfig {
  freezeTokensMax: number;       // default 2 (young), 1 (older); auto-replenished weekly
  freezeReplenishPerWeek: number;// default 1
}
```

**Algorithm (the one changed line vs momentum):**
```ts
function applyCompletionToStreak(p: ProgressState, tz: string): ProgressState {
  const today = isoDay(toZonedTime(Date.now(), tz));        // momentum startOfDay(toZonedTime(...))
  if (!p.lastActiveDate) return { ...p, currentStreakDays: 1, lastActiveDate: today, cumulativeCount: p.cumulativeCount + 1, paused: false };

  const gap = diffDays(today, p.lastActiveDate);            // momentum differenceInDays
  let next = { ...p, cumulativeCount: p.cumulativeCount + 1 };

  if (gap === 0) {                                          // already counted today
    return next;
  }
  if (gap === 1) {                                          // momentum: continue
    next.currentStreakDays = p.currentStreakDays + 1;
  } else {
    // momentum would do: return { streakDays: 1, wasReset: true }  <-- WE DO NOT.
    const missed = gap - 1;
    if (p.freezeTokens >= missed) {                         // spend grace days, PRESERVE streak
      next.freezeTokens = p.freezeTokens - missed;
      next.freezeUsedDates = [...p.freezeUsedDates, today];
      next.currentStreakDays = p.currentStreakDays + 1;     // welcomed back, streak intact
    } else {                                                // not enough grace: PAUSE, do not zero
      next.paused = true;
      next.currentStreakDays = 1;                           // a fresh, gentle restart (never shown as "0")
      // longestStreakDays is retained and surfaced as "your best: N"
    }
  }
  next.lastActiveDate = today;
  next.paused = false;
  next.longestStreakDays = Math.max(p.longestStreakDays, next.currentStreakDays);
  return next;
}
```

**Presentation rules (encoded so UI cannot violate them):** never render the number `0` for a streak, never the words "broken/lost/failed"; a lapse is "resting" with a "best so far" badge and a one-tap restart. `cumulativeCount` and `longestStreakDays` are always available so progress is *cumulative and never zeroed*. Streaks are **opt-in** (a child/parent setting can hide them entirely — calm path).

---

## 11. Mood / energy logs

Reuses momentum's `Mood` enum (lowercased) + an energy scale whose granularity follows `ageMode`.

```ts
export type Mood = 'rough' | 'okay' | 'good' | 'great';   // momentum ROUGH/OKAY/GOOD/GREAT
export interface MoodLog {
  id: string;
  childId: string;
  ts: number;
  day: string;                 // 'YYYY-MM-DD' (one primary check-in/day, but multiple allowed)
  mood?: Mood;
  energy?: number;             // young: 1-3 (low/ok/high, ilseon EnergyLevel); older: 0-10 (momentum energy)
  note?: string;               // optional; spoken or typed
  context?: 'morning' | 'after_school' | 'bedtime' | 'adhoc';
}
```
- The picker reuses `momentum/.../MoodSelector.tsx` (the 4 weather-emoji moods 🌧️☁️🌤️☀️), reskinned kid-bright; energy uses ilseon's 3-level color pattern for `young`.
- Mood logging is **optional and low-friction** (supportive UX, not an efficacy claim); it powers the "calm corner" and gentle parent insight, never a score.

---

## 12. Parent settings, reminders, entitlement (paywall)

```ts
export interface ParentSettings {              // parent-global (tb/parentSettings)
  parentGate: {
    mode: 'math' | 'pin' | 'biometric' | 'none';   // medtimer Biometrics.kt-style; 'math' = simplest gate
    pinHash?: string;                                // never store the PIN in cleartext
  };
  notificationsEnabled: boolean;               // momentum User.notificationsEnabled
  soundEnabled: boolean;                        // momentum soundEnabled (global default)
  hapticEnabled: boolean;                       // momentum hapticEnabled
  reducedMotionDefault: boolean;
  lowStimTheme: boolean;                        // calm canvas global toggle
  quietHours: { start: string; end: string };  // 'HH:mm'; momentum quietHoursStart/End
  aiEnabled: boolean;                           // DEFAULT false (kids privacy; AI off by default)
  localAnalyticsEnabled: boolean;              // default true, fully on-device; opt-out
  updatedAt: number;
}

export interface ReminderConfig {              // per child (ChildSettings.reminders)
  enabled: boolean;
  maxPerDay: number;                            // budget — anti-notification-flood (default 2-3)
  anchors: ReminderAnchor[];                    // point-of-performance, tied to the child's schedule
  toneIsGentle: true;                           // type-enforced: reminders may never be guilt-toned
}
export interface ReminderAnchor {
  id: string;
  routineId?: string;
  time: string;                                 // 'HH:mm' local
  daysOfWeek: number[];
  spokenLabel: string;                          // e.g. "Time for the bedtime bubbles"
}
```

Reminders schedule through `lockin/services/notifications.ts` (`scheduleNotificationAtDate(title, body, date)`); every call is filtered by `quietHours` and the per-day `maxPerDay` budget, and copy is fixed/gentle (no "Buddy misses you" guilt).

**Entitlement / paywall — designed and gated, but MOCKED (no real processor):**
```ts
export type Tier = 'free' | 'premium';
export interface Entitlement {
  tier: Tier;
  source: 'none' | 'trial' | 'mock_purchase';
  trialStartedAt?: number;
  trialEndsAt?: number;                         // 7-day trial (honest, surfaced)
  premiumSince?: number;
  mockPurchases: MockPurchaseRecord[];          // stub records; NO RevenueCat/StoreKit in MVP
  updatedAt: number;
}
export interface MockPurchaseRecord {
  id: string; sku: string; mockedAt: number;
  plan: 'monthly' | 'annual' | 'hardship';      // hardship/pay-what-you-can present in the design
  priceShown: string;                           // display-only
}

// Feature gating map (free tier must genuinely work: full core loop, 1 child).
export const FEATURE_GATES = {
  multiChild:        { freeLimit: 1,  premium: 'unlimited' },
  rewardMenuSize:    { freeLimit: 6,  premium: 'unlimited' },
  companionThemes:   { freeLimit: 2,  premium: 'all' },        // tether DOCK_THEMES gating
  noveltyPipeline:   { free: false,   premium: true },         // v1 content rotation
  calmSoundscape:    { free: false,   premium: true },
  advancedInsights:  { free: false,   premium: true },
} as const;
```
- The gate is purely a **local flag check** in MVP; `isPremium` selector reads `Entitlement`. "Purchase" flips `tier`/`source` to a mock record. One-tap cancel and honest trial-end are part of the *designed* flow even though billing is stubbed.

---

## 13. Derived selectors (no extra stored state)

```ts
// Ledger / economy
availableBalance(cid)            = ledger.balance - ledger.heldTokens;
canAfford(cid, reward)           = availableBalance(cid) >= reward.costTokens;
pendingRedemptions(cid)          = redemptions.filter(r => r.status === 'requested');

// Tasks / routines (the kid's "today")
todaySteps(cid)                  = tasks where scheduled today && status==='todo' (tz-aware), ordered;
nextStep(run)                    = first step in run with status !== 'done';   // one-at-a-time loop
routineProgress(run)             = { done, total, fraction };                  // "3 of 5 — great job!"

// Reinforcement / celebration
reinforcementFor(cid, task)      = computeReinforcement(...) (§8) — preview without mutating;
celebrationLevelFor(cid, task)   = calmMode ? 'calm' : derived (§8);

// Progress (forgiving)
streakDisplay(cid)               = paused ? { mode:'resting', best:longestStreakDays }
                                          : { mode:'active', days:currentStreakDays };
cumulativeBubbles(cid)           = progress.cumulativeCount;                    // never decreases

// Companion
companionDisplay(cid)            = { mood, bondLevel, growthStage, art:variantFor(ageMode), equipped };

// Profiles / entitlement / reminders
activeChild()                    = childIndex.find(activeChildId);
canAddChild()                    = isPremium() || childIndex.filter(!archived).length < 1;
isPremium()                      = entitlement.tier==='premium'
                                   || (entitlement.trialEndsAt ?? 0) > now();
dueReminders(cid, nowTs)         = anchors matching now, inside maxPerDay budget, outside quietHours;
```

---

## 14. Seed / template data (starter library)

Seed packs are applied once (tracked in `tb/seedState`) and re-merged by `id` on migration so new built-ins appear without clobbering edits (tether `mergeBadges`/`mergeQuests` by id).

```ts
export interface SeedState {
  seedVersion: number;
  appliedPacks: string[];        // e.g. ['tasks.v1','routines.v1','rewards.v1','companions.v1']
  perChildSeeded: string[];      // child ids that received the starter routine
}
```

**Starter task templates** (`TaskTemplate` = `Omit<Task,'childId'|'routineId'|'order'|'status'|'createdAt'|'updatedAt'|'archived'> & { category; suggestedAgeModes; suggestedTokenValue }`). Each has `spokenLabel`, `emoji`, `color`, default `tokenValue=1`, `verification.mode='none'`:

| id | spokenLabel | emoji | category |
|---|---|---|---|
| `brush_teeth` | "Brush your teeth" | 🪥 | hygiene |
| `get_dressed` | "Get dressed" | 👕 | self-care |
| `wash_hands` | "Wash your hands" | 🧼 | hygiene |
| `make_bed` | "Make your bed" | 🛏️ | tidy |
| `pack_bag` | "Pack your school bag" | 🎒 | school |
| `put_on_shoes` | "Put on your shoes" | 👟 | self-care |
| `eat_breakfast` | "Eat breakfast" | 🥣 | meals |
| `tidy_toys` | "Tidy your toys" | 🧸 | tidy |
| `homework` | "Do your homework" | 📒 | school (older) |
| `water_drink` | "Have a drink of water" | 💧 | health |
| `feed_pet` | "Feed the pet" | 🐶 | chores |
| `bath_time` | "Bath time" | 🛁 | hygiene |
| `pajamas` | "Put on pajamas" | 🌙 | bedtime |
| `story_time` | "Read a story" | 📖 | bedtime |
| `calm_breaths` | "Take 3 calm breaths" | 🫧 | regulation |

**Starter routines** (compose templates; each step a `Task` with `routineId`+`order`):
- **Morning** 🌅: `wash_hands` → `get_dressed` → `eat_breakfast` → `brush_teeth` → `put_on_shoes` → `pack_bag`
- **After-School** 🏠: `wash_hands` → `water_drink` → `homework` (older) / `tidy_toys` (young) → `calm_breaths`
- **Bedtime** 🌙: `bath_time` → `pajamas` → `brush_teeth` → `tidy_toys` → `story_time`

**Starter reward menu** (`Reward`, `requiresParentApproval:true`, kid-bright icons):

| id | spokenLabel | category | costTokens | screenTimeMinutes |
|---|---|---|---|---|
| `screen_10` | "10 minutes of screen time" | screen_time | 10 | 10 |
| `screen_20` | "20 minutes of screen time" | screen_time | 18 | 20 |
| `pick_dinner` | "Choose what's for dinner" | choice | 25 | — |
| `extra_story` | "One extra bedtime story" | activity | 8 | — |
| `park_trip` | "A trip to the park" | outing | 40 | — |
| `small_treat` | "A small treat" | treat | 15 | — |
| `stay_up_15` | "Stay up 15 extra minutes" | privilege | 30 | — |
| `friend_playdate` | "A playdate with a friend" | outing | 50 | — |

**Starter companions** (`speciesId` set + free starter cosmetics): a `cuddly` bubble-buddy (default for `young`) and a `cool` bubble-buddy/avatar (default for `older`); 2 free color themes; remaining themes are premium-/token-gated (tether `DOCK_THEMES` retoned).

**Seed on first child creation:** create the 3 routines (active=false until parent confirms), copy reward menu, instantiate a companion with a placeholder name the child renames. Mark `perChildSeeded`.

---

## 15. Exactly what to port from momentum / tether (and what to leave)

**Port from tether (`GamificationService.ts` / `shared/types.ts`):**
- `awardPoints()` append-event + totals + history-cap → `TokenLedger.earn()` (§6).
- `unlockTheme()` affordability/spend check → §7 redemption spend (made refundable + parent-gated).
- `DOCK_THEMES` shape (`unlockCost`, `rarity`, `gradient`, `special`) → companion cosmetics + premium theme catalog.
- `mergeWithDefaults()` / `mergeBadges()` / `mergeQuests()` / `validateAndMigrate()` → §3 migration + repair.
- The local-JSON load/save lifecycle (`load()`: ensure dir → default-if-missing → parse → merge → validate) → `loadStore()` on AsyncStorage.
- **Defer:** `Badge`/`Quest`/`Achievement` engine (v1 novelty pipeline). **Drop:** `updateFocusStreaks` (SWE focus-minutes), all activity/LLM types.

**Port from momentum:**
- `streaks.ts` `calculateTaskStreak`/`updateTaskStreak` day-diff (`toZonedTime`+`startOfDay`+`differenceInDays`) → §10, **with the reset-to-1 replaced by freeze/pause**.
- `dailyRollover.ts` `TODAY→SOMEDAY` / `TOMORROW→TODAY` → §5 forgiving lifecycle (as an on-open/midnight reconciler; no cron/Prisma).
- `MoodSelector.tsx` + `Mood` enum → §11 mood log.
- `User` settings field set (`timeZone`, `quietHoursStart/End`, `notificationsEnabled`, `soundEnabled`, `hapticEnabled`, reminder times) → `ParentSettings`/`ChildSettings`. **Drop** auth/email/Prisma.

**Port from lockin:**
- AsyncStorage key-namespace + JSON pattern + `getAllKeys`/`multiRemove` reset → §2.
- `Milestone`/`Todo` ordered-step shape + `react-native-draggable-flatlist` → `Task`/`Routine` ordering. **Drop** `MilestoneStatus='FAILED'`, `impact`, `LockedGoal`.
- `services/notifications.ts` → §12 reminder engine (quiet-hours/budget gated).
- **Drop entirely:** shame sprite states, "ruthless advisor" AI prompts.

---

## 16. Open questions / risks

- **Multi-device sync is out of MVP scope** (offline-first, no backend). The model is sync-ready (per-child slices, `uuid` ids, monotonic aggregates, `updatedAt`) but a future CRDT/last-write-wins layer must reconcile the ledger by entry `id` (append-only helps).
- **Reinforcement "thinning" UX must be invisible to the child.** Fading bonuses/celebration is evidence-aligned, but if a child *notices* rewards shrinking it can read as loss. Recommend never surfacing phase to the child, keeping base token constant, and letting parents disable thinning (calm mode does).
- **Companion `mood` derivation** needs a small rules table (which positive event → which transient mood, decay timing) — out of scope here; the constraint (no negative state ever) is locked.
- **Energy scale split (3-level young vs 0-10 older)** means a child switching `ageMode` needs a mapping; store the raw value + scale at log time (`energy` is nullable, so safe).
- **Parent gate strength:** `math`/`pin` are MVP-simple but not hardened; biometric is best-effort via Expo. Real billing/COPPA-grade consent is deferred with the paywall mock.
- **Capping vs history:** 500-entry caps protect performance but lose old detail; lifetime aggregates are retained. If parents want full history/export, revisit with a rolling archive key.
