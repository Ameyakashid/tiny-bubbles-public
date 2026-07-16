/**
 * functions/__tests__/auth.test.ts — the COPPA account gate + pairing +
 * server-authoritative interceptor (w1 M1.2 — §2.1, §8 #21c/#28/#29).
 */
import { describe, expect, it } from "@jest/globals";

import { handleBeforeUserCreated } from "../src/auth/beforeUserCreated";
import { handlePairKidDevice } from "../src/auth/pairKidDevice";
import { verifyKidContext } from "../src/interceptors/verifyIdToken";
import { FakeAuth, FakeDb, fakeTs, fixedClock } from "./helpers/fakes";

const NOW = 1_760_000_000_000;

const VERIFIED_CONSENT = [
  {
    method: "payment-verified",
    agreementVersion: "coppa-2026-07",
    grantedAt: NOW,
    parentName: "R",
    scope: { transcripts: true, activity: true, llmChat: false },
  },
];

describe("beforeUserCreated — the COPPA gate", () => {
  it("blocks a kid uid with NO provisioned children/{uid} doc", async () => {
    const db = new FakeDb();
    await expect(handleBeforeUserCreated({ db }, { uid: "ghost-kid" })).rejects.toThrow(
      /provisioned child|email signup/,
    );
  });

  it("blocks a kid uid whose parent has no verified (non-mock) consent", async () => {
    const db = new FakeDb();
    db.docs.set("children/k1", { childId: "k1", parentUid: "p1" });
    db.docs.set("users/p1", { uid: "p1", consent: [{ method: "dev_mock" }] });
    await expect(handleBeforeUserCreated({ db }, { uid: "k1" })).rejects.toThrow(
      /consent-verified parent/,
    );
  });

  it("allows the kid uid after provisioning under a verified parent, stamping kid claims", async () => {
    const db = new FakeDb();
    db.docs.set("children/k1", { childId: "k1", parentUid: "p1" });
    db.docs.set("users/p1", { uid: "p1", consent: VERIFIED_CONSENT });
    const res = await handleBeforeUserCreated({ db }, { uid: "k1" });
    expect(res.customClaims).toEqual({ role: "kid", parentUid: "p1", childId: "k1" });
  });

  it("a plain email signup becomes an UNVERIFIED parent", async () => {
    const db = new FakeDb();
    const res = await handleBeforeUserCreated({ db }, { uid: "p9", email: "p@example.com" });
    expect(res.customClaims).toEqual({ role: "parent", consentVerified: false });
  });
});

describe("pairKidDevice — code → custom token (§8 #21c/#28)", () => {
  function seeded() {
    const db = new FakeDb();
    const auth = new FakeAuth();
    db.docs.set("pairingCodes/123456", {
      childId: "k1",
      parentUid: "p1",
      expiresAtMs: NOW + 60_000,
      createdAt: fakeTs(NOW),
    });
    return { db, auth, clock: fixedClock(NOW) };
  }

  it("mints {role:kid, parentUid, childId===uid} from the SERVER-stored code", async () => {
    const deps = seeded();
    const res = await handlePairKidDevice(deps, { code: "123456", localCid: "local-7" });
    expect(res.childId).toBe("k1");
    expect(res.parentUid).toBe("p1");
    expect(res.localCid).toBe("local-7"); // echoed for the linkage write
    expect(deps.auth.mintedTokens).toEqual([
      { uid: "k1", claims: { role: "kid", parentUid: "p1", childId: "k1" } },
    ]);
  });

  it("is single-use: the second exchange fails closed", async () => {
    const deps = seeded();
    await handlePairKidDevice(deps, { code: "123456" });
    await expect(handlePairKidDevice(deps, { code: "123456" })).rejects.toThrow(/unknown|used/);
  });

  it("rejects an expired code", async () => {
    const deps = seeded();
    deps.db.docs.set("pairingCodes/123456", {
      childId: "k1",
      parentUid: "p1",
      expiresAtMs: NOW - 1,
    });
    await expect(handlePairKidDevice(deps, { code: "123456" })).rejects.toThrow(/expired/);
  });
});

describe("verifyKidContext — server-authoritative (§8 #28)", () => {
  function seeded() {
    const db = new FakeDb();
    db.docs.set("children/k1", {
      childId: "k1",
      parentUid: "p1",
      ageMode: "young",
      neuroProfile: "autism",
    });
    db.docs.set("children/k1/settings/current", {
      controls: { bloopEnabled: false, topicScope: ["emotions"] },
    });
    return db;
  }

  it("derives childId FROM THE UID and loads settings server-side", async () => {
    const db = seeded();
    const ctx = await verifyKidContext(
      { db },
      { uid: "k1", token: { role: "kid", childId: "k1", parentUid: "p1" } },
    );
    expect(ctx.childId).toBe("k1");
    expect(ctx.bloopEnabled).toBe(false); // server value — a client hint can't widen it
    expect(ctx.controls?.topicScope).toEqual(["emotions"]);
  });

  it("rejects a token whose childId claim differs from the uid (foreign childId)", async () => {
    const db = seeded();
    await expect(
      verifyKidContext(
        { db },
        { uid: "k1", token: { role: "kid", childId: "OTHER", parentUid: "p1" } },
      ),
    ).rejects.toThrow(/childId does not match uid/);
  });

  it("rejects a non-kid role and a kid uid with no provisioned child", async () => {
    const db = seeded();
    await expect(
      verifyKidContext({ db }, { uid: "p1", token: { role: "parent" } }),
    ).rejects.toThrow(/kid role/);
    await expect(
      verifyKidContext(
        { db },
        { uid: "kX", token: { role: "kid", childId: "kX", parentUid: "p1" } },
      ),
    ).rejects.toThrow(/no provisioned child/);
  });

  it("fails CLOSED to bloopEnabled=false when settings are absent", async () => {
    const db = new FakeDb();
    db.docs.set("children/k1", { childId: "k1", parentUid: "p1" });
    const ctx = await verifyKidContext(
      { db },
      { uid: "k1", token: { role: "kid", childId: "k1", parentUid: "p1" } },
    );
    expect(ctx.bloopEnabled).toBe(false);
    expect(ctx.controls).toBeNull();
  });
});
