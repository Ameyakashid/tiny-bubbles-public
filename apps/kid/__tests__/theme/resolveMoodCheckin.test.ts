import { describe, expect, it } from "@jest/globals";

import type { AgeMode } from "../../src/domain/types";
import { resolveMoodCheckin } from "../../src/theme/resolveMoodCheckin";

describe("resolveMoodCheckin — age table (mood-checkin §2.3/§4.2)", () => {
  it("young: 3 energy cells, auto-speaks the prompt, larger tiles", () => {
    const cfg = resolveMoodCheckin({ ageMode: "young", sensoryMode: "standard" });
    expect(cfg.energyLevels).toBe(3);
    expect(cfg.energyScaleMax).toBe(3);
    expect(cfg.showEnergy).toBe(true);
    expect(cfg.autoSpeakPrompt).toBe(true);
    expect(cfg.tileScale).toBeGreaterThan(1);
  });

  it("older: 5 energy cells, no auto-speak, standard tiles", () => {
    const cfg = resolveMoodCheckin({ ageMode: "older", sensoryMode: "standard" });
    expect(cfg.energyLevels).toBe(5);
    expect(cfg.energyScaleMax).toBe(5);
    expect(cfg.autoSpeakPrompt).toBe(false);
    expect(cfg.tileScale).toBe(1);
  });

  it("preteen mirrors older (5 cells, no auto-speak)", () => {
    const cfg = resolveMoodCheckin({ ageMode: "preteen", sensoryMode: "standard" });
    expect(cfg.energyLevels).toBe(5);
    expect(cfg.energyScaleMax).toBe(5);
    expect(cfg.autoSpeakPrompt).toBe(false);
  });

  it("energyScaleMax always equals energyLevels (stored for normalization)", () => {
    for (const ageMode of ["young", "older", "preteen"] as AgeMode[]) {
      const cfg = resolveMoodCheckin({ ageMode, sensoryMode: "standard" });
      expect(cfg.energyScaleMax).toBe(cfg.energyLevels);
    }
  });
});

describe("resolveMoodCheckin — lowStim clamps tap-select animation (§2.4)", () => {
  it("standard: animateSelect true", () => {
    for (const ageMode of ["young", "older", "preteen"] as AgeMode[]) {
      expect(resolveMoodCheckin({ ageMode, sensoryMode: "standard" }).animateSelect).toBe(true);
    }
  });

  it("lowStim: animateSelect false (instant, static select — no spring)", () => {
    for (const ageMode of ["young", "older", "preteen"] as AgeMode[]) {
      expect(resolveMoodCheckin({ ageMode, sensoryMode: "lowStim" }).animateSelect).toBe(false);
    }
  });
});
