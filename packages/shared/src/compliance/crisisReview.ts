/**
 * packages/shared/src/compliance/crisisReview.ts — the crisis-pathway review
 * sign-off registry + the ship-blocking assertion (w8 M1.1; §8 #16b).
 *
 * A `CrisisCard` may only flip `reviewed:true` when a psychologist/clinician
 * sign-off is RECORDED here (reviewer + date). The `crisis-review` gate runs
 * `assertCrisisTableReviewed(LAUNCH_LOCALES)` at ship time: ANY launch locale
 * whose card is `reviewed:false` (incl. `en-US` pre-sign-off — a correct 988
 * number ≠ reviewed crisis copy) or missing a sign-off FAILS THE BUILD.
 *
 * India (`en-IN`/`hi-IN`) + Mexico (`es-MX`) review is a LAUNCH-CRITICAL-PATH
 * item with a named clinical owner — not "candidates pending".
 */
import { CRISIS_RESOURCES } from "./crisisResources";

export interface CrisisReviewSignoff {
  /** the named psychologist/clinician who reviewed COPY + verified NUMBERS */
  reviewer: string;
  /** ISO date of the sign-off (also the number-verification date) */
  date: string;
  /** free-form audit note (e.g. verification source) */
  note?: string;
}

/**
 * The sign-off audit registry, keyed by BCP-47 locale. EMPTY at M1.1 — every
 * seeded card ships `reviewed:false` until a human entry lands here AND the
 * card is flipped in the same reviewed change (both are asserted).
 */
export const CRISIS_REVIEW_SIGNOFF: Record<string, CrisisReviewSignoff> = {
  // e.g. "en-US": { reviewer: "Dr. …", date: "<ISO date>", note: "numbers verified" },
};

/**
 * The locale list the product intends to ship with (roadmap w8 §9 #1). The
 * ship gate asserts every one of these has a reviewed card + sign-off.
 */
export const LAUNCH_LOCALES: readonly string[] = ["en-US", "en-IN", "hi-IN", "es-MX"];

/** True iff the locale's card exists, is reviewed, and has a recorded sign-off. */
export function isCrisisCardShippable(locale: string): boolean {
  const card = CRISIS_RESOURCES[locale];
  return !!card && card.reviewed === true && !!CRISIS_REVIEW_SIGNOFF[locale];
}

/**
 * The ship-blocking assertion (§8 #16b): throws (listing every problem) if any
 * shipping locale's card is missing, `reviewed:false`, or lacks a sign-off.
 * Wired into `crisis-review.test.ts` + `scripts/ship-gate.sh` (finalized M6.1).
 */
export function assertCrisisTableReviewed(shippingLocales: readonly string[]): void {
  const problems: string[] = [];
  for (const locale of shippingLocales) {
    const card = CRISIS_RESOURCES[locale];
    if (!card) {
      problems.push(`[${locale}] no crisis card seeded`);
      continue;
    }
    if (!card.reviewed) {
      problems.push(`[${locale}] card is reviewed:false (psychologist sign-off required)`);
    }
    if (!CRISIS_REVIEW_SIGNOFF[locale]) {
      problems.push(`[${locale}] no CRISIS_REVIEW_SIGNOFF entry recorded`);
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Crisis-review gate: ship BLOCKED for ${problems.length} reason(s) ` +
        `(§8 #16b — every launch locale needs a recorded human sign-off):\n` +
        problems.join("\n"),
    );
  }
}
