/**
 * resolveCapabilities.test.ts (shared) — M1.1b extraction acceptance: the
 * moved resolver keeps its v1+M1.1 contract. Omitting `neuroProfile` ⇒ output
 * identical to the pre-w8 age defaults (§8 #13); the preset composes BELOW
 * explicit overrides; `autoAdvanceSteps` is a hard `false` ceiling (§8 #14).
 */
import { describe, expect, it } from "@jest/globals";

import {
  defaultCompanionStyle,
  defaultTextFirst,
  resolveCapabilities,
} from "../../src/theme/resolveCapabilities";
import type { NeuroProfile } from "../../src/domain/types";

const PROFILES: NeuroProfile[] = ["adhd", "autism", "both", "neutral"];

describe("resolveCapabilities — age defaults (v1 behavior preserved)", () => {
  it("young: 3 choices, single-step, no numbers, cuddly/care, icon-first", () => {
    const caps = resolveCapabilities({ ageMode: "young" });
    expect(caps.maxChoices).toBe(3);
    expect(caps.multiStepVisible).toBe(false);
    expect(caps.showNumbersAndCharts).toBe(false);
    expect(caps.companionStyle).toBe("cuddly");
    expect(caps.companionFraming).toBe("care");
    expect(caps.textPrimary).toBe(false);
    expect(caps.breathingChoice).toBe(false);
    expect(caps.focusIntervalsAvailable).toBe(false);
  });

  it("older: 6 choices, agenda, numbers, cool/levelup, text-first", () => {
    const caps = resolveCapabilities({ ageMode: "older" });
    expect(caps.maxChoices).toBe(6);
    expect(caps.multiStepVisible).toBe(true);
    expect(caps.showNumbersAndCharts).toBe(true);
    expect(caps.companionStyle).toBe("cool");
    expect(caps.companionFraming).toBe("levelup");
    expect(caps.textPrimary).toBe(true);
  });

  it("preteen: mirrors older but delegateToChild defaults true (identity/SDT)", () => {
    const caps = resolveCapabilities({ ageMode: "preteen" });
    expect(caps.maxChoices).toBe(6);
    expect(caps.delegateToChild).toBe(true);
    expect(caps.companionStyle).toBe("avatar");
    expect(caps.companionFraming).toBe("identity");
  });

  it("defaultCompanionStyle / defaultTextFirst derive from age", () => {
    expect(defaultCompanionStyle("young")).toBe("cuddly");
    expect(defaultCompanionStyle("older")).toBe("cool");
    expect(defaultCompanionStyle("preteen")).toBe("avatar");
    expect(defaultTextFirst("young")).toBe(false);
    expect(defaultTextFirst("older")).toBe(true);
  });
});

describe("resolveCapabilities — neuroProfile axis (M1.1, integrated in the move)", () => {
  it("ABSENT neuroProfile ⇒ identical output to the explicit neutral preset (§8 #13)", () => {
    for (const ageMode of ["young", "older", "preteen"] as const) {
      const absent = resolveCapabilities({ ageMode });
      const neutral = resolveCapabilities({ ageMode, neuroProfile: "neutral" });
      expect(absent).toEqual(neutral);
      // and the neutral caps are the v1 lively defaults
      expect(absent.noveltyMode).toBe("lively");
      expect(absent.feedbackTempo).toBe("bright");
      expect(absent.literalLanguage).toBe(false);
    }
  });

  it("autism preset: deterministic novelty, warnings, gentle ceiling, calm tempo, literal, aac", () => {
    const caps = resolveCapabilities({ ageMode: "young", neuroProfile: "autism" });
    expect(caps.noveltyMode).toBe("deterministic");
    expect(caps.transitionWarnings).toBe(true);
    expect(caps.celebrationCeiling).toBe("gentle");
    expect(caps.feedbackTempo).toBe("calm");
    expect(caps.literalLanguage).toBe(true);
    expect(caps.neuroInputModeDefault).toBe("aac");
  });

  it("explicit override WINS over the preset (precedence §3.2)", () => {
    const caps = resolveCapabilities({
      ageMode: "older",
      neuroProfile: "autism",
      noveltyMode: "previewed",
      feedbackTempo: "bright",
    });
    expect(caps.noveltyMode).toBe("previewed");
    expect(caps.feedbackTempo).toBe("bright");
    // untouched preset caps still flow through
    expect(caps.literalLanguage).toBe(true);
  });

  it("autoAdvanceSteps is HARD false for every profile — never a grant (§8 #14)", () => {
    for (const neuroProfile of PROFILES) {
      expect(
        resolveCapabilities({ ageMode: "older", neuroProfile }).autoAdvanceSteps,
      ).toBe(false);
    }
    expect(resolveCapabilities({ ageMode: "young" }).autoAdvanceSteps).toBe(false);
  });

  it("master customization grant still forces the three canPick* off (anti-shame: never strips owned)", () => {
    const caps = resolveCapabilities({
      ageMode: "older",
      neuroProfile: "adhd",
      canCustomizeCompanion: false,
    });
    expect(caps.canPickColor).toBe(false);
    expect(caps.canPickAccessory).toBe(false);
    expect(caps.canPickTheme).toBe(false);
  });
});
