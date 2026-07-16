/**
 * src/domain/constants.ts — defaults + fresh-entity factories (RN-free, pure).
 *
 * One home for the never-punishing defaults (doc 62 §4/§8/§10/§12) and the
 * "fresh" factories the stores + migration layer use to instantiate a new child,
 * ledger, companion, etc. Every default here upholds the anti-shame invariants:
 * no field starts in (or can reach) a failure/loss/zeroed-as-punishment state.
 */
import { defaultCompanionStyle, defaultTextFirst } from "../theme/resolveCapabilities";

import { DEFAULT_FOCUS_INTERVALS } from "./focus";
import type {
  AgeMode,
  ChildSettings,
  CompanionState,
  Entitlement,
  ParentSettings,
  ProgressConfig,
  ProgressState,
  ReinforcementConfig,
  ReinforcementState,
  Reward,
  SoundscapeSettings,
  TokenLedger,
} from "./types";

// ---------------------------------------------------------------------------
// Tunable constants.
// ---------------------------------------------------------------------------

// M1.1b: `LEDGER_ENTRY_CAP`/`RUNS_CAP`/`ONE_DAY_MS` moved to
// `@tiny-bubbles/shared/domain/constants` (the shared report/moodInsight
// modules depend on them — one home per symbol, 02-architecture §2.1) and are
// re-exported here so every existing kid import keeps working unchanged.
export { LEDGER_ENTRY_CAP, ONE_DAY_MS, RUNS_CAP } from "@tiny-bubbles/shared/domain/constants";

/** Capped collections keep the most recent N (doc 62 §2). */
export const MOODS_CAP = 500;
export const EVENTS_CAP = 500;

/** Default base token paid for completing one task/step (doc 62 §5/§14). */
export const DEFAULT_TASK_TOKEN_VALUE = 1;

/**
 * Kid-side quick-undo window (verify-undo §2.2/§5). After an accidental Done tap
 * (a completed step) OR an auto-approved redemption, a calm, no-punishment "undo"
 * is offered for this long, then fades. Transient/presentational only — the window
 * is NEVER persisted (a safety net must not survive a kill). Global, not per-child.
 */
export const UNDO_WINDOW_MS = 6000;

/** A redemption request auto-expires after this many ms if undecided. */
export const REDEMPTION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Premium trial length (doc 66 §M12). A mock subscribe opens an HONEST, clearly
 * surfaced 7-day trial — no countdown/urgency, one-tap cancel. The trial end-date
 * shown in the paywall is `purchasedAt + PREMIUM_TRIAL_DAYS`.
 */
export const PREMIUM_TRIAL_DAYS = 7;
export const PREMIUM_TRIAL_MS = PREMIUM_TRIAL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Default per-child soundscape prefs (feature `soundscapes`, M-C1). OFF by
 * default (opt-in, silent): `focusDuringTasks:false` and no `focusSceneId`. The
 * calm-corner scene defaults to the FREE `waves` bed (reuses calm-ambient.wav);
 * `volume` matches the shipped ambient level so there is no loudness surprise.
 */
export const DEFAULT_SOUNDSCAPE_SETTINGS: SoundscapeSettings = {
  volume: 0.55,
  calmSceneId: "waves",
  focusSceneId: null,
  focusDuringTasks: false,
};

// ---------------------------------------------------------------------------
// Reinforcement config (doc 62 §8) — young keeps a longer dense phase.
// ---------------------------------------------------------------------------

export const DEFAULT_REINFORCEMENT_CONFIG: ReinforcementConfig = {
  denseUntilCompletions: 7,
  thinningUntilCompletions: 21,
  baseBonusTokens: 1,
  bonusEveryN_dense: 1,
  bonusEveryN_thinning: 3,
  bonusEveryN_maintenance: 7,
  reWarmAfterIdleDays: 5,
};

export const YOUNG_REINFORCEMENT_CONFIG: ReinforcementConfig = {
  ...DEFAULT_REINFORCEMENT_CONFIG,
  denseUntilCompletions: 10,
  thinningUntilCompletions: 28,
};

export function defaultReinforcementConfig(ageMode: AgeMode): ReinforcementConfig {
  return ageMode === "young"
    ? { ...YOUNG_REINFORCEMENT_CONFIG }
    : { ...DEFAULT_REINFORCEMENT_CONFIG };
}

// ---------------------------------------------------------------------------
// Progress config (doc 62 §10) — young gets more grace days.
// ---------------------------------------------------------------------------

export function defaultProgressConfig(ageMode: AgeMode): ProgressConfig {
  return ageMode === "young"
    ? { freezeTokensMax: 2, freezeReplenishPerWeek: 1 }
    : { freezeTokensMax: 1, freezeReplenishPerWeek: 1 };
}

// ---------------------------------------------------------------------------
// Fresh-entity factories.
// ---------------------------------------------------------------------------

export function freshLedger(childId: string): TokenLedger {
  return {
    childId,
    balance: 0,
    heldTokens: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    lastEarnedAt: 0,
    entries: [],
  };
}

export function freshReinforcementState(childId: string): ReinforcementState {
  return { childId, habits: {} };
}

/**
 * A fresh progress slice. Note: `currentStreakDays` starts at 0 as a *data*
 * default (no activity yet); the never-show-0 rule is a presentation invariant
 * (doc 62 §10) — the data layer floors at 0, the UI never renders a "0 streak".
 * `freezeTokens` start at the age cap so a child is welcomed back from day one.
 */
export function freshProgress(childId: string, config: ProgressConfig): ProgressState {
  return {
    childId,
    cumulativeCount: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    lastActiveDate: null,
    freezeTokens: config.freezeTokensMax,
    freezeUsedDates: [],
    weekCompletions: 0,
    paused: false,
    savingTowardRewardId: null,
  };
}

export function freshCompanion(
  childId: string,
  opts: {
    speciesId: string;
    name: string;
    now: number;
    baseColor?: string;
    accentColor?: string;
    starterCosmeticIds?: string[];
  },
): CompanionState {
  return {
    childId,
    speciesId: opts.speciesId,
    name: opts.name,
    mood: "content",
    moodSince: opts.now,
    bondLevel: 0,
    growthStage: 0,
    lastInteractionAt: opts.now,
    customization: {
      baseColor: opts.baseColor ?? "#5BC8F5",
      accentColor: opts.accentColor ?? "#FFD166",
      accessories: [],
    },
    unlockedItems: [...(opts.starterCosmeticIds ?? [])],
    equipped: {},
  };
}

// ---------------------------------------------------------------------------
// Default child settings (doc 62 §4, reconciliations §1b.5/§1b.6).
// ---------------------------------------------------------------------------

export function defaultChildSettings(ageMode: AgeMode): ChildSettings {
  return {
    calmMode: false,
    // young celebrates fully; older a touch calmer — a ceiling preference only;
    // the canonical sizing lives in resolveCelebration (doc 66 §1b.3).
    celebrationIntensity: ageMode === "young" ? "full" : "medium",
    sensoryMode: "standard",
    companionStyle: defaultCompanionStyle(ageMode),
    textFirst: defaultTextFirst(ageMode),
    soundEnabled: true,
    hapticsEnabled: true,
    reducedMotion: false,
    // TTS mandatory-on for young (non-reader); on-but-mutable for older.
    spokenLabelsEnabled: true,
    autonomy: {
      canAddTasks: false,
      // older + preteen can reorder steps by default (aging-up §3.5).
      canReorderSteps: ageMode !== "young",
      canPickReward: true,
      canCustomizeCompanion: true,
    },
    reinforcement: defaultReinforcementConfig(ageMode),
    reminders: {
      enabled: false,
      maxPerDay: ageMode === "young" ? 2 : 3,
      anchors: [],
      toneIsGentle: true,
    },
    autoApproveRedeemUnderTokens: 0, // always require parent approval by default
    // Opt-in, silent-by-default soundscape prefs (soundscapes §3.3). Harmless for
    // new children; existing blobs get it via the resolver / merge (optional field).
    soundscape: { ...DEFAULT_SOUNDSCAPE_SETTINGS },
    // Breathing pacing haptic is opt-in, DEFAULT OFF (breathing-regulation §3.2).
    // `breathingPatternId` is left ABSENT so the age-resolved default applies.
    breathingPacingHaptics: false,
    // Optional focus-interval scaffold (focus-intervals §3.4). `enabled:false` —
    // AVAILABILITY is gated by the `focusIntervalsAvailable` capability (older only);
    // this is the parent opt-in that must also be true. 15/5, non-rigid.
    focusIntervals: { ...DEFAULT_FOCUS_INTERVALS },
    // Novelty quest board: default ON for the standard path, mirroring `!calmMode`
    // (novelty-refresh §2.6/§3.3). Since `calmMode` defaults false here, quests are
    // on by default; a calm-path child (or a parent toggle) suppresses the whole
    // novelty layer. Consumers read `questsEnabled ?? !calmMode` so old blobs merge.
    questsEnabled: true,
  };
}

// ---------------------------------------------------------------------------
// Default parent-global settings + entitlement (doc 62 §12, §1b.12).
// ---------------------------------------------------------------------------

export function defaultParentSettings(now: number): ParentSettings {
  return {
    // 'none' is dev-only and blocked from production (doc 66 §1b.8); onboarding
    // configures a real challenge. We default to 'math' as a safe placeholder.
    parentGate: { mode: "math" },
    notificationsEnabled: false,
    soundEnabled: true,
    hapticEnabled: true,
    reducedMotionDefault: false,
    lowStimTheme: false,
    quietHours: { start: "20:00", end: "07:00" },
    localAnalyticsEnabled: false, // opt-IN (doc 66 §1b.12)
    moodLoggingEnabled: false, // opt-IN (doc 66 §1b.12)
    openDyslexicFont: false, // a11y preference; swap activates once fonts ship
    timerSoundEnabled: false, // opt-IN soft one-shot timer chime (visual-timers §2.7)
    locale: "en", // household language (accessibility-i18n §3.1); ships English
    quickChildSwitch: false, // opt-IN ungated kid switcher (multi-child §3.4)
    updatedAt: now,
  };
}

export function defaultEntitlement(now: number): Entitlement {
  return {
    tier: "free",
    source: "none",
    mockPurchases: [],
    updatedAt: now,
  };
}

/** A reward instance from the same shape the seed/parent CRUD produce. */
export function makeReward(
  childId: string,
  now: number,
  fields: Omit<Reward, "childId" | "createdAt" | "updatedAt">,
): Reward {
  return { ...fields, childId, createdAt: now, updatedAt: now };
}
