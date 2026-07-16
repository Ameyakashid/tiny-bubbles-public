import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_COMPANION_MOOD,
  type Migration,
  type RawState,
  VALID_COMPANION_MOODS,
  loadSlice,
  mergeWithDefaults,
  migrateAndRepair,
  runMigrations,
  safeParse,
  validateAndRepair,
} from "../../src/storage/migrations";

describe("mergeWithDefaults", () => {
  it("fills missing fields, preserves unknown keys, replaces arrays", () => {
    const defaults = { a: 1, nested: { x: 1, y: 2 }, list: [1, 2] };
    const loaded = { a: 9, nested: { x: 7 }, list: [3], extra: "keep" };
    const merged = mergeWithDefaults(loaded, defaults) as Record<string, unknown>;
    expect(merged.a).toBe(9);
    expect(merged.nested).toEqual({ x: 7, y: 2 }); // missing y filled
    expect(merged.list).toEqual([3]); // array replaced wholesale
    expect(merged.extra).toBe("keep"); // forward-safe unknown key preserved
  });

  it("falls back to defaults on null/undefined/shape-mismatch", () => {
    const defaults = { a: 1, nested: { x: 1 } };
    expect(mergeWithDefaults(null, defaults)).toEqual(defaults);
    expect(mergeWithDefaults(undefined, defaults)).toEqual(defaults);
    // loaded.nested is a primitive where an object is expected -> safe default
    expect(mergeWithDefaults({ nested: 5 }, defaults)).toEqual({ a: 1, nested: { x: 1 } });
  });
});

describe("safeParse / loadSlice (corruption-proof)", () => {
  it("returns defaults for corrupt JSON, null, and wrong types without throwing", () => {
    const fallback = { mood: "content", bondLevel: 3 };
    expect(safeParse("{not valid json", fallback)).toEqual(fallback);
    expect(safeParse(null, fallback)).toEqual(fallback);
    expect(safeParse("null", fallback)).toEqual(fallback);
    // returned object is a distinct clone (mutating it can't corrupt the default)
    const out = safeParse<typeof fallback>(null, fallback);
    out.bondLevel = 999;
    expect(fallback.bondLevel).toBe(3);
  });

  it("loadSlice merges a partial blob onto defaults", () => {
    const defaults = { mood: "content", bondLevel: 0, name: "Bloop" };
    const out = loadSlice(JSON.stringify({ bondLevel: 4 }), defaults);
    expect(out).toEqual({ mood: "content", bondLevel: 4, name: "Bloop" });
  });
});

describe("runMigrations (forward-only, no data loss)", () => {
  const migrations: Migration[] = [
    {
      from: 1,
      to: 2,
      migrate: (s) => ({ ...s, meta: { ...s.meta, addedInV2: 0 } }),
    },
    {
      from: 2,
      to: 3,
      migrate: (s) => ({ ...s, addedTopLevel: true }),
    },
  ];

  it("runs the chain and preserves all existing data on a version bump", () => {
    const state: RawState = {
      meta: { schemaVersion: 1, activeChildId: "c1", keepMe: "yes" },
      childIndex: [{ id: "c1" }],
      children: { c1: { ledger: { balance: 12, lifetimeEarned: 12, lifetimeSpent: 0 } } },
    };

    const out = runMigrations(state, 1, 3, migrations);

    // new fields added
    expect((out.meta as Record<string, unknown>).addedInV2).toBe(0);
    expect(out.addedTopLevel).toBe(true);
    // nothing lost
    expect((out.meta as Record<string, unknown>).keepMe).toBe("yes");
    expect(out.children).toEqual(state.children);
  });

  it("never downgrades data from a newer build (from > to is a no-op)", () => {
    const newer: RawState = { meta: { schemaVersion: 5, futureField: 42 } };
    expect(runMigrations(newer, 5, 3, migrations)).toBe(newer);
  });

  it("is a no-op when already at the target version", () => {
    const s: RawState = { meta: { schemaVersion: 3 } };
    expect(runMigrations(s, 3, 3, migrations)).toBe(s);
  });
});

describe("validateAndRepair (anti-shame structural invariants)", () => {
  it("coerces a corrupt blob to safe, NON-PUNISHING defaults (never a punishing/zeroed state)", () => {
    const corrupt: RawState = {
      meta: { activeChildId: "ghost-that-does-not-exist" },
      childIndex: [{ id: "c1" }],
      children: {
        c1: {
          // a banned/negative mood must become a valid POSITIVE member
          companion: { mood: "angry", bondLevel: 5, growthStage: 2, sparkle: "keep" },
          // a negative balance is corruption -> restore earned tokens, never zero them
          ledger: { balance: -10, heldTokens: -3, lifetimeEarned: 20, lifetimeSpent: 5 },
          // a streak can never be negative; longest is never lowered
          progress: { currentStreakDays: -2, longestStreakDays: 9, cumulativeCount: -1 },
          // the 'failed' status does not exist -> todo
          tasks: [{ id: "t1", status: "failed" }],
        },
      },
    };

    const out = validateAndRepair(corrupt);
    const c1 = out.children!.c1;

    // companion: positive mood, bond/growth not lowered, unknown key preserved
    expect(c1.companion!.mood).toBe(DEFAULT_COMPANION_MOOD);
    expect(VALID_COMPANION_MOODS).toContain(c1.companion!.mood);
    expect(c1.companion!.bondLevel).toBe(5);
    expect(c1.companion!.growthStage).toBe(2);
    expect((c1.companion as Record<string, unknown>).sparkle).toBe("keep");

    // ledger: non-punishing — earned tokens restored (20 - 5 = 15), nothing negative
    expect(c1.ledger!.balance).toBe(15);
    expect(c1.ledger!.heldTokens).toBe(0);
    expect(c1.ledger!.lifetimeEarned).toBe(20);

    // progress: no negative streak; longest preserved (never lowered)
    expect(c1.progress!.currentStreakDays).toBe(0);
    expect(c1.progress!.longestStreakDays).toBe(9);
    expect(c1.progress!.cumulativeCount).toBe(0);

    // tasks: never 'failed'
    expect(c1.tasks![0].status).toBe("todo");

    // meta.activeChildId repaired to an existing child
    expect(out.meta!.activeChildId).toBe("c1");
  });

  it("sets activeChildId to null when there are no children", () => {
    const out = validateAndRepair({ meta: { activeChildId: "x" }, childIndex: [] });
    expect(out.meta!.activeChildId).toBeNull();
  });

  it("never lowers longestStreakDays below currentStreakDays", () => {
    const out = validateAndRepair({
      children: { c1: { progress: { currentStreakDays: 7, longestStreakDays: 3 } } },
    });
    expect(out.children!.c1.progress!.longestStreakDays).toBe(7);
  });

  it("is the full load pipeline via migrateAndRepair (migrate then repair)", () => {
    const migrations: Migration[] = [
      { from: 1, to: 2, migrate: (s) => ({ ...s, addedInV2: true }) },
    ];
    const out = migrateAndRepair(
      { children: { c1: { companion: { mood: "sad" } } } },
      1,
      2,
      migrations,
    );
    expect(out.addedInV2).toBe(true);
    expect(out.children!.c1.companion!.mood).toBe(DEFAULT_COMPANION_MOOD);
  });
});
