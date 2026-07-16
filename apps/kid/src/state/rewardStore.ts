/**
 * src/state/rewardStore.ts — caregiver reward menu + redemption records (persisted).
 *
 * Holds the per-child `Reward[]` (the caregiver-set menu) and the
 * `RedemptionRequest[]` audit trail. The escrow LEDGER math lives in the pure
 * domain (src/domain/tokens.ts) and is coordinated with childStore's ledger by
 * the gameplay orchestrator (gameplay.ts) — this store only persists the menu +
 * request records.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { RedemptionRequest, Reward } from "../domain/types";
import { createTbPersistOptions, registerPersistedStore } from "../storage/persist";

import { now } from "./ids";

export interface RewardStoreState {
  rewards: Record<string, Reward[]>;
  redemptions: Record<string, RedemptionRequest[]>;

  setRewards: (cid: string, rewards: Reward[]) => void;
  addReward: (cid: string, reward: Reward) => void;
  updateReward: (cid: string, rewardId: string, patch: Partial<Reward>) => void;
  archiveReward: (cid: string, rewardId: string) => void;

  addRedemption: (cid: string, request: RedemptionRequest) => void;
  updateRedemption: (cid: string, request: RedemptionRequest) => void;
}

export const useRewardStore = create<RewardStoreState>()(
  persist(
    (set) => ({
      rewards: {},
      redemptions: {},

      setRewards: (cid, rewards) => set((s) => ({ rewards: { ...s.rewards, [cid]: rewards } })),

      addReward: (cid, reward) =>
        set((s) => ({ rewards: { ...s.rewards, [cid]: [...(s.rewards[cid] ?? []), reward] } })),

      updateReward: (cid, rewardId, patch) =>
        set((s) => ({
          rewards: {
            ...s.rewards,
            [cid]: (s.rewards[cid] ?? []).map((r) =>
              r.id === rewardId ? { ...r, ...patch, updatedAt: now() } : r,
            ),
          },
        })),

      archiveReward: (cid, rewardId) =>
        set((s) => ({
          rewards: {
            ...s.rewards,
            [cid]: (s.rewards[cid] ?? []).map((r) =>
              r.id === rewardId ? { ...r, archived: true, active: false, updatedAt: now() } : r,
            ),
          },
        })),

      addRedemption: (cid, request) =>
        set((s) => ({
          redemptions: { ...s.redemptions, [cid]: [request, ...(s.redemptions[cid] ?? [])] },
        })),

      updateRedemption: (cid, request) =>
        set((s) => ({
          redemptions: {
            ...s.redemptions,
            [cid]: (s.redemptions[cid] ?? []).map((r) => (r.id === request.id ? request : r)),
          },
        })),
    }),
    createTbPersistOptions<RewardStoreState>({
      name: "rewards",
      partialize: (s) => ({ rewards: s.rewards, redemptions: s.redemptions }) as RewardStoreState,
    }),
  ),
);

registerPersistedStore(useRewardStore.persist);
