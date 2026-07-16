/**
 * functions/src/data/transcripts.ts — the transcript WRITE CHOKEPOINT
 * (w1 M1.2 — 02-architecture §2.5, §8 #7).
 *
 * Transcripts are admin-only writes (rules `write: if false`); the w2 proxy
 * is the ONE writer and it MUST write THROUGH this function. Because there is
 * exactly one write path, redaction is provable:
 *   - `redactPii` (IMPORTED from `@tiny-bubbles/shared/compliance/pii` — the
 *     single taxonomy, NEVER re-implemented here, §8 #7) runs over the child
 *     text AND the reply text BEFORE any document is constructed;
 *   - the stored doc carries `childText` (already redacted) + `pii.found`
 *     (the FACT of PII, never the value) — there is NO raw-text field in the
 *     schema at all (schema-level assertion in redaction.test.ts);
 *   - `expiresAt` is stamped at write time from the child's retention window
 *     (default 30 — §8 #10b). `legalHold` docs are TTL/purge-exempt (§8 #27)
 *     — stamped by the crisis pathway, honored by retention/deleteChildData.
 */
import {
  coerceRetentionDays,
  computeTtlAt,
  redactPii,
  transcriptDoc,
  type InputMode,
  type ModeratedReplyStatus,
  type ModerationFlag,
  type OnFailAction,
} from "@tiny-bubbles/shared";

import type { Clock, DbPort } from "../ports";

export interface WriteTranscriptTurnInput {
  childId: string;
  sessionId: string;
  turnId: string;
  /** RAW child text — NEVER stored; redacted inside this chokepoint */
  rawChildText: string;
  inputMode: InputMode;
  /** RAW approved reply — redacted before storage too (outbound PII) */
  rawReplyText: string;
  status: ModeratedReplyStatus;
  model: "mock" | "scripted" | "gemini-flash" | "deepseek";
  inputFlags: ModerationFlag[];
  outputFlags: ModerationFlag[];
  onFail?: OnFailAction;
  flagged: boolean;
  legalHold?: boolean;
  retentionDays?: number;
}

/** The exact stored shape (returned for tests — proves no raw field exists). */
export async function writeTranscriptTurn(
  deps: { db: DbPort; clock: Clock },
  input: WriteTranscriptTurnInput,
): Promise<Record<string, unknown>> {
  // REDACTION BEFORE STORAGE — both directions (§2.5).
  const childRedaction = redactPii(input.rawChildText);
  const replyRedaction = redactPii(input.rawReplyText);

  const nowMs = deps.clock.nowMs();
  const doc: Record<string, unknown> = {
    turnId: input.turnId,
    childId: input.childId,
    sessionId: input.sessionId,
    childText: childRedaction.redacted,
    inputMode: input.inputMode,
    replyText: replyRedaction.redacted,
    status: input.status,
    model: input.model,
    inputFlags: input.inputFlags,
    outputFlags: input.outputFlags,
    pii: { found: [...childRedaction.found, ...replyRedaction.found] },
    ...(input.onFail !== undefined ? { onFail: input.onFail } : {}),
    flagged: input.flagged,
    ...(input.legalHold ? { legalHold: true } : {}),
    createdAt: deps.db.tsFromMillis(nowMs),
    expiresAt: deps.db.tsFromMillis(computeTtlAt(nowMs, coerceRetentionDays(input.retentionDays))),
  };

  await deps.db.setDoc(transcriptDoc(input.childId, input.turnId), doc);
  return doc;
}
