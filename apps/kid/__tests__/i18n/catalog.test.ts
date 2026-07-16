import { describe, expect, it } from "@jest/globals";

import { AVAILABLE_LOCALES, CATALOGS, SOURCE_LOCALE, isLocaleAvailable } from "../../src/i18n/catalog";
import { COPY, EN, PLAIN } from "../../src/i18n/en";
import { getMessage } from "../../src/i18n/messages";

/**
 * accessibility-i18n §CREATE 16 — the catalog is complete + well-formed:
 * every age-variant entry carries BOTH required variants, every key resolves in
 * both age modes, the registry advertises English, and the `content-typetest`
 * (compile-time) still proves a preteen-only entry is a type error.
 */
describe("en catalog — completeness", () => {
  it("registers English as the source locale", () => {
    expect(SOURCE_LOCALE).toBe("en");
    expect(AVAILABLE_LOCALES()).toContain("en");
    expect(isLocaleAvailable("en")).toBe(true);
    expect(isLocaleAvailable("zz")).toBe(false);
    expect(CATALOGS.en).toBe(EN);
  });

  it("every age-variant (COPY) entry carries BOTH young and older", () => {
    for (const [key, value] of Object.entries(COPY)) {
      expect(typeof value.young).toBe("string");
      expect(value.young.length).toBeGreaterThan(0);
      expect(typeof value.older).toBe("string");
      expect(value.older.length).toBeGreaterThan(0);
      // preteen is optional; when present it must be a non-empty string
      if ("preteen" in value && value.preteen !== undefined) {
        expect(typeof value.preteen).toBe("string");
        expect((value.preteen as string).length).toBeGreaterThan(0);
      }
      // sanity: the key resolves in every age mode
      for (const ageMode of ["young", "older", "preteen"] as const) {
        expect(getMessage(key, { ageMode }).length).toBeGreaterThan(0);
      }
    }
  });

  it("every plain entry is a non-empty string and resolves", () => {
    for (const [key, value] of Object.entries(PLAIN)) {
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
      // params are optional; a template resolves to a non-empty string regardless
      expect(getMessage(key).length).toBeGreaterThan(0);
    }
  });

  it("EN is the union of COPY + PLAIN keys (no key lost in the merge)", () => {
    const merged = new Set([...Object.keys(COPY), ...Object.keys(PLAIN)]);
    expect(new Set(Object.keys(EN))).toEqual(merged);
  });

  it("preteen falls back to older where no override exists", () => {
    // task.done has no preteen override -> respectful older voice
    expect(getMessage("task.done", { ageMode: "preteen" })).toBe(
      getMessage("task.done", { ageMode: "older" }),
    );
  });
});
