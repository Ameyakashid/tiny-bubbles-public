/**
 * dates.test.ts (shared) — M1.1b extraction acceptance: the moved
 * timezone-aware day/daypart helpers behave identically (deterministic,
 * `now`/`tz` passed in, DST-safe calendar-day math).
 */
import { describe, expect, it } from "@jest/globals";

import {
  DAYPART_ORDER,
  daypartFromSchedule,
  diffDays,
  getDaypart,
  isoDay,
  isoWeekKey,
  localHour,
  nextDaypart,
  selectionDaypart,
} from "../../src/domain/dates";

describe("dates — calendar-day helpers survive the move", () => {
  it("isoDay localizes to the child's timezone, not the device's", () => {
    // 2026-06-15T02:00Z is still 2026-06-14 in Mexico City (UTC-6)
    const ts = Date.UTC(2026, 5, 15, 2, 0, 0);
    expect(isoDay(ts, "UTC")).toBe("2026-06-15");
    expect(isoDay(ts, "America/Mexico_City")).toBe("2026-06-14");
  });

  it("isoWeekKey yields the deterministic ISO week clock", () => {
    expect(isoWeekKey(Date.UTC(2026, 5, 15, 12, 0, 0), "UTC")).toMatch(/^2026-W\d{2}$/);
  });

  it("diffDays is whole-calendar-day math on already-localized dates", () => {
    expect(diffDays("2026-06-15", "2026-06-14")).toBe(1);
    expect(diffDays("2026-06-14", "2026-06-15")).toBe(-1);
    expect(diffDays("2026-03-01", "2026-02-28")).toBe(1);
  });

  it("getDaypart buckets the local wall-clock hour; night wraps past midnight", () => {
    const tz = "UTC";
    expect(getDaypart(Date.UTC(2026, 5, 15, 8, 0, 0), tz)).toBe("morning");
    expect(getDaypart(Date.UTC(2026, 5, 15, 13, 0, 0), tz)).toBe("afternoon");
    expect(getDaypart(Date.UTC(2026, 5, 15, 18, 0, 0), tz)).toBe("evening");
    expect(getDaypart(Date.UTC(2026, 5, 15, 22, 0, 0), tz)).toBe("night");
    expect(getDaypart(Date.UTC(2026, 5, 15, 2, 0, 0), tz)).toBe("night"); // wraps
    expect(localHour(Date.UTC(2026, 5, 15, 22, 0, 0), tz)).toBe(22);
  });

  it("daypartFromSchedule maps 'HH:mm' anchors; invalid defaults morning", () => {
    expect(daypartFromSchedule("07:30")).toBe("morning");
    expect(daypartFromSchedule("19:00")).toBe("evening");
    expect(daypartFromSchedule(undefined)).toBe("morning");
    expect(daypartFromSchedule("oops")).toBe("morning");
  });

  it("nextDaypart cycles forward; selectionDaypart collapses night → evening", () => {
    expect(nextDaypart("morning")).toBe("afternoon");
    expect(nextDaypart("night")).toBe("morning");
    expect(selectionDaypart("night")).toBe("evening");
    expect(selectionDaypart("morning")).toBe("morning");
    expect(DAYPART_ORDER).toEqual(["morning", "afternoon", "evening", "night"]);
  });
});
