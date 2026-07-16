/**
 * theme/resolveCelebration.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] THE single celebration resolver (doc 66 §1b.3).
 *
 * Consumed by M7 (`useCelebration`) and M13 (sensory polish). The precedence is
 * the load-bearing anti-shame rule of the whole product:
 *
 *   1. SALIENCE sets the size. A routine-complete / level-up / new-collectible
 *      is `full`; a single step is `medium` (older) / `full` (young, per the age
 *      ceiling). Salience is the ONLY axis that can RAISE magnitude.
 *   2. ageMode sets the per-mode CEILING for steps (young step -> full, older
 *      step -> medium); routine-complete may reach `full` in BOTH.
 *   3. An occasional deterministic BONUS may step magnitude UP (never down).
 *   4. sensoryMode==='lowStim' / reducedMotion / quietHours CLAMP DOWN to
 *      `gentle`; calmMode clamps to `calm` (the strongest clamp).
 *
 * CRITICAL: reinforcement PHASE is deliberately NOT a parameter of this
 * function. Celebration magnitude is DECOUPLED from how many times the child has
 * succeeded — the base celebration fires, undiminished, forever (doc 66 §5.3).
 * Phase thins only the invisible bonus-token cadence (M4 §1b.4), never this.
 *
 * Pure + unit-testable.
 */
import type { AgeMode, CelebrationLevel, SensoryMode } from "../domain/types";

/**
 * What just happened — the salience of the moment. The ONLY axis allowed to
 * raise magnitude. Deliberately has no "step count"/"phase"/"mastery" member.
 */
export type CelebrationSalience =
  | "step" // a single routine step completed
  | "routineComplete" // the last step of a routine
  | "levelUp" // companion leveled up
  | "newCollectible"; // a new cosmetic/collectible earned

export interface ResolveCelebrationInput {
  ageMode: AgeMode;
  salience: CelebrationSalience;
  sensoryMode: SensoryMode;
  reducedMotion: boolean;
  /** the (kid)/calm destination or calm-mode setting — strongest clamp */
  calmMode: boolean;
  /** inside a parent-set quiet-hours window (sleep/school) */
  quietHours: boolean;
  /**
   * An occasional, DETERMINISTIC bonus moment (a pure function of completion
   * count upstream — never Math.random, doc 66 §1b.4). Steps magnitude UP only.
   */
  bonus?: boolean;
}

// numeric ladder so clamps/steps are simple min/max ops (largest -> smallest)
const SIZE = { full: 3, medium: 2, gentle: 1, calm: 0 } as const;
const LEVEL_BY_SIZE: Record<number, CelebrationLevel> = {
  3: "full",
  2: "medium",
  1: "gentle",
  0: "calm",
};

export function resolveCelebration(input: ResolveCelebrationInput): CelebrationLevel {
  const { ageMode, salience, sensoryMode, reducedMotion, calmMode, quietHours, bonus } = input;

  // 1 + 2. Salience sets size, with the age ceiling applied to steps.
  let size: number;
  if (salience === "step") {
    size = ageMode === "young" ? SIZE.full : SIZE.medium; // young ceiling vs older ceiling
  } else {
    size = SIZE.full; // routine-complete / level-up / collectible reach full in both
  }

  // 3. Bonus steps UP only (capped at full); explicitly allowed to exceed the
  //    per-step ceiling — that is the whole point of an occasional bonus.
  if (bonus) size = Math.min(SIZE.full, size + 1);

  // 4. Clamp DOWN. calmMode is the strongest clamp.
  if (calmMode) return "calm";
  if (sensoryMode === "lowStim" || reducedMotion || quietHours) {
    size = Math.min(size, SIZE.gentle);
  }

  return LEVEL_BY_SIZE[size];
}
