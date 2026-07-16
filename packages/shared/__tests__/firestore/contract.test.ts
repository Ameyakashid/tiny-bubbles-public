/**
 * packages/shared/__tests__/firestore/contract.test.ts — the canonical
 * Firestore contract floor (w1 M1.2 — 02-architecture §2.3/§8).
 *
 * Pins the register's canonical picks so a later edit that drifts from the
 * consolidated contract fails HERE, not in three consumers.
 */
import { describe, expect, it } from "@jest/globals";

import {
  ALL_ACTIVITY_KINDS,
  ALL_TOPICS,
  activityCol,
  activityDoc,
  alertDoc,
  childDoc,
  globalConfigDoc,
  reportDoc,
  safetyReportDoc,
  settingsDoc,
  toInputMode,
  toTopicCategory,
  transcriptDoc,
  userDoc,
  type ActivityKind,
  type AlertSeverity,
  type AlertStatus,
} from "@tiny-bubbles/shared";

describe("ActivityKind — the canonical 11-member union (§8 #6)", () => {
  it("has EXACTLY the 11 canonical members", () => {
    expect([...ALL_ACTIVITY_KINDS].sort()).toEqual(
      [
        "step_done",
        "routine_complete",
        "token_earned",
        "mood_log",
        "emotion_logged",
        "break_taken",
        "breathing_done",
        "movement_break",
        "aac_utterance_summary",
        "firstthen_done",
        "schedule_step_done",
      ].sort(),
    );
    expect(ALL_ACTIVITY_KINDS).toHaveLength(11);
  });

  it("uses the canonical spellings (breathing_done, not breathing/breathing_session)", () => {
    const kinds: readonly ActivityKind[] = ALL_ACTIVITY_KINDS;
    expect(kinds).toContain("breathing_done");
    expect(kinds).not.toContain("breathing" as ActivityKind);
    expect(kinds).not.toContain("breathing_session" as ActivityKind);
  });
});

describe("alert enums (§8 #11)", () => {
  it("severity is info|concern|crisis (no 'warn'/'flag') and status the w1 superset", () => {
    const severities: AlertSeverity[] = ["info", "concern", "crisis"];
    const statuses: AlertStatus[] = ["new", "seen", "acknowledged", "resolved"];
    expect(severities).toHaveLength(3);
    expect(statuses).toHaveLength(4);
  });
});

describe("InputMode mapper (§8 #19)", () => {
  it("bridges every legacy spelling onto the ONE union", () => {
    expect(toInputMode("quickReply")).toBe("chips");
    expect(toInputMode("freetext")).toBe("freeText");
    expect(toInputMode("text")).toBe("freeText");
    expect(toInputMode("aac")).toBe("aac");
    expect(toInputMode("voice")).toBe("voice");
  });

  it("FAILS CLOSED to chips (PII-free) on unknown input — never to free text", () => {
    expect(toInputMode("telepathy")).toBe("chips");
    expect(toInputMode("")).toBe("chips");
  });
});

describe("TopicCategory (§8 #3)", () => {
  it("is the canonical w2 seven + maps w3's aac/socialStories onto it", () => {
    expect(ALL_TOPICS).toHaveLength(7);
    expect(toTopicCategory("aac")).toBe("communication");
    expect(toTopicCategory("socialStories")).toBe("social");
    expect(toTopicCategory("weapons")).toBeUndefined(); // unknown ⇒ grants nothing
  });
});

describe("paths — one spelling of the tree (§2.2)", () => {
  it("builds the canonical paths", () => {
    expect(userDoc("p1")).toBe("users/p1");
    expect(childDoc("k1")).toBe("children/k1");
    expect(settingsDoc("k1")).toBe("children/k1/settings/current");
    expect(activityCol("k1")).toBe("children/k1/activity");
    expect(activityDoc("k1", "e1")).toBe("children/k1/activity/e1");
    expect(transcriptDoc("k1", "t1")).toBe("children/k1/transcripts/t1");
    expect(alertDoc("k1", "a1")).toBe("children/k1/alerts/a1");
    expect(reportDoc("k1", "7d")).toBe("children/k1/reports/7d");
    expect(safetyReportDoc("s1")).toBe("safetyReports/s1");
    expect(globalConfigDoc()).toBe("config/global");
  });
});
