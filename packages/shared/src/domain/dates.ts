/**
 * domain/dates.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] timezone-aware calendar-day helpers (RN-free, pure).
 *
 * Ports the momentum `streaks.ts` day math (doc 62 §10): a "day" is the calendar
 * day in the CHILD's timezone, not the device's. Using `date-fns` v4 +
 * `date-fns-tz` v3 (the versions pinned in this repo, doc 66 dependency note).
 *
 * All functions are pure and deterministic — every "now" is passed in, so the
 * streak/rollover logic is fully unit-testable with no device clock.
 */
import { differenceInCalendarDays, getDayOfYear, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import type { Daypart, DaypartWindows, IsoDay } from "./types";

/**
 * The calendar day `'YYYY-MM-DD'` for `ts` (epoch ms) in IANA `timeZone`. This
 * is momentum's `startOfDay(toZonedTime(...))` expressed as an ISO day string —
 * the canonical key for "which day did this happen on" in the child's locale.
 */
export function isoDay(ts: number, timeZone: string): IsoDay {
  return formatInTimeZone(ts, timeZone, "yyyy-MM-dd");
}

/**
 * The ISO-week key `'RRRR-Wnn'` for `ts` (epoch ms) in IANA `timeZone` — the
 * DETERMINISTIC weekly rotation clock for the novelty pipeline (novelty-refresh
 * §3, dates §). `RRRR` is the ISO week-numbering year and `II` the 2-digit ISO
 * week (e.g. `"2026-W27"`). DST-safe / cross-tz-correct: it reuses the same
 * `formatInTimeZone` path as `isoDay`, so the same wall-clock week yields the same
 * key on every device. Pure — `now`/`tz` are passed in, no device clock read.
 */
export function isoWeekKey(ts: number, timeZone: string): string {
  return formatInTimeZone(ts, timeZone, "RRRR-'W'II");
}

/**
 * The day-of-year (1–366) for `ts` (epoch ms) in IANA `timeZone` — the
 * DETERMINISTIC daily "spotlight" clock (novelty-refresh §2.2). Localizes to the
 * child's calendar day first (`isoDay`), then counts the day within its year, so
 * it is stable for the whole local day and identical on every device (no RNG). DST
 * cannot shift it because it operates on the already-localized calendar date.
 */
export function dayOfYear(ts: number, timeZone: string): number {
  return getDayOfYear(parseISO(isoDay(ts, timeZone)));
}

/**
 * Whole calendar days between two ISO day strings (`a - b`), timezone-agnostic
 * because both inputs are already-localized calendar dates. Positive when `a`
 * is later than `b`. Mirrors momentum's `differenceInDays` usage, but on
 * calendar days so DST never produces a fractional/off-by-one gap.
 */
export function diffDays(a: IsoDay, b: IsoDay): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b));
}

// ---------------------------------------------------------------------------
// Daypart engine (doc 70 §A) — the time-driven kid flow keys off these. Pure &
// deterministic: `now`/`tz` are always passed in, so no device clock is read.
// ---------------------------------------------------------------------------

/** Default local-hour boundaries per daypart (parent-tunable later). */
export const DEFAULT_DAYPART_WINDOWS: DaypartWindows = {
  morning: 5,
  afternoon: 12,
  evening: 17,
  night: 21,
};

/** Forward chain used for the "see you this <next>" copy; wraps to morning. */
export const DAYPART_ORDER: Daypart[] = ["morning", "afternoon", "evening", "night"];

/**
 * The local hour (0–23) for `ts` (epoch ms) in IANA `timeZone`. Reuses
 * `formatInTimeZone` with the `'H'` (0–23, no leading zero) token so DST and
 * cross-timezone opens resolve to the child's wall-clock hour.
 */
export function localHour(ts: number, timeZone: string): number {
  return parseInt(formatInTimeZone(ts, timeZone, "H"), 10);
}

/** Bucket a local hour (0–23) into its daypart. `night` wraps past midnight. */
function bucketHour(h: number, w: DaypartWindows): Daypart {
  if (h >= w.night || h < w.morning) return "night";
  if (h >= w.evening) return "evening";
  if (h >= w.afternoon) return "afternoon";
  return "morning";
}

/**
 * The daypart for `now` in the child's `timeZone`. Pure; `night` wraps past
 * midnight so a late-evening open never falls back to morning.
 */
export function getDaypart(
  now: number,
  timeZone: string,
  w: DaypartWindows = DEFAULT_DAYPART_WINDOWS,
): Daypart {
  return bucketHour(localHour(now, timeZone), w);
}

/**
 * Map a routine's `'HH:mm'` anchor to a daypart bucket. This is the fallback
 * used for selection/grouping when `Routine.daypart` is absent (pre-existing
 * persisted routines). An absent/invalid anchor defaults to `morning`.
 */
export function daypartFromSchedule(
  timeOfDay: string | undefined,
  w: DaypartWindows = DEFAULT_DAYPART_WINDOWS,
): Daypart {
  if (!timeOfDay) return "morning";
  const h = parseInt(timeOfDay.split(":")[0] ?? "", 10);
  if (Number.isNaN(h)) return "morning";
  return bucketHour(h, w);
}

/** The next daypart in the forward chain (cycles to `morning` after `night`). */
export function nextDaypart(d: Daypart): Daypart {
  const i = DAYPART_ORDER.indexOf(d);
  return DAYPART_ORDER[(i + 1) % DAYPART_ORDER.length];
}

/**
 * The daypart used for routine SELECTION + completion marking. `night` has no
 * routine list of its own, so a late-evening open resolves against `evening`
 * (doc 70 §A1). The "see you tomorrow" copy is shared by evening + night, so
 * collapsing here keeps selection, the completion marker, and the copy in lockstep
 * (no mismatch where a night-marked daypart never reads back as complete).
 */
export function selectionDaypart(dp: Daypart): Daypart {
  return dp === "night" ? "evening" : dp;
}
