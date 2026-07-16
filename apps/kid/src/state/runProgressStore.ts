/**
 * src/state/runProgressStore.ts — PERSISTED active-run pointer (resume-after-kill).
 *
 * The completeness fix for M7 (doc 66 M4): when the app is killed mid-routine,
 * reopening must resume at the NEXT incomplete step. This store persists a small
 * `ActiveRunProgress` per child so the runner can reconstruct exactly where the
 * child left off. It is intentionally separate from the in-memory sessionStore
 * (which holds only the live UI handle).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { nextStepId } from "../domain/tasks";
import type { ActiveRunProgress, Daypart, EpochMs, IsoDay } from "../domain/types";
import { createTbPersistOptions, registerPersistedStore } from "../storage/persist";

import { now } from "./ids";

/**
 * Which dayparts a child has finished on a given LOCAL day. Storing the `day`
 * alongside the list gives us a free local-midnight rollover: a mark for a stale
 * `day` is simply ignored (see `isDaypartComplete`), so a new day is always
 * "not done" without any explicit reset/cron (doc 70 §A3).
 */
export interface DaypartCompletion {
  day: IsoDay;
  completed: Daypart[];
}

export interface RunProgressStoreState {
  /** the active run per child (null when no routine is in progress) */
  active: Record<string, ActiveRunProgress | null>;
  /** per-child record of which dayparts are done for the current local day */
  completedDayparts: Record<string, DaypartCompletion | null>;

  startRun: (cid: string, routineId: string | null, stepIds: string[]) => void;
  markStepResolved: (cid: string, taskId: string) => void;
  /**
   * Re-arm a resolved step (quick undo — verify-undo §2.2/§3.6). Handles BOTH the
   * mid-run case and the last-step case in one action:
   *  - if an active run exists, drop `taskId` from its `completedStepIds` (and clear
   *    any stale step-timer start) so the runner re-shows it as the current step;
   *  - if the run AUTO-CLEARED on the last step (active is null), RE-CREATE it with
   *    `completedStepIds = resolvedTaskIds − taskId`, intersected with `stepIds` order,
   *    so the calm "all done" panel yields back to that step.
   * No-op when there is no active run AND no `stepIds` to reconstruct from.
   */
  unmarkStepResolved: (
    cid: string,
    taskId: string,
    opts: { stepIds: string[]; routineId: string | null; resolvedTaskIds: string[] },
  ) => void;
  clearRun: (cid: string) => void;
  /**
   * Young "What next?" curated choice (child-autonomy §2.3/§3.4). Move `taskId` to
   * the FRONT of the UNCOMPLETED portion of the active run's `stepIds` so it becomes
   * the current focal step (`TaskRunner` derives `currentId` from `nextStepId`).
   * PER-RUN ONLY — it never touches the parent's `Routine.stepIds`. Completed ids
   * keep their relative order; `completedStepIds` is untouched. No-op when there is
   * no active run, the id is unknown, already resolved, or already at the front.
   */
  chooseNextStep: (cid: string, taskId: string) => void;
  /**
   * Record (or clear) the wall-clock start of the CURRENT active step's visual
   * transition timer (visual-timers §3.2). Presentational only — never touches
   * tokens/completion. Pass `undefined` to clear a stale start when the active
   * step has no timer. No-op when there is no active run.
   */
  setStepTimerStart: (cid: string, startedAt: EpochMs | undefined) => void;
  /** the next incomplete step id for a persisted run, or null if none/complete */
  nextStep: (cid: string) => string | null;

  /**
   * Record that `dp` is finished for local `day`. If the stored record is for a
   * different day (rollover), it is replaced with a fresh single-entry list;
   * otherwise `dp` is unioned in. Durable "done" signal that stops the runner
   * from re-arming and looping back to morning (doc 70 §A3/§A4).
   */
  markDaypartComplete: (cid: string, day: IsoDay, dp: Daypart) => void;
  /** true only if `dp` is recorded done for THIS local `day` (stale day => false) */
  isDaypartComplete: (cid: string, day: IsoDay, dp: Daypart) => boolean;
  /**
   * Un-mark `dp` for local `day` — the EXPLICIT "do it again" opt-in only (doc 70
   * §B2). Never called on remount, so it can't cause the morning re-loop; it just
   * lets a child intentionally re-run a routine they already finished today.
   */
  clearDaypartComplete: (cid: string, day: IsoDay, dp: Daypart) => void;
}

export const useRunProgressStore = create<RunProgressStoreState>()(
  persist(
    (set, get) => ({
      active: {},
      completedDayparts: {},

      startRun: (cid, routineId, stepIds) =>
        set((s) => {
          const ts = now();
          const run: ActiveRunProgress = {
            childId: cid,
            routineId,
            stepIds,
            completedStepIds: [],
            startedAt: ts,
            updatedAt: ts,
          };
          return { active: { ...s.active, [cid]: run } };
        }),

      markStepResolved: (cid, taskId) =>
        set((s) => {
          const run = s.active[cid];
          if (!run) return s;
          if (run.completedStepIds.includes(taskId)) return s;
          const completedStepIds = [...run.completedStepIds, taskId];
          // Advancing the active step clears the previous step's visual-timer start
          // so a stale start never bleeds into the next step (visual-timers §3.2).
          const updated: ActiveRunProgress = {
            ...run,
            completedStepIds,
            stepTimerStartedAt: undefined,
            updatedAt: now(),
          };
          // Auto-clear when every step is resolved.
          if (nextStepId(updated.stepIds, completedStepIds) === null) {
            return { active: { ...s.active, [cid]: null } };
          }
          return { active: { ...s.active, [cid]: updated } };
        }),

      unmarkStepResolved: (cid, taskId, opts) =>
        set((s) => {
          const run = s.active[cid];
          if (run) {
            // Mid-run undo: re-arm the step in the live run.
            if (!run.completedStepIds.includes(taskId)) return s;
            const completedStepIds = run.completedStepIds.filter((id) => id !== taskId);
            const updated: ActiveRunProgress = {
              ...run,
              completedStepIds,
              stepTimerStartedAt: undefined,
              updatedAt: now(),
            };
            return { active: { ...s.active, [cid]: updated } };
          }
          // Last-step undo: the run auto-cleared → reconstruct it. Nothing to do
          // for a standalone task (no stepIds) — the caller handles status/ledger.
          if (opts.stepIds.length === 0) return s;
          const resolved = new Set(opts.resolvedTaskIds.filter((id) => id !== taskId));
          const completedStepIds = opts.stepIds.filter((id) => resolved.has(id));
          const ts = now();
          const rebuilt: ActiveRunProgress = {
            childId: cid,
            routineId: opts.routineId,
            stepIds: opts.stepIds,
            completedStepIds,
            startedAt: ts,
            updatedAt: ts,
          };
          return { active: { ...s.active, [cid]: rebuilt } };
        }),

      clearRun: (cid) => set((s) => ({ active: { ...s.active, [cid]: null } })),

      chooseNextStep: (cid, taskId) =>
        set((s) => {
          const run = s.active[cid];
          if (!run) return s;
          if (!run.stepIds.includes(taskId)) return s; // unknown id → no-op
          const completed = run.completedStepIds;
          if (completed.includes(taskId)) return s; // already resolved → no-op
          const uncompleted = run.stepIds.filter((id) => !completed.includes(id));
          if (uncompleted[0] === taskId) return s; // already focal → no-op (idempotent)
          // Rebuild: completed ids first (original relative order preserved, never
          // reordered), then the chosen id, then the rest of the uncompleted ids
          // (also in original relative order). Per-run only — the routine is untouched.
          const completedInOrder = run.stepIds.filter((id) => completed.includes(id));
          const restUncompleted = uncompleted.filter((id) => id !== taskId);
          const stepIds = [...completedInOrder, taskId, ...restUncompleted];
          return { active: { ...s.active, [cid]: { ...run, stepIds, updatedAt: now() } } };
        }),

      setStepTimerStart: (cid, startedAt) =>
        set((s) => {
          const run = s.active[cid];
          if (!run) return s;
          if (run.stepTimerStartedAt === startedAt) return s; // no-op (idempotent)
          const updated: ActiveRunProgress = { ...run, stepTimerStartedAt: startedAt, updatedAt: now() };
          return { active: { ...s.active, [cid]: updated } };
        }),

      nextStep: (cid) => {
        const run = get().active[cid];
        if (!run) return null;
        return nextStepId(run.stepIds, run.completedStepIds);
      },

      markDaypartComplete: (cid, day, dp) =>
        set((s) => {
          const stored = s.completedDayparts[cid];
          // Different (or missing) day => local-midnight rollover: start fresh.
          if (!stored || stored.day !== day) {
            return {
              completedDayparts: { ...s.completedDayparts, [cid]: { day, completed: [dp] } },
            };
          }
          if (stored.completed.includes(dp)) return s; // already recorded
          return {
            completedDayparts: {
              ...s.completedDayparts,
              [cid]: { day, completed: [...stored.completed, dp] },
            },
          };
        }),

      isDaypartComplete: (cid, day, dp) => {
        const stored = get().completedDayparts[cid];
        // Stale day (or none) => not done today; a new day is always "not done".
        if (!stored || stored.day !== day) return false;
        return stored.completed.includes(dp);
      },

      clearDaypartComplete: (cid, day, dp) =>
        set((s) => {
          const stored = s.completedDayparts[cid];
          if (!stored || stored.day !== day || !stored.completed.includes(dp)) return s;
          return {
            completedDayparts: {
              ...s.completedDayparts,
              [cid]: { day, completed: stored.completed.filter((d) => d !== dp) },
            },
          };
        }),
    }),
    createTbPersistOptions<RunProgressStoreState>({
      name: "runProgress",
      partialize: (s) =>
        ({ active: s.active, completedDayparts: s.completedDayparts }) as RunProgressStoreState,
    }),
  ),
);

registerPersistedStore(useRunProgressStore.persist);
