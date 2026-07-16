/**
 * resolveNeuroPreset.test.ts — the three presets + the NEUTRAL back-compat
 * guarantee (M1.1 acceptance; 02-architecture §3.3 + §8 #13/#14).
 */
import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_NEURO_PROFILE,
  NEURO_PRESETS,
  NEUTRAL_PRESET,
  RECOMMENDED_NEW_CHILD_NEURO_PROFILE,
  resolveNeuroPreset,
} from "../../src/theme/resolveNeuroPreset";
import type { NeuroProfile } from "../../src/domain/types";

describe("resolveNeuroPreset — the three presets (§3.3)", () => {
  it("autism: deterministic / lowStim / no auto-advance / literal / gentle / calm / aac", () => {
    const p = resolveNeuroPreset("autism");
    expect(p.noveltyMode).toBe("deterministic");
    expect(p.autoAdvanceSteps).toBe(false);
    expect(p.transitionWarnings).toBe(true);
    expect(p.sensoryModeDefault).toBe("lowStim");
    expect(p.celebrationCeiling).toBe("gentle");
    expect(p.feedbackTempo).toBe("calm");
    expect(p.literalLanguage).toBe(true);
    expect(p.previewNovelty).toBe(false);
    expect(p.neuroInputModeDefault).toBe("aac");
  });

  it("adhd: lively / standard / bright / full — but NEVER auto-advance (§8 #14)", () => {
    const p = resolveNeuroPreset("adhd");
    expect(p.noveltyMode).toBe("lively");
    expect(p.autoAdvanceSteps).toBe(false); // hard safety ceiling for EVERY profile
    expect(p.sensoryModeDefault).toBe("standard");
    expect(p.celebrationCeiling).toBe("full");
    expect(p.feedbackTempo).toBe("bright");
    expect(p.literalLanguage).toBe(false);
    expect(p.previewNovelty).toBe(false);
    expect(p.neuroInputModeDefault).toBe("chips");
  });

  it("both: deterministic core + opt-in previewed novelty (previewNovelty true)", () => {
    const p = resolveNeuroPreset("both");
    expect(p.noveltyMode).toBe("previewed");
    expect(p.autoAdvanceSteps).toBe(false);
    expect(p.transitionWarnings).toBe(true);
    expect(p.sensoryModeDefault).toBe("lowStim");
    expect(p.celebrationCeiling).toBe("medium");
    expect(p.feedbackTempo).toBe("calm");
    expect(p.literalLanguage).toBe(true);
    expect(p.previewNovelty).toBe(true);
    expect(p.neuroInputModeDefault).toBe("chips");
  });

  it("autoAdvanceSteps is false for EVERY profile (§8 #14 — no-yank, anti-shame)", () => {
    for (const profile of Object.keys(NEURO_PRESETS) as NeuroProfile[]) {
      expect(NEURO_PRESETS[profile].autoAdvanceSteps).toBe(false);
    }
    expect(NEUTRAL_PRESET.autoAdvanceSteps).toBe(false);
  });
});

describe("resolveNeuroPreset — absent ⇒ NEUTRAL (§8 #13 back-compat)", () => {
  it("absent resolves to the NEUTRAL preset (v1 behaviour unchanged)", () => {
    expect(resolveNeuroPreset()).toBe(NEUTRAL_PRESET);
    expect(resolveNeuroPreset(undefined)).toBe(NEUTRAL_PRESET);
  });

  it("a corrupt persisted value degrades to NEUTRAL (never throws)", () => {
    expect(resolveNeuroPreset("ghost" as NeuroProfile)).toBe(NEUTRAL_PRESET);
  });

  it("NEUTRAL reproduces the shipped v1 defaults (standard / lively / full range)", () => {
    expect(NEUTRAL_PRESET.sensoryModeDefault).toBe("standard");
    expect(NEUTRAL_PRESET.noveltyMode).toBe("lively"); // v1 novelty layer ships ON
    expect(NEUTRAL_PRESET.celebrationCeiling).toBe("full");
    expect(NEUTRAL_PRESET.literalLanguage).toBe(false); // v1 copy voice unchanged
    expect(NEUTRAL_PRESET.transitionWarnings).toBe(false); // v1 has none
  });

  it("the technical absent-default is undefined; 'both' is only the recommended pick", () => {
    expect(DEFAULT_NEURO_PROFILE).toBeUndefined();
    expect(RECOMMENDED_NEW_CHILD_NEURO_PROFILE).toBe("both");
  });
});
