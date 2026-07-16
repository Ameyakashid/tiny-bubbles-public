/**
 * __tests__/domain/focus.test.ts — the pure focus-interval math (focus-intervals
 * §4 CREATE #8).
 *
 * Proves the helpers are wall-clock anchored (drift-free across a simulated
 * background gap), clamp to a calm rested `0` at/after empty, treat a
 * zero/negative/NaN budget as "no timer" (never a throw), rotate movement prompts
 * DETERMINISTICALLY (no RNG — the same start yields the same order), and coerce a
 * persisted minute value to the nearest curated option. There is NO failure/urgency
 * concept anywhere — empty is `0`, never "time's up".
 */
import { describe, expect, it } from "@jest/globals";

import {
  BREAK_MINUTE_OPTIONS,
  DEFAULT_FOCUS_INTERVALS,
  FOCUS_MINUTE_OPTIONS,
  focusConfigOf,
  focusFraction,
  focusRemainingMs,
  formatMSS,
  nearestMinuteOption,
  nextMovementPrompt,
} from "../../src/domain/focus";
import { MOVEMENT_PROMPTS } from "../../src/data/focusBreaks";
import type { ChildSettings, MovementPrompt } from "../../src/domain/types";

const T0 = 1_700_000_000_000; // fixed wall-clock anchor (ms)

describe("curated constants + defaults", () => {
  it("defaults to a NON-rigid 15/5 (never the fatiguing rigid 25/5)", () => {
    expect(DEFAULT_FOCUS_INTERVALS.focusMinutes).toBe(15);
    expect(DEFAULT_FOCUS_INTERVALS.breakMinutes).toBe(5);
    expect(DEFAULT_FOCUS_INTERVALS.enabled).toBe(false); // parent opt-in, off by default
    expect(DEFAULT_FOCUS_INTERVALS.movementBreaks).toBe(true);
    expect(DEFAULT_FOCUS_INTERVALS.chime).toBe(true);
  });

  it("offers curated short lists (25 is offered, not forced; default is 15)", () => {
    expect([...FOCUS_MINUTE_OPTIONS]).toEqual([10, 15, 20, 25]);
    expect([...BREAK_MINUTE_OPTIONS]).toEqual([3, 5, 10]);
    expect(FOCUS_MINUTE_OPTIONS).toContain(DEFAULT_FOCUS_INTERVALS.focusMinutes);
    expect(BREAK_MINUTE_OPTIONS).toContain(DEFAULT_FOCUS_INTERVALS.breakMinutes);
  });
});

describe("focusConfigOf", () => {
  it("falls back to defaults when the child has no focusIntervals", () => {
    const cfg = focusConfigOf({} as unknown as ChildSettings);
    expect(cfg).toEqual(DEFAULT_FOCUS_INTERVALS);
  });

  it("returns the saved config (merged over defaults) when present", () => {
    const settings = {
      focusIntervals: {
        enabled: true,
        focusMinutes: 25,
        breakMinutes: 10,
        movementBreaks: false,
        chime: false,
      },
    } as unknown as ChildSettings;
    const cfg = focusConfigOf(settings);
    expect(cfg.enabled).toBe(true);
    expect(cfg.focusMinutes).toBe(25);
    expect(cfg.breakMinutes).toBe(10);
    expect(cfg.movementBreaks).toBe(false);
    expect(cfg.chime).toBe(false);
  });
});

describe("focusRemainingMs (wall-clock anchored)", () => {
  it("is the full budget at the start instant", () => {
    expect(focusRemainingMs(T0, 15, T0)).toBe(15 * 60_000);
  });

  it("decreases exactly with elapsed wall-clock time", () => {
    expect(focusRemainingMs(T0, 10, T0 + 3 * 60_000)).toBe(7 * 60_000);
  });

  it("recomputes correctly across a simulated background gap (no drift)", () => {
    // background ~90s during a 5-min break → foreground shows ~90s less, off the
    // wall clock (not a running total), so there is no drift.
    const before = focusRemainingMs(T0, 5, T0 + 60_000);
    const after = focusRemainingMs(T0, 5, T0 + 60_000 + 90_000);
    expect(before).toBe(4 * 60_000);
    expect(after).toBe(4 * 60_000 - 90_000);
  });

  it("clamps to a calm 0 at and after empty (never negative)", () => {
    expect(focusRemainingMs(T0, 10, T0 + 10 * 60_000)).toBe(0);
    expect(focusRemainingMs(T0, 10, T0 + 999 * 60_000)).toBe(0);
  });

  it("treats a zero/negative/NaN minutes or non-finite start as no timer (0)", () => {
    expect(focusRemainingMs(T0, 0, T0)).toBe(0);
    expect(focusRemainingMs(T0, -5, T0)).toBe(0);
    expect(focusRemainingMs(T0, Number.NaN, T0)).toBe(0);
    expect(focusRemainingMs(Number.NaN, 10, T0)).toBe(0);
  });
});

describe("focusFraction", () => {
  it("is 1 at the start and 0 at/after empty", () => {
    expect(focusFraction(T0, 15, T0)).toBe(1);
    expect(focusFraction(T0, 15, T0 + 15 * 60_000)).toBe(0);
    expect(focusFraction(T0, 15, T0 + 30 * 60_000)).toBe(0);
  });

  it("is the remaining proportion mid-way", () => {
    expect(focusFraction(T0, 10, T0 + 5 * 60_000)).toBeCloseTo(0.5, 5);
    expect(focusFraction(T0, 20, T0 + 15 * 60_000)).toBeCloseTo(0.25, 5);
  });

  it("stays within [0,1] and is 0 for a non-timer budget", () => {
    const f = focusFraction(T0, 10, T0 + 60_000);
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThanOrEqual(1);
    expect(focusFraction(T0, 0, T0)).toBe(0);
    expect(focusFraction(T0, -5, T0)).toBe(0);
  });
});

describe("nextMovementPrompt (deterministic rotation — no RNG)", () => {
  const prompts: MovementPrompt[] = [
    { id: "a", spokenLabel: "A", emoji: "🅰️" },
    { id: "b", spokenLabel: "B", emoji: "🅱️" },
    { id: "c", spokenLabel: "C", emoji: "🇨" },
  ];

  it("returns the prompt at the index and the next index (mod length)", () => {
    expect(nextMovementPrompt(0, prompts)).toEqual({ prompt: prompts[0], nextIndex: 1 });
    expect(nextMovementPrompt(1, prompts)).toEqual({ prompt: prompts[1], nextIndex: 2 });
    expect(nextMovementPrompt(2, prompts)).toEqual({ prompt: prompts[2], nextIndex: 0 });
  });

  it("wraps deterministically for out-of-range / negative indices", () => {
    expect(nextMovementPrompt(3, prompts).prompt).toBe(prompts[0]);
    expect(nextMovementPrompt(5, prompts).prompt).toBe(prompts[2]);
    expect(nextMovementPrompt(-1, prompts).prompt).toBe(prompts[2]);
  });

  it("yields the SAME order for the same starting index (testable, reproducible)", () => {
    const orderA: string[] = [];
    const orderB: string[] = [];
    let ia = 0;
    let ib = 0;
    for (let n = 0; n < 7; n++) {
      const a = nextMovementPrompt(ia, prompts);
      const b = nextMovementPrompt(ib, prompts);
      orderA.push(a.prompt!.id);
      orderB.push(b.prompt!.id);
      ia = a.nextIndex;
      ib = b.nextIndex;
    }
    expect(orderA).toEqual(orderB);
    expect(orderA).toEqual(["a", "b", "c", "a", "b", "c", "a"]);
  });

  it("never throws on an empty list", () => {
    expect(nextMovementPrompt(0, [])).toEqual({ prompt: undefined, nextIndex: 0 });
  });

  it("the shipped curated list is non-empty and every prompt has a spoken label", () => {
    expect(MOVEMENT_PROMPTS.length).toBeGreaterThan(0);
    for (const p of MOVEMENT_PROMPTS) {
      expect(typeof p.spokenLabel).toBe("string");
      expect(p.spokenLabel.length).toBeGreaterThan(0);
      expect(typeof p.emoji).toBe("string");
    }
  });
});

describe("nearestMinuteOption (defensive repair)", () => {
  it("snaps to the nearest curated option", () => {
    expect(nearestMinuteOption(14, FOCUS_MINUTE_OPTIONS, 15)).toBe(15);
    expect(nearestMinuteOption(23, FOCUS_MINUTE_OPTIONS, 15)).toBe(25);
    expect(nearestMinuteOption(6, BREAK_MINUTE_OPTIONS, 5)).toBe(5);
    expect(nearestMinuteOption(8, BREAK_MINUTE_OPTIONS, 5)).toBe(10);
  });

  it("keeps an exact member unchanged", () => {
    expect(nearestMinuteOption(20, FOCUS_MINUTE_OPTIONS, 15)).toBe(20);
  });

  it("falls back for garbage / non-finite values", () => {
    expect(nearestMinuteOption(Number.NaN, FOCUS_MINUTE_OPTIONS, 15)).toBe(15);
    expect(nearestMinuteOption("nope", FOCUS_MINUTE_OPTIONS, 15)).toBe(15);
    expect(nearestMinuteOption(undefined, BREAK_MINUTE_OPTIONS, 5)).toBe(5);
  });
});

describe("formatMSS (soft-reused from the visual-timer helper)", () => {
  it("formats a calm tabular m:ss and never a negative readout", () => {
    expect(formatMSS(0)).toBe("0:00");
    expect(formatMSS(15 * 60_000)).toBe("15:00");
    expect(formatMSS(-5_000)).toBe("0:00");
  });
});
