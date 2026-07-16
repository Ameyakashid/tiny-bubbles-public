import { describe, expect, it } from "@jest/globals";

import { DEFAULT_REINFORCEMENT_CONFIG } from "../../src/domain/constants";
import {
  computeReinforcement,
  habitKeyFor,
  newHabit,
  phaseForCompletions,
} from "../../src/domain/reinforcement";
import type { HabitReinforcement, ReinforcementConfig } from "../../src/domain/types";
import { resolveCelebration } from "../../src/theme/resolveCelebration";

const CFG: ReinforcementConfig = { ...DEFAULT_REINFORCEMENT_CONFIG };

/** Run N completions threading the habit, returning the bonus flag per step. */
function runSequence(
  start: HabitReinforcement,
  n: number,
  cfg: ReinforcementConfig,
  baseTokenValue = 1,
): { bonuses: boolean[]; bonusTokens: number[]; habit: HabitReinforcement } {
  let habit = start;
  const bonuses: boolean[] = [];
  const bonusTokens: number[] = [];
  for (let i = 0; i < n; i++) {
    // `now` is set just after the previous completion so the idle re-warm never
    // triggers — we are isolating the cadence here.
    const r = computeReinforcement({ habit, config: cfg, baseTokenValue, now: 1000 + i });
    bonuses.push(r.bonus);
    bonusTokens.push(r.bonusTokens);
    habit = r.habit;
  }
  return { bonuses, bonusTokens, habit };
}

describe("habitKeyFor", () => {
  it("keys by routine when present, else by the task id", () => {
    expect(habitKeyFor({ id: "t1", routineId: "r1" })).toBe("r1");
    expect(habitKeyFor({ id: "t1", routineId: null })).toBe("task:t1");
  });
});

describe("phase boundaries", () => {
  it("dense -> thinning -> maintenance by completion count", () => {
    expect(phaseForCompletions(0, CFG)).toBe("dense");
    expect(phaseForCompletions(6, CFG)).toBe("dense");
    expect(phaseForCompletions(7, CFG)).toBe("thinning");
    expect(phaseForCompletions(20, CFG)).toBe("thinning");
    expect(phaseForCompletions(21, CFG)).toBe("maintenance");
  });
});

describe("deterministic every-N bonus cadence (NO randomness)", () => {
  it("dense phase pays a bonus every completion (everyN = 1)", () => {
    const { bonuses } = runSequence(newHabit("h"), 7, CFG);
    expect(bonuses).toEqual([true, true, true, true, true, true, true]);
  });

  it("thinning phase pays a bonus every 3rd completion", () => {
    // start at completion 7 (thinning), sinceLastBonus 0
    const start: HabitReinforcement = {
      habitKey: "h",
      completions: 7,
      sinceLastBonus: 0,
      lastCompletedAt: 1000,
    };
    const { bonuses } = runSequence(start, 9, CFG);
    expect(bonuses).toEqual([false, false, true, false, false, true, false, false, true]);
  });

  it("maintenance phase pays a bonus every 7th completion", () => {
    const start: HabitReinforcement = {
      habitKey: "h",
      completions: 21,
      sinceLastBonus: 0,
      lastCompletedAt: 1000,
    };
    const { bonuses } = runSequence(start, 14, CFG);
    const expected = [false, false, false, false, false, false, true];
    expect(bonuses).toEqual([...expected, ...expected]);
  });

  it("is a PURE function of completion count — identical across runs", () => {
    const a = runSequence(newHabit("h"), 40, CFG);
    const b = runSequence(newHabit("h"), 40, CFG);
    expect(a.bonuses).toEqual(b.bonuses); // no Math.random anywhere in the path
    expect(a.bonusTokens).toEqual(b.bonusTokens);
  });

  it("bonus tokens are never negative (the base is added on top, never reduced)", () => {
    const { bonusTokens } = runSequence(newHabit("h"), 60, CFG);
    for (const b of bonusTokens) expect(b).toBeGreaterThanOrEqual(0);
  });
});

describe("lapse re-warm (welcome back, never punish)", () => {
  it("halves completions + resets the bonus counter after an idle gap", () => {
    const start: HabitReinforcement = {
      habitKey: "h",
      completions: 12,
      sinceLastBonus: 2,
      lastCompletedAt: 1_000, // a real prior completion (a fresh habit never re-warms)
    };
    const idleNow = start.lastCompletedAt + 6 * 24 * 60 * 60 * 1000; // 6 idle days >= reWarm 5
    const r = computeReinforcement({ habit: start, config: CFG, baseTokenValue: 1, now: idleNow });
    // 12 -> floor(12/2)=6 (back into the dense band), then +1 for this completion = 7
    expect(r.habit.completions).toBe(7);
    expect(r.phase).toBe("dense"); // re-warmed back toward dense
    expect(r.bonus).toBe(true); // dense pays a bonus every completion
    expect(r.habit.sinceLastBonus).toBe(0); // re-warm reset the bonus counter
  });
});

describe("celebration is DECOUPLED from reinforcement phase (anti-shame §1b.3)", () => {
  it("celebration SIZE never decreases as the completion count grows", () => {
    let habit = newHabit("h");
    const levels: string[] = [];
    for (let i = 0; i < 60; i++) {
      const r = computeReinforcement({ habit, config: CFG, baseTokenValue: 1, now: 1000 + i });
      habit = r.habit;
      // The celebration resolver does NOT take phase/completions — it is sized by
      // salience + age. So the level is identical at completion 1 and completion 60.
      levels.push(
        resolveCelebration({
          ageMode: "young",
          salience: "step",
          sensoryMode: "standard",
          reducedMotion: false,
          calmMode: false,
          quietHours: false,
        }),
      );
    }
    // every step celebration is the same magnitude regardless of mastery/phase
    expect(new Set(levels).size).toBe(1);
    expect(levels[0]).toBe("full"); // young step ceiling
  });
});
