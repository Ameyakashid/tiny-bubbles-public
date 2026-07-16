/**
 * src/state/syncStore.ts — the `tb/sync` persisted slice (w1 M1.2 —
 * 02-architecture §2.4, w1 §3.3b).
 *
 * Holds the pairing linkage (local cid → cloud childId), the offline OUTBOX
 * the `emitActivity` seam appends to, per-collection pull cursors, and the
 * shame-free sync status (`off|pending|synced|paused` — NEVER an error/red
 * state; a stuck outbox stays `pending` and retries silently, w1 §6.3).
 *
 * Discipline (v1 shipped pattern): `create(persist(...))` +
 * `createTbPersistOptions` + `registerPersistedStore` — auto-covered by the
 * whole-`tb/` backup, cleared by `wipeAllChildData` (gameplay.ts), counted in
 * DataReview, and added to the migration-forward fixture. A brand-new
 * independent slice = additive ⇒ SCHEMA_VERSION stays 1, MIGRATIONS [].
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  EpochMs,
  OutboxItem,
  SyncState,
  SyncStatus,
} from "@tiny-bubbles/shared";

import { createTbPersistOptions, registerPersistedStore } from "../storage/persist";

/**
 * Hard cap on queued events so an unpaired/offline device can never grow disk
 * unboundedly. Overflow drops the OLDEST items silently (activity mirroring is
 * a derived convenience, never the source of truth — losing far-back mirror
 * events is safe; the on-device data is untouched).
 */
export const OUTBOX_CAP = 1000;

export interface SyncStoreState extends SyncState {
  /** append one queued upload (drops oldest beyond OUTBOX_CAP) */
  enqueue: (item: OutboxItem) => void;
  /** remove drained items by localId (idempotent) */
  removeFromOutbox: (localIds: readonly string[]) => void;
  /** bump `attempts` on a failed drain batch (silent retry bookkeeping) */
  bumpAttempts: (localIds: readonly string[]) => void;
  /** record the pairing linkage for a local child (§8 #21c) */
  setLinkage: (localCid: string, link: { childId: string; parentUid: string }) => void;
  setStatus: (status: SyncStatus) => void;
  setCursor: (collection: string, cursor: string) => void;
  markPush: (at: EpochMs) => void;
  markPull: (at: EpochMs) => void;
  /** full reset — wired into `wipeAllChildData` (COPPA delete-my-data) */
  clearAll: () => void;
}

const EMPTY: SyncState = {
  linkage: {},
  outbox: [],
  cursors: {},
  status: "off",
};

export const useSyncStore = create<SyncStoreState>()(
  persist(
    (set) => ({
      ...EMPTY,

      enqueue: (item) =>
        set((s) => {
          const outbox = [...s.outbox, item];
          return {
            outbox: outbox.length > OUTBOX_CAP ? outbox.slice(outbox.length - OUTBOX_CAP) : outbox,
            status: s.status === "off" ? "pending" : s.status,
          };
        }),

      removeFromOutbox: (localIds) =>
        set((s) => ({
          outbox: s.outbox.filter((i) => !localIds.includes(i.localId)),
        })),

      bumpAttempts: (localIds) =>
        set((s) => ({
          outbox: s.outbox.map((i) =>
            localIds.includes(i.localId) ? { ...i, attempts: i.attempts + 1 } : i,
          ),
        })),

      setLinkage: (localCid, link) =>
        set((s) => ({ linkage: { ...s.linkage, [localCid]: link } })),

      setStatus: (status) => set({ status }),

      setCursor: (collection, cursor) =>
        set((s) => ({ cursors: { ...s.cursors, [collection]: cursor } })),

      markPush: (at) => set({ lastPushAt: at }),
      markPull: (at) => set({ lastPullAt: at }),

      clearAll: () => set({ ...EMPTY }),
    }),
    createTbPersistOptions<SyncStoreState, SyncState>({
      name: "sync",
      partialize: (s) => ({
        linkage: s.linkage,
        outbox: s.outbox,
        cursors: s.cursors,
        ...(s.lastPushAt !== undefined ? { lastPushAt: s.lastPushAt } : {}),
        ...(s.lastPullAt !== undefined ? { lastPullAt: s.lastPullAt } : {}),
        status: s.status,
      }),
    }),
  ),
);

registerPersistedStore(useSyncStore.persist);
