/**
 * resolveContent.test.ts (shared) — M1.1b extraction acceptance: the moved
 * copy resolver keeps its v1 signatures (age-variant copy via the bundled
 * i18n catalog, buddy art from companionStyle, interpolation) and the M1.1
 * literal-language neuro branch (absent/neutral ⇒ v1 copy unchanged;
 * unauthored literal falls back to the age variant).
 */
import { describe, expect, it } from "@jest/globals";

import { ageModeLabel, resolveContent } from "../../src/theme/resolveContent";
import { COPY } from "../../src/i18n/en";

describe("resolveContent — age-variant copy (v1 behavior preserved)", () => {
  it("resolves young vs older variants from the catalog", () => {
    expect(resolveContent("celebrate.step", { ageMode: "young" })).toBe(COPY["celebrate.step"].young);
    expect(resolveContent("celebrate.step", { ageMode: "older" })).toBe(COPY["celebrate.step"].older);
  });

  it("preteen falls back to older when no identity override is authored", () => {
    // celebrate.step has no preteen branch → respectful older voice
    expect(resolveContent("celebrate.step", { ageMode: "preteen" })).toBe(COPY["celebrate.step"].older);
    // celebrate.levelup HAS a preteen branch → it wins
    expect(resolveContent("celebrate.levelup", { ageMode: "preteen" })).toBe(COPY["celebrate.levelup"].preteen);
  });

  it("interpolates {params} through the catalog accessor", () => {
    const s = resolveContent("a11y.tokenBalance", {
      ageMode: "young",
      params: { count: 4 },
    });
    expect(s).toContain("4");
    expect(s).not.toContain("{count}");
  });

  it("buddy.artVariant resolves from companionStyle, NEVER ageMode (no-fork rule)", () => {
    expect(resolveContent("buddy.artVariant", { companionStyle: "cuddly" })).toBe("bloop");
    expect(resolveContent("buddy.artVariant", { companionStyle: "cool" })).toBe("orbit");
    expect(resolveContent("buddy.artVariant", { companionStyle: "avatar" })).toBe("nova");
  });

  it("ageModeLabel names all three bands for parent surfaces (never raw)", () => {
    expect(ageModeLabel("young")).toBe("Younger");
    expect(ageModeLabel("older")).toBe("Older");
    expect(ageModeLabel("preteen")).toBe("Preteen");
  });
});

describe("resolveContent — neuroProfile literal branch (M1.1, integrated in the move)", () => {
  it("ABSENT neuroProfile ⇒ v1 copy unchanged (neutral preset)", () => {
    const plain = resolveContent("celebrate.step", { ageMode: "young" });
    const neutral = resolveContent("celebrate.step", { ageMode: "young", neuroProfile: "neutral" });
    expect(neutral).toBe(plain);
  });

  it("literal-language profile with an UNAUTHORED literal variant falls back to the age copy", () => {
    // no COPY entry ships a `literal` branch yet — the autism preset must
    // still resolve every key (graceful fallback, nothing breaks)
    const literal = resolveContent("celebrate.step", { ageMode: "young", neuroProfile: "autism" });
    expect(literal).toBe(COPY["celebrate.step"].young);
  });

  it("every COPY key resolves to a non-empty string for all three bands", () => {
    for (const key of Object.keys(COPY) as (keyof typeof COPY)[]) {
      for (const ageMode of ["young", "older", "preteen"] as const) {
        const s = resolveContent(key, { ageMode });
        expect(typeof s).toBe("string");
        expect(s.length).toBeGreaterThan(0);
      }
    }
  });
});
