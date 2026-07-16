/**
 * domain/streaks.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] forgiving, timezone-aware cumulative progress.
 *
 * Ports momentum's `streaks.ts` day math (doc 62 §10, doc 66 §1b.2) with THE ONE
 * punitive line removed: where momentum does `return { streakDays: 1, wasReset:
 * true }` on a gap, we instead consume freeze/grace days or gently restart —
 * and we NEVER zero the streak or mark it "broken" (doc 66 §5.2).
 *
 * Structural anti-shame guarantees:
 *   - `cumulativeCount` is monotonic and increments on EVERY completion (it can
 *     never decrease) — this is the "you've popped N bubbles" number.
 *   - `currentStreakDays` is floored at a gentle restart of 1 after a lapse that
 *     grace can't cover — it is NEVER set to 0.
 *   - `longestStreakDays` is only ever raised (a non-losable "best: N" badge).
 *   - A lapse with no completion yet is surfaced as `paused` (resting), not lost.
 *
 * Pure + timezone-aware: `tz` + `now` are passed in for deterministic testing.
 */
import { diffDays, isoDay } from "./dates";
import type { ProgressConfig, ProgressState } from "./types";

export interface StreakContext {
  /** IANA timezone of the child (doc 62 §4). */
  tz: string;
  /** epoch ms of the completion. */
  now: number;
}

/**
 * Apply one completion to the progress slice (doc 62 §10). Increments the
 * monotonic `cumulativeCount`/`weekCompletions` and advances the forgiving
 * streak. Returns a NEW progress object; never mutates its input.
 */
export function applyCompletionToStreak(
  p: ProgressState,
  ctx: StreakContext,
): ProgressState {
  const today = isoDay(ctx.now, ctx.tz);

  // Every completion always counts toward the cumulative totals.
  const base: ProgressState = {
    ...p,
    cumulativeCount: p.cumulativeCount + 1,
    weekCompletions: p.weekCompletions + 1,
  };

  // First-ever completion.
  if (!p.lastActiveDate) {
    return {
      ...base,
      currentStreakDays: 1,
      lastActiveDate: today,
      paused: false,
      longestStreakDays: Math.max(p.longestStreakDays, 1),
    };
  }

  const gap = diffDays(today, p.lastActiveDate);

  // Already counted today (gap 0) — or a clock that went backwards (gap < 0).
  // The cumulative total still grew above; the streak day count is unchanged.
  if (gap <= 0) {
    return { ...base, paused: false };
  }

  const next: ProgressState = { ...base, lastActiveDate: today, paused: false };

  if (gap === 1) {
    // Consecutive day — momentum's happy path.
    next.currentStreakDays = p.currentStreakDays + 1;
  } else {
    // A gap. momentum would zero the streak here. WE DO NOT.
    const missed = gap - 1;
    if (p.freezeTokens >= missed) {
      // Spend grace days and PRESERVE the streak — welcomed back, intact.
      next.freezeTokens = p.freezeTokens - missed;
      next.freezeUsedDates = [...p.freezeUsedDates, today];
      next.currentStreakDays = p.currentStreakDays + 1;
    } else {
      // Not enough grace: a fresh, GENTLE restart at 1 — never shown as 0.
      // `longestStreakDays` is retained and surfaced as "your best: N".
      next.currentStreakDays = 1;
    }
  }

  next.longestStreakDays = Math.max(p.longestStreakDays, next.currentStreakDays);
  return next;
}

/**
 * On app-open reconciler (doc 62 §10 presentation): if the child has missed at
 * least one full day with no completion yet, surface the streak as `paused`
 * (resting) — NOT lost. This only flips the display flag; it never zeros the
 * streak, never lowers `longest`, and never touches `cumulativeCount`. Freezes
 * are spent on the next completion (in `applyCompletionToStreak`), not here.
 */
export function reconcileStreakRest(p: ProgressState, ctx: StreakContext): ProgressState {
  if (!p.lastActiveDate) return p;
  const gap = diffDays(isoDay(ctx.now, ctx.tz), p.lastActiveDate);
  if (gap >= 2 && !p.paused) {
    return { ...p, paused: true };
  }
  return p;
}

/**
 * Weekly auto-replenish of grace/freeze days, capped at the age maximum
 * (doc 62 §10). Additive only — never removes freezes. `weeksElapsed` is how
 * many replenish cycles to apply (usually 1 on a weekly boundary).
 */
export function replenishFreezes(
  p: ProgressState,
  config: ProgressConfig,
  weeksElapsed = 1,
): ProgressState {
  if (weeksElapsed <= 0) return p;
  const add = config.freezeReplenishPerWeek * weeksElapsed;
  const freezeTokens = Math.min(config.freezeTokensMax, p.freezeTokens + add);
  return freezeTokens === p.freezeTokens ? p : { ...p, freezeTokens };
}

/** Reset the rolling weekly counter (called on a new week boundary). */
export function resetWeekCompletions(p: ProgressState): ProgressState {
  return p.weekCompletions === 0 ? p : { ...p, weekCompletions: 0 };
}

export type StreakDisplay =
  | { mode: "active"; days: number; best: number }
  | { mode: "resting"; best: number; cumulative: number };

/**
 * The forgiving display selector (doc 62 §13). A resting streak leads with the
 * non-losable `cumulativeCount` + "best: N"; an active streak shows the day
 * count. Neither branch can render a "0" or "broken" — by construction.
 */
export function streakDisplay(p: ProgressState): StreakDisplay {
  if (p.paused) {
    return { mode: "resting", best: p.longestStreakDays, cumulative: p.cumulativeCount };
  }
  return { mode: "active", days: p.currentStreakDays, best: p.longestStreakDays };
}
