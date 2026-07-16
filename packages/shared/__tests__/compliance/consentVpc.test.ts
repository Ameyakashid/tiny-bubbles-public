/**
 * packages/shared/__tests__/compliance/consentVpc.test.ts — the pure VPC
 * predicates (w1 M1.2 — §8 #29). The functions-side callables apply exactly
 * these; here the matrix is pinned with no emulator/transport.
 */
import { describe, expect, it } from "@jest/globals";

import {
  VERIFIED_CONSENT_METHODS,
  consentMethodRejection,
  hasVerifiedParentalConsent,
  isEmulatorEnv,
  isVerifiedConsentMethod,
  type ConsentRecord,
} from "@tiny-bubbles/shared/compliance/consent";

function record(method: ConsentRecord["method"]): ConsentRecord {
  return {
    method,
    agreementVersion: "coppa-2026-07",
    grantedAt: 1,
    parentName: "R",
    scope: { transcripts: true, activity: true, llmChat: false },
  };
}

describe("verified-method registry (§8 #29)", () => {
  it("payment-verified (the shipping VPC) + signed-form are verified; KBA and dev_mock are NOT", () => {
    expect(VERIFIED_CONSENT_METHODS).toEqual(["payment-verified", "signed-form-email-verified"]);
    expect(isVerifiedConsentMethod("payment-verified")).toBe(true);
    expect(isVerifiedConsentMethod("signed-form-email-verified")).toBe(true);
    expect(isVerifiedConsentMethod("knowledge-based")).toBe(false);
    expect(isVerifiedConsentMethod("dev_mock")).toBe(false);
  });
});

describe("isEmulatorEnv", () => {
  it("a prod-like env (no emulator vars) is NOT the emulator", () => {
    expect(isEmulatorEnv({})).toBe(false);
    expect(isEmulatorEnv({ NODE_ENV: "production" })).toBe(false);
    expect(isEmulatorEnv({ FUNCTIONS_EMULATOR: "false" })).toBe(false);
  });

  it("any emulator host var flips it", () => {
    expect(isEmulatorEnv({ FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" })).toBe(true);
    expect(isEmulatorEnv({ FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" })).toBe(true);
    expect(isEmulatorEnv({ FUNCTIONS_EMULATOR: "true" })).toBe(true);
  });
});

describe("consentMethodRejection — fail closed (§8 #29)", () => {
  it("REJECTS dev_mock outside the emulator", () => {
    expect(consentMethodRejection("dev_mock", { emulator: false })).toMatch(/emulator-only/);
  });

  it("allows dev_mock ONLY inside the emulator", () => {
    expect(consentMethodRejection("dev_mock", { emulator: true })).toBeNull();
  });

  it("rejects unknown strings outright, in every env", () => {
    expect(consentMethodRejection("carrier_pigeon", { emulator: false })).toMatch(/unknown/);
    expect(consentMethodRejection("carrier_pigeon", { emulator: true })).toMatch(/unknown/);
  });

  it("real methods pass in prod", () => {
    expect(consentMethodRejection("payment-verified", { emulator: false })).toBeNull();
    expect(consentMethodRejection("signed-form-email-verified", { emulator: false })).toBeNull();
    expect(consentMethodRejection("knowledge-based", { emulator: false })).toBeNull();
  });
});

describe("hasVerifiedParentalConsent — the provisionChild precondition", () => {
  it("false for an empty trail and for mock/KBA-only trails (even in the emulator)", () => {
    expect(hasVerifiedParentalConsent([])).toBe(false);
    expect(hasVerifiedParentalConsent([record("dev_mock")])).toBe(false);
    expect(hasVerifiedParentalConsent([record("knowledge-based"), record("dev_mock")])).toBe(false);
  });

  it("true once ANY real verified record exists", () => {
    expect(hasVerifiedParentalConsent([record("payment-verified")])).toBe(true);
    expect(hasVerifiedParentalConsent([record("dev_mock"), record("signed-form-email-verified")])).toBe(true);
  });
});
