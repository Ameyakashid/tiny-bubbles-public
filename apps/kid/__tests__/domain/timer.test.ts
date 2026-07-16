/**
 * __tests__/domain/timer.test.ts — the pure visual-transition-timer math
 * (visual-timers §4 CREATE #3).
 *
 * Proves the helpers are wall-clock anchored (drift-free across a simulated
 * background gap), clamp to a calm rested `0` at/after empty, treat a
 * zero/negative/NaN budget as "no timer" (never a throw), and format a calm
 * tabular `m:ss`. There is NO failure/urgency concept anywhere — empty is `0`,
 * never "time's up."
 */
import { describe, expect, it } from "@jest/globals";

import {
  formatMSS,
  hasVisualTimer,
  timerFraction,
  timerRemainingMs,
} from "../../src/domain/timer";

const T0 = 1_700_000_000_000; // a fixed wall-clock anchor (ms)

describe("hasVisualTimer", () => {
  it("is true only for a positive finite budget", () => {
    expect(hasVisualTimer(60)).toBe(true);
    expect(hasVisualTimer(0.5)).toBe(true);
    expect(hasVisualTimer(0)).toBe(false);
    expect(hasVisualTimer(-30)).toBe(false);
    expect(hasVisualTimer(Number.NaN)).toBe(false);
    expect(hasVisualTimer(Number.POSITIVE_INFINITY)).toBe(false);
    expect(hasVisualTimer(undefined)).toBe(false);
  });
});

describe("timerRemainingMs (wall-clock anchored)", () => {
  it("is the full budget at the start instant", () => {
    expect(timerRemainingMs(T0, 60, T0)).toBe(60_000);
  });

  it("decreases exactly with elapsed wall-clock time", () => {
    // 20s later → 40s left (mirrors "background 20s → foreground shows ~40s").
    expect(timerRemainingMs(T0, 60, T0 + 20_000)).toBe(40_000);
  });

  it("recomputes correctly across a simulated background gap (no drift)", () => {
    // Two 'now' reads with a large gap between them both come straight off the
    // wall clock — the second is not a running total, so there is no drift.
    const beforeBg = timerRemainingMs(T0, 120, T0 + 5_000);
    const afterBg = timerRemainingMs(T0, 120, T0 + 5_000 + 90_000);
    expect(beforeBg).toBe(115_000);
    expect(afterBg).toBe(25_000);
  });

  it("clamps to a calm 0 at and after empty (never negative)", () => {
    expect(timerRemainingMs(T0, 60, T0 + 60_000)).toBe(0);
    expect(timerRemainingMs(T0, 60, T0 + 999_999)).toBe(0);
  });

  it("treats a zero/negative/NaN budget or non-finite start as no timer (0)", () => {
    expect(timerRemainingMs(T0, 0, T0)).toBe(0);
    expect(timerRemainingMs(T0, -30, T0)).toBe(0);
    expect(timerRemainingMs(T0, Number.NaN, T0)).toBe(0);
    expect(timerRemainingMs(Number.NaN, 60, T0)).toBe(0);
  });
});

describe("timerFraction", () => {
  it("is 1 at the start and 0 at/after empty", () => {
    expect(timerFraction(T0, 60, T0)).toBe(1);
    expect(timerFraction(T0, 60, T0 + 60_000)).toBe(0);
    expect(timerFraction(T0, 60, T0 + 120_000)).toBe(0);
  });

  it("is the remaining proportion mid-way", () => {
    expect(timerFraction(T0, 60, T0 + 30_000)).toBeCloseTo(0.5, 5);
    expect(timerFraction(T0, 120, T0 + 90_000)).toBeCloseTo(0.25, 5);
  });

  it("stays within [0,1] and is 0 for a non-timer budget", () => {
    const f = timerFraction(T0, 10, T0 + 3_000);
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThanOrEqual(1);
    expect(timerFraction(T0, 0, T0)).toBe(0);
    expect(timerFraction(T0, -5, T0)).toBe(0);
  });
});

describe("formatMSS", () => {
  it("formats a calm tabular m:ss, rounding up to the whole second", () => {
    expect(formatMSS(0)).toBe("0:00");
    expect(formatMSS(1_000)).toBe("0:01");
    expect(formatMSS(59_000)).toBe("0:59");
    expect(formatMSS(60_000)).toBe("1:00");
    expect(formatMSS(125_000)).toBe("2:05");
    expect(formatMSS(600_000)).toBe("10:00");
  });

  it("rounds a partial second UP (reads 0:00 only when truly spent)", () => {
    expect(formatMSS(200)).toBe("0:01");
    expect(formatMSS(59_400)).toBe("1:00");
  });

  it("never emits a negative/NaN readout", () => {
    expect(formatMSS(-5_000)).toBe("0:00");
    expect(formatMSS(Number.NaN)).toBe("0:00");
  });
});
