/**
 * domain/constants.ts — the SHARED tunable constants the extracted report/mood
 * modules depend on (extracted from apps/kid `src/domain/constants.ts` in
 * M1.1b, 02-architecture §2.1).
 *
 * ONLY the constants both apps consume live here (barrel-ownership: one home
 * per symbol — apps/kid re-exports these from its old path). The kid-only
 * gameplay defaults + fresh-entity factories (DEFAULT_CHILD_SETTINGS etc.)
 * deliberately stay in the kid app: they are store-coupled configuration, not
 * shared domain (BUILD-GUIDE §4 extraction discipline).
 */

/** Capped collections keep the most recent N (doc 62 §2). */
export const LEDGER_ENTRY_CAP = 500;
export const RUNS_CAP = 500;

/** One wall-clock day in ms — rolling report windows + trial-reminder lead time. */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
