/**
 * report.test.ts (shared) — M1.1b extraction acceptance: the moved
 * `buildReport`/`makeRange` keep their v1 contract — pure deterministic
 * window aggregation, streak-safe anti-shame framing, calm-path flag,
 * mood opt-in conditional, daypart gating via showNumbersAndCharts (a
 * resolved capability, never raw ageMode), truncation footnote.
 */
import { describe, expect, it } from "@jest/globals";

import { LEDGER_ENTRY_CAP, ONE_DAY_MS } from "../../src/domain/constants";
import { buildReport, makeRange } from "../../src/domain/report";
import type {
  ChildProfile,
  ChildSettings,
  MoodLog,
  ProgressState,
  RoutineRun,
  TokenEntry,
  TokenLedger,
} from "../../src/domain/types";

const TZ = "UTC";
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

// buildReport reads only calmMode + sensoryMode from settings — a focused
// partial keeps this test decoupled from the kid-only defaults factory.
function settings(over: Partial<ChildSettings> = {}): ChildSettings {
  return { calmMode: false, sensoryMode: "standard", ...over } as ChildSettings;
}

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
    settings: settings(),
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
    ...over,
  };
}

let nextId = 0;
function entry(over: Partial<TokenEntry>): TokenEntry {
  return { id: `e${nextId++}`, ts: NOW, delta: 1, reason: "task_complete", ...over };
}

function build(opts: {
  entries?: TokenEntry[];
  runs?: RoutineRun[];
  moods?: MoodLog[];
  moodLoggingEnabled?: boolean;
  showNumbersAndCharts?: boolean;
  prof?: ChildProfile;
  prog?: ProgressState;
}) {
  const prof = opts.prof ?? profile();
  return buildReport({
    profile: prof,
    ledger: ledger(opts.entries ?? []),
    progress: opts.prog ?? progress(),
    runs: opts.runs ?? [],
    redemptions: [],
    moods: opts.moods ?? [],
    moodLoggingEnabled: opts.moodLoggingEnabled ?? false,
    showNumbersAndCharts: opts.showNumbersAndCharts ?? true,
    range: makeRange("7d", NOW, prof.timeZone),
    now: NOW,
  });
}

describe("makeRange — rolling deterministic windows", () => {
  it("builds a rolling window ending at now", () => {
    const r = makeRange("7d", NOW, TZ);
    expect(r.endTs).toBe(NOW);
    expect(r.startTs).toBe(NOW - 7 * ONE_DAY_MS);
    expect(r.endDay).toBe("2026-06-15");
    expect(r.startDay).toBe("2026-06-08");
  });
});

describe("buildReport — v1 aggregation preserved", () => {
  it("counts steps, earned tokens, active days inside the window only", () => {
    const inWin = entry({ ts: NOW - ONE_DAY_MS });
    const outWin = entry({ ts: NOW - 10 * ONE_DAY_MS });
    const spend = entry({ ts: NOW, delta: -3, reason: "redeem" });
    const m = build({ entries: [inWin, outWin, spend] });
    expect(m.stepsCompleted).toBe(1);
    expect(m.tokensEarnedInPeriod).toBe(1); // spend excluded, out-of-window excluded
    expect(m.daysActive).toBe(1);
    expect(m.daysInRange).toBe(7);
  });

  it("streak flows only through the forgiving streakDisplay selector (anti-shame)", () => {
    const resting = build({ prog: progress({ paused: true }) });
    expect(resting.streak).toEqual({ mode: "resting", best: 9, cumulative: 42 });
    expect(resting.cumulativeBubbles).toBe(42); // monotonic, never derived-negative
  });

  it("calmPath flips from calmMode OR lowStim settings", () => {
    expect(build({}).calmPath).toBe(false);
    expect(build({ prof: profile({ settings: settings({ calmMode: true }) }) }).calmPath).toBe(true);
    expect(
      build({ prof: profile({ settings: settings({ sensoryMode: "lowStim" }) }) }).calmPath,
    ).toBe(true);
  });

  it("daypart breakdown only when showNumbersAndCharts (a resolved capability)", () => {
    const on = build({ entries: [entry({ ts: NOW - 4 * 60 * 60 * 1000 })], showNumbersAndCharts: true });
    expect(on.daypartBreakdown.length).toBe(3);
    const off = build({ entries: [entry({})], showNumbersAndCharts: false });
    expect(off.daypartBreakdown).toEqual([]);
  });

  it("mood card is null unless opted in AND in-window data exists (never an empty teaser)", () => {
    expect(build({ moodLoggingEnabled: false }).mood).toBeNull();
    expect(build({ moodLoggingEnabled: true, moods: [] }).mood).toBeNull();
    const mood: MoodLog = {
      id: "m1",
      childId: "c1",
      ts: NOW - ONE_DAY_MS,
      day: "2026-06-14",
      mood: "good",
      energy: 3,
      energyScaleMax: 3,
    };
    const m = build({ moodLoggingEnabled: true, moods: [mood] });
    expect(m.mood).not.toBeNull();
    expect(m.mood?.counts.good).toBe(1);
    // energy normalized by its OWN scale (3/3 = 1.0) then shown on /5
    expect(m.mood?.energyAvg).toBe(5);
    expect(m.mood?.energyScaleMax).toBe(5);
  });

  it("footnotes truncation when the capped history cannot reach the window start", () => {
    const capped = Array.from({ length: LEDGER_ENTRY_CAP }, (_, i) =>
      entry({ ts: NOW - i * 1000 }), // all recent — oldest newer than startTs
    );
    expect(build({ entries: capped }).historyTruncated).toBe(true);
    expect(build({ entries: [entry({})] }).historyTruncated).toBe(false);
  });

  it("is deterministic — same inputs, same output (no clock/RNG read)", () => {
    const a = build({ entries: [entry({ id: "fixed", ts: NOW - ONE_DAY_MS })] });
    const b = build({ entries: [entry({ id: "fixed", ts: NOW - ONE_DAY_MS })] });
    expect(a).toEqual({ ...b, generatedAt: a.generatedAt });
    expect(a.generatedAt).toBe(NOW);
  });
});
