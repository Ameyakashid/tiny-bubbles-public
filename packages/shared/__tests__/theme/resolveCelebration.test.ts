/**
 * resolveCelebration.test.ts (shared) — M1.1b extraction acceptance: the
 * moved resolver keeps the load-bearing anti-shame precedence — salience
 * raises, age ceilings apply to steps, bonus steps UP only, sensory/motion/
 * quiet clamp DOWN, calmMode is the strongest clamp. Reinforcement phase is
 * NOT an input (celebration never diminishes with success).
 */
import { describe, expect, it } from "@jest/globals";

import {
  resolveCelebration,
  type ResolveCelebrationInput,
} from "../../src/theme/resolveCelebration";

const base: ResolveCelebrationInput = {
  ageMode: "older",
  salience: "step",
  sensoryMode: "standard",
  reducedMotion: false,
  calmMode: false,
  quietHours: false,
};

describe("resolveCelebration — anti-shame precedence preserved", () => {
  it("step: young ceiling = full, older ceiling = medium", () => {
    expect(resolveCelebration({ ...base, ageMode: "young" })).toBe("full");
    expect(resolveCelebration({ ...base, ageMode: "older" })).toBe("medium");
  });

  it("routineComplete / levelUp / newCollectible reach full in both ages", () => {
    for (const salience of ["routineComplete", "levelUp", "newCollectible"] as const) {
      expect(resolveCelebration({ ...base, salience })).toBe("full");
      expect(resolveCelebration({ ...base, ageMode: "young", salience })).toBe("full");
    }
  });

  it("bonus steps magnitude UP only (older step medium → full)", () => {
    expect(resolveCelebration({ ...base, bonus: true })).toBe("full");
  });

  it("lowStim / reducedMotion / quietHours clamp DOWN to gentle", () => {
    expect(resolveCelebration({ ...base, sensoryMode: "lowStim", salience: "routineComplete" })).toBe("gentle");
    expect(resolveCelebration({ ...base, reducedMotion: true, salience: "levelUp" })).toBe("gentle");
    expect(resolveCelebration({ ...base, quietHours: true, salience: "newCollectible" })).toBe("gentle");
  });

  it("calmMode is the strongest clamp — always calm, even with bonus + full salience", () => {
    expect(
      resolveCelebration({ ...base, calmMode: true, salience: "routineComplete", bonus: true }),
    ).toBe("calm");
  });
});
