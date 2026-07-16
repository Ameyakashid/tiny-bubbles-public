/**
 * src/domain/tasks.ts — forgiving task lifecycle + the one-at-a-time selectors.
 *
 * Ports momentum's `dailyRollover` semantics (doc 62 §5, doc 66 §1b.2) as an
 * on-open / local-midnight reconciler: an incomplete `today` task rolls to
 * `someday` (NEVER a failure state); `tomorrow` rolls to `today`; completed
 * recurring tasks re-arm to `todo` for the new period. There is no failure path
 * — the `TaskStatus` union has no failure member by design (doc 62 §5).
 *
 * Pure: `now`/`tz` are passed in for deterministic testing.
 */
import { daypartFromSchedule, diffDays, isoDay, selectionDaypart } from "./dates";
import type { ActiveRunProgress, Daypart, Routine, RoutineRun, Task } from "./types";

// ---------------------------------------------------------------------------
// Forgiving rollover (doc 62 §5).
// ---------------------------------------------------------------------------

/** True when `now` is on a later calendar day than `lastRolloverDay` (child tz). */
export function isNewDay(lastRolloverDay: string | null, now: number, tz: string): boolean {
  if (!lastRolloverDay) return true;
  return diffDays(isoDay(now, tz), lastRolloverDay) >= 1;
}

/**
 * Roll one task forward into a new period (doc 62 §5). Anti-shame transitions:
 *   - `tomorrow`           -> `today`
 *   - incomplete `today`   -> `someday`   (rolled, never a failure)
 *   - any other deadline   -> unchanged
 * and the per-period `status` is reset to `todo` so the task re-appears fresh.
 * Archived tasks are left untouched. Returns a NEW task (or the same ref if
 * nothing changed).
 */
export function rolloverTask(task: Task, now: number): Task {
  if (task.archived) return task;

  // Decide the next deadline from the ORIGINAL status/deadline first, so the
  // status reset below can't accidentally re-trigger the "incomplete today" rule.
  let deadline = task.deadline;
  if (task.deadline === "tomorrow") {
    deadline = "today";
  } else if (task.deadline === "today" && task.status === "todo") {
    deadline = "someday";
  }

  const statusChanged = task.status !== "todo";
  const deadlineChanged = deadline !== task.deadline;
  if (!statusChanged && !deadlineChanged) return task;

  return { ...task, deadline, status: "todo", updatedAt: now };
}

/** Roll an entire task list forward (doc 62 §5). Pure — returns a new array. */
export function rolloverTasks(tasks: Task[], now: number): Task[] {
  return tasks.map((t) => rolloverTask(t, now));
}

// ---------------------------------------------------------------------------
// "Today" selector (doc 62 §13).
// ---------------------------------------------------------------------------

/** 0=Sunday..6=Saturday for `now` in the child's timezone. */
function dayOfWeekInTz(now: number, tz: string): number {
  // formatInTimeZone 'i' gives ISO day (1=Mon..7=Sun); map to 0=Sun..6=Sat.
  // Using isoDay + Date keeps this dependency-light and tz-correct enough for
  // scheduling (the calendar day is already localized).
  const iso = isoDay(now, tz); // 'YYYY-MM-DD'
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  // Construct a UTC date for the localized calendar day; getUTCDay is stable.
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** True when a task is scheduled to appear today (doc 62 §13 `todaySteps`). */
export function isScheduledToday(task: Task, now: number, tz: string): boolean {
  if (task.archived) return false;
  const today = isoDay(now, tz);
  if (task.schedule.oneOff) return task.schedule.oneOff === today;
  if (task.deadline === "today" || task.deadline === "anytime") {
    const days = task.schedule.daysOfWeek;
    return days.length === 0 || days.includes(dayOfWeekInTz(now, tz));
  }
  return false;
}

/**
 * The kid's "today": scheduled-today tasks still `todo`, ordered. Standalone +
 * routine steps are both included (a routine step is a Task with a `routineId`).
 */
export function todaySteps(tasks: Task[], now: number, tz: string): Task[] {
  return tasks
    .filter((t) => t.status === "todo" && isScheduledToday(t, now, tz))
    .sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// One-step-at-a-time run selectors (doc 62 §13).
// ---------------------------------------------------------------------------

/** Ordered steps of a routine (Tasks whose routineId === routineId), by `order`. */
export function routineSteps(tasks: Task[], routineId: string): Task[] {
  return tasks
    .filter((t) => t.routineId === routineId && !t.archived)
    .sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Daypart-driven selection (doc 70 §B1) — the time-of-day kid flow. Forward-only:
// there is NO morning fallback. Pure; `now`/`tz` are passed in for testability.
// ---------------------------------------------------------------------------

/**
 * The daypart a routine belongs to: its explicit `daypart`, else derived from its
 * schedule anchor (`daypartFromSchedule`) so pre-existing persisted routines still
 * bucket correctly. `night` is collapsed to `evening` (shared routine list).
 */
export function routineDaypartOf(routine: Routine): Daypart {
  return selectionDaypart(routine.daypart ?? daypartFromSchedule(routine.schedule.timeOfDay));
}

/**
 * Whether a routine is scheduled to appear today, honoring its own
 * `schedule.daysOfWeek` (empty => every day). Mirrors `isScheduledToday`'s
 * weekday semantics so a weekday-only routine never surfaces on the weekend.
 */
export function isRoutineScheduledToday(routine: Routine, now: number, tz: string): boolean {
  const days = routine.schedule.daysOfWeek;
  if (days.length === 0) return true;
  return days.includes(dayOfWeekInTz(now, tz));
}

/**
 * The single ACTIVE routine to run RIGHT NOW for daypart `dp` (doc 70 §B1).
 * Returns the first active routine whose daypart matches AND that is scheduled
 * today; `null` when nothing matches — the caller then shows the calm "all done
 * for now" state and NEVER falls back to morning. `dp` may be `night` (collapsed
 * to `evening` internally).
 */
export function selectDaypartRoutine(
  routines: Routine[],
  dp: Daypart,
  now: number,
  tz: string,
): Routine | null {
  const target = selectionDaypart(dp);
  for (const r of routines) {
    if (!r.active) continue;
    if (routineDaypartOf(r) !== target) continue;
    if (!isRoutineScheduledToday(r, now, tz)) continue;
    return r;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parent mission-control roll-up (doc 70 §C1) — a PURE per-daypart completion
// summary the parent dashboard renders (grouped Morning / Afternoon / Evening).
// It reads the same durable signals the kid loop uses (the active run's
// completedStepIds, the per-day "done" marker, else the tasks' own status) so the
// parent sees exactly what the kid sees. Anti-shame by construction: the status
// union has "not-started"/"in-progress"/"done"/"empty" — never "missed"/"failed".
// ---------------------------------------------------------------------------

/** The three real routine dayparts a parent manages (night shares evening). */
export const PARENT_DAYPARTS: Array<Exclude<Daypart, "night">> = [
  "morning",
  "afternoon",
  "evening",
];

export type DaypartStatus = "not-started" | "in-progress" | "done" | "empty";

export interface DaypartSummary {
  daypart: Exclude<Daypart, "night">;
  /** the routine surfaced for this daypart (active preferred), or null if none */
  routine: Routine | null;
  /** completed step count today */
  done: number;
  /** total steps in the routine */
  total: number;
  status: DaypartStatus;
  /** true for the daypart the child is in RIGHT NOW (what the kid sees) */
  isNow: boolean;
}

/**
 * Summarize a child's Morning / Afternoon / Evening completion for the parent
 * dashboard (doc 70 §C1). Pure — the caller passes the resolved `activeRun`, the
 * `completedToday` list (the per-day marker, already scoped to today), and the
 * `currentDaypart` (from `getDaypart`). Prefers the ACTIVE routine per daypart,
 * else surfaces an inactive one so the parent can still see/toggle it.
 */
export function summarizeDayparts(input: {
  routines: Routine[];
  tasks: Task[];
  activeRun: ActiveRunProgress | null;
  /** dayparts marked done for the CURRENT local day (empty when none/stale) */
  completedToday: Daypart[];
  currentDaypart: Daypart;
}): DaypartSummary[] {
  const { routines, tasks, activeRun, completedToday, currentDaypart } = input;
  const nowDp = selectionDaypart(currentDaypart);
  return PARENT_DAYPARTS.map((dp) => {
    const routine =
      routines.find((r) => r.active && routineDaypartOf(r) === dp) ??
      routines.find((r) => routineDaypartOf(r) === dp) ??
      null;
    if (!routine) {
      return { daypart: dp, routine: null, done: 0, total: 0, status: "empty", isNow: dp === nowDp };
    }
    const steps = routineSteps(tasks, routine.id);
    const total = steps.length;
    const isComplete = completedToday.includes(dp);
    let done: number;
    if (isComplete) {
      done = total;
    } else if (activeRun && activeRun.routineId === routine.id) {
      const doneSet = new Set(activeRun.completedStepIds);
      done = steps.filter((s) => doneSet.has(s.id)).length;
    } else {
      done = steps.filter((s) => s.status === "done").length;
    }
    const status: DaypartStatus =
      total === 0
        ? "empty"
        : isComplete || done >= total
          ? "done"
          : done > 0
            ? "in-progress"
            : "not-started";
    return { daypart: dp, routine, done, total, status, isNow: dp === nowDp };
  });
}

// ---------------------------------------------------------------------------
// Optional parent-verify queue selectors (verify-undo §2.4/§3.5). A CONFIRMATION
// at leisure, NEVER a gate: the child already earned their token; a never-confirmed
// step is fine, never "failed". Only `mode:'parent'` completed-and-unconfirmed
// steps surface. Pure — no now/tz needed.
// ---------------------------------------------------------------------------

/** A completed step still awaiting the OPTIONAL parent confirmation (mode:'parent'). */
export function needsParentVerify(task: Task): boolean {
  return (
    task.status === "done" &&
    task.verification.mode === "parent" &&
    (task.verification.verifiedAt == null ||
      (task.lastCompletedAt != null && task.verification.verifiedAt < task.lastCompletedAt))
  );
}

/** All of a child's steps awaiting parent confirmation right now (verify-undo §3.5). */
export function stepsAwaitingParentVerify(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.archived && needsParentVerify(t));
}

/**
 * The next incomplete step of a run (doc 62 §13 `nextStep`) — the heart of the
 * one-step-at-a-time loop AND of resume-after-kill (M7). Returns the first step
 * id not yet resolved, or `null` when the run is complete.
 */
export function nextStepId(stepIds: string[], completedStepIds: string[]): string | null {
  const done = new Set(completedStepIds);
  for (const id of stepIds) {
    if (!done.has(id)) return id;
  }
  return null;
}

export interface RoutineProgress {
  done: number;
  total: number;
  fraction: number;
  allDone: boolean;
}

/** "3 of 5 — great job!" progress (doc 62 §13). Partial is always celebrated. */
export function routineProgress(run: Pick<RoutineRun, "steps">, total: number): RoutineProgress {
  const done = run.steps.filter((s) => s.status === "done").length;
  const safeTotal = Math.max(total, run.steps.length);
  return {
    done,
    total: safeTotal,
    fraction: safeTotal === 0 ? 0 : done / safeTotal,
    allDone: safeTotal > 0 && done >= safeTotal,
  };
}
