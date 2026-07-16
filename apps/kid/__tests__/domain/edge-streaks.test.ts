/**
 * M4 ADVERSARIAL EDGE TESTS — multi-week gaps + freeze/pause exhaustion.
 *
 * The forgiving streak (doc 62 §10, doc 66 §5.2) must NEVER zero, NEVER show
 * "broken", and NEVER drive `freezeTokens` negative — no matter how the grace
 * days are spent. These tests drain the freeze pool to exactly empty, one-over
 * empty, and across month/multi-week gaps, asserting the invariants hold at
 * every step.
 */
import { describe, expect, it } from "@jest/globals";

import {
  applyCompletionToStreak,
  reconcileStreakRest,
  replenishFreezes,
} from "../../src/domain/streaks";
import type { ProgressState } from "../../src/domain/types";

const TZ = "UTC";
/** epoch ms at noon UTC on Jan `d`, 2026 (d may overflow into Feb — handled). */
const day = (d: number) => Date.UTC(2026, 0, d, 12, 0, 0);

function makeProgress(over: Partial<ProgressState> = {}): ProgressState {
  return {
    childId: "c1",
    cumulativeCount: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    lastActiveDate: null,
    freezeTokens: 0,
    freezeUsedDates: [],
    weekCompletions: 0,
    paused: false,
    savingTowardRewardId: null,
    ...over,
  };
}

describe("freeze exhaustion — grace drains to empty, never negative, never zeroes", () => {
  it("spends multiple freezes on a single multi-missed gap, then gently restarts", () => {
    // freeze cap 2 (the young default).
    let p = applyCompletionToStreak(makeProgress({ freezeTokens: 2 }), { tz: TZ, now: day(1) });
    expect(p.currentStreakDays).toBe(1);

    // day 4: gap 3, missed 2 -> spend BOTH freezes, streak preserved.
    p = applyCompletionToStreak(p, { tz: TZ, now: day(4) });
    expect(p.currentStreakDays).toBe(2);
    expect(p.freezeTokens).toBe(0);
    expect(p.freezeUsedDates).toContain("2026-01-04");
    expect(p.longestStreakDays).toBe(2);

    // day 6: gap 2, missed 1, but NO freeze left -> gentle restart at 1 (never 0).
    p = applyCompletionToStreak(p, { tz: TZ, now: day(6) });
    expect(p.currentStreakDays).toBe(1);
    expect(p.freezeTokens).toBe(0); // floored, never negative
    expect(p.longestStreakDays).toBe(2); // best retained
    expect(p.cumulativeCount).toBe(3); // cumulative only ever grows
  });

  it("a gap with missed EXACTLY equal to freezeTokens preserves the streak (boundary)", () => {
    let p = applyCompletionToStreak(makeProgress({ freezeTokens: 1 }), { tz: TZ, now: day(1) });
    // day 3: gap 2, missed 1 === freezeTokens -> covered exactly.
    p = applyCompletionToStreak(p, { tz: TZ, now: day(3) });
    expect(p.currentStreakDays).toBe(2);
    expect(p.freezeTokens).toBe(0);
  });

  it("a gap ONE over the freeze pool restarts AND does NOT consume the freezes", () => {
    let p = applyCompletionToStreak(makeProgress({ freezeTokens: 1 }), { tz: TZ, now: day(1) });
    // day 4: gap 3, missed 2 > freezeTokens 1 -> restart; freezes are NOT spent.
    p = applyCompletionToStreak(p, { tz: TZ, now: day(4) });
    expect(p.currentStreakDays).toBe(1);
    expect(p.freezeTokens).toBe(1); // preserved — only a covered gap spends grace
    expect(p.freezeUsedDates).toEqual([]);
  });

  it("a multi-week gap crossing a month boundary still floors at 1, never 0/broken", () => {
    let p = applyCompletionToStreak(makeProgress({ freezeTokens: 1 }), { tz: TZ, now: day(1) });
    // day 40 == 2026-02-09: a ~5.5 week gap; 1 freeze cannot cover ~38 missed days.
    p = applyCompletionToStreak(p, { tz: TZ, now: day(40) });
    expect(p.lastActiveDate).toBe("2026-02-09"); // month rolled correctly
    expect(p.currentStreakDays).toBe(1); // gentle restart, NEVER 0
    expect(p.cumulativeCount).toBe(2);
    expect(p.freezeTokens).toBe(1); // uncovered gap doesn't spend grace
  });

  it("a long randomly-spaced sequence of gaps never yields a negative freeze or a 0 streak", () => {
    let p = applyCompletionToStreak(makeProgress({ freezeTokens: 2 }), { tz: TZ, now: day(1) });
    const days = [2, 5, 6, 7, 12, 13, 30, 31, 60, 90];
    for (const d of days) {
      p = applyCompletionToStreak(p, { tz: TZ, now: day(d) });
      expect(p.currentStreakDays).toBeGreaterThanOrEqual(1); // never 0
      expect(p.freezeTokens).toBeGreaterThanOrEqual(0); // never negative
    }
    expect(p.cumulativeCount).toBe(days.length + 1); // every completion counted
  });
});

describe("pause/rest interplay with freezes", () => {
  it("a resting (paused) streak UN-pauses on the next completion and can still be saved by a freeze", () => {
    // The child rested; reconcile flipped paused=true without zeroing anything.
    let p = makeProgress({
      currentStreakDays: 5,
      longestStreakDays: 7,
      cumulativeCount: 40,
      lastActiveDate: "2026-01-01",
      freezeTokens: 1,
      paused: true,
    });
    // Returns on day 3: gap 2, missed 1 -> a freeze rescues the streak AND clears rest.
    p = applyCompletionToStreak(p, { tz: TZ, now: day(3) });
    expect(p.paused).toBe(false);
    expect(p.currentStreakDays).toBe(6);
    expect(p.freezeTokens).toBe(0);
    expect(p.longestStreakDays).toBe(7);
  });

  it("reconcileStreakRest never double-flips and never lowers anything", () => {
    const rested = reconcileStreakRest(
      makeProgress({ currentStreakDays: 5, longestStreakDays: 9, cumulativeCount: 100, lastActiveDate: "2026-01-01", paused: true }),
      { tz: TZ, now: day(10) },
    );
    // already paused -> returns the same object, untouched.
    expect(rested.paused).toBe(true);
    expect(rested.currentStreakDays).toBe(5);
    expect(rested.longestStreakDays).toBe(9);
    expect(rested.cumulativeCount).toBe(100);
  });
});

describe("replenish never exceeds the cap even after a long absence", () => {
  it("many weeks elapsed still clamp to the max (no runaway grace)", () => {
    const p = makeProgress({ freezeTokens: 0 });
    const r = replenishFreezes(p, { freezeTokensMax: 2, freezeReplenishPerWeek: 1 }, 999);
    expect(r.freezeTokens).toBe(2);
  });

  it("zero/negative weeks elapsed is a no-op", () => {
    const p = makeProgress({ freezeTokens: 1 });
    expect(replenishFreezes(p, { freezeTokensMax: 2, freezeReplenishPerWeek: 1 }, 0)).toBe(p);
    expect(replenishFreezes(p, { freezeTokensMax: 2, freezeReplenishPerWeek: 1 }, -3)).toBe(p);
  });
});
