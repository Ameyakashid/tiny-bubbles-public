import { describe, expect, it } from "@jest/globals";

import {
  dominantMoods,
  energyByDaypart,
  moodCountsInRange,
  moodTimeline,
  recentMoods,
} from "../../src/domain/moodInsight";
import type { MoodLog } from "../../src/domain/types";

const TZ = "UTC";
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0); // 2026-06-15 12:00 UTC

const LOGS: MoodLog[] = [
  { id: "m1", childId: "c1", ts: Date.UTC(2026, 5, 15, 8, 0), day: "2026-06-15", mood: "good", energy: 2, energyScaleMax: 3, daypart: "morning", source: "kid" },
  { id: "m2", childId: "c1", ts: Date.UTC(2026, 5, 15, 9, 0), day: "2026-06-15", mood: "great", energy: 3, energyScaleMax: 3, daypart: "morning", source: "kid" },
  { id: "m3", childId: "c1", ts: Date.UTC(2026, 5, 14, 18, 0), day: "2026-06-14", mood: "okay", energy: 2, energyScaleMax: 5, daypart: "evening", source: "kid" },
  { id: "m4", childId: "c1", ts: Date.UTC(2026, 5, 13, 13, 0), day: "2026-06-13", mood: "good", energy: 4, energyScaleMax: 5, daypart: "afternoon", source: "kid" },
  { id: "m5", childId: "c1", ts: Date.UTC(2026, 5, 1, 10, 0), day: "2026-06-01", mood: "rough", energy: 1, energyScaleMax: 5, daypart: "morning", source: "kid" },
  { id: "m6", childId: "c1", ts: Date.UTC(2026, 5, 15, 7, 0), day: "2026-06-15" }, // no mood / no energy
];

describe("moodInsight — pure selectors (counts / timelines only)", () => {
  it("recentMoods returns newest-first, mood-only, capped", () => {
    const r = recentMoods(LOGS, 3);
    expect(r.map((l) => l.id)).toEqual(["m2", "m1", "m3"]);
    expect(r.every((l) => l.mood !== undefined)).toBe(true);
  });

  it("moodCountsInRange counts literal taps within [from,to] inclusive", () => {
    const counts = moodCountsInRange(LOGS, "2026-06-13", "2026-06-15");
    expect(counts).toEqual({ rough: 0, okay: 1, good: 2, great: 1 });
  });

  it("dominantMoods returns the most-tapped mood(s); [] when empty", () => {
    expect(dominantMoods(moodCountsInRange(LOGS, "2026-06-13", "2026-06-15"))).toEqual(["good"]);
    expect(dominantMoods({ rough: 0, okay: 0, good: 0, great: 0 })).toEqual([]);
  });

  it("energyByDaypart buckets + averages NORMALIZED against energyScaleMax", () => {
    const e = energyByDaypart(LOGS, TZ);
    expect(e.morning.count).toBe(3); // m1, m2, m5
    // (2/3 + 3/3 + 1/5) / 3
    expect(e.morning.avgNormalized).toBeCloseTo((2 / 3 + 1 + 1 / 5) / 3, 5);
    expect(e.afternoon.count).toBe(1);
    expect(e.afternoon.avgNormalized).toBeCloseTo(0.8, 5);
    expect(e.evening.count).toBe(1);
    expect(e.night.count).toBe(0);
    expect(e.night.avgNormalized).toBe(0);
  });

  it("energyByDaypart derives the daypart from ts when a legacy log lacks it", () => {
    const legacy: MoodLog[] = [
      // 08:00 UTC → morning; no `daypart` field → derived from ts
      { id: "L1", childId: "c1", ts: Date.UTC(2026, 5, 10, 8, 0), day: "2026-06-10", mood: "good", energy: 5, energyScaleMax: 5 },
    ];
    const e = energyByDaypart(legacy, TZ);
    expect(e.morning.count).toBe(1);
    expect(e.morning.avgNormalized).toBeCloseTo(1, 5);
  });

  it("moodTimeline is chronological + windowed to the last N days", () => {
    const tl = moodTimeline(LOGS, 7, NOW, TZ);
    expect(tl.map((p) => p.day)).toEqual(["2026-06-13", "2026-06-14", "2026-06-15", "2026-06-15"]);
    // m5 (2026-06-01) is outside the 7-day window; m6 (no mood) is excluded.
    expect(tl.every((p) => p.mood !== undefined)).toBe(true);
  });
});

/**
 * ZERO-AI enforcement (mood-checkin §2.5/§7): every selector OUTPUT is a count /
 * timeline of literal taps — NEVER an emotional label / interpretation. Parity with
 * `reportHtml`'s banned-word test: run each output through the banned-token check.
 */
describe("moodInsight — no interpretation in any selector output (ZERO AI)", () => {
  const BANNED =
    /anxious|sad\b|struggling|worse|concern|risk\b|seems |likely|needs attention|trend(ing)? (down|up)|mostly rough/i;

  it("no selector output contains an interpretive token", () => {
    const outputs = [
      recentMoods(LOGS, 10),
      moodCountsInRange(LOGS, "2026-06-01", "2026-06-15"),
      dominantMoods(moodCountsInRange(LOGS, "2026-06-01", "2026-06-15")),
      energyByDaypart(LOGS, TZ),
      moodTimeline(LOGS, 30, NOW, TZ),
    ];
    for (const out of outputs) {
      expect(JSON.stringify(out)).not.toMatch(BANNED);
    }
  });
});
