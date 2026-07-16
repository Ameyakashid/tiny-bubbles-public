/**
 * functions/__tests__/retention.test.ts — TTL stamping + sweep + re-stamp
 * (w1 M1.2 — §2.5, §8 #10b/#27).
 *
 * Floor: `expiresAt = createdAt + retentionDays` (default 30); `ttlSweep`
 * deletes expired docs; `onRetentionChange` re-stamps ONLY on shrink; and
 * `legalHold` docs are NEVER swept, re-stamped, or purged (§8 #27).
 */
import { describe, expect, it } from "@jest/globals";

import { handleDeleteChildData } from "../src/data/deleteChildData";
import { writeTranscriptTurn } from "../src/data/transcripts";
import { handleRetentionChange } from "../src/retention/onRetentionChange";
import { runTtlSweep } from "../src/retention/ttlSweep";
import { FakeAuth, FakeDb, FakeStorage, fakeTs, fixedClock } from "./helpers/fakes";

const NOW = 1_760_000_000_000;
const DAY = 86_400_000;

describe("expiresAt stamping (§8 #10b)", () => {
  it("defaults to 30 days (COPPA-min) and honors the 90-day override", async () => {
    const db = new FakeDb();
    const clock = fixedClock(NOW);
    const doc30 = await writeTranscriptTurn(
      { db, clock },
      { childId: "c", sessionId: "s", turnId: "a", rawChildText: "hi", inputMode: "chips", rawReplyText: "hello", status: "ok", model: "mock", inputFlags: [], outputFlags: [], flagged: false },
    );
    expect(db.tsToMillis(doc30.expiresAt)).toBe(NOW + 30 * DAY);

    const doc90 = await writeTranscriptTurn(
      { db, clock },
      { childId: "c", sessionId: "s", turnId: "b", rawChildText: "hi", inputMode: "chips", rawReplyText: "hello", status: "ok", model: "mock", inputFlags: [], outputFlags: [], flagged: false, retentionDays: 90 },
    );
    expect(db.tsToMillis(doc90.expiresAt)).toBe(NOW + 90 * DAY);
  });

  it("coerces a corrupt window onto the typed policy (never longer than chosen)", async () => {
    const db = new FakeDb();
    const doc = await writeTranscriptTurn(
      { db, clock: fixedClock(NOW) },
      { childId: "c", sessionId: "s", turnId: "x", rawChildText: "hi", inputMode: "chips", rawReplyText: "ok", status: "ok", model: "mock", inputFlags: [], outputFlags: [], flagged: false, retentionDays: 4444 },
    );
    expect(db.tsToMillis(doc.expiresAt)).toBe(NOW + 90 * DAY); // clamped to max
  });
});

describe("ttlSweep — the daily backstop (§2.5)", () => {
  it("deletes expired docs across every TTL group but SKIPS legalHold (§8 #27)", async () => {
    const db = new FakeDb();
    db.docs.set("children/c1/activity/old", { id: "old", expiresAt: fakeTs(NOW - 1) });
    db.docs.set("children/c1/activity/fresh", { id: "fresh", expiresAt: fakeTs(NOW + DAY) });
    db.docs.set("children/c1/transcripts/held", {
      turnId: "held",
      expiresAt: fakeTs(NOW - DAY),
      legalHold: true, // abuse/csam preservation
    });
    db.docs.set("children/c1/transcripts/expired", { turnId: "expired", expiresAt: fakeTs(NOW - DAY) });
    db.docs.set("children/c1/reports/7d", { rangeKey: "7d", expiresAt: fakeTs(NOW - 1) });

    const result = await runTtlSweep({ db, clock: fixedClock(NOW) });
    expect(result.deleted).toBe(3); // old activity + expired transcript + stale report
    expect(result.skippedLegalHold).toBe(1);
    expect(db.docs.has("children/c1/transcripts/held")).toBe(true); // preserved
    expect(db.docs.has("children/c1/activity/fresh")).toBe(true);
    expect(db.docs.has("children/c1/activity/old")).toBe(false);
  });
});

describe("onRetentionChange — shrink re-stamps, grow never extends", () => {
  function seed(db: FakeDb) {
    db.docs.set("children/c1", { childId: "c1", parentUid: "p1" });
    db.docs.set("children/c1/transcripts/t1", {
      turnId: "t1",
      createdAt: fakeTs(NOW),
      expiresAt: fakeTs(NOW + 90 * DAY),
    });
    db.docs.set("children/c1/transcripts/held", {
      turnId: "held",
      createdAt: fakeTs(NOW),
      expiresAt: fakeTs(NOW + 90 * DAY),
      legalHold: true,
    });
  }

  it("re-stamps to the shorter window on 90 → 30, skipping legalHold", async () => {
    const db = new FakeDb();
    seed(db);
    const res = await handleRetentionChange({ db }, { parentUid: "p1", beforeDays: 90, afterDays: 30 });
    expect(res.restamped).toBe(1);
    expect(res.skippedLegalHold).toBe(1);
    expect(db.tsToMillis(db.docs.get("children/c1/transcripts/t1")!.expiresAt)).toBe(NOW + 30 * DAY);
    expect(db.tsToMillis(db.docs.get("children/c1/transcripts/held")!.expiresAt)).toBe(NOW + 90 * DAY);
  });

  it("does nothing on 30 → 90 (data never outlives the window it was written under)", async () => {
    const db = new FakeDb();
    seed(db);
    db.docs.set("children/c1/transcripts/t1", {
      turnId: "t1",
      createdAt: fakeTs(NOW),
      expiresAt: fakeTs(NOW + 30 * DAY),
    });
    const res = await handleRetentionChange({ db }, { parentUid: "p1", beforeDays: 30, afterDays: 90 });
    expect(res.restamped).toBe(0);
    expect(db.tsToMillis(db.docs.get("children/c1/transcripts/t1")!.expiresAt)).toBe(NOW + 30 * DAY);
  });
});

describe("deleteChildData — parent erasure, legalHold survives (§8 #27)", () => {
  it("purges the subtree + auth + storage but keeps held docs and a tombstone", async () => {
    const db = new FakeDb();
    const auth = new FakeAuth();
    const storage = new FakeStorage();
    storage.objectCount = 2;
    auth.users.set("c1", { uid: "c1" });
    db.docs.set("children/c1", { childId: "c1", parentUid: "p1", displayName: "Ari" });
    db.docs.set("children/c1/activity/a1", { id: "a1" });
    db.docs.set("children/c1/transcripts/held", { turnId: "held", legalHold: true });
    db.docs.set("children/c1/settings/current", { controls: {} });

    const res = await handleDeleteChildData(
      { db, auth, storage },
      { uid: "p1", token: { role: "parent" } },
      { childId: "c1" },
    );
    expect(res.deletedDocs).toBe(2); // activity + settings
    expect(res.skippedLegalHold).toBe(1);
    expect(res.deletedStorageObjects).toBe(2);
    expect(res.authUserDeleted).toBe(true);
    expect(res.childDocDeleted).toBe(false); // tombstone kept while held
    expect(db.docs.has("children/c1/transcripts/held")).toBe(true);
    expect(db.docs.get("children/c1")!.displayName).toBe(""); // PII scrubbed off the tombstone
  });

  it("removes the child doc entirely when nothing is held", async () => {
    const db = new FakeDb();
    const auth = new FakeAuth();
    const storage = new FakeStorage();
    db.docs.set("children/c1", { childId: "c1", parentUid: "p1", displayName: "Ari" });
    db.docs.set("children/c1/activity/a1", { id: "a1" });

    const res = await handleDeleteChildData(
      { db, auth, storage },
      { uid: "p1", token: { role: "parent" } },
      { childId: "c1" },
    );
    expect(res.childDocDeleted).toBe(true);
    expect(db.docs.has("children/c1")).toBe(false);
  });

  it("a foreign parent cannot delete another family's child", async () => {
    const db = new FakeDb();
    db.docs.set("children/c1", { childId: "c1", parentUid: "p1" });
    await expect(
      handleDeleteChildData(
        { db, auth: new FakeAuth(), storage: new FakeStorage() },
        { uid: "intruder", token: { role: "parent" } },
        { childId: "c1" },
      ),
    ).rejects.toThrow(/not the guardian/);
  });
});
