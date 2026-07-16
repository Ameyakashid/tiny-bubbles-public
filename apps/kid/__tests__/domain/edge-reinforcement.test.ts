/**
 * M4 ADVERSARIAL EDGE TESTS — reinforcement thinning boundaries + invariants.
 *
 * The ONE thing allowed to thin is the BONUS cadence (doc 66 §1b.3/§5.3). These
 * tests walk a single habit across BOTH phase seams (dense->thinning->
 * maintenance) and assert the hard invariants the happy-path suite only touches:
 *   - the bonus MAGNITUDE never shrinks (only its frequency does),
 *   - the payout multiplier is ALWAYS >= 1 (the base token is never reduced),
 *   - the cadence is a deterministic every-N with NO RNG, robust to a
 *     mis-configured `bonusEveryN = 0` (the Math.max(1,..) guard),
 *   - the lapse re-warm fires at exactly `reWarmAfterIdleDays` and never on a
 *     brand-new habit, and only ever makes the welcome-back richer.
 */
import { describe, expect, it } from "@jest/globals";

import { DEFAULT_REINFORCEMENT_CONFIG } from "../../src/domain/constants";
import {
  computeReinforcement,
  newHabit,
  phaseForCompletions,
} from "../../src/domain/reinforcement";
import type {
  HabitReinforcement,
  ReinforcementConfig,
  ReinforcementPhase,
} from "../../src/domain/types";

const CFG: ReinforcementConfig = { ...DEFAULT_REINFORCEMENT_CONFIG };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface Step {
  phase: ReinforcementPhase;
  bonus: boolean;
  bonusTokens: number;
  multiplier: number;
}

/** Walk a fresh habit through `n` completions spaced 1ms apart (no re-warm). */
function walk(n: number, cfg: ReinforcementConfig, baseTokenValue = 1): Step[] {
  let habit = newHabit("h");
  const out: Step[] = [];
  for (let i = 0; i < n; i++) {
    const r = computeReinforcement({ habit, config: cfg, baseTokenValue, now: 1_000 + i });
    out.push({ phase: r.phase, bonus: r.bonus, bonusTokens: r.bonusTokens, multiplier: r.multiplier });
    habit = r.habit;
  }
  return out;
}

describe("thinning across BOTH phase seams (cadence thins, magnitude does NOT)", () => {
  const steps = walk(120, CFG);

  it("the dense window pays a bonus on EVERY completion", () => {
    const dense = steps.filter((s) => s.phase === "dense");
    expect(dense.length).toBe(CFG.denseUntilCompletions);
    expect(dense.every((s) => s.bonus)).toBe(true);
  });

  it("the bonus MAGNITUDE is constant — only the frequency thins (anti-shame §5.3)", () => {
    for (const s of steps) {
      expect(s.bonusTokens === 0 || s.bonusTokens === CFG.baseBonusTokens).toBe(true);
    }
    // every paid bonus is the SAME size in every phase
    const paid = new Set(steps.filter((s) => s.bonus).map((s) => s.bonusTokens));
    expect([...paid]).toEqual([CFG.baseBonusTokens]);
  });

  it("the payout multiplier is ALWAYS >= 1 — the base token is never reduced", () => {
    for (const s of steps) expect(s.multiplier).toBeGreaterThanOrEqual(1);
  });

  it("the bonus RATE strictly decreases dense > thinning > maintenance", () => {
    const rate = (phase: ReinforcementPhase) => {
      const inPhase = steps.filter((s) => s.phase === phase);
      return inPhase.filter((s) => s.bonus).length / inPhase.length;
    };
    const dense = rate("dense");
    const thinning = rate("thinning");
    const maintenance = rate("maintenance");
    expect(dense).toBe(1);
    expect(thinning).toBeLessThan(dense);
    expect(maintenance).toBeLessThan(thinning);
    // close to the configured cadences (1, 1/3, 1/7) in the long run
    expect(thinning).toBeCloseTo(1 / CFG.bonusEveryN_thinning, 1);
    expect(maintenance).toBeCloseTo(1 / CFG.bonusEveryN_maintenance, 1);
  });

  it("the phase sequence is monotonic non-decreasing (never silently re-warms here)", () => {
    const rank = { dense: 0, thinning: 1, maintenance: 2 } as const;
    for (let i = 1; i < steps.length; i++) {
      expect(rank[steps[i].phase]).toBeGreaterThanOrEqual(rank[steps[i - 1].phase]);
    }
  });

  it("is fully deterministic — an identical walk yields identical bonuses (NO RNG)", () => {
    const a = walk(120, CFG).map((s) => s.bonus);
    const b = walk(120, CFG).map((s) => s.bonus);
    expect(a).toEqual(b);
  });
});

describe("phase boundary off-by-one", () => {
  it("the exact threshold counts flip phase", () => {
    expect(phaseForCompletions(CFG.denseUntilCompletions - 1, CFG)).toBe("dense");
    expect(phaseForCompletions(CFG.denseUntilCompletions, CFG)).toBe("thinning");
    expect(phaseForCompletions(CFG.thinningUntilCompletions - 1, CFG)).toBe("thinning");
    expect(phaseForCompletions(CFG.thinningUntilCompletions, CFG)).toBe("maintenance");
  });
});

describe("cadence config robustness (no divide-by-zero / infinite-loop)", () => {
  it("a mis-configured bonusEveryN of 0 is clamped to 1 (pays every dense completion)", () => {
    const broken: ReinforcementConfig = { ...CFG, bonusEveryN_dense: 0 };
    const steps = walk(3, broken);
    expect(steps.every((s) => s.bonus)).toBe(true); // Math.max(1, 0) === 1
  });
});

describe("lapse re-warm boundary (welcome back, never punish)", () => {
  const BASE = 1_000_000;
  const habit12: HabitReinforcement = {
    habitKey: "h",
    completions: 12, // mid-thinning
    sinceLastBonus: 2,
    lastCompletedAt: BASE,
  };

  it("fires at EXACTLY reWarmAfterIdleDays — halving completions back toward dense", () => {
    const now = BASE + CFG.reWarmAfterIdleDays * MS_PER_DAY; // exactly the threshold
    const r = computeReinforcement({ habit: habit12, config: CFG, baseTokenValue: 1, now });
    expect(r.phase).toBe("dense"); // 12 -> floor(12/2) = 6 -> dense band
    expect(r.habit.completions).toBe(7); // 6 + 1 for this completion
    expect(r.habit.sinceLastBonus).toBe(0); // bonus counter reset
    expect(r.bonus).toBe(true); // dense pays every time — a rich welcome back
  });

  it("does NOT fire one millisecond before the threshold", () => {
    const now = BASE + CFG.reWarmAfterIdleDays * MS_PER_DAY - 1;
    const r = computeReinforcement({ habit: habit12, config: CFG, baseTokenValue: 1, now });
    expect(r.phase).toBe("thinning"); // unchanged
    expect(r.habit.completions).toBe(13); // 12 + 1, NOT halved
  });

  it("never re-warms a brand-new habit (lastCompletedAt 0), even far in the future", () => {
    const r = computeReinforcement({ habit: newHabit("h"), config: CFG, baseTokenValue: 1, now: 1e12 });
    expect(r.habit.completions).toBe(1);
    expect(r.phase).toBe("dense");
  });

  it("re-warm halving floors at 0 (completions 1 -> 0 -> back to 1), never negative", () => {
    const tiny: HabitReinforcement = { habitKey: "h", completions: 1, sinceLastBonus: 0, lastCompletedAt: BASE };
    const r = computeReinforcement({ habit: tiny, config: CFG, baseTokenValue: 1, now: BASE + 10 * MS_PER_DAY });
    expect(r.habit.completions).toBe(1); // floor(1/2)=0, +1
    expect(r.habit.completions).toBeGreaterThanOrEqual(0);
  });
});
