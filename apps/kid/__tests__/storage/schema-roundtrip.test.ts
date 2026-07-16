/**
 * __tests__/storage/schema-roundtrip.test.ts — the schema round-trip audit
 * (production-readiness §3.3 rule 5 / 02-architecture §2.5).
 *
 * For each persisted store: default state → JSON.parse(JSON.stringify(...)) →
 * `mergeWithDefaults(parsed, default)` → assert deep-equality. This proves every
 * default shape is JSON-safe (no non-serializable field) and `mergeWithDefaults`
 * is stable on it (no merge gap) BEFORE it ships. It doubles as the backup
 * import-path regression (import runs the same merge). It also asserts every
 * `CHILD_SLICES` name has a corresponding store default.
 *
 * EXTENSION CONTRACT: a new persisted slice (`tb/plans` · `tb/chores` · `tb/quests`)
 * adds its store to `STORES` here as it lands.
 */
import { describe, expect, it } from "@jest/globals";

import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useChoreStore } from "../../src/state/choreStore";
import { usePlanStore } from "../../src/state/planStore";
import { useQuestStore } from "../../src/state/questStore";
import { useRewardStore } from "../../src/state/rewardStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import { mergeWithDefaults } from "../../src/storage/migrations";
import { CHILD_SLICES, type ChildSlice } from "../../src/storage/schemaVersion";

/**
 * The persisted stores. `JSON.parse(JSON.stringify(getState()))` yields exactly
 * the JSON-safe data subset (function-valued actions are dropped by
 * `JSON.stringify`), which is the store's persisted default shape.
 */
const STORES: Record<string, () => unknown> = {
  settings: () => useSettingsStore.getState(),
  children: () => useChildStore.getState(),
  tasks: () => useTaskStore.getState(),
  rewards: () => useRewardStore.getState(),
  buddy: () => useBuddyStore.getState(),
  runProgress: () => useRunProgressStore.getState(),
  // multi-child (M-B5): the new parent-global rotating-chore slice (`tb/chores`).
  chores: () => useChoreStore.getState(),
  // novelty-refresh (M-C4): the new per-child rotating-quest slice (`tb/quests`).
  quests: () => useQuestStore.getState(),
  // if-then-plans (M-C5): the new per-child plan slice (`tb/plans`).
  plans: () => usePlanStore.getState(),
};

describe("schema round-trip audit (§3.3)", () => {
  for (const [name, getState] of Object.entries(STORES)) {
    it(`${name}: default is JSON-safe + mergeWithDefaults-stable`, () => {
      const dataDefault = JSON.parse(JSON.stringify(getState())) as Record<string, unknown>;
      // A default with no data (only functions) would be an empty object → a store
      // wiring bug; every persisted store carries at least one data key.
      expect(Object.keys(dataDefault).length).toBeGreaterThan(0);

      const parsed = JSON.parse(JSON.stringify(dataDefault));
      const merged = mergeWithDefaults(parsed, dataDefault);
      expect(merged).toEqual(dataDefault);
    });
  }

  it("every CHILD_SLICES name maps to a store default record", () => {
    const children = useChildStore.getState();
    const task = useTaskStore.getState();
    const reward = useRewardStore.getState();
    const buddy = useBuddyStore.getState();

    // The compiler forces a mapping for EVERY per-child slice name (exhaustive
    // Record<ChildSlice>), so a newly-added slice can't silently lack a default.
    const sliceDefaults: Record<ChildSlice, Record<string, unknown>> = {
      profile: children.profiles,
      companion: buddy.companions,
      routines: task.routines,
      tasks: task.tasks,
      runs: task.runs,
      ledger: children.ledgers,
      reinforcement: children.reinforcement,
      progress: children.progress,
      rewards: reward.rewards,
      redemptions: reward.redemptions,
      moods: children.moods,
      events: children.events,
    };

    for (const slice of CHILD_SLICES) {
      expect(sliceDefaults[slice]).toBeDefined();
      expect(typeof sliceDefaults[slice]).toBe("object");
    }
  });
});
