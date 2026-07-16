/**
 * M4 ADVERSARIAL EDGE TESTS — timezone / DST / local-midnight rollovers.
 *
 * The streak, rollover and scheduling logic keys everything off the CHILD's
 * calendar day (doc 62 §10), derived via `date-fns-tz`'s `formatInTimeZone`.
 * These tests try to break that with the genuinely nasty cases the UTC-only
 * happy-path suite never exercises:
 *   - DST spring-forward (a 23-hour day) and fall-back (a 25-hour day, with a
 *     wall-clock hour that occurs TWICE),
 *   - extreme offsets (UTC+14 vs UTC-10) where one instant is two calendar days,
 *   - the device-vs-child timezone split: the SAME pair of timestamps must yield
 *     different streak/rollover results in different child timezones.
 *
 * If any of these regressed to a naive `(b-a)/MS_PER_DAY`, a DST day would
 * produce a fractional/off-by-one gap and could quietly break a streak — exactly
 * the anti-shame failure mode we forbid.
 */
import { describe, expect, it } from "@jest/globals";

import { diffDays, isoDay } from "../../src/domain/dates";
import { applyCompletionToStreak } from "../../src/domain/streaks";
import { isNewDay, isScheduledToday } from "../../src/domain/tasks";
import type { ProgressState, Task } from "../../src/domain/types";

const NY = "America/New_York";
const UTC = "UTC";

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

function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    childId: "c1",
    templateId: null,
    routineId: null,
    order: 0,
    label: { spokenLabel: "Brush teeth", color: "#5BC8F5" },
    verification: { mode: "none", required: false },
    tokenValue: 1,
    deadline: "today",
    schedule: { daysOfWeek: [] },
    status: "todo",
    createdAt: 0,
    updatedAt: 0,
    archived: false,
    ...over,
  };
}

describe("isoDay honours the CHILD timezone, not the device/UTC", () => {
  it("one instant is two different calendar days across extreme offsets", () => {
    const inst = Date.UTC(2026, 0, 1, 0, 0); // 2026-01-01T00:00Z
    expect(isoDay(inst, "Pacific/Kiritimati")).toBe("2026-01-01"); // UTC+14 -> 14:00
    expect(isoDay(inst, "Pacific/Honolulu")).toBe("2025-12-31"); // UTC-10 -> prev day
    expect(isoDay(inst, UTC)).toBe("2026-01-01");
  });

  it("maps the repeated fall-back wall-clock hour to ONE calendar day", () => {
    // 2026-11-01 01:30 occurs twice in New York (02:00 EDT falls back to 01:00).
    const firstOccurrence = Date.UTC(2026, 10, 1, 5, 30); // 01:30 EDT
    const secondOccurrence = Date.UTC(2026, 10, 1, 6, 30); // 01:30 EST (one hour later)
    expect(isoDay(firstOccurrence, NY)).toBe("2026-11-01");
    expect(isoDay(secondOccurrence, NY)).toBe("2026-11-01");
  });
});

describe("diffDays is CALENDAR-day based (immune to DST short/long days)", () => {
  it("a span containing spring-forward is still 2 whole days", () => {
    // Mar 8 2026 is a 23-hour day in NY; the calendar diff must ignore that.
    expect(diffDays("2026-03-09", "2026-03-07")).toBe(2);
  });

  it("a span containing fall-back is still 2 whole days", () => {
    // Nov 1 2026 is a 25-hour day in NY.
    expect(diffDays("2026-11-02", "2026-10-31")).toBe(2);
  });

  it("is signed and zero on the same day", () => {
    expect(diffDays("2026-03-08", "2026-03-08")).toBe(0);
    expect(diffDays("2026-03-07", "2026-03-09")).toBe(-2);
  });
});

describe("streak rollover keys off the child's local midnight", () => {
  it("the SAME two timestamps advance the streak in NY but not in UTC", () => {
    const a = Date.UTC(2026, 0, 2, 4, 0); // NY: 2026-01-01 23:00 | UTC: 2026-01-02 04:00
    const b = Date.UTC(2026, 0, 2, 6, 0); // NY: 2026-01-02 01:00 | UTC: 2026-01-02 06:00

    // New York: a and b straddle local midnight -> a real consecutive-day streak.
    let ny = applyCompletionToStreak(makeProgress(), { tz: NY, now: a });
    expect(ny.lastActiveDate).toBe("2026-01-01");
    ny = applyCompletionToStreak(ny, { tz: NY, now: b });
    expect(ny.currentStreakDays).toBe(2);
    expect(ny.lastActiveDate).toBe("2026-01-02");

    // UTC: both timestamps are the same calendar day -> same-day, not a new day.
    let utc = applyCompletionToStreak(makeProgress(), { tz: UTC, now: a });
    utc = applyCompletionToStreak(utc, { tz: UTC, now: b });
    expect(utc.currentStreakDays).toBe(1); // gap 0
    expect(utc.cumulativeCount).toBe(2); // cumulative still grows
  });

  it("spring-forward: consecutive 23-hour-day completions never fracture the streak", () => {
    // Mar 7 23:30 EST -> Mar 8 00:30 EST -> Mar 9 noon EDT. Only ~1h separates the
    // first two wall-clock instants, yet they are distinct calendar days.
    let p = applyCompletionToStreak(makeProgress(), { tz: NY, now: Date.UTC(2026, 2, 8, 4, 30) });
    expect(p.lastActiveDate).toBe("2026-03-07");
    p = applyCompletionToStreak(p, { tz: NY, now: Date.UTC(2026, 2, 8, 5, 30) });
    expect(p.currentStreakDays).toBe(2);
    expect(p.lastActiveDate).toBe("2026-03-08");
    p = applyCompletionToStreak(p, { tz: NY, now: Date.UTC(2026, 2, 9, 16, 0) });
    expect(p.currentStreakDays).toBe(3); // the lost hour did not skip/duplicate a day
    expect(p.lastActiveDate).toBe("2026-03-09");
  });

  it("fall-back: the repeated wall-clock hour does NOT double-count a day", () => {
    // Both completions land in the duplicated 01:00–02:00 NY hour on the same date.
    let p = applyCompletionToStreak(makeProgress(), { tz: NY, now: Date.UTC(2026, 10, 1, 5, 30) });
    expect(p.currentStreakDays).toBe(1);
    p = applyCompletionToStreak(p, { tz: NY, now: Date.UTC(2026, 10, 1, 6, 30) });
    expect(p.currentStreakDays).toBe(1); // still the same calendar day -> gap 0
    expect(p.cumulativeCount).toBe(2); // but the completion still counts
    expect(p.lastActiveDate).toBe("2026-11-01");
  });
});

describe("isNewDay + scheduling honour the child timezone", () => {
  it("a late-evening instant is NOT a new day locally but IS in UTC", () => {
    const lateNY = Date.UTC(2026, 0, 2, 4, 0); // 2026-01-01 23:00 in NY
    expect(isNewDay("2026-01-01", lateNY, NY)).toBe(false); // still 'today' for the child
    expect(isNewDay("2026-01-01", lateNY, UTC)).toBe(true); // would have rolled in UTC
    // crossing local midnight DOES roll for the child
    expect(isNewDay("2026-01-01", Date.UTC(2026, 0, 2, 6, 0), NY)).toBe(true);
  });

  it("day-of-week scheduling uses the local calendar day", () => {
    // 2026-01-01 is a Thursday (getUTCDay === 4). At 23:00 NY it is still Thursday,
    // but the SAME instant is already Friday in UTC.
    const thursdayOnly = makeTask({ deadline: "today", schedule: { daysOfWeek: [4] } });
    const lateNY = Date.UTC(2026, 0, 2, 4, 0);
    expect(isScheduledToday(thursdayOnly, lateNY, NY)).toBe(true);
    expect(isScheduledToday(thursdayOnly, lateNY, UTC)).toBe(false); // UTC says Friday
  });
});
