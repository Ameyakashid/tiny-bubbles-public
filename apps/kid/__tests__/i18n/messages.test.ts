import { describe, expect, it } from "@jest/globals";

import { formatCount, getMessage, interpolate } from "../../src/i18n/messages";

/**
 * accessibility-i18n §8.8 / §CREATE 15 — the pure message accessor:
 * key resolution, age-variant selection, `{param}` interpolation, English plural,
 * missing-locale → `en` fallback, missing-key → key echo (never crash).
 */
describe("getMessage — resolution", () => {
  it("resolves age variants (young default, explicit older)", () => {
    expect(getMessage("task.done", { ageMode: "young" })).toBe("Done!");
    expect(getMessage("task.done", { ageMode: "older" })).toBe("Mark done");
    // default branch is young (matches the old resolveContent behaviour)
    expect(getMessage("task.done")).toBe("Done!");
  });

  it("falls back preteen → older when no preteen override, else uses it", () => {
    // no preteen override -> respectful older voice
    expect(getMessage("task.done", { ageMode: "preteen" })).toBe("Mark done");
    // preteen override present -> uses it
    expect(getMessage("celebrate.levelup", { ageMode: "preteen" })).toBe("Level up.");
  });

  it("resolves a plain (age-invariant) string entry", () => {
    expect(getMessage("reminder.title")).toBe("Tiny Bubbles 🫧");
    expect(getMessage("language.english")).toBe("English");
  });

  it("interpolates {param} tokens (age-variant + plain)", () => {
    expect(
      getMessage("a11y.buddy.state", { ageMode: "young", params: { name: "Bloop", mood: "happy" } }),
    ).toBe("Bloop looks happy");
    expect(getMessage("reminder.body.1", { params: { label: "Homework" } })).toBe(
      "Whenever you're ready: Homework. 🫧",
    );
  });

  it("falls back to English for an unregistered locale", () => {
    expect(getMessage("task.done", { locale: "zz", ageMode: "older" })).toBe("Mark done");
  });

  it("echoes an unknown key instead of crashing", () => {
    expect(getMessage("does.not.exist")).toBe("does.not.exist");
    expect(getMessage("also.missing", { ageMode: "older", params: { x: 1 } })).toBe("also.missing");
  });
});

describe("interpolate", () => {
  it("replaces known tokens and leaves unknown ones intact", () => {
    expect(interpolate("Hi {name}", { name: "Ana" })).toBe("Hi Ana");
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
    expect(interpolate("plain", { name: "x" })).toBe("plain");
    expect(interpolate("{a} and {b}", { a: 1, b: 2 })).toBe("1 and 2");
  });
});

describe("formatCount — English plural", () => {
  it("uses the singular only for exactly one", () => {
    expect(formatCount(1, "bubble", "bubbles")).toBe("1 bubble");
    expect(formatCount(3, "bubble", "bubbles")).toBe("3 bubbles");
    expect(formatCount(0, "bubble", "bubbles")).toBe("0 bubbles");
  });
});
