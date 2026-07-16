/**
 * src/state/buddyStore.ts — companion ("Bubble Buddy") state (persisted).
 *
 * Wires the never-punishing companion domain (src/domain/companionMood.ts) to
 * persisted state: positive-only mood transitions + decay, MONOTONIC bond/growth
 * nurture from lifetimeEarned, and cosmetic ownership (kept forever — premium
 * gating never strips what the child owns, doc 66 §1b.11). No code path here can
 * set a negative mood (the canonical union has none; the domain guards anyway).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  applyCompanionEvent,
  decayMood,
  nurtureCompanion,
  type CompanionEvent,
} from "../domain/companionMood";
import type { CompanionCustomization, CompanionState } from "../domain/types";
import { createTbPersistOptions, registerPersistedStore } from "../storage/persist";
import { emitActivity } from "../sync/cloudSync";

import { now } from "./ids";

export interface BuddyStoreState {
  companions: Record<string, CompanionState>;

  setCompanion: (cid: string, companion: CompanionState) => void;
  renameCompanion: (cid: string, name: string) => void;
  setCustomization: (cid: string, patch: Partial<CompanionCustomization>) => void;
  unlockCosmetic: (cid: string, cosmeticId: string) => void;
  equip: (cid: string, slot: keyof CompanionState["equipped"], itemId: string | undefined) => void;

  /** apply a positive event -> transient mood (never negative) */
  applyEvent: (cid: string, event: CompanionEvent) => void;
  /** settle the mood for the current time (transient -> content -> sleepy) */
  decay: (cid: string) => void;
  /** monotonic bond/growth from lifetimeEarned; returns true if growth advanced */
  nurture: (cid: string, lifetimeEarned: number) => boolean;
}

export const useBuddyStore = create<BuddyStoreState>()(
  persist(
    (set, get) => ({
      companions: {},

      setCompanion: (cid, companion) =>
        set((s) => ({ companions: { ...s.companions, [cid]: companion } })),

      renameCompanion: (cid, name) =>
        set((s) => {
          const c = s.companions[cid];
          if (!c) return s;
          return { companions: { ...s.companions, [cid]: { ...c, name } } };
        }),

      setCustomization: (cid, patch) =>
        set((s) => {
          const c = s.companions[cid];
          if (!c) return s;
          return {
            companions: {
              ...s.companions,
              [cid]: { ...c, customization: { ...c.customization, ...patch } },
            },
          };
        }),

      unlockCosmetic: (cid, cosmeticId) =>
        set((s) => {
          const c = s.companions[cid];
          if (!c || c.unlockedItems.includes(cosmeticId)) return s;
          return {
            companions: {
              ...s.companions,
              [cid]: { ...c, unlockedItems: [...c.unlockedItems, cosmeticId] },
            },
          };
        }),

      equip: (cid, slot, itemId) =>
        set((s) => {
          const c = s.companions[cid];
          if (!c) return s;
          return {
            companions: {
              ...s.companions,
              [cid]: { ...c, equipped: { ...c.equipped, [slot]: itemId } },
            },
          };
        }),

      applyEvent: (cid, event) => {
        set((s) => {
          const c = s.companions[cid];
          if (!c) return s;
          return { companions: { ...s.companions, [cid]: applyCompanionEvent(c, event, now()) } };
        });
        // `rest` = the child settled into a calm/rest moment (calm corner,
        // break tile) → mirror as `break_taken` through the SHARED seam
        // (w1 M1.2 §2.4c). Fail-closed no-op unless synced + paired.
        if (event === "rest") emitActivity("break_taken", {}, { cid });
      },

      decay: (cid) =>
        set((s) => {
          const c = s.companions[cid];
          if (!c) return s;
          const next = decayMood(c, now());
          return next === c ? s : { companions: { ...s.companions, [cid]: next } };
        }),

      nurture: (cid, lifetimeEarned) => {
        const c = get().companions[cid];
        if (!c) return false;
        const next = nurtureCompanion(c, lifetimeEarned);
        if (next === c) return false;
        set((s) => ({ companions: { ...s.companions, [cid]: next } }));
        return next.growthStage > c.growthStage;
      },
    }),
    createTbPersistOptions<BuddyStoreState>({
      name: "buddy",
      partialize: (s) => ({ companions: s.companions }) as BuddyStoreState,
    }),
  ),
);

registerPersistedStore(useBuddyStore.persist);
