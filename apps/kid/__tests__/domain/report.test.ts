/**
 * __tests__/domain/report.test.ts — buildReport / makeRange (clinician-reporting
 * §3.2, M-D1). Pure, deterministic aggregation: window filtering, streak-safe
 * framing, calm-path, mood conditional + energy normalization, daypart gating via
 * showNumbersAndCharts, cap-truncation footnote, and zero-completion forward
 * framing.
 */
import { describe, expect, it } from "@jest/globals";

import { LEDGER_ENTRY_CAP, ONE_DAY_MS } from "../../src/domain/constants";
import { buildReport, makeRange } from "../../src/domain/report";
import type {
  ChildProfile,
  MoodLog,
  ProgressState,
  RedemptionRequest,
  RoutineRun,
  TokenEntry,
  TokenLedger,
} from "../../src/domain/types";
import { defaultChildSettings } from "../../src/domain/constants";

const TZ = "UTC";
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0); // stable "now"

function profile(over: Partial<ChildProfile> = {}): ChildProfile {
  return {
    id: "c1",
    displayName: "Robin",
    ageMode: "older",
    avatarColor: "#5BC8F5",
    timeZone: TZ,
    createdAt: 0,
    updatedAt: 0,
    archived: false,
    settings: defaultChildSettings("older"),
    ...over,
  };
}

function ledger(entries: TokenEntry[], over: Partial<TokenLedger> = {}): TokenLedger {
  return {
    childId: "c1",
    balance: 0,
    heldTokens: 0,
    lifetimeEarned: 100,
    lifetimeSpent: 0,
    lastEarnedAt: NOW,
    entries,
    ...over,
  };
}

function progress(over: Partial<ProgressState> = {}): ProgressState {
  return {
    childId: "c1",
    cumulativeCount: 42,
    currentStreakDays: 3,
    longestStreakDays: 9,
    lastActiveDate: "2026-06-15",
    freezeTokens: 1,
    freezeUsedDates: [],
    weekCompletions: 5,
    paused: false,
    savingTowardRewardId: null,
    ...over,
  };
}

function entry(over: Partial<TokenEntry>): TokenEntry {
  return {
    id: Math.random().toString(36).slice(2),
    ts: NOW,
    delta: 1,
    reason: "task_complete",
    ...over,
  };
}

function build(opts: {
  entries?: TokenEntry[];
  runs?: RoutineRun[];
  redemptions?: RedemptionRequest[];
  moods?: MoodLog[];
  moodLoggingEnabled?: boolean;
  showNumbersAndCharts?: boolean;
  prof?: ChildProfile;
  prog?: ProgressState;
  rangeKey?: "7d" | "30d" | "90d";
}) {
  const prof = opts.prof ?? profile();
  return buildReport({
    profile: prof,
    ledger: ledger(opts.entries ?? []),
    progress: opts.prog ?? progress(),
    runs: opts.runs ?? [],
    redemptions: opts.redemptions ?? [],
    moods: opts.moods ?? [],
    moodLoggingEnabled: opts.moodLoggingEnabled ?? false,
    showNumbersAndCharts: opts.showNumbersAndCharts ?? true,
    range: makeRange(opts.rangeKey ?? "7d", NOW, prof.timeZone),
    now: NOW,
  });
}

describe("makeRange", () => {
  it("builds a rolling window ending at now", () => {
    const r = makeRange("7d", NOW, TZ);
    expect(r.key).toBe("7d");
    expect(r.endTs).toBe(NOW);
    expect(r.startTs).toBe(NOW - 7 * ONE_DAY_MS);
    expect(r.endDay).toBe("2026-06-15");
    expect(r.startDay).toBe("2026-06-08");
  });

  it("scales for 30d and 90d", () => {
    expect(makeRange("30d", NOW, TZ).startTs).toBe(NOW - 30 * ONE_DAY_MS);
    expect(makeRange("90d", NOW, TZ).startTs).toBe(NOW - 90 * ONE_DAY_MS);
  });
});

describe("buildReport — window filtering + counts", () => {
  it("counts only in-window completions + tokens", () => {
    const inWin = NOW - 2 * ONE_DAY_MS;
    const outWin = NOW - 20 * ONE_DAY_MS;
    const m = build({
      entries: [
        entry({ ts: inWin, reason: "task_complete", delta: 1 }),
        entry({ ts: inWin, reason: "task_complete", delta: 1 }),
        entry({ ts: inWin, reason: "parent_gift", delta: 5 }),
        entry({ ts: outWin, reason: "task_complete", delta: 1 }), // excluded (old)
        entry({ ts: inWin, reason: "redeem", delta: -3 }), // spend excluded from earned
      ],
    });
    expect(m.stepsCompleted).toBe(2);
    expect(m.tokensEarnedInPeriod).toBe(7); // 1 + 1 + 5 (gift), redeem excluded
    expect(m.lifetimeEarned).toBe(100);
  });

  it("counts routines finished only when allDone + completed in window", () => {
    const runs: RoutineRun[] = [
      { id: "r1", childId: "c1", routineId: "m", startedAt: NOW - ONE_DAY_MS, completedAt: NOW - ONE_DAY_MS, steps: [], tokensAwarded: 3, allDone: true },
      { id: "r2", childId: "c1", routineId: "m", startedAt: NOW - 2 * ONE_DAY_MS, completedAt: NOW - 2 * ONE_DAY_MS, steps: [], tokensAwarded: 1, allDone: false }, // partial
      { id: "r3", childId: "c1", routineId: "m", startedAt: NOW - 40 * ONE_DAY_MS, completedAt: NOW - 40 * ONE_DAY_MS, steps: [], tokensAwarded: 3, allDone: true }, // old
    ];
    expect(build({ runs }).routinesFinished).toBe(1);
  });

  it("counts distinct active days, capped at the range", () => {
    const d = (n: number) => NOW - n * ONE_DAY_MS;
    const m = build({
      entries: [
        entry({ ts: d(1) }),
        entry({ ts: d(1) }), // same day
        entry({ ts: d(2) }),
        entry({ ts: d(3) }),
      ],
    });
    expect(m.daysActive).toBe(3);
    expect(m.daysInRange).toBe(7);
  });
});

describe("buildReport — streak-safe framing (anti-shame)", () => {
  it("a resting streak surfaces cumulative + best, never 0/broken", () => {
    const m = build({ prog: progress({ paused: true, cumulativeCount: 88, longestStreakDays: 12 }) });
    expect(m.streak.mode).toBe("resting");
    if (m.streak.mode === "resting") {
      expect(m.streak.cumulative).toBe(88);
      expect(m.streak.best).toBe(12);
    }
    expect(m.cumulativeBubbles).toBe(88);
  });

  it("an active streak shows days + best", () => {
    const m = build({ prog: progress({ paused: false, currentStreakDays: 4, longestStreakDays: 9 }) });
    expect(m.streak.mode).toBe("active");
    if (m.streak.mode === "active") {
      expect(m.streak.days).toBe(4);
      expect(m.streak.best).toBe(9);
    }
  });
});

describe("buildReport — age-adaptation + calm path", () => {
  it("omits the daypart breakdown when showNumbersAndCharts is false (young)", () => {
    const m = build({
      showNumbersAndCharts: false,
      entries: [entry({ ts: NOW - ONE_DAY_MS })],
    });
    expect(m.daypartBreakdown).toEqual([]);
  });

  it("populates the daypart breakdown when showNumbersAndCharts is true (older)", () => {
    // 08:00, 14:00, 19:00 UTC → morning / afternoon / evening
    const at = (h: number) => Date.UTC(2026, 5, 14, h, 0, 0);
    const m = build({
      showNumbersAndCharts: true,
      entries: [entry({ ts: at(8) }), entry({ ts: at(14) }), entry({ ts: at(14) }), entry({ ts: at(19) })],
    });
    const by = Object.fromEntries(m.daypartBreakdown.map((d) => [d.daypart, d.stepsDone]));
    expect(by.morning).toBe(1);
    expect(by.afternoon).toBe(2);
    expect(by.evening).toBe(1);
  });

  it("flags calmPath for a calmMode / lowStim child", () => {
    const calm = profile({ settings: { ...defaultChildSettings("older"), calmMode: true } });
    expect(build({ prof: calm }).calmPath).toBe(true);
    const low = profile({ settings: { ...defaultChildSettings("older"), sensoryMode: "lowStim" } });
    expect(build({ prof: low }).calmPath).toBe(true);
    expect(build({}).calmPath).toBe(false);
  });
});

describe("buildReport — mood (opt-in + normalized energy)", () => {
  const mood = (over: Partial<MoodLog>): MoodLog => ({
    id: Math.random().toString(36).slice(2),
    childId: "c1",
    ts: NOW - ONE_DAY_MS,
    day: "2026-06-14",
    mood: "good",
    ...over,
  });

  it("is null when mood logging is off", () => {
    expect(build({ moodLoggingEnabled: false, moods: [mood({})] }).mood).toBeNull();
  });

  it("is null when opted in but no in-window data", () => {
    expect(
      build({ moodLoggingEnabled: true, moods: [mood({ ts: NOW - 40 * ONE_DAY_MS })] }).mood,
    ).toBeNull();
  });

  it("tallies counts + averages energy AGAINST energyScaleMax (never 0–10)", () => {
    const m = build({
      moodLoggingEnabled: true,
      moods: [
        mood({ mood: "great", energy: 3, energyScaleMax: 3 }), // 3/3 = 1.0
        mood({ mood: "okay", energy: 5, energyScaleMax: 5 }), // 5/5 = 1.0
        mood({ mood: "good" }), // no energy
      ],
    });
    expect(m.mood).not.toBeNull();
    expect(m.mood!.counts.great).toBe(1);
    expect(m.mood!.counts.okay).toBe(1);
    expect(m.mood!.counts.good).toBe(1);
    expect(m.mood!.samples).toBe(3);
    expect(m.mood!.energyScaleMax).toBe(5);
    // normalized mean 1.0 → displayed on the 5-scale = 5.0 (NOT a stale 0–10 figure)
    expect(m.mood!.energyAvg).toBe(5);
  });
});

describe("buildReport — rewards + truncation + empty", () => {
  it("counts only approved/fulfilled redemptions in window (never declined)", () => {
    const red = (over: Partial<RedemptionRequest>): RedemptionRequest => ({
      id: Math.random().toString(36).slice(2),
      childId: "c1",
      rewardId: "rw1",
      costTokens: 5,
      status: "approved",
      requestedAt: NOW - ONE_DAY_MS,
      decidedAt: NOW - ONE_DAY_MS,
      ...over,
    });
    const m = build({
      redemptions: [
        red({ status: "approved" }),
        red({ status: "fulfilled" }),
        red({ status: "declined" }), // not surfaced
        red({ status: "approved", decidedAt: NOW - 40 * ONE_DAY_MS }), // old
      ],
    });
    expect(m.rewardsEnjoyed).toBe(2);
  });

  it("flags historyTruncated when a capped ledger cannot reach the window start", () => {
    // 500 entries, all newer than the 7d window start → the far-back days are unknown
    const entries: TokenEntry[] = [];
    for (let i = 0; i < LEDGER_ENTRY_CAP; i++) {
      entries.push(entry({ ts: NOW - i * 60_000, reason: "task_complete" }));
    }
    expect(build({ entries }).historyTruncated).toBe(true);
    // A short, uncapped history is not "truncated"
    expect(build({ entries: [entry({ ts: NOW })] }).historyTruncated).toBe(false);
  });

  it("frames a brand-new child with zero completions forwardly (no negatives)", () => {
    const m = build({ entries: [], prog: progress({ cumulativeCount: 0, currentStreakDays: 0, longestStreakDays: 0, lastActiveDate: null, paused: false }) });
    expect(m.stepsCompleted).toBe(0);
    expect(m.routinesFinished).toBe(0);
    expect(m.daysActive).toBe(0);
  });
});
