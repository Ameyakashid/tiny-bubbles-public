/**
 * __tests__/state/quests.test.ts — the persisted quest store + gameplay novelty
 * wiring (novelty-refresh, M-C4). Proves: deterministic weekly rotation preserving
 * `everCompleted`; auto-claim exactly once (idempotent grant); the deterministic
 * spotlight bonus; calm/off suppression; and wipe/clear hygiene.
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import { isoWeekKey } from "../../src/domain/dates";
import { FEATURED_DAYPART_BONUS, featuredDaypartFor } from "../../src/domain/novelty";
import { routineDaypartOf } from "../../src/domain/tasks";
import { getQuestById } from "../../src/data/questPool";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useChoreStore } from "../../src/state/choreStore";
import {
  completeStep,
  createChildWithSeed,
  emitQuestSignal,
  reconcileChild,
  removeChild,
  rotateQuests,
  wipeAllChildData,
} from "../../src/state/gameplay";
import { useQuestStore } from "../../src/state/questStore";
import { useRewardStore } from "../../src/state/rewardStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useSessionStore } from "../../src/state/sessionStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";

const flush = () => new Promise<void>((r) => setTimeout(r, 10));

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
  useQuestStore.setState({ quests: {} });
  useSessionStore.getState().reset();
  useSettingsStore.getState().setActiveChild(null);
});

// ---------------------------------------------------------------------------
// Store unit: rotation + auto-claim.
// ---------------------------------------------------------------------------
describe("questStore rotation + auto-claim", () => {
  it("ensureRotation builds a fresh board + is idempotent within a week", () => {
    const pop5 = getQuestById("q_pop_5")!;
    useQuestStore.getState().ensureRotation("c1", "2026-W27", [pop5]);
    const first = useQuestStore.getState().quests["c1"];
    expect(first.weekKey).toBe("2026-W27");
    expect(first.active["q_pop_5"]).toMatchObject({ count: 0, claimed: false });

    // advance a bit, then re-ensure the SAME week → no reset (idempotent)
    useQuestStore.getState().onSignal("c1", { kind: "popBubbles", delta: 2 });
    useQuestStore.getState().ensureRotation("c1", "2026-W27", [pop5]);
    expect(useQuestStore.getState().quests["c1"].active["q_pop_5"].count).toBe(2);
  });

  it("a NEW week rotates the board but PRESERVES everCompleted (additive, no loss)", () => {
    const pop5 = getQuestById("q_pop_5")!;
    useQuestStore.getState().ensureRotation("c1", "2026-W27", [pop5]);
    useQuestStore.getState().onSignal("c1", { kind: "popBubbles", delta: 5 }); // completes q_pop_5
    expect(useQuestStore.getState().quests["c1"].everCompleted).toContain("q_pop_5");

    const daypart = getQuestById("q_daypart_3")!;
    useQuestStore.getState().ensureRotation("c1", "2026-W28", [daypart]);
    const next = useQuestStore.getState().quests["c1"];
    expect(next.weekKey).toBe("2026-W28");
    expect(next.active["q_pop_5"]).toBeUndefined(); // rotated out
    expect(next.active["q_daypart_3"]).toBeDefined();
    expect(next.everCompleted).toContain("q_pop_5"); // kept forever
  });

  it("onSignal auto-claims exactly ONCE at target (no double grant)", () => {
    const pop5 = getQuestById("q_pop_5")!; // target 5, reward 3
    useQuestStore.getState().ensureRotation("c1", "2026-W27", [pop5]);

    const c1 = useQuestStore.getState().onSignal("c1", { kind: "popBubbles", delta: 5 });
    expect(c1).toHaveLength(1);
    expect(c1[0]).toMatchObject({ questId: "q_pop_5", rewardTokens: 3 });
    expect(useQuestStore.getState().quests["c1"].active["q_pop_5"].claimed).toBe(true);

    // a further signal returns NO new claim (grant-once idempotency)
    const again = useQuestStore.getState().onSignal("c1", { kind: "popBubbles", delta: 5 });
    expect(again).toHaveLength(0);
    expect(useQuestStore.getState().quests["c1"].everCompleted.filter((q) => q === "q_pop_5")).toHaveLength(1);
  });

  it("onSignal only advances quests matching the signal kind/daypart", () => {
    const morning = getQuestById("q_morning_2")!; // completeDaypart, daypart morning, target 2
    useQuestStore.getState().ensureRotation("c1", "2026-W27", [morning]);
    useQuestStore.getState().onSignal("c1", { kind: "completeDaypart", delta: 1, daypart: "evening" });
    expect(useQuestStore.getState().quests["c1"].active["q_morning_2"].count).toBe(0); // wrong daypart
    useQuestStore.getState().onSignal("c1", { kind: "completeDaypart", delta: 1, daypart: "morning" });
    expect(useQuestStore.getState().quests["c1"].active["q_morning_2"].count).toBe(1);
  });

  it("clearChild drops a child's board", () => {
    useQuestStore.getState().ensureRotation("c1", "2026-W27", [getQuestById("q_pop_5")!]);
    useQuestStore.getState().clearChild("c1");
    expect(useQuestStore.getState().quests["c1"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Gameplay wiring: grant, spotlight, suppression, wipe.
// ---------------------------------------------------------------------------
describe("gameplay novelty wiring", () => {
  it("reconcileChild deterministically rotates a board for the current week", () => {
    const cid = createChildWithSeed({ displayName: "Rae", ageMode: "older", timeZone: "UTC" });
    reconcileChild(cid);
    const state = useQuestStore.getState().quests[cid];
    expect(state).toBeDefined();
    const weekKey = isoWeekKey(Date.now(), "UTC");
    expect(state.weekKey).toBe(weekKey);
    expect(Object.keys(state.active).length).toBeGreaterThan(0);
  });

  it("emitQuestSignal grants the deterministic reward on completion (reason quest_reward)", () => {
    const cid = createChildWithSeed({ displayName: "Ivy", ageMode: "older", timeZone: "UTC" });
    const weekKey = isoWeekKey(Date.now(), "UTC");
    // Inject a known single-quest board for THIS week (rotateQuests inside
    // emitQuestSignal is then an idempotent no-op, preserving this board).
    useQuestStore.getState().ensureRotation(cid, weekKey, [getQuestById("q_pop_5")!]); // reward 3
    const before = useChildStore.getState().ledgers[cid].balance;

    const claims = emitQuestSignal(cid, { kind: "popBubbles", delta: 5 });
    expect(claims).toHaveLength(1);
    const ledger = useChildStore.getState().ledgers[cid];
    expect(ledger.balance).toBe(before + 3);
    expect(ledger.entries.some((e) => e.reason === "quest_reward")).toBe(true);
  });

  it("a premium quest reward grants its seasonal cosmetic (owned forever)", () => {
    const cid = createChildWithSeed({ displayName: "Max", ageMode: "older", timeZone: "UTC" });
    const weekKey = isoWeekKey(Date.now(), "UTC");
    const spring = getQuestById("q_spring_bloom")!; // awards color_blossom_spring
    useQuestStore.getState().ensureRotation(cid, weekKey, [spring]);
    emitQuestSignal(cid, { kind: "popBubbles", delta: spring.target });
    expect(useBuddyStore.getState().companions[cid].unlockedItems).toContain("color_blossom_spring");
  });

  it("completing the SPOTLIGHT daypart routine pays the fixed spotlight bonus", () => {
    const cid = createChildWithSeed({ displayName: "Sky", ageMode: "older", timeZone: "UTC" });
    const featured = featuredDaypartFor(Date.now(), "UTC");
    const routine = useTaskStore
      .getState()
      .routines[cid].find((r) => routineDaypartOf(r) === featured)!;
    expect(routine).toBeDefined();
    const steps = useTaskStore
      .getState()
      .tasks[cid].filter((tk) => tk.routineId === routine.id)
      .sort((a, b) => a.order - b.order);
    useRunProgressStore.getState().startRun(cid, routine.id, steps.map((s) => s.id));

    steps.forEach((s, i) => completeStep(cid, s, { isRoutineComplete: i === steps.length - 1 }));

    const spotlightEntry = useChildStore
      .getState()
      .ledgers[cid].entries.find((e) => e.note === "Spotlight bonus");
    expect(spotlightEntry?.delta).toBe(FEATURED_DAYPART_BONUS);
    expect(spotlightEntry?.reason).toBe("quest_reward");
  });

  it("a NON-spotlight daypart routine pays NO spotlight bonus", () => {
    const cid = createChildWithSeed({ displayName: "Fox", ageMode: "older", timeZone: "UTC" });
    const featured = featuredDaypartFor(Date.now(), "UTC");
    const routine = useTaskStore
      .getState()
      .routines[cid].find((r) => routineDaypartOf(r) !== featured);
    if (!routine) return; // (defensive) all three seeds share a daypart — skip
    const steps = useTaskStore
      .getState()
      .tasks[cid].filter((tk) => tk.routineId === routine.id)
      .sort((a, b) => a.order - b.order);
    useRunProgressStore.getState().startRun(cid, routine.id, steps.map((s) => s.id));
    steps.forEach((s, i) => completeStep(cid, s, { isRoutineComplete: i === steps.length - 1 }));
    const spotlightEntry = useChildStore
      .getState()
      .ledgers[cid].entries.find((e) => e.note === "Spotlight bonus");
    expect(spotlightEntry).toBeUndefined();
  });

  it("calm mode / questsEnabled:false SUPPRESSES the whole novelty layer", () => {
    const cid = createChildWithSeed({ displayName: "Nel", ageMode: "older", timeZone: "UTC" });
    // calm mode
    useChildStore.getState().updateSettings(cid, { calmMode: true });
    const before = useChildStore.getState().ledgers[cid].balance;
    const claims = emitQuestSignal(cid, { kind: "popBubbles", delta: 99 });
    expect(claims).toEqual([]);
    expect(useQuestStore.getState().quests[cid]).toBeUndefined(); // no board built
    expect(useChildStore.getState().ledgers[cid].balance).toBe(before);

    // quests explicitly off (not calm)
    useChildStore.getState().updateSettings(cid, { calmMode: false, questsEnabled: false });
    expect(emitQuestSignal(cid, { kind: "popBubbles", delta: 99 })).toEqual([]);
    expect(useQuestStore.getState().quests[cid]).toBeUndefined();
  });

  it("removeChild clears that child's quest board", () => {
    const cid = createChildWithSeed({ displayName: "Uma", ageMode: "older", timeZone: "UTC" });
    rotateQuests(cid);
    expect(useQuestStore.getState().quests[cid]).toBeDefined();
    removeChild(cid);
    expect(useQuestStore.getState().quests[cid]).toBeUndefined();
  });

  it("wipeAllChildData empties tb/quests", async () => {
    const cid = createChildWithSeed({ displayName: "Zoe", ageMode: "older", timeZone: "UTC" });
    rotateQuests(cid);
    expect(Object.keys(useQuestStore.getState().quests).length).toBe(1);
    wipeAllChildData();
    await flush();
    expect(useQuestStore.getState().quests).toEqual({});
  });

  it("downgrade (free) never removes an OWNED seasonal cosmetic or clears everCompleted", () => {
    const cid = createChildWithSeed({ displayName: "Ada", ageMode: "older", timeZone: "UTC" });
    const weekKey = isoWeekKey(Date.now(), "UTC");
    const spring = getQuestById("q_spring_bloom")!;
    useQuestStore.getState().ensureRotation(cid, weekKey, [spring]);
    emitQuestSignal(cid, { kind: "popBubbles", delta: spring.target });
    const ownedBefore = [...useBuddyStore.getState().companions[cid].unlockedItems];
    const everBefore = [...useQuestStore.getState().quests[cid].everCompleted];

    // Simulate a downgrade + next week's rotation (free pool): premium quest rotates
    // out, but ownership + history are untouched (acquisition-only, novelty §8.3).
    useQuestStore.getState().ensureRotation(cid, "2026-W52", [getQuestById("q_pop_5")!]);
    expect(useBuddyStore.getState().companions[cid].unlockedItems).toEqual(ownedBefore);
    expect(useBuddyStore.getState().companions[cid].unlockedItems).toContain("color_blossom_spring");
    expect(useQuestStore.getState().quests[cid].everCompleted).toEqual(everBefore);
  });
});
