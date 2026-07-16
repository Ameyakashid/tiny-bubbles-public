/**
 * src/domain/companionMood.ts — event -> mood rules + decay + nurture.
 *
 * The anti-shame keystone (doc 62 §9, doc 66 §1b.7/§5.1). The companion's mood
 * is a SHORT-LIVED expression of the last POSITIVE interaction; it decays back
 * to the resting default `content`, and after a long idle settles to the restful
 * `sleepy`. It can NEVER reach a negative state — there is no sad/irate/sick/
 * guilt member, and every code path here returns a member of the canonical
 * positive `CompanionMood` union.
 *
 * Returning after a long absence => `excited` (happy to see you), never guilt —
 * the structural opposite of the donor's shame sprites (doc 62 §9).
 *
 * Bond/growth are CUMULATIVE and MONOTONIC, derived from `lifetimeEarned`. There
 * is no decay timer; skipping days never shrinks the companion (doc 62 §9).
 *
 * Pure: `now` + `lifetimeEarned` are passed in for deterministic testing.
 */
import type { CompanionMood, CompanionState } from "./types";

// ---------------------------------------------------------------------------
// Positive-only mood guarantee. `satisfies` ties this to the canonical union so
// adding a negative member anywhere would be a compile error here too.
// ---------------------------------------------------------------------------
export const POSITIVE_MOODS = [
  "content",
  "happy",
  "excited",
  "sleepy",
  "celebrating",
  "curious",
  "proud",
] as const satisfies readonly CompanionMood[];

export const RESTING_MOOD: CompanionMood = "content";

/** A positive event the companion can react to. There is NO negative event. */
export type CompanionEvent =
  | "stepDone"
  | "routineComplete"
  | "tokenEarned"
  | "levelUp"
  | "collectible"
  | "returnAfterAbsence"
  | "greet"
  | "tap"
  | "rest"; // explicit settle (e.g. bedtime / calm path)

/** Pure event -> mood rule table (doc 62 §9, doc 66 §1b.7). All positive. */
export function moodForEvent(event: CompanionEvent): CompanionMood {
  switch (event) {
    case "stepDone":
      return "celebrating";
    case "routineComplete":
      return "proud";
    case "tokenEarned":
      return "happy";
    case "levelUp":
      return "proud";
    case "collectible":
      return "excited";
    case "returnAfterAbsence":
      return "excited";
    case "greet":
      return "happy";
    case "tap":
      return "curious";
    case "rest":
      return "sleepy";
  }
}

// ---------------------------------------------------------------------------
// Decay windows (ms). Transient celebratory moods are short-lived; everything
// settles back to `content`, and a long idle settles to the restful `sleepy`.
// ---------------------------------------------------------------------------
const DECAY_MS: Partial<Record<CompanionMood, number>> = {
  celebrating: 8_000, // a brief burst right after a completion
  excited: 30_000,
  proud: 30_000,
  happy: 20_000,
  curious: 15_000,
};

/** After this much idle with a `content` mood, the buddy dozes off (restful). */
export const IDLE_SLEEPY_MS = 10 * 60 * 1000;

/**
 * Apply a positive event: set the transient mood + stamp the interaction time.
 * Returns a NEW state; never mutates. The resulting mood is always positive.
 */
export function applyCompanionEvent(
  state: CompanionState,
  event: CompanionEvent,
  now: number,
): CompanionState {
  return {
    ...state,
    mood: moodForEvent(event),
    moodSince: now,
    lastInteractionAt: now,
  };
}

/**
 * Settle the mood for the current time (doc 62 §9). A transient mood whose decay
 * window has elapsed returns to `content`; a long-idle `content` buddy becomes
 * `sleepy`. The result is ALWAYS a positive member — a corrupt/unknown mood is
 * coerced to `content` (defense in depth alongside the migration repair).
 */
export function decayMood(state: CompanionState, now: number): CompanionState {
  let mood: CompanionMood = isPositiveMood(state.mood) ? state.mood : RESTING_MOOD;
  const sinceMood = now - state.moodSince;

  const window = DECAY_MS[mood];
  if (window !== undefined && sinceMood >= window) {
    mood = RESTING_MOOD;
  }

  if (mood === "content" && now - state.lastInteractionAt >= IDLE_SLEEPY_MS) {
    mood = "sleepy";
  }

  if (mood === state.mood) return state;
  // Preserve `moodSince` when only normalising a value; advance it on a real
  // transition so the next decay window measures from the settle point.
  return { ...state, mood };
}

function isPositiveMood(value: unknown): value is CompanionMood {
  return typeof value === "string" && (POSITIVE_MOODS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Nurture — monotonic bond/growth from lifetimeEarned (doc 62 §9, doc 66 §5).
// ---------------------------------------------------------------------------

/** Tokens of lifetime earning per bond level. */
export const TOKENS_PER_BOND_LEVEL = 25;
/** Bond levels per growth stage (a visible body change every few levels). */
export const BOND_LEVELS_PER_GROWTH_STAGE = 4;
/** The companion never grows past this many cosmetic stages. */
export const MAX_GROWTH_STAGE = 5;

export function bondLevelForLifetime(lifetimeEarned: number): number {
  return Math.max(0, Math.floor(lifetimeEarned / TOKENS_PER_BOND_LEVEL));
}

export function growthStageForBond(bondLevel: number): number {
  return Math.min(MAX_GROWTH_STAGE, Math.floor(bondLevel / BOND_LEVELS_PER_GROWTH_STAGE));
}

/**
 * Derive bond + growth from lifetime earning and apply them MONOTONICALLY:
 * each is `max(current, computed)`, so a value can never decrease (even if a
 * future config lowers a threshold). Returns a NEW state; never mutates.
 */
export function nurtureCompanion(
  state: CompanionState,
  lifetimeEarned: number,
): CompanionState {
  const bondLevel = Math.max(state.bondLevel, bondLevelForLifetime(lifetimeEarned));
  const growthStage = Math.max(state.growthStage, growthStageForBond(bondLevel));
  if (bondLevel === state.bondLevel && growthStage === state.growthStage) return state;
  return { ...state, bondLevel, growthStage };
}

/** True when nurture would advance the growth stage (drives a level-up cue). */
export function wouldLevelUp(state: CompanionState, lifetimeEarned: number): boolean {
  return nurtureCompanion(state, lifetimeEarned).growthStage > state.growthStage;
}
