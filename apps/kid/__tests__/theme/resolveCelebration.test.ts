import { describe, expect, it } from "@jest/globals";

import {
  resolveCelebration,
  type ResolveCelebrationInput,
} from "../../src/theme/resolveCelebration";

const base: ResolveCelebrationInput = {
  ageMode: "young",
  salience: "step",
  sensoryMode: "standard",
  reducedMotion: false,
  calmMode: false,
  quietHours: false,
};

describe("resolveCelebration", () => {
  it("salience + age ceiling: young step -> full, older step -> medium", () => {
    expect(resolveCelebration({ ...base, ageMode: "young", salience: "step" })).toBe("full");
    expect(resolveCelebration({ ...base, ageMode: "older", salience: "step" })).toBe("medium");
  });

  it("routine-complete / level-up / collectible reach full in BOTH ages", () => {
    for (const ageMode of ["young", "older"] as const) {
      for (const salience of ["routineComplete", "levelUp", "newCollectible"] as const) {
        expect(resolveCelebration({ ...base, ageMode, salience })).toBe("full");
      }
    }
  });

  it("lowStim / reducedMotion / quietHours clamp DOWN to gentle", () => {
    expect(resolveCelebration({ ...base, ageMode: "young", sensoryMode: "lowStim" })).toBe("gentle");
    expect(resolveCelebration({ ...base, salience: "routineComplete", reducedMotion: true })).toBe("gentle");
    expect(resolveCelebration({ ...base, salience: "routineComplete", quietHours: true })).toBe("gentle");
  });

  it("calmMode is the strongest clamp -> calm (even for routine-complete)", () => {
    expect(resolveCelebration({ ...base, salience: "routineComplete", calmMode: true })).toBe("calm");
    expect(resolveCelebration({ ...base, calmMode: true, sensoryMode: "lowStim" })).toBe("calm");
  });

  it("bonus steps magnitude UP only (older step -> full), capped at full", () => {
    expect(resolveCelebration({ ...base, ageMode: "older", salience: "step", bonus: true })).toBe("full");
    expect(resolveCelebration({ ...base, ageMode: "young", salience: "step", bonus: true })).toBe("full");
  });

  it("a clamp still wins over a bonus (bonus can never override calm/sensory)", () => {
    expect(
      resolveCelebration({ ...base, ageMode: "older", salience: "step", bonus: true, sensoryMode: "lowStim" }),
    ).toBe("gentle");
    expect(resolveCelebration({ ...base, salience: "step", bonus: true, calmMode: true })).toBe("calm");
  });

  it("ANTI-SHAME: magnitude is decoupled from any completion count / phase", () => {
    // The resolver has no phase/count input; the same moment always celebrates
    // the same, no matter how many times the child has succeeded before.
    const moment: ResolveCelebrationInput = { ...base, ageMode: "older", salience: "step" };
    const results = Array.from({ length: 500 }, () => resolveCelebration(moment));
    expect(new Set(results)).toEqual(new Set(["medium"]));
  });
});

// ---------------------------------------------------------------------------
// M2 VERIFY (doc 66 §1b.3) — one consolidated suite asserting the four
// load-bearing properties the milestone names explicitly: (1) salience sets the
// size, (2) ageMode caps it, (3) lowStim/calm/quietHours clamp it down, and
// (4) the reinforcement PHASE can NEVER lower it.
// ---------------------------------------------------------------------------
describe("resolveCelebration — M2 verify contract", () => {
  it("(1) salience SETS the size: bigger moments are never smaller than a step", () => {
    // routine-complete/level-up/collectible are full in both ages; a step is at
    // or below them — salience is the only axis that raises magnitude.
    const order = { full: 3, medium: 2, gentle: 1, calm: 0 } as const;
    for (const ageMode of ["young", "older"] as const) {
      const step = resolveCelebration({ ...base, ageMode, salience: "step" });
      for (const salience of ["routineComplete", "levelUp", "newCollectible"] as const) {
        const big = resolveCelebration({ ...base, ageMode, salience });
        expect(big).toBe("full");
        expect(order[big]).toBeGreaterThanOrEqual(order[step]);
      }
    }
  });

  it("(2) ageMode CAPS the step magnitude: young step=full, older step=medium", () => {
    expect(resolveCelebration({ ...base, ageMode: "young", salience: "step" })).toBe("full");
    expect(resolveCelebration({ ...base, ageMode: "older", salience: "step" })).toBe("medium");
  });

  it("(3) lowStim / calm / quietHours CLAMP DOWN (calm is strongest)", () => {
    // start from the biggest possible moment so the clamp is unambiguous
    const biggest: ResolveCelebrationInput = { ...base, ageMode: "young", salience: "routineComplete" };
    expect(resolveCelebration(biggest)).toBe("full");
    expect(resolveCelebration({ ...biggest, sensoryMode: "lowStim" })).toBe("gentle");
    expect(resolveCelebration({ ...biggest, quietHours: true })).toBe("gentle");
    expect(resolveCelebration({ ...biggest, reducedMotion: true })).toBe("gentle");
    expect(resolveCelebration({ ...biggest, calmMode: true })).toBe("calm");
    // calm beats lowStim/quietHours when several clamps are active at once
    expect(
      resolveCelebration({ ...biggest, calmMode: true, sensoryMode: "lowStim", quietHours: true }),
    ).toBe("calm");
  });

  it("(4) reinforcement PHASE can NEVER lower magnitude (decoupled by construction)", () => {
    // `phase` is deliberately not part of ResolveCelebrationInput. Even if a
    // caller smuggled one in (via a cast), the resolver ignores it: the result
    // is byte-identical across every reinforcement phase, so phase can never
    // thin the celebration — only the invisible bonus cadence (§1b.4) thins.
    for (const ageMode of ["young", "older"] as const) {
      for (const salience of ["step", "routineComplete", "levelUp", "newCollectible"] as const) {
        const expected = resolveCelebration({ ...base, ageMode, salience });
        for (const phase of ["dense", "thinning", "maintenance"] as const) {
          const withPhase = resolveCelebration({
            ...base,
            ageMode,
            salience,
            // @ts-expect-error phase is intentionally NOT an input — proves decoupling
            phase,
          });
          expect(withPhase).toBe(expected);
        }
      }
    }
  });
});
