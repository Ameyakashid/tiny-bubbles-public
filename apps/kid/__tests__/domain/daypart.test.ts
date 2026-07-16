/**
 * Daypart engine (doc 70 §A) — the time-driven kid flow keys off `getDaypart`.
 *
 * These lock down the boundary hours (a routine picked one hour off would send
 * the kid to the wrong daypart), the midnight `night` wrap (a late-evening open
 * must NEVER fall back to morning — the shipped bug), child-timezone awareness,
 * and the schedule-anchor fallback used when a persisted routine has no explicit
 * `daypart`. Pure & deterministic: every `now`/`tz` is passed in.
 */
import { describe, expect, it } from "@jest/globals";

import {
  DAYPART_ORDER,
  DEFAULT_DAYPART_WINDOWS,
  daypartFromSchedule,
  getDaypart,
  localHour,
  nextDaypart,
} from "../../src/domain/dates";
import type { Daypart } from "../../src/domain/types";

const UTC = "UTC";
const NY = "America/New_York"; // UTC-5 in January (EST)

/** epoch ms at a given UTC wall-clock hour on a fixed date. */
const atHour = (h: number, min = 0): number => Date.UTC(2026, 0, 15, h, min);

describe("localHour reads the child's wall-clock hour (0-23)", () => {
  it("returns the UTC hour for the UTC zone", () => {
    expect(localHour(atHour(0), UTC)).toBe(0);
    expect(localHour(atHour(9, 59), UTC)).toBe(9);
    expect(localHour(atHour(23), UTC)).toBe(23);
  });

  it("shifts into the child's timezone (same instant, different local hour)", () => {
    // 06:00 UTC is 01:00 in New York (EST, UTC-5).
    expect(localHour(atHour(6), NY)).toBe(1);
  });
});

describe("getDaypart — every window with default boundaries", () => {
  const W = DEFAULT_DAYPART_WINDOWS; // { morning:5, afternoon:12, evening:17, night:21 }

  it("midnight and pre-dawn hours are night (never morning)", () => {
    expect(getDaypart(atHour(0), UTC)).toBe("night"); // exact midnight
    expect(getDaypart(atHour(3), UTC)).toBe("night");
    expect(getDaypart(atHour(W.morning - 1, 59), UTC)).toBe("night"); // 04:59
  });

  it("morning window [5,12)", () => {
    expect(getDaypart(atHour(W.morning), UTC)).toBe("morning"); // 05:00 boundary
    expect(getDaypart(atHour(8), UTC)).toBe("morning");
    expect(getDaypart(atHour(W.afternoon - 1, 59), UTC)).toBe("morning"); // 11:59
  });

  it("afternoon window [12,17)", () => {
    expect(getDaypart(atHour(W.afternoon), UTC)).toBe("afternoon"); // 12:00 boundary
    expect(getDaypart(atHour(15), UTC)).toBe("afternoon");
    expect(getDaypart(atHour(W.evening - 1, 59), UTC)).toBe("afternoon"); // 16:59
  });

  it("evening window [17,21)", () => {
    expect(getDaypart(atHour(W.evening), UTC)).toBe("evening"); // 17:00 boundary
    expect(getDaypart(atHour(19), UTC)).toBe("evening");
    expect(getDaypart(atHour(W.night - 1, 59), UTC)).toBe("evening"); // 20:59
  });

  it("night window [21,24) wraps past midnight", () => {
    expect(getDaypart(atHour(W.night), UTC)).toBe("night"); // 21:00 boundary
    expect(getDaypart(atHour(23, 59), UTC)).toBe("night");
  });

  it("resolves against the CHILD timezone, not the device/UTC", () => {
    // 23:00 UTC is 18:00 (evening) in New York — same instant, different daypart.
    expect(getDaypart(atHour(23), UTC)).toBe("night");
    expect(getDaypart(atHour(23), NY)).toBe("evening");
  });

  it("honours custom (parent-tunable) windows", () => {
    const w = { morning: 6, afternoon: 13, evening: 18, night: 22 };
    expect(getDaypart(atHour(5), UTC, w)).toBe("night"); // before the later morning
    expect(getDaypart(atHour(6), UTC, w)).toBe("morning");
    expect(getDaypart(atHour(21), UTC, w)).toBe("evening"); // still evening until 22
    expect(getDaypart(atHour(22), UTC, w)).toBe("night");
  });
});

describe("daypartFromSchedule — 'HH:mm' anchor fallback", () => {
  it("buckets the seeded routine anchors", () => {
    expect(daypartFromSchedule("07:00")).toBe("morning");
    expect(daypartFromSchedule("16:00")).toBe("afternoon");
    expect(daypartFromSchedule("19:30")).toBe("evening");
    expect(daypartFromSchedule("21:30")).toBe("night");
    expect(daypartFromSchedule("00:30")).toBe("night");
  });

  it("defaults to morning for a missing/invalid anchor", () => {
    expect(daypartFromSchedule(undefined)).toBe("morning");
    expect(daypartFromSchedule("")).toBe("morning");
    expect(daypartFromSchedule("not-a-time")).toBe("morning");
  });
});

describe("nextDaypart — forward chain for the calm 'see you this <next>' copy", () => {
  it("advances morning -> afternoon -> evening -> night -> morning", () => {
    expect(nextDaypart("morning")).toBe("afternoon");
    expect(nextDaypart("afternoon")).toBe("evening");
    expect(nextDaypart("evening")).toBe("night");
    expect(nextDaypart("night")).toBe("morning"); // wraps to next day's morning
  });

  it("DAYPART_ORDER is the canonical forward order", () => {
    const order: Daypart[] = ["morning", "afternoon", "evening", "night"];
    expect(DAYPART_ORDER).toEqual(order);
  });
});
