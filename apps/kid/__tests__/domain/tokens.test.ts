import { describe, expect, it } from "@jest/globals";

import { defaultChildSettings, freshLedger } from "../../src/domain/constants";
import { availableBalance, earn } from "../../src/domain/gamification";
import {
  approveRedemption,
  declineRedemption,
  isRewardAvailable,
  pendingRedemptions,
  requestRedemption,
  shouldAutoApprove,
} from "../../src/domain/tokens";
import type { RedemptionRequest, Reward, TokenLedger } from "../../src/domain/types";

const CID = "c1";

function ledgerWith(balance: number): TokenLedger {
  return earn(freshLedger(CID), { id: "seed", ts: 0, delta: balance, reason: "seed" }).ledger;
}

function makeReward(over: Partial<Reward> = {}): Reward {
  return {
    id: "screen_10",
    childId: CID,
    label: { spokenLabel: "10 minutes", color: "#5BC8F5" },
    category: "screen_time",
    costTokens: 10,
    active: true,
    requiresParentApproval: true,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

const SETTINGS = defaultChildSettings("older");

describe("requestRedemption (phase 1 — escrow hold, no spend yet)", () => {
  it("holds the cost without spending", () => {
    const res = requestRedemption(ledgerWith(20), makeReward(), SETTINGS, [], { id: "rq1", now: 1 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.autoApproved).toBe(false);
    expect(res.ledger.heldTokens).toBe(10);
    expect(res.ledger.balance).toBe(20); // balance unchanged — no spend
    expect(res.ledger.lifetimeSpent).toBe(0);
    expect(availableBalance(res.ledger)).toBe(10);
    expect(res.request.status).toBe("requested");
  });

  it("fails (no charge) when the child cannot afford it", () => {
    const res = requestRedemption(ledgerWith(3), makeReward(), SETTINGS, [], { id: "rq", now: 1 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("insufficient_balance");
  });
});

describe("approve / decline", () => {
  it("approve spends EXACTLY the held cost and releases the hold", () => {
    const req = requestRedemption(ledgerWith(20), makeReward(), SETTINGS, [], { id: "rq", now: 1 });
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    const approved = approveRedemption(req.ledger, req.request, { now: 2 });
    expect(approved.ledger.balance).toBe(10); // 20 - 10
    expect(approved.ledger.heldTokens).toBe(0);
    expect(approved.ledger.lifetimeSpent).toBe(10);
    expect(approved.request.status).toBe("approved");
    expect(approved.request.decidedBy).toBe("parent");
  });

  it("decline refunds the hold with ZERO net spend (anti-loss-aversion)", () => {
    const start = ledgerWith(20);
    const req = requestRedemption(start, makeReward(), SETTINGS, [], { id: "rq", now: 1 });
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    const declined = declineRedemption(req.ledger, req.request, 3, "Let's save up a little more!");
    expect(declined.ledger.balance).toBe(20); // unchanged
    expect(declined.ledger.heldTokens).toBe(0); // hold released
    expect(declined.ledger.lifetimeSpent).toBe(0); // never spent
    expect(declined.request.status).toBe("declined");
    expect(declined.request.declineReasonKidSafe).toBe("Let's save up a little more!");
    // net effect vs the starting ledger: zero
    expect(availableBalance(declined.ledger)).toBe(availableBalance(start));
  });
});

describe("auto-approve under N (doc 62 §7 step 2)", () => {
  it("auto-approves when cost is at/under the per-child threshold", () => {
    const settings = { ...SETTINGS, autoApproveRedeemUnderTokens: 15 };
    const res = requestRedemption(ledgerWith(20), makeReward({ costTokens: 10 }), settings, [], {
      id: "rq",
      now: 1,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.autoApproved).toBe(true);
    expect(res.ledger.balance).toBe(10); // spend already applied
    expect(res.ledger.heldTokens).toBe(0);
    expect(res.request.status).toBe("approved");
  });

  it("a threshold of 0 always requires a parent (no auto-approve)", () => {
    expect(shouldAutoApprove(makeReward({ costTokens: 5 }), { ...SETTINGS, autoApproveRedeemUnderTokens: 0 })).toBe(false);
  });

  it("a reward that does not require approval auto-approves regardless", () => {
    expect(shouldAutoApprove(makeReward({ requiresParentApproval: false }), SETTINGS)).toBe(true);
  });
});

describe("availability guardrails (availability, never punishment)", () => {
  const grant = (over: Partial<RedemptionRequest>): RedemptionRequest => ({
    id: "g",
    childId: CID,
    rewardId: "screen_10",
    costTokens: 10,
    status: "fulfilled",
    requestedAt: 0,
    fulfilledAt: 0,
    ...over,
  });

  it("is unavailable inside a cooldown window", () => {
    const reward = makeReward({ cooldownHours: 24 });
    const oneHour = 60 * 60 * 1000;
    const recent = grant({ fulfilledAt: 0 });
    expect(isRewardAvailable(reward, [recent], oneHour).available).toBe(false);
    expect(isRewardAvailable(reward, [recent], 25 * oneHour).available).toBe(true);
  });

  it("is unavailable once the weekly limit is reached", () => {
    const reward = makeReward({ limitPerWeek: 2 });
    const now = 7 * 24 * 60 * 60 * 1000;
    const recent = [grant({ id: "a", fulfilledAt: now - 1000 }), grant({ id: "b", fulfilledAt: now - 2000 })];
    expect(isRewardAvailable(reward, recent, now).available).toBe(false);
    expect(isRewardAvailable(reward, recent, now).reason).toBe("weekly_limit");
  });

  it("blocks a request for a reward at its limit (reward_unavailable, no charge)", () => {
    const reward = makeReward({ limitPerWeek: 1 });
    const now = 1000;
    const grants = [grant({ fulfilledAt: 500 })];
    const res = requestRedemption(ledgerWith(50), reward, SETTINGS, grants, { id: "rq", now });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("reward_unavailable");
  });
});

describe("pendingRedemptions", () => {
  it("returns only still-requested entries", () => {
    const list: RedemptionRequest[] = [
      { id: "1", childId: CID, rewardId: "x", costTokens: 1, status: "requested", requestedAt: 0 },
      { id: "2", childId: CID, rewardId: "x", costTokens: 1, status: "approved", requestedAt: 0 },
    ];
    expect(pendingRedemptions(list)).toHaveLength(1);
    expect(pendingRedemptions(list)[0].id).toBe("1");
  });
});
