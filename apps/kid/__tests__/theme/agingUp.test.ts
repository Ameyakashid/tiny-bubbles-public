/**
 * __tests__/theme/agingUp.test.ts — the aging-up (`preteen` tier + `avatar`
 * companion) focused suite (aging-up §7). Asserts the preteen resolutions, the
 * `avatar → nova` mapping, `companionStyle` on capabilities, the identity copy +
 * `older` fallback, the positive-only Nova pose, and calm/low-stim composition.
 *
 * Pure/resolver-level only (no store) — the persisted-data lossless-switch
 * guarantee (AC5) is structural: `ageMode`/`companionStyle` are union widenings
 * with the SAME persisted shape, so a switch never touches ledger/progress/growth
 * (arch §2.2 / aging-up §6.5). Here we prove the decoupling stays 3-wide and the
 * resolvers are total over the widened unions.
 */
import { describe, expect, it } from "@jest/globals";

import type { AgeMode, CompanionMood, CompanionStyle } from "../../src/domain/types";
import {
  defaultCompanionStyle,
  defaultTextFirst,
  resolveCapabilities,
} from "../../src/theme/resolveCapabilities";
import { resolveContent } from "../../src/theme/resolveContent";
import { resolveTokens, type ResolveTokensInput } from "../../src/theme/resolveTokens";
import { buddyPose, VARIANT_PRESETS } from "../../components/buddy/buddyVisuals";

const base: ResolveTokensInput = {
  ageMode: "preteen",
  sensoryMode: "standard",
  reducedMotion: false,
  screenSize: "phone",
};

describe("aging-up — AC2 resolvers (preteen)", () => {
  it("resolveTokens(preteen) → Tide palette, text-first, older metrics", () => {
    const light = resolveTokens({ ...base });
    expect(light.themeClass).toBe("tb-tide");
    expect(light.textFirst).toBe(true);
    expect(light.spokenLabelDefault).toBe(false);
    expect(light.fontScale).toBe(1.0);

    // Tide is the only palette with a dark variant — preteen reaches it.
    const dark = resolveTokens({ ...base, colorScheme: "dark" });
    expect(dark.themeClass).toBe("tb-tide-dark");
  });

  it("resolveTokens(preteen) → 1 column phone / 2 columns tablet (mirrors older)", () => {
    expect(resolveTokens({ ...base, screenSize: "phone" }).columns).toBe(1);
    const tablet = resolveTokens({ ...base, screenSize: "tablet" });
    expect(tablet.columns).toBe(2);
    expect(tablet.contentMaxWidth).toBeGreaterThan(
      resolveTokens({ ...base, screenSize: "phone" }).contentMaxWidth,
    );
  });

  it("resolveCapabilities(preteen) → Tabs + numbers + max 6 + avatar/identity + delegate", () => {
    const caps = resolveCapabilities({ ageMode: "preteen" });
    expect(caps.multiStepVisible).toBe(true);
    expect(caps.showNumbersAndCharts).toBe(true);
    expect(caps.maxChoices).toBe(6);
    expect(caps.companionStyle).toBe("avatar");
    expect(caps.companionFraming).toBe("identity");
    expect(caps.delegateToChild).toBe(true);
    expect(caps.textPrimary).toBe(true);
    expect(caps.canPickColor).toBe(true);
    expect(caps.canPickAccessory).toBe(true);
    expect(caps.canPickTheme).toBe(true);
  });

  it("avatar companionStyle resolves to the nova art variant", () => {
    expect(resolveContent("buddy.artVariant", { companionStyle: "avatar" })).toBe("nova");
  });

  it("age defaults: preteen → avatar + text-first (both overridable)", () => {
    expect(defaultCompanionStyle("preteen")).toBe("avatar");
    expect(defaultTextFirst("preteen")).toBe(true);
    // young/older unchanged
    expect(defaultCompanionStyle("young")).toBe("cuddly");
    expect(defaultCompanionStyle("older")).toBe("cool");
  });
});

describe("aging-up — AC3 identity copy + older fallback", () => {
  it("preteen identity overrides apply where defined", () => {
    expect(resolveContent("buddy.tabTitle", { ageMode: "preteen" })).toBe("Avatar");
    expect(resolveContent("buddy.stat.bond", { ageMode: "preteen" })).toBe("Level");
    expect(resolveContent("buddy.stat.growth", { ageMode: "preteen" })).toBe("Rank");
    expect(resolveContent("buddy.stat.mood", { ageMode: "preteen" })).toBe("Vibe");
    expect(resolveContent("buddy.greet", { ageMode: "preteen" })).toBe("Hey. Ready when you are.");
    expect(resolveContent("celebrate.levelup", { ageMode: "preteen" })).toBe("Level up.");
  });

  it("preteen falls back to the OLDER string (never young) where no override exists", () => {
    // task.done has no preteen override → older "Mark done" (not young "Done!")
    expect(resolveContent("task.done", { ageMode: "preteen" })).toBe(
      resolveContent("task.done", { ageMode: "older" }),
    );
    expect(resolveContent("task.done", { ageMode: "preteen" })).not.toBe(
      resolveContent("task.done", { ageMode: "young" }),
    );
    expect(resolveContent("celebrate.step", { ageMode: "preteen" })).toBe(
      resolveContent("celebrate.step", { ageMode: "older" }),
    );
  });
});

describe("aging-up — AC4 Nova companion is never negative", () => {
  const MOODS: CompanionMood[] = [
    "content",
    "happy",
    "excited",
    "sleepy",
    "celebrating",
    "curious",
    "proud",
  ];

  it("every mood yields smile >= 0 (no frown), and Nova is a valid preset", () => {
    for (const mood of MOODS) {
      expect(buddyPose(mood).smile).toBeGreaterThanOrEqual(0);
    }
    const nova = VARIANT_PRESETS.nova;
    expect(nova).toBeDefined();
    expect(nova.identityRing).toBe(true);
    expect(nova.cheeks).toBe(false);
    expect(nova.expressiveness).toBeGreaterThanOrEqual(0);
  });
});

describe("aging-up — AC5 companion/age decoupling stays 3-wide (lossless)", () => {
  it("companionStyle override flips framing/art independent of age", () => {
    // a preteen who keeps the cuddly buddy -> care framing + bloop
    const cuddlyPreteen = resolveCapabilities({ ageMode: "preteen", companionStyle: "cuddly" });
    expect(cuddlyPreteen.companionStyle).toBe("cuddly");
    expect(cuddlyPreteen.companionFraming).toBe("care");
    expect(resolveContent("buddy.artVariant", { companionStyle: cuddlyPreteen.companionStyle })).toBe(
      "bloop",
    );
    // a young kid set to the avatar -> identity framing + nova (decoupled)
    const avatarYoung = resolveCapabilities({ ageMode: "young", companionStyle: "avatar" });
    expect(avatarYoung.companionStyle).toBe("avatar");
    expect(avatarYoung.companionFraming).toBe("identity");
  });

  it("resolvers are total over the widened unions (no undefined lookups)", () => {
    const ALL: AgeMode[] = ["young", "older", "preteen"];
    const STYLES: CompanionStyle[] = ["cuddly", "cool", "avatar"];
    for (const ageMode of ALL) {
      const caps = resolveCapabilities({ ageMode });
      expect(caps.companionStyle).toBeDefined();
      expect(resolveTokens({ ...base, ageMode }).themeClass).toBeTruthy();
    }
    for (const companionStyle of STYLES) {
      expect(resolveContent("buddy.artVariant", { companionStyle })).toBeTruthy();
    }
  });
});

describe("aging-up — AC8 preteen composes with low-stim / reduced-motion", () => {
  it("preteen + lowStim → Stillwater + no confetti + static (loops off)", () => {
    const t = resolveTokens({ ...base, sensoryMode: "lowStim" });
    expect(t.themeClass).toBe("tb-stillwater");
    expect(t.confetti).toBe(false);
    expect(t.motion.loopsEnabled).toBe(false); // Nova renders static (animate=false)
  });

  it("preteen + reducedMotion → instant motion + no confetti", () => {
    const t = resolveTokens({ ...base, reducedMotion: true });
    expect(t.animationDurationScale).toBe(0);
    expect(t.confetti).toBe(false);
  });
});
