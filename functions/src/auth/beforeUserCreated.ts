/**
 * functions/src/auth/beforeUserCreated.ts — the COPPA account gate (w1 M1.2;
 * donor: firebase-functions-samples auth-blocking-functions, Apache-2.0 —
 * the `beforeUserCreated` + reject pattern).
 *
 * Two legal ways an Auth user comes to exist (w1 §2.1):
 *   1. PARENT signup (email/password) → allowed; stamped `role:"parent",
 *      consentVerified:false` (consent is a SEPARATE verified step, §8 #29).
 *   2. KID sign-in with a server-minted custom token → the uid is allowed
 *      ONLY IF `children/{uid}` was already provisioned under a
 *      `consentVerified` parent holding a REAL (non-mock) VPC record. Anything
 *      else is REJECTED — a child identity can never precede verified consent.
 *
 * FAIL CLOSED: no email + no provisioned child doc ⇒ rejected.
 */
import { hasVerifiedParentalConsent, type ConsentRecord } from "@tiny-bubbles/shared";

import { HandlerError, type DbPort } from "../ports";
import { kidClaims, parentClaims } from "./setClaims";

export interface BeforeCreateInput {
  uid: string;
  email?: string;
}

export interface BeforeCreateResult {
  customClaims: Record<string, unknown>;
}

export async function handleBeforeUserCreated(
  deps: { db: DbPort },
  user: BeforeCreateInput,
): Promise<BeforeCreateResult> {
  // KID path: a children/{uid} doc must ALREADY exist (provisionChild ran).
  const child = await deps.db.getDoc(`children/${user.uid}`);
  if (child) {
    const parentUid = typeof child.parentUid === "string" ? child.parentUid : "";
    if (!parentUid) {
      throw new HandlerError("permission-denied", "child doc has no guardian link");
    }
    const parent = await deps.db.getDoc(`users/${parentUid}`);
    const consent = Array.isArray(parent?.consent) ? (parent.consent as ConsentRecord[]) : [];
    if (!parent || !hasVerifiedParentalConsent(consent)) {
      // A kid uid under an unverified parent is never allowed (COPPA).
      throw new HandlerError(
        "permission-denied",
        "kid identity requires a consent-verified parent (§8 #29)",
      );
    }
    return { customClaims: { ...kidClaims(parentUid, user.uid) } };
  }

  // PARENT path: normal email/password signup.
  if (user.email) {
    return { customClaims: { ...parentClaims(false) } };
  }

  // Neither a provisioned child nor an email signup — fail closed.
  throw new HandlerError(
    "permission-denied",
    "account creation requires an email signup (parent) or a provisioned child",
  );
}
