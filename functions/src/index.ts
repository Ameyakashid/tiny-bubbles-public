/**
 * functions/src/index.ts — Firebase Cloud Functions entry (w1 M1.2).
 *
 * The ONLY sanctioned raw-egress zone (02-architecture §1.4); never bundled
 * by Metro / imported from apps/*. Co-ownership contract (arch §1.1): w1 owns
 * the base exports below (auth/consent/data/retention/alerts/interceptors);
 * w2 EXTENDS with the bloop proxy in M2.1 (it imports `writeTranscriptTurn`,
 * `verifyKidContext`, `sendParentAlert` from here — never re-implements).
 *
 * Transport mapping only: every handler lives in its own module, written
 * against the `ports.ts` seams and unit-tested with fakes (no emulator on the
 * CI floor); this file adapts them onto firebase-functions v2 + the real
 * firebase-admin deps (`firebaseAdmin.makeDeps`). `HandlerError` →
 * `HttpsError` 1:1.
 *
 * Deploy packaging (§1.5, §8 #24): `npm run build:deploy` (esbuild --bundle)
 * inlines the `@tiny-bubbles/shared` runtime into lib/index.js with
 * firebase-admin/-functions external — wired as the firebase.json predeploy;
 * exercised at M6.2 (this milestone scaffolds the script only, no deploy).
 */
import { randomInt, randomUUID } from "node:crypto";

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { beforeUserCreated as beforeUserCreatedTrigger } from "firebase-functions/v2/identity";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as functionsV1 from "firebase-functions/v1";

import { reEscalateUnacknowledged, sendParentAlert } from "./alerts/sendParentAlert";
import { handleBeforeUserCreated } from "./auth/beforeUserCreated";
import { handleParentCreated } from "./auth/onParentCreated";
import { handlePairKidDevice } from "./auth/pairKidDevice";
import { handleProvisionChild } from "./auth/provisionChild";
import { handleRecordConsent } from "./consent/recordConsent";
import { handleDeleteChildData } from "./data/deleteChildData";
import { seedGlobalConfig } from "./data/seedGlobalConfig";
import { writeTranscriptTurn } from "./data/transcripts";
import { makeDeps } from "./firebaseAdmin";
import { verifyKidContext } from "./interceptors/verifyIdToken";
import { HandlerError, type CallerAuth } from "./ports";
import { handleRetentionChange } from "./retention/onRetentionChange";
import { runTtlSweep } from "./retention/ttlSweep";

// Re-exports for the w2 proxy (M2.1) — one implementation, never duplicated.
export { sendParentAlert, verifyKidContext, writeTranscriptTurn, seedGlobalConfig };

function toHttpsError(err: unknown): HttpsError {
  if (err instanceof HandlerError) return new HttpsError(err.code, err.message);
  return new HttpsError("internal", "internal error");
}

function callerAuth(request: {
  auth?: { uid: string; token: object };
}): CallerAuth | null {
  if (!request.auth) return null;
  return { uid: request.auth.uid, token: request.auth.token as Record<string, unknown> };
}

const ids = {
  newId: () => randomUUID(),
  /** 6-digit pairing code (NOT a payout path; server-side entropy is fine) */
  newPairingCode: () => String(randomInt(0, 1_000_000)).padStart(6, "0"),
};

// ---------------------------------------------------------------------------
// Auth lifecycle
// ---------------------------------------------------------------------------

/** COPPA account gate (blocking) — w1 §2.1. */
export const beforeusercreated = beforeUserCreatedTrigger(async (event) => {
  const user = event.data;
  if (!user) throw new HttpsError("permission-denied", "no user payload");
  try {
    const result = await handleBeforeUserCreated(makeDeps(), {
      uid: user.uid,
      ...(user.email ? { email: user.email } : {}),
    });
    return { customClaims: result.customClaims };
  } catch (err) {
    throw toHttpsError(err);
  }
});

/** Auth→Firestore mirror: seed users/{uid} for parents. */
export const onparentcreated = functionsV1.auth.user().onCreate(async (user) => {
  await handleParentCreated(makeDeps(), {
    uid: user.uid,
    ...(user.email ? { email: user.email } : {}),
    ...(user.displayName ? { displayName: user.displayName } : {}),
  });
});

/** Parent creates a child (consent-gated, §8 #29) → pairing code. */
export const provisionChild = onCall(async (request) => {
  try {
    return await handleProvisionChild({ ...makeDeps(), ids }, callerAuth(request), request.data);
  } catch (err) {
    throw toHttpsError(err);
  }
});

/** Kid device exchanges the pairing code for a custom token (§8 #21c). */
export const pairKidDevice = onCall(async (request) => {
  try {
    return await handlePairKidDevice(makeDeps(), request.data);
  } catch (err) {
    throw toHttpsError(err);
  }
});

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

/** Verifiable parental consent — rejects dev_mock outside the emulator (§8 #29). */
export const recordConsent = onCall(async (request) => {
  try {
    return await handleRecordConsent(makeDeps(), callerAuth(request), request.data);
  } catch (err) {
    throw toHttpsError(err);
  }
});

// ---------------------------------------------------------------------------
// Data rights
// ---------------------------------------------------------------------------

/** Parent review+delete — purges the child subtree, SKIPS legalHold (§8 #27). */
export const deleteChildData = onCall(async (request) => {
  try {
    return await handleDeleteChildData(makeDeps(), callerAuth(request), request.data);
  } catch (err) {
    throw toHttpsError(err);
  }
});

// ---------------------------------------------------------------------------
// Retention + alert escalation
// ---------------------------------------------------------------------------

/** Daily TTL backstop + unacknowledged-alert re-escalation (§2.5, §8 #26). */
export const ttlSweep = onSchedule("every day 03:00", async () => {
  const deps = makeDeps();
  await runTtlSweep(deps);
  await reEscalateUnacknowledged(deps);
});

/** Re-stamp expiresAt when a parent SHORTENS retention (§8 #10b). */
export const onRetentionChange = onDocumentUpdated("users/{uid}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (before.retentionDays === after.retentionDays) return;
  await handleRetentionChange(makeDeps(), {
    parentUid: event.params.uid,
    beforeDays: typeof before.retentionDays === "number" ? before.retentionDays : undefined,
    afterDays: typeof after.retentionDays === "number" ? after.retentionDays : undefined,
  });
});
