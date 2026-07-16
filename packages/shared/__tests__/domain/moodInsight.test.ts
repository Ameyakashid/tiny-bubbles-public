/**
 * moodInsight.test.ts (shared) — M1.1b extraction acceptance: the moved
 * selectors stay pure count/grouping math — literal tapped values only,
 * NO interpretation, NO emotional label in any output.
 */
import { describe, expect, it } from "@jest/globals";

import {
  dominantMoods,
  energyByDaypart,
  MOOD_ORDER,
  moodCountsInRange,
  moodTimeline,
  recentMoods,
} from "../../src/domain/moodInsight";
import type { MoodLog } from "../../src/domain/types";

const TZ = "UTC";
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

function log(over: Partial<MoodLog>): MoodLog {
  return {
    id: Math.random().toString(36).slice(2),
    childId: "c1",
    ts: NOW,
    day: "2026-06-15",
    mood: "good",
    ...over,
  };
}

describe("moodInsight — pure selectors survive the move", () => {
  it("recentMoods: newest-first, mood-bearing only, capped at n", () => {
    const logs = [
      log({ ts: NOW - 2 * DAY }),
      log({ ts: NOW, mood: undefined }), // energy-only log excluded
      log({ ts: NOW - DAY }),
    ];
    const r = recentMoods(logs, 5);
    expect(r.length).toBe(2);
    expect(r[0].ts).toBe(NOW - DAY);
  });

  it("moodCountsInRange: lexicographic ISO-day window, all four keys present", () => {
    const counts = moodCountsInRange(
      [log({ day: "2026-06-14" }), log({ day: "2026-06-01", mood: "rough" })],
      "2026-06-10",
      "2026-06-15",
    );
    expect(counts).toEqual({ rough: 0, okay: 0, good: 1, great: 0 });
  });

  it("dominantMoods: [] when empty; ties share the max — a count, never a judgment", () => {
    expect(dominantMoods({ rough: 0, okay: 0, good: 0, great: 0 })).toEqual([]);
    expect(dominantMoods({ rough: 0, okay: 2, good: 2, great: 1 }).sort()).toEqual(["good", "okay"]);
    expect(MOOD_ORDER).toEqual(["rough", "okay", "good", "great"]);
  });

  it("energyByDaypart: normalizes by each log's own scale; legacy logs derive daypart from ts", () => {
    const out = energyByDaypart(
      [
        log({ energy: 3, energyScaleMax: 3, daypart: "morning" }), // 1.0
        log({ energy: 5, energyScaleMax: 5, daypart: "morning" }), // 1.0
        log({ energy: 2, energyScaleMax: 5, ts: Date.UTC(2026, 5, 15, 19, 0, 0) }), // legacy → evening
      ],
      TZ,
    );
    expect(out.morning.count).toBe(2);
    expect(out.morning.avgNormalized).toBeCloseTo(1);
    expect(out.evening.count).toBe(1);
    expect(out.evening.avgNormalized).toBeCloseTo(0.4);
    expect(out.night.count).toBe(0);
  });

  it("moodTimeline: cutoff from passed-in now/tz, oldest → newest, literal values", () => {
    const pts = moodTimeline(
      [
        log({ day: "2026-06-15", ts: NOW, mood: "great" }),
        log({ day: "2026-06-13", ts: NOW - 2 * DAY, mood: "okay" }),
        log({ day: "2026-06-01", ts: NOW - 14 * DAY }), // outside 7d
      ],
      7,
      NOW,
      TZ,
    );
    expect(pts.map((p) => p.mood)).toEqual(["okay", "great"]);
  });

  it("outputs contain only enum values / days / numbers — never an interpretation label", () => {
    const counts = moodCountsInRange([log({})], "2026-06-01", "2026-06-30");
    for (const key of Object.keys(counts)) {
      expect(MOOD_ORDER).toContain(key);
    }
  });
});
