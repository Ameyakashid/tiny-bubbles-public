/**
 * src/sync/syncQueue.ts — persisted outbox operations (w1 M1.2 — the queue
 * half of the sync adapter, over the `tb/sync` slice which persists through
 * the v1 storage port).
 *
 * The ONE module that mutates the outbox array. `cloudSync.emitActivity`
 * appends through here; `cloudSync.drainOutbox` consumes through here. The
 * queue survives offline (persisted slice), is capped (OUTBOX_CAP — oldest
 * dropped silently; the mirror is derived, never the source of truth), and
 * carries idempotency in the item itself (`localId === Firestore doc id`).
 */
import type { EpochMs, OutboxItem } from "@tiny-bubbles/shared";

import { useSyncStore } from "../state/syncStore";

/** Append one queued upload (drops oldest beyond the cap; flips status to pending). */
export function enqueueOutboxItem(item: OutboxItem): void {
  useSyncStore.getState().enqueue(item);
}

/** Snapshot of the queue in enqueue order. */
export function listOutbox(): OutboxItem[] {
  return [...useSyncStore.getState().outbox];
}

export function outboxSize(): number {
  return useSyncStore.getState().outbox.length;
}

/** Remove successfully drained items (idempotent). */
export function removeDrained(localIds: readonly string[]): void {
  if (localIds.length > 0) useSyncStore.getState().removeFromOutbox(localIds);
}

/** Silent retry bookkeeping for a failed batch — never an error surface. */
export function bumpAttempts(localIds: readonly string[]): void {
  if (localIds.length > 0) useSyncStore.getState().bumpAttempts(localIds);
}

/** Record a successful push instant. */
export function markPushed(at: EpochMs): void {
  useSyncStore.getState().markPush(at);
}
