/**
 * __tests__/state/planStore.test.ts — the persisted if-then plan store (`tb/plans`,
 * if-then-plans M-C5) + its wipe/remove hygiene. Proves: CRUD, the active toggle,
 * the propose→approve→live queue, archive/dismiss (never a "reject"), clearChild,
 * `partialize` (only `plans` is persisted), and that wipe/remove clear the slice.
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import { planFromTemplates, situationCue, actionFromTemplate, SITUATION_TEMPLATES, PLAN_ACTION_TEMPLATES } from "../../src/data/planTemplates";
import type { Plan } from "../../src/domain/types";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useChoreStore } from "../../src/state/choreStore";
import { createChildWithSeed, removeChild, wipeAllChildData } from "../../src/state/gameplay";
import { usePlanStore } from "../../src/state/planStore";
import { useQuestStore } from "../../src/state/questStore";
import { useRewardStore } from "../../src/state/rewardStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useSessionStore } from "../../src/state/sessionStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";

const flush = () => new Promise<void>((r) => setTimeout(r, 10));

let seq = 0;
function makePlan(over: Partial<Plan> = {}): Plan {
  return planFromTemplates({
    id: `p${seq++}`,
    childId: "c1",
    now: 1000,
    cue: situationCue(SITUATION_TEMPLATES[0]),
    action: actionFromTemplate(PLAN_ACTION_TEMPLATES[0]),
    ...over,
  });
}

beforeEach(() => {
  usePlanStore.setState({ plans: {} });
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
  useQuestStore.setState({ quests: {} });
  useSessionStore.getState().reset();
  useSettingsStore.getState().setActiveChild(null);
});

describe("planStore CRUD + toggles", () => {
  it("addPlan appends a live plan; updatePlan patches + bumps updatedAt", () => {
    const plan = makePlan();
    usePlanStore.getState().addPlan("c1", plan);
    expect(usePlanStore.getState().plans["c1"]).toHaveLength(1);
    expect(usePlanStore.getState().plans["c1"][0]).toMatchObject({ active: true, archived: false });

    usePlanStore.getState().updatePlan("c1", plan.id, { authoredBy: "parent" });
    const patched = usePlanStore.getState().plans["c1"][0];
    expect(patched.authoredBy).toBe("parent");
    expect(patched.updatedAt).toBeGreaterThan(plan.updatedAt);
  });

  it("setPlanActive flips the toggle; archivePlan soft-removes (active off, never a delete)", () => {
    const plan = makePlan();
    usePlanStore.getState().addPlan("c1", plan);
    usePlanStore.getState().setPlanActive("c1", plan.id, false);
    expect(usePlanStore.getState().plans["c1"][0].active).toBe(false);

    usePlanStore.getState().archivePlan("c1", plan.id);
    const p = usePlanStore.getState().plans["c1"][0];
    expect(p.archived).toBe(true);
    expect(p.active).toBe(false);
    // still present (soft remove, not a hard delete)
    expect(usePlanStore.getState().plans["c1"]).toHaveLength(1);
  });
});

describe("kid proposal queue", () => {
  it("propose → approve makes a plan live; dismiss archives it (never a reject)", () => {
    const proposal = makePlan();
    usePlanStore.getState().proposePlan("c1", proposal);
    let held = usePlanStore.getState().plans["c1"][0];
    expect(held).toMatchObject({ proposed: true, active: false });

    usePlanStore.getState().approvePlan("c1", proposal.id);
    held = usePlanStore.getState().plans["c1"][0];
    expect(held).toMatchObject({ proposed: false, active: true });

    // a second proposal that gets dismissed → archived, never a shaming reject
    const p2 = makePlan();
    usePlanStore.getState().proposePlan("c1", p2);
    usePlanStore.getState().dismissPlan("c1", p2.id);
    const dismissed = usePlanStore.getState().plans["c1"].find((p) => p.id === p2.id)!;
    expect(dismissed).toMatchObject({ archived: true, active: false });
  });
});

describe("persistence + hygiene", () => {
  it("partialize persists ONLY the plans map (no functions)", () => {
    const partialize = usePlanStore.persist.getOptions().partialize!;
    usePlanStore.getState().addPlan("c1", makePlan());
    const persisted = partialize(usePlanStore.getState());
    expect(Object.keys(persisted)).toEqual(["plans"]);
  });

  it("clearChild drops one child's plans", () => {
    usePlanStore.getState().addPlan("c1", makePlan({ childId: "c1" }));
    usePlanStore.getState().addPlan("c2", makePlan({ childId: "c2" }));
    usePlanStore.getState().clearChild("c1");
    expect(usePlanStore.getState().plans["c1"]).toBeUndefined();
    expect(usePlanStore.getState().plans["c2"]).toHaveLength(1);
  });

  it("removeChild clears that child's plans", () => {
    const cid = createChildWithSeed({ displayName: "Wren", ageMode: "older", timeZone: "UTC" });
    usePlanStore.getState().addPlan(cid, makePlan({ childId: cid }));
    removeChild(cid);
    expect(usePlanStore.getState().plans[cid]).toBeUndefined();
  });

  it("wipeAllChildData empties tb/plans", async () => {
    usePlanStore.getState().addPlan("c1", makePlan());
    expect(Object.keys(usePlanStore.getState().plans).length).toBe(1);
    wipeAllChildData();
    await flush();
    expect(usePlanStore.getState().plans).toEqual({});
  });
});
