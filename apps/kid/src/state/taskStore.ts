/**
 * src/state/taskStore.ts — tasks, routines, and runtime runs (persisted).
 *
 * Tasks and routine steps share one `Task` shape (doc 62 §5). The forgiving
 * rollover reconciler (`rolloverChild`) runs on app-open / local midnight: an
 * incomplete `today` task rolls to `someday`, `tomorrow` -> `today`, completed
 * recurring tasks re-arm — NEVER a "failed" state (doc 62 §5, doc 66 §1b.2).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { RUNS_CAP } from "../domain/constants";
import { isoDay } from "../domain/dates";
import { isNewDay, rolloverTasks } from "../domain/tasks";
import type { Routine, RoutineRun, Task, TaskStatus } from "../domain/types";
import { createTbPersistOptions, registerPersistedStore } from "../storage/persist";

import { now } from "./ids";

export interface TaskStoreState {
  tasks: Record<string, Task[]>;
  routines: Record<string, Routine[]>;
  runs: Record<string, RoutineRun[]>;
  /** last calendar day (child tz) the rollover reconciler ran, per child */
  lastRolloverDay: Record<string, string | null>;

  // seeding
  setChildContent: (cid: string, routines: Routine[], tasks: Task[]) => void;

  // task CRUD
  addTask: (cid: string, task: Task) => void;
  /** append a step task to a routine (momentum add-a-step) — keeps stepIds in sync */
  addRoutineStep: (cid: string, routineId: string, task: Task) => void;
  updateTask: (cid: string, taskId: string, patch: Partial<Task>) => void;
  setTaskStatus: (cid: string, taskId: string, status: TaskStatus) => void;
  archiveTask: (cid: string, taskId: string) => void;

  // routines
  setRoutineActive: (cid: string, routineId: string, active: boolean) => void;
  reorderRoutineSteps: (cid: string, routineId: string, orderedStepIds: string[]) => void;

  // forgiving rollover
  rolloverChild: (cid: string, tz: string) => boolean;

  // runs (capped)
  upsertRun: (cid: string, run: RoutineRun) => void;
}

export const useTaskStore = create<TaskStoreState>()(
  persist(
    (set, get) => ({
      tasks: {},
      routines: {},
      runs: {},
      lastRolloverDay: {},

      setChildContent: (cid, routines, tasks) =>
        set((s) => ({
          routines: { ...s.routines, [cid]: routines },
          tasks: { ...s.tasks, [cid]: tasks },
        })),

      addTask: (cid, task) =>
        set((s) => ({ tasks: { ...s.tasks, [cid]: [...(s.tasks[cid] ?? []), task] } })),

      addRoutineStep: (cid, routineId, task) =>
        set((s) => {
          const routines = (s.routines[cid] ?? []).map((r) =>
            r.id === routineId
              ? { ...r, stepIds: [...r.stepIds, task.id], updatedAt: now() }
              : r,
          );
          const target = routines.find((r) => r.id === routineId);
          const order = target ? target.stepIds.length - 1 : 0;
          const step: Task = { ...task, routineId, order };
          return {
            routines: { ...s.routines, [cid]: routines },
            tasks: { ...s.tasks, [cid]: [...(s.tasks[cid] ?? []), step] },
          };
        }),

      updateTask: (cid, taskId, patch) =>
        set((s) => ({
          tasks: {
            ...s.tasks,
            [cid]: (s.tasks[cid] ?? []).map((t) =>
              t.id === taskId ? { ...t, ...patch, updatedAt: now() } : t,
            ),
          },
        })),

      setTaskStatus: (cid, taskId, status) =>
        set((s) => ({
          tasks: {
            ...s.tasks,
            [cid]: (s.tasks[cid] ?? []).map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status,
                    ...(status === "done" ? { lastCompletedAt: now() } : {}),
                    updatedAt: now(),
                  }
                : t,
            ),
          },
        })),

      archiveTask: (cid, taskId) =>
        set((s) => ({
          tasks: {
            ...s.tasks,
            [cid]: (s.tasks[cid] ?? []).map((t) =>
              t.id === taskId ? { ...t, archived: true, updatedAt: now() } : t,
            ),
          },
        })),

      setRoutineActive: (cid, routineId, active) =>
        set((s) => ({
          routines: {
            ...s.routines,
            [cid]: (s.routines[cid] ?? []).map((r) =>
              r.id === routineId ? { ...r, active, updatedAt: now() } : r,
            ),
          },
        })),

      reorderRoutineSteps: (cid, routineId, orderedStepIds) =>
        set((s) => {
          const routines = (s.routines[cid] ?? []).map((r) =>
            r.id === routineId ? { ...r, stepIds: orderedStepIds, updatedAt: now() } : r,
          );
          const orderById = new Map(orderedStepIds.map((id, i) => [id, i]));
          const tasks = (s.tasks[cid] ?? []).map((t) =>
            t.routineId === routineId && orderById.has(t.id)
              ? { ...t, order: orderById.get(t.id) as number, updatedAt: now() }
              : t,
          );
          return { routines: { ...s.routines, [cid]: routines }, tasks: { ...s.tasks, [cid]: tasks } };
        }),

      rolloverChild: (cid, tz) => {
        const ts = now();
        const s = get();
        const last = s.lastRolloverDay[cid] ?? null;
        if (!isNewDay(last, ts, tz)) return false;
        const rolled = rolloverTasks(s.tasks[cid] ?? [], ts);
        set((st) => ({
          tasks: { ...st.tasks, [cid]: rolled },
          lastRolloverDay: { ...st.lastRolloverDay, [cid]: isoDay(ts, tz) },
        }));
        return true;
      },

      upsertRun: (cid, run) =>
        set((s) => {
          const list = s.runs[cid] ?? [];
          const exists = list.some((r) => r.id === run.id);
          const next = exists ? list.map((r) => (r.id === run.id ? run : r)) : [run, ...list];
          return { runs: { ...s.runs, [cid]: next.slice(0, RUNS_CAP) } };
        }),
    }),
    createTbPersistOptions<TaskStoreState>({
      name: "tasks",
      partialize: (s) => ({
        tasks: s.tasks,
        routines: s.routines,
        runs: s.runs,
        lastRolloverDay: s.lastRolloverDay,
      }) as TaskStoreState,
    }),
  ),
);

registerPersistedStore(useTaskStore.persist);
