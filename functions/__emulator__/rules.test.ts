/**
 * functions/__emulator__/rules.test.ts — firestore.rules against the REAL
 * emulator (w1 M1.2 acceptance — roadmap M1.2 rules matrix).
 *
 * ⚠ DEFERRED — NEEDS JAVA (the env floor has no JVM; the Firestore emulator
 * cannot boot here). RUN BEFORE ANY DEPLOY:
 *   npx firebase emulators:exec --project demo-tiny-bubbles \
 *     "npx jest --config jest.emulator.config.js"
 *
 * The unit-level twin of every behavior below already runs on the CI floor
 * (handler tests with fakes); THIS suite is the rules-language proof.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "@jest/globals";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

const PARENT = { uid: "p1", token: { role: "parent" } };
const OTHER_PARENT = { uid: "p2", token: { role: "parent" } };
const KID = { uid: "k1", token: { role: "kid", parentUid: "p1", childId: "k1" } };
const FOREIGN_KID = { uid: "k2", token: { role: "kid", parentUid: "p2", childId: "k2" } };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-tiny-bubbles",
    firestore: { rules: readFileSync(resolve(__dirname, "..", "firestore.rules"), "utf8") },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/p1"), { uid: "p1", role: "parent", consent: [], retentionDays: 30 });
    await setDoc(doc(db, "children/k1"), { childId: "k1", parentUid: "p1", displayName: "Ari" });
    await setDoc(doc(db, "children/k1/settings/current"), {
      controls: { bloopEnabled: false },
      preferences: { sensory: { lowStim: false } },
    });
    await setDoc(doc(db, "children/k1/transcripts/t1"), { turnId: "t1", childText: "[redacted:email]" });
    await setDoc(doc(db, "children/k1/alerts/a1"), { id: "a1", status: "new" });
    await setDoc(doc(db, "config/global"), { version: "test" });
  });
});

describe("default deny", () => {
  it("an unauthenticated client can read/write NOTHING", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/p1")));
    await assertFails(getDoc(doc(db, "children/k1")));
    await assertFails(setDoc(doc(db, "children/k1/activity/x"), { id: "x" }));
    await assertFails(getDoc(doc(db, "somewhere/else")));
  });
});

describe("parent scope", () => {
  it("parent reads/updates ONLY their own users/{uid} + children/*", async () => {
    const own = env.authenticatedContext(PARENT.uid, PARENT.token).firestore();
    await assertSucceeds(getDoc(doc(own, "users/p1")));
    await assertSucceeds(getDoc(doc(own, "children/k1")));
    await assertSucceeds(getDoc(doc(own, "children/k1/transcripts/t1"))); // parent-read
    await assertSucceeds(getDoc(doc(own, "children/k1/alerts/a1")));

    const other = env.authenticatedContext(OTHER_PARENT.uid, OTHER_PARENT.token).firestore();
    await assertFails(getDoc(doc(other, "users/p1")));
    await assertFails(getDoc(doc(other, "children/k1")));
    await assertFails(getDoc(doc(other, "children/k1/transcripts/t1")));
  });

  it("parent cannot rewrite the guardian link", async () => {
    const own = env.authenticatedContext(PARENT.uid, PARENT.token).firestore();
    await assertFails(updateDoc(doc(own, "children/k1"), { parentUid: "p2" }));
    await assertSucceeds(updateDoc(doc(own, "children/k1"), { displayName: "Ri" }));
  });
});

describe("kid scope (custom-token claims)", () => {
  it("kid CREATES own activity (id === docId) but cannot touch transcripts/alerts/controls", async () => {
    const kid = env.authenticatedContext(KID.uid, KID.token).firestore();
    await assertSucceeds(setDoc(doc(kid, "children/k1/activity/e1"), { id: "e1", kind: "step_done" }));
    // idempotent re-set of the SAME doc id (retry drain)
    await assertSucceeds(setDoc(doc(kid, "children/k1/activity/e1"), { id: "e1", kind: "step_done" }, { merge: true }));
    // id/docId mismatch fails
    await assertFails(setDoc(doc(kid, "children/k1/activity/e2"), { id: "DIFFERENT", kind: "step_done" }));
    // no reads of transcripts, no writes of alerts/transcripts
    await assertFails(getDoc(doc(kid, "children/k1/transcripts/t1")));
    await assertFails(setDoc(doc(kid, "children/k1/transcripts/t2"), { turnId: "t2" }));
    await assertFails(getDoc(doc(kid, "children/k1/alerts/a1")));
    await assertFails(setDoc(doc(kid, "children/k1/alerts/a2"), { id: "a2" }));
    // settings: preferences ok, controls immutable
    await assertSucceeds(
      updateDoc(doc(kid, "children/k1/settings/current"), { preferences: { sensory: { lowStim: true } } }),
    );
    await assertFails(
      updateDoc(doc(kid, "children/k1/settings/current"), { controls: { bloopEnabled: true } }),
    );
  });

  it("kid writes own reports/{rangeKey}; parent reads them (§8 #21)", async () => {
    const kid = env.authenticatedContext(KID.uid, KID.token).firestore();
    await assertSucceeds(setDoc(doc(kid, "children/k1/reports/7d"), { rangeKey: "7d", model: {} }));
    await assertFails(setDoc(doc(kid, "children/k1/reports/30d"), { rangeKey: "WRONG", model: {} }));
    const parent = env.authenticatedContext(PARENT.uid, PARENT.token).firestore();
    await assertSucceeds(getDoc(doc(parent, "children/k1/reports/7d")));
  });

  it("a FOREIGN kid can touch nothing under another child", async () => {
    const foreign = env.authenticatedContext(FOREIGN_KID.uid, FOREIGN_KID.token).firestore();
    await assertFails(getDoc(doc(foreign, "children/k1")));
    await assertFails(setDoc(doc(foreign, "children/k1/activity/x"), { id: "x" }));
    await assertFails(setDoc(doc(foreign, "children/k1/reports/7d"), { rangeKey: "7d" }));
  });
});

describe("admin-only zones", () => {
  it("safetyReports are invisible to parent AND kid (§8 #27)", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "safetyReports/s1"), { id: "s1", childId: "k1" });
    });
    const parent = env.authenticatedContext(PARENT.uid, PARENT.token).firestore();
    const kid = env.authenticatedContext(KID.uid, KID.token).firestore();
    await assertFails(getDoc(doc(parent, "safetyReports/s1")));
    await assertFails(getDoc(doc(kid, "safetyReports/s1")));
  });

  it("config/global is read-only to signed-in clients", async () => {
    const parent = env.authenticatedContext(PARENT.uid, PARENT.token).firestore();
    await assertSucceeds(getDoc(doc(parent, "config/global")));
    await assertFails(setDoc(doc(parent, "config/global"), { version: "hax" }));
  });
});
