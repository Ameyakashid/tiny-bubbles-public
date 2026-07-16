/**
 * M4 ADVERSARIAL EDGE TESTS — seed idempotency (applying twice never duplicates).
 *
 * The seed layer (doc 62 §14) must be re-runnable on every migration/boot
 * without double-applying packs or re-seeding a child. These tests apply each
 * mutation twice and across pre-existing/custom state, asserting set-semantics
 * (no duplicates) and the apply-once guard.
 */
import { describe, expect, it } from "@jest/globals";

import {
  SEED_PACKS,
  SEED_VERSION,
  applyBasePacks,
  freshSeedState,
  isChildSeeded,
  markChildSeeded,
  seedChild,
} from "../../src/data/seed";

/** A deterministic id counter so seedChild output is comparable across runs. */
function counter(prefix = "id"): () => string {
  let n = 0;
  return () => `${prefix}-${n++}`;
}

describe("applyBasePacks — idempotent, set-semantics", () => {
  it("applying twice does not duplicate packs", () => {
    const once = applyBasePacks(freshSeedState());
    const twice = applyBasePacks(once);
    expect(once.appliedPacks.length).toBe(SEED_PACKS.length);
    expect(new Set(once.appliedPacks).size).toBe(once.appliedPacks.length); // no dupes
    expect(twice.appliedPacks.length).toBe(once.appliedPacks.length); // no growth
    expect(new Set(twice.appliedPacks)).toEqual(new Set(SEED_PACKS));
    expect(twice.seedVersion).toBe(SEED_VERSION);
  });

  it("merges with pre-existing/custom packs without clobbering or duplicating", () => {
    const seeded = { ...freshSeedState(), appliedPacks: ["custom.v1", "tasks.v1"] };
    const merged = applyBasePacks(seeded);
    // the custom pack survives exactly once
    expect(merged.appliedPacks.filter((p) => p === "custom.v1").length).toBe(1);
    // the already-present base pack is not duplicated
    expect(merged.appliedPacks.filter((p) => p === "tasks.v1").length).toBe(1);
    // every base pack is present
    for (const p of SEED_PACKS) expect(merged.appliedPacks).toContain(p);
    expect(new Set(merged.appliedPacks).size).toBe(merged.appliedPacks.length);
  });
});

describe("markChildSeeded / isChildSeeded — apply-once guard", () => {
  it("marking the same child twice does not duplicate and returns the same reference", () => {
    const s0 = freshSeedState();
    expect(isChildSeeded(s0, "c1")).toBe(false);

    const s1 = markChildSeeded(s0, "c1");
    expect(s1.perChildSeeded).toEqual(["c1"]);
    expect(isChildSeeded(s1, "c1")).toBe(true);

    const s2 = markChildSeeded(s1, "c1");
    expect(s2).toBe(s1); // unchanged reference — pure no-op
    expect(s2.perChildSeeded).toEqual(["c1"]);
  });

  it("distinct children accumulate without affecting each other", () => {
    let s = freshSeedState();
    s = markChildSeeded(s, "c1");
    s = markChildSeeded(s, "c2");
    s = markChildSeeded(s, "c1"); // re-mark is a no-op
    expect(s.perChildSeeded).toEqual(["c1", "c2"]);
  });
});

describe("the guarded seed-once flow never re-seeds a child", () => {
  it("a second guarded pass is skipped (no duplicate routines/tasks/rewards)", () => {
    let state = freshSeedState();
    const seedInput = {
      childId: "c1",
      ageMode: "young" as const,
      companionStyle: "cuddly" as const,
      now: 1_000,
    };

    let seedRuns = 0;
    const runOnce = () => {
      if (isChildSeeded(state, "c1")) return null;
      seedRuns += 1;
      const seeded = seedChild({ ...seedInput, newId: counter() });
      state = markChildSeeded(state, "c1");
      return seeded;
    };

    const first = runOnce();
    const second = runOnce(); // guarded -> skipped

    expect(seedRuns).toBe(1);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(state.perChildSeeded).toEqual(["c1"]);
    expect(first!.routines.length).toBeGreaterThan(0);
    expect(first!.tasks.length).toBeGreaterThan(0);
    expect(first!.rewards.length).toBeGreaterThan(0);
  });

  it("seedChild is deterministic given the same id factory (no hidden RNG)", () => {
    const input = {
      childId: "c1",
      ageMode: "older" as const,
      companionStyle: "cool" as const,
      now: 1_000,
    };
    const a = seedChild({ ...input, newId: counter() });
    const b = seedChild({ ...input, newId: counter() });
    expect(a.routines.map((r) => r.id)).toEqual(b.routines.map((r) => r.id));
    expect(a.tasks.map((t) => t.id)).toEqual(b.tasks.map((t) => t.id));
    expect(a.companion.speciesId).toBe(b.companion.speciesId);
  });
});

describe("freshSeedState", () => {
  it("starts empty at the current seed version", () => {
    const s = freshSeedState();
    expect(s.seedVersion).toBe(SEED_VERSION);
    expect(s.appliedPacks).toEqual([]);
    expect(s.perChildSeeded).toEqual([]);
  });
});
