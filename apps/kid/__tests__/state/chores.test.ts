/**
 * __tests__/state/chores.test.ts — the persisted chore store + the gameplay
 * materialisation/rotation orchestration (multi-child §3.3/§3.5 / §7 acceptance
 * #5/#6/#7). Proves: store CRUD + `pruneChild`; idempotent materialisation of
 * exactly one holder-day chore Task (none for a non-holder); stale-instance
 * archiving; `perCompletion` advance on Done; and that `wipeAllChildData` empties
 * `tb/chores`.
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import { currentHolderId } from "../../src/domain/chores";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useChoreStore } from "../../src/state/choreStore";
import {
  completeStep,
  createChildWithSeed,
  createSharedChore,
  reconcileChild,
  wipeAllChildData,
} from "../../src/state/gameplay";
import { useRewardStore } from "../../src/state/rewardStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useTaskStore } from "../../src/state/taskStore";
import type { SharedChore, Task } from "../../src/domain/types";

const TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();

const choreTasks = (cid: string): Task[] =>
  (useTaskStore.getState().tasks[cid] ?? []).filter((t) => t.choreId && !t.archived);

function makeStoreChore(over: Partial<SharedChore> = {}): SharedChore {
  return {
    id: "c-store",
    label: { spokenLabel: "Trash", emoji: "🗑️", color: "#7BD389" },
    childIds: ["A", "B", "C"],
    cadence: "daily",
    rotationAnchorDay: "2026-06-15",
    manualHolderIndex: 0,
    completionAdvanceCount: 0,
    daypart: "morning",
    tokenValue: 2,
    templateId: null,
    schedule: { daysOfWeek: [] },
    active: true,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

beforeEach(() => {
  useChildStore.setState({
    index: [],
    profiles: {},
    ledgers: {},
    progress: {},
    reinforcement: {},
    moods: {},
    events: {},
    seed: { seedVersion: 1, appliedPacks: [], perChildSeeded: [] },
  });
  useTaskStore.setState({ tasks: {}, routines: {}, runs: {}, lastRolloverDay: {} });
  useRewardStore.setState({ rewards: {}, redemptions: {} });
  useBuddyStore.setState({ companions: {} });
  useRunProgressStore.setState({ active: {}, completedDayparts: {} });
  useChoreStore.setState({ chores: [] });
});

describe("choreStore CRUD", () => {
  it("adds, updates, advances, passes, and removes a chore", () => {
    const store = useChoreStore.getState();
    store.addChore(makeStoreChore());
    expect(useChoreStore.getState().chores).toHaveLength(1);

    store.updateChore("c-store", { tokenValue: 5 });
    expect(useChoreStore.getState().chores[0].tokenValue).toBe(5);

    store.advanceChore("c-store");
    expect(useChoreStore.getState().chores[0].completionAdvanceCount).toBe(1);

    store.passChoreToNext("c-store");
    expect(useChoreStore.getState().chores[0].manualHolderIndex).toBe(1);

    store.removeChore("c-store");
    expect(useChoreStore.getState().chores).toHaveLength(0);
  });
});

describe("pruneChild — roster hygiene (acceptance #7)", () => {
  it("drops the child from the roster and deactivates a chore left with <2 members", () => {
    const store = useChoreStore.getState();
    store.addChore(makeStoreChore({ childIds: ["A", "B", "C"] }));

    store.pruneChild("B");
    let chore = useChoreStore.getState().chores[0];
    expect(chore.childIds).toEqual(["A", "C"]);
    expect(chore.active).toBe(true); // still a valid 2-member rotation

    store.pruneChild("C");
    chore = useChoreStore.getState().chores[0];
    expect(chore.childIds).toEqual(["A"]);
    expect(chore.active).toBe(false); // a rotation of one is not a rotation — never deleted
  });

  it("never hard-deletes a chore on prune (so a sibling can be re-added)", () => {
    const store = useChoreStore.getState();
    store.addChore(makeStoreChore({ childIds: ["A", "B"] }));
    store.pruneChild("A");
    expect(useChoreStore.getState().chores).toHaveLength(1);
    expect(useChoreStore.getState().chores[0].active).toBe(false);
  });
});

describe("materialisation via reconcileChild (acceptance #5)", () => {
  it("materialises exactly ONE chore task for the current holder and none for a non-holder; idempotent", () => {
    const a = createChildWithSeed({ displayName: "Ana", ageMode: "young", timeZone: TZ });
    const b = createChildWithSeed({ displayName: "Beto", ageMode: "young", timeZone: TZ });

    // daily, anchored today, roster [a, b] → today's holder is a.
    const choreId = createSharedChore({
      label: { spokenLabel: "Feed the pet", emoji: "🐶", color: "#C9ADA7" },
      childIds: [a, b],
      cadence: "daily",
      daypart: "morning",
      tokenValue: 2,
    });
    const chore = useChoreStore.getState().chores.find((ch) => ch.id === choreId)!;
    expect(currentHolderId(chore, Date.now(), TZ)).toBe(a);

    // createSharedChore already materialised the holder; assert exactly one, none for b.
    expect(choreTasks(a)).toHaveLength(1);
    expect(choreTasks(a)[0].choreId).toBe(choreId);
    expect(choreTasks(a)[0].tokenValue).toBe(2);
    expect(choreTasks(b)).toHaveLength(0);

    // re-running reconcile does NOT duplicate the holder-day instance.
    reconcileChild(a);
    reconcileChild(a);
    expect(choreTasks(a)).toHaveLength(1);
    // the non-holder still has none.
    reconcileChild(b);
    expect(choreTasks(b)).toHaveLength(0);
  });

  it("archives a stale (prior-day, still todo) chore task on reconcile", () => {
    const a = createChildWithSeed({ displayName: "Ana", ageMode: "young", timeZone: TZ });
    const b = createChildWithSeed({ displayName: "Beto", ageMode: "young", timeZone: TZ });
    createSharedChore({
      label: { spokenLabel: "Trash", emoji: "🗑️", color: "#7BD389" },
      childIds: [a, b],
      cadence: "daily",
      daypart: "morning",
      tokenValue: 1,
    });
    // inject a stale holder-day chore task (materialised for a past day, still todo).
    const stale: Task = {
      ...choreTasks(a)[0],
      id: "stale-1",
      choreHolderDay: "2000-01-01",
      status: "todo",
    };
    useTaskStore.getState().addTask(a, stale);
    expect((useTaskStore.getState().tasks[a] ?? []).some((t) => t.id === "stale-1")).toBe(true);

    reconcileChild(a);

    const staleAfter = (useTaskStore.getState().tasks[a] ?? []).find((t) => t.id === "stale-1");
    expect(staleAfter?.archived).toBe(true);
    // today's holder-day task is untouched (still exactly one live chore task).
    expect(choreTasks(a)).toHaveLength(1);
  });
});

describe("perCompletion advance on Done (acceptance #6)", () => {
  it("advances the rotation pointer when the holder completes a perCompletion chore", () => {
    const a = createChildWithSeed({ displayName: "Ana", ageMode: "older", timeZone: TZ });
    const b = createChildWithSeed({ displayName: "Beto", ageMode: "older", timeZone: TZ });
    const choreId = createSharedChore({
      label: { spokenLabel: "Dishes", emoji: "🧽", color: "#56CFE1" },
      childIds: [a, b],
      cadence: "perCompletion",
      daypart: "evening",
      tokenValue: 1,
    });
    expect(currentHolderId(useChoreStore.getState().chores[0], Date.now(), TZ)).toBe(a);

    const task = choreTasks(a)[0];
    expect(task).toBeDefined();
    const balanceBefore = useChildStore.getState().ledgers[a].balance;

    const res = completeStep(a, task);
    expect(res).not.toBeNull();
    // the holder earned tokens (core-loop reuse — a normal completion).
    expect(useChildStore.getState().ledgers[a].balance).toBeGreaterThan(balanceBefore);

    // the perCompletion pointer advanced → the NEXT holder is b.
    const chore = useChoreStore.getState().chores.find((ch) => ch.id === choreId)!;
    expect(chore.completionAdvanceCount).toBe(1);
    expect(currentHolderId(chore, Date.now(), TZ)).toBe(b);
  });

  it("a normal (non-chore) completion never touches the chore counters", () => {
    const a = createChildWithSeed({ displayName: "Ana", ageMode: "older", timeZone: TZ });
    const b = createChildWithSeed({ displayName: "Beto", ageMode: "older", timeZone: TZ });
    createSharedChore({
      label: { spokenLabel: "Dishes", emoji: "🧽", color: "#56CFE1" },
      childIds: [a, b],
      cadence: "perCompletion",
      daypart: "evening",
      tokenValue: 1,
    });
    // complete a NORMAL seeded routine step (no choreId).
    const normal = (useTaskStore.getState().tasks[a] ?? []).find((t) => !t.choreId)!;
    completeStep(a, normal);
    expect(useChoreStore.getState().chores[0].completionAdvanceCount).toBe(0);
  });
});

describe("wipeAllChildData clears tb/chores (acceptance #7)", () => {
  it("empties the chore store on a full wipe", () => {
    const a = createChildWithSeed({ displayName: "Ana", ageMode: "young", timeZone: TZ });
    const b = createChildWithSeed({ displayName: "Beto", ageMode: "young", timeZone: TZ });
    createSharedChore({
      label: { spokenLabel: "Trash", emoji: "🗑️", color: "#7BD389" },
      childIds: [a, b],
      cadence: "daily",
      daypart: "morning",
      tokenValue: 1,
    });
    expect(useChoreStore.getState().chores.length).toBeGreaterThan(0);

    wipeAllChildData();
    expect(useChoreStore.getState().chores).toEqual([]);
  });
});
