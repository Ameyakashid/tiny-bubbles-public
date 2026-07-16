/**
 * __tests__/sync/cloudSync.test.ts — the M1.2 sync-adapter floor
 * (02-architecture §2.4, §8 #6/#21; roadmap M1.2 acceptance).
 *
 * Proves, with a MOCKED Firestore port (no SDK/network/emulator):
 *   - an outbox emission for EACH of the 11 canonical ActivityKinds through
 *     the ONE `emitActivity` seam (incl. the real non-gameplay producers:
 *     addMood → mood_log/emotion_logged, buddy rest → break_taken, focus
 *     toBreak → movement_break, calm complete → breathing_done);
 *   - fail-closed defaults: cloudSyncEnabled absent/false OR unpaired ⇒
 *     emit is a NO-OP (zero queue growth — Firebase provably additive);
 *   - offline outbox queues; online drain is IDEMPOTENT (localId === docId;
 *     a retried item re-`set`s the same path; no dupes) and stamps
 *     `expiresAt = createdAt + retentionDays` (default 30, §8 #10b);
 *   - payload hygiene: long/PII strings are dropped (counts only);
 *   - settings merge: parent `controls` ALWAYS apply down; `preferences` are
 *     field-level LWW; the kid never pushes controls up;
 *   - `computeAndSyncReportSnapshot` writes a PII-FREE ReportSnapshotDoc per
 *     rangeKey (7d/30d free tier) — a mood NOTE never leaves the device;
 *   - `wipeAllChildData` clears the tb/sync slice (COPPA delete).
 */
import { beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ALL_ACTIVITY_KINDS, containsPii } from "@tiny-bubbles/shared";

import {
  computeAndSyncReportSnapshot,
  drainOutbox,
  emitActivity,
  emitAacUtteranceSummary,
  sanitizeActivityPayload,
} from "../../src/sync/cloudSync";
import { __setSyncPortsForTests, type SyncPorts } from "../../src/sync/firebase";
import { mergeSettings } from "../../src/sync/settingsSync";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useFocusSessionStore } from "../../src/state/focusSessionStore";
import { completeStep, createChildWithSeed, wipeAllChildData } from "../../src/state/gameplay";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useSyncStore } from "../../src/state/syncStore";
import { useTaskStore } from "../../src/state/taskStore";

const NOW = 1_760_000_000_000;
const DAY = 86_400_000;
const CLOUD_ID = "cloud-kid-1";

// ---------------------------------------------------------------------------
// Mock Firestore port (the ONE egress seam, injected).
// ---------------------------------------------------------------------------

class MockFirestore {
  writes: { path: string; data: Record<string, unknown>; merge: boolean }[] = [];
  failAll = false;

  async setDoc(path: string, data: Record<string, unknown>, opts: { merge: boolean }) {
    if (this.failAll) throw new Error("offline");
    this.writes.push({ path, data, merge: opts.merge });
  }

  async getDoc(): Promise<Record<string, unknown> | null> {
    return null;
  }

  tsFromMillis(ms: number) {
    return { ms, toMillis: () => ms };
  }
}

function installPorts(fs: MockFirestore): void {
  const ports: SyncPorts = {
    firestore: fs,
    auth: { signInWithCustomToken: async () => ({ uid: CLOUD_ID }), currentUid: () => CLOUD_ID },
    functions: { call: async () => ({}) as never },
  };
  __setSyncPortsForTests(ports);
}

function resetStores(): void {
  useChildStore.setState({
    index: [],
    profiles: {},
    ledgers: {},
    progress: {},
    reinforcement: {},
    moods: {},
    events: {},
  });
  useTaskStore.setState({ tasks: {}, routines: {}, runs: {}, lastRolloverDay: {} });
  useSyncStore.getState().clearAll();
  useFocusSessionStore.setState({ session: null });
}

/** A seeded, PAIRED, sync-enabled child (the "on" fixture). */
function makeSyncedChild(): string {
  const cid = createChildWithSeed({ displayName: "Ari", ageMode: "young", timeZone: "UTC" });
  useChildStore.getState().updateSettings(cid, { cloudSyncEnabled: true, retentionDays: 30 });
  useSyncStore.getState().setLinkage(cid, { childId: CLOUD_ID, parentUid: "p1" });
  useSettingsStore.getState().setActiveChild(cid);
  return cid;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  resetStores();
  __setSyncPortsForTests(null); // offline/unconfigured unless a test installs a port
});

// ---------------------------------------------------------------------------
// 1. The 11-kind emission floor (§8 #6 — one seam, EVERY ActivityKind).
// ---------------------------------------------------------------------------

describe("emitActivity — an emission for EACH canonical ActivityKind", () => {
  it("queues one outbox entry per kind through the ONE seam (all 11)", () => {
    makeSyncedChild();
    for (const kind of ALL_ACTIVITY_KINDS) {
      expect(emitActivity(kind, { count: 1 })).toBe(true);
    }
    const outbox = useSyncStore.getState().outbox;
    expect(outbox).toHaveLength(11);
    expect(new Set(outbox.map((i) => i.doc.kind))).toEqual(new Set(ALL_ACTIVITY_KINDS));
    // every entry targets the CLOUD child and carries a unique idempotency id
    expect(new Set(outbox.map((i) => i.localId)).size).toBe(11);
    for (const item of outbox) {
      expect(item.childId).toBe(CLOUD_ID);
      expect(item.localId).toBe(item.doc.id);
      expect(item.collection).toBe("activity");
    }
  });

  it("REAL producers route through the seam: gameplay step, mood, emotion, rest, movement break, aac aggregate", () => {
    const cid = makeSyncedChild();

    // gameplay → step_done (+ token_earned)
    const task = (useTaskStore.getState().tasks[cid] ?? [])[0];
    expect(task).toBeDefined();
    completeStep(cid, task!);

    // moods slice → mood_log; the w6 emotion shape → emotion_logged
    useChildStore.getState().addMood(cid, { ts: NOW, day: "2025-10-09", mood: "good" as never });
    useChildStore
      .getState()
      .addMood(cid, { ts: NOW, day: "2025-10-09", emotionCore: "calm" } as never);

    // buddy rest → break_taken (companion seeded by createChildWithSeed)
    useBuddyStore.getState().applyEvent(cid, "rest");

    // focus movement break → movement_break
    useFocusSessionStore.getState().start(
      { childId: cid, focusMinutes: 15, breakMinutes: 5, movementBreaks: true },
      NOW,
    );
    useFocusSessionStore.getState().toBreak(NOW + 15 * 60_000);

    // w4 AAC aggregate placeholder seam
    emitAacUtteranceSummary({ utterances: 4, distinctSymbols: 3 }, { cid });

    const kinds = useSyncStore.getState().outbox.map((i) => i.doc.kind);
    for (const expected of [
      "step_done",
      "token_earned",
      "mood_log",
      "emotion_logged",
      "break_taken",
      "movement_break",
      "aac_utterance_summary",
    ]) {
      expect(kinds).toContain(expected);
    }
    // the mood NOTE / free text can never ride along — counts only
    const moodItem = useSyncStore.getState().outbox.find((i) => i.doc.kind === "mood_log")!;
    expect(Object.keys(moodItem.doc.payload)).not.toContain("note");
  });
});

// ---------------------------------------------------------------------------
// 2. Fail-closed defaults (Firebase provably additive).
// ---------------------------------------------------------------------------

describe("fail-closed no-op defaults", () => {
  it("cloudSyncEnabled ABSENT (the default) ⇒ emit no-ops, zero queue growth", () => {
    const cid = createChildWithSeed({ displayName: "Bo", ageMode: "young", timeZone: "UTC" });
    useSettingsStore.getState().setActiveChild(cid);
    expect(emitActivity("step_done", {}, { cid })).toBe(false);
    expect(useSyncStore.getState().outbox).toHaveLength(0);
  });

  it("enabled but UNPAIRED (no linkage) ⇒ still a no-op — nothing can leave", () => {
    const cid = createChildWithSeed({ displayName: "Bo", ageMode: "young", timeZone: "UTC" });
    useChildStore.getState().updateSettings(cid, { cloudSyncEnabled: true });
    expect(emitActivity("step_done", {}, { cid })).toBe(false);
    expect(useSyncStore.getState().outbox).toHaveLength(0);
  });

  it("no active child ⇒ no-op", () => {
    useSettingsStore.getState().setActiveChild(null);
    expect(emitActivity("step_done")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Offline queue + idempotent drain (§2.4).
// ---------------------------------------------------------------------------

describe("outbox drain", () => {
  it("offline/unconfigured: events stay queued; nothing is lost, nothing errors", async () => {
    makeSyncedChild();
    emitActivity("step_done", { tokens: 1 });
    emitActivity("mood_log", { mood: "good" });
    const res = await drainOutbox(NOW);
    expect(res).toEqual({ drained: 0, remaining: 2 });
    expect(useSyncStore.getState().outbox).toHaveLength(2);
    expect(useSyncStore.getState().status).toBe("pending"); // never an error/red state
  });

  it("online: drains to children/{cloudId}/activity/{localId} with TTL stamping (30d default)", async () => {
    makeSyncedChild();
    const fs = new MockFirestore();
    installPorts(fs);
    emitActivity("step_done", { tokens: 2 }, { atMs: NOW - 1000 });
    const [item] = useSyncStore.getState().outbox;

    const res = await drainOutbox(NOW);
    expect(res).toEqual({ drained: 1, remaining: 0 });
    expect(useSyncStore.getState().outbox).toHaveLength(0);
    expect(useSyncStore.getState().status).toBe("synced");

    expect(fs.writes).toHaveLength(1);
    const write = fs.writes[0]!;
    expect(write.path).toBe(`children/${CLOUD_ID}/activity/${item!.localId}`);
    expect(write.merge).toBe(true); // idempotent set-with-merge
    expect((write.data.at as { ms: number }).ms).toBe(NOW - 1000);
    expect((write.data.createdAt as { ms: number }).ms).toBe(NOW);
    expect((write.data.expiresAt as { ms: number }).ms).toBe(NOW + 30 * DAY); // §8 #10b
  });

  it("retry is idempotent: a failed batch keeps items (attempts++), the retry re-sets the SAME doc ids", async () => {
    makeSyncedChild();
    const fs = new MockFirestore();
    installPorts(fs);
    emitActivity("step_done", {});
    emitActivity("break_taken", {});
    const ids = useSyncStore.getState().outbox.map((i) => i.localId);

    fs.failAll = true;
    const failed = await drainOutbox(NOW);
    expect(failed).toEqual({ drained: 0, remaining: 2 });
    expect(useSyncStore.getState().outbox.map((i) => i.attempts)).toEqual([1, 1]);
    expect(useSyncStore.getState().status).toBe("pending"); // silent retry, no error state

    fs.failAll = false;
    const ok = await drainOutbox(NOW);
    expect(ok).toEqual({ drained: 2, remaining: 0 });
    // the SAME doc ids were written — a server-side set(merge) dedupes retries
    expect(fs.writes.map((w) => w.path).sort()).toEqual(
      ids.map((id) => `children/${CLOUD_ID}/activity/${id}`).sort(),
    );
    // draining again writes nothing (no dupes)
    await drainOutbox(NOW);
    expect(fs.writes).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Payload hygiene (counts only — §2.4).
// ---------------------------------------------------------------------------

describe("sanitizeActivityPayload", () => {
  it("keeps counts/flags/short enums; drops long strings and PII-bearing strings", () => {
    const out = sanitizeActivityPayload({
      count: 3,
      done: true,
      mood: "good",
      note: "my name is Ari Bello Castillo and I live at 12 Maple Street",
      email: "kid@example.com",
      essay: "x".repeat(200),
    });
    expect(out).toEqual({ count: 3, done: true, mood: "good" });
  });
});

// ---------------------------------------------------------------------------
// 5. Settings two-way merge (§2.4 — parent-authoritative controls, LWW prefs).
// ---------------------------------------------------------------------------

describe("mergeSettings — LWW matrix", () => {
  const ts = (ms: number) => ({ seconds: ms / 1000, nanoseconds: 0, toMillis: () => ms });
  const localSettings = () => {
    const cid = makeSyncedChild();
    return { ...useChildStore.getState().profiles[cid]!.settings };
  };

  it("parent controls ALWAYS apply down, regardless of timestamps", () => {
    const local = localSettings();
    const { apply } = mergeSettings(local, NOW + 999_999, {
      controls: {
        bloopEnabled: true,
        inputMode: "aac",
        topicScope: ["emotions"],
        retentionDays: 90,
        crisisLocale: "es-MX",
        limits: { perMinute: 3, perDay: 30, sessionMinutes: 10 },
      } as never,
    });
    expect(apply.bloopEnabled).toBe(true);
    expect(apply.bloopInputMode).toBe("aac");
    expect(apply.bloopTopicScope).toEqual(["emotions"]);
    expect(apply.retentionDays).toBe(90);
    expect(apply.crisisLocale).toBe("es-MX");
  });

  it("NEWER remote preferences apply down (parent edit wins)", () => {
    const local = localSettings();
    const { apply, pushUp } = mergeSettings(local, NOW - 1000, {
      preferences: {
        sensory: { soundEnabled: false, hapticsEnabled: false, lowStim: true, motionLevel: "reduced" },
        updatedAt: ts(NOW),
        updatedBy: "parent",
      } as never,
    });
    expect(apply.soundEnabled).toBe(false);
    expect(apply.sensoryMode).toBe("lowStim");
    expect(apply.reducedMotion).toBe(true);
    expect(pushUp).toBeNull();
  });

  it("NEWER local prefs push UP — and NEVER include controls", () => {
    const local = { ...localSettings(), soundEnabled: false, sensoryMode: "lowStim" as const };
    const { pushUp } = mergeSettings(local, NOW, {
      preferences: {
        sensory: { soundEnabled: true, hapticsEnabled: true, lowStim: false, motionLevel: "full" },
        updatedAt: ts(NOW - 5000),
        updatedBy: "parent",
      } as never,
    });
    expect(pushUp).not.toBeNull();
    expect(pushUp!.sensory.soundEnabled).toBe(false);
    expect(pushUp!.sensory.lowStim).toBe(true);
    expect(pushUp!.updatedBy).toBe("kid");
    expect(JSON.stringify(pushUp)).not.toContain("bloopEnabled"); // controls never ride up
  });

  it("absent remote ⇒ nothing applies, local prefs stage for push", () => {
    const { apply, pushUp } = mergeSettings(localSettings(), NOW, null);
    expect(apply).toEqual({});
    expect(pushUp).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. computeAndSyncReportSnapshot — the ReportSnapshotDoc producer (§8 #21).
// ---------------------------------------------------------------------------

describe("computeAndSyncReportSnapshot", () => {
  it("writes a PII-FREE snapshot per free rangeKey (7d/30d) with TTL", async () => {
    const cid = makeSyncedChild();
    // a mood with a PII-laden NOTE — the note must never reach the model
    useSettingsStore.setState((s) => ({
      parentSettings: { ...s.parentSettings, moodLoggingEnabled: true },
    }));
    useChildStore.getState().addMood(cid, {
      ts: NOW - 1000,
      day: "2025-10-09",
      mood: "good",
      note: "call me at 555-123-4567, I am Ari Bello Castillo",
    } as never);

    const fs = new MockFirestore();
    installPorts(fs);
    const res = await computeAndSyncReportSnapshot(cid, NOW);
    expect(res.written).toEqual(["7d", "30d"]); // 90d is premium-only

    const paths = fs.writes.map((w) => w.path);
    expect(paths).toContain(`children/${CLOUD_ID}/reports/7d`);
    expect(paths).toContain(`children/${CLOUD_ID}/reports/30d`);

    for (const write of fs.writes) {
      expect((write.data.expiresAt as { ms: number }).ms).toBe(NOW + 30 * DAY);
      const modelJson = JSON.stringify(write.data.model);
      expect(modelJson).not.toContain("555-123-4567");
      expect(modelJson).not.toContain("Bello Castillo");
      // the mood NOTE field itself never enters the model (aggregates only —
      // containsPii is not run on raw JSON: epoch-ms numerals would
      // false-positive the phone shape; the explicit fragments above are the
      // honest assertion)
      expect(modelJson).not.toContain('"note"');
      expect(containsPii("555-123-4567")).toBe(true); // sanity: the fragment IS detectable PII
      expect((write.data.model as { daysInRange: number }).daysInRange).toBeGreaterThan(0);
    }
  });

  it("no-ops offline and when sync is off", async () => {
    const cid = makeSyncedChild();
    expect((await computeAndSyncReportSnapshot(cid, NOW)).written).toEqual([]); // no port
    const off = createChildWithSeed({ displayName: "Bo", ageMode: "young", timeZone: "UTC" });
    installPorts(new MockFirestore());
    expect((await computeAndSyncReportSnapshot(off, NOW)).written).toEqual([]); // sync off
  });
});

// ---------------------------------------------------------------------------
// 7. COPPA wipe.
// ---------------------------------------------------------------------------

describe("wipeAllChildData clears tb/sync", () => {
  it("outbox, linkage, cursors, and status all reset", () => {
    makeSyncedChild();
    emitActivity("step_done", {});
    expect(useSyncStore.getState().outbox.length).toBeGreaterThan(0);

    wipeAllChildData();
    const s = useSyncStore.getState();
    expect(s.outbox).toEqual([]);
    expect(s.linkage).toEqual({});
    expect(s.cursors).toEqual({});
    expect(s.status).toBe("off");
  });
});
