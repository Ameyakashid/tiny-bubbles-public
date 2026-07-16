/**
 * __tests__/config/dev-screens-gated.test.ts — asserts the two dev diagnostic
 * screens are gated for store builds (production-readiness §2.6).
 *
 * The robust guard is the per-screen `<Redirect>` (so a deep-link to /_sandbox or
 * /_theme-gallery in a production bundle lands back on the boot route regardless
 * of bundling), backed by conditional `<Stack.Screen>` registration in _layout.
 * This gate keeps BOTH in place as the app evolves.
 */
import { readFileSync } from "fs";
import { join, resolve } from "path";

import { describe, expect, it } from "@jest/globals";

import { DEV_SCREENS_ENABLED } from "../../src/config/flags";

const ROOT = resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("dev-screen gating (§2.6)", () => {
  it("exports a boolean DEV_SCREENS_ENABLED flag (ON under __DEV__ in jest)", () => {
    expect(typeof DEV_SCREENS_ENABLED).toBe("boolean");
    // jest runs with __DEV__ true, so the dev screens are enabled here.
    expect(DEV_SCREENS_ENABLED).toBe(true);
  });

  it("flags.ts derives the flag from __DEV__ + EXPO_PUBLIC_TB_DEV_SCREENS", () => {
    const src = read("src/config/flags.ts");
    expect(src).toMatch(/DEV_SCREENS_ENABLED/);
    expect(src).toMatch(/__DEV__/);
    expect(src).toMatch(/EXPO_PUBLIC_TB_DEV_SCREENS/);
  });

  for (const rel of ["app/_sandbox.tsx", "app/_theme-gallery.tsx"]) {
    it(`${rel} self-guards with a DEV_SCREENS_ENABLED redirect`, () => {
      const src = read(rel);
      expect(src).toMatch(/DEV_SCREENS_ENABLED/);
      // early return to the boot route when the flag is off
      expect(src).toMatch(/if\s*\(\s*!DEV_SCREENS_ENABLED\s*\)\s*return\s*<Redirect/);
      expect(src).toMatch(/href="\/"/);
    });
  }

  it("_layout.tsx registers both dev screens ONLY behind the flag", () => {
    const src = read("app/_layout.tsx");
    expect(src).toMatch(/\{DEV_SCREENS_ENABLED\s*&&/);
    // both dev routes appear, and only inside the conditional block
    const conditionalBlock = src.slice(src.indexOf("{DEV_SCREENS_ENABLED"));
    expect(conditionalBlock).toMatch(/name="_sandbox"/);
    expect(conditionalBlock).toMatch(/name="_theme-gallery"/);
    // no UNCONDITIONAL registration remains
    const before = src.slice(0, src.indexOf("{DEV_SCREENS_ENABLED"));
    expect(before).not.toMatch(/name="_sandbox"/);
    expect(before).not.toMatch(/name="_theme-gallery"/);
  });
});
