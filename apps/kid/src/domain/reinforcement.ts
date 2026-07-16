/**
 * src/domain/reinforcement.ts — the reinforcement-density (thinning) schedule.
 *
 * Re-authored from doc 62 §8 with the canonical reconciliations (doc 66
 * §1b.3/§1b.4) applied:
 *
 *   - The ONLY thing that thins is the BONUS-token cadence. The base token
 *     (paid by gamification.earn) and a salience-appropriate celebration (sized
 *     by resolveCelebration) are NEVER reduced as a function of the child's own
 *     success (doc 66 §5.3). This function therefore does NOT decide celebration
 *     magnitude — it only reports a `bonus` flag the celebration resolver may
 *     use to step UP.
 *   - The bonus cadence is a DETERMINISTIC every-N — a pure function of the
 *     completion count. It uses NO random-number generation anywhere (the
 *     anti-loot-box rule, doc 66 §5.4). "Variety" lives in content, never in
 *     unpredictable payout timing.
 *   - A lapse (idle gap) RE-WARMS the curve back toward `dense` — welcoming the
 *     child back, never punishing the absence (doc 62 §8 step 1).
 *
 * Pure: returns the bonus + an updated `HabitReinforcement` to persist; never
 * mutates its input. `now` is passed in for deterministic testing.
 */
import type {
  HabitReinforcement,
  ReinforcementConfig,
  ReinforcementPhase,
  ReinforcementResult,
  Task,
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** habitKey groups completions per routine (or per standalone task) — doc 62 §8. */
export function habitKeyFor(task: Pick<Task, "id" | "routineId">): string {
  return task.routineId ?? `task:${task.id}`;
}

/** A fresh per-habit counter (first time we see a habit). */
export function newHabit(habitKey: string): HabitReinforcement {
  return { habitKey, completions: 0, sinceLastBonus: 0, lastCompletedAt: 0 };
}

/** Phase purely from the lifetime completion count (doc 62 §8 step 2). */
export function phaseForCompletions(
  completions: number,
  cfg: ReinforcementConfig,
): ReinforcementPhase {
  if (completions < cfg.denseUntilCompletions) return "dense";
  if (completions < cfg.thinningUntilCompletions) return "thinning";
  return "maintenance";
}

function everyNForPhase(phase: ReinforcementPhase, cfg: ReinforcementConfig): number {
  switch (phase) {
    case "dense":
      return Math.max(1, cfg.bonusEveryN_dense);
    case "thinning":
      return Math.max(1, cfg.bonusEveryN_thinning);
    case "maintenance":
      return Math.max(1, cfg.bonusEveryN_maintenance);
  }
}

export interface ComputeReinforcementInput {
  habit: HabitReinforcement;
  config: ReinforcementConfig;
  /** the task's base tokenValue (for the audit multiplier only) */
  baseTokenValue: number;
  now: number;
}

/**
 * Compute the bonus for ONE completion and the updated habit counters
 * (doc 62 §8). Deterministic — same inputs always yield the same bonus.
 */
export function computeReinforcement(input: ComputeReinforcementInput): ReinforcementResult {
  const { config: cfg, baseTokenValue, now } = input;

  // Work on a copy of the habit.
  let completions = input.habit.completions;
  let sinceLastBonus = input.habit.sinceLastBonus;
  const lastCompletedAt = input.habit.lastCompletedAt;

  // 1) Lapse re-warm: came back after a gap -> soften the curve toward `dense`.
  //    Never punishes — it just makes the welcome-back richer (doc 62 §8 step 1).
  if (lastCompletedAt > 0) {
    const idleDays = Math.floor((now - lastCompletedAt) / MS_PER_DAY);
    if (idleDays >= cfg.reWarmAfterIdleDays) {
      completions = Math.max(0, Math.floor(completions / 2));
      sinceLastBonus = 0;
    }
  }

  // 2) Phase from the (possibly re-warmed) completion count.
  const phase = phaseForCompletions(completions, cfg);

  // 3) Bonus cadence — the deterministic every-N gate (the only thing that thins).
  const everyN = everyNForPhase(phase, cfg);
  sinceLastBonus += 1;
  const bonus = sinceLastBonus >= everyN;
  const bonusTokens = bonus ? cfg.baseBonusTokens : 0;
  if (bonus) sinceLastBonus = 0;

  // 4) Advance the lifetime counters.
  completions += 1;

  const habit: HabitReinforcement = {
    habitKey: input.habit.habitKey,
    completions,
    sinceLastBonus,
    lastCompletedAt: now,
  };

  return {
    bonusTokens,
    multiplier: 1 + bonusTokens / Math.max(1, baseTokenValue),
    phase,
    bonus,
    habit,
  };
}

/** Reset a habit's curve back to dense (parent "re-warm", e.g. after illness). */
export function resetHabit(habit: HabitReinforcement): HabitReinforcement {
  return { ...habit, completions: 0, sinceLastBonus: 0 };
}
