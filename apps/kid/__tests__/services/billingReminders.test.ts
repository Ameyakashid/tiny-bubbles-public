import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

/**
 * M-A1 honest trial-end reminder (billing-entitlements §2.4 / §4). jest-expo does
 * NOT mock expo-notifications, so we mock it here with a STATEFUL scheduled store
 * so we can pin:
 *   - `remindAt = trialEndsAt − 1 day`, quiet-hours-shifted to the nearest allowed
 *     minute; skip when the trial is already <1 day out
 *   - the VISIBLE copy is generic + non-billing (§2.4 shared-device decision):
 *     passes `isReminderCopyClean` AND `isBillingCopyClean`
 *   - the one-shot uses a DATE trigger + the distinct `billing_trial_end` kind
 *   - `cancelTrialEndingReminder` cancels ONLY the billing kind (routine reminders
 *     untouched); scheduling is idempotent (no duplicates on re-open)
 */
jest.mock("expo-notifications", () => {
  let scheduled: any[] = [];
  let idN = 0;
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
    scheduleNotificationAsync: jest.fn(async (req: any) => {
      const id = `notif-${idN++}`;
      scheduled.push({ identifier: id, content: req.content, trigger: req.trigger });
      return id;
    }),
    getAllScheduledNotificationsAsync: jest.fn(async () => scheduled),
    cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
      scheduled = scheduled.filter((n) => n.identifier !== id);
    }),
    cancelAllScheduledNotificationsAsync: jest.fn(async () => {
      scheduled = [];
    }),
    SchedulableTriggerInputTypes: {
      DAILY: "daily",
      WEEKLY: "weekly",
      DATE: "date",
      TIME_INTERVAL: "timeInterval",
    },
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    __getScheduled: () => scheduled,
    __reset: () => {
      scheduled = [];
      idN = 0;
    },
  };
});

import * as Notifications from "expo-notifications";

import { ONE_DAY_MS } from "../../src/domain/constants";
import {
  BILLING_REMINDER_BODY,
  BILLING_REMINDER_DATA_KIND,
  BILLING_REMINDER_TITLE,
  assertBillingCopyClean,
  cancelTrialEndingReminder,
  isBillingCopyClean,
  isReminderCopyClean,
  scheduleTrialEndingReminder,
  shiftOutOfQuietHours,
  trialReminderInstant,
  type QuietHours,
} from "../../src/services/notifications";

const scheduleMock = Notifications.scheduleNotificationAsync as unknown as jest.Mock<any>;
const getAll = () => (Notifications as any).__getScheduled() as any[];
const reset = () => (Notifications as any).__reset();

const QUIET: QuietHours = { start: "20:00", end: "07:00" };

/** Build a local wall-clock timestamp (TZ-agnostic within this suite). */
function at(y: number, m: number, d: number, h: number, min = 0): number {
  return new Date(y, m, d, h, min, 0, 0).getTime();
}

beforeEach(() => {
  reset();
  scheduleMock.mockClear();
});

afterEach(() => {
  reset();
});

// ---------------------------------------------------------------------------
// Copy cleanliness — visible generic/non-billing copy (§2.4).
// ---------------------------------------------------------------------------
describe("trial-end reminder copy is generic + non-billing (§2.4)", () => {
  it("visible title/body pass BOTH the shame gate and the billing-word gate", () => {
    expect(() => assertBillingCopyClean()).not.toThrow();
    expect(isReminderCopyClean(BILLING_REMINDER_TITLE)).toBe(true);
    expect(isReminderCopyClean(BILLING_REMINDER_BODY)).toBe(true);
    expect(isBillingCopyClean(BILLING_REMINDER_TITLE)).toBe(true);
    expect(isBillingCopyClean(BILLING_REMINDER_BODY)).toBe(true);
  });

  it("flags billing words as unclean (built from fragments)", () => {
    expect(isBillingCopyClean("Your free " + "trial ends soon")).toBe(false);
    expect(isBillingCopyClean("Keep " + "Plus")).toBe(false);
    expect(isBillingCopyClean("you'll be " + "charged")).toBe(false);
    expect(isBillingCopyClean("manage your " + "subscription")).toBe(false);
    expect(isBillingCopyClean("the " + "price is")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Pure timing helpers.
// ---------------------------------------------------------------------------
describe("trialReminderInstant / shiftOutOfQuietHours", () => {
  it("is trialEndsAt − 1 day when that instant is outside quiet hours", () => {
    const trialEndsAt = at(2026, 0, 20, 12, 0); // Jan 20, 12:00 (daytime)
    const nowMs = at(2026, 0, 15, 9, 0);
    expect(trialReminderInstant(trialEndsAt, QUIET, nowMs)).toBe(
      trialEndsAt - ONE_DAY_MS,
    );
  });

  it("shifts an in-quiet-hours remindAt forward to the window end (nearest allowed)", () => {
    // remindAt at 06:00 sits inside 20:00->07:00 -> shift to 07:00 the same day.
    const inQuiet = at(2026, 0, 19, 6, 0);
    expect(shiftOutOfQuietHours(inQuiet, QUIET)).toBe(at(2026, 0, 19, 7, 0));

    // remindAt at 22:00 sits inside the window -> next day 07:00.
    const lateNight = at(2026, 0, 19, 22, 0);
    expect(shiftOutOfQuietHours(lateNight, QUIET)).toBe(at(2026, 0, 20, 7, 0));

    // a daytime instant is returned unchanged.
    const daytime = at(2026, 0, 19, 12, 0);
    expect(shiftOutOfQuietHours(daytime, QUIET)).toBe(daytime);
  });

  it("returns null when the trial is already <1 day out (never nags late)", () => {
    const trialEndsAt = at(2026, 0, 20, 12, 0);
    const nowMs = at(2026, 0, 19, 13, 0); // remindAt (Jan 19 12:00) already passed
    expect(trialReminderInstant(trialEndsAt, QUIET, nowMs)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Native scheduling contract.
// ---------------------------------------------------------------------------
describe("scheduleTrialEndingReminder", () => {
  it("schedules exactly ONE DATE-trigger notification with the billing kind + generic copy", async () => {
    const trialEndsAt = at(2026, 0, 20, 12, 0);
    const nowMs = at(2026, 0, 15, 9, 0);
    const id = await scheduleTrialEndingReminder(trialEndsAt, QUIET, nowMs);

    expect(id).not.toBeNull();
    expect(scheduleMock).toHaveBeenCalledTimes(1);

    const req = scheduleMock.mock.calls[0][0] as any;
    expect(req.content.title).toBe(BILLING_REMINDER_TITLE);
    expect(req.content.body).toBe(BILLING_REMINDER_BODY);
    expect(req.content.data.kind).toBe(BILLING_REMINDER_DATA_KIND);
    expect(req.trigger.type).toBe("date");
    expect(req.trigger.date).toBe(trialEndsAt - ONE_DAY_MS);

    // exactly one billing reminder is now scheduled
    const billing = getAll().filter((n) => n.content.data.kind === BILLING_REMINDER_DATA_KIND);
    expect(billing).toHaveLength(1);
  });

  it("shifts the DATE trigger out of quiet hours", async () => {
    const trialEndsAt = at(2026, 0, 20, 6, 0); // remindAt = Jan 19 06:00 (in quiet)
    const nowMs = at(2026, 0, 15, 9, 0);
    await scheduleTrialEndingReminder(trialEndsAt, QUIET, nowMs);
    const req = scheduleMock.mock.calls[0][0] as any;
    expect(req.trigger.date).toBe(at(2026, 0, 19, 7, 0));
  });

  it("schedules NOTHING when the trial is already <1 day out", async () => {
    const trialEndsAt = at(2026, 0, 20, 12, 0);
    const nowMs = at(2026, 0, 19, 13, 0);
    const id = await scheduleTrialEndingReminder(trialEndsAt, QUIET, nowMs);
    expect(id).toBeNull();
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it("is idempotent — re-scheduling cancels the stale one (no duplicates)", async () => {
    const trialEndsAt = at(2026, 0, 20, 12, 0);
    const nowMs = at(2026, 0, 15, 9, 0);
    await scheduleTrialEndingReminder(trialEndsAt, QUIET, nowMs);
    await scheduleTrialEndingReminder(trialEndsAt, QUIET, nowMs);
    const billing = getAll().filter((n) => n.content.data.kind === BILLING_REMINDER_DATA_KIND);
    expect(billing).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Selective cancel — never disturbs routine reminders.
// ---------------------------------------------------------------------------
describe("cancelTrialEndingReminder", () => {
  it("cancels ONLY the billing reminder, leaving routine reminders intact", async () => {
    // simulate an already-scheduled ROUTINE reminder (different data.kind)
    await Notifications.scheduleNotificationAsync({
      content: { title: "Tiny Bubbles 🫧", body: "Morning routine", data: { kind: "tb.reminder" } },
      trigger: { type: "daily", hour: 7, minute: 0 },
    } as any);

    const trialEndsAt = at(2026, 0, 20, 12, 0);
    const nowMs = at(2026, 0, 15, 9, 0);
    await scheduleTrialEndingReminder(trialEndsAt, QUIET, nowMs);
    expect(getAll()).toHaveLength(2);

    await cancelTrialEndingReminder();

    const remaining = getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].content.data.kind).toBe("tb.reminder");
  });
});
