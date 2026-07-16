/**
 * src/domain/timer.ts — the canonical, RN-free visual-transition-timer math
 * (visual-timers §4 CREATE #1; 02-architecture §1.5/§6-C4).
 *
 * A visual transition timer is EXTERNAL SCAFFOLDING for a step/transition — it is
 * NOT a device that "fixes the internal clock." These helpers only compute how
 * much of a step's `timerSeconds` budget is left, anchored to the WALL CLOCK
 * (`now` is always passed in — the codebase's "never trust a native clock" rule),
 * so backgrounding/foregrounding, JS-timer throttling, and resume-after-kill all
 * show the correct remaining time (or a calm empty) with no drift.
 *
 * There is deliberately NO failure/urgency concept here: an elapsed timer is a
 * `remaining === 0` (fraction 0) rested state, never "time's up." A non-positive
 * or non-finite budget is "no timer" (remaining 0 / fraction 0), never a throw.
 *
 * `src/domain/focus.ts` (M-C3) soft-reuses `formatMSS`; do not re-author it there.
 *
 * Pure + unit-testable (no React/RN, no Date.now()).
 */
import type { EpochMs } from "./types";

/** True when a task carries a usable visual-timer budget (positive, finite). */
export function hasVisualTimer(timerSeconds?: number): boolean {
  return typeof timerSeconds === "number" && Number.isFinite(timerSeconds) && timerSeconds > 0;
}

/**
 * Milliseconds left for this step's timer at `now`, clamped to `>= 0`. A
 * non-positive/non-finite budget (or start) yields 0 — the "no timer / rested"
 * sentinel. Recomputed purely from the wall clock, so it is drift-free across a
 * background gap.
 */
export function timerRemainingMs(startedAt: EpochMs, timerSeconds: number, now: EpochMs): number {
  if (!hasVisualTimer(timerSeconds) || !Number.isFinite(startedAt)) return 0;
  const endAt = startedAt + timerSeconds * 1000;
  const remaining = endAt - now;
  return remaining > 0 ? remaining : 0;
}

/**
 * The remaining fraction of the budget in `[0, 1]` (1 = full, 0 = empty), used to
 * drive the depleting bar/wedge. A non-positive/non-finite budget yields 0.
 */
export function timerFraction(startedAt: EpochMs, timerSeconds: number, now: EpochMs): number {
  if (!hasVisualTimer(timerSeconds)) return 0;
  const total = timerSeconds * 1000;
  const f = timerRemainingMs(startedAt, timerSeconds, now) / total;
  if (f <= 0) return 0;
  return f >= 1 ? 1 : f;
}

/**
 * Format remaining milliseconds as a calm tabular `m:ss` readout (older shell,
 * shown only when `showNumbersAndCharts`). Rounds UP to the whole second so the
 * readout only reads `0:00` when the budget is truly spent. Never negative.
 */
export function formatMSS(remainingMs: number): string {
  const ms = Number.isFinite(remainingMs) && remainingMs > 0 ? remainingMs : 0;
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
