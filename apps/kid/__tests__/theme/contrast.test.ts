import { describe, expect, it } from "@jest/globals";

import {
  AA_BODY,
  contrastRatio,
  meetsAA,
  parseColor,
  relativeLuminance,
} from "../../src/theme/contrast";
import { REEF, STILLWATER, TIDE_DARK, TIDE_LIGHT, type ThemeColors } from "../../src/theme/tokens";

/**
 * accessibility-i18n §CREATE 17 / §8.6 — machine-checked WCAG AA guard. Asserts
 * the design's guaranteed pairings (`61` §2.1) across ALL FOUR palettes so a
 * future token edit that regresses below target fails CI. Body text ≥ 4.5:1;
 * the primary text-bearing surface (onPrimary on primaryDeep, onDark on a dark
 * surface) ≥ 4.5:1.
 */
describe("contrast — helper math", () => {
  it("computes black/white as the WCAG max 21:1 and identical colors as 1:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("is order-independent", () => {
    expect(contrastRatio("#123456", "#EEEEEE")).toBeCloseTo(
      contrastRatio("#EEEEEE", "#123456"),
      6,
    );
  });

  it("parses #RGB, #RRGGBB and rgb()/rgba()", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("#1EA7E6")).toEqual({ r: 30, g: 167, b: 230 });
    expect(parseColor("rgba(10,32,52,0.72)")).toEqual({ r: 10, g: 32, b: 52 });
  });

  it("relative luminance is 0 for black and ~1 for white", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("meetsAA honors the body vs large threshold", () => {
    // a pairing at ~3.4:1 fails body (4.5) but passes large (3)
    const fg = "#8C8C8C";
    const bg = "#FFFFFF";
    const r = contrastRatio(fg, bg);
    expect(r).toBeGreaterThanOrEqual(3);
    expect(r).toBeLessThan(AA_BODY);
    expect(meetsAA(fg, bg)).toBe(false);
    expect(meetsAA(fg, bg, { large: true })).toBe(true);
  });
});

const ALL: Record<string, ThemeColors> = {
  Reef: REEF,
  TideLight: TIDE_LIGHT,
  TideDark: TIDE_DARK,
  Stillwater: STILLWATER,
};

describe("contrast — every palette meets WCAG AA on its guaranteed pairings", () => {
  for (const [name, c] of Object.entries(ALL)) {
    it(`${name}: body text ≥ 4.5:1 on every surface`, () => {
      for (const bg of [c.surface, c.canvas, c.surfaceAlt, c.surfaceSunken]) {
        expect(meetsAA(c.text, bg)).toBe(true);
      }
      // secondary/dim text ≥ 4.5:1 on the primary surfaces it renders on
      expect(meetsAA(c.textDim, c.surface)).toBe(true);
      expect(meetsAA(c.textDim, c.canvas)).toBe(true);
    });

    it(`${name}: onPrimary text ≥ 4.5:1 on the deep primary tone`, () => {
      expect(meetsAA(c.onPrimary, c.primaryDeep)).toBe(true);
    });
  }

  it("onDark text ≥ 4.5:1 on a genuinely dark surface (light palettes)", () => {
    for (const c of [REEF, TIDE_LIGHT, STILLWATER]) {
      expect(meetsAA(c.onDark, c.primaryDeep)).toBe(true);
    }
    // Tide dark: onDark == text renders on the dark canvas/surface
    expect(meetsAA(TIDE_DARK.onDark, TIDE_DARK.canvas)).toBe(true);
    expect(meetsAA(TIDE_DARK.onDark, TIDE_DARK.surface)).toBe(true);
  });
});
