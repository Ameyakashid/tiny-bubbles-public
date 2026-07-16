/**
 * src/domain/gamification.ts — the token ledger (immediate payout).
 *
 * Re-authored from the PATTERN in tether's `GamificationService.awardPoints()`
 * (doc 62 §6, doc 66 §1b.2): append an event, update the monotonic totals, cap
 * the history. Restructured as an auditable ledger so spends/redemptions are
 * traceable and the balance can never go silently negative.
 *
 * HARD INVARIANTS (doc 62 §6, doc 66 §5.5):
 *   - NEVER auto-deduct. No path here removes tokens for inactivity/lateness/a
 *     missed task. The only negatives are explicit spends (redeem / parent
 *     adjustment / undo of an accidental tap).
 *   - `balance` and `heldTokens` are always >= 0.
 *   - `lifetimeEarned` / `lifetimeSpent` are monotonic (only ever increase).
 *
 * Pure: every function returns a NEW ledger (+ the created entry) and never
 * mutates its input. `now` and `id` are passed in so the hot path is fully
 * deterministic + unit-testable (no clock, no RNG — doc 66 §5.4).
 */
import { LEDGER_ENTRY_CAP } from "./constants";
import type { TokenEntry, TokenLedger, TokenReason } from "./types";

/** Keep only the most recent `cap` entries (newest first). */
export function capEntries(entries: TokenEntry[], cap = LEDGER_ENTRY_CAP): TokenEntry[] {
  return entries.length > cap ? entries.slice(0, cap) : entries;
}

/** Spendable-now balance: `balance - heldTokens` (doc 62 §6/§13). */
export function availableBalance(ledger: TokenLedger): number {
  return Math.max(0, ledger.balance - ledger.heldTokens);
}

export interface EarnInput {
  id: string;
  ts: number;
  /** must be > 0 — this is the earn path (use `spend`/`refund` for negatives) */
  delta: number;
  reason: TokenReason;
  refId?: string;
  baseValue?: number;
  multiplier?: number;
  note?: string;
}

export interface EarnResult {
  ledger: TokenLedger;
  entry: TokenEntry;
}

/**
 * The hot path (doc 62 §6). Append a positive `delta`, bump `balance` +
 * `lifetimeEarned` + `lastEarnedAt`, and cap the history. The base token is
 * ALWAYS paid here — reinforcement only ever ADDS a bonus on top, it can never
 * reduce this delta below the task's base value (doc 66 §5.3).
 *
 * A non-positive delta is clamped to 0 (earn is never a deduction); use `spend`.
 */
export function earn(ledger: TokenLedger, input: EarnInput): EarnResult {
  const delta = Math.max(0, input.delta);
  const entry: TokenEntry = {
    id: input.id,
    ts: input.ts,
    delta,
    reason: input.reason,
    ...(input.refId !== undefined ? { refId: input.refId } : {}),
    ...(input.baseValue !== undefined ? { baseValue: input.baseValue } : {}),
    ...(input.multiplier !== undefined ? { multiplier: input.multiplier } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
  };
  const next: TokenLedger = {
    ...ledger,
    balance: ledger.balance + delta,
    lifetimeEarned: ledger.lifetimeEarned + delta,
    lastEarnedAt: input.ts,
    entries: capEntries([entry, ...ledger.entries]),
  };
  return { ledger: next, entry };
}

export interface SpendInput {
  id: string;
  ts: number;
  /** positive amount to spend; the entry's delta is recorded negative */
  amount: number;
  reason: Extract<TokenReason, "redeem" | "adjustment" | "undo">;
  refId?: string;
  note?: string;
}

/**
 * Record an explicit spend (doc 62 §6/§7). The balance is floored at 0 (a spend
 * can never drive it negative) and `lifetimeSpent` grows by the amount actually
 * removed. This is the ONLY way tokens leave the balance.
 */
export function spend(ledger: TokenLedger, input: SpendInput): EarnResult {
  const amount = Math.max(0, Math.min(input.amount, ledger.balance));
  const entry: TokenEntry = {
    id: input.id,
    ts: input.ts,
    delta: -amount,
    reason: input.reason,
    ...(input.refId !== undefined ? { refId: input.refId } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
  };
  const next: TokenLedger = {
    ...ledger,
    balance: ledger.balance - amount,
    lifetimeSpent: ledger.lifetimeSpent + amount,
    entries: capEntries([entry, ...ledger.entries]),
  };
  return { ledger: next, entry };
}

export interface RefundInput {
  id: string;
  ts: number;
  amount: number;
  refId?: string;
  note?: string;
}

/**
 * Refund a previously-spent amount (doc 62 §7 step 4). Adds back to `balance`
 * and reduces `lifetimeSpent` (net-zero for a spend that is reversed). Used only
 * when a spend had actually occurred; declining a still-held request never calls
 * this (the hold is simply released — see tokens.ts).
 */
export function refund(ledger: TokenLedger, input: RefundInput): EarnResult {
  const amount = Math.max(0, input.amount);
  const entry: TokenEntry = {
    id: input.id,
    ts: input.ts,
    delta: amount,
    reason: "redeem_refund",
    ...(input.refId !== undefined ? { refId: input.refId } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
  };
  const next: TokenLedger = {
    ...ledger,
    balance: ledger.balance + amount,
    lifetimeSpent: Math.max(0, ledger.lifetimeSpent - amount),
    entries: capEntries([entry, ...ledger.entries]),
  };
  return { ledger: next, entry };
}

// ---------------------------------------------------------------------------
// Quick-undo of an accidental EARN (verify-undo §2.5/§3.3, feature #17).
// ---------------------------------------------------------------------------

export interface UndoInput {
  id: string;
  ts: number;
  /** the earned amount to cancel (the just-completed step's granted delta) */
  amount: number;
  refId?: string;
  note?: string;
}

/**
 * Cancel an accidental EARN (verify-undo §2.5). Lowers `balance` by `amount`
 * FLOORED AT 0 (never negative — a child who spent between the tap and the undo
 * can't be driven into debt), appends a `reason:'undo'` entry, and leaves BOTH
 * `lifetimeEarned` AND `lifetimeSpent` untouched — undo is neither an earn nor a
 * spend, it cancels an accidental earn. This is the whole anti-shame split: it
 * corrects the spendable currency (anti-gaming) while the buddy's growth (derived
 * from `lifetimeEarned`) and "bubbles popped" NEVER regress. Pure; `now`/`id`
 * passed in (deterministic, no RNG).
 */
export function undoEarn(ledger: TokenLedger, input: UndoInput): EarnResult {
  const removed = Math.max(0, Math.min(input.amount, ledger.balance));
  const entry: TokenEntry = {
    id: input.id,
    ts: input.ts,
    delta: -removed,
    reason: "undo",
    ...(input.refId !== undefined ? { refId: input.refId } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
  };
  const next: TokenLedger = {
    ...ledger,
    balance: ledger.balance - removed,
    entries: capEntries([entry, ...ledger.entries]),
  };
  return { ledger: next, entry };
}

/**
 * The most recent EARN entry for a given `refId` (the step just completed), or
 * null. Used by the undo orchestrator to find the exact delta to reverse — only a
 * real completion earn (`task_complete`/`routine_complete`), never a bonus/gift.
 */
export function latestEarnFor(ledger: TokenLedger, refId: string): TokenEntry | null {
  return (
    ledger.entries.find(
      (e) =>
        e.refId === refId &&
        e.delta > 0 &&
        (e.reason === "task_complete" || e.reason === "routine_complete"),
    ) ?? null
  );
}

/** Reserve tokens for a pending redemption (escrow hold; doc 62 §7 step 1). */
export function hold(ledger: TokenLedger, amount: number): TokenLedger {
  const held = Math.max(0, Math.min(amount, availableBalance(ledger)));
  return { ...ledger, heldTokens: ledger.heldTokens + held };
}

/** Release a previously-held amount (decline/cancel/expire; doc 62 §7 step 4). */
export function releaseHold(ledger: TokenLedger, amount: number): TokenLedger {
  const released = Math.max(0, Math.min(amount, ledger.heldTokens));
  return { ...ledger, heldTokens: ledger.heldTokens - released };
}
