/**
 * packages/shared/src/compliance/retention.ts — the canonical retention TTL
 * policy VALUES (w8 M1.1; 02-architecture §2.5 + §8 #10b).
 *
 * COPPA: retain "only as long as reasonably necessary." Canonical: default
 * **30 days everywhere** (COPPA-min; w1 §3.2's "default 90" is corrected),
 * max 90, parent-set, typed `30 | 90`. w1 stamps Firestore `expiresAt`
 * (canonical field name, §8 #10) from `computeTtlAt`; w3 shows the honest
 * window. Docs under `legalHold:true` (abuse/CSAM preservation, §8 #27) are
 * exempt from TTL — that exemption is ENFORCED by w1's sweep, not here.
 *
 * Pure values + pure math; RN-free; no I/O.
 */

/** The only legal retention windows (§8 #10b). */
export type RetentionDays = 30 | 90;

export interface RetentionPolicy {
  defaultDays: 30;
  allowedDays: readonly RetentionDays[];
  maxDays: 90;
}

/** Default 30 (COPPA-min), parent-raisable to 90, never beyond. */
export const RETENTION_POLICY: RetentionPolicy = {
  defaultDays: 30,
  allowedDays: [30, 90],
  maxDays: 90,
};

const MS_PER_DAY = 86_400_000;

/**
 * Coerce an arbitrary (possibly corrupt / legacy) day count onto the typed
 * policy: 90-or-above clamps to 90; anything else (incl. undefined, NaN,
 * negatives, in-between values) resolves to the 30-day default — never a
 * LONGER window than the parent chose.
 */
export function coerceRetentionDays(days?: number): RetentionDays {
  if (typeof days !== "number" || Number.isNaN(days)) return RETENTION_POLICY.defaultDays;
  if (days >= RETENTION_POLICY.maxDays) return RETENTION_POLICY.maxDays;
  return RETENTION_POLICY.defaultDays;
}

/** Milliseconds for a retention window. */
export function retentionMs(days: RetentionDays): number {
  return days * MS_PER_DAY;
}

/**
 * The `expiresAt` epoch-ms for a doc created at `createdAt` under a retention
 * window (default 30): `createdAt + days · 86_400_000`.
 */
export function computeTtlAt(createdAt: number, days?: number): number {
  return createdAt + retentionMs(coerceRetentionDays(days));
}
