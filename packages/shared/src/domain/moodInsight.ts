/**
 * domain/moodInsight.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] PURE, unit-testable selectors over `MoodLog[]`
 * (mood-checkin §5). Counts + groupings ONLY — there is deliberately NO
 * interpretation, NO emotional label, NO computed judgment anywhere (ZERO AI,
 * §2.5/§7): the app stores and displays exactly what the child tapped. Every
 * selector's OUTPUT is a count / timeline of literal taps — never a label.
 *
 * `now` / `tz` are passed in (deterministic, like the rest of `src/domain`), so
 * these are fully unit-testable with no device clock. RN-free.
 *
 * The banned-interpretation gate (BUILD-GUIDE §3 + `moodInsight.test.ts`) runs
 * every selector's output through a banned-token check; keep outputs limited to
 * the `Mood`/`Daypart` enum values, ISO days, and numbers.
 */
import { ONE_DAY_MS } from "./constants";
import { getDaypart, isoDay } from "./dates";
import type { Daypart, EpochMs, IsoDay, Mood, MoodLog } from "./types";

/** The 4 moods in ascending order (used to seed zeroed count tables). */
export const MOOD_ORDER: readonly Mood[] = ["rough", "okay", "good", "great"];
const DAYPART_ORDER: readonly Daypart[] = ["morning", "afternoon", "evening", "night"];

/** Per-mood counts (all four keys always present, zero when none). */
export type MoodCounts = Record<Mood, number>;

/** The most recent `n` mood-bearing logs, newest-first (dashboard glance). */
export function recentMoods(logs: readonly MoodLog[], n: number): MoodLog[] {
  return [...logs]
    .filter((l) => l.mood !== undefined)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, Math.max(0, n));
}

/**
 * Counts of each mood for logs whose `day` falls in `[fromDay, toDay]` inclusive.
 * ISO day strings compare lexicographically, so the range check is a plain string
 * compare (no timezone math needed — the `day` was already localized at log time).
 */
export function moodCountsInRange(
  logs: readonly MoodLog[],
  fromDay: IsoDay,
  toDay: IsoDay,
): MoodCounts {
  const counts: MoodCounts = { rough: 0, okay: 0, good: 0, great: 0 };
  for (const l of logs) {
    if (l.mood === undefined) continue;
    if (l.day >= fromDay && l.day <= toDay) counts[l.mood] += 1;
  }
  return counts;
}

/**
 * The mood(s) tapped MOST in a count table — a pure count grouping, never a
 * judgment. Returns [] when the table is all zero, or every mood sharing the max.
 */
export function dominantMoods(counts: MoodCounts): Mood[] {
  const present = MOOD_ORDER.filter((m) => counts[m] > 0);
  if (present.length === 0) return [];
  const max = Math.max(...present.map((m) => counts[m]));
  return present.filter((m) => counts[m] === max);
}

/** Descriptive per-daypart energy: how many readings + their average (0..1). */
export interface DaypartEnergy {
  count: number;
  /** average of `energy / energyScaleMax`, 0..1; 0 when `count === 0` */
  avgNormalized: number;
}

/**
 * Group energy readings by the log's `daypart` (falling back to deriving it from
 * `ts` in `tz` when a legacy log lacks it — mood-checkin §10.6), and average each
 * bucket NORMALIZED against `energyScaleMax` (young 3 / older 5) so a mid-history
 * ageMode switch does not skew the average. Counts + averages only.
 */
export function energyByDaypart(
  logs: readonly MoodLog[],
  tz: string,
): Record<Daypart, DaypartEnergy> {
  const acc: Record<Daypart, { count: number; sum: number }> = {
    morning: { count: 0, sum: 0 },
    afternoon: { count: 0, sum: 0 },
    evening: { count: 0, sum: 0 },
    night: { count: 0, sum: 0 },
  };
  for (const l of logs) {
    if (l.energy === undefined) continue;
    const max = l.energyScaleMax && l.energyScaleMax > 0 ? l.energyScaleMax : 5;
    const dp: Daypart = l.daypart ?? getDaypart(l.ts, tz);
    acc[dp].count += 1;
    acc[dp].sum += Math.min(1, Math.max(0, l.energy / max));
  }
  const out = {} as Record<Daypart, DaypartEnergy>;
  for (const dp of DAYPART_ORDER) {
    const { count, sum } = acc[dp];
    out[dp] = { count, avgNormalized: count > 0 ? sum / count : 0 };
  }
  return out;
}

/** One point on the read-only emoji timeline — literal tapped values only. */
export interface TimelinePoint {
  day: IsoDay;
  ts: EpochMs;
  mood: Mood;
  energy?: number;
  energyScaleMax?: number;
}

/**
 * The mood-bearing logs within the last `days` calendar days (inclusive of today),
 * oldest → newest, for the read-only timeline. Deterministic: the cutoff day is
 * computed from the passed-in `now`/`tz`, not the device clock.
 */
export function moodTimeline(
  logs: readonly MoodLog[],
  days: number,
  now: EpochMs,
  tz: string,
): TimelinePoint[] {
  const cutoff = isoDay(now - Math.max(0, days - 1) * ONE_DAY_MS, tz);
  return [...logs]
    .filter((l) => l.mood !== undefined && l.day >= cutoff)
    .sort((a, b) => a.ts - b.ts)
    .map((l) => ({
      day: l.day,
      ts: l.ts,
      mood: l.mood as Mood,
      energy: l.energy,
      energyScaleMax: l.energyScaleMax,
    }));
}
