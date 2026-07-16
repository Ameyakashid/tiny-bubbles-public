/**
 * Pure-domain unit tests for the light-verify + quick-undo primitives (verify-undo
 * §3, feature #17): `undoEarn` (floors at 0, leaves BOTH lifetime totals),
 * `latestEarnFor`, `reverseRedemption` (grant-only guard), and the parent-verify
 * selectors. No stores, no clock — everything deterministic.
 */
import { describe, expect, it } from "@jest/globals";

import { freshLedger } from "../../src/domain/constants";
import { earn, latestEarnFor, undoEarn } from "../../src/domain/gamification";
import { reverseRedemption } from "../../src/domain/tokens";
import { needsParentVerify, stepsAwaitingParentVerify } from "../../src/domain/tasks";
import type { RedemptionRequest, Task, VerificationMode } from "../../src/domain/types";

function mkTask(over: Partial<Task> & { id: string }): Task {
  return {
    childId: "c1",
    templateId: null,
    routineId: "r1",
    order: 0,
    label: { spokenLabel: "Task", color: "#5BC8F5" },
    verification: { mode: "none", required: false },
    tokenValue: 1,
    deadline: "today",
    schedule: { daysOfWeek: [] },
    status: "todo",
    createdAt: 0,
    updatedAt: 0,
    archived: false,
    ...over,
  };
}

describe("undoEarn", () => {
  it("lowers balance by the amount, floored at 0, and NEVER touches lifetime totals", () => {
    const { ledger: earned } = earn(freshLedger("c1"), {
      id: "e1",
      ts: 100,
      delta: 5,
      reason: "task_complete",
      refId: "t1",
    });
    expect(earned.balance).toBe(5);
    expect(earned.lifetimeEarned).toBe(5);

    const { ledger, entry } = undoEarn(earned, { id: "u1", ts: 200, amount: 5, refId: "t1" });
    expect(ledger.balance).toBe(0);
    // the whole point: monotonic/felt-progress signals never regress
    expect(ledger.lifetimeEarned).toBe(5);
    expect(ledger.lifetimeSpent).toBe(0);
    expect(entry.reason).toBe("undo");
    expect(entry.delta).toBe(-5);
  });

  it("floors at 0 when tokens were spent between the tap and the undo (never negative)", () => {
    const spentDown = { ...freshLedger("c1"), balance: 3, lifetimeEarned: 5, lifetimeSpent: 2 };
    const { ledger, entry } = undoEarn(spentDown, { id: "u2", ts: 1, amount: 5 });
    expect(ledger.balance).toBe(0); // removed only what was there (3), never below 0
    expect(entry.delta).toBe(-3);
    expect(ledger.lifetimeEarned).toBe(5); // unchanged
    expect(ledger.lifetimeSpent).toBe(2); // unchanged
  });
});

describe("latestEarnFor", () => {
  it("returns the most recent completion earn for a refId, ignoring non-completion entries", () => {
    let l = freshLedger("c1");
    l = earn(l, { id: "e1", ts: 1, delta: 2, reason: "task_complete", refId: "t1" }).ledger;
    l = earn(l, { id: "g1", ts: 2, delta: 9, reason: "parent_gift", refId: "t1" }).ledger;
    l = earn(l, { id: "e2", ts: 3, delta: 3, reason: "task_complete", refId: "t1" }).ledger;

    const found = latestEarnFor(l, "t1");
    expect(found?.id).toBe("e2"); // newest completion earn
    expect(found?.delta).toBe(3);
    expect(latestEarnFor(l, "missing")).toBeNull();
  });
});

describe("reverseRedemption (guarded)", () => {
  const base: RedemptionRequest = {
    id: "req1",
    childId: "c1",
    rewardId: "rw1",
    costTokens: 8,
    status: "approved",
    requestedAt: 1,
    decidedAt: 2,
  };
  const ledger = { ...freshLedger("c1"), balance: 2, lifetimeSpent: 8 };

  it("refunds the cost and flips an approved grant to reversed", () => {
    const res = reverseRedemption(ledger, base, { id: "x1", now: 10 });
    expect(res.ledger.balance).toBe(10); // 2 + 8 refunded
    expect(res.ledger.lifetimeSpent).toBe(0); // 8 - 8
    expect(res.request.status).toBe("reversed");
  });

  it("is a no-op on a non-grant (requested / declined / already-reversed) request", () => {
    for (const status of ["requested", "declined", "canceled", "expired", "reversed"] as const) {
      const res = reverseRedemption(ledger, { ...base, status }, { id: "x", now: 10 });
      expect(res.ledger.balance).toBe(2); // untouched — no double refund
      expect(res.request.status).toBe(status); // terminal status preserved
    }
  });
});

describe("needsParentVerify / stepsAwaitingParentVerify", () => {
  it("flags only a done, mode:'parent', unconfirmed step", () => {
    const done = mkTask({ id: "a", status: "done", verification: { mode: "parent", required: false } });
    expect(needsParentVerify(done)).toBe(true);

    // confirmed after this completion → no longer awaiting
    const confirmed = mkTask({
      id: "b",
      status: "done",
      lastCompletedAt: 100,
      verification: { mode: "parent", required: false, verifiedBy: "parent", verifiedAt: 150 },
    });
    expect(needsParentVerify(confirmed)).toBe(false);

    // wrong mode / not done → never awaiting
    for (const mode of ["none", "self", "photo"] as VerificationMode[]) {
      expect(needsParentVerify(mkTask({ id: mode, status: "done", verification: { mode, required: false } }))).toBe(false);
    }
    expect(needsParentVerify(mkTask({ id: "todo", status: "todo", verification: { mode: "parent", required: false } }))).toBe(false);
  });

  it("collects only the non-archived awaiting steps", () => {
    const list: Task[] = [
      mkTask({ id: "1", status: "done", verification: { mode: "parent", required: false } }),
      mkTask({ id: "2", status: "done", archived: true, verification: { mode: "parent", required: false } }),
      mkTask({ id: "3", status: "todo", verification: { mode: "parent", required: false } }),
    ];
    expect(stepsAwaitingParentVerify(list).map((t) => t.id)).toEqual(["1"]);
  });
});
