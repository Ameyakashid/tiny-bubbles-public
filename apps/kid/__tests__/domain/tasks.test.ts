import { describe, expect, it } from "@jest/globals";

import {
  isNewDay,
  isRoutineScheduledToday,
  isScheduledToday,
  nextStepId,
  rolloverTask,
  rolloverTasks,
  routineDaypartOf,
  routineProgress,
  routineSteps,
  selectDaypartRoutine,
  summarizeDayparts,
  todaySteps,
} from "../../src/domain/tasks";
import type {
  ActiveRunProgress,
  Routine,
  StepResult,
  Task,
  TaskDeadline,
  TaskStatus,
} from "../../src/domain/types";

const TZ = "UTC";
const day = (d: number) => Date.UTC(2026, 0, d, 12, 0, 0);

function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    childId: "c1",
    templateId: null,
    routineId: null,
    order: 0,
    label: { spokenLabel: "Brush teeth", color: "#5BC8F5" },
    verification: { mode: "none", required: false },
    tokenValue: 1,
    deadline: "today",
    schedule: { daysOfWeek: [] },
    status: "todo",
    createdAt: 0,
    updatedAt: 0,
    archived: false,
    ...over,
  };
}

describe("forgiving rollover (NEVER 'failed' — that status does not exist)", () => {
  it("rolls an incomplete 'today' task to 'someday', status back to 'todo'", () => {
    const r = rolloverTask(makeTask({ deadline: "today", status: "todo" }), day(2));
    expect(r.deadline).toBe("someday");
    expect(r.status).toBe("todo");
  });

  it("promotes 'tomorrow' to 'today'", () => {
    const r = rolloverTask(makeTask({ deadline: "tomorrow", status: "todo" }), day(2));
    expect(r.deadline).toBe("today");
    expect(r.status).toBe("todo");
  });

  it("re-arms a completed recurring 'today' task to 'todo' (stays today)", () => {
    const r = rolloverTask(makeTask({ deadline: "today", status: "done" }), day(2));
    expect(r.deadline).toBe("today"); // done -> not rolled to someday
    expect(r.status).toBe("todo"); // re-armed for the new day
  });

  it("re-arms a skipped task to 'todo'", () => {
    const r = rolloverTask(makeTask({ deadline: "anytime", status: "skipped" }), day(2));
    expect(r.status).toBe("todo");
  });

  it("leaves archived tasks untouched", () => {
    const t = makeTask({ archived: true, deadline: "today", status: "todo" });
    expect(rolloverTask(t, day(2))).toBe(t);
  });

  it("ALWAYS yields a valid (never 'failed') status across many cases", () => {
    const valid: TaskStatus[] = ["todo", "done", "skipped"];
    const deadlines: TaskDeadline[] = ["today", "tomorrow", "someday", "anytime"];
    const tasks = deadlines.flatMap((deadline) =>
      valid.map((status) => makeTask({ id: `${deadline}-${status}`, deadline, status })),
    );
    for (const r of rolloverTasks(tasks, day(2))) {
      expect(["todo", "done", "skipped"]).toContain(r.status);
      expect(r.status).not.toBe("failed");
    }
  });
});

describe("isNewDay", () => {
  it("true on a later calendar day, false on the same day, true when never run", () => {
    expect(isNewDay(null, day(1), TZ)).toBe(true);
    expect(isNewDay("2026-01-01", day(1), TZ)).toBe(false);
    expect(isNewDay("2026-01-01", day(2), TZ)).toBe(true);
  });
});

describe("todaySteps + scheduling", () => {
  it("includes only scheduled-today, still-todo tasks, ordered", () => {
    const tasks = [
      makeTask({ id: "b", order: 2, status: "todo", deadline: "today" }),
      makeTask({ id: "a", order: 1, status: "todo", deadline: "today" }),
      makeTask({ id: "done", order: 0, status: "done", deadline: "today" }),
      makeTask({ id: "someday", order: 3, status: "todo", deadline: "someday" }),
    ];
    const out = todaySteps(tasks, day(1), TZ).map((t) => t.id);
    expect(out).toEqual(["a", "b"]); // ordered; done + someday excluded
  });

  it("honours a oneOff date", () => {
    const t = makeTask({ deadline: "today", schedule: { daysOfWeek: [], oneOff: "2026-01-05" } });
    expect(isScheduledToday(t, day(5), TZ)).toBe(true);
    expect(isScheduledToday(t, day(6), TZ)).toBe(false);
  });

  it("honours daysOfWeek (empty = every day)", () => {
    // 2026-01-01 is a Thursday (getUTCDay === 4).
    const thursdayOnly = makeTask({ deadline: "today", schedule: { daysOfWeek: [4] } });
    expect(isScheduledToday(thursdayOnly, day(1), TZ)).toBe(true);
    const mondayOnly = makeTask({ deadline: "today", schedule: { daysOfWeek: [1] } });
    expect(isScheduledToday(mondayOnly, day(1), TZ)).toBe(false);
  });
});

describe("one-step-at-a-time run selectors", () => {
  it("nextStepId returns the first unresolved step (resume-after-kill)", () => {
    const stepIds = ["s1", "s2", "s3"];
    expect(nextStepId(stepIds, [])).toBe("s1");
    expect(nextStepId(stepIds, ["s1"])).toBe("s2");
    expect(nextStepId(stepIds, ["s1", "s2", "s3"])).toBeNull();
  });

  it("routineSteps orders steps of a routine", () => {
    const tasks = [
      makeTask({ id: "x", routineId: "r1", order: 1 }),
      makeTask({ id: "y", routineId: "r1", order: 0 }),
      makeTask({ id: "z", routineId: "r2", order: 0 }),
    ];
    expect(routineSteps(tasks, "r1").map((t) => t.id)).toEqual(["y", "x"]);
  });

  it("routineProgress reports done/total/fraction and celebrates partials", () => {
    const steps: StepResult[] = [
      { taskId: "a", status: "done", tokensAwarded: 1, celebrationShown: "full" },
      { taskId: "b", status: "skipped", tokensAwarded: 0, celebrationShown: "gentle" },
    ];
    const p = routineProgress({ steps }, 5);
    expect(p.done).toBe(1);
    expect(p.total).toBe(5);
    expect(p.fraction).toBeCloseTo(0.2);
    expect(p.allDone).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Daypart-driven, forward-only selection (doc 70 §B1) — the fix for the shipped
// "stuck on / loops back to morning" bug. Selection follows the clock and NEVER
// falls back to morning.
// ---------------------------------------------------------------------------
function makeRoutine(over: Partial<Routine> = {}): Routine {
  return {
    id: "r-morning",
    childId: "c1",
    label: { spokenLabel: "Morning", text: "Morning", color: "#FFD166" },
    stepIds: [],
    schedule: { daysOfWeek: [] },
    daypart: "morning",
    mode: "gamified",
    active: true,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

describe("routineDaypartOf", () => {
  it("uses the explicit daypart when present", () => {
    expect(routineDaypartOf(makeRoutine({ daypart: "afternoon" }))).toBe("afternoon");
  });

  it("falls back to the schedule anchor when daypart is absent", () => {
    const r = makeRoutine({ daypart: undefined, schedule: { daysOfWeek: [], timeOfDay: "16:00" } });
    expect(routineDaypartOf(r)).toBe("afternoon");
  });

  it("collapses night onto evening (shared routine list)", () => {
    const r = makeRoutine({ daypart: undefined, schedule: { daysOfWeek: [], timeOfDay: "21:30" } });
    expect(routineDaypartOf(r)).toBe("evening");
  });
});

describe("isRoutineScheduledToday", () => {
  it("empty daysOfWeek means every day", () => {
    expect(isRoutineScheduledToday(makeRoutine({ schedule: { daysOfWeek: [] } }), day(3), TZ)).toBe(
      true,
    );
  });

  it("weekday-only routine is hidden on the weekend", () => {
    // 2026-01-03 is a Saturday (getUTCDay === 6); weekdays are [1..5].
    const weekday = makeRoutine({ schedule: { daysOfWeek: [1, 2, 3, 4, 5] } });
    expect(isRoutineScheduledToday(weekday, day(3), TZ)).toBe(false); // Saturday
    expect(isRoutineScheduledToday(weekday, day(5), TZ)).toBe(true); // Monday
  });
});

describe("selectDaypartRoutine — forward-only, NO morning fallback", () => {
  const morning = makeRoutine({ id: "m", daypart: "morning", active: true });
  const afternoon = makeRoutine({ id: "a", daypart: "afternoon", active: true });
  const evening = makeRoutine({ id: "e", daypart: "evening", active: true });

  it("picks the active routine matching the current daypart", () => {
    const all = [morning, afternoon, evening];
    expect(selectDaypartRoutine(all, "morning", day(5), TZ)?.id).toBe("m");
    expect(selectDaypartRoutine(all, "afternoon", day(5), TZ)?.id).toBe("a");
    expect(selectDaypartRoutine(all, "evening", day(5), TZ)?.id).toBe("e");
  });

  it("night resolves against the evening routine (no separate night list)", () => {
    expect(selectDaypartRoutine([morning, evening], "night", day(5), TZ)?.id).toBe("e");
  });

  it("returns null (calm done state) instead of falling back to morning", () => {
    // Only a morning routine exists, but it is the afternoon — NEVER pick morning.
    expect(selectDaypartRoutine([morning], "afternoon", day(5), TZ)).toBeNull();
  });

  it("skips inactive routines", () => {
    const inactive = makeRoutine({ id: "m2", daypart: "morning", active: false });
    expect(selectDaypartRoutine([inactive], "morning", day(5), TZ)).toBeNull();
  });

  it("honours weekday scheduling (weekday-only routine hidden on the weekend)", () => {
    const weekdayAfternoon = makeRoutine({
      id: "aw",
      daypart: "afternoon",
      active: true,
      schedule: { daysOfWeek: [1, 2, 3, 4, 5] },
    });
    expect(selectDaypartRoutine([weekdayAfternoon], "afternoon", day(3), TZ)).toBeNull(); // Sat
    expect(selectDaypartRoutine([weekdayAfternoon], "afternoon", day(5), TZ)?.id).toBe("aw"); // Mon
  });
});

// ---------------------------------------------------------------------------
// summarizeDayparts — the parent mission-control roll-up (doc 70 §C1). Reads the
// SAME durable signals the kid loop uses so the dashboard mirrors what the kid
// sees. Anti-shame: statuses are not-started / in-progress / done / empty only.
// ---------------------------------------------------------------------------
describe("summarizeDayparts — parent dashboard completion roll-up", () => {
  const morning = makeRoutine({ id: "m", daypart: "morning", active: true, stepIds: ["m1", "m2", "m3"] });
  const afternoon = makeRoutine({ id: "a", daypart: "afternoon", active: true, stepIds: ["a1", "a2"] });
  const eveningOff = makeRoutine({ id: "e", daypart: "evening", active: false, stepIds: ["e1"] });

  const step = (id: string, routineId: string, order: number, status: TaskStatus = "todo") =>
    makeTask({ id, routineId, order, status });

  const tasks = [
    step("m1", "m", 0, "done"),
    step("m2", "m", 1, "done"),
    step("m3", "m", 2, "todo"),
    step("a1", "a", 0),
    step("a2", "a", 1),
    step("e1", "e", 0),
  ];

  const activeMorningRun: ActiveRunProgress = {
    childId: "c1",
    routineId: "m",
    stepIds: ["m1", "m2", "m3"],
    completedStepIds: ["m1", "m2"],
    startedAt: 0,
    updatedAt: 0,
  };

  it("reflects an in-progress run via completedStepIds and highlights the current daypart", () => {
    const out = summarizeDayparts({
      routines: [morning, afternoon, eveningOff],
      tasks,
      activeRun: activeMorningRun,
      completedToday: [],
      currentDaypart: "morning",
    });
    const byDp = Object.fromEntries(out.map((s) => [s.daypart, s]));

    expect(byDp.morning).toMatchObject({ done: 2, total: 3, status: "in-progress", isNow: true });
    // No run for the afternoon → falls back to task status counts (both todo).
    expect(byDp.afternoon).toMatchObject({ done: 0, total: 2, status: "not-started", isNow: false });
    // An inactive routine is still surfaced so the parent can see/toggle it.
    expect(byDp.evening.routine?.id).toBe("e");
    expect(byDp.evening.routine?.active).toBe(false);
  });

  it("treats the per-day 'done' marker as fully complete (done === total)", () => {
    const out = summarizeDayparts({
      routines: [morning, afternoon, eveningOff],
      tasks,
      activeRun: null,
      completedToday: ["afternoon"],
      currentDaypart: "afternoon",
    });
    const afternoonSummary = out.find((s) => s.daypart === "afternoon")!;
    expect(afternoonSummary).toMatchObject({ done: 2, total: 2, status: "done", isNow: true });
  });

  it("marks a daypart with no routine as empty (never a shame state)", () => {
    const out = summarizeDayparts({
      routines: [morning],
      tasks: tasks.filter((t) => t.routineId === "m"),
      activeRun: null,
      completedToday: [],
      currentDaypart: "night", // collapses to evening for the 'now' highlight
    });
    const byDp = Object.fromEntries(out.map((s) => [s.daypart, s]));
    expect(byDp.afternoon).toMatchObject({ routine: null, status: "empty" });
    expect(byDp.evening).toMatchObject({ routine: null, status: "empty", isNow: true });
  });
});
