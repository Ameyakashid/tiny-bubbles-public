/**
 * src/state/planStore.ts — PERSISTED if-then plan state (`tb/plans`, per child)
 * for the if-then-plans feature (M-C5).
 *
 * Mirrors the shipped `questStore`/`runProgressStore` persist wiring exactly
 * (zustand + `persist` via `createTbPersistOptions` + `registerPersistedStore`). A
 * brand-new slice: it hydrates from `{ plans: {} }` on first read — nothing to
 * migrate (SCHEMA_VERSION stays 1).
 *
 * ANTI-SHAME by construction: a `Plan` has NO adherence/miss/streak field, so this
 * store only ever does plain CRUD + the propose→approve queue. `dismissPlan`
 * ARCHIVES (it is never a "reject"). ZERO RNG in any code path here.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Plan } from "../domain/types";
import { createTbPersistOptions, registerPersistedStore } from "../storage/persist";

import { now } from "./ids";

export interface PlanStoreState {
  /** per-child plans (childId -> plans) */
  plans: Record<string, Plan[]>;

  /** append a co-authored (live) plan for a child */
  addPlan: (cid: string, plan: Plan) => void;
  /** patch a plan (bumps updatedAt) */
  updatePlan: (cid: string, planId: string, patch: Partial<Plan>) => void;
  /** flip a plan's active toggle (firing only ever reads active + non-archived) */
  setPlanActive: (cid: string, planId: string, active: boolean) => void;
  /** soft-remove a plan (also flips active off) — never a hard delete in the UI */
  archivePlan: (cid: string, planId: string) => void;

  // kid proposal queue (only surfaced when caps.canAddTasks) — mirrors task proposals
  /** append a child-PROPOSED plan, held inactive until a parent approves it */
  proposePlan: (cid: string, plan: Plan) => void;
  /** approve a proposal → clears `proposed`, makes it live */
  approvePlan: (cid: string, planId: string) => void;
  /** dismiss a proposal → ARCHIVES it (never a shaming "reject") */
  dismissPlan: (cid: string, planId: string) => void;

  /** drop a child's plans entirely (used by removeChild / wipe) */
  clearChild: (cid: string) => void;
}

/** Patch one plan in a child's list, bumping `updatedAt`. */
function patchIn(list: Plan[], planId: string, patch: Partial<Plan>): Plan[] {
  return list.map((p) => (p.id === planId ? { ...p, ...patch, updatedAt: now() } : p));
}

export const usePlanStore = create<PlanStoreState>()(
  persist(
    (set) => ({
      plans: {},

      addPlan: (cid, plan) =>
        set((s) => ({ plans: { ...s.plans, [cid]: [...(s.plans[cid] ?? []), plan] } })),

      updatePlan: (cid, planId, patch) =>
        set((s) => ({ plans: { ...s.plans, [cid]: patchIn(s.plans[cid] ?? [], planId, patch) } })),

      setPlanActive: (cid, planId, active) =>
        set((s) => ({ plans: { ...s.plans, [cid]: patchIn(s.plans[cid] ?? [], planId, { active }) } })),

      archivePlan: (cid, planId) =>
        set((s) => ({
          plans: {
            ...s.plans,
            [cid]: patchIn(s.plans[cid] ?? [], planId, { archived: true, active: false }),
          },
        })),

      proposePlan: (cid, plan) =>
        set((s) => ({
          plans: {
            ...s.plans,
            [cid]: [...(s.plans[cid] ?? []), { ...plan, proposed: true, active: false }],
          },
        })),

      approvePlan: (cid, planId) =>
        set((s) => ({
          plans: {
            ...s.plans,
            [cid]: patchIn(s.plans[cid] ?? [], planId, { proposed: false, active: true }),
          },
        })),

      dismissPlan: (cid, planId) =>
        set((s) => ({
          plans: {
            ...s.plans,
            [cid]: patchIn(s.plans[cid] ?? [], planId, { archived: true, active: false, proposed: false }),
          },
        })),

      clearChild: (cid) =>
        set((s) => {
          if (!(cid in s.plans)) return s;
          const next = { ...s.plans };
          delete next[cid];
          return { plans: next };
        }),
    }),
    createTbPersistOptions<PlanStoreState>({
      name: "plans",
      partialize: (s) => ({ plans: s.plans }) as PlanStoreState,
    }),
  ),
);

registerPersistedStore(usePlanStore.persist);
