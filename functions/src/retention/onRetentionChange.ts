/**
 * functions/src/retention/onRetentionChange.ts — re-stamp `expiresAt` when a
 * parent SHORTENS the retention window (w1 M1.2 — §2.5, §8 #10b).
 *
 * Fires on `users/{uid}` updates. Only a SHRINK re-stamps (30 ← 90): the new
 * `expiresAt = createdAt + newDays` is applied across every TTL'd doc of
 * every child of that parent. A grow (30 → 90) does NOT extend already-written
 * docs (never keep data longer than the window it was written under).
 *
 * LEGAL-HOLD EXEMPTION (§8 #27): held docs are never re-stamped — the
 * preservation duty wins over the parent's shorten request.
 */
import { coerceRetentionDays, computeTtlAt } from "@tiny-bubbles/shared";

import type { DbPort } from "../ports";

const TTL_SUBCOLLECTIONS = ["activity", "transcripts", "alerts", "reports"] as const;

export interface RetentionChangeInput {
  parentUid: string;
  beforeDays?: number;
  afterDays?: number;
}

export interface RetentionChangeResult {
  restamped: number;
  skippedLegalHold: number;
}

export async function handleRetentionChange(
  deps: { db: DbPort },
  input: RetentionChangeInput,
): Promise<RetentionChangeResult> {
  const before = coerceRetentionDays(input.beforeDays);
  const after = coerceRetentionDays(input.afterDays);
  if (after >= before) return { restamped: 0, skippedLegalHold: 0 }; // shrink only

  const children = await deps.db.query("children", "parentUid", "==", input.parentUid);
  let restamped = 0;
  let skippedLegalHold = 0;

  for (const child of children) {
    for (const sub of TTL_SUBCOLLECTIONS) {
      const docs = await deps.db.listDocs(`children/${child.id}/${sub}`);
      for (const doc of docs) {
        if (doc.data.legalHold === true) {
          skippedLegalHold += 1; // §8 #27
          continue;
        }
        const createdMs = deps.db.tsToMillis(doc.data.createdAt);
        if (createdMs === null) continue;
        const newExpiry = computeTtlAt(createdMs, after);
        const currentExpiry = deps.db.tsToMillis(doc.data.expiresAt);
        if (currentExpiry !== null && currentExpiry <= newExpiry) continue; // already tighter
        await deps.db.updateDoc(doc.path, { expiresAt: deps.db.tsFromMillis(newExpiry) });
        restamped += 1;
      }
    }
  }
  return { restamped, skippedLegalHold };
}
