/**
 * packages/shared/src/bloop/moderation.ts — the CANONICAL moderation verdict
 * taxonomy (w2 OWNS this module — 02-architecture §2.1/§8 #9/#20).
 *
 * SEEDED at M1.2 with ONLY the verdict types the w1 Firestore schema needs
 * (`TranscriptTurnDoc.inputFlags/outputFlags`, `AlertDoc.categories`) so the
 * transcript/alert docs have a stable shape before the proxy exists. M2.0 (w2)
 * COMPLETES this module (scanner wiring, thresholds); it must EXTEND, never
 * re-declare, these types.
 *
 * Canonical picks honored here:
 *   - §8 #9  — verdict shape = `ModerationFlag {category, stage, score,
 *     action}` (w1's `ModerationVerdict` draft is dropped).
 *   - §8 #20 — `OnFailAction` is THIS enum (w1's string-union draft dropped).
 *
 * Pure types + enums; RN-free; no I/O.
 */

/**
 * What a scanner can flag. `crisis` is detection-only here — crisis ROUTING
 * (parent alert vs. safetyReport/legalHold) differentiates on `CrisisType`
 * (`compliance/crisisResources.ts`), never on this coarse category (§8 #27).
 */
export type ModerationCategory =
  | "toxicity"
  | "banned_topic"
  | "off_scope"
  | "pii"
  | "crisis"
  | "prompt_injection"
  | "self_harm_instruction"
  | "violence"
  | "sexual"
  | "unknown";

/** Where in the sandwich the scan ran (input shield / model output / session). */
export type ScanStage = "input" | "output" | "session";

/**
 * What the pipeline did about a failed scan (guardrails-ai OnFailAction
 * vocabulary — donor pattern, Apache-2.0; the enum itself is original TS).
 */
export enum OnFailAction {
  Reask = "REASK",
  Refrain = "REFRAIN",
  Filter = "FILTER",
  Custom = "CUSTOM",
}

/** One scanner verdict (canonical shape, §8 #9). Stored on transcript turns. */
export interface ModerationFlag {
  category: ModerationCategory;
  stage: ScanStage;
  /** 0..1 confidence/severity from the scanner */
  score: number;
  /** present when the flag changed the reply path */
  action?: OnFailAction;
}
