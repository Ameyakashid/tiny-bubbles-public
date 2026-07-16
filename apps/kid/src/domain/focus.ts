/**
 * src/domain/focus.ts — the pure, RN-free math + curated constants for the
 * OPTIONAL adjustable focus/break scaffold (feature #22, `focus-intervals`, M-C3).
 *
 * SCIENCE-HONEST FRAMING (say this, never the opposite): Pomodoro / time-boxing
 * evidence is thin, mixed, and NOT ADHD-specific, and a rigid 25/5 cadence
 * actually INCREASED fatigue in the cited work. So this ships as an OPTIONAL
 * organizational scaffold — offered, never forced — with USER-ADJUSTABLE intervals
 * biased toward SHORTER blocks + ACTIVE movement breaks for kids. It is NOT a
 * treatment and is NEVER marketed as "ADHD-proven" / "improves focus".
 *
 * Wall-clock anchored: remaining time is ALWAYS recomputed from `phaseStartedAt`
 * against a passed-in `now` (the codebase "never trust a native clock" rule), so a
 * backgrounded session shows the correct remaining (or a calm "done") on return
 * with no drift. There is NO failure/urgency concept: an empty block is a calm
 * `remaining === 0` rested state, never "time's up".
 *
 * ZERO AI / NO RNG: durations come from curated option arrays; movement prompts are
 * a fixed curated array picked by a DETERMINISTIC rotating index (`nextMovementPrompt`).
 * There is no `Math.random`, no adaptive "recommended length", no LLM anywhere.
 *
 * `formatMSS` is SOFT-REUSED from `src/domain/timer.ts` (visual-timers, M-B1) — not
 * re-authored here. Pure + unit-testable (no React/RN, no Date.now()).
 */
import type { ChildSettings, EpochMs, FocusIntervalConfig, MovementPrompt } from "./types";
import { formatMSS } from "./timer";

/** Re-export the shared calm `m:ss` formatter (soft reuse from visual-timers). */
export { formatMSS };

/**
 * Curated focus-block lengths in minutes (no free-form entry — curated autonomy).
 * Default 15, deliberately NOT the fatiguing rigid 25/5 (25 is offered, not forced).
 */
export const FOCUS_MINUTE_OPTIONS = [10, 15, 20, 25] as const;

/** Curated break lengths in minutes. Default 5. */
export const BREAK_MINUTE_OPTIONS = [3, 5, 10] as const;

/**
 * The per-child defaults. `enabled:false` — the feature is a PARENT opt-in ON TOP
 * of the older-only age ceiling (the `focusIntervalsAvailable` capability gates
 * AVAILABILITY; this flag gates whether the parent turned it on). 15/5 non-rigid.
 */
export const DEFAULT_FOCUS_INTERVALS: FocusIntervalConfig = {
  enabled: false,
  focusMinutes: 15,
  breakMinutes: 5,
  movementBreaks: true,
  chime: true,
};

/**
 * The resolved config for a child — the parent's saved config, falling back to
 * `DEFAULT_FOCUS_INTERVALS`. Spread-merged so a partial persisted blob still yields
 * a complete config (defence in depth; the store persists a full object).
 */
export function focusConfigOf(settings: ChildSettings): FocusIntervalConfig {
  return { ...DEFAULT_FOCUS_INTERVALS, ...(settings.focusIntervals ?? {}) };
}

/**
 * Milliseconds left in the current phase at `now`, clamped to `>= 0`. Recomputed
 * purely from the wall clock, so it is drift-free across a background gap. A
 * non-positive/non-finite `minutes` or start yields 0 (the calm rested sentinel),
 * never a throw, never a negative.
 */
export function focusRemainingMs(phaseStartedAt: EpochMs, minutes: number, now: EpochMs): number {
  if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(phaseStartedAt)) return 0;
  const remaining = phaseStartedAt + minutes * 60_000 - now;
  return remaining > 0 ? remaining : 0;
}

/**
 * The remaining fraction of the phase in `[0, 1]` (1 = full, 0 = empty) — drives the
 * depleting ring. Guards `minutes <= 0` / non-finite ⇒ 0.
 */
export function focusFraction(phaseStartedAt: EpochMs, minutes: number, now: EpochMs): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  const total = minutes * 60_000;
  const f = focusRemainingMs(phaseStartedAt, minutes, now) / total;
  if (f <= 0) return 0;
  return f >= 1 ? 1 : f;
}

/**
 * DETERMINISTIC movement-prompt rotation (NO `Math.random`). Returns the prompt at
 * `index` (mod length) plus the `nextIndex` for the following break — so the same
 * session start always yields the same prompt order (testable). An empty list
 * yields `undefined` + `nextIndex 0` (never a throw).
 */
export function nextMovementPrompt(
  index: number,
  prompts: MovementPrompt[],
): { prompt: MovementPrompt | undefined; nextIndex: number } {
  const len = prompts.length;
  if (len === 0) return { prompt: undefined, nextIndex: 0 };
  const i = ((Math.trunc(index) % len) + len) % len; // safe non-negative modulo
  return { prompt: prompts[i], nextIndex: (i + 1) % len };
}

/**
 * Coerce a persisted minute value to the nearest curated option (defensive repair,
 * migrations §3.5). Non-finite/garbage ⇒ `fallback`. Pure.
 */
export function nearestMinuteOption(
  value: unknown,
  options: readonly number[],
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  let best = options[0] ?? fallback;
  let bestDist = Math.abs(value - best);
  for (const o of options) {
    const d = Math.abs(value - o);
    if (d < bestDist) {
      best = o;
      bestDist = d;
    }
  }
  return best;
}
