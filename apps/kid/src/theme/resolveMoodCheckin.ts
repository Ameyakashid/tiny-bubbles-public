/**
 * src/theme/resolveMoodCheckin.ts — the pure mood-check-in resolver (mood-checkin
 * §4.2). Same shape/discipline as `resolveCelebration.ts`: `ageMode` + `sensoryMode`
 * in → config out. No React, no store — pure + unit-tested.
 *
 * This is the SINGLE home for the young-vs-older mood surface differences, so NO
 * component branches on the raw `ageMode` string (the golden rule, doc 66 §2):
 * screens read `resolveMoodCheckin({ ageMode, sensoryMode })` + `resolveContent(...)`.
 *
 * `Record<AgeMode>` is exhaustive, so the `preteen` tier (aging-up) is compiler-
 * forced to fill a branch (it mirrors `older`). Reduce-Motion is composed in the UI
 * via `t.motion.loopsEnabled` (final decision = `cfg.animateSelect && loopsEnabled`).
 */
import type { AgeMode, SensoryMode } from "../domain/types";

export interface MoodCheckinConfig {
  /** number of energy cells to show — young 3, older/preteen 5 */
  energyLevels: 3 | 5;
  /** the energy scale stored on the log for cross-ageMode normalization */
  energyScaleMax: 3 | 5;
  /** energy grid is offered (skippable) — true in every mode today */
  showEnergy: boolean;
  /** young pervasive-TTS auto-speaks the prompt; older speaks on tap only */
  autoSpeakPrompt: boolean;
  /** calm tap-select confirm; false in lowStim (OS Reduce-Motion clamps in the UI) */
  animateSelect: boolean;
  /** young tiles are a touch larger; older/preteen standard */
  tileScale: number;
}

interface AgeMoodBase {
  energyLevels: 3 | 5;
  autoSpeakPrompt: boolean;
  tileScale: number;
}

// young vs older/preteen table (mood-checkin §2.3). preteen mirrors older.
const AGE_MOOD_BASE: Record<AgeMode, AgeMoodBase> = {
  young: { energyLevels: 3, autoSpeakPrompt: true, tileScale: 1.15 },
  older: { energyLevels: 5, autoSpeakPrompt: false, tileScale: 1.0 },
  preteen: { energyLevels: 5, autoSpeakPrompt: false, tileScale: 1.0 },
};

export function resolveMoodCheckin(input: {
  ageMode: AgeMode;
  sensoryMode: SensoryMode;
}): MoodCheckinConfig {
  const base = AGE_MOOD_BASE[input.ageMode];
  return {
    energyLevels: base.energyLevels,
    energyScaleMax: base.energyLevels,
    showEnergy: true,
    autoSpeakPrompt: base.autoSpeakPrompt,
    // lowStim => instant tap-select (no spring). OS Reduce-Motion is ANDed in the UI.
    animateSelect: input.sensoryMode !== "lowStim",
    tileScale: base.tileScale,
  };
}
