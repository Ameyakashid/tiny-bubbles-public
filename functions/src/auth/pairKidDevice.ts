/**
 * functions/src/auth/pairKidDevice.ts — pairing-code → kid custom token
 * (w1 M1.2 — §2.1 step 4, §8 #21c/#28).
 *
 * The kid device calls this UNAUTHENTICATED with the short-lived code the
 * parent app displays. The server:
 *   1. validates the code (exists, not expired) and CONSUMES it (single-use);
 *   2. mints a custom token for uid === childId with claims
 *      `{role:"kid", parentUid, childId}` — the childId comes from the
 *      SERVER-STORED code doc, NEVER from client input (§8 #28);
 *   3. echoes `localCid` back so the adapter can record
 *      `linkage[localCid] = {childId, parentUid}` — linking a PRE-EXISTING
 *      offline v1 child additively, never a destructive migration (§8 #21c).
 */
import { HandlerError, type AuthPort, type Clock, type DbPort } from "../ports";
import { kidClaims } from "./setClaims";

export interface PairKidDeviceInput {
  code: string;
  /** the device-local child id to link (optional; echoed back) */
  localCid?: string;
}

export interface PairKidDeviceResult {
  token: string;
  childId: string;
  parentUid: string;
  localCid?: string;
}

export async function handlePairKidDevice(
  deps: { db: DbPort; auth: AuthPort; clock: Clock },
  data: PairKidDeviceInput,
): Promise<PairKidDeviceResult> {
  const code = typeof data.code === "string" ? data.code.trim() : "";
  if (!code || code.length > 32) {
    throw new HandlerError("invalid-argument", "pairing code required");
  }

  const doc = await deps.db.getDoc(`pairingCodes/${code}`);
  if (!doc) throw new HandlerError("not-found", "unknown or already-used pairing code");

  const expiresAtMs = typeof doc.expiresAtMs === "number" ? doc.expiresAtMs : 0;
  if (deps.clock.nowMs() > expiresAtMs) {
    await deps.db.deleteDoc(`pairingCodes/${code}`);
    throw new HandlerError("failed-precondition", "pairing code expired");
  }

  const childId = typeof doc.childId === "string" ? doc.childId : "";
  const parentUid = typeof doc.parentUid === "string" ? doc.parentUid : "";
  if (!childId || !parentUid) {
    throw new HandlerError("failed-precondition", "malformed pairing record");
  }

  // Single-use: consume BEFORE minting so a raced second call fails closed.
  await deps.db.deleteDoc(`pairingCodes/${code}`);

  const token = await deps.auth.createCustomToken(childId, {
    ...kidClaims(parentUid, childId),
  });

  return {
    token,
    childId,
    parentUid,
    ...(typeof data.localCid === "string" && data.localCid ? { localCid: data.localCid } : {}),
  };
}
