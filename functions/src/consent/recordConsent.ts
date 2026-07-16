/**
 * functions/src/consent/recordConsent.ts — the verifiable-parental-consent
 * callable (w1 M1.2 — §2.1 step 2, §8 #29).
 *
 * Appends a `ConsentRecord` to the APPEND-ONLY `users/{uid}.consent[]` audit
 * trail and — for a REAL verified method — stamps the `consentVerified:true`
 * custom claim that gates `provisionChild`.
 *
 * HARD RULES (§8 #29, all fail closed):
 *   - `dev_mock` is REJECTED outside the emulator (prod-like env ⇒ error);
 *   - the shippable VPC path is `payment-verified` (nominal card auth+void):
 *     it requires a non-empty `verificationRef` (the PSP transaction id) —
 *     the concrete PSP integration is a deploy-time binding (w1 §9.1);
 *   - `signed-form-email-verified` requires the caller's email be verified;
 *   - `knowledge-based` is recorded but does NOT set `consentVerified` (no
 *     KBA vendor integration ships in v1);
 *   - the agreement version must exist in the shared registry.
 */
import {
  agreementByVersion,
  consentMethodRejection,
  isEmulatorEnv,
  isVerifiedConsentMethod,
  type ConsentMethod,
  type ConsentRecord,
} from "@tiny-bubbles/shared";

import { HandlerError, requireParent, type AuthPort, type CallerAuth, type Clock, type DbPort } from "../ports";
import { setParentClaims } from "../auth/setClaims";

export interface RecordConsentInput {
  method: string;
  agreementVersion: string;
  parentName: string;
  region?: string;
  scope?: { transcripts: boolean; activity: boolean; llmChat: boolean };
  /** PSP transaction id (payment-verified) / e-sign envelope id (signed form) */
  verificationRef?: string;
  /** ONLY for signed-form: whether the auth email is verified (server-checked) */
  emailVerified?: boolean;
}

export interface RecordConsentResult {
  recorded: true;
  consentVerified: boolean;
  method: ConsentMethod;
}

export async function handleRecordConsent(
  deps: { db: DbPort; auth: AuthPort; clock: Clock },
  auth: CallerAuth | null,
  data: RecordConsentInput,
  env: Record<string, string | undefined> = process.env,
): Promise<RecordConsentResult> {
  const caller = requireParent(auth);

  // §8 #29 — dev_mock is emulator-only; unknown methods are rejected.
  const rejection = consentMethodRejection(data.method, { emulator: isEmulatorEnv(env) });
  if (rejection) throw new HandlerError("failed-precondition", rejection);
  const method = data.method as ConsentMethod;

  const agreement = agreementByVersion(data.agreementVersion);
  if (!agreement) {
    throw new HandlerError("invalid-argument", `unknown agreement version "${data.agreementVersion}"`);
  }
  const parentName = typeof data.parentName === "string" ? data.parentName.trim() : "";
  if (!parentName) throw new HandlerError("invalid-argument", "parentName required");

  // Per-method verification evidence (the VPC is REAL, not attested).
  if (method === "payment-verified" && !data.verificationRef) {
    throw new HandlerError(
      "failed-precondition",
      "payment-verified consent requires a PSP verification reference",
    );
  }
  if (method === "signed-form-email-verified") {
    const emailVerified = data.emailVerified === true || caller.token.email_verified === true;
    if (!data.verificationRef || !emailVerified) {
      throw new HandlerError(
        "failed-precondition",
        "signed-form consent requires the signed envelope ref AND a verified email",
      );
    }
  }

  const parent = await deps.db.getDoc(`users/${caller.uid}`);
  if (!parent) throw new HandlerError("not-found", "parent record missing");

  const record: ConsentRecord = {
    method,
    agreementVersion: agreement.version,
    grantedAt: deps.clock.nowMs(),
    parentName,
    ...(data.region ? { region: data.region } : {}),
    scope: data.scope ?? { transcripts: true, activity: true, llmChat: false },
  };

  const existing = Array.isArray(parent.consent) ? (parent.consent as ConsentRecord[]) : [];
  await deps.db.updateDoc(`users/${caller.uid}`, {
    consent: [...existing, record], // append-only trail
    updatedAt: deps.db.tsFromMillis(deps.clock.nowMs()),
  });

  const consentVerified = isVerifiedConsentMethod(method);
  if (consentVerified) {
    await setParentClaims(deps.auth, caller.uid, true);
  }
  return { recorded: true, consentVerified, method };
}
