import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_ENDOWED_FRACTION,
  bubbleFillFraction,
  bubblesUntil,
  filledBubbles,
} from "../../src/domain/progressMeter";

describe("bubbleFillFraction — endowed progress (doc 66 M8)", () => {
  it("the meter STARTS > 0% even with zero value (never an empty bar)", () => {
    const f = bubbleFillFraction(0, 5);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeCloseTo(DEFAULT_ENDOWED_FRACTION);
  });

  it("a goal of 0 still renders the partly-full endowment (never 0)", () => {
    expect(bubbleFillFraction(0, 0)).toBeGreaterThan(0);
    expect(bubbleFillFraction(3, 0)).toBeGreaterThan(0);
  });

  it("grows toward 1 as value approaches the goal", () => {
    const a = bubbleFillFraction(1, 5);
    const b = bubbleFillFraction(3, 5);
    expect(b).toBeGreaterThan(a);
    expect(bubbleFillFraction(5, 5)).toBe(1);
  });

  it("never reads past full on an over-shoot", () => {
    expect(bubbleFillFraction(50, 5)).toBe(1);
  });

  it("never drops below the endowment even at a tiny ratio", () => {
    expect(bubbleFillFraction(0, 1000)).toBeGreaterThanOrEqual(0.02);
  });
});

describe("filledBubbles — the young number-free row", () => {
  it("always shows at least one filled bubble (the visual endowment)", () => {
    expect(filledBubbles(0, 5, 5)).toBeGreaterThanOrEqual(1);
  });
  it("fills all slots at the goal and caps there", () => {
    expect(filledBubbles(5, 5, 5)).toBe(5);
    expect(filledBubbles(50, 5, 5)).toBe(5);
  });
});

describe("bubblesUntil — calm affordability gap", () => {
  it("is the positive remaining cost, never negative", () => {
    expect(bubblesUntil(3, 10)).toBe(7);
    expect(bubblesUntil(10, 10)).toBe(0);
    expect(bubblesUntil(50, 10)).toBe(0); // never negative
  });
});
