/**
 * __tests__/domain/breathing.test.ts — the calm breathing / regulation domain
 * (breathing-regulation §3.1 / §4 CREATE #4).
 *
 * Asserts: `cycleMs`; `breathPhaseAt` phase boundaries + `scale` monotonicity
 * (inhale rises 0→1, exhale falls 1→0, holds flat); `growStage` clamping at
 * `cyclesTarget`; deterministic recompute across a simulated background gap; and
 * guards for zero/negative/NaN durations + unknown pattern ids. Pure, no device.
 */
import { describe, expect, it } from "@jest/globals";

import {
  BREATH_PATTERNS,
  breathPatternsFor,
  breathPhaseAt,
  cycleMs,
  defaultBreathPatternId,
  getBreathPattern,
  growStage,
  type BreathPattern,
} from "../../src/domain/breathing";

const bubble = getBreathPattern("bubble")!; // 4000 / 0 / 4000 / 0, target 5 → cycle 8000
const box = getBreathPattern("box")!; //       4000 / 4000 / 4000 / 4000, target 4 → cycle 16000
const calm46 = getBreathPattern("calm46")!; //  4000 / 0 / 6000 / 0, target 5 → cycle 10000

describe("curated pattern table", () => {
  it("exposes exactly 3 curated patterns, each with a spokenLabel + positive active phases", () => {
    expect(BREATH_PATTERNS).toHaveLength(3);
    for (const p of BREATH_PATTERNS) {
      expect(p.label.spokenLabel.length).toBeGreaterThan(0); // non-reader support
      expect(p.inhaleMs).toBeGreaterThan(0);
      expect(p.exhaleMs).toBeGreaterThan(0);
      expect(p.holdMs).toBeGreaterThanOrEqual(0);
      expect(p.holdOutMs).toBeGreaterThanOrEqual(0);
      expect(p.cyclesTarget).toBeGreaterThan(0);
    }
  });

  it("resolves the age default (young→bubble, older/preteen→calm46)", () => {
    expect(defaultBreathPatternId("young")).toBe("bubble");
    expect(defaultBreathPatternId("older")).toBe("calm46");
    expect(defaultBreathPatternId("preteen")).toBe("calm46");
  });

  it("offers young ONE default (no chooser) and older/preteen the full curated set", () => {
    expect(breathPatternsFor("young").map((p) => p.id)).toEqual(["bubble"]);
    expect(breathPatternsFor("older").map((p) => p.id).sort()).toEqual(["box", "bubble", "calm46"]);
    expect(breathPatternsFor("preteen")).toHaveLength(3);
  });

  it("returns undefined for an unknown / absent pattern id (caller falls back)", () => {
    expect(getBreathPattern("nope")).toBeUndefined();
    expect(getBreathPattern(undefined)).toBeUndefined();
  });
});

describe("cycleMs", () => {
  it("sums the four phases", () => {
    expect(cycleMs(bubble)).toBe(8000);
    expect(cycleMs(box)).toBe(16000);
    expect(cycleMs(calm46)).toBe(10000);
  });
});

describe("breathPhaseAt — phase boundaries", () => {
  it("walks inhale → exhale for a no-hold pattern (bubble)", () => {
    expect(breathPhaseAt(bubble, 0)).toMatchObject({ phase: "inhale", cycleIndex: 0, scale: 0 });
    expect(breathPhaseAt(bubble, 2000).phase).toBe("inhale");
    expect(breathPhaseAt(bubble, 2000).scale).toBeCloseTo(0.5, 5);
    // exactly at inhaleMs (hold is 0) → exhale begins at full scale
    expect(breathPhaseAt(bubble, 4000)).toMatchObject({ phase: "exhale", scale: 1 });
    expect(breathPhaseAt(bubble, 6000).scale).toBeCloseTo(0.5, 5);
    // next cycle
    expect(breathPhaseAt(bubble, 8000)).toMatchObject({ phase: "inhale", cycleIndex: 1, scale: 0 });
  });

  it("walks all four phases for a box pattern (holds flat at 1 and 0)", () => {
    expect(breathPhaseAt(box, 1000)).toMatchObject({ phase: "inhale" });
    expect(breathPhaseAt(box, 5000)).toMatchObject({ phase: "hold", scale: 1 });
    expect(breathPhaseAt(box, 9000)).toMatchObject({ phase: "exhale" });
    expect(breathPhaseAt(box, 13000)).toMatchObject({ phase: "holdOut", scale: 0 });
    expect(breathPhaseAt(box, 16000).cycleIndex).toBe(1);
  });
});

describe("breathPhaseAt — scale monotonicity", () => {
  it("rises strictly on the inhale and falls strictly on the exhale", () => {
    const inhaleTimes = [200, 1000, 2000, 3000, 3800];
    for (let i = 1; i < inhaleTimes.length; i++) {
      expect(breathPhaseAt(bubble, inhaleTimes[i]).scale).toBeGreaterThan(
        breathPhaseAt(bubble, inhaleTimes[i - 1]).scale,
      );
    }
    const exhaleTimes = [4200, 5000, 6000, 7000, 7800];
    for (let i = 1; i < exhaleTimes.length; i++) {
      expect(breathPhaseAt(bubble, exhaleTimes[i]).scale).toBeLessThan(
        breathPhaseAt(bubble, exhaleTimes[i - 1]).scale,
      );
    }
  });

  it("keeps scale in [0,1] across a whole cycle", () => {
    for (let ms = 0; ms <= cycleMs(box); ms += 250) {
      const s = breathPhaseAt(box, ms).scale;
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

describe("growStage — clamps at cyclesTarget, resets-friendly, deterministic", () => {
  it("advances one stage per completed cycle then rests at the target", () => {
    expect(growStage(bubble, 0)).toBe(0);
    expect(growStage(bubble, 8000 - 1)).toBe(0); // mid-first-cycle
    expect(growStage(bubble, 8000)).toBe(1);
    expect(growStage(bubble, 8000 * 3 + 10)).toBe(3);
    expect(growStage(bubble, 8000 * 5)).toBe(5); // reaches target
    expect(growStage(bubble, 8000 * 99)).toBe(5); // clamps — never past cyclesTarget
  });

  it("re-derives the SAME state from an elapsed time after a background gap", () => {
    // A resumed app just re-computes from elapsed; there is no drift/accumulation.
    const elapsed = cycleMs(bubble) * 4 + 2000;
    const s = breathPhaseAt(bubble, elapsed);
    expect(s.cycleIndex).toBe(4);
    expect(s.phase).toBe("inhale");
    expect(growStage(bubble, elapsed)).toBe(4);
  });

  it("floors a negative / NaN elapsed at stage 0 (never below)", () => {
    expect(growStage(bubble, -5)).toBe(0);
    expect(growStage(bubble, Number.NaN)).toBe(0);
    expect(breathPhaseAt(bubble, -100)).toMatchObject({ phase: "inhale", cycleIndex: 0 });
  });
});

describe("guards — zero / negative / NaN durations never NaN or throw", () => {
  const bad: BreathPattern = {
    ...bubble,
    id: "bad",
    inhaleMs: 0,
    holdMs: Number.NaN,
    exhaleMs: -5,
    holdOutMs: -1,
    cyclesTarget: 0,
  };

  it("keeps cycleMs finite + positive", () => {
    expect(Number.isFinite(cycleMs(bad))).toBe(true);
    expect(cycleMs(bad)).toBeGreaterThan(0);
  });

  it("returns a finite scale in [0,1] for any elapsed and never throws", () => {
    for (const ms of [0, 1, 100, 1000, 99999]) {
      const s = breathPhaseAt(bad, ms);
      expect(Number.isFinite(s.scale)).toBe(true);
      expect(s.scale).toBeGreaterThanOrEqual(0);
      expect(s.scale).toBeLessThanOrEqual(1);
    }
    // a zero cyclesTarget clamps up to at least 1 stage-worth, never negative
    expect(growStage(bad, 100000)).toBeGreaterThanOrEqual(0);
  });
});
