import { describe, expect, it } from "@jest/globals";

import { resolveCapabilities } from "../../src/theme/resolveCapabilities";

describe("resolveCapabilities — age defaults", () => {
  it("young: curated to 3, single-step, no numbers, care framing, picture-first", () => {
    const c = resolveCapabilities({ ageMode: "young" });
    expect(c.maxChoices).toBe(3);
    expect(c.multiStepVisible).toBe(false);
    expect(c.showNumbersAndCharts).toBe(false);
    expect(c.textPrimary).toBe(false);
    expect(c.companionFraming).toBe("care");
    expect(c.canPickAccessory).toBe(false);
    expect(c.canPickTheme).toBe(false);
  });

  it("older: up to 6, multi-step, numbers, levelup framing, text-first", () => {
    const c = resolveCapabilities({ ageMode: "older" });
    expect(c.maxChoices).toBe(6);
    expect(c.multiStepVisible).toBe(true);
    expect(c.showNumbersAndCharts).toBe(true);
    expect(c.textPrimary).toBe(true);
    expect(c.companionFraming).toBe("levelup");
    expect(c.canPickTheme).toBe(true);
  });
});

describe("resolveCapabilities — independent overrides (doc 66 §1b.6)", () => {
  it("textFirst override flips textPrimary without touching age", () => {
    expect(resolveCapabilities({ ageMode: "young", textFirst: true }).textPrimary).toBe(true);
    expect(resolveCapabilities({ ageMode: "older", textFirst: false }).textPrimary).toBe(false);
  });

  it("companionStyle override flips framing independent of age", () => {
    // a precocious older kid who keeps the cuddly buddy -> care framing
    expect(resolveCapabilities({ ageMode: "older", companionStyle: "cuddly" }).companionFraming).toBe("care");
    // a young kid set to the cool buddy -> levelup framing
    expect(resolveCapabilities({ ageMode: "young", companionStyle: "cool" }).companionFraming).toBe("levelup");
  });

  it("parent grants ride on top of age defaults", () => {
    const c = resolveCapabilities({ ageMode: "older", canAddTasks: true, delegateToChild: true, moodCheckin: true });
    expect(c.canAddTasks).toBe(true);
    expect(c.delegateToChild).toBe(true);
    expect(c.moodCheckin).toBe(true);
  });
});

describe("resolveCapabilities — autonomy grants (child-autonomy M-B3)", () => {
  it("canCustomizeCompanion master gate: false forces all three canPick* off", () => {
    const c = resolveCapabilities({ ageMode: "older", canCustomizeCompanion: false });
    expect(c.canPickColor).toBe(false);
    expect(c.canPickAccessory).toBe(false);
    expect(c.canPickTheme).toBe(false);
  });

  it("master gate default (undefined) keeps the age defaults", () => {
    const older = resolveCapabilities({ ageMode: "older" });
    expect(older.canPickColor).toBe(true);
    expect(older.canPickAccessory).toBe(true);
    expect(older.canPickTheme).toBe(true);
    // young: color allowed by default, accessory/theme off — unchanged by the gate
    const young = resolveCapabilities({ ageMode: "young" });
    expect(young.canPickColor).toBe(true);
    expect(young.canPickAccessory).toBe(false);
  });

  it("master gate true composes over the granular overrides (still gated OK)", () => {
    const c = resolveCapabilities({
      ageMode: "young",
      canCustomizeCompanion: true,
      canPickAccessory: true, // a parent grant that the master lets through
    });
    expect(c.canPickAccessory).toBe(true);
    // but with the master off, even an explicit granular true is forced off
    const off = resolveCapabilities({
      ageMode: "young",
      canCustomizeCompanion: false,
      canPickAccessory: true,
    });
    expect(off.canPickAccessory).toBe(false);
  });

  it("canPickReward defaults true, honors an explicit false", () => {
    expect(resolveCapabilities({ ageMode: "young" }).canPickReward).toBe(true);
    expect(resolveCapabilities({ ageMode: "older" }).canPickReward).toBe(true);
    expect(resolveCapabilities({ ageMode: "older", canPickReward: false }).canPickReward).toBe(false);
  });
});

describe("resolveCapabilities — moodCheckin grant (mood-checkin M-B4)", () => {
  it("moodCheckin defaults OFF for every age (opt-in, default off)", () => {
    expect(resolveCapabilities({ ageMode: "young" }).moodCheckin).toBe(false);
    expect(resolveCapabilities({ ageMode: "older" }).moodCheckin).toBe(false);
    expect(resolveCapabilities({ ageMode: "preteen" }).moodCheckin).toBe(false);
  });

  it("the parent grant flips moodCheckin on (wired from moodLoggingEnabled)", () => {
    expect(resolveCapabilities({ ageMode: "young", moodCheckin: true }).moodCheckin).toBe(true);
    expect(resolveCapabilities({ ageMode: "older", moodCheckin: true }).moodCheckin).toBe(true);
    // an explicit false keeps it off even when other grants ride along.
    expect(
      resolveCapabilities({ ageMode: "older", moodCheckin: false, canAddTasks: true }).moodCheckin,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// w8 (M1.1) — the neuroProfile axis (02-architecture §3.2-§3.4, §8 #13/#14).
// ---------------------------------------------------------------------------
import { NEUTRAL_PRESET } from "@tiny-bubbles/shared/theme/resolveNeuroPreset";

import type { AgeMode } from "../../src/domain/types";

/**
 * The pre-w8 capability snapshot per age (the EXACT object resolveCapabilities
 * returned before the neuro caps were appended). The back-compat proof pins
 * every pre-w8 key to this snapshot when `neuroProfile` is omitted.
 */
const PRE_W8_SNAPSHOT: Record<AgeMode, Record<string, unknown>> = {
  young: {
    ttsDefault: true,
    textPrimary: false,
    maxChoices: 3,
    multiStepVisible: false,
    showNumbersAndCharts: false,
    canPickColor: true,
    canPickAccessory: false,
    canPickTheme: false,
    canPickReward: true,
    companionStyle: "cuddly",
    companionFraming: "care",
    delegateToChild: false,
    canAddTasks: false,
    moodCheckin: false,
    breathingChoice: false,
    focusIntervalsAvailable: false,
  },
  older: {
    ttsDefault: true,
    textPrimary: true,
    maxChoices: 6,
    multiStepVisible: true,
    showNumbersAndCharts: true,
    canPickColor: true,
    canPickAccessory: true,
    canPickTheme: true,
    canPickReward: true,
    companionStyle: "cool",
    companionFraming: "levelup",
    delegateToChild: false,
    canAddTasks: false,
    moodCheckin: false,
    breathingChoice: true,
    focusIntervalsAvailable: true,
  },
  preteen: {
    ttsDefault: true,
    textPrimary: true,
    maxChoices: 6,
    multiStepVisible: true,
    showNumbersAndCharts: true,
    canPickColor: true,
    canPickAccessory: true,
    canPickTheme: true,
    canPickReward: true,
    companionStyle: "avatar",
    companionFraming: "identity",
    delegateToChild: true,
    canAddTasks: false,
    moodCheckin: false,
    breathingChoice: true,
    focusIntervalsAvailable: true,
  },
};

describe("resolveCapabilities — w8 back-compat proof (§8 #13)", () => {
  it("omitting neuroProfile ⇒ every pre-w8 cap is byte-identical to the pre-w8 snapshot", () => {
    for (const ageMode of ["young", "older", "preteen"] as const) {
      const caps = resolveCapabilities({ ageMode }) as unknown as Record<string, unknown>;
      for (const [key, expected] of Object.entries(PRE_W8_SNAPSHOT[ageMode])) {
        expect({ ageMode, key, value: caps[key] }).toEqual({ ageMode, key, value: expected });
      }
    }
  });

  it("omitting neuroProfile ⇒ the new caps equal the NEUTRAL preset (v1 behaviour)", () => {
    for (const ageMode of ["young", "older", "preteen"] as const) {
      const caps = resolveCapabilities({ ageMode });
      expect(caps.noveltyMode).toBe(NEUTRAL_PRESET.noveltyMode);
      expect(caps.autoAdvanceSteps).toBe(false);
      expect(caps.transitionWarnings).toBe(NEUTRAL_PRESET.transitionWarnings);
      expect(caps.celebrationCeiling).toBe(NEUTRAL_PRESET.celebrationCeiling);
      expect(caps.feedbackTempo).toBe(NEUTRAL_PRESET.feedbackTempo);
      expect(caps.literalLanguage).toBe(NEUTRAL_PRESET.literalLanguage);
      expect(caps.previewNovelty).toBe(NEUTRAL_PRESET.previewNovelty);
      expect(caps.neuroInputModeDefault).toBe(NEUTRAL_PRESET.neuroInputModeDefault);
    }
  });

  it("neuroProfile NEVER changes a pre-w8 cap — only the new preset caps differ", () => {
    for (const ageMode of ["young", "older", "preteen"] as const) {
      for (const neuroProfile of ["autism", "adhd", "both"] as const) {
        const withAxis = resolveCapabilities({ ageMode, neuroProfile }) as unknown as Record<
          string,
          unknown
        >;
        for (const [key, expected] of Object.entries(PRE_W8_SNAPSHOT[ageMode])) {
          expect({ ageMode, neuroProfile, key, value: withAxis[key] }).toEqual({
            ageMode,
            neuroProfile,
            key,
            value: expected,
          });
        }
      }
    }
  });
});

describe("resolveCapabilities — w8 precedence (explicit > preset > base, §3.2)", () => {
  it("the autism preset flows into the new caps", () => {
    const c = resolveCapabilities({ ageMode: "young", neuroProfile: "autism" });
    expect(c.noveltyMode).toBe("deterministic");
    expect(c.transitionWarnings).toBe(true);
    expect(c.celebrationCeiling).toBe("gentle");
    expect(c.feedbackTempo).toBe("calm");
    expect(c.literalLanguage).toBe(true);
    expect(c.neuroInputModeDefault).toBe("aac");
  });

  it("the both preset keeps a deterministic core + opt-in previewed novelty", () => {
    const c = resolveCapabilities({ ageMode: "older", neuroProfile: "both" });
    expect(c.noveltyMode).toBe("previewed");
    expect(c.previewNovelty).toBe(true);
    expect(c.transitionWarnings).toBe(true);
    expect(c.celebrationCeiling).toBe("medium");
  });

  it("an explicit override beats the preset", () => {
    const c = resolveCapabilities({
      ageMode: "young",
      neuroProfile: "autism",
      noveltyMode: "previewed",
      celebrationCeiling: "medium",
      literalLanguage: false,
    });
    expect(c.noveltyMode).toBe("previewed");
    expect(c.celebrationCeiling).toBe("medium");
    expect(c.literalLanguage).toBe(false);
    // untouched preset fields still flow
    expect(c.feedbackTempo).toBe("calm");
  });

  it("autoAdvanceSteps is a HARD false for every profile (§8 #14 — never a grant)", () => {
    for (const neuroProfile of [undefined, "autism", "adhd", "both"] as const) {
      expect(resolveCapabilities({ ageMode: "older", neuroProfile }).autoAdvanceSteps).toBe(false);
    }
  });
});
