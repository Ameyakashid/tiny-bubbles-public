/**
 * packages/shared/src/theme/resolveNeuroPreset.ts — the neuroProfile preset
 * resolver (w8 M1.1; 02-architecture §3.3).
 *
 * ONE codebase serves the autistic child (predictability, low stimulation, no
 * surprises), the ADHD child (novelty, brightness, fast feedback), and the
 * comorbid child who is BOTH (deterministic core + opt-in previewed novelty).
 * The preset supplies DEFAULTS ONLY; precedence is (§3.2):
 *
 *   explicit parent override  >  neuroProfile preset  >  ageMode base
 *   (+ OS Reduce-Motion always clamps motion / forces lowStim downstream)
 *
 * ABSENT `neuroProfile` ⇒ `NEUTRAL_PRESET` ⇒ v1 behaviour byte-identical
 * (02-architecture §8 #13 — the canonical technical absent-value is NEUTRAL,
 * not "both"; "both" stands only as the RECOMMENDED new-child pick).
 *
 * ANTI-SHAME: presets never introduce a failure/loss/guilt state — the
 * celebration ceiling only DAMPENS, never punishes; `autoAdvanceSteps` is a
 * hard `false` for EVERY profile (§8 #14 — no-yank predictability wins).
 *
 * Pure + deterministic (no RNG, no Date.now) + unit-tested; resolves entirely
 * ON-DEVICE — the full autism/ADHD experience works with network + LLM OFF.
 */
import type { NeuroPreset, NeuroProfile } from "../domain/types";

/**
 * The three presets (02-architecture §3.3 — canonical table; supersedes the
 * w8 §2.1 draft where they differ, per §8 #33):
 *
 * | field                 | autism        | adhd     | both       |
 * |-----------------------|---------------|----------|------------|
 * | noveltyMode           | deterministic | lively   | previewed  |
 * | autoAdvanceSteps      | false         | false*   | false      |  *§8 #14 hard ceiling
 * | transitionWarnings    | true          | false    | true       |
 * | sensoryModeDefault    | lowStim       | standard | lowStim    |
 * | celebrationCeiling    | gentle        | full     | medium     |
 * | feedbackTempo         | calm          | bright   | calm       |
 * | literalLanguage       | true          | false    | true       |
 * | previewNovelty        | false         | false    | true       |
 * | neuroInputModeDefault | aac           | chips    | chips      |
 */
export const NEURO_PRESETS: Record<NeuroProfile, NeuroPreset> = {
  autism: {
    noveltyMode: "deterministic",
    autoAdvanceSteps: false,
    transitionWarnings: true,
    sensoryModeDefault: "lowStim",
    celebrationCeiling: "gentle",
    feedbackTempo: "calm",
    literalLanguage: true,
    previewNovelty: false,
    neuroInputModeDefault: "aac",
  },
  adhd: {
    noveltyMode: "lively",
    // §8 #14: w5 (schedule/transition owner) mandates hard false for ALL
    // profiles — the anti-shame/no-yank safety rule wins over novelty.
    autoAdvanceSteps: false,
    transitionWarnings: false,
    sensoryModeDefault: "standard",
    celebrationCeiling: "full",
    feedbackTempo: "bright",
    literalLanguage: false,
    previewNovelty: false,
    neuroInputModeDefault: "chips",
  },
  both: {
    noveltyMode: "previewed",
    autoAdvanceSteps: false,
    transitionWarnings: true,
    sensoryModeDefault: "lowStim",
    celebrationCeiling: "medium",
    feedbackTempo: "calm",
    literalLanguage: true,
    previewNovelty: true,
    neuroInputModeDefault: "chips",
  },
};

/**
 * The NEUTRAL preset — what an ABSENT `neuroProfile` resolves to. Every value
 * reproduces the shipped v1 behaviour so existing children render
 * byte-identically (§8 #13 back-compat proof lives in
 * `resolveCapabilities.test.ts`):
 * - novelty layer shipped ON in v1 (`questsEnabled` absent ⇒ on) → `lively`
 * - v1 has no auto-advance and no transition warnings → false/false
 * - v1 default sensoryMode is `standard`; explicit settings still win
 * - v1 celebration ceiling is the full range (explicit `celebrationIntensity`
 *   + resolveCelebration clamps still apply downstream)
 * - v1 reinforcement is immediate → `bright`; v1 copy voice unchanged →
 *   `literalLanguage:false`
 */
export const NEUTRAL_PRESET: NeuroPreset = {
  noveltyMode: "lively",
  autoAdvanceSteps: false,
  transitionWarnings: false,
  sensoryModeDefault: "standard",
  celebrationCeiling: "full",
  feedbackTempo: "bright",
  literalLanguage: false,
  previewNovelty: false,
  neuroInputModeDefault: "chips",
};

/**
 * The technical absent-value default: `undefined` ⇒ NEUTRAL (v1-identical).
 * Do NOT change this to a profile string — that would re-theme every existing
 * child (§8 #13 rejected `absent ⇒ adhd` / `absent ⇒ both` for that reason).
 */
export const DEFAULT_NEURO_PROFILE: NeuroProfile | undefined = undefined;

/**
 * The RECOMMENDED pick for a NEW child at add-child time (§8 #13 — the
 * comorbid-target framing). A recommendation for the parent UI only; never
 * applied implicitly to an existing child.
 */
export const RECOMMENDED_NEW_CHILD_NEURO_PROFILE: NeuroProfile = "both";

/**
 * Resolve a (possibly absent) `neuroProfile` to its preset. Absent/unknown ⇒
 * `NEUTRAL_PRESET` (never throws — a corrupt persisted value degrades to the
 * v1 behaviour, mirroring `validateAndRepair`'s forgiving posture).
 */
export function resolveNeuroPreset(neuroProfile?: NeuroProfile): NeuroPreset {
  if (!neuroProfile) return NEUTRAL_PRESET;
  return NEURO_PRESETS[neuroProfile] ?? NEUTRAL_PRESET;
}
