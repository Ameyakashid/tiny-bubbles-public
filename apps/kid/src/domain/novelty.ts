/**
 * src/domain/novelty.ts — pure cadence + DETERMINISTIC reward-magnitude helpers
 * (novelty-refresh, M-C4).
 *
 * The "beats the novelty cliff" math that is variety in MAGNITUDE and CONTENT,
 * never a variable SCHEDULE (novelty §1.2/§7.3):
 *   - `featuredDaypartFor` — a pure function of the local day-of-year picks ONE
 *     "spotlight" daypart per day; completing that routine pays a fixed extra
 *     `FEATURED_DAYPART_BONUS` and steps the celebration UP one level. It is the
 *     SAME for the whole local day and identical on every device.
 *   - `featuredPackFor` / `isSeasonalNew` — which seasonal cosmetic pack has most
 *     recently APPEARED (calendar-gated `availableFrom`), for the calm "new this
 *     season" surfacing. ADDITIVE-ONLY: packs only ever appear, never expire (there
 *     is structurally no `availableUntil`), so nothing here is a FOMO countdown.
 *
 * `Math.random` is FORBIDDEN in this file (grep-gated). Pure + RN-free: `now`/`tz`
 * are always passed in.
 */
import { dayOfYear, selectionDaypart } from "./dates";
import type { Daypart, SeasonalPack } from "./types";

// NOTE: the deterministic rotation clocks `isoWeekKey`/`dayOfYear` live in
// `./dates` (colocated with the other tz helpers) and are exported from the domain
// barrel there; import them from `../domain/dates` to avoid a double barrel export.

/**
 * The DETERMINISTIC extra bubbles granted for completing the day's spotlight
 * daypart routine (novelty §2.2, tunable constant — suggested +2). This is a
 * FIXED magnitude, granted on EVERY spotlight completion — it is not a chance drop
 * (the anti-slot-machine invariant: what varies is which daypart is featured today
 * and how big the reward is, never whether/when a reward lands).
 */
export const FEATURED_DAYPART_BONUS = 2;

/**
 * The three "real" dayparts a routine can belong to (night collapses to evening
 * for selection, per `selectionDaypart`) — the spotlight is always one of these so
 * a completed routine's daypart can match it.
 */
const SPOTLIGHT_DAYPARTS: Exclude<Daypart, "night">[] = ["morning", "afternoon", "evening"];

/**
 * The "spotlight" daypart for the local day of `now` in `timeZone` — a pure
 * function of the day-of-year (stable all day, identical across devices, no RNG).
 * Returns one of morning/afternoon/evening.
 */
export function featuredDaypartFor(now: number, timeZone: string): Exclude<Daypart, "night"> {
  const doy = dayOfYear(now, timeZone);
  return SPOTLIGHT_DAYPARTS[doy % SPOTLIGHT_DAYPARTS.length];
}

/**
 * Whether the completed `routineDaypart` is today's spotlight in `timeZone`. Night
 * is collapsed to evening (selection daypart) so an evening/night routine matches
 * an "evening" spotlight consistently.
 */
export function isFeaturedDaypart(routineDaypart: Daypart, now: number, timeZone: string): boolean {
  return selectionDaypart(routineDaypart) === featuredDaypartFor(now, timeZone);
}

/**
 * The seasonal pack most recently made available at `now` (the "new this month"
 * cadence readout, novelty §2.6). Considers only packs with a defined
 * `availableFrom <= now` and returns the one with the greatest `availableFrom`;
 * `undefined` when none has appeared yet. Never an expiry/countdown — additive-only.
 */
export function featuredPackFor(now: number, packs: SeasonalPack[]): SeasonalPack | undefined {
  let best: SeasonalPack | undefined;
  let bestAt = -Infinity;
  for (const pack of packs) {
    const at = pack.availableFrom;
    if (at === undefined || at > now) continue;
    if (at > bestAt) {
      bestAt = at;
      best = pack;
    }
  }
  return best;
}

/** Default "recently appeared" window for the calm "new!" badge (~30 days). */
export const SEASONAL_NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Whether a cosmetic belongs to a seasonal pack that became available WITHIN the
 * recent window (a calm "new this season" marker, novelty §2.3). Never a countdown:
 * it only reads how recently the pack APPEARED, and there is no expiry to count down
 * to. Returns false for base (non-seasonal) cosmetics and future/never-dated packs.
 */
export function isSeasonalNew(
  seasonalPackId: string | undefined,
  now: number,
  packs: SeasonalPack[],
  windowMs: number = SEASONAL_NEW_WINDOW_MS,
): boolean {
  if (!seasonalPackId) return false;
  const pack = packs.find((p) => p.id === seasonalPackId);
  if (!pack || pack.availableFrom === undefined) return false;
  if (pack.availableFrom > now) return false; // not yet visible
  return now - pack.availableFrom <= windowMs;
}
