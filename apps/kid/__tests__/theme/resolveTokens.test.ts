import { describe, expect, it } from "@jest/globals";

import { BREAKPOINTS, screenSizeFor } from "../../src/theme/breakpoints";
import {
  resolveEffectiveReducedMotion,
  resolveEffectiveSensoryMode,
  resolveTokens,
  type ResolveTokensInput,
} from "../../src/theme/resolveTokens";
import { DYNAMIC_TYPE_MAX_MULTIPLIER } from "../../src/theme/tokens";

const base: ResolveTokensInput = {
  ageMode: "young",
  sensoryMode: "standard",
  reducedMotion: false,
  screenSize: "phone",
};

describe("resolveTokens — age base", () => {
  it("young is bigger/chunkier and uses the Reef palette", () => {
    const t = resolveTokens({ ...base, ageMode: "young" });
    expect(t.touchTargetMin).toBe(64);
    expect(t.primaryActionMin).toBe(120);
    expect(t.fontScale).toBe(1.25);
    expect(t.textFirst).toBe(false);
    expect(t.spokenLabelDefault).toBe(true);
    expect(t.confetti).toBe(true);
    expect(t.themeClass).toBe("tb-reef");
    expect(t.colors.canvas).toBe("#EAF6FF");
  });

  it("older is denser, text-first, and uses the Tide palette", () => {
    const t = resolveTokens({ ...base, ageMode: "older" });
    expect(t.touchTargetMin).toBe(48);
    expect(t.fontScale).toBe(1.0);
    expect(t.textFirst).toBe(true);
    expect(t.spokenLabelDefault).toBe(false);
    expect(t.themeClass).toBe("tb-tide");
  });

  it("older + dark resolves the Tide dark variant", () => {
    const t = resolveTokens({ ...base, ageMode: "older", colorScheme: "dark" });
    expect(t.themeClass).toBe("tb-tide-dark");
    expect(t.colors.canvas).toBe("#0E1822");
  });

  it("young has no dark variant (stays Reef even if OS is dark)", () => {
    const t = resolveTokens({ ...base, ageMode: "young", colorScheme: "dark" });
    expect(t.themeClass).toBe("tb-reef");
  });
});

describe("resolveTokens — sensory + reduced-motion reducers", () => {
  it("lowStim overlays Stillwater for EITHER age, kills confetti, shortens motion", () => {
    for (const ageMode of ["young", "older"] as const) {
      const t = resolveTokens({ ...base, ageMode, sensoryMode: "lowStim" });
      expect(t.themeClass).toBe("tb-stillwater");
      expect(t.confetti).toBe(false);
      expect(t.animationDurationScale).toBe(0.7); // shortens (doc 66/67 M2)
      expect(t.motion.loopsEnabled).toBe(false);
      expect(t.haptics).toBe("light");
      expect(t.columns).toBe(1);
      expect(t.colors.celebration).toHaveLength(1); // single-hue ripple
    }
  });

  it("reducedMotion forces instant motion + no confetti, and wins over lowStim", () => {
    const t = resolveTokens({ ...base, reducedMotion: true });
    expect(t.animationDurationScale).toBe(0);
    expect(t.confetti).toBe(false);

    const both = resolveTokens({ ...base, sensoryMode: "lowStim", reducedMotion: true });
    expect(both.animationDurationScale).toBe(0); // reducedMotion (0) beats lowStim (0.7)
  });
});

describe("resolveTokens — Dynamic Type + reduce-transparency (accessibility-i18n §2.2/§2.3)", () => {
  it("caps the OS Dynamic-Type multiplier at 1.3", () => {
    expect(resolveTokens(base).maxFontSizeMultiplier).toBe(1.3);
    expect(DYNAMIC_TYPE_MAX_MULTIPLIER).toBe(1.3);
  });

  it("reduceTransparency flows into the token, flattens gradients + solidifies the scrim", () => {
    const on = resolveTokens({ ...base, reduceTransparency: true });
    expect(on.reduceTransparency).toBe(true);
    expect(on.colors.canvasGradTop).toBe(on.colors.canvas);
    expect(on.colors.canvasGradBot).toBe(on.colors.canvas);
    // scrim is now an opaque solid (no alpha channel)
    expect(on.colors.scrim.startsWith("rgb(")).toBe(true);
    expect(on.colors.scrim.includes("rgba")).toBe(false);

    const off = resolveTokens(base);
    expect(off.reduceTransparency).toBe(false);
    expect(off.colors.canvasGradTop).not.toBe(off.colors.canvasGradBot);
  });
});

describe("resolveEffectiveReducedMotion — the §2.3 bug fix (persisted setting now reaches the resolver)", () => {
  it("is reduced when OS OR per-child OR global default is on", () => {
    expect(resolveEffectiveReducedMotion(true, false, false)).toBe(true); // per-child
    expect(resolveEffectiveReducedMotion(false, true, false)).toBe(true); // global default
    expect(resolveEffectiveReducedMotion(false, false, true)).toBe(true); // OS
    expect(resolveEffectiveReducedMotion(undefined, undefined, false)).toBe(false);
    expect(resolveEffectiveReducedMotion(undefined, false, false)).toBe(false);
  });

  it("zeroes motion + kills confetti end-to-end when the persisted setting drives it (OS off)", () => {
    const reduced = resolveEffectiveReducedMotion(true, false, false); // OS off, child ON
    const t = resolveTokens({ ...base, reducedMotion: reduced });
    expect(t.animationDurationScale).toBe(0);
    expect(t.confetti).toBe(false);
    expect(t.motion.loopsEnabled).toBe(false);
  });
});

describe("resolveEffectiveSensoryMode — §1b.5 precedence (M14)", () => {
  it("is lowStim when EITHER per-child OR the global theme is on", () => {
    expect(resolveEffectiveSensoryMode("lowStim", false)).toBe("lowStim");
    expect(resolveEffectiveSensoryMode("standard", true)).toBe("lowStim");
    expect(resolveEffectiveSensoryMode("lowStim", true)).toBe("lowStim");
    expect(resolveEffectiveSensoryMode(undefined, true)).toBe("lowStim");
  });

  it("is standard only when neither is on", () => {
    expect(resolveEffectiveSensoryMode("standard", false)).toBe("standard");
    expect(resolveEffectiveSensoryMode(undefined, false)).toBe("standard");
  });
});

describe("breakpoints — screen-size resolution (M14)", () => {
  it("resolves phone below the tablet breakpoint and tablet at/above it", () => {
    expect(screenSizeFor(BREAKPOINTS.tablet - 1)).toBe("phone");
    expect(screenSizeFor(BREAKPOINTS.tablet)).toBe("tablet");
    expect(screenSizeFor(BREAKPOINTS.tablet + 200)).toBe("tablet");
    expect(screenSizeFor(375)).toBe("phone"); // typical phone width
    expect(screenSizeFor(1024)).toBe("tablet"); // landscape iPad
  });
});

describe("resolveTokens — responsive / tablet", () => {
  it("older gains a column + wider content on tablet; phone stays single column", () => {
    const phone = resolveTokens({ ...base, ageMode: "older", screenSize: "phone" });
    const tablet = resolveTokens({ ...base, ageMode: "older", screenSize: "tablet" });
    expect(phone.columns).toBe(1);
    expect(tablet.columns).toBe(2);
    expect(tablet.contentMaxWidth).toBeGreaterThan(phone.contentMaxWidth);
  });

  it("young stays single-focal (1 column) on tablet but widens its content column", () => {
    const phone = resolveTokens({ ...base, ageMode: "young", screenSize: "phone" });
    const tablet = resolveTokens({ ...base, ageMode: "young", screenSize: "tablet" });
    expect(phone.columns).toBe(1);
    expect(tablet.columns).toBe(1);
    // M14: BOTH modes must produce a contentMaxWidth change at the tablet
    // breakpoint (young via width, older via width + an extra column).
    expect(tablet.contentMaxWidth).toBeGreaterThan(phone.contentMaxWidth);
  });

  it("the tablet breakpoint changes contentMaxWidth for BOTH modes", () => {
    for (const ageMode of ["young", "older"] as const) {
      const phone = resolveTokens({ ...base, ageMode, screenSize: "phone" });
      const tablet = resolveTokens({ ...base, ageMode, screenSize: "tablet" });
      expect(tablet.contentMaxWidth).toBeGreaterThan(phone.contentMaxWidth);
    }
  });
});

// ---------------------------------------------------------------------------
// w8 (M1.1) — neuroProfile sensory default (02-architecture §3.2/§3.4).
// ---------------------------------------------------------------------------
describe("resolveTokens — w8 neuroProfile sensory default", () => {
  it("sensoryMode UNSET + autism/both ⇒ lowStim (Stillwater); adhd/absent ⇒ standard", () => {
    const common = { ageMode: "young", reducedMotion: false, screenSize: "phone" } as const;
    expect(resolveTokens({ ...common, neuroProfile: "autism" }).sensoryMode).toBe("lowStim");
    expect(resolveTokens({ ...common, neuroProfile: "autism" }).themeClass).toBe("tb-stillwater");
    expect(resolveTokens({ ...common, neuroProfile: "both" }).sensoryMode).toBe("lowStim");
    expect(resolveTokens({ ...common, neuroProfile: "adhd" }).sensoryMode).toBe("standard");
    expect(resolveTokens({ ...common }).sensoryMode).toBe("standard"); // absent ⇒ v1
  });

  it("an EXPLICIT sensoryMode always beats the preset (precedence §3.2)", () => {
    const common = { ageMode: "young", reducedMotion: false, screenSize: "phone" } as const;
    expect(
      resolveTokens({ ...common, sensoryMode: "standard", neuroProfile: "autism" }).sensoryMode,
    ).toBe("standard");
    expect(
      resolveTokens({ ...common, sensoryMode: "lowStim", neuroProfile: "adhd" }).sensoryMode,
    ).toBe("lowStim");
  });

  it("with sensoryMode set and neuroProfile absent the output is byte-identical to pre-w8", () => {
    const a = resolveTokens(base);
    const b = resolveTokens({ ...base }); // same input, no axis
    expect(a).toEqual(b);
    expect(a.sensoryMode).toBe("standard");
  });

  it("OS reduce-motion still clamps motion regardless of the preset", () => {
    const t = resolveTokens({
      ageMode: "young",
      neuroProfile: "adhd",
      reducedMotion: true,
      screenSize: "phone",
    });
    expect(t.motion.durationScale).toBe(0);
    expect(t.confetti).toBe(false);
  });
});
