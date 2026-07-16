/**
 * functions/__tests__/consent.test.ts — the VPC gate (w1 M1.2 — §8 #29).
 *
 * The M1.2 acceptance floor: `recordConsent` REJECTS `dev_mock` under a
 * prod-like config (no emulator env vars); `provisionChild` is rejected
 * without `consentVerified` AND without a non-mock verified method on file;
 * the shippable `payment-verified` path works end to end (claim stamped,
 * child seeded with bloopEnabled:false).
 */
import { describe, expect, it } from "@jest/globals";

import { handleProvisionChild } from "../src/auth/provisionChild";
import { handleRecordConsent } from "../src/consent/recordConsent";
import { HandlerError } from "../src/ports";
import { FakeAuth, FakeDb, fixedClock, seqIds } from "./helpers/fakes";

const NOW = 1_760_000_000_000;
const PROD_ENV: Record<string, string | undefined> = {}; // no emulator vars
const EMU_ENV = { FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" };

function parentAuth(uid: string, consentVerified = false) {
  return { uid, token: { role: "parent", consentVerified } };
}

function makeDeps() {
  const db = new FakeDb();
  const auth = new FakeAuth();
  const clock = fixedClock(NOW);
  db.docs.set("users/p1", {
    uid: "p1",
    role: "parent",
    email: "parent@example.com",
    consent: [],
    fcmTokens: [],
    retentionDays: 30,
    crisisLocale: "en-US",
  });
  return { db, auth, clock };
}

const BASE_CONSENT = {
  agreementVersion: "coppa-2026-07",
  parentName: "Ricardo C.",
  scope: { transcripts: true, activity: true, llmChat: false },
};

describe("recordConsent — §8 #29 VPC", () => {
  it("REJECTS dev_mock under a prod-like config (no emulator env)", async () => {
    const deps = makeDeps();
    await expect(
      handleRecordConsent(deps, parentAuth("p1"), { ...BASE_CONSENT, method: "dev_mock" }, PROD_ENV),
    ).rejects.toThrow(/emulator-only/);
  });

  it("allows dev_mock INSIDE the emulator but it never sets consentVerified", async () => {
    const deps = makeDeps();
    const res = await handleRecordConsent(
      deps,
      parentAuth("p1"),
      { ...BASE_CONSENT, method: "dev_mock" },
      EMU_ENV,
    );
    expect(res.recorded).toBe(true);
    expect(res.consentVerified).toBe(false);
    expect(deps.auth.claims.get("p1")).toBeUndefined();
  });

  it("rejects an unknown method outright (fail closed)", async () => {
    const deps = makeDeps();
    await expect(
      handleRecordConsent(deps, parentAuth("p1"), { ...BASE_CONSENT, method: "pinky_swear" }, PROD_ENV),
    ).rejects.toThrow(/unknown consent method/);
  });

  it("payment-verified requires the PSP verification reference", async () => {
    const deps = makeDeps();
    await expect(
      handleRecordConsent(
        deps,
        parentAuth("p1"),
        { ...BASE_CONSENT, method: "payment-verified" },
        PROD_ENV,
      ),
    ).rejects.toThrow(/verification reference/);
  });

  it("payment-verified (the shipping VPC) appends the record AND stamps consentVerified", async () => {
    const deps = makeDeps();
    const res = await handleRecordConsent(
      deps,
      parentAuth("p1"),
      { ...BASE_CONSENT, method: "payment-verified", verificationRef: "psp_tx_991" },
      PROD_ENV,
    );
    expect(res.consentVerified).toBe(true);
    expect(deps.auth.claims.get("p1")).toEqual({ role: "parent", consentVerified: true });
    const user = deps.db.docs.get("users/p1")!;
    const trail = user.consent as { method: string; agreementVersion: string }[];
    expect(trail).toHaveLength(1);
    expect(trail[0]!.method).toBe("payment-verified");
    expect(trail[0]!.agreementVersion).toBe("coppa-2026-07");
  });

  it("knowledge-based records but does NOT verify (no KBA vendor in v1)", async () => {
    const deps = makeDeps();
    const res = await handleRecordConsent(
      deps,
      parentAuth("p1"),
      { ...BASE_CONSENT, method: "knowledge-based" },
      PROD_ENV,
    );
    expect(res.consentVerified).toBe(false);
  });

  it("requires a parent caller", async () => {
    const deps = makeDeps();
    await expect(
      handleRecordConsent(deps, null, { ...BASE_CONSENT, method: "payment-verified" }, PROD_ENV),
    ).rejects.toThrow(HandlerError);
    await expect(
      handleRecordConsent(
        deps,
        { uid: "k1", token: { role: "kid" } },
        { ...BASE_CONSENT, method: "payment-verified" },
        PROD_ENV,
      ),
    ).rejects.toThrow(/parent role/);
  });
});

describe("provisionChild — consent-gated child creation", () => {
  const CHILD = { displayName: "Ari", ageMode: "young" as const };

  it("rejects without the consentVerified claim", async () => {
    const deps = { ...makeDeps(), ids: seqIds("c") };
    await expect(
      handleProvisionChild(deps, parentAuth("p1", false), CHILD),
    ).rejects.toThrow(/consent required/i);
  });

  it("rejects when the claim is set but the trail has NO non-mock verified method", async () => {
    const deps = { ...makeDeps(), ids: seqIds("c") };
    deps.db.docs.set("users/p1", {
      ...deps.db.docs.get("users/p1")!,
      consent: [{ method: "dev_mock", agreementVersion: "coppa-2026-07", grantedAt: NOW, parentName: "R", scope: { transcripts: true, activity: true, llmChat: false } }],
    });
    await expect(
      handleProvisionChild(deps, parentAuth("p1", true), CHILD),
    ).rejects.toThrow(/non-mock/);
  });

  it("provisions under a payment-verified trail: child + settings (bloopEnabled FALSE) + pairing code", async () => {
    const deps = { ...makeDeps(), ids: seqIds("c") };
    deps.db.docs.set("users/p1", {
      ...deps.db.docs.get("users/p1")!,
      consent: [{ method: "payment-verified", agreementVersion: "coppa-2026-07", grantedAt: NOW, parentName: "R", scope: { transcripts: true, activity: true, llmChat: false } }],
    });
    const res = await handleProvisionChild(deps, parentAuth("p1", true), CHILD);

    const child = deps.db.docs.get(`children/${res.childId}`)!;
    expect(child.parentUid).toBe("p1");
    expect(child.displayName).toBe("Ari");

    const settings = deps.db.docs.get(`children/${res.childId}/settings/current`)!;
    const controls = settings.controls as { bloopEnabled: boolean; inputMode: string; retentionDays: number };
    expect(controls.bloopEnabled).toBe(false); // LLM OFF by default — load-bearing
    expect(controls.inputMode).toBe("chips"); // PII-free by construction
    expect(controls.retentionDays).toBe(30); // COPPA-min default (§8 #10b)

    const code = deps.db.docs.get(`pairingCodes/${res.pairingCode}`)!;
    expect(code.childId).toBe(res.childId);
    expect(res.pairingExpiresAtMs).toBe(NOW + 10 * 60 * 1000);
  });

  it("rejects a multi-word full name (data minimization: first name only)", async () => {
    const deps = { ...makeDeps(), ids: seqIds("c") };
    deps.db.docs.set("users/p1", {
      ...deps.db.docs.get("users/p1")!,
      consent: [{ method: "payment-verified", agreementVersion: "coppa-2026-07", grantedAt: NOW, parentName: "R", scope: { transcripts: true, activity: true, llmChat: false } }],
    });
    await expect(
      handleProvisionChild(deps, parentAuth("p1", true), {
        displayName: "Ari Bello Castillo",
        ageMode: "young",
      }),
    ).rejects.toThrow(/first name/);
  });
});
