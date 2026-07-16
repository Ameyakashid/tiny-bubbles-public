/**
 * domain/report.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] the PURE, deterministic on-device progress report model
 * (clinician-reporting §3.2, M-D1).
 *
 * `buildReport` aggregates the SAME durable signals the shipped kid loop already
 * writes (token ledger, routine runs, forgiving `ProgressState`, opt-in `MoodLog`)
 * into a calm, NON-diagnostic summary. It is 100% deterministic aggregation — no
 * clock read (every `now`/`tz` is passed in), NO RNG, NO AI, NO network, NO model
 * call. That makes it unit-testable exactly like the other `src/domain` functions
 * and lets `renderReportHtml` snapshot it.
 *
 * ANTI-SHAME by construction (§6): it never derives a deficit/loss figure.
 * Streak status flows through the forgiving `streakDisplay` selector
 * (resting/active only); the report leads with the monotonic `cumulativeCount`;
 * declined/canceled redemptions are simply not counted. Age-adaptation is content
 * selection via the resolved `showNumbersAndCharts` flag — NEVER a raw `ageMode`.
 */
import { LEDGER_ENTRY_CAP, ONE_DAY_MS, RUNS_CAP } from "./constants";
import { getDaypart, isoDay, selectionDaypart } from "./dates";
import { streakDisplay, type StreakDisplay } from "./streaks";
import type {
  ChildProfile,
  Daypart,
  EpochMs,
  IsoDay,
  Mood,
  MoodLog,
  ProgressState,
  RedemptionRequest,
  RoutineRun,
  TokenEntry,
  TokenLedger,
  TokenReason,
} from "./types";

export type ReportRangeKey = "7d" | "30d" | "90d"; // 90d is premium (advancedInsights)

export interface ReportRange {
  key: ReportRangeKey;
  /** inclusive window start (epoch ms) */
  startTs: EpochMs;
  /** window end (epoch ms) — usually `now` */
  endTs: EpochMs;
  /** ISO day of startTs/endTs in the child's tz (for header + day math) */
  startDay: IsoDay;
  endDay: IsoDay;
}

export interface DaypartTally {
  daypart: "morning" | "afternoon" | "evening";
  stepsDone: number;
}

export interface MoodTally {
  /** rough/okay/good/great tally */
  counts: Record<Mood, number>;
  /**
   * null when no energy logged; averaged AFTER normalizing each log by its own
   * `energyScaleMax` (3 young / 5 older, arch §6-C12) then expressed on the display
   * scale — never the stale 0–10.
   */
  energyAvg: number | null;
  /** the scale to display against (default 5); never the stale 0–10 */
  energyScaleMax: number;
  samples: number;
}

/** Everything the report/PDF renders — fully derived, nothing persisted. */
export interface ReportModel {
  childDisplayName: string;
  ageModeLabel: string; // via resolveContent.ageModeLabel — never raw
  calmPath: boolean; // calmMode || lowStim (drives streak-safe, non-scoreboard framing)
  range: ReportRange;
  stepsCompleted: number; // TokenEntry reason 'task_complete' in window
  routinesFinished: number; // RoutineRun.allDone in window
  tokensEarnedInPeriod: number; // sum of positive earn-reason ledger deltas in window
  lifetimeEarned: number;
  daysActive: number; // distinct ISO days with >=1 completion (capped at daysInRange)
  daysInRange: number; // 7 / 30 / 90
  daypartBreakdown: DaypartTally[]; // only populated when showNumbersAndCharts
  streak: StreakDisplay; // reuse src/domain/streaks.ts streakDisplay()
  cumulativeBubbles: number; // progress.cumulativeCount (never decreases)
  rewardsEnjoyed: number; // redemptions approved|fulfilled in window
  mood: MoodTally | null; // null unless moodLoggingEnabled && has data
  /**
   * True when the capped ledger/run history may not reach back to the window
   * start (the oldest retained entry is newer than `range.startTs` AND the list is
   * at cap) — the report then footnotes "based on the most recent activity on this
   * device". Non-punishing: a truncated history simply undercounts far-back days.
   */
  historyTruncated: boolean;
  generatedAt: EpochMs;
}

export interface BuildReportInput {
  profile: ChildProfile;
  ledger: TokenLedger;
  progress: ProgressState;
  runs: RoutineRun[];
  redemptions: RedemptionRequest[];
  moods: MoodLog[];
  moodLoggingEnabled: boolean;
  showNumbersAndCharts: boolean; // from resolveCapabilities
  range: ReportRange;
  now: EpochMs;
}

/** Days covered by each range key. */
const RANGE_DAYS: Record<ReportRangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

/**
 * The ledger reasons that count as an EARNED bubble in the period. A redeem
 * (spend) and its refund are excluded — a refund is a reversal, not new earning.
 */
const EARN_REASONS: readonly TokenReason[] = [
  "task_complete",
  "routine_complete",
  "cadence_bonus",
  "streak_bonus",
  "quest_reward",
  "parent_gift",
  "seed",
  "adjustment",
];

/** The three parent-facing dayparts (night collapses to evening). */
const REPORT_DAYPARTS: DaypartTally["daypart"][] = ["morning", "afternoon", "evening"];

/**
 * Build a rolling `ReportRange` ending at `now`. Deterministic: `now`/`tz` are
 * passed in. The window is the last `daysInRange × 24h` (rolling, not a punitive
 * calendar boundary) so it is stable across DST and easy to reason about.
 */
export function makeRange(key: ReportRangeKey, now: EpochMs, tz: string): ReportRange {
  const days = RANGE_DAYS[key];
  const startTs = now - days * ONE_DAY_MS;
  return {
    key,
    startTs,
    endTs: now,
    startDay: isoDay(startTs, tz),
    endDay: isoDay(now, tz),
  };
}

/** Whether an epoch ts falls inside the inclusive report window. */
function inWindow(ts: EpochMs, range: ReportRange): boolean {
  return typeof ts === "number" && ts >= range.startTs && ts <= range.endTs;
}

/**
 * PURE, deterministic report builder. Reads only the durable signals passed in;
 * reads no clock, no RNG, no network. Streak-safe + anti-shame by construction.
 */
export function buildReport(input: BuildReportInput): ReportModel {
  const { profile, ledger, progress, runs, redemptions, moods, range } = input;
  const tz = profile.timeZone;
  const daysInRange = RANGE_DAYS[range.key];

  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  const windowEntries = entries.filter((e) => inWindow(e.ts, range));

  // Steps completed = task_complete earn events in the window.
  const stepEntries = windowEntries.filter((e) => e.reason === "task_complete");
  const stepsCompleted = stepEntries.length;

  // Tokens earned this period = sum of positive deltas for genuine earn reasons.
  const tokensEarnedInPeriod = windowEntries.reduce(
    (sum, e) =>
      e.delta > 0 && EARN_REASONS.includes(e.reason) ? sum + e.delta : sum,
    0,
  );

  // Distinct active days (capped at the range so "K of 7" is always sensible).
  const activeDays = new Set<string>();
  for (const e of stepEntries) activeDays.add(isoDay(e.ts, tz));
  const daysActive = Math.min(activeDays.size, daysInRange);

  // Routines finished = fully-completed runs whose completion is in the window.
  const routinesFinished = runs.filter(
    (r) => r.allDone && inWindow(r.completedAt ?? r.startedAt, range),
  ).length;

  // Per-daypart breakdown (older only) — bucketed by the wall-clock daypart each
  // step completion happened in (night collapses to evening). Empty for young.
  let daypartBreakdown: DaypartTally[] = [];
  if (input.showNumbersAndCharts) {
    const byDaypart: Record<DaypartTally["daypart"], number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
    };
    for (const e of stepEntries) {
      const dp = selectionDaypart(getDaypart(e.ts, tz)) as Exclude<Daypart, "night">;
      byDaypart[dp] += 1;
    }
    daypartBreakdown = REPORT_DAYPARTS.map((dp) => ({ daypart: dp, stepsDone: byDaypart[dp] }));
  }

  // Rewards enjoyed = approved/fulfilled redemptions decided in the window.
  const rewardsEnjoyed = redemptions.filter(
    (r) =>
      (r.status === "approved" || r.status === "fulfilled") &&
      inWindow(r.fulfilledAt ?? r.decidedAt ?? r.requestedAt, range),
  ).length;

  // Mood trend — ONLY when opted in AND there is in-window data (else absent card).
  const mood = input.moodLoggingEnabled ? summarizeMood(moods, range) : null;

  // Truncation footnote: the capped history may not reach the window start.
  const oldestEntryTs = entries.length > 0 ? Math.min(...entries.map((e) => e.ts)) : Infinity;
  const oldestRunTs =
    runs.length > 0 ? Math.min(...runs.map((r) => r.startedAt)) : Infinity;
  const historyTruncated =
    (entries.length >= LEDGER_ENTRY_CAP && oldestEntryTs > range.startTs) ||
    (runs.length >= RUNS_CAP && oldestRunTs > range.startTs);

  return {
    childDisplayName: profile.displayName,
    ageModeLabel: "", // filled by the screen via resolveContent.ageModeLabel (never raw)
    calmPath: profile.settings.calmMode || profile.settings.sensoryMode === "lowStim",
    range,
    stepsCompleted,
    routinesFinished,
    tokensEarnedInPeriod,
    lifetimeEarned: Math.max(0, ledger.lifetimeEarned ?? 0),
    daysActive,
    daysInRange,
    daypartBreakdown,
    streak: streakDisplay(progress),
    cumulativeBubbles: Math.max(0, progress.cumulativeCount ?? 0),
    rewardsEnjoyed,
    mood,
    historyTruncated,
    generatedAt: input.now,
  };
}

const EMPTY_MOOD_COUNTS: Record<Mood, number> = { rough: 0, okay: 0, good: 0, great: 0 };

/** The scale a parent-facing mood-energy average is displayed against (never 0–10). */
const MOOD_DISPLAY_SCALE = 5;

/**
 * Tally the in-window mood logs. Returns `null` when there is no usable in-window
 * mood data (so the card is simply absent — never an empty teaser). Energy is
 * normalized by each log's own `energyScaleMax` (3 young / 5 older) BEFORE
 * averaging, so a young↔older switch mid-window doesn't distort the mean; the
 * result is expressed on the display scale (5). NO interpretation — counts +
 * averages only, never an emotional label.
 */
function summarizeMood(moods: MoodLog[], range: ReportRange): MoodTally | null {
  const windowMoods = moods.filter((m) => inWindow(m.ts, range) && m.mood !== undefined);
  if (windowMoods.length === 0) return null;

  const counts: Record<Mood, number> = { ...EMPTY_MOOD_COUNTS };
  for (const m of windowMoods) {
    if (m.mood) counts[m.mood] += 1;
  }

  let normalizedSum = 0;
  let energySamples = 0;
  for (const m of windowMoods) {
    if (typeof m.energy === "number" && Number.isFinite(m.energy)) {
      const scale = typeof m.energyScaleMax === "number" && m.energyScaleMax > 0
        ? m.energyScaleMax
        : MOOD_DISPLAY_SCALE;
      normalizedSum += m.energy / scale;
      energySamples += 1;
    }
  }
  const energyAvg =
    energySamples > 0
      ? Math.round((normalizedSum / energySamples) * MOOD_DISPLAY_SCALE * 10) / 10
      : null;

  return {
    counts,
    energyAvg,
    energyScaleMax: MOOD_DISPLAY_SCALE,
    samples: windowMoods.length,
  };
}
