import { describe, expect, it } from "@jest/globals";

import {
  applyCompletionToStreak,
  reconcileStreakRest,
  replenishFreezes,
  streakDisplay,
} from "../../src/domain/streaks";
import type { ProgressState } from "../../src/domain/types";

const TZ = "UTC";
/** epoch ms at noon UTC on Jan `d`, 2026 — a stable test calendar. */
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

describe("applyCompletionToStreak (forgiving — NEVER zeros)", () => {
  it("first-ever completion starts the streak at 1", () => {
    const p = applyCompletionToStreak(makeProgress(), { tz: TZ, now: day(1) });
    expect(p.currentStreakDays).toBe(1);
    expect(p.cumulativeCount).toBe(1);
    expect(p.longestStreakDays).toBe(1);
    expect(p.lastActiveDate).toBe("2026-01-01");
    expect(p.paused).toBe(false);
  });

  it("a consecutive day increments the streak", () => {
    let p = applyCompletionToStreak(makeProgress(), { tz: TZ, now: day(1) });
    p = applyCompletionToStreak(p, { tz: TZ, now: day(2) });
    expect(p.currentStreakDays).toBe(2);
    expect(p.cumulativeCount).toBe(2);
  });

  it("same-day completion grows cumulative but not the day count", () => {
    let p = applyCompletionToStreak(makeProgress(), { tz: TZ, now: day(1) });
    p = applyCompletionToStreak(p, { tz: TZ, now: day(1) });
    expect(p.currentStreakDays).toBe(1);
    expect(p.cumulativeCount).toBe(2);
  });

  it("a gap covered by a freeze token PRESERVES the streak", () => {
    let p = applyCompletionToStreak(makeProgress({ freezeTokens: 2 }), { tz: TZ, now: day(1) });
    expect(p.currentStreakDays).toBe(1);
    // missed day 2; complete on day 3 (gap=2, missed=1) -> spend 1 freeze, streak continues
    p = applyCompletionToStreak(p, { tz: TZ, now: day(3) });
    expect(p.currentStreakDays).toBe(2);
    expect(p.freezeTokens).toBe(1);
    expect(p.freezeUsedDates).toContain("2026-01-03");
  });

  it("a gap WITHOUT enough freeze gently restarts at 1 — never 0, never broken", () => {
    let p = applyCompletionToStreak(makeProgress({ freezeTokens: 0 }), { tz: TZ, now: day(1) });
    p = applyCompletionToStreak(p, { tz: TZ, now: day(2) }); // streak 2
    p = applyCompletionToStreak(p, { tz: TZ, now: day(3) }); // streak 3
    expect(p.currentStreakDays).toBe(3);
    // big gap (missed days 4..9), no freeze -> restart at 1 (NOT 0)
    p = applyCompletionToStreak(p, { tz: TZ, now: day(10) });
    expect(p.currentStreakDays).toBe(1);
    expect(p.longestStreakDays).toBe(3); // best retained
    expect(p.cumulativeCount).toBe(4); // cumulative never decreases
  });

  it("a simulated multi-day gap NEVER yields a 0 / broken streak", () => {
    let p = applyCompletionToStreak(makeProgress({ freezeTokens: 1 }), { tz: TZ, now: day(1) });
    const gaps = [3, 4, 10, 11, 30];
    for (const d of gaps) {
      p = applyCompletionToStreak(p, { tz: TZ, now: day(d) });
      expect(p.currentStreakDays).toBeGreaterThanOrEqual(1); // never 0
    }
    expect(p.longestStreakDays).toBeGreaterThanOrEqual(1);
  });

  it("never lowers longestStreakDays", () => {
    let p = makeProgress({ longestStreakDays: 9, freezeTokens: 0 });
    p = applyCompletionToStreak(p, { tz: TZ, now: day(1) });
    expect(p.longestStreakDays).toBe(9);
  });
});

describe("reconcileStreakRest (resting, not lost)", () => {
  it("flips to paused after a 2+ day gap with no completion, without zeroing", () => {
    const p = makeProgress({ currentStreakDays: 5, longestStreakDays: 7, lastActiveDate: "2026-01-01" });
    const rested = reconcileStreakRest(p, { tz: TZ, now: day(5) });
    expect(rested.paused).toBe(true);
    expect(rested.currentStreakDays).toBe(5); // not zeroed
    expect(rested.longestStreakDays).toBe(7); // not lowered
    expect(rested.cumulativeCount).toBe(p.cumulativeCount); // untouched
  });

  it("does not pause on the same/next day", () => {
    const p = makeProgress({ currentStreakDays: 5, lastActiveDate: "2026-01-04" });
    expect(reconcileStreakRest(p, { tz: TZ, now: day(5) }).paused).toBe(false);
  });
});

describe("replenishFreezes", () => {
  it("adds weekly grace days, capped at the max", () => {
    const p = makeProgress({ freezeTokens: 1 });
    const r = replenishFreezes(p, { freezeTokensMax: 2, freezeReplenishPerWeek: 1 }, 1);
    expect(r.freezeTokens).toBe(2);
    const capped = replenishFreezes(r, { freezeTokensMax: 2, freezeReplenishPerWeek: 1 }, 5);
    expect(capped.freezeTokens).toBe(2); // never exceeds the cap
  });
});

describe("streakDisplay (presentation can never show 0/broken)", () => {
  it("active mode shows the day count + a best badge", () => {
    const d = streakDisplay(makeProgress({ currentStreakDays: 4, longestStreakDays: 9 }));
    expect(d).toEqual({ mode: "active", days: 4, best: 9 });
  });

  it("resting mode leads with cumulative + best, never a current-vs-best drop", () => {
    const d = streakDisplay(
      makeProgress({ paused: true, longestStreakDays: 9, cumulativeCount: 312 }),
    );
    expect(d).toEqual({ mode: "resting", best: 9, cumulative: 312 });
  });
});
