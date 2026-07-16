/**
 * functions/src/auth/provisionChild.ts — server-provisioned child identity
 * (w1 M1.2 — §2.1 step 3, §8 #29).
 *
 * Preconditions (ALL fail closed):
 *   - caller is a parent with the `consentVerified:true` claim, AND
 *   - `users/{uid}.consent[]` holds a REAL (non-mock) verified VPC record —
 *     the claim alone is never trusted for child creation (§8 #29).
 *
 * Creates `children/{childId}` (childId doubles as the future kid uid, §8
 * #28), seeds `settings/current` with **`bloopEnabled:false`** (LLM OFF by
 * default) + the PII-free `chips` input mode + the parent's retention/locale,
 * and returns a SHORT-LIVED single-use pairing code (`pairingCodes/{code}`,
 * admin-only collection — the locked rules never expose it).
 *
 * Data minimization: `displayName` is a FIRST NAME/nickname only; no
 * birth-date is accepted here — only the coarse `ageMode` band persists.
 */
import { coerceRetentionDays, hasVerifiedParentalConsent, type ConsentRecord } from "@tiny-bubbles/shared";

import { HandlerError, requireParent, type CallerAuth, type Clock, type DbPort } from "../ports";

export interface ProvisionChildInput {
  displayName: string;
  ageMode: "young" | "older" | "preteen";
  neuroProfile?: "adhd" | "autism" | "both";
}

export interface ProvisionChildResult {
  childId: string;
  pairingCode: string;
  /** epoch ms the code stops working */
  pairingExpiresAtMs: number;
}

export const PAIRING_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const AGE_MODES = ["young", "older", "preteen"] as const;
const NEURO = ["adhd", "autism", "both"] as const;

/** Deterministic-format 6-digit code from a uid source (injectable for tests). */
export interface IdGen {
  newId(): string;
  newPairingCode(): string;
}

export async function handleProvisionChild(
  deps: { db: DbPort; clock: Clock; ids: IdGen },
  auth: CallerAuth | null,
  data: ProvisionChildInput,
): Promise<ProvisionChildResult> {
  const caller = requireParent(auth);
  if (caller.token.consentVerified !== true) {
    throw new HandlerError("failed-precondition", "verifiable parental consent required first");
  }

  // Re-verify against the AUDIT TRAIL — a claim is never enough (§8 #29).
  const parent = await deps.db.getDoc(`users/${caller.uid}`);
  const consent = Array.isArray(parent?.consent) ? (parent.consent as ConsentRecord[]) : [];
  if (!parent || !hasVerifiedParentalConsent(consent)) {
    throw new HandlerError(
      "failed-precondition",
      "no verified (non-mock) parental consent record on file (§8 #29)",
    );
  }

  const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
  if (!displayName || displayName.length > 40 || /\s\S+\s/.test(displayName)) {
    // first name / short nickname only — never a full "First Middle Last"
    throw new HandlerError("invalid-argument", "displayName must be a first name or nickname");
  }
  if (!AGE_MODES.includes(data.ageMode)) {
    throw new HandlerError("invalid-argument", "invalid ageMode");
  }
  const neuroProfile =
    data.neuroProfile !== undefined && NEURO.includes(data.neuroProfile)
      ? data.neuroProfile
      : "both"; // recommended explicit-pick default for a NEW child (§8 #13)

  const childId = deps.ids.newId();
  const nowMs = deps.clock.nowMs();
  const nowTs = deps.db.tsFromMillis(nowMs);
  const retentionDays = coerceRetentionDays(
    typeof parent.retentionDays === "number" ? parent.retentionDays : undefined,
  );
  const crisisLocale = typeof parent.crisisLocale === "string" ? parent.crisisLocale : "en-US";

  await deps.db.setDoc(`children/${childId}`, {
    childId,
    parentUid: caller.uid,
    displayName,
    neuroProfile,
    ageMode: data.ageMode,
    createdAt: nowTs,
    updatedAt: nowTs,
  });

  // Seed the settings doc — LLM OFF, chips input, empty topic scope.
  await deps.db.setDoc(`children/${childId}/settings/current`, {
    controls: {
      bloopEnabled: false,
      inputMode: "chips",
      topicScope: [],
      perFeature: {
        aac: true,
        schedules: true,
        firstThen: true,
        emotion: true,
        breathing: true,
        movement: true,
        socialNarratives: true,
      },
      limits: { perMinute: 5, perDay: 60, sessionMinutes: 20 },
      quietHours: { enabled: false, startMin: 20 * 60, endMin: 7 * 60 },
      retentionDays,
      crisisLocale,
      updatedAt: nowTs,
      updatedBy: "parent",
    },
    preferences: {
      sensory: {
        lowStim: false,
        motionLevel: "full",
        dimLevel: 0,
        soundEnabled: true,
        hapticsEnabled: true,
        voiceEnabled: true,
        celebrationEnabled: true,
      },
      updatedAt: nowTs,
      updatedBy: "parent",
    },
  });

  const pairingCode = deps.ids.newPairingCode();
  const pairingExpiresAtMs = nowMs + PAIRING_CODE_TTL_MS;
  await deps.db.setDoc(`pairingCodes/${pairingCode}`, {
    childId,
    parentUid: caller.uid,
    expiresAtMs: pairingExpiresAtMs,
    createdAt: nowTs,
  });

  return { childId, pairingCode, pairingExpiresAtMs };
}
