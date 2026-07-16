/**
 * symbolLicense.test.ts — the canonical license schema + the gate core:
 * ARASAAC/Sclera/any-NC/GPL and user/unknown NEVER ship; completeness fails
 * an orphan asset (M1.1 acceptance; §8 #22).
 */
import { describe, expect, it } from "@jest/globals";

import {
  ALLOWED_SYMBOL_LICENSES,
  assertSymbolManifestClean,
  checkSymbolManifest,
  isSymbolLicenseClean,
  type SymbolAssetManifestEntry,
} from "../../src/compliance/symbolLicense";

const clean = (over: Partial<SymbolAssetManifestEntry> = {}): SymbolAssetManifestEntry => ({
  file: "core/want.png",
  source: "Mulberry Symbols",
  license: "CC-BY-SA",
  attribution: "Mulberry Symbols (Steve Lee) — CC-BY-SA 2.0 UK",
  ...over,
});

describe("isSymbolLicenseClean — the license line", () => {
  it("accepts every allowed license (with attribution where required)", () => {
    for (const license of ALLOWED_SYMBOL_LICENSES) {
      const entry = clean({
        license,
        source: "original tiny-bubbles art",
        attribution: license === "CC-BY" || license === "CC-BY-SA" ? "artist credit" : undefined,
      });
      expect(isSymbolLicenseClean(entry)).toBe(true);
    }
  });

  it("BANS ARASAAC (CC-BY-NC-SA) — non-commercial", () => {
    expect(
      isSymbolLicenseClean({
        file: "x.png",
        source: "ARASAAC",
        license: "CC-BY-SA",
        attribution: "ARASAAC",
      }),
    ).toBe(false);
  });

  it("BANS Sclera (CC-BY-NC) — non-commercial", () => {
    expect(
      isSymbolLicenseClean({ file: "x.png", source: "Sclera pictograms", license: "CC-BY", attribution: "s" }),
    ).toBe(false);
  });

  it("BANS any -NC license marker even under a mislabeled row", () => {
    expect(
      isSymbolLicenseClean({
        file: "x.png",
        source: "some set (CC-BY-NC-SA 4.0)",
        license: "CC-BY-SA",
        attribution: "set",
      }),
    ).toBe(false);
  });

  it("BANS GPL/AGPL art", () => {
    expect(
      isSymbolLicenseClean({ file: "x.png", source: "icons (GPL-3.0)", license: "original" }),
    ).toBe(false);
    expect(
      isSymbolLicenseClean({ file: "x.png", source: "AGPL art pack", license: "original" }),
    ).toBe(false);
  });

  it("user/unknown are modeled but NEVER ship (§8 #22)", () => {
    expect(isSymbolLicenseClean(clean({ license: "user" }))).toBe(false);
    expect(isSymbolLicenseClean(clean({ license: "unknown" }))).toBe(false);
  });

  it("CC-BY / CC-BY-SA without attribution is not clean", () => {
    expect(isSymbolLicenseClean(clean({ attribution: undefined }))).toBe(false);
  });
});

describe("checkSymbolManifest / assertSymbolManifestClean — completeness (§8 #22)", () => {
  it("passes a complete clean manifest", () => {
    const rows = [clean(), clean({ file: "core/more.png" })];
    expect(() => assertSymbolManifestClean(rows, ["core/want.png", "core/more.png"])).not.toThrow();
  });

  it("passes vacuously on an empty manifest + no assets (pre-w4)", () => {
    expect(() => assertSymbolManifestClean([], [])).not.toThrow();
  });

  it("FAILS an orphan asset file with no manifest row (a renamed NC asset cannot slip)", () => {
    const result = checkSymbolManifest([clean()], ["core/want.png", "core/orphan.png"]);
    expect(result.clean).toBe(false);
    expect(result.problems.join("\n")).toMatch(/orphan\.png.*NO manifest row/);
    expect(() => assertSymbolManifestClean([clean()], ["core/want.png", "core/orphan.png"])).toThrow(
      /orphan/,
    );
  });

  it("FAILS a stale manifest row pointing at a missing file", () => {
    const result = checkSymbolManifest([clean()], []);
    expect(result.clean).toBe(false);
    expect(result.problems.join("\n")).toMatch(/no matching asset file/);
  });

  it("FAILS a fixture manifest containing an ARASAAC / Sclera / CC-BY-NC row", () => {
    const rows: SymbolAssetManifestEntry[] = [
      clean(),
      { file: "banned/a.png", source: "ARASAAC", license: "CC-BY-SA", attribution: "ARASAAC" },
    ];
    expect(() =>
      assertSymbolManifestClean(rows, ["core/want.png", "banned/a.png"]),
    ).toThrow(/not license-clean/);
  });
});
