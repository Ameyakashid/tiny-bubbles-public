/**
 * tokensAndContrast.test.ts (shared) — M1.1b extraction acceptance for the
 * moved support modules: the palettes keep their WCAG AA guarantees (the
 * contrast math itself moved too), and the pure breakpoint bucket behaves.
 */
import { describe, expect, it } from "@jest/globals";

import { BREAKPOINTS, screenSizeFor } from "../../src/theme/breakpoints";
import { AA_BODY, AA_LARGE, contrastRatio, meetsAA } from "../../src/theme/contrast";
import {
  REEF,
  SPACE,
  spacing,
  STILLWATER,
  TIDE_DARK,
  TIDE_LIGHT,
  type ThemeColors,
} from "../../src/theme/tokens";

const PALETTES: Record<string, ThemeColors> = {
  REEF,
  TIDE_LIGHT,
  TIDE_DARK,
  STILLWATER,
};

describe("tokens + contrast — AA guarantees survive the move", () => {
  it("body text meets AA (≥4.5:1) on canvas + surface in every palette", () => {
    for (const [name, p] of Object.entries(PALETTES)) {
      expect(`${name}:${meetsAA(p.text, p.canvas)}`).toBe(`${name}:true`);
      expect(`${name}:${meetsAA(p.text, p.surface)}`).toBe(`${name}:true`);
    }
  });

  it("onPrimary text meets body AA (≥4.5:1) on the deep primary tone in every palette (v1 contract)", () => {
    for (const [name, p] of Object.entries(PALETTES)) {
      expect(`${name}:${meetsAA(p.onPrimary, p.primaryDeep)}`).toBe(`${name}:true`);
    }
  });

  it("contrast math sanity: black/white = 21:1, thresholds exported", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(AA_BODY).toBe(4.5);
    expect(AA_LARGE).toBe(3);
  });

  it("no palette ships a child-facing red/danger key (contract shape holds)", () => {
    // the ThemeColors contract deliberately has no `danger`/`error` key;
    // gentleAlert is the only warm-amber, parent-facing signal.
    for (const p of Object.values(PALETTES)) {
      expect((p as Record<string, unknown>).danger).toBeUndefined();
      expect((p as Record<string, unknown>).error).toBeUndefined();
    }
  });

  it("spacing helper stays on the 4px grid; SPACE tokens intact", () => {
    expect(spacing(4)).toBe(16);
    expect(SPACE.md).toBe(16);
  });
});

describe("breakpoints (pure part) — sw600dp bucket", () => {
  it("maps widths to phone/tablet at the 600dp threshold", () => {
    expect(BREAKPOINTS.tablet).toBe(600);
    expect(screenSizeFor(599)).toBe("phone");
    expect(screenSizeFor(600)).toBe("tablet");
    expect(screenSizeFor(1024)).toBe("tablet");
  });
});
