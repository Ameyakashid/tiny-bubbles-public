/**
 * Integration smoke for the M4 stores + cross-store orchestration: a real
 * create-child -> seed -> complete-step -> redeem flow, proving the Zustand
 * stores wire the pure domain logic correctly (and that the state layer loads
 * under jest-expo). The deep correctness lives in the pure-domain unit tests.
 */
import { beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useChoreStore } from "../../src/state/choreStore";
import {
  approveReward,
  completeStep,
  createChildWithSeed,
  createSharedChore,
  declineReward,
  removeChild,
  requestReward,
  switchActiveChild,
} from "../../src/state/gameplay";
import { useRewardStore } from "../../src/state/rewardStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useSessionStore } from "../../src/state/sessionStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";

/** Let the Zustand `persist` middleware flush its async write to (mock) AsyncStorage. */
const flush = () => new Promise<void>((r) => setTimeout(r, 10));

beforeEach(() => {
  // reset the singleton stores between cases
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
  useSessionStore.getState().reset();
  useSettingsStore.getState().setActiveChild(null);
});

describe("createChildWithSeed", () => {
  it("seeds 3 routines, 8 rewards, and a companion; marks the child seeded", () => {
    const cid = createChildWithSeed({ displayName: "Mia", ageMode: "young", timeZone: "UTC" });

    expect(useTaskStore.getState().routines[cid]).toHaveLength(3);
    expect(useRewardStore.getState().rewards[cid]).toHaveLength(8);
    expect(useBuddyStore.getState().companions[cid]).toBeDefined();
    expect(useChildStore.getState().seed.perChildSeeded).toContain(cid);

    // young after-school routine includes tidy_toys, NOT homework (age branch)
    const afterSchool = useTaskStore
      .getState()
      .routines[cid].find((r) => r.label.text === "After School");
    const steps = useTaskStore
      .getState()
      .tasks[cid].filter((t) => t.routineId === afterSchool?.id)
      .map((t) => t.templateId);
    expect(steps).toContain("tidy_toys");
    expect(steps).not.toContain("homework");

    // a young companion gets the cuddly species (resolved from companionStyle)
    expect(useBuddyStore.getState().companions[cid].speciesId).toBe("bloop");
  });
});

describe("completeStep (core loop brain)", () => {
  it("awards the base token, advances the run, and sets a positive buddy mood", () => {
    const cid = createChildWithSeed({ displayName: "Leo", ageMode: "older", timeZone: "UTC" });
    const routine = useTaskStore.getState().routines[cid][0];
    const steps = useTaskStore
      .getState()
      .tasks[cid].filter((t) => t.routineId === routine.id)
      .sort((a, b) => a.order - b.order);

    useRunProgressStore.getState().startRun(cid, routine.id, steps.map((s) => s.id));

    const result = completeStep(cid, steps[0]);
    expect(result).not.toBeNull();
    expect(result?.tokensAwarded).toBeGreaterThanOrEqual(1); // base ALWAYS paid

    expect(useChildStore.getState().ledgers[cid].balance).toBeGreaterThanOrEqual(1);
    expect(useTaskStore.getState().tasks[cid].find((t) => t.id === steps[0].id)?.status).toBe("done");
    expect(useRunProgressStore.getState().nextStep(cid)).toBe(steps[1].id); // resume pointer advanced
    expect(useBuddyStore.getState().companions[cid].mood).toBe("celebrating");
  });

  it("resumes at the next incomplete step after a simulated kill", () => {
    const cid = createChildWithSeed({ displayName: "Ada", ageMode: "young", timeZone: "UTC" });
    const routine = useTaskStore.getState().routines[cid][0];
    const steps = useTaskStore
      .getState()
      .tasks[cid].filter((t) => t.routineId === routine.id)
      .sort((a, b) => a.order - b.order);
    useRunProgressStore.getState().startRun(cid, routine.id, steps.map((s) => s.id));

    completeStep(cid, steps[0]);
    completeStep(cid, steps[1]);
    // "kill" = the persisted run-progress survives; the next incomplete step is step 3
    expect(useRunProgressStore.getState().nextStep(cid)).toBe(steps[2].id);
  });

  // M7 acceptance (doc 66 M7 / 67): one test that proves BOTH halves of the loop —
  // completing a step pays the base token + advances run-progress, AND that a true
  // KILL + RECONSTRUCT (wipe the JS heap, rehydrate purely from persisted storage)
  // resumes at the next incomplete step. Unlike the case above, this one drops the
  // in-memory state and rebuilds the resume pointer from the on-disk blob only.
  it("pays the base token, advances run-progress, and resumes after a kill+reconstruct from persistence", async () => {
    const cid = createChildWithSeed({ displayName: "Nova", ageMode: "young", timeZone: "UTC" });
    const routine = useTaskStore.getState().routines[cid][0];
    const steps = useTaskStore
      .getState()
      .tasks[cid].filter((t) => t.routineId === routine.id)
      .sort((a, b) => a.order - b.order);
    useRunProgressStore.getState().startRun(cid, routine.id, steps.map((s) => s.id));

    // --- complete a step: base token ALWAYS paid + every slice advanced ---
    const beforeBalance = useChildStore.getState().ledgers[cid].balance;
    const res = completeStep(cid, steps[0]);
    expect(res).not.toBeNull();
    expect(res?.tokensAwarded).toBeGreaterThanOrEqual(1); // base ALWAYS paid
    expect(useChildStore.getState().ledgers[cid].balance).toBe(
      beforeBalance + (res?.tokensAwarded ?? 0),
    );
    expect(useChildStore.getState().ledgers[cid].balance).toBeGreaterThanOrEqual(beforeBalance + 1);
    expect(
      useTaskStore.getState().tasks[cid].find((t) => t.id === steps[0].id)?.status,
    ).toBe("done");
    expect(useRunProgressStore.getState().nextStep(cid)).toBe(steps[1].id); // run advanced

    completeStep(cid, steps[1]); // advance one more before the "kill"
    await flush(); // let persist flush the run-progress to (mock) AsyncStorage

    // the resume pointer is genuinely ON DISK under its tb/-namespaced key
    const persisted = await AsyncStorage.getItem("tb/runProgress");
    expect(persisted).not.toBeNull();
    expect(persisted as string).toContain(steps[2].id);

    // --- KILL: the JS heap is gone; nothing survives in memory ---
    useRunProgressStore.setState({ active: {} });
    await flush(); // let the wipe's own persist write settle first
    expect(useRunProgressStore.getState().nextStep(cid)).toBeNull(); // memory is empty
    // a real cold start reads exactly the blob that existed at kill time (restore it,
    // since this module-singleton store cannot be re-instantiated like a fresh process)
    await AsyncStorage.setItem("tb/runProgress", persisted as string);

    // --- RECONSTRUCT: rehydrate purely from persistence and resume ---
    await useRunProgressStore.persist.rehydrate();
    expect(useRunProgressStore.getState().nextStep(cid)).toBe(steps[2].id);
  });
});

const TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();

describe("switchActiveChild (multi-child §2.1)", () => {
  it("sets the active child, clears the live run, and reconciles", () => {
    const a = createChildWithSeed({ displayName: "Ana", ageMode: "young", timeZone: TZ });
    const b = createChildWithSeed({ displayName: "Beto", ageMode: "older", timeZone: TZ });

    useSessionStore.getState().setActiveRun("run-xyz");
    switchActiveChild(a);

    expect(useSettingsStore.getState().meta.activeChildId).toBe(a);
    expect(useSessionStore.getState().activeRunId).toBeNull();

    // switching to b re-points without touching a's data (per-cid isolation).
    switchActiveChild(b);
    expect(useSettingsStore.getState().meta.activeChildId).toBe(b);
  });
});

describe("per-child isolation (multi-child §7 acceptance #1)", () => {
  it("completing a step as child A leaves child B's slices byte-identical", () => {
    const a = createChildWithSeed({ displayName: "Ana", ageMode: "older", timeZone: TZ });
    const b = createChildWithSeed({ displayName: "Beto", ageMode: "older", timeZone: TZ });

    const snapshot = () =>
      JSON.parse(
        JSON.stringify({
          ledger: useChildStore.getState().ledgers[b],
          progress: useChildStore.getState().progress[b],
          companion: useBuddyStore.getState().companions[b],
          tasks: useTaskStore.getState().tasks[b],
          rewards: useRewardStore.getState().rewards[b],
        }),
      );

    const before = snapshot();
    const stepA = useTaskStore.getState().tasks[a]![0];
    completeStep(a, stepA);
    expect(snapshot()).toEqual(before);
  });
});

describe("removeChild — roster hygiene (multi-child §3.4 / acceptance #7)", () => {
  it("archives the child, prunes them from every roster, and reassigns the active child", () => {
    const a = createChildWithSeed({ displayName: "Ana", ageMode: "young", timeZone: TZ });
    const b = createChildWithSeed({ displayName: "Beto", ageMode: "young", timeZone: TZ });
    createSharedChore({
      label: { spokenLabel: "Trash", emoji: "🗑️", color: "#7BD389" },
      childIds: [a, b],
      cadence: "daily",
      daypart: "morning",
      tokenValue: 1,
    });
    // b is the active child (last created).
    expect(useSettingsStore.getState().meta.activeChildId).toBe(b);

    removeChild(b);

    // b is archived (soft — never hard-deleted from the index).
    expect(useChildStore.getState().index.find((e) => e.id === b)?.archived).toBe(true);
    // the roster lost b and (now <2) the chore deactivated — never deleted.
    const chore = useChoreStore.getState().chores[0];
    expect(chore.childIds).toEqual([a]);
    expect(chore.active).toBe(false);
    // active child reassigned to the remaining non-archived child.
    expect(useSettingsStore.getState().meta.activeChildId).toBe(a);
    // a's data is completely intact (removing a sibling never touches it).
    expect(useChildStore.getState().ledgers[a]).toBeDefined();
    expect(useTaskStore.getState().tasks[a]?.length).toBeGreaterThan(0);
  });

  it("re-adding a sibling can reactivate a deactivated chore roster", () => {
    const a = createChildWithSeed({ displayName: "Ana", ageMode: "young", timeZone: TZ });
    const b = createChildWithSeed({ displayName: "Beto", ageMode: "young", timeZone: TZ });
    const choreId = createSharedChore({
      label: { spokenLabel: "Trash", emoji: "🗑️", color: "#7BD389" },
      childIds: [a, b],
      cadence: "daily",
      daypart: "morning",
      tokenValue: 1,
    });
    removeChild(b);
    expect(useChoreStore.getState().chores[0].active).toBe(false);

    // parent re-adds a sibling to the roster + reactivates (never a forced deletion).
    const c = createChildWithSeed({ displayName: "Cleo", ageMode: "young", timeZone: TZ });
    useChoreStore.getState().updateChore(choreId, { childIds: [a, c], active: true });
    expect(useChoreStore.getState().chores[0].active).toBe(true);
    expect(useChoreStore.getState().chores[0].childIds).toEqual([a, c]);
  });
});

describe("redemption escrow via the orchestrator", () => {
  it("decline refunds with zero net spend; approve spends exactly", () => {
    const cid = createChildWithSeed({ displayName: "Sam", ageMode: "older", timeZone: "UTC" });
    useChildStore.getState().giftTokens(cid, 30);
    const startBalance = useChildStore.getState().ledgers[cid].balance;

    // request the "extra_story" reward (cost 8)
    const req = requestReward(cid, "extra_story");
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    expect(useChildStore.getState().ledgers[cid].heldTokens).toBe(8);

    // decline -> hold released, nothing spent
    declineReward(cid, req.request.id, "Let's save up a little more!");
    expect(useChildStore.getState().ledgers[cid].balance).toBe(startBalance);
    expect(useChildStore.getState().ledgers[cid].heldTokens).toBe(0);
    expect(useChildStore.getState().ledgers[cid].lifetimeSpent).toBe(0);

    // request again + approve -> spends exactly 8
    const req2 = requestReward(cid, "extra_story");
    expect(req2.ok).toBe(true);
    if (!req2.ok) return;
    approveReward(cid, req2.request.id);
    expect(useChildStore.getState().ledgers[cid].balance).toBe(startBalance - 8);
    expect(useChildStore.getState().ledgers[cid].lifetimeSpent).toBe(8);
  });
});
