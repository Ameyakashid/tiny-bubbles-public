/**
 * __tests__/domain/novelty.test.ts — deterministic spotlight + seasonal cadence
 * (novelty-refresh §2.2/§2.3/§2.6, M-C4). No RNG: every helper is a pure function
 * of the date + the (additive-only) pack list.
 */
import { describe, expect, it } from "@jest/globals";

import { dayOfYear, isoWeekKey } from "../../src/domain/dates";
import {
  FEATURED_DAYPART_BONUS,
  featuredDaypartFor,
  featuredPackFor,
  isFeaturedDaypart,
  isSeasonalNew,
  SEASONAL_NEW_WINDOW_MS,
} from "../../src/domain/novelty";
import type { SeasonalPack } from "../../src/domain/types";

const SPOTLIGHT = ["morning", "afternoon", "evening"] as const;

describe("featuredDaypartFor (deterministic day-of-year spotlight)", () => {
  it("is a pure function of the local day-of-year (matches the derivation)", () => {
    const ts = Date.UTC(2026, 5, 27, 9, 0, 0); // 2026-06-27
    const expected = SPOTLIGHT[dayOfYear(ts, "UTC") % 3];
    expect(featuredDaypartFor(ts, "UTC")).toBe(expected);
  });

  it("is STABLE for the whole local day (same result at different times)", () => {
    const morn = Date.UTC(2026, 5, 27, 6, 30, 0);
    const night = Date.UTC(2026, 5, 27, 22, 15, 0);
    expect(featuredDaypartFor(morn, "UTC")).toBe(featuredDaypartFor(night, "UTC"));
  });

  it("is identical across repeated calls ('devices') for the same inputs", () => {
    const ts = Date.UTC(2026, 2, 3, 12, 0, 0);
    expect(featuredDaypartFor(ts, "America/Mexico_City")).toBe(
      featuredDaypartFor(ts, "America/Mexico_City"),
    );
  });

  it("never returns night (spotlight is a real daypart routine)", () => {
    for (let d = 0; d < 366; d++) {
      const ts = Date.UTC(2026, 0, 1) + d * 24 * 60 * 60 * 1000;
      expect(SPOTLIGHT).toContain(featuredDaypartFor(ts, "UTC"));
    }
  });

  it("FEATURED_DAYPART_BONUS is a fixed positive magnitude (not a chance drop)", () => {
    expect(FEATURED_DAYPART_BONUS).toBe(2);
  });

  it("isFeaturedDaypart collapses night to evening for matching", () => {
    // pick a day whose spotlight is evening, then assert a `night` routine matches it
    let ts = Date.UTC(2026, 0, 1);
    while (featuredDaypartFor(ts, "UTC") !== "evening") ts += 24 * 60 * 60 * 1000;
    expect(isFeaturedDaypart("night", ts, "UTC")).toBe(true);
    expect(isFeaturedDaypart("evening", ts, "UTC")).toBe(true);
    expect(isFeaturedDaypart("morning", ts, "UTC")).toBe(false);
  });
});

describe("isoWeekKey (deterministic weekly rotation clock)", () => {
  it("formats an ISO week-numbering key + is stable across a day", () => {
    const a = Date.UTC(2026, 5, 27, 1, 0, 0);
    const b = Date.UTC(2026, 5, 27, 23, 0, 0);
    expect(isoWeekKey(a, "UTC")).toMatch(/^\d{4}-W\d{2}$/);
    expect(isoWeekKey(a, "UTC")).toBe(isoWeekKey(b, "UTC"));
  });
});

describe("featuredPackFor + isSeasonalNew (additive-only, no expiry)", () => {
  const now = Date.UTC(2026, 6, 1); // 2026-07-01
  const packs: SeasonalPack[] = [
    { id: "spring", label: { spokenLabel: "Spring", color: "#f" }, availableFrom: Date.UTC(2026, 2, 20), cosmeticIds: ["c_spring"] },
    { id: "summer", label: { spokenLabel: "Summer", color: "#f" }, availableFrom: Date.UTC(2026, 5, 21), cosmeticIds: ["c_summer"] },
    { id: "autumn", label: { spokenLabel: "Autumn", color: "#f" }, availableFrom: Date.UTC(2026, 8, 22), cosmeticIds: ["c_autumn"] },
    { id: "undated", label: { spokenLabel: "Base", color: "#f" }, cosmeticIds: ["c_base"] },
  ];

  it("returns the MOST RECENTLY appeared pack (not a future one)", () => {
    expect(featuredPackFor(now, packs)?.id).toBe("summer");
  });

  it("ignores future + undated packs; undefined when none has appeared", () => {
    const early = Date.UTC(2026, 0, 1); // before spring
    expect(featuredPackFor(early, packs)).toBeUndefined();
  });

  it("isSeasonalNew is true only within the recent window after appearance", () => {
    // summer appeared Jun 21; now is Jul 1 (10 days later) → within 30d window
    expect(isSeasonalNew("summer", now, packs)).toBe(true);
    // spring appeared Mar 20 → far outside the window
    expect(isSeasonalNew("spring", now, packs)).toBe(false);
    // autumn is still in the future → not new (not yet visible)
    expect(isSeasonalNew("autumn", now, packs)).toBe(false);
    // base / undefined pack → never "new"
    expect(isSeasonalNew(undefined, now, packs)).toBe(false);
    expect(isSeasonalNew("undated", now, packs)).toBe(false);
  });

  it("the window edge is inclusive + tunable", () => {
    const pack: SeasonalPack[] = [
      { id: "p", label: { spokenLabel: "P", color: "#f" }, availableFrom: now - SEASONAL_NEW_WINDOW_MS, cosmeticIds: [] },
    ];
    expect(isSeasonalNew("p", now, pack)).toBe(true);
    expect(isSeasonalNew("p", now + 1, pack)).toBe(false); // just past the window
  });
});
