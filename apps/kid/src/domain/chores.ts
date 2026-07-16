/**
 * src/domain/chores.ts — pure rotation resolver for shared/rotating chores
 * (multi-child §3.5). RN-free, deterministic, `now`/`tz` passed in — DST-safe and
 * web-safe (no device clock). This is DATE MATH, not an "AI assignment / suggestion
 * engine": rotation is `mod` arithmetic over whole local days / weeks / a completion
 * counter, so there is ZERO AI anywhere on this path (00-SYNTHESIS §4 / multi-child §6).
 *
 * Anti-shame: rotation is "whose turn," never punishment. A time-based cadence
 * (daily/weekly) advances on schedule regardless of completion, so a child never
 * gets "stuck" holding a chore as a penalty; `perCompletion` has an always-available
 * manual "pass to next" (multi-child §6). The materialised Task carries NO shame-
 * bearing field — it is a normal Task run through the shipped forgiving loop.
 */
import { diffDays, isoDay } from "./dates";
import type { IsoDay, SharedChore, Task } from "./types";

// ---------------------------------------------------------------------------
// Anchor arithmetic (pure). Both inputs collapse to already-localized calendar
// days, so DST never yields a fractional/off-by-one gap (see dates.diffDays).
// ---------------------------------------------------------------------------

/** Whole local days from `anchorDay` → today (floored at 0 so a future anchor never rewinds). */
export function daysSinceAnchor(anchorDay: IsoDay, now: number, tz: string): number {
  return Math.max(0, diffDays(isoDay(now, tz), anchorDay));
}

/** Whole local weeks from `anchorDay` → today (`floor(days / 7)`). */
export function weeksSinceAnchor(anchorDay: IsoDay, now: number, tz: string): number {
  return Math.floor(daysSinceAnchor(anchorDay, now, tz) / 7);
}

// ---------------------------------------------------------------------------
// Holder resolution. Every branch is modulo-safe for ANY roster length via the
// `((x % n) + n) % n` idiom (a defensive true-modulo even if a caller ever passes
// a negative offset). An empty roster is inactive (→ -1 / null).
// ---------------------------------------------------------------------------

/** The roster INDEX whose turn it is now (pure). Empty roster => -1. */
export function currentHolderIndex(chore: SharedChore, now: number, tz: string): number {
  const n = chore.childIds.length;
  if (n === 0) return -1;
  const manual = chore.manualHolderIndex ?? 0;
  const mod = (x: number) => ((x % n) + n) % n;
  switch (chore.cadence) {
    case "manual":
      return mod(manual);
    case "perCompletion":
      return mod(chore.completionAdvanceCount + manual);
    case "weekly":
      return mod(weeksSinceAnchor(chore.rotationAnchorDay, now, tz) + manual);
    case "daily":
    default:
      return mod(daysSinceAnchor(chore.rotationAnchorDay, now, tz) + manual);
  }
}

/** The child id whose turn it is now, or null when the roster is empty. */
export function currentHolderId(chore: SharedChore, now: number, tz: string): string | null {
  const i = currentHolderIndex(chore, now, tz);
  return i < 0 ? null : chore.childIds[i] ?? null;
}

// ---------------------------------------------------------------------------
// Weekday scheduling — mirrors tasks.isRoutineScheduledToday's semantics so a
// weekday-only chore never surfaces on the weekend. Replicated (not imported) to
// keep this module self-contained + dependency-light (same trick tasks.ts uses).
// ---------------------------------------------------------------------------

/** 0=Sunday..6=Saturday for `now` in the child's timezone (via the localized ISO day). */
function dayOfWeekInTz(now: number, tz: string): number {
  const iso = isoDay(now, tz); // 'YYYY-MM-DD' (already child-tz-localized)
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Whether the chore is scheduled to be active today (empty daysOfWeek => every day). */
export function isChoreScheduledToday(chore: SharedChore, now: number, tz: string): boolean {
  const days = chore.schedule.daysOfWeek;
  if (chore.schedule.oneOff) return chore.schedule.oneOff === isoDay(now, tz);
  if (days.length === 0) return true;
  return days.includes(dayOfWeekInTz(now, tz));
}

/** A chore is an ACTIVE rotation only when it is on + has a roster of at least two. */
export function isChoreActive(chore: SharedChore): boolean {
  return chore.active && chore.childIds.length >= 2;
}

// ---------------------------------------------------------------------------
// Materialisation — build the per-child Task for the current holder. PURE (no
// store write): the gameplay reconciler calls this and places the result into the
// holder's daypart routine (or standalone). The result is an ORDINARY Task that
// flows through TaskRunner → completeStep, so it earns tokens + celebration +
// companion nurture identically to a seeded task (multi-child §2.3).
// ---------------------------------------------------------------------------

/** Build the current holder's chore Task for today (idempotency key = choreId + choreHolderDay). */
export function choreTaskFor(
  chore: SharedChore,
  holderId: string,
  taskId: string,
  now: number,
  tz: string,
): Task {
  return {
    id: taskId,
    childId: holderId,
    templateId: chore.templateId,
    routineId: null,
    order: 0,
    label: { ...chore.label },
    verification: { mode: "none", required: false },
    tokenValue: Math.max(1, chore.tokenValue),
    deadline: "today",
    schedule: { ...chore.schedule, daysOfWeek: [...chore.schedule.daysOfWeek] },
    status: "todo",
    createdAt: now,
    updatedAt: now,
    archived: false,
    choreId: chore.id,
    choreHolderDay: isoDay(now, tz),
  };
}

// ---------------------------------------------------------------------------
// Rotation preview — the next-N active days for RotationPreview (multi-child §2.2).
// Pure; walks forward day-by-day and resolves the holder for each SCHEDULED day.
// ---------------------------------------------------------------------------

export interface RotationPreviewEntry {
  day: IsoDay;
  holderId: string | null;
}

/** The next `days` SCHEDULED-active days with their resolved holder (pure). */
export function rotationPreview(
  chore: SharedChore,
  startNow: number,
  tz: string,
  days: number,
): RotationPreviewEntry[] {
  const out: RotationPreviewEntry[] = [];
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  // Scan a bounded window (up to 4 weeks out) so a weekday-only chore still fills
  // the preview without ever looping unbounded.
  const maxScan = Math.max(days, 1) * 7 + 28;
  for (let i = 0; i < maxScan && out.length < days; i += 1) {
    const at = startNow + i * ONE_DAY_MS;
    if (!isChoreScheduledToday(chore, at, tz)) continue;
    out.push({ day: isoDay(at, tz), holderId: currentHolderId(chore, at, tz) });
  }
  return out;
}
