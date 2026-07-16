/**
 * resolveTokens.test.ts (shared) — M1.1b extraction acceptance: the moved
 * token resolver keeps the v1 age/sensory/motion behavior and the M1.1
 * neuroProfile default-fill (explicit sensoryMode always wins; absent
 * profile ⇒ standard ⇒ v1 output).
 */
import { describe, expect, it } from "@jest/globals";

import {
  resolveEffectiveReducedMotion,
  resolveEffectiveSensoryMode,
  resolveThemeClass,
  resolveTokens,
} from "../../src/theme/resolveTokens";
import { REEF, STILLWATER, TIDE_DARK, TIDE_LIGHT } from "../../src/theme/tokens";

const BASE = { reducedMotion: false, screenSize: "phone" as const };

describe("resolveTokens — v1 age × sensory behavior preserved", () => {
  it("young/standard = Reef; older/standard = Tide; lowStim = Stillwater for both ages", () => {
    expect(resolveTokens({ ageMode: "young", sensoryMode: "standard", ...BASE }).colors).toEqual(REEF);
    expect(resolveTokens({ ageMode: "older", sensoryMode: "standard", ...BASE }).colors).toEqual(TIDE_LIGHT);
    expect(resolveTokens({ ageMode: "young", sensoryMode: "lowStim", ...BASE }).colors).toEqual(STILLWATER);
    expect(resolveTokens({ ageMode: "older", sensoryMode: "lowStim", ...BASE }).colors).toEqual(STILLWATER);
  });

  it("only Tide has a dark variant; resolveThemeClass matches", () => {
    const dark = resolveTokens({
      ageMode: "older",
      sensoryMode: "standard",
      colorScheme: "dark",
      ...BASE,
    });
    expect(dark.colors).toEqual(TIDE_DARK);
    expect(dark.themeClass).toBe("tb-tide-dark");
    expect(resolveThemeClass("young", "standard")).toBe("tb-reef");
    expect(resolveThemeClass("older", "lowStim")).toBe("tb-stillwater");
  });

  it("reducers: lowStim shortens motion + kills confetti; reducedMotion zeroes durations", () => {
    const low = resolveTokens({ ageMode: "young", sensoryMode: "lowStim", ...BASE });
    expect(low.motion.durationScale).toBe(0.7);
    expect(low.confetti).toBe(false);
    expect(low.haptics).toBe("light");
    const reduced = resolveTokens({
      ageMode: "young",
      sensoryMode: "standard",
      reducedMotion: true,
      screenSize: "phone",
    });
    expect(reduced.motion.durationScale).toBe(0);
    expect(reduced.motion.loopsEnabled).toBe(false);
    expect(reduced.confetti).toBe(false);
  });

  it("responsive: older gains a tablet column; young stays single-focal", () => {
    expect(
      resolveTokens({ ageMode: "older", sensoryMode: "standard", reducedMotion: false, screenSize: "tablet" }).columns,
    ).toBe(2);
    expect(
      resolveTokens({ ageMode: "young", sensoryMode: "standard", reducedMotion: false, screenSize: "tablet" }).columns,
    ).toBe(1);
  });
});

describe("resolveTokens — neuroProfile axis (M1.1, integrated in the move)", () => {
  it("ABSENT neuroProfile + explicit sensoryMode ⇒ identical to a call without the field", () => {
    const withField = resolveTokens({
      ageMode: "older",
      sensoryMode: "standard",
      neuroProfile: undefined,
      ...BASE,
    });
    const withoutField = resolveTokens({ ageMode: "older", sensoryMode: "standard", ...BASE });
    expect(withField).toEqual(withoutField);
  });

  it("UNSET sensoryMode fills from the preset: autism/both ⇒ lowStim; adhd/neutral/absent ⇒ standard", () => {
    expect(resolveTokens({ ageMode: "young", neuroProfile: "autism", ...BASE }).sensoryMode).toBe("lowStim");
    expect(resolveTokens({ ageMode: "young", neuroProfile: "both", ...BASE }).sensoryMode).toBe("lowStim");
    expect(resolveTokens({ ageMode: "young", neuroProfile: "adhd", ...BASE }).sensoryMode).toBe("standard");
    expect(resolveTokens({ ageMode: "young", ...BASE }).sensoryMode).toBe("standard");
  });

  it("an EXPLICIT sensoryMode always wins over the preset (precedence §3.2)", () => {
    const t = resolveTokens({
      ageMode: "young",
      sensoryMode: "standard",
      neuroProfile: "autism",
      ...BASE,
    });
    expect(t.sensoryMode).toBe("standard");
    expect(t.colors).toEqual(REEF);
  });
});

describe("effective-mode helpers (v1 behavior preserved)", () => {
  it("resolveEffectiveSensoryMode ORs child + global lowStim", () => {
    expect(resolveEffectiveSensoryMode("lowStim", false)).toBe("lowStim");
    expect(resolveEffectiveSensoryMode("standard", true)).toBe("lowStim");
    expect(resolveEffectiveSensoryMode(undefined, false)).toBe("standard");
  });

  it("resolveEffectiveReducedMotion ORs child ∨ global ∨ OS", () => {
    expect(resolveEffectiveReducedMotion(true, false, false)).toBe(true);
    expect(resolveEffectiveReducedMotion(undefined, true, false)).toBe(true);
    expect(resolveEffectiveReducedMotion(undefined, undefined, true)).toBe(true);
    expect(resolveEffectiveReducedMotion(false, false, false)).toBe(false);
  });
});
