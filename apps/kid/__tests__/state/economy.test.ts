/**
 * M8 token-economy integration over the gameplay orchestrator: redemption escrow
 * (hold -> approve spends exactly / decline+cancel refund zero-net), tokens never
 * negative, auto-approve-under-N, reward-at-limit unavailable, owned-forever
 * cosmetic token unlock, nurture wiring (lifetimeEarned -> bond/growth, shared
 * with M6), and the forgiving on-open reconciler (resting streak, never broken).
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import { availableBalance } from "../../src/domain/gamification";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import {
  cancelReward,
  approveReward,
  completeStep,
  createChildWithSeed,
  reconcileChild,
  requestReward,
  unlockCosmeticWithTokens,
} from "../../src/state/gameplay";
import { now } from "../../src/state/ids";
import { useRewardStore } from "../../src/state/rewardStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useTaskStore } from "../../src/state/taskStore";

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
  useRunProgressStore.setState({ active: {} });
});

const bal = (cid: string) => availableBalance(useChildStore.getState().ledgers[cid]);
const ledgerOf = (cid: string) => useChildStore.getState().ledgers[cid];

describe("redemption escrow (orchestrator)", () => {
  it("holds on request, then spends EXACTLY on approval — tokens never negative", () => {
    const cid = createChildWithSeed({ displayName: "Mia", ageMode: "older", timeZone: "UTC" });
    useChildStore.getState().giftTokens(cid, 8); // exactly the cost of extra_story
    const start = bal(cid);

    const req = requestReward(cid, "extra_story"); // cost 8
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    expect(req.autoApproved).toBe(false);
    expect(ledgerOf(cid).heldTokens).toBe(8);
    expect(ledgerOf(cid).balance).toBe(8); // not spent yet
    expect(bal(cid)).toBe(0); // fully held, spendable is 0 (never negative)

    approveReward(cid, req.request.id);
    expect(ledgerOf(cid).balance).toBe(start - 8); // 0
    expect(ledgerOf(cid).balance).toBeGreaterThanOrEqual(0); // never negative
    expect(ledgerOf(cid).heldTokens).toBe(0);
    expect(ledgerOf(cid).lifetimeSpent).toBe(8);
  });

  it("cancel ('never mind') releases the hold with ZERO net change", () => {
    const cid = createChildWithSeed({ displayName: "Leo", ageMode: "older", timeZone: "UTC" });
    useChildStore.getState().giftTokens(cid, 20);
    const start = bal(cid);

    const req = requestReward(cid, "extra_story");
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    expect(ledgerOf(cid).heldTokens).toBe(8);

    cancelReward(cid, req.request.id);
    expect(bal(cid)).toBe(start); // zero net
    expect(ledgerOf(cid).heldTokens).toBe(0);
    expect(ledgerOf(cid).lifetimeSpent).toBe(0);
    const rec = useRewardStore.getState().redemptions[cid].find((r) => r.id === req.request.id);
    expect(rec?.status).toBe("canceled");
  });

  it("a request the child cannot afford makes no charge (balance stays, never negative)", () => {
    const cid = createChildWithSeed({ displayName: "Ada", ageMode: "older", timeZone: "UTC" });
    const res = requestReward(cid, "extra_story"); // balance 0, cost 8
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("insufficient_balance");
    expect(bal(cid)).toBe(0);
    expect(ledgerOf(cid).heldTokens).toBe(0);
  });
});

describe("auto-approve under N", () => {
  it("auto-approves a small request without a parent and spends immediately", () => {
    const cid = createChildWithSeed({ displayName: "Sam", ageMode: "older", timeZone: "UTC" });
    useChildStore.getState().updateSettings(cid, { autoApproveRedeemUnderTokens: 50 });
    useChildStore.getState().giftTokens(cid, 30);
    const start = bal(cid);

    const res = requestReward(cid, "extra_story"); // cost 8 <= 50
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.autoApproved).toBe(true);
    expect(bal(cid)).toBe(start - 8);
    expect(ledgerOf(cid).heldTokens).toBe(0);
    expect(res.request.status).toBe("approved");
  });
});

describe("reward guardrails (availability, never punishment)", () => {
  it("a reward at its weekly limit is unavailable ('come back later'), no charge", () => {
    const cid = createChildWithSeed({ displayName: "Nia", ageMode: "older", timeZone: "UTC" });
    useChildStore.getState().giftTokens(cid, 100);
    useRewardStore.getState().updateReward(cid, "extra_story", { limitPerWeek: 1 });
    // a prior fulfilled grant this week consumes the single weekly slot
    useRewardStore.getState().addRedemption(cid, {
      id: "g1",
      childId: cid,
      rewardId: "extra_story",
      costTokens: 8,
      status: "fulfilled",
      requestedAt: now() - 1000,
      fulfilledAt: now() - 1000,
    });
    const start = bal(cid);

    const res = requestReward(cid, "extra_story");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("reward_unavailable");
    expect(bal(cid)).toBe(start); // unchanged
  });
});

describe("cosmetic token unlock (owned forever; no paywall; never negative)", () => {
  it("spends bubbles and the child owns it forever; balance never negative", () => {
    const cid = createChildWithSeed({ displayName: "Pia", ageMode: "young", timeZone: "UTC" });
    useChildStore.getState().giftTokens(cid, 20);
    const start = bal(cid);

    const res = unlockCosmeticWithTokens(cid, "color_meadow"); // cost 15
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.spent).toBe(15);
    expect(bal(cid)).toBe(start - 15);
    expect(bal(cid)).toBeGreaterThanOrEqual(0);
    expect(useBuddyStore.getState().companions[cid].unlockedItems).toContain("color_meadow");
  });

  it("is idempotent for an already-owned item (no second spend)", () => {
    const cid = createChildWithSeed({ displayName: "Ivo", ageMode: "young", timeZone: "UTC" });
    useChildStore.getState().giftTokens(cid, 40);
    unlockCosmeticWithTokens(cid, "color_meadow");
    const afterFirst = bal(cid);
    const again = unlockCosmeticWithTokens(cid, "color_meadow");
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.alreadyOwned).toBe(true);
    expect(again.spent).toBe(0);
    expect(bal(cid)).toBe(afterFirst); // no second charge
  });

  it("blocks a premium item from a child token purchase (no paywall)", () => {
    const cid = createChildWithSeed({ displayName: "Zoe", ageMode: "young", timeZone: "UTC" });
    useChildStore.getState().giftTokens(cid, 200);
    const res = unlockCosmeticWithTokens(cid, "color_aurora"); // premium
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("premium");
    expect(useBuddyStore.getState().companions[cid].unlockedItems).not.toContain("color_aurora");
  });

  it("blocks an unaffordable unlock without charging", () => {
    const cid = createChildWithSeed({ displayName: "Rio", ageMode: "young", timeZone: "UTC" });
    useChildStore.getState().giftTokens(cid, 5);
    const start = bal(cid);
    const res = unlockCosmeticWithTokens(cid, "color_meadow"); // cost 15
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("insufficient_balance");
    expect(bal(cid)).toBe(start);
  });
});

describe("nurture wiring (lifetimeEarned -> bond/growth, shared with M6)", () => {
  it("earning enough advances the buddy's bond + growth stage", () => {
    const cid = createChildWithSeed({ displayName: "Eli", ageMode: "older", timeZone: "UTC" });
    const routine = useTaskStore.getState().routines[cid][0];
    const step = useTaskStore.getState().tasks[cid].find((t) => t.routineId === routine.id)!;

    // pre-load lifetime earning to just under a growth boundary, then a real
    // completeStep carries it over — proving the wiring runs through gameplay.
    useChildStore.getState().giftTokens(cid, 100);
    const res = completeStep(cid, step);
    expect(res).not.toBeNull();
    expect(res?.leveledUp).toBe(true);

    const comp = useBuddyStore.getState().companions[cid];
    expect(comp.bondLevel).toBeGreaterThanOrEqual(4);
    expect(comp.growthStage).toBeGreaterThanOrEqual(1);
  });
});

describe("forgiving on-open reconciler", () => {
  it("surfaces a multi-day gap as a RESTING streak (never broken/0) + runs rollover", () => {
    const cid = createChildWithSeed({ displayName: "Uma", ageMode: "young", timeZone: "UTC" });
    const progress = useChildStore.getState().progress[cid];
    // an old last-active date with a real (non-paused) streak
    useChildStore.getState().setProgress(cid, {
      ...progress,
      cumulativeCount: 312,
      currentStreakDays: 5,
      longestStreakDays: 9,
      lastActiveDate: "2020-01-01",
      paused: false,
    });

    reconcileChild(cid);

    const after = useChildStore.getState().progress[cid];
    expect(after.paused).toBe(true); // resting, NOT broken
    expect(after.currentStreakDays).toBe(5); // never zeroed
    expect(after.longestStreakDays).toBe(9); // best preserved
    expect(after.cumulativeCount).toBe(312); // monotonic, untouched
    // the rollover reconciler also stamped today's day
    expect(useTaskStore.getState().lastRolloverDay[cid]).toBeTruthy();
  });
});
