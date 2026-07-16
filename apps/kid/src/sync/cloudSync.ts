/**
 * src/sync/cloudSync.ts — the SHARED activity-emit seam + one-way-up drain +
 * `computeAndSyncReportSnapshot` writer (w1 M1.2 — 02-architecture §2.4,
 * §8 #6/#21).
 *
 * `emitActivity(kind, payload)` is the ONE seam EVERY activity producer calls
 * (§2.4 — never a direct Firestore write). Wired producers today:
 *   step_done / routine_complete / token_earned   → gameplay.completeStep
 *   mood_log / emotion_logged                     → childStore.addMood
 *   break_taken                                   → buddyStore.applyEvent("rest")
 *   breathing_done                                → calm screen onComplete
 *   movement_break                                → focusSessionStore.toBreak
 *                                                   (movementBreaks on)
 *   aac_utterance_summary                         → emitAacUtteranceSummary
 *                                                   (w4 M4.1 aggregate seam)
 *   firstthen_done / schedule_step_done           → w4/w5 producers (M4.x) call
 *                                                   emitActivity at completion
 *                                                   (placeholders — same seam)
 *
 * FAIL-CLOSED + ADDITIVE: with `cloudSyncEnabled` absent/false (the default)
 * or no pairing linkage, emits are a NO-OP — zero queue growth, zero egress;
 * delete Firebase and the child core is unchanged. When enabled, events queue
 * in the persisted `tb/sync` outbox OFFLINE and drain (idempotent: localId ===
 * docId, `set` with merge) when configured + online. Payloads are AGGREGATE/
 * COUNTS ONLY by construction (closed `ActivityKind` + a sanitizer that drops
 * long/PII-bearing strings — an utterance or mood note CANNOT ride along).
 *
 * Anti-shame: no error/red/nag state exists here — a failed drain silently
 * bumps `attempts` and stays `pending` (w1 §6.3).
 */
import {
  ALL_ACTIVITY_KINDS,
  type ActivityKind,
  type ActivityPayload,
  type EpochMs,
  type OutboxItem,
  type ReportRangeKey,
  activityDoc,
  buildReport,
  computeTtlAt,
  containsPii,
  makeRange,
  reportDoc,
} from "@tiny-bubbles/shared";

import { isFeatureUnlocked } from "../services/entitlements";
import { useChildStore } from "../state/childStore";
import { newId, now } from "../state/ids";
import { useRewardStore } from "../state/rewardStore";
import { useSettingsStore } from "../state/settingsStore";
import { useSyncStore } from "../state/syncStore";
import { useTaskStore } from "../state/taskStore";
import { ageModeLabel } from "../theme/resolveContent";
import { resolveCapabilities } from "../theme/resolveCapabilities";

import { getSyncPorts } from "./firebase";
import { bumpAttempts, enqueueOutboxItem, listOutbox, markPushed, removeDrained } from "./syncQueue";

export { ALL_ACTIVITY_KINDS };
export type { ActivityKind, ActivityPayload };

// ---------------------------------------------------------------------------
// Payload hygiene — aggregates/counts only (§2.4; defense-in-depth on top of
// the closed union: no free text, no PII can enter the mirror).
// ---------------------------------------------------------------------------

const MAX_PAYLOAD_KEYS = 16;
const MAX_STRING_VALUE = 32;

/**
 * Keep finite numbers, booleans, and SHORT enum-like strings; drop anything
 * that could smuggle free text (long strings, PII-bearing strings, nested
 * values). Over-dropping is SAFE-side — the mirror is a derived convenience.
 */
export function sanitizeActivityPayload(payload: ActivityPayload): ActivityPayload {
  const out: ActivityPayload = {};
  let kept = 0;
  for (const [key, value] of Object.entries(payload)) {
    if (kept >= MAX_PAYLOAD_KEYS) break;
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "boolean") out[key] = value;
    else if (
      typeof value === "string" &&
      value.length > 0 &&
      value.length <= MAX_STRING_VALUE &&
      !containsPii(value)
    ) {
      out[key] = value;
    } else continue;
    kept += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// emitActivity — THE shared seam (§2.4).
// ---------------------------------------------------------------------------

export interface EmitOptions {
  /** the LOCAL child id; defaults to the active child */
  cid?: string;
  /** event time (epoch ms); defaults to now() */
  atMs?: EpochMs;
}

/** True when this local child is opted into cloud sync AND paired. */
export function isCloudSyncReady(cid: string): boolean {
  const profile = useChildStore.getState().profiles[cid];
  if (!profile?.settings.cloudSyncEnabled) return false;
  return Boolean(useSyncStore.getState().linkage[cid]);
}

/**
 * Queue one PII-minimal activity event for the one-way-up mirror. Returns
 * true when queued; false = the fail-closed no-op (sync off / unpaired / no
 * child). NEVER throws; NEVER blocks the producer.
 */
export function emitActivity(
  kind: ActivityKind,
  payload: ActivityPayload = {},
  opts: EmitOptions = {},
): boolean {
  try {
    const cid = opts.cid ?? useSettingsStore.getState().meta.activeChildId;
    if (!cid || !isCloudSyncReady(cid)) return false;
    const link = useSyncStore.getState().linkage[cid];
    if (!link) return false;
    const localId = newId();
    const item: OutboxItem = {
      localId,
      childId: link.childId,
      collection: "activity",
      doc: {
        id: localId,
        kind,
        atMs: opts.atMs ?? now(),
        payload: sanitizeActivityPayload(payload),
      },
      attempts: 0,
      enqueuedAt: now(),
    };
    enqueueOutboxItem(item);
    return true;
  } catch {
    return false; // the sync layer never breaks a producer
  }
}

/**
 * The w4 AAC usage AGGREGATE seam (§2.4d — placeholder until M4.1): AAC never
 * mirrors utterance content, only counts. M4.1's board layer calls this with
 * its per-session tallies.
 */
export function emitAacUtteranceSummary(
  counts: { utterances: number; distinctSymbols: number; sessionMinutes?: number },
  opts: EmitOptions = {},
): boolean {
  return emitActivity(
    "aac_utterance_summary",
    {
      utterances: counts.utterances,
      distinctSymbols: counts.distinctSymbols,
      ...(counts.sessionMinutes !== undefined ? { sessionMinutes: counts.sessionMinutes } : {}),
    },
    opts,
  );
}

// ---------------------------------------------------------------------------
// Drain — one-way-UP, idempotent (localId === docId; set with merge).
// ---------------------------------------------------------------------------

/** Resolve the retention window for a CLOUD childId via the reverse linkage. */
function retentionDaysForCloudChild(cloudChildId: string): number | undefined {
  const { linkage } = useSyncStore.getState();
  const localCid = Object.keys(linkage).find((k) => linkage[k]?.childId === cloudChildId);
  if (!localCid) return undefined;
  return useChildStore.getState().profiles[localCid]?.settings.retentionDays;
}

export interface DrainResult {
  drained: number;
  remaining: number;
}

/**
 * Push every queued outbox item up to `children/{childId}/activity/{id}`.
 * Offline/unconfigured ⇒ nothing drains, everything stays queued (no error
 * state). Idempotent: re-draining a retried item re-`set`s the same doc id.
 * TTL is stamped at WRITE time: `expiresAt = createdAt + retentionDays`
 * (default 30 — §8 #10b).
 */
export async function drainOutbox(nowMs: EpochMs = now()): Promise<DrainResult> {
  const items = listOutbox();
  if (items.length === 0) {
    const store = useSyncStore.getState();
    if (store.status === "pending") store.setStatus("synced");
    return { drained: 0, remaining: 0 };
  }
  const ports = await getSyncPorts();
  if (!ports) return { drained: 0, remaining: items.length };

  const done: string[] = [];
  const failed: string[] = [];
  for (const item of items) {
    try {
      const ts = ports.firestore.tsFromMillis.bind(ports.firestore);
      await ports.firestore.setDoc(
        activityDoc(item.childId, item.localId),
        {
          id: item.doc.id,
          kind: item.doc.kind,
          at: ts(item.doc.atMs),
          payload: item.doc.payload,
          createdAt: ts(nowMs),
          expiresAt: ts(computeTtlAt(nowMs, retentionDaysForCloudChild(item.childId))),
        },
        { merge: true },
      );
      done.push(item.localId);
    } catch {
      failed.push(item.localId);
    }
  }
  if (done.length > 0) {
    removeDrained(done);
    markPushed(nowMs);
  }
  bumpAttempts(failed);
  useSyncStore.getState().setStatus(failed.length > 0 ? "pending" : "synced");
  return { drained: done.length, remaining: failed.length };
}

// ---------------------------------------------------------------------------
// computeAndSyncReportSnapshot — the ReportSnapshotDoc producer (§8 #21).
// ---------------------------------------------------------------------------

export interface SnapshotResult {
  written: ReportRangeKey[];
}

/**
 * Compute the anti-shame `ReportModel` ON-DEVICE via the shared `buildReport`
 * (PII-free aggregates — no raw ledger/mood note leaves the device) and `set`
 * `children/{childId}/reports/{rangeKey}` for 7d/30d (90d when the premium
 * `advancedInsights` gate is unlocked). Runs at each successful drain when
 * enabled + paired (§2.4). No-throw; offline ⇒ `{written: []}`.
 */
export async function computeAndSyncReportSnapshot(
  cid?: string,
  nowMs: EpochMs = now(),
): Promise<SnapshotResult> {
  try {
    const localCid = cid ?? useSettingsStore.getState().meta.activeChildId;
    if (!localCid || !isCloudSyncReady(localCid)) return { written: [] };
    const link = useSyncStore.getState().linkage[localCid];
    const child = useChildStore.getState();
    const profile = child.profiles[localCid];
    if (!link || !profile) return { written: [] };
    const ports = await getSyncPorts();
    if (!ports) return { written: [] };

    const caps = resolveCapabilities({ ageMode: profile.ageMode });
    const parentSettings = useSettingsStore.getState().parentSettings;
    const moodOn =
      parentSettings.moodLoggingEnabled && (profile.settings.moodCheckinEnabled ?? true);
    const rangeKeys: ReportRangeKey[] = isFeatureUnlocked(
      "advancedInsights",
      useSettingsStore.getState().entitlement,
      nowMs,
    )
      ? ["7d", "30d", "90d"]
      : ["7d", "30d"];

    const written: ReportRangeKey[] = [];
    for (const rangeKey of rangeKeys) {
      const model = {
        ...buildReport({
          profile,
          ledger: child.ledgers[localCid] ?? {
            childId: localCid,
            balance: 0,
            heldTokens: 0,
            lifetimeEarned: 0,
            lifetimeSpent: 0,
            lastEarnedAt: 0,
            entries: [],
          },
          progress: child.progress[localCid] ?? {
            childId: localCid,
            cumulativeCount: 0,
            currentStreakDays: 0,
            longestStreakDays: 0,
            lastActiveDate: null,
            freezeTokens: 0,
            freezeUsedDates: [],
            weekCompletions: 0,
            paused: false,
          },
          runs: useTaskStore.getState().runs[localCid] ?? [],
          redemptions: useRewardStore.getState().redemptions[localCid] ?? [],
          moods: child.moods[localCid] ?? [],
          moodLoggingEnabled: moodOn,
          showNumbersAndCharts: caps.showNumbersAndCharts,
          range: makeRange(rangeKey, nowMs, profile.timeZone),
          now: nowMs,
        }),
        ageModeLabel: ageModeLabel(profile.ageMode),
      };
      try {
        const ts = ports.firestore.tsFromMillis.bind(ports.firestore);
        await ports.firestore.setDoc(
          reportDoc(link.childId, rangeKey),
          {
            rangeKey,
            model,
            generatedAt: ts(nowMs),
            expiresAt: ts(computeTtlAt(nowMs, profile.settings.retentionDays)),
          },
          { merge: true },
        );
        written.push(rangeKey);
      } catch {
        // silent — retried at the next drain; never an error state
      }
    }
    return { written };
  } catch {
    return { written: [] };
  }
}

// ---------------------------------------------------------------------------
// syncNow — the app-lifecycle entry (cold start / foreground / parent screen).
// ---------------------------------------------------------------------------

/**
 * One full sync pass: drain the outbox, then (after a successful drain)
 * refresh the report snapshots. Settings pulls are `settingsSync.ts`'s
 * `pullSettings` and apply only at calm boundaries (§2.4 predictability —
 * never mid-session). No-throw.
 */
export async function syncNow(nowMs: EpochMs = now()): Promise<DrainResult> {
  try {
    const result = await drainOutbox(nowMs);
    if (result.drained > 0 && result.remaining === 0) {
      await computeAndSyncReportSnapshot(undefined, nowMs);
    }
    return result;
  } catch {
    return { drained: 0, remaining: useSyncStore.getState().outbox.length };
  }
}
