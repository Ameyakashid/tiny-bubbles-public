/**
 * packages/shared/src/sync/types.ts — the offline→cloud sync contract types
 * (w1 M1.2 — 02-architecture §2.4; w1 §3.3b).
 *
 * The kid app's `tb/sync` slice persists these shapes. The outbox carries an
 * EPOCH-MS wire form of the activity event (`ActivityEventWire`) — the device
 * has no Firestore SDK Timestamp until the drain step, which stamps `at`/
 * `createdAt`/`expiresAt` as real `Ts` values (`Timestamp.fromMillis` +
 * `computeTtlAt`) when writing `children/{childId}/activity/{id}`.
 *
 * Pure types; RN-free; no SDK import.
 */
import type { EpochMs } from "../domain/types";
import type { ActivityKind, ActivityPayload } from "../firestore/types";

export type { ActivityKind, ActivityPayload };
export type { ActivityEventDoc } from "../firestore/types";

/**
 * The on-device, pre-Timestamp form of one activity event. PII-minimal BY
 * CONSTRUCTION: `kind` is the closed 11-member union and `payload` is a
 * closed value type (counts/flags only — it cannot carry an utterance or a
 * mood note).
 */
export interface ActivityEventWire {
  /** client ULID — becomes the Firestore doc id (idempotent upsert) */
  id: string;
  kind: ActivityKind;
  /** event time (epoch ms; converted to Ts at drain) */
  atMs: EpochMs;
  payload: ActivityPayload;
}

/** One queued upload. `localId === Firestore doc id` = the idempotency key. */
export interface OutboxItem {
  localId: string;
  /** the CLOUD childId (from the pairing linkage) */
  childId: string;
  /** one-way-up only ever appends activity */
  collection: "activity";
  doc: ActivityEventWire;
  attempts: number;
  enqueuedAt: EpochMs;
}

/**
 * Sync status is deliberately shame-free: `off | pending | synced | paused`
 * — NEVER an error/red/nag state (w1 §6.3). A stuck outbox stays `pending`
 * and retries silently.
 */
export type SyncStatus = "off" | "pending" | "synced" | "paused";

/** The persisted `tb/sync` slice shape (w1 §3.3b). */
export interface SyncState {
  /** local child id → cloud identity (written by pairKidDevice, §8 #21c) */
  linkage: Record<string, { childId: string; parentUid: string }>;
  /** survives offline; drains when online + configured + consented */
  outbox: OutboxItem[];
  /** last pulled doc id/updatedAt per collection (settings/boards/schedules/…) */
  cursors: Record<string, string>;
  lastPushAt?: EpochMs;
  lastPullAt?: EpochMs;
  status: SyncStatus;
}
