/**
 * functions/__tests__/alerts.test.ts — crisis differentiation + dual-channel
 * delivery (w1 M1.2 — §8 #26/#27). THE safety-routing floor:
 *   self_harm/severe_distress → parent alert (FCM + email fallback);
 *   abuse/csam → NO parent auto-alert + safetyReport + legalHold.
 */
import { describe, expect, it } from "@jest/globals";

import { reEscalateUnacknowledged, sendParentAlert } from "../src/alerts/sendParentAlert";
import { FakeDb, FakeEmail, FakeMessaging, fakeTs, fixedClock, seqIds } from "./helpers/fakes";

const NOW = 1_760_000_000_000;

function makeDeps() {
  const db = new FakeDb();
  db.docs.set("users/p1", {
    uid: "p1",
    email: "parent@example.com",
    fcmTokens: [
      { token: "tok-fcm", type: "fcm", platform: "android", updatedAtMs: NOW },
      { token: "tok-apns", type: "apns", platform: "ios", updatedAtMs: NOW },
    ],
  });
  db.docs.set("children/c1/transcripts/t9", { turnId: "t9", childText: "…" });
  return {
    db,
    messaging: new FakeMessaging(),
    email: new FakeEmail(),
    clock: fixedClock(NOW),
    ids: seqIds("al"),
  };
}

const WINDOW = ["t9"];
const PINNED = [{ childText: "[redacted:full_name] is sad", replyText: "I hear you.", atMs: NOW }];

describe("sendParentAlert — self_harm/distress → PARENT alert (§8 #27)", () => {
  it("writes the alert doc and pushes over FCM (apns tokens skipped by the FCM leg)", async () => {
    const deps = makeDeps();
    const res = await sendParentAlert(deps, {
      childId: "c1",
      parentUid: "p1",
      severity: "crisis",
      reason: "self-harm signal in chat",
      crisisType: "self_harm",
      transcriptWindow: WINDOW,
      pinnedTurns: PINNED,
    });
    expect(res.route).toBe("parent_alert");
    expect(res.deliveredFcm).toBe(true);
    expect(deps.messaging.sent).toHaveLength(1); // ONLY the fcm-typed token (§8 #26)
    expect(deps.messaging.sent[0]!.token).toBe("tok-fcm");
    expect(deps.email.sent).toHaveLength(0); // fallback not needed

    const alert = deps.db.docs.get(`children/c1/alerts/${res.alertId}`)!;
    expect(alert.status).toBe("new");
    expect(alert.severity).toBe("crisis");
    expect(alert.deliveredFcm).toBe(true);
    expect((alert.pinnedTurns as unknown[]).length).toBe(1); // context survives transcript TTL
  });

  it("falls back to EMAIL when every FCM send fails (§8 #26 dual channel)", async () => {
    const deps = makeDeps();
    deps.messaging.rejectTokens.add("tok-fcm");
    const res = await sendParentAlert(deps, {
      childId: "c1",
      parentUid: "p1",
      severity: "crisis",
      reason: "severe distress",
      crisisType: "severe_distress",
      transcriptWindow: WINDOW,
      pinnedTurns: PINNED,
    });
    expect(res.deliveredFcm).toBe(false);
    expect(res.deliveredEmail).toBe(true);
    expect(deps.email.sent[0]!.to).toBe("parent@example.com");
  });
});

describe("sendParentAlert — abuse/csam → NO parent auto-alert (§8 #27)", () => {
  for (const crisisType of ["abuse", "csam"] as const) {
    it(`${crisisType}: safetyReport + legalHold, ZERO parent contact`, async () => {
      const deps = makeDeps();
      const res = await sendParentAlert(deps, {
        childId: "c1",
        parentUid: "p1",
        severity: "crisis",
        reason: "disclosure",
        crisisType,
        transcriptWindow: WINDOW,
        pinnedTurns: PINNED,
      });
      expect(res.route).toBe("safety_report");
      // NO parent alert doc, NO push, NO email — the parent may be the abuser.
      expect(deps.messaging.sent).toHaveLength(0);
      expect(deps.email.sent).toHaveLength(0);
      expect([...deps.db.docs.keys()].some((p) => p.includes("/alerts/"))).toBe(false);

      const report = deps.db.docs.get(`safetyReports/${res.safetyReportId}`)!;
      expect(report.crisisType).toBe(crisisType);
      expect(report.status).toBe("open");
      // The window transcript is preserved under legal hold (TTL/purge-exempt).
      expect(deps.db.docs.get("children/c1/transcripts/t9")!.legalHold).toBe(true);
    });
  }
});

describe("reEscalateUnacknowledged (§8 #26)", () => {
  it("re-sends a stale NEW crisis alert once and stamps reEscalatedAt", async () => {
    const deps = makeDeps();
    deps.db.docs.set("children/c1/alerts/a1", {
      id: "a1",
      parentUid: "p1",
      severity: "crisis",
      status: "new",
      createdAt: fakeTs(NOW - 31 * 60 * 1000),
    });
    const first = await reEscalateUnacknowledged(deps, NOW);
    expect(first).toBe(1);
    expect(deps.db.docs.get("children/c1/alerts/a1")!.reEscalatedAt).toBeDefined();
    // Once only.
    const second = await reEscalateUnacknowledged(deps, NOW + 1000);
    expect(second).toBe(0);
  });

  it("leaves fresh and acknowledged alerts alone", async () => {
    const deps = makeDeps();
    deps.db.docs.set("children/c1/alerts/fresh", {
      id: "fresh",
      parentUid: "p1",
      severity: "crisis",
      status: "new",
      createdAt: fakeTs(NOW - 5 * 60 * 1000),
    });
    deps.db.docs.set("children/c1/alerts/ack", {
      id: "ack",
      parentUid: "p1",
      severity: "crisis",
      status: "acknowledged",
      createdAt: fakeTs(NOW - 90 * 60 * 1000),
    });
    expect(await reEscalateUnacknowledged(deps, NOW)).toBe(0);
  });
});
