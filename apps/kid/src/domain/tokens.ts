/**
 * src/domain/tokens.ts — reward redemption escrow (caregiver-set, refundable).
 *
 * Re-authored from tether's `unlockTheme()` affordability/spend check (doc 62
 * §7, doc 66 §1b.2), reworked into a TWO-PHASE, refundable, parent-gated flow:
 *
 *   request -> HOLD tokens (no spend yet)
 *           -> approve  => spend exactly, release hold       (status approved)
 *           -> decline / cancel / expire => release hold, NO spend (net zero)
 *
 * HARD INVARIANTS (doc 62 §7, doc 66 §5.5):
 *   - Declining/canceling/expiring a request costs the child NOTHING — the hold
 *     is simply released (anti-loss-aversion). Only an approval ever spends.
 *   - `availableBalance = balance - heldTokens`, so a pending request can't be
 *     double-spent, yet a decline refunds with zero net change.
 *   - Auto-approve-under-N approves small requests without a parent (doc 62 §7).
 *
 * Pure: every function returns NEW { ledger, request } objects (+ a result tag);
 * `now`/`id` are passed in for deterministic testing.
 */
import { hold, refund, releaseHold, spend } from "./gamification";
import type {
  ChildSettings,
  RedemptionRequest,
  Reward,
  TokenLedger,
} from "./types";
import { availableBalance } from "./gamification";

export interface RedemptionContext {
  /** id for the new request (and any ledger entry it spawns) */
  id: string;
  now: number;
}

export type RequestRedemptionResult =
  | {
      ok: true;
      ledger: TokenLedger;
      request: RedemptionRequest;
      /** true when the request was auto-approved (spend already applied) */
      autoApproved: boolean;
    }
  | { ok: false; reason: "insufficient_balance" | "reward_unavailable" };

/**
 * Whether auto-approve applies (doc 62 §7 step 2): either the reward doesn't
 * require approval, or its cost is at/under the per-child auto-approve threshold
 * (a threshold of 0 disables auto-approve — always require a parent).
 */
export function shouldAutoApprove(reward: Reward, settings: ChildSettings): boolean {
  if (!reward.requiresParentApproval) return true;
  const threshold = settings.autoApproveRedeemUnderTokens;
  return threshold > 0 && reward.costTokens <= threshold;
}

/**
 * Phase 1 — the child requests a reward (doc 62 §7 step 1). Holds the cost in
 * escrow. If affordability fails OR the reward is at a guardrail limit, returns
 * `{ ok:false }` (no throw, no charge). If auto-approve applies, the spend is
 * applied immediately and the request is returned `approved`.
 */
export function requestRedemption(
  ledger: TokenLedger,
  reward: Reward,
  settings: ChildSettings,
  existingRedemptions: RedemptionRequest[],
  ctx: RedemptionContext,
): RequestRedemptionResult {
  if (!isRewardAvailable(reward, existingRedemptions, ctx.now).available) {
    return { ok: false, reason: "reward_unavailable" };
  }
  if (availableBalance(ledger) < reward.costTokens) {
    return { ok: false, reason: "insufficient_balance" };
  }

  const held = hold(ledger, reward.costTokens);
  const request: RedemptionRequest = {
    id: ctx.id,
    childId: reward.childId,
    rewardId: reward.id,
    costTokens: reward.costTokens,
    status: "requested",
    requestedAt: ctx.now,
  };

  if (shouldAutoApprove(reward, settings)) {
    return { ...approveRedemption(held, request, ctx), autoApproved: true };
  }
  return { ok: true, ledger: held, request, autoApproved: false };
}

export interface DecisionResult {
  ok: true;
  ledger: TokenLedger;
  request: RedemptionRequest;
}

/**
 * Phase 2a — parent approves (doc 62 §7 step 3). Spends exactly the held cost
 * (balance -= cost, lifetimeSpent += cost) and releases the hold, netting the
 * escrow to a real spend. Status -> `approved`.
 */
export function approveRedemption(
  ledger: TokenLedger,
  request: RedemptionRequest,
  ctx: Pick<RedemptionContext, "now"> & { id?: string },
): DecisionResult {
  // Idempotency / stale-action guard (doc 66 §5.5): ONLY a still-held
  // (`requested`) request can be approved. A re-fired approve — a parent
  // double-tap, or an approve racing a decline/cancel/expire — is a no-op: it
  // must NEVER spend a second time and must NEVER flip an already-terminal
  // status. This is what makes "a child can never be double-charged" structural.
  if (request.status !== "requested") {
    return { ok: true, ledger, request };
  }
  const { ledger: spentLedger } = spend(ledger, {
    id: ctx.id ?? `${request.id}:spend`,
    ts: ctx.now,
    amount: request.costTokens,
    reason: "redeem",
    refId: request.id,
  });
  const released = releaseHold(spentLedger, request.costTokens);
  return {
    ok: true,
    ledger: released,
    request: { ...request, status: "approved", decidedAt: ctx.now, decidedBy: "parent" },
  };
}

/**
 * Undo an approved/auto-approved/fulfilled redemption (verify-undo §2.5, feature
 * #17). Refunds the cost via `gamification.refund` (`balance += cost`,
 * `lifetimeSpent -= cost`, a `redeem_refund` entry) and marks the request the new
 * terminal `reversed`. GUARDED: only a real grant (`approved`|`fulfilled`) can be
 * reversed — a stale reverse on a requested/declined/canceled/expired/already-
 * reversed request is a no-op (no double refund, no clobbered terminal status).
 * Because a `reversed` request no longer counts as a grant (`isRewardAvailable`'s
 * `isGrant` counts only approved/fulfilled), the reward's guardrail availability
 * recovers. Pure; `id`/`now` passed in for deterministic testing.
 */
export function reverseRedemption(
  ledger: TokenLedger,
  request: RedemptionRequest,
  ctx: RedemptionContext,
): DecisionResult {
  if (request.status !== "approved" && request.status !== "fulfilled") {
    return { ok: true, ledger, request };
  }
  const { ledger: refunded } = refund(ledger, {
    id: ctx.id,
    ts: ctx.now,
    amount: request.costTokens,
    refId: request.id,
  });
  return {
    ok: true,
    ledger: refunded,
    request: { ...request, status: "reversed", decidedAt: ctx.now },
  };
}

/** Mark an approved redemption as physically handed over (doc 62 §7 step 3). */
export function fulfillRedemption(
  request: RedemptionRequest,
  now: number,
): RedemptionRequest {
  // Only an `approved` (or already-`fulfilled`, idempotent) request can be
  // handed over. Fulfilling a declined/expired/canceled request would mark a
  // reward the child never received as delivered — guard it (doc 66 §5.5).
  if (request.status !== "approved" && request.status !== "fulfilled") {
    return request;
  }
  return { ...request, status: "fulfilled", fulfilledAt: now };
}

/**
 * Phase 2b — decline / cancel / expire (doc 62 §7 step 4). Releases the hold
 * with NO spend, so the child loses nothing. `reasonKidSafe` (if given) is a
 * gentle message — never shaming.
 */
export function declineRedemption(
  ledger: TokenLedger,
  request: RedemptionRequest,
  now: number,
  reasonKidSafe?: string,
): DecisionResult {
  return endWithoutSpend(ledger, request, "declined", now, reasonKidSafe);
}

export function cancelRedemption(
  ledger: TokenLedger,
  request: RedemptionRequest,
  now: number,
): DecisionResult {
  return endWithoutSpend(ledger, request, "canceled", now);
}

export function expireRedemption(
  ledger: TokenLedger,
  request: RedemptionRequest,
  now: number,
): DecisionResult {
  return endWithoutSpend(ledger, request, "expired", now);
}

function endWithoutSpend(
  ledger: TokenLedger,
  request: RedemptionRequest,
  status: "declined" | "canceled" | "expired",
  now: number,
  reasonKidSafe?: string,
): DecisionResult {
  // Terminal-state guard (doc 66 §5.5): only a still-held (`requested`) request
  // can be ended. A stale decline/cancel/expire fired on an already-decided
  // request is a no-op — it must NOT release a phantom hold (double-release), and
  // must NOT clobber the existing terminal status/decline reason (e.g. flip an
  // `approved` spend to `declined`, or a `declined` reason to `canceled`).
  if (request.status !== "requested") {
    return { ok: true, ledger, request };
  }
  const released = releaseHold(ledger, request.costTokens);
  return {
    ok: true,
    ledger: released,
    request: {
      ...request,
      status,
      decidedAt: now,
      ...(reasonKidSafe !== undefined ? { declineReasonKidSafe: reasonKidSafe } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Availability guardrails (doc 62 §7) — NOT a punishment, just availability.
// A reward at its weekly limit / inside its cooldown shows "come back later".
// ---------------------------------------------------------------------------

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_WEEK = 7 * 24 * MS_PER_HOUR;

export interface RewardAvailability {
  available: boolean;
  reason?: "cooldown" | "weekly_limit";
  /** when the reward becomes available again (cooldown only) */
  availableAt?: number;
}

/** Redemptions that "count" against guardrails: an actual grant occurred. */
function isGrant(r: RedemptionRequest): boolean {
  return r.status === "approved" || r.status === "fulfilled";
}

/**
 * Is a reward currently redeemable, given its guardrails + recent redemptions
 * (doc 62 §7)? Cooldown looks at the most recent grant; the weekly limit counts
 * grants in the trailing 7 days. Both are availability gates, never penalties.
 */
export function isRewardAvailable(
  reward: Reward,
  redemptions: RedemptionRequest[],
  now: number,
): RewardAvailability {
  if (!reward.active) return { available: false };

  const grants = redemptions.filter((r) => r.rewardId === reward.id && isGrant(r));

  if (reward.cooldownHours && reward.cooldownHours > 0 && grants.length > 0) {
    const lastAt = grants.reduce((max, r) => Math.max(max, r.fulfilledAt ?? r.decidedAt ?? 0), 0);
    const availableAt = lastAt + reward.cooldownHours * MS_PER_HOUR;
    if (now < availableAt) return { available: false, reason: "cooldown", availableAt };
  }

  if (reward.limitPerWeek && reward.limitPerWeek > 0) {
    const since = now - MS_PER_WEEK;
    const inWindow = grants.filter((r) => (r.fulfilledAt ?? r.decidedAt ?? 0) >= since).length;
    if (inWindow >= reward.limitPerWeek) return { available: false, reason: "weekly_limit" };
  }

  return { available: true };
}

/** Pending (still-held) requests for a child (doc 62 §13). */
export function pendingRedemptions(redemptions: RedemptionRequest[]): RedemptionRequest[] {
  return redemptions.filter((r) => r.status === "requested");
}
