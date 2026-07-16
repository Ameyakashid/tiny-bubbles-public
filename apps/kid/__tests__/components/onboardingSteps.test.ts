import { describe, expect, it } from "@jest/globals";

import type { OnboardingStep } from "../../src/domain/types";
import {
  clampOnboardingStep,
  ONBOARDING_ORDER,
  nextStepAfter,
  routeForStep,
  stepIndexOf,
} from "../../components/onboarding/steps";

/**
 * The single canonical onboarding sequence (doc 66 §1b.8, streamlined per doc 70
 * §F to 4 screens). gate-setup MUST still sit before child-setup so the parent
 * gate is configured before the child can reach (kid). These tests lock the
 * order, the navigation helpers, and the resume-after-kill clamp for steps that
 * older builds may have persisted.
 */
describe("onboarding step map", () => {
  const CANONICAL: OnboardingStep[] = [
    "welcome",
    "parent_gate_setup",
    "child_setup",
    "done",
  ];

  it("matches the streamlined §F order exactly", () => {
    expect(ONBOARDING_ORDER.map((s) => s.step)).toEqual(CANONICAL);
  });

  it("places the parent gate before child setup (gate-before-kid invariant)", () => {
    expect(stepIndexOf("parent_gate_setup")).toBeLessThan(stepIndexOf("child_setup"));
  });

  it("welcome is the group index route", () => {
    expect(routeForStep("welcome")).toBe("/(onboarding)");
  });

  it("nextStepAfter walks the sequence and stops at done", () => {
    expect(nextStepAfter("welcome")?.step).toBe("parent_gate_setup");
    expect(nextStepAfter("child_setup")?.step).toBe("done");
    expect(nextStepAfter("done")).toBeUndefined();
  });

  it("every step has a route", () => {
    for (const { route } of ONBOARDING_ORDER) {
      expect(typeof route).toBe("string");
      expect((route as string).startsWith("/(onboarding)")).toBe(true);
    }
  });

  describe("resume clamp (removed steps must map to a safe survivor)", () => {
    it("passes surviving steps through unchanged", () => {
      for (const step of CANONICAL) {
        expect(clampOnboardingStep(step)).toBe(step);
      }
    });

    it("maps removed steps to invariant-safe survivors", () => {
      // consent is re-run on welcome (so privacyConsentAckAt is guaranteed)
      expect(clampOnboardingStep("privacy_consent")).toBe("welcome");
      // buddy/first-task/calm all came after child setup -> route through it
      expect(clampOnboardingStep("pick_buddy")).toBe("child_setup");
      expect(clampOnboardingStep("first_task")).toBe("child_setup");
      expect(clampOnboardingStep("calm_offer")).toBe("child_setup");
    });

    it("falls back to welcome for an unrecognized value", () => {
      expect(clampOnboardingStep("something_old")).toBe("welcome");
      expect(clampOnboardingStep("")).toBe("welcome");
    });

    it("clamped values are always real steps with a route", () => {
      for (const raw of ["privacy_consent", "pick_buddy", "first_task", "calm_offer", "???"]) {
        const clamped = clampOnboardingStep(raw);
        expect(CANONICAL).toContain(clamped);
        expect((routeForStep(clamped) as string).startsWith("/(onboarding)")).toBe(true);
      }
    });
  });
});
