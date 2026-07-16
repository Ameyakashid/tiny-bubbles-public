import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

/**
 * M10 reminders (doc 66 §M10 / §1b.14). jest-expo does NOT mock
 * expo-notifications, so we mock it here and pin:
 *   - quiet-hours window math (wrap-around aware)
 *   - the per-day budget + quiet-skip planning
 *   - the FIXED gentle copy set (no companion re-engagement / guilt / urgency)
 *   - the native schedule/cancel/reschedule contract
 */

jest.mock("expo-notifications", () => {
  let n = 0;
  return {
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    AndroidImportance: { DEFAULT: 3, MAX: 5 },
    getPermissionsAsync: jest.fn(async () => ({
      granted: true,
      status: "granted",
      canAskAgain: true,
    })),
    requestPermissionsAsync: jest.fn(async () => ({
      granted: true,
      status: "granted",
      canAskAgain: true,
    })),
    scheduleNotificationAsync: jest.fn(async () => `notif-${n++}`),
    cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
    SchedulableTriggerInputTypes: {
      DAILY: "daily",
      WEEKLY: "weekly",
      TIME_INTERVAL: "timeInterval",
    },
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  };
});

import * as Notifications from "expo-notifications";

import { getMessage } from "../../src/i18n/messages";
import {
  BANNED_REMINDER_PATTERNS,
  REMINDER_BODY_TEMPLATES,
  REMINDER_TITLE,
  addReminderTapListener,
  assertReminderCopyClean,
  buildReminderContent,
  buildReminderPlan,
  cancelAllReminders,
  getReminderTapInfo,
  isReminderCopyClean,
  isValidHm,
  isWithinQuietHours,
  parseHm,
  rescheduleReminders,
  routineToAnchor,
  scheduleRoutineReminders,
  type QuietHours,
} from "../../src/services/notifications";
import type { ReminderAnchor, Routine } from "../../src/domain/types";
import { planToReminderAnchor } from "../../src/domain/plans";
import {
  PLAN_ACTION_TEMPLATES,
  actionFromTemplate,
  planFromTemplates,
  timeCue,
} from "../../src/data/planTemplates";

const scheduleMock = Notifications.scheduleNotificationAsync as unknown as jest.Mock<any>;
const cancelMock = Notifications.cancelAllScheduledNotificationsAsync as unknown as jest.Mock<any>;
const getPermMock = Notifications.getPermissionsAsync as unknown as jest.Mock<any>;

const QUIET: QuietHours = { start: "20:00", end: "07:00" };

function makeRoutine(over: Partial<Routine> = {}): Routine {
  return {
    id: "r1",
    childId: "c1",
    label: { spokenLabel: "Morning routine", color: "#FFD166" },
    stepIds: [],
    schedule: { daysOfWeek: [1, 2, 3, 4, 5], timeOfDay: "07:00" },
    mode: "gamified",
    active: true,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

function anchor(over: Partial<ReminderAnchor> = {}): ReminderAnchor {
  return {
    id: "a1",
    time: "08:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    spokenLabel: "Morning routine",
    ...over,
  };
}

beforeEach(() => {
  scheduleMock.mockClear();
  cancelMock.mockClear();
  getPermMock.mockClear();
});

// ---------------------------------------------------------------------------
// Quiet-hours math
// ---------------------------------------------------------------------------
describe("quiet hours", () => {
  it("validates and parses HH:mm", () => {
    expect(isValidHm("07:00")).toBe(true);
    expect(isValidHm("23:59")).toBe(true);
    expect(isValidHm("24:00")).toBe(false);
    expect(isValidHm("7:5")).toBe(false);
    expect(parseHm("07:30")).toBe(450);
    expect(Number.isNaN(parseHm("nope"))).toBe(true);
  });

  it("treats the start edge as inside and the end edge as outside", () => {
    expect(isWithinQuietHours("20:00", QUIET)).toBe(true); // start inclusive
    expect(isWithinQuietHours("07:00", QUIET)).toBe(false); // end exclusive
  });

  it("handles a wrap-around (overnight) window", () => {
    expect(isWithinQuietHours("22:30", QUIET)).toBe(true);
    expect(isWithinQuietHours("03:00", QUIET)).toBe(true);
    expect(isWithinQuietHours("12:00", QUIET)).toBe(false);
  });

  it("handles a same-day window", () => {
    const q: QuietHours = { start: "12:00", end: "14:00" };
    expect(isWithinQuietHours("13:00", q)).toBe(true);
    expect(isWithinQuietHours("11:59", q)).toBe(false);
    expect(isWithinQuietHours("14:00", q)).toBe(false);
  });

  it("treats start === end as no quiet window", () => {
    const q: QuietHours = { start: "09:00", end: "09:00" };
    expect(isWithinQuietHours("09:00", q)).toBe(false);
    expect(isWithinQuietHours("23:00", q)).toBe(false);
  });

  it("never suppresses on malformed config", () => {
    expect(isWithinQuietHours("08:00", { start: "x", end: "y" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixed friendly copy set — the real tone control (§1b.14)
// ---------------------------------------------------------------------------
describe("reminder copy", () => {
  it("every body template (for any label) is gentle/clean", () => {
    expect(() => assertReminderCopyClean()).not.toThrow();
    for (const t of REMINDER_BODY_TEMPLATES) {
      expect(isReminderCopyClean(t("Bedtime routine"))).toBe(true);
    }
  });

  it("flags companion re-engagement nags as unclean", () => {
    // built from fragments so the literal banned phrase never appears in source
    const buddyMiss = "Your " + "buddy " + "mis" + "ses you!";
    const buddyBack = "Your " + "buddy is " + "back!";
    const buddyWaiting = "Your " + "buddy is " + "waiting";
    expect(isReminderCopyClean(buddyMiss)).toBe(false);
    expect(isReminderCopyClean(buddyBack)).toBe(false);
    expect(isReminderCopyClean(buddyWaiting)).toBe(false);
  });

  it("flags guilt / loss-aversion / urgency / begging as unclean", () => {
    expect(isReminderCopyClean("You " + "forgot again")).toBe(false);
    expect(isReminderCopyClean("Don'" + "t forget!")).toBe(false);
    expect(isReminderCopyClean("Keep your " + "streak alive")).toBe(false);
    expect(isReminderCopyClean("Hurry, " + "last chance")).toBe(false);
    expect(isReminderCopyClean("Pretty " + "please come back")).toBe(false);
  });

  it("sources title + bodies from the i18n catalog and stays clean (accessibility-i18n §4.3)", () => {
    // The copy now lives in src/i18n/en.ts; the exported shapes are catalog-derived.
    expect(REMINDER_TITLE).toBe(getMessage("reminder.title", {}));
    expect(isReminderCopyClean(REMINDER_TITLE)).toBe(true);
    const keys = [
      "reminder.body.1",
      "reminder.body.2",
      "reminder.body.3",
      "reminder.body.4",
      "reminder.body.5",
    ];
    const label = "Bedtime routine";
    keys.forEach((k, i) => {
      const resolved = getMessage(k, { params: { label } });
      expect(REMINDER_BODY_TEMPLATES[i](label)).toBe(resolved);
      expect(isReminderCopyClean(resolved)).toBe(true);
    });
    // and the dev-assert (now iterating every registered locale) is clean
    expect(() => assertReminderCopyClean()).not.toThrow();
  });

  it("has at least one banned pattern and builds deterministic content", () => {
    expect(BANNED_REMINDER_PATTERNS.length).toBeGreaterThan(0);
    const a = buildReminderContent("Morning routine", 0);
    const b = buildReminderContent("Morning routine", 0);
    expect(a).toEqual(b);
    expect(a.body).toContain("Morning routine");
    expect(isReminderCopyClean(a.title)).toBe(true);
    expect(isReminderCopyClean(a.body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Planning (pure)
// ---------------------------------------------------------------------------
describe("buildReminderPlan", () => {
  it("derives an anchor from an active routine with a time", () => {
    const a = routineToAnchor(makeRoutine());
    expect(a).not.toBeNull();
    expect(a?.routineId).toBe("r1");
    expect(a?.time).toBe("07:00");
  });

  it("returns null for an inactive routine or one with no time", () => {
    expect(routineToAnchor(makeRoutine({ active: false }))).toBeNull();
    expect(
      routineToAnchor(makeRoutine({ schedule: { daysOfWeek: [1] } })),
    ).toBeNull();
  });

  it("skips an anchor whose time falls in quiet hours", () => {
    const plan = buildReminderPlan([anchor({ time: "21:00" })], QUIET, 3);
    expect(plan).toHaveLength(0);
  });

  it("expands a weekday anchor into one item per active day", () => {
    const plan = buildReminderPlan([anchor()], QUIET, 3);
    expect(plan).toHaveLength(5);
    expect(plan.every((p) => p.dayOfWeek !== null)).toBe(true);
  });

  it("emits a single every-day (daily) item for empty daysOfWeek", () => {
    const plan = buildReminderPlan(
      [anchor({ daysOfWeek: [], time: "08:00" })],
      QUIET,
      3,
    );
    expect(plan).toHaveLength(1);
    expect(plan[0].dayOfWeek).toBeNull();
  });

  it("enforces the per-day budget, earliest time first", () => {
    const anchors = [
      anchor({ id: "late", time: "18:00", daysOfWeek: [1], spokenLabel: "Late" }),
      anchor({ id: "early", time: "07:30", daysOfWeek: [1], spokenLabel: "Early" }),
      anchor({ id: "mid", time: "12:00", daysOfWeek: [1], spokenLabel: "Mid" }),
    ];
    const plan = buildReminderPlan(anchors, QUIET, 2);
    expect(plan).toHaveLength(2);
    // earliest two survive Monday's 2-slot budget
    expect(plan.map((p) => p.anchorId).sort()).toEqual(["early", "mid"]);
  });

  it("schedules nothing when maxPerDay <= 0", () => {
    expect(buildReminderPlan([anchor()], QUIET, 0)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// M10 acceptance (doc 67 M10): for a realistic mix of anchors, NO reminder is
// scheduled inside the quiet-hours window AND no day exceeds maxPerDay. Asserts
// both invariants together, both on the pure plan and on the native schedule.
// ---------------------------------------------------------------------------
describe("M10 invariants: quiet-hours skipped AND count bounded by maxPerDay", () => {
  // A rich mix: some anchors inside QUIET (20:00->07:00), some outside, with
  // overlapping weekday sets and one every-day anchor, so the budget actually
  // bites on shared days.
  const MIXED: ReminderAnchor[] = [
    anchor({ id: "preDawn", time: "06:00", daysOfWeek: [1, 2, 3, 4, 5], spokenLabel: "Pre-dawn" }), // INSIDE quiet
    anchor({ id: "lateNight", time: "22:30", daysOfWeek: [1, 2, 3, 4, 5], spokenLabel: "Late night" }), // INSIDE quiet
    anchor({ id: "edge", time: "20:00", daysOfWeek: [3], spokenLabel: "Quiet edge" }), // INSIDE quiet (start edge)
    anchor({ id: "morning", time: "07:30", daysOfWeek: [1, 2, 3, 4, 5], spokenLabel: "Morning" }), // OK
    anchor({ id: "noon", time: "12:00", daysOfWeek: [1, 3, 5], spokenLabel: "Noon" }), // OK
    anchor({ id: "afternoon", time: "15:00", daysOfWeek: [1, 2, 3, 4, 5], spokenLabel: "Afternoon" }), // OK
    anchor({ id: "evening", time: "18:30", daysOfWeek: [1, 2, 3, 4, 5], spokenLabel: "Evening" }), // OK
    anchor({ id: "daily", time: "09:00", daysOfWeek: [], spokenLabel: "Daily" }), // OK, every day
  ];

  /** Count, for each JS weekday 0-6, how many planned items land on it. */
  function perDayCounts(plan: ReturnType<typeof buildReminderPlan>): number[] {
    const perDay = [0, 0, 0, 0, 0, 0, 0];
    for (const item of plan) {
      if (item.dayOfWeek === null) {
        for (let d = 0; d < 7; d++) perDay[d] += 1; // every-day item lands on all 7
      } else {
        perDay[item.dayOfWeek] += 1;
      }
    }
    return perDay;
  }

  it.each([1, 2, 3, 5])(
    "with maxPerDay=%i: zero reminders in quiet hours and no day over budget",
    (maxPerDay) => {
      const plan = buildReminderPlan(MIXED, QUIET, maxPerDay);

      // (1) No scheduled reminder falls inside the configured quiet-hours window.
      for (const item of plan) {
        expect(isWithinQuietHours(item.time, QUIET)).toBe(false);
      }

      // (2) The per-day count is bounded by maxPerDay on every weekday.
      for (const count of perDayCounts(plan)) {
        expect(count).toBeLessThanOrEqual(maxPerDay);
      }
    },
  );

  it("schedules at the NATIVE layer with no quiet-hours trigger and a bounded per-day count", async () => {
    const maxPerDay = 2;
    const ids = await rescheduleReminders({
      anchors: MIXED,
      enabled: true,
      maxPerDay,
      quietHours: QUIET,
    });
    expect(ids.length).toBeGreaterThan(0);
    expect(scheduleMock).toHaveBeenCalledTimes(ids.length);

    // Reconstruct per-weekday counts from the actual expo trigger inputs and
    // assert NO trigger lands in quiet hours + every weekday stays within budget.
    const perDay = [0, 0, 0, 0, 0, 0, 0];
    for (const call of scheduleMock.mock.calls) {
      const trigger = (call[0] as any).trigger;
      const hh = String(trigger.hour).padStart(2, "0");
      const mm = String(trigger.minute).padStart(2, "0");
      expect(isWithinQuietHours(`${hh}:${mm}`, QUIET)).toBe(false);

      if (trigger.type === "daily") {
        for (let d = 0; d < 7; d++) perDay[d] += 1;
      } else {
        // expo weekday 1-7 (1 = Sunday) -> JS day 0-6
        perDay[trigger.weekday - 1] += 1;
      }
    }
    for (const count of perDay) {
      expect(count).toBeLessThanOrEqual(maxPerDay);
    }
  });
});

// ---------------------------------------------------------------------------
// Native scheduling contract
// ---------------------------------------------------------------------------
describe("scheduleRoutineReminders", () => {
  it("schedules one weekly notification per active day, mapping JS day -> expo weekday", async () => {
    const ids = await scheduleRoutineReminders(makeRoutine(), QUIET, {
      maxPerDay: 3,
    });
    expect(ids).toHaveLength(5);
    expect(scheduleMock).toHaveBeenCalledTimes(5);
    const weekdays = scheduleMock.mock.calls
      .map((c) => (c[0] as any).trigger.weekday)
      .sort((a: number, b: number) => a - b);
    // Mon..Fri (JS 1..5) -> expo 2..6
    expect(weekdays).toEqual([2, 3, 4, 5, 6]);
    // payload carries the spoken label for tap-through TTS
    const data = (scheduleMock.mock.calls[0][0] as any).content.data;
    expect(data.spokenLabel).toBe("Morning routine");
  });

  it("schedules nothing when the routine time is inside quiet hours", async () => {
    const ids = await scheduleRoutineReminders(
      makeRoutine({ schedule: { daysOfWeek: [1, 2], timeOfDay: "21:30" } }),
      QUIET,
    );
    expect(ids).toHaveLength(0);
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it("uses a DAILY trigger for an every-day routine", async () => {
    await scheduleRoutineReminders(
      makeRoutine({ schedule: { daysOfWeek: [], timeOfDay: "08:00" } }),
      QUIET,
    );
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect((scheduleMock.mock.calls[0][0] as any).trigger.type).toBe("daily");
  });

  it("schedules nothing (and never prompts repeatedly) without permission", async () => {
    getPermMock.mockResolvedValueOnce({
      granted: false,
      status: "denied",
      canAskAgain: false,
    });
    const ids = await scheduleRoutineReminders(makeRoutine(), QUIET, {
      maxPerDay: 3,
    });
    expect(ids).toHaveLength(0);
    expect(scheduleMock).not.toHaveBeenCalled();
  });
});

describe("rescheduleReminders (app-open)", () => {
  it("cancels all and schedules nothing when disabled", async () => {
    const ids = await rescheduleReminders({
      routines: [makeRoutine()],
      enabled: false,
      maxPerDay: 3,
      quietHours: QUIET,
    });
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).not.toHaveBeenCalled();
    expect(ids).toHaveLength(0);
  });

  it("cancels then reschedules routines + manual anchors when enabled", async () => {
    const ids = await rescheduleReminders({
      routines: [makeRoutine({ schedule: { daysOfWeek: [], timeOfDay: "08:00" } })],
      anchors: [anchor({ id: "manual", daysOfWeek: [], time: "16:00" })],
      enabled: true,
      maxPerDay: 3,
      quietHours: QUIET,
    });
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(ids).toHaveLength(2);
    expect(scheduleMock).toHaveBeenCalledTimes(2);
  });
});

describe("cancelAllReminders", () => {
  it("delegates to expo cancelAllScheduledNotificationsAsync", async () => {
    await cancelAllReminders();
    expect(cancelMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tap-through (foreground TTS seam)
// ---------------------------------------------------------------------------
describe("tap-through", () => {
  function response(data: unknown) {
    return {
      notification: { request: { content: { data } } },
    } as unknown as Notifications.NotificationResponse;
  }

  it("extracts the spoken label only from our reminder payloads", () => {
    expect(
      getReminderTapInfo(
        response({ kind: "tb.reminder", spokenLabel: "Bedtime routine", routineId: "r9" }),
      ),
    ).toEqual({ spokenLabel: "Bedtime routine", routineId: "r9", anchorId: undefined });
    expect(getReminderTapInfo(response({ kind: "other" }))).toBeNull();
    expect(getReminderTapInfo(response(undefined))).toBeNull();
  });

  it("subscribes a listener and fires the handler for our reminders", () => {
    const addMock =
      Notifications.addNotificationResponseReceivedListener as unknown as jest.Mock<any>;
    let captured: ((r: unknown) => void) | undefined;
    addMock.mockImplementationOnce((cb: (r: unknown) => void) => {
      captured = cb;
      return { remove: jest.fn() };
    });
    const heard: string[] = [];
    const sub = addReminderTapListener((info) => heard.push(info.spokenLabel));
    captured?.(response({ kind: "tb.reminder", spokenLabel: "Morning routine" }));
    captured?.(response({ kind: "not-ours" }));
    expect(heard).toEqual(["Morning routine"]);
    sub.remove();
  });
});

// ---------------------------------------------------------------------------
// If-then plan time cues (if-then-plans §2.3a, M-C5): a `time` plan is mapped to a
// ReminderAnchor and fed into the SAME pipeline as routine reminders, so it inherits
// quiet-hours suppression + the per-day budget + the banned-phrase copy gate.
// ---------------------------------------------------------------------------
describe("if-then plan time cues", () => {
  const bag = actionFromTemplate(PLAN_ACTION_TEMPLATES.find((a) => a.id === "act_bag")!);
  function planAnchor(time: string, days: number[] = []): ReminderAnchor {
    const plan = planFromTemplates({
      id: `pl_${time}`,
      childId: "c1",
      now: 0,
      cue: timeCue(time, days),
      action: bag,
    });
    return planToReminderAnchor(plan, "older")!;
  }

  it("mixed with routine anchors: quiet-hours-suppressed, and every body stays copy-clean", () => {
    const routine = anchor({ id: "routine", time: "07:30", daysOfWeek: [1], spokenLabel: "Morning routine" });
    const quietPlan = planAnchor("22:30", [1]); // INSIDE quiet (20:00→07:00)
    const okPlan = planAnchor("16:00", [1]); // OK
    const plan = buildReminderPlan([routine, quietPlan, okPlan], QUIET, 3);

    // the quiet-hours plan cue is suppressed; nothing lands in quiet hours
    expect(plan.some((p) => p.anchorId === quietPlan.id)).toBe(false);
    for (const item of plan) {
      expect(isWithinQuietHours(item.time, QUIET)).toBe(false);
      expect(isReminderCopyClean(item.title)).toBe(true);
      expect(isReminderCopyClean(item.body)).toBe(true);
    }
    // the OK plan cue is admitted and its assembled if-then phrase rides in the body
    const okItem = plan.find((p) => p.anchorId === okPlan.id);
    expect(okItem?.body).toContain("pack my bag");
  });

  it("plan cues share the routine per-day budget (never a flood)", () => {
    const early = planAnchor("07:00", [1]);
    const mid = planAnchor("12:00", [1]);
    const late = planAnchor("18:00", [1]);
    const plan = buildReminderPlan([early, mid, late], QUIET, 2);
    // Monday holds at most the budget (2), earliest-first
    expect(plan.filter((p) => p.dayOfWeek === 1).length).toBeLessThanOrEqual(2);
    expect(plan.map((p) => p.anchorId).sort()).toEqual([early.id, mid.id].sort());
  });
});

afterEach(() => {
  jest.clearAllMocks();
});
