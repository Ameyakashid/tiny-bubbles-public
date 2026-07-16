/**
 * Integration tests for the verify + quick-undo orchestrators (verify-undo,
 * feature #17): verify NEVER gates + is token-neutral; step undo restores balance
 * + status + run pointer but leaves lifetimeEarned/cumulativeCount/buddy growth
 * UNCHANGED; last-step undo clears the daypart mark + re-arms; redemption reverse
 * refunds + flips to `reversed` + guardrail recovers; re-verify + wipe delete the
 * on-device photo (mocked photoVerify). The pure math lives in undo.test.ts.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Photo seam is mocked: capture unavailable, deletePhoto observable (no native dep).
jest.mock("../../src/services/photoVerify", () => ({
  isPhotoVerifyAvailable: jest.fn(() => false),
  capturePhoto: jest.fn(async () => null),
  deletePhoto: jest.fn(async () => {}),
}));

import { isoDay } from "../../src/domain/dates";
import { routineDaypartOf } from "../../src/domain/tasks";
import { isRewardAvailable } from "../../src/domain/tokens";
import { makeReward } from "../../src/domain/constants";
import type { Task } from "../../src/domain/types";
import { deletePhoto } from "../../src/services/photoVerify";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import {
  approveReward,
  assignTaskFromTemplate,
  completeStep,
  createChildWithSeed,
  requestReward,
  reverseRedemption,
  undoStep,
  verifyStep,
  wipeAllChildData,
} from "../../src/state/gameplay";
import { now } from "../../src/state/ids";
import { useRewardStore } from "../../src/state/rewardStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";

const deletePhotoMock = deletePhoto as unknown as jest.Mock;

function seedRun(displayName: string, ageMode: "young" | "older") {
  const cid = createChildWithSeed({ displayName, ageMode, timeZone: "UTC" });
  const routine = useTaskStore.getState().routines[cid][0];
  const steps = useTaskStore
    .getState()
    .tasks[cid].filter((t) => t.routineId === routine.id)
    .sort((a, b) => a.order - b.order);
  useRunProgressStore.getState().startRun(cid, routine.id, steps.map((s) => s.id));
  return { cid, routine, steps };
}

const taskById = (cid: string, id: string): Task | undefined =>
  useTaskStore.getState().tasks[cid].find((t) => t.id === id);

beforeEach(() => {
  deletePhotoMock.mockClear();
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
});

describe("verify never gates + is token-neutral", () => {
  it("pays the base token regardless of mode, and self-verify changes NO ledger value", () => {
    const { cid, steps } = seedRun("Mia", "older");
    // attach mode:'parent' — a bonus confirmation, never a gate
    useTaskStore.getState().updateTask(cid, steps[0].id, {
      verification: { ...steps[0].verification, mode: "parent" },
    });

    const res = completeStep(cid, taskById(cid, steps[0].id) as Task);
    expect(res?.tokensAwarded).toBeGreaterThanOrEqual(1); // paid immediately, verify irrelevant

    const before = { ...useChildStore.getState().ledgers[cid] };
    void verifyStep(cid, steps[0].id, { by: "child" });
    const after = useChildStore.getState().ledgers[cid];
    expect(after.balance).toBe(before.balance);
    expect(after.lifetimeEarned).toBe(before.lifetimeEarned);
    expect(after.entries.length).toBe(before.entries.length);

    const stamped = taskById(cid, steps[0].id);
    expect(stamped?.verification.verifiedBy).toBe("child");
    expect(typeof stamped?.verification.verifiedAt).toBe("number");
  });
});

describe("step undo (non-last)", () => {
  it("restores balance + status + run pointer but leaves lifetime/cumulative/buddy growth intact", () => {
    const { cid, steps } = seedRun("Leo", "older");
    completeStep(cid, steps[0]);
    const afterStep0 = useChildStore.getState().ledgers[cid].balance;
    completeStep(cid, steps[1]);

    const ledgerAfter = useChildStore.getState().ledgers[cid];
    const delta1 = ledgerAfter.balance - afterStep0;
    const lifetimeBefore = ledgerAfter.lifetimeEarned;
    const cumulativeBefore = useChildStore.getState().progress[cid].cumulativeCount;
    const growthBefore = useBuddyStore.getState().companions[cid].growthStage;

    undoStep(cid, steps[1].id);

    const l = useChildStore.getState().ledgers[cid];
    expect(l.balance).toBe(afterStep0); // spendable currency corrected
    expect(l.lifetimeEarned).toBe(lifetimeBefore); // monotonic — never regresses
    expect(useChildStore.getState().progress[cid].cumulativeCount).toBe(cumulativeBefore);
    expect(useBuddyStore.getState().companions[cid].growthStage).toBe(growthBefore);
    expect(delta1).toBeGreaterThanOrEqual(1);

    expect(taskById(cid, steps[1].id)?.status).toBe("todo"); // to-do again
    expect(useRunProgressStore.getState().nextStep(cid)).toBe(steps[1].id); // re-armed as current
  });

  it("floors the balance at 0 when tokens were spent between the tap and the undo", () => {
    const { cid, steps } = seedRun("Ada", "young");
    completeStep(cid, steps[0]);
    const l0 = useChildStore.getState().ledgers[cid];
    // simulate the child having spent everything before undoing
    useChildStore.getState().setLedger(cid, { ...l0, balance: 0 });

    undoStep(cid, steps[0].id);
    const l = useChildStore.getState().ledgers[cid];
    expect(l.balance).toBe(0); // never negative
    expect(l.lifetimeEarned).toBe(l0.lifetimeEarned); // untouched
  });
});

describe("step undo (last step)", () => {
  it("clears the daypart-complete mark and re-arms the run at the final step", () => {
    const { cid, routine, steps } = seedRun("Nova", "young");
    const tz = "UTC";
    const dp = routineDaypartOf(routine);
    const today = isoDay(now(), tz);

    // complete every step (the last auto-clears the active run), then stamp the
    // daypart done exactly as the runner does on the final Done.
    steps.forEach((s) => completeStep(cid, taskById(cid, s.id) as Task, { isRoutineComplete: false }));
    useRunProgressStore.getState().markDaypartComplete(cid, today, dp);
    expect(useRunProgressStore.getState().isDaypartComplete(cid, today, dp)).toBe(true);
    expect(useRunProgressStore.getState().active[cid]).toBeNull(); // auto-cleared

    const last = steps[steps.length - 1];
    undoStep(cid, last.id);

    expect(useRunProgressStore.getState().isDaypartComplete(cid, today, dp)).toBe(false);
    const run = useRunProgressStore.getState().active[cid];
    expect(run).not.toBeNull();
    expect(useRunProgressStore.getState().nextStep(cid)).toBe(last.id); // yields back to it
    expect(taskById(cid, last.id)?.status).toBe("todo");
  });
});

describe("redemption reverse", () => {
  it("refunds the cost, flips status to reversed, and recovers guardrail availability", () => {
    const cid = createChildWithSeed({ displayName: "Sam", ageMode: "older", timeZone: "UTC" });
    useChildStore.getState().giftTokens(cid, 20);

    // a reward with a weekly limit of 1 — one grant makes it unavailable
    const reward = makeReward(cid, now(), {
      id: "rw_limit",
      label: { spokenLabel: "Movie night", color: "#FFD166", emoji: "🎬" },
      category: "treat",
      costTokens: 5,
      active: true,
      requiresParentApproval: true,
      limitPerWeek: 1,
    });
    useRewardStore.getState().addReward(cid, reward);

    const req = requestReward(cid, "rw_limit");
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    approveReward(cid, req.request.id);

    const spent = useChildStore.getState().ledgers[cid];
    expect(spent.balance).toBe(15);
    expect(spent.lifetimeSpent).toBe(5);
    expect(isRewardAvailable(reward, useRewardStore.getState().redemptions[cid], now()).available).toBe(false);

    const res = reverseRedemption(cid, req.request.id);
    expect(res?.request.status).toBe("reversed");
    const refunded = useChildStore.getState().ledgers[cid];
    expect(refunded.balance).toBe(20); // fully refunded
    expect(refunded.lifetimeSpent).toBe(0);
    // a reversed grant no longer counts — availability recovers
    expect(isRewardAvailable(reward, useRewardStore.getState().redemptions[cid], now()).available).toBe(true);
  });
});

describe("photo lifecycle (on-device, never orphaned)", () => {
  it("re-verify deletes the prior photo before stamping the new one", async () => {
    const cid = createChildWithSeed({ displayName: "Rae", ageMode: "older", timeZone: "UTC" });
    const taskId = assignTaskFromTemplate(cid, { templateId: "brush_teeth" }) as string;
    useTaskStore.getState().updateTask(cid, taskId, {
      verification: { mode: "photo", required: false, photoUri: "file:///old.jpg" },
    });

    await verifyStep(cid, taskId, { by: "child", photoUri: "file:///new.jpg" });
    expect(deletePhotoMock).toHaveBeenCalledWith("file:///old.jpg");
    expect(taskById(cid, taskId)?.verification.photoUri).toBe("file:///new.jpg");
  });

  it("wipeAllChildData deletes every child photo (no orphaned files)", () => {
    const cid = createChildWithSeed({ displayName: "Ivy", ageMode: "older", timeZone: "UTC" });
    const taskId = assignTaskFromTemplate(cid, { templateId: "brush_teeth" }) as string;
    useTaskStore.getState().updateTask(cid, taskId, {
      verification: { mode: "photo", required: false, photoUri: "file:///wipe-me.jpg" },
    });

    wipeAllChildData();
    expect(deletePhotoMock).toHaveBeenCalledWith("file:///wipe-me.jpg");
  });
});
