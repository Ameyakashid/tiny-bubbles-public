/**
 * src/state/questStore.ts — PERSISTED rotating-quest state (`tb/quests`, per child)
 * for the novelty-refresh pipeline (M-C4).
 *
 * Mirrors the shipped `runProgressStore`/`choreStore` persist wiring exactly
 * (zustand + `persist` via `createTbPersistOptions` + `registerPersistedStore`). A
 * brand-new slice: it hydrates from `{ quests: {} }` on first read — nothing to
 * migrate (novelty §3.2/§3.3, SCHEMA_VERSION stays 1).
 *
 * SINGLE-PURPOSE: this slice does ONLY pure counter math + auto-claim bookkeeping.
 * It NEVER touches tokens/cosmetics — `onSignal` returns `QuestClaim[]` for the
 * `gameplay` orchestrator to GRANT (novelty §3.2). Anti-shame invariants:
 *   - counters only advance; there is no fail/negative state;
 *   - reaching `target` auto-claims ONCE (idempotent — a re-signal after claim is a
 *     no-op, so a reward is never double-granted, novelty §9.1.3);
 *   - `everCompleted` is APPEND-ONLY, kept forever — an unfinished quest at the next
 *     weekly rotation is dropped with ZERO penalty (novelty §7.1).
 *
 * ZERO RNG: the active set is chosen by the deterministic `activeQuestsFor` upstream
 * (in `gameplay.rotateQuests`); this store never calls `Math.random`.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getQuestById } from "../data/questPool";
import {
  advance,
  freshQuestProgress,
  isComplete,
  type QuestClaim,
  type QuestSignal,
} from "../domain/quests";
import type { ChildQuestState, QuestDef, QuestProgress } from "../domain/types";
import { createTbPersistOptions, registerPersistedStore } from "../storage/persist";

import { now } from "./ids";

export interface QuestStoreState {
  /** per-child rotating-quest state */
  quests: Record<string, ChildQuestState>;

  /**
   * Ensure this child's board is rotated for `weekKey`. If the stored week differs
   * (or there is no state yet), build a fresh `active` map from `defs` (each quest
   * zeroed), PRESERVING `everCompleted`. Idempotent within a week (a matching
   * `weekKey` is a no-op) — this is the deterministic rotation entry point.
   */
  ensureRotation: (cid: string, weekKey: string, defs: QuestDef[]) => void;
  /**
   * Advance every matching active quest by `signal`; auto-claim any that reach
   * target (mark claimed, append to `everCompleted` once) and return the reward
   * descriptions for the orchestrator to grant. Pure counter math only.
   */
  onSignal: (cid: string, signal: QuestSignal) => QuestClaim[];
  /** drop a child's quest state entirely (used by removeChild / wipe). */
  clearChild: (cid: string) => void;
}

export const useQuestStore = create<QuestStoreState>()(
  persist(
    (set, get) => ({
      quests: {},

      ensureRotation: (cid, weekKey, defs) =>
        set((s) => {
          const stored = s.quests[cid];
          if (stored && stored.weekKey === weekKey) return s; // idempotent within the week
          const active: Record<string, QuestProgress> = {};
          for (const d of defs) active[d.id] = freshQuestProgress(d.id);
          const next: ChildQuestState = {
            childId: cid,
            weekKey,
            active,
            // Additive-only: history is kept forever across every rotation.
            everCompleted: stored?.everCompleted ?? [],
          };
          return { quests: { ...s.quests, [cid]: next } };
        }),

      onSignal: (cid, signal) => {
        const state = get().quests[cid];
        if (!state) return [];
        const claims: QuestClaim[] = [];
        const nextActive: Record<string, QuestProgress> = { ...state.active };
        const everCompleted = [...state.everCompleted];
        let changed = false;

        for (const [id, prog] of Object.entries(state.active)) {
          const def = getQuestById(id);
          if (!def) continue;
          const advanced = advance(prog, def, signal);
          if (advanced === prog) continue; // no match / already claimed / no-op
          changed = true;
          let p = advanced;
          if (!p.claimed && isComplete(p, def)) {
            // Auto-grant on target — no missable "Claim" (novelty §2.1). Idempotent:
            // once `claimed`, `advance` returns the same object, so no double grant.
            p = { ...p, claimed: true, claimedAt: now() };
            if (!everCompleted.includes(id)) everCompleted.push(id);
            claims.push({
              questId: id,
              rewardTokens: def.rewardTokens,
              rewardCosmeticId: def.rewardCosmeticId,
            });
          }
          nextActive[id] = p;
        }

        if (changed) {
          set((s) => ({
            quests: { ...s.quests, [cid]: { ...state, active: nextActive, everCompleted } },
          }));
        }
        return claims;
      },

      clearChild: (cid) =>
        set((s) => {
          if (!(cid in s.quests)) return s;
          const next = { ...s.quests };
          delete next[cid];
          return { quests: next };
        }),
    }),
    createTbPersistOptions<QuestStoreState>({
      name: "quests",
      partialize: (s) => ({ quests: s.quests }) as QuestStoreState,
    }),
  ),
);

registerPersistedStore(useQuestStore.persist);
