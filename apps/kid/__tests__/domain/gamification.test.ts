import { describe, expect, it } from "@jest/globals";

import {
  availableBalance,
  capEntries,
  earn,
  hold,
  refund,
  releaseHold,
  spend,
} from "../../src/domain/gamification";
import { freshLedger } from "../../src/domain/constants";
import type { TokenEntry } from "../../src/domain/types";

const CID = "child-1";

describe("earn (the hot path)", () => {
  it("appends an entry, bumps balance + lifetimeEarned + lastEarnedAt", () => {
    const { ledger, entry } = earn(freshLedger(CID), {
      id: "e1",
      ts: 1000,
      delta: 3,
      reason: "task_complete",
      baseValue: 1,
      multiplier: 3,
      note: "Brushed teeth!",
    });
    expect(ledger.balance).toBe(3);
    expect(ledger.lifetimeEarned).toBe(3);
    expect(ledger.lastEarnedAt).toBe(1000);
    expect(ledger.entries[0]).toEqual(entry);
    expect(entry.delta).toBe(3);
    expect(entry.baseValue).toBe(1);
  });

  it("ALWAYS pays the base token — earn never reduces a positive delta", () => {
    // The base token value is paid in full no matter the reason/phase upstream.
    const base = 1;
    const { ledger } = earn(freshLedger(CID), {
      id: "e",
      ts: 1,
      delta: base,
      reason: "task_complete",
      baseValue: base,
    });
    expect(ledger.balance).toBeGreaterThanOrEqual(base);
  });

  it("clamps a non-positive delta to 0 (earn is never a deduction)", () => {
    const { ledger } = earn(freshLedger(CID), { id: "z", ts: 1, delta: -5, reason: "adjustment" });
    expect(ledger.balance).toBe(0);
    expect(ledger.lifetimeEarned).toBe(0);
  });

  it("caps history at 500 entries while keeping monotonic totals", () => {
    let ledger = freshLedger(CID);
    for (let i = 0; i < 520; i++) {
      ledger = earn(ledger, { id: `e${i}`, ts: i, delta: 1, reason: "task_complete" }).ledger;
    }
    expect(ledger.entries.length).toBe(500);
    expect(ledger.lifetimeEarned).toBe(520); // aggregate never lost to capping
    expect(ledger.balance).toBe(520);
  });

  it("does not mutate the input ledger (pure)", () => {
    const before = freshLedger(CID);
    earn(before, { id: "e", ts: 1, delta: 2, reason: "task_complete" });
    expect(before.balance).toBe(0);
    expect(before.entries.length).toBe(0);
  });
});

describe("spend / refund (explicit negatives only — never auto-deduct)", () => {
  it("spend floors at the balance and grows lifetimeSpent", () => {
    const start = earn(freshLedger(CID), { id: "e", ts: 1, delta: 10, reason: "task_complete" }).ledger;
    const { ledger, entry } = spend(start, { id: "s", ts: 2, amount: 4, reason: "redeem" });
    expect(ledger.balance).toBe(6);
    expect(ledger.lifetimeSpent).toBe(4);
    expect(entry.delta).toBe(-4);
  });

  it("spend can never drive the balance negative", () => {
    const start = earn(freshLedger(CID), { id: "e", ts: 1, delta: 3, reason: "task_complete" }).ledger;
    const { ledger } = spend(start, { id: "s", ts: 2, amount: 999, reason: "redeem" });
    expect(ledger.balance).toBe(0);
    expect(ledger.lifetimeSpent).toBe(3);
  });

  it("refund is net-zero against a prior spend", () => {
    const earned = earn(freshLedger(CID), { id: "e", ts: 1, delta: 10, reason: "task_complete" }).ledger;
    const spent = spend(earned, { id: "s", ts: 2, amount: 4, reason: "redeem" }).ledger;
    const refunded = refund(spent, { id: "r", ts: 3, amount: 4 }).ledger;
    expect(refunded.balance).toBe(10);
    expect(refunded.lifetimeSpent).toBe(0);
  });
});

describe("escrow hold + availableBalance", () => {
  it("hold reserves tokens so availableBalance drops without spending", () => {
    const start = earn(freshLedger(CID), { id: "e", ts: 1, delta: 10, reason: "task_complete" }).ledger;
    const held = hold(start, 6);
    expect(held.balance).toBe(10); // balance unchanged — no spend
    expect(held.heldTokens).toBe(6);
    expect(availableBalance(held)).toBe(4);
  });

  it("cannot hold more than is available", () => {
    const start = earn(freshLedger(CID), { id: "e", ts: 1, delta: 5, reason: "task_complete" }).ledger;
    const held = hold(start, 999);
    expect(held.heldTokens).toBe(5);
    expect(availableBalance(held)).toBe(0);
  });

  it("releaseHold returns escrow with zero net change to balance", () => {
    const start = earn(freshLedger(CID), { id: "e", ts: 1, delta: 5, reason: "task_complete" }).ledger;
    const released = releaseHold(hold(start, 5), 5);
    expect(released.heldTokens).toBe(0);
    expect(released.balance).toBe(5);
  });
});

describe("capEntries", () => {
  it("keeps the most recent N (newest first)", () => {
    const entries: TokenEntry[] = Array.from({ length: 10 }, (_, i) => ({
      id: `e${i}`,
      ts: i,
      delta: 1,
      reason: "task_complete",
    }));
    expect(capEntries(entries, 3)).toHaveLength(3);
    expect(capEntries(entries, 3)[0].id).toBe("e0");
  });
});
