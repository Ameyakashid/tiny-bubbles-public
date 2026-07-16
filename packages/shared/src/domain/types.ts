/**
 * packages/shared/src/domain/types.ts — canonical domain types (the ONE home).
 *
 * M1.1 (w8): this file is the FIRST extraction from the shipped v1 kid app
 * (`apps/kid/src/domain/types.ts`, which now re-exports it — 01-current-and-
 * target §2B, 02-architecture §2.1). Both apps + `functions/` import these
 * types from `@tiny-bubbles/shared`; the v1 content moved VERBATIM (no
 * behavior change) and is extended ADDITIVELY with the w8 `neuroProfile` axis
 * (`NeuroProfile`/`NoveltyMode`/`FeedbackTempo`/`NeuroPreset` + the optional
 * `ChildProfile.neuroProfile?` field). Union-widening + one optional field →
 * NO SCHEMA_VERSION bump (stays 1, MIGRATIONS []).
 *
 * SCOPE NOTE: This file is the canonical home for shared domain types (doc 66
 * §2). M2 (theming/age-adaptive engine + celebration resolver) introduces the
 * *foundational* unions the theme layer depends on. M4 (data layer) EXTENDS
 * this file with the full forgiving data model (TaskStatus, ChildSettings,
 * Reward, ProgressState, stores, etc.) building on the unions defined here.
 *
 * The unions below are the SINGLE source of truth per the canonical
 * reconciliations in doc 66 §1b + 02-architecture §8 #20 (barrel ownership) —
 * do not redefine them elsewhere.
 */

/**
 * Age mode — a parent-set, per-child theming axis (~4-7 / ~8-10 / ~10-12).
 * doc 65 §1/§2 + aging-up §3.1. `preteen` is the additive ~10-12 identity tier
 * (mirrors `older`'s metrics/Tide palette with identity framing + an `avatar`
 * companion default). Existing persisted `young`/`older` values stay valid — the
 * widening needs no SCHEMA_VERSION bump. Components NEVER branch on this string
 * directly; it flows through resolveTokens / resolveCapabilities / resolveContent.
 */
export type AgeMode = "young" | "older" | "preteen";

/**
 * Sensory mode — the second orthogonal theming axis (doc 66 §1b.5). The
 * canonical name; the retired doc-60 `stimLevel`/`low` naming is NOT used.
 * `lowStim` composes with BOTH ages and is forced by OS Reduce-Motion.
 */
export type SensoryMode = "standard" | "lowStim";

/**
 * Companion style — an INDEPENDENT, parent-overridable axis (doc 66 §1b.6 +
 * aging-up §3.1). Default derived from ageMode (young -> cuddly, older -> cool,
 * preteen -> avatar) but a precocious older kid can keep `cuddly` and vice-versa.
 * `avatar` is the additive identity companion ("Nova") — still a NON-AI procedural
 * pet, just less childish art/framing. Drives `companionFraming` and the resolved
 * buddy art-variant key — the companion is NEVER selected by ageMode.
 */
export type CompanionStyle = "cuddly" | "cool" | "avatar";

/**
 * Canonical celebration magnitude enum (doc 66 §1b.3). ONE enum everywhere.
 * The retired `'max'|'satisfying'` (doc 65) and 2-value `'full'|'gentle'`
 * (doc 60) names are NOT used. Ordered largest -> smallest.
 */
export type CelebrationLevel = "full" | "medium" | "gentle" | "calm";

/**
 * Canonical companion-mood union (doc 66 §1b.7). The superset of every POSITIVE
 * /neutral/restful state across the docs; `content` is the canonical resting
 * default and IS a member. There is NO negative member (no sad/irate/sick/guilt)
 * — this is a hard anti-shame invariant (doc 66 §5.1). M4's `validateAndRepair`
 * coerces any out-of-set value to `content`.
 */
export type CompanionMood =
  | "content"
  | "happy"
  | "excited"
  | "sleepy"
  | "celebrating"
  | "curious"
  | "proud";

// ===========================================================================
// w8 (M1.1) — the neuroProfile axis (02-architecture §3, w8 §3.1).
// ===========================================================================

/**
 * neuroProfile — the third theming axis (joins ageMode + sensoryMode).
 * Parent-set, per-child. autism = predictable/low-stim default; adhd =
 * novelty/bright default; both = deterministic core + opt-in previewed
 * novelty. ABSENT ⇒ the NEUTRAL preset (v1 behaviour byte-identical —
 * 02-architecture §8 #13; `"both"` is only the RECOMMENDED new-child pick).
 * Union-widening + one optional field → NO SCHEMA_VERSION bump.
 * NEVER read raw in a component — it flows through `resolveNeuroPreset` →
 * `resolveCapabilities`/`resolveTokens`/`resolveContent` (the v1 golden rule,
 * enforced by the `neuro-golden-rule` gate).
 */
export type NeuroProfile = "adhd" | "autism" | "both";

/**
 * How the novelty layer behaves (quests / seasonal badges / rotating content).
 * `deterministic` = no surprise-appearing content; `previewed` = novelty is
 * opt-in + forewarned ("New this week — want to see?"); `lively` = on.
 */
export type NoveltyMode = "deterministic" | "previewed" | "lively";

/** Reinforcement/feedback pacing: steady-identical (`calm`) vs fast (`bright`). */
export type FeedbackTempo = "calm" | "bright";

/**
 * The resolved neuro preset — DEFAULTS ONLY (explicit ChildSettings always
 * win; precedence: explicit parent override > neuroProfile preset > ageMode
 * base, + OS Reduce-Motion always clamps — 02-architecture §3.2). Produced by
 * `resolveNeuroPreset` (theme/resolveNeuroPreset.ts) and merged into the
 * caps/tokens/content the feature surfaces already read.
 */
export interface NeuroPreset {
  noveltyMode: NoveltyMode;
  /**
   * Whether schedule/task steps may auto-advance. CANONICAL = `false` for
   * EVERY profile (02-architecture §8 #14: the anti-shame/no-yank safety rule
   * wins over the ADHD novelty preset) — the kid always taps "ready".
   */
  autoAdvanceSteps: boolean;
  /** advance-warning + priming before a transition (autism/both true) */
  transitionWarnings: boolean;
  /** default sensory mode when the parent has not set one (autism/both lowStim) */
  sensoryModeDefault: SensoryMode;
  /** celebration CEILING (dampens only, never punishes): autism gentle · adhd full · both medium */
  celebrationCeiling: CelebrationLevel;
  /** feedback pacing: adhd bright; autism/both calm */
  feedbackTempo: FeedbackTempo;
  /** no idioms/sarcasm; short predictable turns (autism/both true) */
  literalLanguage: boolean;
  /** novelty is opt-in + forewarned (both true) — never a surprise UI change */
  previewNovelty: boolean;
  /** default AAC/Bloop input surface (PII-free by construction for aac/chips) */
  neuroInputModeDefault: "aac" | "chips" | "freeText";
}

// ===========================================================================
// M4 — full forgiving data model (doc 62 + doc 66 §1b reconciliations).
//
// HARD INVARIANT (doc 66 §5): there is NO field anywhere in this model that can
// represent failure, loss, debt, decay, or guilt. Task lifecycle has no
// failure status; streaks cannot reach a broken/0 state; companion mood has no
// negative member; token entries are only `+earn` or an explicit `-spend`.
// ===========================================================================

/** Epoch milliseconds (matches the donor `timestamp: number`). */
export type EpochMs = number;
/** A calendar day `'YYYY-MM-DD'` computed in the child's timezone. */
export type IsoDay = string;

// ---------------------------------------------------------------------------
// Shared visual payload — every kid-facing entity carries this (doc 62 §5).
// A required `spokenLabel` means a non-reader can run the whole loop via TTS.
// ---------------------------------------------------------------------------

export interface VisualLabel {
  /** optional; hidden/secondary in `young`, primary in `older` */
  text?: string;
  /** REQUIRED — the TTS string ("Brush your teeth") */
  spokenLabel: string;
  /** from rn-emoji-keyboard */
  emoji?: string;
  /** icon name from our set (fallback when no picture) */
  icon?: string;
  /** hex; from reanimated-color-picker */
  color: string;
  /** optional local image (e.g. a photo of the child's own toothbrush) */
  pictureUri?: string;
}

// ---------------------------------------------------------------------------
// Tasks, routine steps, routines (doc 62 §5). A `Task` with `routineId === null`
// is a standalone task; with `routineId` + `order` it is a routine step.
// ---------------------------------------------------------------------------

export type VerificationMode = "none" | "self" | "photo" | "parent";

export interface Verification {
  /** default 'none' — light, optional, anti-burden */
  mode: VerificationMode;
  /**
   * RETAINED FOR DATA COMPATIBILITY ONLY — the kid runner IGNORES this flag
   * (verify-undo §3.1/§6.1). Verification is NEVER a gate: completion + the token
   * payout are immediate on Done regardless of `mode`/`required`, and this field
   * is never surfaced in the parent UI. Left on the shape so old blobs stay valid.
   */
  required: boolean;
  /** on-device only `file://` (verify-undo §2.1) — never uploaded, never analyzed */
  photoUri?: string;
  verifiedBy?: "child" | "parent";
  verifiedAt?: EpochMs;
}

/** The only task statuses. There is NO failure status — by design (doc 62 §5). */
export type TaskStatus = "todo" | "done" | "skipped";

/** momentum TaskDeadline + `anytime`. Rollover is forgiving (today -> someday). */
export type TaskDeadline = "today" | "tomorrow" | "someday" | "anytime";

export interface TaskSchedule {
  /** 0-6 (empty => every day) */
  daysOfWeek: number[];
  /** 'HH:mm' local; optional point-of-performance anchor */
  timeOfDay?: string;
  /** 'YYYY-MM-DD' for a single-day assignment */
  oneOff?: IsoDay;
}

export interface Task {
  id: string;
  childId: string;
  /** provenance if created from the starter library */
  templateId: string | null;
  /** null => standalone task; set => routine step */
  routineId: string | null;
  /** position within a routine (draggable) */
  order: number;
  label: VisualLabel;
  verification: Verification;
  /** BASE immediate payout on completion — ALWAYS paid, never thinned to 0 */
  tokenValue: number;
  /** optional visual transition timer (feature #14) */
  timerSeconds?: number;
  deadline: TaskDeadline;
  schedule: TaskSchedule;
  status: TaskStatus;
  lastCompletedAt?: EpochMs;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  archived: boolean;
  /**
   * Child-PROPOSED task awaiting parent approval (doc 66 §M9 / §age fix #24).
   * Absent or `false` => a normal, parent-owned task. A proposed task is held in
   * the parent's approval queue and is NEVER shown in the kid loop until a parent
   * approves it (which clears this flag). Approval/dismissal is parent-gated.
   */
  proposed?: boolean;
  /**
   * Provenance: set when this task was MATERIALISED from a rotating `SharedChore`
   * (multi-child §3.1). Absent for normal parent/seed tasks. Used for idempotent
   * re-materialisation and to advance a `perCompletion` rotation on completion.
   * Combined with `choreHolderDay` it uniquely identifies one holder-day instance.
   * A materialised chore Task is otherwise a NORMAL task — it earns tokens, fires
   * the same celebration, and rolls forward forgivingly (no schema bump — additive).
   */
  choreId?: string;
  /** the local 'YYYY-MM-DD' this chore instance was assigned for (idempotency key) */
  choreHolderDay?: IsoDay;
}

// ---------------------------------------------------------------------------
// Rotating / assignable shared chores (multi-child §3.2). A PARENT-GLOBAL entity
// (spans children) — it lives in choreStore (`tb/chores`), NOT a per-child slice.
// The rotation is pure, offline date math (src/domain/chores.ts); each assignment
// materialises as a normal per-child Task carrying `choreId` (no AI, no schema bump).
// ---------------------------------------------------------------------------

/** How a rotating chore advances its holder. All are deterministic + offline. */
export type RotationCadence = "daily" | "weekly" | "perCompletion" | "manual";

/**
 * A parent-authored chore that rotates across a roster of children (feature #15).
 * PARENT-GLOBAL scope (spans children). Length-`>= 2` roster to be an active
 * rotation ("a rotation of one is not a rotation"). Anti-shame: rotation is
 * "whose turn," never punishment — there is no failure/streak-loss field here.
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

export type RoutineMode = "gamified" | "calm";

/**
 * A part of the local day. `night` exists so a late-evening open never falls
 * back to `morning`; for routine SELECTION it resolves against the same list as
 * `evening` (there is no separate night routine) — it only changes the
 * "see you tomorrow morning" copy. See `src/domain/dates.ts#getDaypart`.
 */
export type Daypart = "morning" | "afternoon" | "evening" | "night";

/**
 * Local-hour boundaries `[start, end)` per daypart (parent-tunable later). A
 * daypart owns hours `>= its start` up to the next daypart's start; `night`
 * wraps past midnight until `morning`. Defaults live in
 * `DEFAULT_DAYPART_WINDOWS`.
 */
export interface DaypartWindows {
  morning: number; // default 5
  afternoon: number; // default 12
  evening: number; // default 17
  night: number; // default 21 (>= this hour, wrapping until `morning`)
}

export interface Routine {
  id: string;
  childId: string;
  /** routine has its own icon/color/spokenLabel ("Morning routine") */
  label: VisualLabel;
  /** ordered Task ids where routineId === this.id (source of truth for order) */
  stepIds: string[];
  schedule: TaskSchedule;
  /**
   * Which daypart this routine belongs to (time-driven kid flow). Optional so
   * pre-existing persisted routines stay valid without migration; selection
   * falls back to `daypartFromSchedule(schedule.timeOfDay)` when absent.
   */
  daypart?: Daypart;
  /** calm inherits ChildSettings.calmMode by default */
  mode: RoutineMode;
  active: boolean;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

/** Runtime record of an attempt — feeds ledger + progress (capped list). */
export interface RoutineRun {
  id: string;
  childId: string;
  /** null for a standalone task run */
  routineId: string | null;
  startedAt: EpochMs;
  completedAt?: EpochMs;
  steps: StepResult[];
  /** sum of immediate payouts this run */
  tokensAwarded: number;
  /** true if every step done (NOT required for reward — partial is celebrated) */
  allDone: boolean;
}

export interface StepResult {
  taskId: string;
  /** skipping is free and never penalized */
  status: "done" | "skipped";
  completedAt?: EpochMs;
  /** base + reinforcement extras at the moment of the tap */
  tokensAwarded: number;
  celebrationShown: CelebrationLevel;
}

/**
 * Persisted active-run pointer for resume-after-kill (doc 66 M4 completeness
 * fix). When the app is killed mid-routine, reopening reconstructs the next
 * incomplete step from this. `null` when no run is in progress.
 */
export interface ActiveRunProgress {
  childId: string;
  routineId: string | null;
  /** ordered task ids of the run */
  stepIds: string[];
  /** task ids already resolved (done or skipped) this run */
  completedStepIds: string[];
  startedAt: EpochMs;
  updatedAt: EpochMs;
  /**
   * Wall-clock ms when the CURRENT active step's visual-transition timer started
   * (visual-timers §3.2). Optional + presentational: absence just restarts the
   * step's timer visual on resume (no data loss, no shame). Set when a timed step
   * becomes active; cleared/replaced when the active step advances. NEVER affects
   * tokens or completion. Additive/optional → no SCHEMA_VERSION bump.
   */
  stepTimerStartedAt?: EpochMs;
}

// ---------------------------------------------------------------------------
// Token ledger (immediate payout) — doc 62 §6. Append-event + totals + cap.
// ---------------------------------------------------------------------------

export type TokenReason =
  | "task_complete"
  | "routine_complete"
  | "streak_bonus"
  | "cadence_bonus" // the deterministic every-N bonus (doc 66 §1b.4)
  | "quest_reward" // deterministic quest completion + spotlight-daypart bonus (novelty-refresh §3.1)
  | "redeem"
  | "redeem_refund"
  | "parent_gift"
  | "undo"
  | "seed"
  | "adjustment";

export interface TokenEntry {
  id: string;
  ts: EpochMs;
  /** +earn or -spend (spend only via redeem/adjustment/undo) */
  delta: number;
  reason: TokenReason;
  /** taskId | routineId | redemptionId */
  refId?: string;
  /** the task's base tokenValue (audit of thinning) */
  baseValue?: number;
  /** reinforcement multiplier applied (audit) */
  multiplier?: number;
  /** kid-friendly text, e.g. "Brushed teeth!" */
  note?: string;
}

export interface TokenLedger {
  childId: string;
  /** spendable now (>= 0 always) */
  balance: number;
  /** reserved by pending redemption requests (escrow) */
  heldTokens: number;
  /** monotonic up */
  lifetimeEarned: number;
  /** monotonic up */
  lifetimeSpent: number;
  lastEarnedAt: EpochMs;
  /** capped to the most recent N (doc 62 §2) */
  entries: TokenEntry[];
}

// ---------------------------------------------------------------------------
// Reinforcement-density schedule (the thinning algorithm) — doc 62 §8.
// Only the BONUS-token cadence thins; the base token + a salience-appropriate
// celebration are never reduced (doc 66 §1b.3/§1b.4).
// ---------------------------------------------------------------------------

export type ReinforcementPhase = "dense" | "thinning" | "maintenance";

export interface ReinforcementConfig {
  /** default 7 (young: 10) */
  denseUntilCompletions: number;
  /** default 21 (young: 28) */
  thinningUntilCompletions: number;
  /** default 1 — extra on top of task.tokenValue when a bonus fires */
  baseBonusTokens: number;
  /** default 1 — every completion gets the bonus in the dense phase */
  bonusEveryN_dense: number;
  /** default 3 */
  bonusEveryN_thinning: number;
  /** default 7 */
  bonusEveryN_maintenance: number;
  /** default 5 — a lapse steps the curve back toward dense, NEVER punishes */
  reWarmAfterIdleDays: number;
}

export interface HabitReinforcement {
  /** habitKey = routineId ?? `task:${taskId}` */
  habitKey: string;
  /** lifetime, monotonic */
  completions: number;
  /** counter for the every-N gate */
  sinceLastBonus: number;
  lastCompletedAt: EpochMs;
}

export interface ReinforcementState {
  childId: string;
  habits: Record<string, HabitReinforcement>;
}

/** The (non-mutating) preview/result of `computeReinforcement` (doc 62 §8). */
export interface ReinforcementResult {
  bonusTokens: number;
  multiplier: number;
  phase: ReinforcementPhase;
  /** true when this completion fires the deterministic every-N bonus */
  bonus: boolean;
  /** the updated per-habit counters to persist */
  habit: HabitReinforcement;
}

// ---------------------------------------------------------------------------
// Companion state (never-punishing) — doc 62 §9.
// ---------------------------------------------------------------------------

export interface CompanionCustomization {
  baseColor: string;
  accentColor: string;
  /** capped, curated set (autonomy without overload) */
  accessories: string[];
  /**
   * Optional surface treatment for the bubble body (doc 61 §6.2) — one of the
   * BubbleBuddy `BuddyFinish` keys ("plain" | "sparkle" | "glass" | "galaxy").
   * Optional + additive so existing persisted companions (which omit it) merge
   * cleanly; absence renders the default "plain" finish.
   */
  finish?: string;
}

export interface CompanionState {
  childId: string;
  /** which buddy art set; resolved via companionStyle, NEVER ageMode */
  speciesId: string;
  /** child-named (autonomy) */
  name: string;
  /** derived from recent positive events; defaults 'content' */
  mood: CompanionMood;
  /** when the current mood was set (drives decay back to content) */
  moodSince: EpochMs;
  /** monotonic non-decreasing (replaces tether 'level') */
  bondLevel: number;
  /** 0..n cosmetic growth; only ever advances */
  growthStage: number;
  lastInteractionAt: EpochMs;
  customization: CompanionCustomization;
  /** ids of owned cosmetics (kept forever — doc 66 §1b.11) */
  unlockedItems: string[];
  equipped: { outfitId?: string; hatId?: string; backgroundId?: string };
}

// ---------------------------------------------------------------------------
// Forgiving streak / cumulative progress — doc 62 §10.
// ---------------------------------------------------------------------------

export interface ProgressState {
  childId: string;
  /** total steps/tasks ever completed — monotonic, NEVER decreases */
  cumulativeCount: number;
  /** consecutive active days (forgiving) */
  currentStreakDays: number;
  /** best ever (only ever increases) */
  longestStreakDays: number;
  /** 'YYYY-MM-DD' in child tz */
  lastActiveDate: IsoDay | null;
  /** grace days available (auto-earned; consumed before a streak pauses) */
  freezeTokens: number;
  /** audit of grace days applied */
  freezeUsedDates: IsoDay[];
  /** rolling count for "look how many bubbles you popped" */
  weekCompletions: number;
  /** streak is RESTING (not broken); display "best: N", invite restart */
  paused: boolean;
  /** older save-toward-a-reward goal bar (doc 66 §age fix #24) */
  savingTowardRewardId?: string | null;
}

export interface ProgressConfig {
  /** default 2 (young), 1 (older); auto-replenished weekly */
  freezeTokensMax: number;
  /** default 1 */
  freezeReplenishPerWeek: number;
}

// ---------------------------------------------------------------------------
// Mood / energy logs — doc 62 §11 (opt-in, on-device-only, doc 66 §1b.12).
// ---------------------------------------------------------------------------

export type Mood = "rough" | "okay" | "good" | "great";

export interface MoodLog {
  id: string;
  childId: string;
  ts: EpochMs;
  day: IsoDay;
  mood?: Mood;
  /** young: 1-3 (low/ok/high); older: 1-5 (see `energyScaleMax`) */
  energy?: number;
  note?: string;
  /** legacy tag, kept for back-compat; NOT written by the check-in UI (superseded
   *  by `daypart` below). */
  context?: "morning" | "after_school" | "bedtime" | "adhoc";
  // --- ADDITIVE (mood-checkin §3), all OPTIONAL → no SCHEMA_VERSION bump --------
  /**
   * Daypart at log time (aligns with the daypart engine — cleaner grouping than the
   * legacy `context`). Insight selectors read this, falling back to deriving it from
   * `ts` when a legacy log omits it.
   */
  daypart?: Daypart;
  /**
   * The energy scale used at log time (3 young / 5 older) so a parent-insight
   * average normalizes across an ageMode switch. Absent on legacy logs.
   */
  energyScaleMax?: number;
  /**
   * Who logged it (default `"kid"`; a parent-logged entry is reserved for later).
   * Absent ⇒ treat as `"kid"`.
   */
  source?: "kid" | "parent";
}

/** Local-only analytics event (opt-IN, default off, never leaves device). */
export interface ActivityEvent {
  id: string;
  childId: string;
  ts: EpochMs;
  type: string;
  payload?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Reward catalog + redemption (caregiver-set, real-world) — doc 62 §7.
// ---------------------------------------------------------------------------

export type RewardCategory =
  | "screen_time"
  | "treat"
  | "activity"
  | "outing"
  | "privilege"
  | "choice"
  | "custom";

export interface Reward {
  id: string;
  childId: string;
  label: VisualLabel;
  category: RewardCategory;
  costTokens: number;
  /** when category === 'screen_time' */
  screenTimeMinutes?: number;
  active: boolean;
  /** default true; auto-approve possible under a per-child threshold */
  requiresParentApproval: boolean;
  /** optional guardrail (not a punishment; just availability) */
  limitPerWeek?: number;
  cooldownHours?: number;
  /** soft-removed from the parent library (also flips `active` off). Absent => live. */
  archived?: boolean;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export type RedemptionStatus =
  | "requested"
  | "approved"
  | "fulfilled"
  | "declined"
  | "expired"
  | "canceled"
  /**
   * An approved/auto-approved/fulfilled redemption UNDONE (refunded) — verify-undo
   * §2.5/§3.1. `reversed` is terminal and does NOT count as a grant for guardrails
   * (`isRewardAvailable.isGrant` counts only approved/fulfilled), so availability
   * correctly recovers. Additive union widening → no SCHEMA_VERSION bump.
   */
  | "reversed";

export interface RedemptionRequest {
  id: string;
  childId: string;
  rewardId: string;
  /** snapshot of cost at request time */
  costTokens: number;
  status: RedemptionStatus;
  requestedAt: EpochMs;
  decidedAt?: EpochMs;
  fulfilledAt?: EpochMs;
  decidedBy?: "parent";
  /** gentle, e.g. "Let's save up a little more!" — NEVER shaming */
  declineReasonKidSafe?: string;
}

// ---------------------------------------------------------------------------
// Child profiles, settings, age mode — doc 62 §4 + reconciliations §1b.5/6.
// ---------------------------------------------------------------------------

export interface ReminderAnchor {
  id: string;
  routineId?: string;
  /** 'HH:mm' local */
  time: string;
  daysOfWeek: number[];
  /** e.g. "Time for the bedtime bubbles" */
  spokenLabel: string;
}

export interface ReminderConfig {
  enabled: boolean;
  /** budget — anti-notification-flood (default 2-3) */
  maxPerDay: number;
  anchors: ReminderAnchor[];
  /** documentation-only; real tone control is the reviewed copy set (§1b.14) */
  toneIsGentle: true;
}

export interface ChildAutonomy {
  /** child may propose tasks into a parent-approved queue (§age fix #24) */
  canAddTasks: boolean;
  canReorderSteps: boolean;
  /** child may *request* a reward; parent approves (doc 62 §7) */
  canPickReward: boolean;
  canCustomizeCompanion: boolean;
}

export interface ChildSettings {
  /** non-gamified path: hides tokens/celebration intensity, keeps routine + audio */
  calmMode: boolean;
  /** ceiling preference; the canonical sizing lives in resolveCelebration */
  celebrationIntensity: CelebrationLevel;
  /** second orthogonal theming axis (doc 66 §1b.5) */
  sensoryMode: SensoryMode;
  /** independent override; default from ageMode (doc 66 §1b.6) */
  companionStyle: CompanionStyle;
  /** independent override of text-primary; default from ageMode (doc 66 §1b.6) */
  textFirst: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  /** TTS; default true, MANDATORY-on for `young` */
  spokenLabelsEnabled: boolean;
  autonomy: ChildAutonomy;
  reinforcement: ReinforcementConfig;
  reminders: ReminderConfig;
  /** 0 = always require parent approval */
  autoApproveRedeemUnderTokens: number;
  /**
   * Per-child mood-check-in consent (mood-checkin §2.0/§3). The parent-GLOBAL
   * `parentSettings.moodLoggingEnabled` is the master switch; this optional flag
   * lets a parent turn mood check-ins OFF for ONE child without affecting siblings.
   * Absent ⇒ `true`, so the global switch behaves exactly as before until used
   * (the resolved `moodCheckin` grant ANDs the two — §4.1). Additive/optional →
   * no SCHEMA_VERSION bump.
   */
  moodCheckinEnabled?: boolean;
  /**
   * Optional per-child soundscape preferences (feature `soundscapes`, M-C1).
   * Absence resolves to `DEFAULT_SOUNDSCAPE_SETTINGS` via
   * `resolveSoundscapeSettings` (src/domain/soundscapes.ts). Additive/optional →
   * merges through mergeWithDefaults / validateAndRepair with NO SCHEMA_VERSION
   * bump (same pattern as `moodCheckinEnabled?`).
   */
  soundscape?: SoundscapeSettings;
  /**
   * The child's chosen breathing pattern id (breathing-regulation feature, M-C2).
   * Optional + additive: absent ⇒ the age-resolved default
   * (`defaultBreathPatternId(ageMode)`). A precocious/older kid can pick a
   * different curated pattern; young kids get the single default and no chooser.
   * An unknown/removed id falls back to the age default (never throws). Additive/
   * optional → merges through mergeWithDefaults / validateAndRepair with NO
   * SCHEMA_VERSION bump.
   */
  breathingPatternId?: string;
  /**
   * Opt-in soft haptic pulse at each breath phase change (breathing-regulation
   * §2.8). DEFAULT false. Gated by `hapticsEnabled` too; never a Warning/Error
   * haptic; off in lowStim / quiet hours. Additive/optional → no bump.
   */
  breathingPacingHaptics?: boolean;
  /**
   * Optional adjustable focus/break scaffold (feature #22, `focus-intervals`,
   * M-C3). Optional + additive so pre-existing persisted profiles stay valid with
   * NO migration; absence ⇒ the feature is off and the UI/domain falls back to
   * `DEFAULT_FOCUS_INTERVALS`. Older-mode-only is enforced by the
   * `focusIntervalsAvailable` CAPABILITY (a hard age ceiling), NOT this field —
   * `enabled` is the PARENT opt-in on top of that ceiling. Merges through
   * mergeWithDefaults / validateAndRepair with NO SCHEMA_VERSION bump.
   */
  focusIntervals?: FocusIntervalConfig;
  /**
   * Show the rotating novelty QUEST board + the spotlight-daypart bonus + the
   * "new!" seasonal badges for this child (novelty-refresh §2.6/§3.3). Optional +
   * additive: ABSENT ⇒ `!calmMode` (default ON unless the calm/non-gamified path
   * is on). `false` suppresses the ENTIRE novelty layer for this child exactly like
   * calm mode does — a calm path child gets the plain routine + owned cosmetics.
   * Merges through mergeWithDefaults / validateAndRepair with NO SCHEMA_VERSION bump.
   */
  questsEnabled?: boolean;
  // --- ADDITIVE (w1 M1.2, cloud sync + Bloop controls — 02-arch §2.4, w1
  // §3.3a). ALL optional so pre-existing persisted profiles stay valid with NO
  // SCHEMA_VERSION bump; every absent-default keeps the network + LLM OFF. ----
  /**
   * Chat/LLM master switch, parent-authoritative (pulled DOWN from
   * `settings.controls.bloopEnabled`; canonical name §8 #15). ABSENT ⇒ false —
   * the LLM is OFF by default and never a dependency of the child core.
   */
  bloopEnabled?: boolean;
  /** canonical InputMode union values (§8 #19); absent ⇒ "chips" (PII-free) */
  bloopInputMode?: "aac" | "chips" | "freeText" | "voice";
  /** allow-list of canonical TopicCategory ids (§8 #3); absent ⇒ none */
  bloopTopicScope?: string[];
  /** absent ⇒ server defaults; parent-authoritative */
  bloopLimits?: { perMinute: number; perDay: number; sessionMinutes: number };
  /**
   * Cloud retention window mirror (§8 #10b): 30 (default, COPPA-min) or 90.
   * ABSENT ⇒ the parent default (30).
   */
  retentionDays?: 30 | 90;
  /** BCP-47 crisis-resource locale (§8 #16); absent ⇒ device locale → nearest supported */
  crisisLocale?: string;
  /**
   * The additive offline→cloud sync master switch (02-arch §2.4). ABSENT ⇒
   * false: no egress, no outbox growth — deleting Firebase leaves the child
   * core byte-identical (the Moxie invariant). Never bricks the core.
   */
  cloudSyncEnabled?: boolean;
  /**
   * The cloud childId this local child is linked to (set by
   * `pairKidDevice(code, localCid)` — §8 #21c). Absent ⇒ unlinked/offline.
   */
  firestoreChildId?: string;
}

// ---------------------------------------------------------------------------
// Adjustable focus intervals + active breaks (feature #22, `focus-intervals`,
// M-C3) — an OPTIONAL, NON-rigid, older-only Pomodoro-style scaffold. NOT a
// treatment, NOT "ADHD-proven": an organizational tool only (fact-check
// `pomodoro-timeboxing`). Zero AI: curated durations + a fixed movement-prompt
// list chosen by a deterministic rotating index (no `Math.random`).
// ---------------------------------------------------------------------------

/**
 * Per-child focus-interval config (persisted, optional). NON-rigid: user-adjustable
 * focus AND break length; default 15/5 (never the fatiguing rigid 25/5).
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

/** The four phases of a live focus session. `setup` is the pre-start (no live session) state. */
export type FocusPhase = "setup" | "focus" | "break" | "done";

/** One curated active-movement prompt (fixed list; non-reader-friendly spoken label). */
export interface MovementPrompt {
  id: string;
  /** REQUIRED TTS/label string, e.g. "Do 5 star jumps" */
  spokenLabel: string;
  emoji: string;
}

/**
 * Live focus-session runtime (held in the IN-MEMORY focusSessionStore, NOT persisted
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

// ---------------------------------------------------------------------------
// Soundscapes (feature `soundscapes`, M-C1) — an OPTIONAL looping ambient bed.
// A NON-persisted curated catalog (`Soundscape`) + a persisted per-child prefs
// shape (`SoundscapeSettings`). Zero AI: a fixed hand-authored list, never a
// "recommended" scene. Mix-not-hijack playback lives in src/services/soundscape.ts.
// ---------------------------------------------------------------------------

/** A soundscape scene id from the catalog (src/data/soundscapes.ts). */
export type SoundscapeId = string;

/** Suggested context for a scene; ANY scene is selectable in either context. */
export type SoundscapeKind = "calm" | "focus";

/** A curated soundscape scene (catalog data — not persisted). */
export interface Soundscape {
  id: SoundscapeId;
  /** spokenLabel (required, non-reader support) + emoji + color */
  label: VisualLabel;
  kind: SoundscapeKind;
  /** premium ACQUISITION gate (calmSoundscape). Free scenes: `premium=false`. */
  premium: boolean;
  /** key into the sound service's SOUNDSCAPE_ASSET require() map. */
  assetKey: string;
}

/** Per-child soundscape preferences (persisted in the child profile settings). */
export interface SoundscapeSettings {
  /** bed volume 0..1 (FULL control) applied to the looping player. Default 0.55. */
  volume: number;
  /** selected calm-corner scene id (must be owned/free). Default 'waves' (free). */
  calmSceneId: SoundscapeId;
  /** selected during-routine focus scene id, or null = none chosen. Default null. */
  focusSceneId: SoundscapeId | null;
  /** play the focus scene automatically while a routine runs. Default false. */
  focusDuringTasks: boolean;
}

export interface ChildProfile {
  id: string;
  /** first name / nickname only (no PII beyond this) */
  displayName: string;
  ageMode: AgeMode;
  /**
   * w8 (M1.1): the third theming axis. OPTIONAL + additive — ABSENT ⇒ the
   * NEUTRAL preset (existing v1 children render byte-identically; §8 #13).
   * Parent-set at add-child (recommended pick: `"both"`); flows ONLY through
   * `resolveNeuroPreset` → the resolvers (never read raw in a component).
   * No SCHEMA_VERSION bump.
   */
  neuroProfile?: NeuroProfile;
  /** optional 'YYYY-MM' to suggest ageMode; never required */
  birthMonth?: string;
  avatarColor: string;
  /** IANA, e.g. 'America/Mexico_City' */
  timeZone: string;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  archived: boolean;
  settings: ChildSettings;
}

export interface ChildIndexEntry {
  id: string;
  displayName: string;
  ageMode: AgeMode;
  avatarColor: string;
  createdAt: EpochMs;
  /** soft-hide, never hard-delete from UI without the parent gate */
  archived: boolean;
}

// ---------------------------------------------------------------------------
// Parent settings, entitlement (paywall) — doc 62 §12 + §1b.12/13.
// ---------------------------------------------------------------------------

export type ParentGateMode = "math" | "pin" | "biometric" | "longpress" | "none";

export interface ParentGateConfig {
  mode: ParentGateMode;
  /** never store the PIN in cleartext */
  pinHash?: string;
}

export interface ParentSettings {
  parentGate: ParentGateConfig;
  notificationsEnabled: boolean;
  /** global default; per-child `soundEnabled` can override */
  soundEnabled: boolean;
  hapticEnabled: boolean;
  reducedMotionDefault: boolean;
  /** calm canvas global toggle */
  lowStimTheme: boolean;
  /** 'HH:mm' */
  quietHours: { start: string; end: string };
  /** DEFAULT false — explicit opt-IN, on-device-only (doc 66 §1b.12) */
  localAnalyticsEnabled: boolean;
  /** DEFAULT false — opt-in, never required (doc 66 §1b.12) */
  moodLoggingEnabled: boolean;
  /**
   * DEFAULT false — the OpenDyslexic body-face accessibility preference (doc 61
   * §3.1). Persisted from the M9 settings row; the app-wide font swap activates
   * once the locally-bundled OpenDyslexic binaries ship (see src/theme/fonts.ts).
   */
  openDyslexicFont: boolean;
  /**
   * DEFAULT false — the optional soft one-shot chime when a step's visual-transition
   * timer reaches empty (visual-timers §2.7/§4 #14). Off by default; when on, the
   * `timer.done` cue fires ONCE through the existing ducking audio session — it
   * lowers, never stops, other media, and NEVER loops or nags. Optional so old
   * blobs load (mergeWithDefaults backfills `false`); no schema bump (additive).
   */
  timerSoundEnabled?: boolean;
  /**
   * App language (accessibility-i18n §3.1). Ships `'en'`; other codes select a
   * translated catalog when present, else fall back to English at runtime.
   * Optional so old blobs load (mergeWithDefaults backfills `'en'`); default
   * `'en'`. NO schema bump — additive-only (`SCHEMA_VERSION` stays 1).
   */
  locale?: string;
  /**
   * DEFAULT false — surface an UNGATED kid-facing child switcher on the done panel
   * (multi-child §2.1/§3.4). Because switching changes whose tokens are spendable,
   * the default keeps switching behind the grown-ups gate; a parent on a trusted
   * single-family device can opt in to the ungated kid picker. Seeded into
   * `defaultParentSettings` so `mergeWithDefaults` backfills existing installs.
   * Additive → no `SCHEMA_VERSION` bump.
   */
  quickChildSwitch: boolean;
  /**
   * Epoch ms of the last successful local backup export (clinician-reporting §3.1,
   * M-D1). Optional + additive: absent on all pre-existing persisted settings and
   * filled by `mergeWithDefaults`, so NO schema bump / migration is required.
   * Display-only ("last backed up …"); never gates anything.
   */
  lastBackupAt?: EpochMs;
  updatedAt: EpochMs;
}

export type Tier = "free" | "premium";

export interface MockPurchaseRecord {
  id: string;
  sku: string;
  mockedAt: EpochMs;
  plan: "monthly" | "annual" | "hardship";
  /** display-only */
  priceShown: string;
}

export interface Entitlement {
  tier: Tier;
  source: "none" | "trial" | "mock_purchase";
  trialStartedAt?: EpochMs;
  /** 7-day trial (honest, surfaced) */
  trialEndsAt?: EpochMs;
  premiumSince?: EpochMs;
  /** stub records; NO RevenueCat/StoreKit in MVP */
  mockPurchases: MockPurchaseRecord[];
  /**
   * The local ms we scheduled the honest trial-end reminder FOR (idempotency +
   * debug). Absent when no trial / already reminded / not yet scheduled. Optional
   * so old persisted blobs stay valid; never affects gating or `isPremium()`
   * (billing-entitlements §3.1).
   */
  trialEndReminderAt?: EpochMs;
  updatedAt: EpochMs;
}

// ---------------------------------------------------------------------------
// App meta + onboarding — doc 62 §3.
// ---------------------------------------------------------------------------

export type OnboardingStep =
  | "welcome"
  | "parent_gate_setup"
  | "child_setup"
  | "done";

export interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  /** COPPA-style local acknowledgement timestamp */
  privacyConsentAckAt: EpochMs | null;
  parentGateConfigured: boolean;
  firstChildCreated: boolean;
  /** we MUST surface the non-gamified path once */
  calmModeOffered: boolean;
}

export interface AppMeta {
  schemaVersion: number;
  /** anonymous, local only */
  installId: string;
  createdAt: EpochMs;
  lastOpenedAt: EpochMs;
  /** who the kid UI is currently showing */
  activeChildId: string | null;
  onboarding: OnboardingState;
  /**
   * Epoch ms the `RootErrorBoundary` last recovered from a caught render error
   * (local diagnostics only, production-readiness §3.2). Optional so old blobs
   * load unchanged (`mergeWithDefaults` leaves it absent); on-device-only, never
   * uploaded; NO schema bump (`SCHEMA_VERSION` stays 1 — additive-only).
   */
  lastRecoveredAt?: EpochMs;
}

// ---------------------------------------------------------------------------
// Seed / template data — doc 62 §14. Cosmetics carry rarity + a seasonal-pack
// shape + a seed hook (the additive-only novelty seam, doc 66 §5/§M4).
// ---------------------------------------------------------------------------

export interface SeedState {
  seedVersion: number;
  /** e.g. ['tasks.v1','routines.v1','rewards.v1','companions.v1'] */
  appliedPacks: string[];
  /** child ids that received the starter routine */
  perChildSeeded: string[];
}

export type TaskCategory =
  | "hygiene"
  | "self-care"
  | "tidy"
  | "school"
  | "meals"
  | "health"
  | "chores"
  | "bedtime"
  | "regulation";

/**
 * Reusable starter-library entry (doc 62 §14). A `TaskTemplate` is everything a
 * `Task` needs minus the per-instance/runtime fields, plus library metadata.
 */
export type TaskTemplate = Omit<
  Task,
  | "childId"
  | "routineId"
  | "order"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "archived"
  | "lastCompletedAt"
  | "templateId"
  | "tokenValue"
> & {
  category: TaskCategory;
  suggestedAgeModes: AgeMode[];
  suggestedTokenValue: number;
};

/** A routine made of template ids in order (doc 62 §14). */
export interface RoutineTemplate {
  id: string;
  label: VisualLabel;
  /** ordered template ids; `young`/`older` variants pick branch steps */
  stepTemplateIds: string[];
  schedule: TaskSchedule;
  /** the daypart this preset seeds into (single source of truth for grouping) */
  daypart?: Daypart;
  /** template ids only included for a given age mode (e.g. homework -> older) */
  ageOnly?: Partial<Record<string, AgeMode>>;
}

export type Rarity = "common" | "uncommon" | "rare" | "epic";

export type CosmeticSlot =
  | "color"
  | "outfit"
  | "hat"
  | "background"
  | "accessory"
  | "finish";

/**
 * A companion cosmetic (doc 62 §9/§14, retoned from tether DOCK_THEMES). Carries
 * `rarity` and an optional `seasonalPackId` so the novelty pipeline can rotate
 * ADDITIVE content (nothing earnable ever disappears — doc 66 §5.11).
 */
export interface Cosmetic {
  id: string;
  slot: CosmeticSlot;
  label: VisualLabel;
  rarity: Rarity;
  /** token cost to unlock; 0 = free/seeded */
  unlockCost: number;
  /** premium-gated ACQUISITION only (never retention — doc 66 §1b.11) */
  premium: boolean;
  /** which seasonal pack this belongs to (undefined = base pack) */
  seasonalPackId?: string;
  /** hex/gradient payload for rendering */
  value?: string;
}

/**
 * An additive-only content pack (the novelty-rotation seam, doc 66 §5/§M4). A
 * seed hook can register new packs over time; nothing is ever removed/expired.
 */
export interface SeasonalPack {
  id: string;
  label: VisualLabel;
  /** when the pack becomes visible; never an expiry (additive-only) */
  availableFrom?: EpochMs;
  cosmeticIds: string[];
}

/** Starter companion definition (doc 62 §14): 2 species (cuddly + cool). */
export interface CompanionSeed {
  speciesId: string;
  style: CompanionStyle;
  /** placeholder name the child renames */
  defaultName: string;
  label: VisualLabel;
  defaultCustomization: CompanionCustomization;
  /** free starter cosmetics granted on creation */
  starterCosmeticIds: string[];
}

// ---------------------------------------------------------------------------
// Novelty-refresh: rotating quests (additive, anti-shame, deterministic).
// A quest is an OPTIONAL bonus goal layered on the core loop. It never blocks
// the loop, never expires with a penalty, and rotation is a pure function of the
// ISO week — no RNG, no AI, no server (feature: novelty-refresh, M-C4).
// ---------------------------------------------------------------------------

export type QuestGoalKind =
  | "popBubbles" // steps completed since the quest rotated in >= target
  | "completeDaypart" // finish a (given or any) daypart routine `target` times
  | "unlockCosmetic" // unlock any cosmetic `target` times
  | "customizeBuddy" // change buddy color/finish/accessory `target` times
  | "tryCalm"; // visit the calm corner `target` times

export interface QuestDef {
  id: string;
  /** REQUIRED spokenLabel (non-reader) + emoji + color (whole board is TTS-able) */
  label: VisualLabel;
  goalKind: QuestGoalKind;
  /** e.g. 10 — how many matching signals complete the quest */
  target: number;
  /** optional daypart filter for `completeDaypart` (undefined = any) */
  daypart?: Daypart;
  /** deterministic bubbles granted on completion — NEVER random */
  rewardTokens: number;
  /** optional cosmetic (already in the catalog) revealed/granted on completion */
  rewardCosmeticId?: string;
  /** base (free) rotation vs a premium/seasonal pack id (gates via noveltyPipeline) */
  packId?: string;
  /** simplest goals suitable for the young single-card mode */
  simple?: boolean;
}

export interface QuestProgress {
  questId: string;
  /** progress toward target (monotonic within the active week) */
  count: number;
  /**
   * Snapshot of the relevant durable metric at rotation start (auditing / future
   * cumulative-delta use). Progress is advanced incrementally via `onSignal`, so
   * this stays 0 for the incremental kinds — kept on the shape per novelty §3.1.
   */
  baseline: number;
  /** reward granted (auto on reaching target — no missable "Claim") */
  claimed: boolean;
  claimedAt?: EpochMs;
}

export interface ChildQuestState {
  childId: string;
  /** the ISO week key the active set was deterministically rotated for (e.g. "2026-W27") */
  weekKey: string;
  /** progress per active quest id (the current week's board) */
  active: Record<string, QuestProgress>;
  /** ids of every quest EVER completed — kept forever (additive, no loss) */
  everCompleted: string[];
}

// ---------------------------------------------------------------------------
// If-then "when X, I will Y" implementation-intention plans (if-then-plans, M-C5).
// A plan couples a CURATED cue to a CURATED action (ZERO AI: no NL parsing, no
// suggestion engine). It is fired at the point of performance ONLY through
// mechanisms the app can honestly support offline: a `time` cue → a gentle
// reminder (reusing the shipped budget + quiet-hours + banned-phrase gate); an
// `afterStep` cue → an in-app card when the linked step completes in the runner;
// an `afterRoutine` cue → the daypart-done panel; a `situational` cue is
// SELF-CHECKED only (the app NEVER claims to sense it — anti-overclaim).
//
// HARD INVARIANT (if-then-plans §7): a Plan carries NO field that can represent
// failure/miss/adherence/streak. The only "did you do it" is the POSITIVE-ONLY
// situational nod, which grants a happy buddy mood + a soft tick and NO tokens.
// All types are ADDITIVE (a brand-new slice + optional fields on a new shape) →
// SCHEMA_VERSION stays 1, MIGRATIONS stays empty.
// ---------------------------------------------------------------------------

/**
 * How a plan's cue fires. Only `time`/`afterStep`/`afterRoutine` are auto-fired;
 * `situational` is self-checked (the app never claims to detect it) — anti-overclaim.
 */
export type PlanCueType = "time" | "afterStep" | "afterRoutine" | "situational";

export interface PlanCue {
  type: PlanCueType;
  /** the "when X" phrase, spoken + shown (REQUIRED spokenLabel for non-readers) */
  label: VisualLabel;
  // type: 'time' — point-of-performance notification
  /** 'HH:mm' local */
  time?: string;
  /** 0-6; empty => every day (matches TaskSchedule) */
  daysOfWeek?: number[];
  // type: 'afterStep' — surfaced in-app when this task/step completes in the runner
  taskId?: string;
  // type: 'afterRoutine' — surfaced on the daypart-done panel
  routineId?: string;
  /** for grouping / the after-routine surface */
  daypart?: Daypart;
  // type: 'situational' — a curated, human-recognizable trigger the app CANNOT sense
  situationId?: string;
}

export interface PlanAction {
  /** the "I will Y" phrase, spoken + shown */
  label: VisualLabel;
  /**
   * optional link to an existing task the plan initiates; completing THAT task
   * pays tokens normally through the existing loop — a plan itself never pays tokens.
   */
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
  /**
   * Child-PROPOSED plan awaiting parent approval (mirrors `Task.proposed`) — never
   * live in the kid surfaces until a parent approves it. Absent/false => a normal plan.
   */
  proposed?: boolean;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  archived: boolean;
}

/** Curated authoring library entries (seed data). No free-text kid input (no-AI). */
export interface PlanCueTemplate {
  id: string;
  type: PlanCueType;
  /** "When I get home from school" etc. */
  label: VisualLabel;
  /** set for `situational` templates */
  situationId?: string;
}
export interface PlanActionTemplate {
  id: string;
  /** "Take 3 calm breaths" etc. */
  label: VisualLabel;
}
