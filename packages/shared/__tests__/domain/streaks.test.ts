/**
 * streaks.test.ts (shared) — M1.1b extraction acceptance: the moved forgiving
 * streak math keeps its STRUCTURAL anti-shame guarantees — cumulative is
 * monotonic, a lapse spends grace or gently restarts at 1 (NEVER 0 / "broken"),
 * best only rises, resting (paused) is a display state, never a loss.
 */
import { describe, expect, it } from "@jest/globals";

import {
  applyCompletionToStreak,
  reconcileStreakRest,
  replenishFreezes,
  streakDisplay,
} from "../../src/domain/streaks";
import type { ProgressState } from "../../src/domain/types";

const TZ = "UTC";
const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 5, 10, 12, 0, 0); // 2026-06-10

function progress(over: Partial<ProgressState> = {}): ProgressState {
  return {
    childId: "c1",
    cumulativeCount: 10,
    currentStreakDays: 3,
    longestStreakDays: 5,
    lastActiveDate: "2026-06-10",
    freezeTokens: 2,
    freezeUsedDates: [],
    weekCompletions: 4,
    paused: false,
    ...over,
  };
}

describe("streaks — forgiving math survives the move", () => {
  it("consecutive day extends the streak; cumulative always grows", () => {
    const next = applyCompletionToStreak(progress(), { tz: TZ, now: T0 + DAY });
    expect(next.currentStreakDays).toBe(4);
    expect(next.cumulativeCount).toBe(11);
    expect(next.lastActiveDate).toBe("2026-06-11");
  });

  it("a gap covered by freezes PRESERVES the streak (grace, not loss)", () => {
    // 2 missed days, 2 freezes available
    const next = applyCompletionToStreak(progress(), { tz: TZ, now: T0 + 3 * DAY });
    expect(next.currentStreakDays).toBe(4);
    expect(next.freezeTokens).toBe(0);
    expect(next.freezeUsedDates).toContain("2026-06-13");
  });

  it("a gap beyond grace restarts GENTLY at 1 — never 0, best retained", () => {
    const next = applyCompletionToStreak(progress({ freezeTokens: 0 }), {
      tz: TZ,
      now: T0 + 5 * DAY,
    });
    expect(next.currentStreakDays).toBe(1); // never 0
    expect(next.longestStreakDays).toBe(5); // best never lowered
    expect(next.cumulativeCount).toBe(11); // monotonic
  });

  it("reconcileStreakRest flips to resting after a missed day — display only", () => {
    const rested = reconcileStreakRest(progress(), { tz: TZ, now: T0 + 3 * DAY });
    expect(rested.paused).toBe(true);
    expect(rested.currentStreakDays).toBe(3); // untouched
    expect(rested.cumulativeCount).toBe(10); // untouched
    // same-day open never pauses
    expect(reconcileStreakRest(progress(), { tz: TZ, now: T0 }).paused).toBe(false);
  });

  it("streakDisplay never renders a 0/broken state — active or resting only", () => {
    const active = streakDisplay(progress());
    expect(active).toEqual({ mode: "active", days: 3, best: 5 });
    const resting = streakDisplay(progress({ paused: true }));
    expect(resting).toEqual({ mode: "resting", best: 5, cumulative: 10 });
  });

  it("replenishFreezes is additive-only and capped", () => {
    const p = replenishFreezes(progress({ freezeTokens: 1 }), {
      freezeTokensMax: 2,
      freezeReplenishPerWeek: 1,
    });
    expect(p.freezeTokens).toBe(2);
    const capped = replenishFreezes(p, { freezeTokensMax: 2, freezeReplenishPerWeek: 1 });
    expect(capped.freezeTokens).toBe(2);
  });
});
