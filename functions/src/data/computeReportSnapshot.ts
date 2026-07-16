/**
 * functions/src/data/computeReportSnapshot.ts — server-side snapshot SHAPE
 * helper (w1 M1.2 — §8 #21).
 *
 * The PRODUCER of `children/{childId}/reports/{rangeKey}` is the KID sync
 * adapter (`apps/kid/src/sync/cloudSync.ts` `computeAndSyncReportSnapshot`) —
 * the report is computed ON-DEVICE from on-device data; no raw ledger ever
 * reaches the server. This module only provides the canonical doc SHAPE +
 * TTL stamping for any server-side consumer (e.g. a future premium recompute)
 * so both writers stay field-identical.
 */
import {
  coerceRetentionDays,
  computeTtlAt,
  type ReportModel,
  type ReportRangeKey,
  type ReportSnapshotDoc,
} from "@tiny-bubbles/shared";

import type { DbPort } from "../ports";

/** Build the exact `ReportSnapshotDoc` wire shape (Ts stamped via the port). */
export function buildReportSnapshotDoc(
  db: Pick<DbPort, "tsFromMillis">,
  input: {
    rangeKey: ReportRangeKey;
    model: ReportModel;
    nowMs: number;
    retentionDays?: number;
  },
): Record<string, unknown> {
  const doc: Omit<ReportSnapshotDoc, "generatedAt" | "expiresAt"> & Record<string, unknown> = {
    rangeKey: input.rangeKey,
    model: input.model,
    generatedAt: db.tsFromMillis(input.nowMs),
    expiresAt: db.tsFromMillis(
      computeTtlAt(input.nowMs, coerceRetentionDays(input.retentionDays)),
    ),
  };
  return doc;
}
