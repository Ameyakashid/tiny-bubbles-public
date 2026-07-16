import { describe, expect, it } from "@jest/globals";

import type { AgeMode } from "../../src/domain/types";
import { ageModeLabel, COPY, resolveContent } from "../../src/theme/resolveContent";

const ALL_MODES: AgeMode[] = ["young", "older"];

describe("resolveContent", () => {
  it("resolves copy from ageMode", () => {
    expect(resolveContent("task.done", { ageMode: "young" })).toBe("Done!");
    expect(resolveContent("task.done", { ageMode: "older" })).toBe("Mark done");
  });

  it("resolves the buddy art variant from companionStyle (NOT ageMode)", () => {
    expect(resolveContent("buddy.artVariant", { companionStyle: "cuddly" })).toBe("bloop");
    expect(resolveContent("buddy.artVariant", { companionStyle: "cool" })).toBe("orbit");
  });

  it("every kid-facing copy key carries BOTH young and older variants", () => {
    for (const [, value] of Object.entries(COPY)) {
      expect(typeof value.young).toBe("string");
      expect(value.young.length).toBeGreaterThan(0);
      expect(typeof value.older).toBe("string");
      expect(value.older.length).toBeGreaterThan(0);
    }
  });

  it("resolveContent returns a non-empty string for every copy key in BOTH modes", () => {
    for (const key of Object.keys(COPY) as (keyof typeof COPY)[]) {
      for (const ageMode of ALL_MODES) {
        const v = resolveContent(key, { ageMode });
        expect(typeof v).toBe("string");
        expect(v.length).toBeGreaterThan(0);
      }
    }
  });

  it("ageModeLabel gives a distinct parent-facing name for each mode (no inline branch)", () => {
    expect(ageModeLabel("young")).toBe("Younger");
    expect(ageModeLabel("older")).toBe("Older");
    expect(ageModeLabel("young")).not.toBe(ageModeLabel("older"));
  });

  it("mood-checkin copy keys resolve BOTH age variants (mood-checkin §4.3)", () => {
    expect(resolveContent("mood.prompt", { ageMode: "young" })).toBe("How do you feel?");
    expect(resolveContent("mood.prompt", { ageMode: "older" })).toBe("How are you feeling?");
    expect(resolveContent("mood.thanks", { ageMode: "young" })).toBe("Thanks for sharing! 💛");
    expect(resolveContent("mood.calmOffer", { ageMode: "older" })).toBe("Try the calm corner?");
    for (const key of ["mood.energyPrompt", "mood.skip", "mood.checkIn", "mood.glanceEmpty", "mood.insightsEmpty"] as const) {
      expect(resolveContent(key, { ageMode: "young" }).length).toBeGreaterThan(0);
      expect(resolveContent(key, { ageMode: "older" }).length).toBeGreaterThan(0);
    }
  });

  it("if-then plan copy keys resolve BOTH age variants (if-then-plans §4.2)", () => {
    // the sentence glue is the ONLY age-adaptive part of the assembled if-then phrase
    expect(resolveContent("plans.thenYoung", { ageMode: "young" })).toBe("I'll");
    expect(resolveContent("plans.thenYoung", { ageMode: "older" })).toBe("I will");
    expect(resolveContent("plans.didIt", { ageMode: "young" })).toBe("I did it! 🫧");
    for (const key of [
      "plans.title",
      "plans.when",
      "plans.now",
      "plans.doItNow",
      "plans.hearIt",
      "plans.emptyKid",
      "plans.entry",
    ] as const) {
      expect(resolveContent(key, { ageMode: "young" }).length).toBeGreaterThan(0);
      expect(resolveContent(key, { ageMode: "older" }).length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// w8 (M1.1) — the literal-language copy branch (02-architecture §3.4).
// ---------------------------------------------------------------------------
describe("resolveContent — w8 literal-language fallback", () => {
  it("literal-language profiles FALL BACK to the age copy when no literal variant is authored", () => {
    // No catalog entry ships a `literal` variant yet — the branch must be a
    // pure no-op (nothing breaks; variants are filled in per-feature, §3.4).
    for (const key of ["buddy.greet", "plans.title", "timer.label"] as const) {
      for (const ageMode of ["young", "older"] as const) {
        const base = resolveContent(key, { ageMode });
        expect(resolveContent(key, { ageMode, neuroProfile: "autism" })).toBe(base);
        expect(resolveContent(key, { ageMode, neuroProfile: "both" })).toBe(base);
        expect(resolveContent(key, { ageMode, neuroProfile: "adhd" })).toBe(base);
      }
    }
  });

  it("an authored literal variant is selected by the accessor ONLY under literal:true", () => {
    // Register a throwaway locale carrying a `literal` branch, prove the
    // accessor's selection + fallback, then unregister (EN stays untouched).
    const { CATALOGS } = require("../../src/i18n/catalog");
    const { getMessage } = require("../../src/i18n/messages");
    CATALOGS["x-lit-test"] = {
      "buddy.greet": { young: "hi", older: "hey", literal: "Hello. Time to start." },
    };
    try {
      expect(
        getMessage("buddy.greet", { locale: "x-lit-test", ageMode: "young", literal: true }),
      ).toBe("Hello. Time to start.");
      // without the flag, the age variant wins
      expect(getMessage("buddy.greet", { locale: "x-lit-test", ageMode: "young" })).toBe("hi");
      expect(
        getMessage("buddy.greet", { locale: "x-lit-test", ageMode: "older", literal: false }),
      ).toBe("hey");
    } finally {
      delete CATALOGS["x-lit-test"];
    }
  });
});
