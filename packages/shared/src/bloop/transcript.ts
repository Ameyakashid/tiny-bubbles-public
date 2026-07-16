/**
 * packages/shared/src/bloop/transcript.ts — w2's client-safe transcript/config
 * VIEW of the canonical Firestore contract (M2.0, w2 §4.5 reconciled to arch
 * §2.3/§8 — precedence #33: the §2.3 shapes WIN over the w2 §4.5 draft).
 *
 * ONE HOME PER SYMBOL (§8 #20): the doc interfaces live in
 * `firestore/types.ts` (`TranscriptTurnDoc` — combined-turn §8 #8; `AlertDoc`
 * §8 #11/#27; `GlobalConfigDoc` §8 #21b) and `CrisisCard`/`CrisisResource`
 * live in `compliance/crisisResources.ts`. This module RE-NAMES, never
 * re-declares: the w2 draft spellings (`TranscriptTurn`/`CrisisAlert`/
 * `BloopConfig`) are type ALIASES so w2-authored code (M2.1 pipeline,
 * red-team suite) reads naturally while the contract stays single-sourced.
 *
 * Reconciliation notes (draft → canonical):
 *   - `ttlAt`            → `expiresAt` (§8 #10; default 30d, §8 #10b)
 *   - `CrisisAlert`      → `AlertDoc` (severity `info|concern|crisis` §8 #11)
 *   - `BloopConfig.rateLimit` → per-CHILD `ChildSettingsDoc.controls.limits`
 *     (§8 #2 `{perMinute, perDay, sessionMinutes}`) — rate limits are a
 *     parent-set child control, not global config.
 */

import type { AlertDoc, GlobalConfigDoc, TranscriptTurnDoc } from "../firestore/types";

/**
 * Which engine produced a reply (stored on every transcript turn — mirrors
 * `TranscriptTurnDoc.model`). Only `mock`/`scripted` exist before M6.2;
 * `deepseek` stays gated OFF for child data until the DPA gate clears (§8 #31).
 */
export type TranscriptModel = "mock" | "scripted" | "gemini-flash" | "deepseek";

export const ALL_TRANSCRIPT_MODELS: readonly TranscriptModel[] = [
  "mock",
  "scripted",
  "gemini-flash",
  "deepseek",
];

/** w2 draft name → canonical combined-turn doc (§8 #8). */
export type TranscriptTurn = TranscriptTurnDoc;

/** w2 draft name → canonical alert doc (§8 #11; crisis differentiation §8 #27). */
export type CrisisAlert = AlertDoc;

/**
 * w2 draft name → canonical ops-tunable global config (§8 #21b). Seeded by
 * w1's `seedGlobalConfig`; absent ⇒ the shared compliance modules are the
 * documented fallback (the proxy is never un-thresholded).
 */
export type BloopConfig = GlobalConfigDoc;
