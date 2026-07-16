/**
 * messages.test.ts (shared) — M1.1b extraction acceptance: the moved i18n
 * accessor keeps its never-crash fallback chain (locale → en → key echo),
 * the preteen → older fallback, interpolation, and the literal-language
 * branch fed by the neuro preset (never a raw profile read).
 */
import { describe, expect, it } from "@jest/globals";

import { AVAILABLE_LOCALES, isLocaleAvailable, SOURCE_LOCALE } from "../../src/i18n/catalog";
import { COPY, EN } from "../../src/i18n/en";
import { formatCount, getMessage, interpolate } from "../../src/i18n/messages";

describe("i18n catalog + accessor survive the move", () => {
  it("en ships as the source locale; registry helpers work", () => {
    expect(SOURCE_LOCALE).toBe("en");
    expect(AVAILABLE_LOCALES()).toContain("en");
    expect(isLocaleAvailable("en")).toBe(true);
    expect(isLocaleAvailable("xx")).toBe(false);
  });

  it("getMessage resolves age variants with the preteen → older fallback", () => {
    expect(getMessage("celebrate.step", { ageMode: "young" })).toBe(COPY["celebrate.step"].young);
    expect(getMessage("celebrate.step", { ageMode: "preteen" })).toBe(COPY["celebrate.step"].older);
  });

  it("a missing key echoes the key — a screen never renders blank or crashes", () => {
    expect(getMessage("definitely.not.a.key")).toBe("definitely.not.a.key");
  });

  it("a missing locale falls back to English", () => {
    expect(getMessage("celebrate.step", { locale: "xx", ageMode: "older" })).toBe(
      COPY["celebrate.step"].older,
    );
  });

  it("literal branch: falls back to the age variant when unauthored (nothing breaks)", () => {
    expect(getMessage("celebrate.step", { ageMode: "young", literal: true })).toBe(
      COPY["celebrate.step"].young,
    );
  });

  it("interpolate replaces known {tokens}, leaves unknown intact, never throws", () => {
    expect(interpolate("Pop {n} bubbles", { n: 3 })).toBe("Pop 3 bubbles");
    expect(interpolate("Keep {this}", {})).toBe("Keep {this}");
    expect(interpolate("No params")).toBe("No params");
  });

  it("formatCount handles the English plural pair", () => {
    expect(formatCount(1, "bubble", "bubbles")).toBe("1 bubble");
    expect(formatCount(3, "bubble", "bubbles")).toBe("3 bubbles");
  });

  it("every EN catalog entry is a string or carries both young + older", () => {
    for (const [key, entry] of Object.entries(EN)) {
      if (typeof entry === "string") continue;
      expect(`${key}:${typeof entry.young}`).toBe(`${key}:string`);
      expect(`${key}:${typeof entry.older}`).toBe(`${key}:string`);
    }
  });
});
