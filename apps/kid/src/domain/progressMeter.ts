/**
 * src/domain/progressMeter.ts — the endowed-progress bubble-meter math (pure).
 *
 * Goal-gradient + endowed-progress (doc 63 Feature 7, doc 66 M8): the meter
 * NEVER confronts a child with an empty bar. It STARTS partly full and only ever
 * grows toward 100% within a goal; a new period resets to the same partly-full
 * endowment, never to a guilt-cueing "0/everything to do" (doc 63 §7(d)).
 *
 * HARD INVARIANT (doc 66 §5): `bubbleFillFraction` is ALWAYS strictly > 0 and
 * <= 1 — there is no input (including value=0 or goal=0) that yields an empty
 * meter. A unit test asserts the meter starts > 0% (doc 66 M8 acceptance).
 *
 * Pure + deterministic (no clock, no RNG) so it is fully unit-testable.
 */

/** The pre-filled endowment a fresh meter shows (≈ one bubble already popped). */
export const DEFAULT_ENDOWED_FRACTION = 0.12;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * The fill fraction for an endowed bubble meter (doc 63 §7). Never empty: the
 * result is floored at `endowedFraction` (itself floored just above 0) so a
 * value of 0 — or a goal of 0 — still renders a partly-full meter, and capped at
 * 1 so an over-shoot never reads past full.
 */
export function bubbleFillFraction(
  value: number,
  goal: number,
  endowedFraction: number = DEFAULT_ENDOWED_FRACTION,
): number {
  // endowment is the non-empty floor — kept strictly > 0 (never an empty bar).
  const endowed = clamp(endowedFraction, 0.02, 0.5);
  if (goal <= 0) return endowed;
  const raw = Math.max(0, value) / goal;
  return clamp(Math.max(endowed, raw), endowed, 1);
}

/**
 * Discrete filled-bubble count for the young, number-free meter (doc 63 §7(c)):
 * a small row of bubbles (e.g. 3-5) where each "done" pops one more. At least
 * `minFilled` (default 1) is always shown — the visual endowment — so the row is
 * never blank; capped at `slots`.
 */
export function filledBubbles(
  value: number,
  goal: number,
  slots: number,
  minFilled = 1,
): number {
  if (slots <= 0) return 0;
  const fraction = bubbleFillFraction(value, goal);
  const filled = Math.round(fraction * slots);
  return clamp(filled, Math.min(minFilled, slots), slots);
}

/**
 * "N more bubbles!" — the calm affordability gap toward a reward/goal (doc 63
 * §2(d)/§7(d)). Never negative; 0 means "ready". This is encouragement framing,
 * NEVER a sales pitch or a countdown.
 */
export function bubblesUntil(balance: number, cost: number): number {
  return Math.max(0, cost - Math.max(0, balance));
}
