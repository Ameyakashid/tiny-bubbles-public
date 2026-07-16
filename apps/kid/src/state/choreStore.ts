/**
 * src/state/choreStore.ts — rotating "shared chores" across children (persisted).
 *
 * A PARENT-GLOBAL slice (`tb/chores`) — a chore spans children (rotation roster),
 * so unlike the per-child task/reward/companion slices it is a flat list keyed by
 * chore id (mirrors `childIndex`). The rotation MATH is pure + offline
 * (src/domain/chores.ts); this store only persists the parent-authored metadata +
 * the two rotation counters. Materialisation into per-child Tasks is orchestrated
 * by gameplay.reconcileChild (multi-child §3.3).
 *
 * Anti-shame / referential integrity: `pruneChild` drops a removed child from every
 * roster and DEACTIVATES (never deletes) a chore whose roster falls below 2 — so a
 * parent can re-add a sibling later. Nothing here can represent failure/loss.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SharedChore } from "../domain/types";
import { createTbPersistOptions, registerPersistedStore } from "../storage/persist";

import { now } from "./ids";

export interface ChoreStoreState {
  chores: SharedChore[];

  /** replace the whole list (used by wipe/reset + restore). */
  setChores: (chores: SharedChore[]) => void;
  addChore: (chore: SharedChore) => void;
  updateChore: (choreId: string, patch: Partial<SharedChore>) => void;
  /** hard-delete (parent-owned metadata; the child's already-earned tokens are untouched). */
  removeChore: (choreId: string) => void;
  /** advance the perCompletion pointer (called from completeStep when a chore task is done). */
  advanceChore: (choreId: string) => void;
  /** manual "pass to next": bump `manualHolderIndex` to the next roster slot (any cadence). */
  passChoreToNext: (choreId: string) => void;
  /** drop a removed child from every roster; deactivate chores left with < 2 members. */
  pruneChild: (childId: string) => void;
}

export const useChoreStore = create<ChoreStoreState>()(
  persist(
    (set) => ({
      chores: [],

      setChores: (chores) => set({ chores }),

      addChore: (chore) => set((s) => ({ chores: [...s.chores, chore] })),

      updateChore: (choreId, patch) =>
        set((s) => ({
          chores: s.chores.map((ch) =>
            ch.id === choreId ? { ...ch, ...patch, updatedAt: now() } : ch,
          ),
        })),

      removeChore: (choreId) => set((s) => ({ chores: s.chores.filter((ch) => ch.id !== choreId) })),

      advanceChore: (choreId) =>
        set((s) => ({
          chores: s.chores.map((ch) =>
            ch.id === choreId
              ? { ...ch, completionAdvanceCount: ch.completionAdvanceCount + 1, updatedAt: now() }
              : ch,
          ),
        })),

      passChoreToNext: (choreId) =>
        set((s) => ({
          chores: s.chores.map((ch) =>
            ch.id === choreId
              ? { ...ch, manualHolderIndex: (ch.manualHolderIndex ?? 0) + 1, updatedAt: now() }
              : ch,
          ),
        })),

      pruneChild: (childId) =>
        set((s) => ({
          chores: s.chores.map((ch) => {
            if (!ch.childIds.includes(childId)) return ch;
            const childIds = ch.childIds.filter((id) => id !== childId);
            // A rotation of one is not a rotation → deactivate (never auto-delete,
            // so the parent can re-add a sibling and reactivate later).
            const active = childIds.length >= 2 ? ch.active : false;
            return { ...ch, childIds, active, updatedAt: now() };
          }),
        })),
    }),
    createTbPersistOptions<ChoreStoreState>({
      name: "chores",
      partialize: (s) => ({ chores: s.chores }) as ChoreStoreState,
    }),
  ),
);

registerPersistedStore(useChoreStore.persist);
