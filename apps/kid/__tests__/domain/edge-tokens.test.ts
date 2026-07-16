/**
 * M4 ADVERSARIAL EDGE TESTS — redemption escrow races + token math.
 *
 * Probing the failure modes the happy-path suite skips: double-approve,
 * approve-after-decline, decline-after-approve, refund-after-approve, the
 * exactly-N auto-approve boundary, multi-pending escrow, and earn/spend math
 * after a redeem. The anti-shame invariant under test: a child can NEVER be
 * charged twice, charged for a declined reward, or driven negative — and a
 * non-approval can never cost a token (doc 66 §5.5).
 */
import { describe, expect, it } from "@jest/globals";

import { defaultChildSettings, freshLedger } from "../../src/domain/constants";
import { availableBalance, earn, refund } from "../../src/domain/gamification";
import {
  approveRedemption,
  cancelRedemption,
  declineRedemption,
  expireRedemption,
  fulfillRedemption,
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

describe("escrow races — a child can never be double-charged (§5.5)", () => {
  it("DOUBLE-APPROVE is idempotent: the second approve does not spend again", () => {
    const req = requestRedemption(ledgerWith(20), makeReward(), SETTINGS, [], { id: "rq", now: 1 });
    expect(req.ok).toBe(true);
    if (!req.ok) return;

    const first = approveRedemption(req.ledger, req.request, { now: 2 });
    expect(first.ledger.balance).toBe(10);
    expect(first.ledger.lifetimeSpent).toBe(10);

    // Parent double-taps "approve" (UI re-fires with the now-approved request).
    const second = approveRedemption(first.ledger, first.request, { now: 3 });
    expect(second.ledger.balance).toBe(10); // NOT 0 — no second spend
    expect(second.ledger.lifetimeSpent).toBe(10); // unchanged
    expect(second.ledger.heldTokens).toBe(0);
    expect(second.request.status).toBe("approved");
  });

  it("APPROVE-AFTER-DECLINE never charges the child for a declined reward", () => {
    const req = requestRedemption(ledgerWith(20), makeReward(), SETTINGS, [], { id: "rq", now: 1 });
    expect(req.ok).toBe(true);
    if (!req.ok) return;

    const declined = declineRedemption(req.ledger, req.request, 3);
    expect(declined.ledger.balance).toBe(20); // hold released, nothing spent
    expect(declined.ledger.heldTokens).toBe(0);

    // Stale parent UI fires "approve" on an already-declined request.
    const approved = approveRedemption(declined.ledger, declined.request, { now: 4 });
    expect(approved.ledger.balance).toBe(20); // still NOT charged
    expect(approved.ledger.lifetimeSpent).toBe(0);
    expect(approved.request.status).toBe("declined"); // stays terminal
  });

  it("DECLINE-AFTER-APPROVE does not release a phantom hold or clobber the spend", () => {
    const req = requestRedemption(ledgerWith(20), makeReward(), SETTINGS, [], { id: "rq", now: 1 });
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    const approved = approveRedemption(req.ledger, req.request, { now: 2 });

    const declined = declineRedemption(approved.ledger, approved.request, 5);
    // The approved spend stands; balance is not credited back, status not flipped.
    expect(declined.ledger.balance).toBe(10);
    expect(declined.ledger.heldTokens).toBe(0);
    expect(declined.ledger.lifetimeSpent).toBe(10);
    expect(declined.request.status).toBe("approved");
  });

  it("DOUBLE-DECLINE / decline-then-cancel does not double-release or clobber status", () => {
    const req = requestRedemption(ledgerWith(20), makeReward(), SETTINGS, [], { id: "rq", now: 1 });
    expect(req.ok).toBe(true);
    if (!req.ok) return;

    const declined = declineRedemption(req.ledger, req.request, 3, "Let's save up a little more!");
    expect(declined.ledger.heldTokens).toBe(0);

    const again = cancelRedemption(declined.ledger, declined.request, 4);
    expect(again.ledger.heldTokens).toBe(0); // no negative / double release
    expect(again.ledger.balance).toBe(20);
    expect(again.request.status).toBe("declined"); // terminal status preserved
    expect(again.request.declineReasonKidSafe).toBe("Let's save up a little more!");
  });

  it("EXPIRE-AFTER-APPROVE is a no-op (the spend stands, nothing refunded)", () => {
    const req = requestRedemption(ledgerWith(20), makeReward(), SETTINGS, [], { id: "rq", now: 1 });
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    const approved = approveRedemption(req.ledger, req.request, { now: 2 });
    const expired = expireRedemption(approved.ledger, approved.request, 9_999);
    expect(expired.ledger.balance).toBe(10);
    expect(expired.request.status).toBe("approved");
  });

  it("REFUND-then-re-APPROVE cannot re-charge (idempotent approve guards the race)", () => {
    const req = requestRedemption(ledgerWith(20), makeReward(), SETTINGS, [], { id: "rq", now: 1 });
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    const approved = approveRedemption(req.ledger, req.request, { now: 2 }); // balance 10
    // Parent reverses the spend (e.g. reward never delivered).
    const refunded = refund(approved.ledger, { id: "rf", ts: 3, amount: approved.request.costTokens });
    expect(refunded.ledger.balance).toBe(20);
    expect(refunded.ledger.lifetimeSpent).toBe(0);
    // A stale "approve" must not spend the refunded tokens a second time.
    const reapprove = approveRedemption(refunded.ledger, approved.request, { now: 4 });
    expect(reapprove.ledger.balance).toBe(20);
    expect(reapprove.ledger.lifetimeSpent).toBe(0);
  });
});

describe("fulfill is a forward-only, guarded transition", () => {
  const req = (status: RedemptionRequest["status"]): RedemptionRequest => ({
    id: "rq",
    childId: CID,
    rewardId: "screen_10",
    costTokens: 10,
    status,
    requestedAt: 0,
  });

  it("marks an APPROVED request as handed over", () => {
    const f = fulfillRedemption(req("approved"), 5);
    expect(f.status).toBe("fulfilled");
    expect(f.fulfilledAt).toBe(5);
  });

  it("re-fulfilling a fulfilled request is idempotent (no harm)", () => {
    const f = fulfillRedemption(req("fulfilled"), 9);
    expect(f.status).toBe("fulfilled");
  });

  it("NEVER marks a declined/expired/canceled reward as handed over", () => {
    for (const s of ["declined", "expired", "canceled", "requested"] as const) {
      const f = fulfillRedemption(req(s), 5);
      expect(f.status).toBe(s); // unchanged — a reward never received is not 'fulfilled'
      expect(f.fulfilledAt).toBeUndefined();
    }
  });
});

describe("auto-approve boundary — exactly N (doc 62 §7 step 2)", () => {
  const settings = (n: number) => ({ ...SETTINGS, autoApproveRedeemUnderTokens: n });

  it("cost EXACTLY equal to the threshold auto-approves (<= is the documented rule)", () => {
    expect(shouldAutoApprove(makeReward({ costTokens: 10 }), settings(10))).toBe(true);
    const res = requestRedemption(ledgerWith(20), makeReward({ costTokens: 10 }), settings(10), [], {
      id: "rq",
      now: 1,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.autoApproved).toBe(true);
    expect(res.ledger.balance).toBe(10); // spent immediately
    expect(res.ledger.heldTokens).toBe(0);
    expect(res.request.status).toBe("approved");
  });

  it("cost one over the threshold still needs a parent", () => {
    expect(shouldAutoApprove(makeReward({ costTokens: 11 }), settings(10))).toBe(false);
    const res = requestRedemption(ledgerWith(20), makeReward({ costTokens: 11 }), settings(10), [], {
      id: "rq",
      now: 1,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.autoApproved).toBe(false);
    expect(res.request.status).toBe("requested");
    expect(res.ledger.heldTokens).toBe(11); // held, not spent
  });

  it("a threshold of exactly 0 NEVER auto-approves, even a 0-cost reward", () => {
    expect(shouldAutoApprove(makeReward({ costTokens: 0 }), settings(0))).toBe(false);
  });
});

describe("multi-pending escrow — concurrent requests cannot over-spend", () => {
  it("two holds reserve the full balance; a third request is refused", () => {
    const start = ledgerWith(20);
    const a = requestRedemption(start, makeReward({ id: "a" }), SETTINGS, [], { id: "ra", now: 1 });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(availableBalance(a.ledger)).toBe(10); // 20 - 10 held

    const b = requestRedemption(a.ledger, makeReward({ id: "b" }), SETTINGS, [], { id: "rb", now: 2 });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.ledger.heldTokens).toBe(20);
    expect(availableBalance(b.ledger)).toBe(0);

    // No spendable tokens left — a third concurrent request is refused, no charge.
    const c = requestRedemption(b.ledger, makeReward({ id: "c" }), SETTINGS, [], { id: "rc", now: 3 });
    expect(c.ok).toBe(false);
    if (c.ok) return;
    expect(c.reason).toBe("insufficient_balance");

    // Approving both held requests spends exactly twice — balance floors at 0, never below.
    const apA = approveRedemption(b.ledger, a.request, { now: 4 });
    const apB = approveRedemption(apA.ledger, b.request, { now: 5 });
    expect(apB.ledger.balance).toBe(0);
    expect(apB.ledger.heldTokens).toBe(0);
    expect(apB.ledger.lifetimeSpent).toBe(20);
  });

  it("a request for exactly the available balance is allowed (boundary)", () => {
    const res = requestRedemption(ledgerWith(10), makeReward({ costTokens: 10 }), SETTINGS, [], {
      id: "rq",
      now: 1,
    });
    expect(res.ok).toBe(true);
  });
});

describe("token math after a redeem (negative / again-after-redeem)", () => {
  it("a full earn -> redeem -> earn -> redeem cycle keeps totals consistent", () => {
    let ledger = ledgerWith(30);
    const r1 = approveRedemption(
      (() => {
        const req = requestRedemption(ledger, makeReward({ costTokens: 10 }), SETTINGS, [], { id: "q1", now: 1 });
        if (!req.ok) throw new Error("req1");
        return req.ledger;
      })(),
      { id: "q1", childId: CID, rewardId: "screen_10", costTokens: 10, status: "requested", requestedAt: 1 },
      { now: 2 },
    );
    ledger = r1.ledger;
    expect(ledger.balance).toBe(20);

    // Earn again AFTER a redeem — the earn path is unaffected by prior spends.
    ledger = earn(ledger, { id: "e2", ts: 3, delta: 5, reason: "task_complete" }).ledger;
    expect(ledger.balance).toBe(25);
    expect(ledger.lifetimeEarned).toBe(35); // 30 + 5

    // A second redeem.
    const req2 = requestRedemption(ledger, makeReward({ costTokens: 10 }), SETTINGS, [], { id: "q2", now: 4 });
    expect(req2.ok).toBe(true);
    if (!req2.ok) return;
    const r2 = approveRedemption(req2.ledger, req2.request, { now: 5 });
    expect(r2.ledger.balance).toBe(15);
    expect(r2.ledger.lifetimeSpent).toBe(20);
    expect(r2.ledger.lifetimeEarned).toBe(35); // monotonic, untouched by spends
    expect(availableBalance(r2.ledger)).toBe(15);
  });
});
