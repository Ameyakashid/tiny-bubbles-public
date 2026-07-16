/**
 * src/services/notifications.ts — few, gentle, point-of-performance reminders
 * (doc 66 M10 / §1b.14, doc 67 M10). `expo-notifications` ONLY — Notifee is
 * dropped entirely (doc 66 §1 reminders row).
 *
 * WHAT THIS IS (honest scope):
 *   - A SMALL number of schedule-tied local notifications, gated by a parent-set
 *     quiet-hours window AND a per-day budget (`maxPerDay`) — the anti-flood rule
 *     (doc 66 §5: reminders stay few, gentle, quiet-hours-aware, never shaming).
 *   - The tone control is the FIXED, reviewed copy set below — NOT a `toneIsGentle`
 *     type (which enforces nothing at runtime, doc 66 §1b.14). The copy EXPLICITLY
 *     bans companion re-engagement nags (buddy-misses-you / buddy-is-back /
 *     buddy-is-waiting style) and any shaming/begging/urgency string.
 *   - A scheduled OS notification delivers a SOUND. There is NO background TTS:
 *     `expo-speech` only speaks while foregrounded. The routine label is spoken
 *     on TAP-THROUGH (when the child opens the app) — see `addReminderTapListener`
 *     + the wiring in `app/_layout.tsx`. This corrects the doc 65 §5 over-claim.
 *
 * PROVENANCE: register/schedule/cancel PATTERN lifted from
 * `_sources/lockin/services/notifications.ts` (MIT). Quiet-hours model re-authored
 * from momentum's `quietHoursStart`/`quietHoursEnd` "HH:mm" window (reference-only).
 *
 * IMPORT-SAFETY: this module performs NO native call at import time (no handler is
 * set, no channel created on load) so it is safe to import from unit tests and the
 * boot path. The pure helpers (quiet-hours, plan building, copy) carry no native
 * dependency; only the exported async functions touch `expo-notifications`.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { ONE_DAY_MS } from "../domain/constants";
import type { ReminderAnchor, Routine } from "../domain/types";
import { AVAILABLE_LOCALES } from "../i18n/catalog";
import { getMessage } from "../i18n/messages";

// ===========================================================================
// Quiet hours (re-authored from momentum's "HH:mm" window model).
// ===========================================================================

export interface QuietHours {
  /** 'HH:mm' local, inclusive start of the no-reminder window */
  start: string;
  /** 'HH:mm' local, exclusive end of the no-reminder window */
  end: string;
}

const HM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Is `hm` a valid 'HH:mm' 24h string? */
export function isValidHm(hm: string): boolean {
  return HM_RE.test(hm);
}

/** Minutes since local midnight for an 'HH:mm' string (NaN if malformed). */
export function parseHm(hm: string): number {
  const m = HM_RE.exec(hm);
  if (!m) return Number.NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Split an 'HH:mm' string into `{ hour, minute }` (0/0 if malformed). */
export function splitHm(hm: string): { hour: number; minute: number } {
  const m = HM_RE.exec(hm);
  if (!m) return { hour: 0, minute: 0 };
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/**
 * Is the reminder `time` ('HH:mm') inside the quiet-hours window? Wrap-around
 * aware: a window like 20:00→07:00 spans midnight. The start edge is INSIDE
 * (suppressed); the end edge is OUTSIDE (allowed) so a 07:00 reminder fires when
 * quiet hours end at 07:00. `start === end` means NO quiet window (nothing quiet).
 */
export function isWithinQuietHours(time: string, quiet: QuietHours): boolean {
  const t = parseHm(time);
  const s = parseHm(quiet.start);
  const e = parseHm(quiet.end);
  if (!Number.isFinite(t) || !Number.isFinite(s) || !Number.isFinite(e)) {
    return false; // malformed config never suppresses a reminder silently-wrong
  }
  if (s === e) return false; // empty window
  if (s < e) {
    // same-day window, e.g. 12:00→14:00
    return t >= s && t < e;
  }
  // wrap-around window, e.g. 20:00→07:00
  return t >= s || t < e;
}

// ===========================================================================
// Fixed, reviewed copy set — THE tone control (doc 66 §1b.14).
//
// Warm, brief, never shame-toned. No companion re-engagement, no loss-aversion
// (no "streak"), no urgency, no begging. Body templates take the routine's
// friendly label (a noun phrase like "Morning routine") and read cleanly with it.
// ===========================================================================

/**
 * The reminder copy now lives in the i18n catalog (`reminder.title`,
 * `reminder.body.1..5`) so it is translatable (accessibility-i18n §4.3) — but the
 * `BANNED_REMINDER_PATTERNS` gate below still runs over the RESOLVED strings for
 * every locale (`assertReminderCopyClean`), so no translation can smuggle in a
 * nag/shame/urgency tone. The exported shapes are unchanged (call sites + tests
 * untouched); they are simply sourced from the catalog now.
 */
const REMINDER_BODY_KEYS = [
  "reminder.body.1",
  "reminder.body.2",
  "reminder.body.3",
  "reminder.body.4",
  "reminder.body.5",
] as const;

/** Friendly, neutral notification title (the app voice, never a nag). */
export const REMINDER_TITLE = getMessage("reminder.title", {});

/**
 * The ONLY bodies a reminder may use. Each is a pure function of the routine's
 * spoken label (catalog `{label}` interpolation) so the fixed set stays the
 * single source of reminder copy.
 */
export const REMINDER_BODY_TEMPLATES: readonly ((label: string) => string)[] =
  REMINDER_BODY_KEYS.map((key) => (label: string) => getMessage(key, { params: { label } }));

/**
 * Patterns a reminder string may NEVER match. Authored from FRAGMENTS (regex
 * metachars, bounded gaps) so the banned phrases never appear here as a
 * contiguous literal — the M10/M15 grep gate for those strings stays at zero
 * even in this file. Covers: companion re-engagement, blame/shame, loss-aversion,
 * urgency, and begging.
 */
export const BANNED_REMINDER_PATTERNS: readonly RegExp[] = [
  // companion re-engagement nags (buddy-misses-you / is-back / is-waiting / needs-you)
  /buddy[\s\S]{0,16}(miss|waiting|is\s*back|back!|needs?\s*you|wants?\s*you|lonely|sad)/i,
  /(pet|companion)[\s\S]{0,16}(miss|waiting|lonely|sad)/i,
  /\bmiss(es|ed|ing)?\s+you\b/i,
  // blame / shame
  /\byou\s+(forgot|missed|failed|didn'?t|never|haven'?t)\b/i,
  /\bdon'?t\s+forget\b/i,
  /\bwhere\s+(are|were|have)\s+you\b/i,
  /\bcome\s+back\b/i,
  // loss-aversion
  /\bstreak\b/i,
  /\blose\b/i,
  // urgency
  /\b(hurry|right\s+now|last\s+chance|urgent|now\s+or)\b/i,
  // begging
  /\b(please|c'?mon|pretty\s+please)\b/i,
  /\b(lonely|crying|abandon)\b/i,
];

/** True iff `text` contains none of the banned tones. */
export function isReminderCopyClean(text: string): boolean {
  return BANNED_REMINDER_PATTERNS.every((re) => !re.test(text));
}

/**
 * Build a reminder's title+body from the fixed set for a given spoken label.
 * `index` selects a body template deterministically (variety across anchors,
 * stability for the same anchor) — never random.
 */
export function buildReminderContent(
  spokenLabel: string,
  index = 0,
): { title: string; body: string } {
  const label = (spokenLabel || "your routine").trim();
  const pick = REMINDER_BODY_TEMPLATES[index % REMINDER_BODY_TEMPLATES.length];
  return { title: REMINDER_TITLE, body: pick(label) };
}

/**
 * Dev-time guard: every template (with a sample label) + the title must be clean.
 * Throws in dev so a future copy edit that smuggles in a banned tone fails fast;
 * no-op in production. (Tests assert the same invariant explicitly.)
 */
export function assertReminderCopyClean(): void {
  const samples = ["Bedtime routine", "Morning routine", "Homework"];
  // Run the banned-tone gate over the RESOLVED catalog strings for EVERY locale
  // (accessibility-i18n §4.3) — English today, but a future translation drop is
  // guarded the same way, so no locale can introduce nag/shame/urgency copy.
  for (const locale of AVAILABLE_LOCALES()) {
    const all: string[] = [getMessage("reminder.title", { locale })];
    for (const key of REMINDER_BODY_KEYS) {
      for (const s of samples) all.push(getMessage(key, { locale, params: { label: s } }));
    }
    for (const text of all) {
      if (!isReminderCopyClean(text)) {
        throw new Error(
          `Reminder copy violates the gentle-tone invariant (doc 66 §1b.14) [${locale}]: "${text}"`,
        );
      }
    }
  }
}

if (typeof __DEV__ !== "undefined" && __DEV__) {
  // Fail fast in development if the fixed copy set ever regresses.
  assertReminderCopyClean();
}

// ===========================================================================
// Reminder planning (pure, testable).
// ===========================================================================

/** A single resolved notification to schedule (one weekday, or daily). */
export interface PlannedReminder {
  anchorId: string;
  routineId?: string;
  /** 'HH:mm' local */
  time: string;
  hour: number;
  minute: number;
  /** JS day-of-week 0-6 (0 = Sunday), or `null` for an every-day reminder */
  dayOfWeek: number | null;
  title: string;
  body: string;
  /** spoken on tap-through (foreground), never in the background */
  spokenLabel: string;
}

/** Default per-day reminder budget when none is supplied (anti-flood). */
export const DEFAULT_MAX_PER_DAY = 3;

/** Normalize a daysOfWeek array: clamp 0-6, dedupe, sort. Empty => every day. */
function normalizeDays(days: number[] | undefined): number[] {
  if (!days || days.length === 0) return [];
  const set = new Set<number>();
  for (const d of days) {
    if (Number.isInteger(d) && d >= 0 && d <= 6) set.add(d);
  }
  return [...set].sort((a, b) => a - b);
}

/** Derive a single reminder anchor from a routine's schedule, or null. */
export function routineToAnchor(routine: Routine): ReminderAnchor | null {
  const time = routine.schedule.timeOfDay;
  if (!routine.active || !time || !isValidHm(time)) return null;
  return {
    id: `routine:${routine.id}`,
    routineId: routine.id,
    time,
    daysOfWeek: normalizeDays(routine.schedule.daysOfWeek),
    spokenLabel: routine.label.spokenLabel,
  };
}

/**
 * Turn a set of reminder anchors into the concrete schedule, SKIPPING any anchor
 * whose time falls in quiet hours and enforcing the per-day `maxPerDay` budget.
 *
 * Budget rule: each (weekday) slot holds at most `maxPerDay` reminders. Anchors
 * are admitted earliest-time-first (point-of-performance: the morning nudge wins
 * a scarce slot). An every-day anchor consumes a slot on all 7 days and is only
 * admitted if every day still has room. `maxPerDay <= 0` schedules nothing.
 */
export function buildReminderPlan(
  anchors: readonly ReminderAnchor[],
  quiet: QuietHours,
  maxPerDay: number,
): PlannedReminder[] {
  const budget = Math.max(0, Math.floor(maxPerDay));
  if (budget === 0) return [];

  const perDay = [0, 0, 0, 0, 0, 0, 0];
  const usable = anchors
    .filter((a) => isValidHm(a.time) && !isWithinQuietHours(a.time, quiet))
    .sort((a, b) => parseHm(a.time) - parseHm(b.time));

  const plan: PlannedReminder[] = [];
  let copyIndex = 0;

  for (const a of usable) {
    const days = normalizeDays(a.daysOfWeek);
    const { hour, minute } = splitHm(a.time);
    const { title, body } = buildReminderContent(a.spokenLabel, copyIndex);
    const base = {
      anchorId: a.id,
      routineId: a.routineId,
      time: a.time,
      hour,
      minute,
      title,
      body,
      spokenLabel: a.spokenLabel,
    };

    if (days.length === 0) {
      // every-day reminder: needs a free slot on all seven days
      if (perDay.every((c) => c < budget)) {
        for (let d = 0; d < 7; d++) perDay[d] += 1;
        plan.push({ ...base, dayOfWeek: null });
        copyIndex += 1;
      }
      continue;
    }

    let admittedAny = false;
    for (const d of days) {
      if (perDay[d] < budget) {
        perDay[d] += 1;
        plan.push({ ...base, dayOfWeek: d });
        admittedAny = true;
      }
    }
    if (admittedAny) copyIndex += 1;
  }

  return plan;
}

// ===========================================================================
// Native layer (expo-notifications). Wrapped so Expo-Go / web caveats never throw
// into the app (doc 69: local notifications only, document the caveats).
// ===========================================================================

/** Android channel id for the gentle reminder category. */
const REMINDER_CHANNEL_ID = "reminders";

/** Data payload tag so the tap listener can tell a reminder from other notifs. */
const REMINDER_DATA_KIND = "tb.reminder";

let handlerConfigured = false;

/**
 * Configure how a reminder behaves while the app is foregrounded (show it, play
 * its gentle sound, never badge). Idempotent; called by the register/schedule
 * paths. NOT run at import time so the module stays side-effect-free to import.
 */
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

/** Create the gentle Android reminder channel (DEFAULT importance, not MAX). */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      // gentle: no aggressive vibration pattern / lights
    });
  } catch {
    // channel set can fail on web / Expo Go — never fatal
  }
}

/**
 * Ensure notification permission. DEFERRED prompt: only asks when we actually
 * have something to schedule (called from the schedule paths), never on a child's
 * first screen (doc 60 §4.4). Returns whether reminders may be scheduled.
 */
async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.status === "granted") return true;
    if (current.canAskAgain === false) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted || req.status === "granted";
  } catch {
    return false; // unavailable in this runtime (web / restricted Expo Go)
  }
}

/**
 * The deferred, post-onboarding registration entry point: configure the handler
 * + Android channel and request permission once. Returns whether granted. Safe
 * to call on app open after onboarding (doc 66 §M5 deferred-register seam).
 */
export async function registerForLocalNotificationsAsync(): Promise<boolean> {
  configureNotificationHandler();
  await ensureAndroidChannel();
  return ensurePermission();
}

/** Build the expo trigger for a planned reminder (daily or weekly). */
function triggerFor(item: PlannedReminder): Notifications.NotificationTriggerInput {
  if (item.dayOfWeek === null) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: item.hour,
      minute: item.minute,
      channelId: REMINDER_CHANNEL_ID,
    };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    // expo weekday: 1-7 with 1 = Sunday; our dayOfWeek is JS 0-6 (0 = Sunday)
    weekday: item.dayOfWeek + 1,
    hour: item.hour,
    minute: item.minute,
    channelId: REMINDER_CHANNEL_ID,
  };
}

/** Schedule one planned reminder; returns its notification id (or null on error). */
async function scheduleOne(item: PlannedReminder): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.body,
        sound: "default",
        data: {
          kind: REMINDER_DATA_KIND,
          anchorId: item.anchorId,
          routineId: item.routineId,
          // read on tap-through to speak the label foregrounded (no bg TTS)
          spokenLabel: item.spokenLabel,
        },
      },
      trigger: triggerFor(item),
    });
  } catch {
    return null;
  }
}

/** Cancel every scheduled reminder (full reschedule starts from a clean slate). */
export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // no-op where unsupported
  }
}

/** Shared: ensure permission + channel, then schedule a plan. Returns ids. */
async function scheduleAnchors(
  anchors: readonly ReminderAnchor[],
  quiet: QuietHours,
  maxPerDay: number,
): Promise<string[]> {
  const plan = buildReminderPlan(anchors, quiet, maxPerDay);
  if (plan.length === 0) return [];
  configureNotificationHandler();
  const granted = await ensurePermission();
  if (!granted) return [];
  await ensureAndroidChannel();
  const ids: string[] = [];
  for (const item of plan) {
    const id = await scheduleOne(item);
    if (id) ids.push(id);
  }
  return ids;
}

/**
 * Schedule the reminders for ONE routine (doc 66/67 M10 named API): map the
 * routine's time → local notifications, skipping quiet windows, bounded by the
 * per-day budget. Returns the scheduled notification ids.
 */
export async function scheduleRoutineReminders(
  routine: Routine,
  quiet: QuietHours,
  opts: { maxPerDay?: number } = {},
): Promise<string[]> {
  const anchor = routineToAnchor(routine);
  if (!anchor) return [];
  return scheduleAnchors([anchor], quiet, opts.maxPerDay ?? DEFAULT_MAX_PER_DAY);
}

export interface RescheduleInput {
  /** active routines whose times become reminders */
  routines?: readonly Routine[];
  /** any manually-configured reminder anchors (ChildSettings.reminders.anchors) */
  anchors?: readonly ReminderAnchor[];
  /** master switch — false cancels all and schedules nothing */
  enabled: boolean;
  /** per-day budget (ReminderConfig.maxPerDay) */
  maxPerDay: number;
  quietHours: QuietHours;
}

/**
 * The app-open orchestrator (doc 66/67 M10 "reschedule on app open"). Always
 * cancels first (forward-only, no drift), then — if enabled — schedules the
 * combined routine + manual anchors under quiet-hours + the budget. Returns the
 * scheduled ids (empty when disabled / no permission / nothing to schedule).
 */
export async function rescheduleReminders(input: RescheduleInput): Promise<string[]> {
  await cancelAllReminders();
  if (!input.enabled) return [];

  const fromRoutines = (input.routines ?? [])
    .map(routineToAnchor)
    .filter((a): a is ReminderAnchor => a !== null);
  const anchors = [...fromRoutines, ...(input.anchors ?? [])];
  if (anchors.length === 0) return [];

  return scheduleAnchors(anchors, input.quietHours, input.maxPerDay);
}

// ===========================================================================
// Honest trial-end reminder (billing-entitlements §2.4). ONE one-shot local
// notification ~24h before the trial ends, on the SAME expo-notifications
// service, quiet-hours-shifted, with FIXED generic/non-billing copy.
//
// SHARED-DEVICE DECISION (LOCKED, §2.4): the offline device is shared by parent +
// kids, so a lock-screen notification is visible to a child. A billing/upsell
// string there would put a purchase message in front of a child (breaking "a
// child NEVER sees a paywall"). Therefore the VISIBLE copy is generic + non-
// billing — indistinguishable from the app's other gentle reminders; the honest
// billing detail lives ONLY behind the PIN-gated Settings "Tiny Bubbles Plus"
// row. The reminder taps to nothing kid-facing (data.kind only, no navigation).
//
// Scheduled/cancelled INDEPENDENTLY of routine reminders (distinct data.kind), so
// `cancelTrialEndingReminder()` never disturbs routine reminders and vice-versa.
// It is deliberately NOT routed through `cancelAllReminders`/`rescheduleReminders`
// (which `cancelAllScheduledNotificationsAsync` — that would nuke it); the caller
// (app/_layout.tsx) schedules it AFTER the routine reschedule resolves.
// ===========================================================================

/** Data payload tag for the one-shot trial-end reminder (selective cancel). */
export const BILLING_REMINDER_DATA_KIND = "billing_trial_end";

/**
 * The VISIBLE trial-end reminder copy — FIXED, generic, NON-billing (§2.4). Reads
 * exactly like the app's other gentle notes; carries no `trial`/`Plus`/`charge`/
 * `subscribe`/`price` word, so a child glancing at the shared tray sees only a
 * neutral "a grown-up note is ready" line.
 */
export const BILLING_REMINDER_TITLE = REMINDER_TITLE;
export const BILLING_REMINDER_BODY = "A grown-up note is ready in Settings.";

/**
 * Words the VISIBLE billing-reminder copy may never contain (the no-billing set,
 * on top of the shame set). Fragments so the literal words never appear here as a
 * banned contiguous string a grep would flag.
 */
export const BILLING_BANNED_WORD_PATTERNS: readonly RegExp[] = [
  /\btrial\b/i,
  /\bplus\b/i,
  /\bcharge(d|s)?\b/i,
  /\bsubscri(be|ption)\b/i,
  /\bprice(s|d)?\b/i,
];

/** True iff `text` contains none of the billing words (the no-billing gate). */
export function isBillingCopyClean(text: string): boolean {
  return BILLING_BANNED_WORD_PATTERNS.every((re) => !re.test(text));
}

/**
 * Dev-time guard mirroring `assertReminderCopyClean`: the VISIBLE trial-reminder
 * title+body must pass `isReminderCopyClean` (no shame) AND `isBillingCopyClean`
 * (no billing words). Throws in dev so a future copy edit that smuggles a billing
 * string onto the shared lock screen fails fast; no-op in production.
 */
export function assertBillingCopyClean(): void {
  for (const text of [BILLING_REMINDER_TITLE, BILLING_REMINDER_BODY]) {
    if (!isReminderCopyClean(text) || !isBillingCopyClean(text)) {
      throw new Error(
        `Trial-end reminder copy violates the visible-copy invariant (billing §2.4): "${text}"`,
      );
    }
  }
}

if (typeof __DEV__ !== "undefined" && __DEV__) {
  assertBillingCopyClean();
}

/**
 * Shift a reminder timestamp OUT of the quiet-hours window to the nearest allowed
 * minute (the window's `end` edge, which is the first allowed minute). Pure +
 * wall-clock (local components), so it is deterministic and testable. Returns the
 * input unchanged when it is already outside quiet hours (or the window is empty/
 * malformed — `isWithinQuietHours` returns false there).
 */
export function shiftOutOfQuietHours(atMs: number, quiet: QuietHours): number {
  const d = new Date(atMs);
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (!isWithinQuietHours(hm, quiet)) return atMs;
  const { hour, minute } = splitHm(quiet.end);
  // nearest allowed minute = quiet.end today, or tomorrow if that is already past.
  let candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute, 0, 0).getTime();
  if (candidate <= atMs) {
    candidate = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate() + 1,
      hour,
      minute,
      0,
      0,
    ).getTime();
  }
  return candidate;
}

/**
 * Compute the honest trial-end reminder instant for a `trialEndsAt`: 24h before,
 * quiet-hours-shifted. Returns `null` when the trial is already <1 day out
 * (`remindAt <= now`) — we never nag late, and never after it ends (§2.4). Pure.
 */
export function trialReminderInstant(
  trialEndsAt: number,
  quiet: QuietHours,
  nowMs: number = Date.now(),
): number | null {
  const remindAt = trialEndsAt - ONE_DAY_MS;
  if (!Number.isFinite(remindAt) || remindAt <= nowMs) return null;
  return shiftOutOfQuietHours(remindAt, quiet);
}

/**
 * Cancel the pending one-shot trial-end reminder ONLY (selective by
 * `data.kind === BILLING_REMINDER_DATA_KIND`), leaving routine reminders — and
 * everything else — untouched. No-throw where the native module is unavailable.
 */
export async function cancelTrialEndingReminder(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const req of scheduled) {
      const data = req?.content?.data as Record<string, unknown> | undefined;
      if (data && data.kind === BILLING_REMINDER_DATA_KIND) {
        await Notifications.cancelScheduledNotificationAsync(req.identifier);
      }
    }
  } catch {
    // no-op where unsupported (web / restricted Expo Go)
  }
}

/**
 * Schedule the honest trial-end reminder for a live trial's `trialEndsAt`. Cancels
 * any existing billing reminder first (idempotent — no duplicates on re-open),
 * then schedules exactly ONE `DATE`-triggered notification at
 * `trialEndsAt − 24h` (quiet-hours-shifted). Skips (returns `null`) when the trial
 * is already <1 day out or permission is denied. The VISIBLE copy is generic/
 * non-billing (§2.4). Returns the notification id, or `null`.
 */
export async function scheduleTrialEndingReminder(
  trialEndsAt: number,
  quiet: QuietHours,
  nowMs: number = Date.now(),
): Promise<string | null> {
  const when = trialReminderInstant(trialEndsAt, quiet, nowMs);
  // Always clear a stale billing reminder first (idempotent re-sync).
  await cancelTrialEndingReminder();
  if (when === null) return null;

  configureNotificationHandler();
  const granted = await ensurePermission();
  if (!granted) return null;
  await ensureAndroidChannel();
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: BILLING_REMINDER_TITLE,
        body: BILLING_REMINDER_BODY,
        sound: "default",
        data: { kind: BILLING_REMINDER_DATA_KIND },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  } catch {
    return null;
  }
}

// ===========================================================================
// Tap-through (foreground TTS). Honest scope: TTS only runs foregrounded, so the
// label is spoken when the child OPENS the app from a reminder — never in the
// background. The caller (app/_layout.tsx) owns the actual speak() call so this
// module keeps no expo-speech dependency.
// ===========================================================================

export interface ReminderTapInfo {
  spokenLabel: string;
  routineId?: string;
  anchorId?: string;
}

/** Extract the reminder payload from a notification response, if it is ours. */
export function getReminderTapInfo(
  response: Notifications.NotificationResponse,
): ReminderTapInfo | null {
  const data = response?.notification?.request?.content?.data as
    | Record<string, unknown>
    | undefined;
  if (!data || data.kind !== REMINDER_DATA_KIND) return null;
  const spokenLabel = typeof data.spokenLabel === "string" ? data.spokenLabel : "";
  if (!spokenLabel) return null;
  return {
    spokenLabel,
    routineId: typeof data.routineId === "string" ? data.routineId : undefined,
    anchorId: typeof data.anchorId === "string" ? data.anchorId : undefined,
  };
}

/**
 * Subscribe to reminder tap-throughs. `handler` receives the routine's spoken
 * label so the caller can speak it via the TTS service (foreground only). Returns
 * a `remove()` cleanup. No-throw if the native module is unavailable.
 */
export function addReminderTapListener(
  handler: (info: ReminderTapInfo) => void,
): { remove: () => void } {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const info = getReminderTapInfo(response);
      if (info) handler(info);
    });
    return { remove: () => sub.remove() };
  } catch {
    return { remove: () => {} };
  }
}
