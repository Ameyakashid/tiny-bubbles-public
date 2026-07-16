import { describe, expect, it } from "@jest/globals";

import {
  IDLE_SLEEPY_MS,
  POSITIVE_MOODS,
  applyCompanionEvent,
  bondLevelForLifetime,
  type CompanionEvent,
  decayMood,
  growthStageForBond,
  moodForEvent,
  nurtureCompanion,
} from "../../src/domain/companionMood";
import { freshCompanion } from "../../src/domain/constants";
import type { CompanionMood, CompanionState } from "../../src/domain/types";

const ALL_EVENTS: CompanionEvent[] = [
  "stepDone",
  "routineComplete",
  "tokenEarned",
  "levelUp",
  "collectible",
  "returnAfterAbsence",
  "greet",
  "tap",
  "rest",
];

function buddy(over: Partial<CompanionState> = {}): CompanionState {
  return { ...freshCompanion("c1", { speciesId: "bloop", name: "Bloop", now: 0 }), ...over };
}

describe("moodForEvent (every event -> a POSITIVE mood)", () => {
  it("maps each event to a member of the positive union", () => {
    for (const e of ALL_EVENTS) {
      expect(POSITIVE_MOODS).toContain(moodForEvent(e));
    }
  });

  it("uses the documented key transitions", () => {
    expect(moodForEvent("stepDone")).toBe("celebrating");
    expect(moodForEvent("routineComplete")).toBe("proud");
    expect(moodForEvent("returnAfterAbsence")).toBe("excited"); // happy to see you, never guilt
    expect(moodForEvent("rest")).toBe("sleepy");
  });
});

describe("applyCompanionEvent + decay", () => {
  it("step done -> celebrating, then decays back to content", () => {
    const c = applyCompanionEvent(buddy(), "stepDone", 10_000);
    expect(c.mood).toBe("celebrating");
    // before the window elapses it stays celebrating
    expect(decayMood(c, 10_000 + 1_000).mood).toBe("celebrating");
    // after the window it settles to content
    expect(decayMood(c, 10_000 + 9_000).mood).toBe("content");
  });

  it("return after absence -> excited", () => {
    const c = applyCompanionEvent(buddy(), "returnAfterAbsence", 5_000);
    expect(c.mood).toBe("excited");
  });

  it("a long idle settles a content buddy to the restful sleepy (still positive)", () => {
    const c = buddy({ mood: "content", moodSince: 0, lastInteractionAt: 0 });
    const dozed = decayMood(c, IDLE_SLEEPY_MS + 1);
    expect(dozed.mood).toBe("sleepy");
    expect(POSITIVE_MOODS).toContain(dozed.mood);
  });
});

describe("can NEVER reach a negative state (anti-shame keystone §5.1)", () => {
  it("every event + decay result is always a positive mood", () => {
    for (const e of ALL_EVENTS) {
      let c = applyCompanionEvent(buddy(), e, 1_000);
      expect(POSITIVE_MOODS).toContain(c.mood);
      for (const t of [1_001, 30_000, IDLE_SLEEPY_MS + 2_000, 10 ** 9]) {
        c = decayMood(c, t);
        expect(POSITIVE_MOODS).toContain(c.mood);
      }
    }
  });

  it("a corrupt/unknown mood is coerced to a positive member, never preserved", () => {
    const corrupt = buddy({ mood: "sad" as unknown as CompanionMood, moodSince: 0 });
    const fixed = decayMood(corrupt, 1_000);
    expect(POSITIVE_MOODS).toContain(fixed.mood);
  });
});

describe("nurture (monotonic bond + growth from lifetimeEarned)", () => {
  it("derives bond + growth levels from lifetime earning", () => {
    expect(bondLevelForLifetime(0)).toBe(0);
    expect(bondLevelForLifetime(25)).toBe(1);
    expect(bondLevelForLifetime(100)).toBe(4);
    expect(growthStageForBond(0)).toBe(0);
    expect(growthStageForBond(4)).toBe(1);
  });

  it("advances bond + growth as the child earns", () => {
    const start = buddy({ bondLevel: 0, growthStage: 0 });
    const grown = nurtureCompanion(start, 100); // bond 4 -> growth 1
    expect(grown.bondLevel).toBe(4);
    expect(grown.growthStage).toBe(1);
  });

  it("NEVER decreases bond/growth even if lifetimeEarned is lower (monotonic)", () => {
    const high = buddy({ bondLevel: 8, growthStage: 2 });
    const same = nurtureCompanion(high, 0); // a lower lifetime can't shrink the buddy
    expect(same.bondLevel).toBe(8);
    expect(same.growthStage).toBe(2);
  });
});
