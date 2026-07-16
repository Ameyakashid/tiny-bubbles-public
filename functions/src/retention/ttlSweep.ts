/**
 * functions/src/retention/ttlSweep.ts — the daily TTL backstop sweep
 * (w1 M1.2 — §2.5; donor pattern: firebase-functions-samples
 * delete-unused-accounts-cron, Apache-2.0).
 *
 * Native Firestore TTL policies on `expiresAt` are the PRIMARY deletion path
 * (configured out-of-band — see functions/docs/RULES-REVIEW.md); this sweep
 * is the backstop for shortened windows + anything TTL missed.
 *
 * LEGAL-HOLD EXEMPTION (§8 #27): a doc with `legalHold:true` (abuse/CSAM
 * preservation) is NEVER swept, regardless of `expiresAt`, until the
 * mandated-reporter workflow clears the hold.
 */
import type { Clock, DbPort } from "../ports";

/** Collection groups that carry the canonical `expiresAt` TTL field. */
export const TTL_COLLECTION_GROUPS = ["activity", "transcripts", "alerts", "reports"] as const;

export interface SweepResult {
  deleted: number;
  skippedLegalHold: number;
}

export async function runTtlSweep(
  deps: { db: DbPort; clock: Clock },
  nowMs: number = deps.clock.nowMs(),
): Promise<SweepResult> {
  const cutoff = deps.db.tsFromMillis(nowMs);
  let deleted = 0;
  let skippedLegalHold = 0;

  for (const group of TTL_COLLECTION_GROUPS) {
    const expired = await deps.db.queryGroup(group, "expiresAt", "<=", cutoff);
    for (const doc of expired) {
      if (doc.data.legalHold === true) {
        skippedLegalHold += 1; // §8 #27 — never sweep a held doc
        continue;
      }
      await deps.db.deleteDoc(doc.path);
      deleted += 1;
    }
  }
  return { deleted, skippedLegalHold };
}
