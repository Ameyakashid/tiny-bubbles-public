/**
 * packages/shared/src/compliance/consent.ts — the versioned consent-agreement
 * registry (w8 M1.1; 02-architecture §8 #17/#20/#29).
 *
 * CANONICAL HOME of `ConsentMethod`/`ConsentAgreement`/`ConsentRecord` (§8
 * #20 — w1/w3 IMPORT these, never re-declare). w3's consent screen renders
 * `CURRENT_AGREEMENT`; w1's `recordConsent` stamps `agreementVersion` into the
 * append-only `users/{uid}.consent[]` array. The agreement BODY must pass the
 * evidence-honesty gate (unit-tested) and name the no-ads + non-training-
 * processor bindings.
 *
 * Verifiable parental consent (§8 #29): the concrete shippable path for v1 is
 * `payment-verified` (nominal card auth+void); `dev_mock` exists for the
 * emulator ONLY and is REJECTED in prod by w1's `recordConsent` (CI-tested).
 */

export type ConsentMethod =
  | "signed-form-email-verified"
  | "payment-verified"
  | "knowledge-based"
  /** emulator-only — rejected outside the emulator (§8 #29) */
  | "dev_mock";

/** The versioned plain-language text the parent agrees to. */
export interface ConsentAgreement {
  /** e.g. "coppa-2026-07" */
  version: string;
  /** ISO date */
  effectiveFrom: string;
  /** plain-language disclosure (rendered by w3's consent screen) */
  bodyMarkdown: string;
  /** what is collected, in plain words */
  collects: string[];
  retentionSummary: string;
  processorBinding: string;
  noAdsStatement: string;
}

/** Append-only record in `users/{uid}.consent[]` (w1/w3 write it). */
export interface ConsentRecord {
  method: ConsentMethod;
  agreementVersion: string;
  grantedAt: number;
  parentName: string;
  region?: string;
  scope: { transcripts: boolean; activity: boolean; llmChat: boolean };
}

/**
 * The registry (append-only — never edit a shipped version; add a new one).
 * The v1 seed agreement states the locked commitments: what's collected,
 * the 30/90-day parent-set retention, no ads/analytics, the LLM bound as a
 * non-training processor, and NO SECRECY (grown-ups can see all chats).
 */
export const CONSENT_AGREEMENTS: ConsentAgreement[] = [
  {
    version: "coppa-2026-07",
    effectiveFrom: "2026-07-01",
    bodyMarkdown: [
      "## Your consent, in plain words",
      "",
      "Tiny Bubbles is built for your child, and you stay in charge.",
      "",
      "**What we collect (only with your OK):** your child's first name or nickname, " +
        "their routine and activity counts, and — only if you turn chat on — chat " +
        "transcripts with personal details removed before they are stored.",
      "",
      "**How long we keep it:** you choose — 30 days (the default) or 90 days. " +
        "After that it is deleted automatically. You can review or delete " +
        "everything at any time.",
      "",
      "**No ads, no trackers:** the kid app contains no advertising and no " +
        "third-party analytics.",
      "",
      "**The AI helper:** chat is OFF until you turn it on. The AI provider is " +
        "bound as a data processor that may not train on your child's data. " +
        "Bloop is an AI helper, not a person or a doctor.",
      "",
      "**No secrecy:** you can see every chat. Your child is told that grown-ups " +
        "can see chats.",
    ].join("\n"),
    collects: [
      "child first name / nickname (no full names)",
      "routine + activity counts (no free text)",
      "chat transcripts (only if chat is enabled; personal details removed before storage)",
      "your consent record (who agreed, when, to which version)",
    ],
    retentionSummary: "Parent-set: 30 days (default) or 90 days; deleted automatically after.",
    processorBinding:
      "LLM provider bound as a NON-TRAINING data processor (docs/dpa/llm-processor-terms.md): " +
      "no training on child data, deletion on request, sub-processors listed.",
    noAdsStatement: "No advertising SDKs and no third-party analytics in the kid app. Ever.",
  },
];

/** The newest agreement by `effectiveFrom` — what the consent screen renders. */
export const CURRENT_AGREEMENT: ConsentAgreement = [...CONSENT_AGREEMENTS].sort((a, b) =>
  a.effectiveFrom < b.effectiveFrom ? 1 : -1,
)[0];

/** Round-trip a stamped `agreementVersion` back to its full text (audit UI). */
export function agreementByVersion(version: string): ConsentAgreement | undefined {
  return CONSENT_AGREEMENTS.find((a) => a.version === version);
}

// ---------------------------------------------------------------------------
// Verifiable-parental-consent enforcement (§8 #29 — w1 M1.2). Pure predicates
// the `recordConsent`/`provisionChild` callables (functions/) apply; kept HERE
// so "which methods count as VPC" has one home and is unit-testable without
// an emulator.
// ---------------------------------------------------------------------------

/**
 * The methods that count as VERIFIABLE parental consent (COPPA). v1 ships
 * `payment-verified` (nominal card auth+void) with `signed-form-email-verified`
 * as the alternate; `knowledge-based` is enumerated but NOT yet accepted as
 * verified (no KBA vendor integration); `dev_mock` NEVER counts.
 */
export const VERIFIED_CONSENT_METHODS: readonly ConsentMethod[] = [
  "payment-verified",
  "signed-form-email-verified",
];

/** True iff `method` is a real (non-mock) verifiable-consent method. */
export function isVerifiedConsentMethod(method: ConsentMethod): boolean {
  return VERIFIED_CONSENT_METHODS.includes(method);
}

/**
 * True iff the process env says we are inside the Firebase emulator (the ONLY
 * place `dev_mock` is legal — §8 #29). Checks the emulator host vars +
 * `FUNCTIONS_EMULATOR`; a prod-like config (none set) returns false.
 */
export function isEmulatorEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): boolean {
  return Boolean(
    env.FIREBASE_AUTH_EMULATOR_HOST ||
      env.FIRESTORE_EMULATOR_HOST ||
      env.FIREBASE_EMULATOR_HUB ||
      env.FUNCTIONS_EMULATOR === "true",
  );
}

/**
 * FAIL-CLOSED gate for `recordConsent` (§8 #29): `dev_mock` is REJECTED
 * unless the emulator env is detected; unknown strings are rejected outright.
 * Returns the rejection reason (null = allowed) so callables can surface an
 * honest error without throwing through this pure layer.
 */
export function consentMethodRejection(
  method: string,
  opts: { emulator: boolean },
): string | null {
  const known: readonly string[] = [
    "signed-form-email-verified",
    "payment-verified",
    "knowledge-based",
    "dev_mock",
  ];
  if (!known.includes(method)) return `unknown consent method "${method}"`;
  if (method === "dev_mock" && !opts.emulator) {
    return "dev_mock consent is emulator-only and is rejected in production (§8 #29)";
  }
  return null;
}

/**
 * The `provisionChild` precondition (§8 #29): at least one consent record
 * with a REAL verified method. A `dev_mock` record never satisfies it —
 * even inside the emulator a provision test must exercise the real shape.
 */
export function hasVerifiedParentalConsent(consent: readonly ConsentRecord[]): boolean {
  return consent.some((r) => isVerifiedConsentMethod(r.method));
}
