/**
 * components/onboarding/steps.ts — the single canonical onboarding step order +
 * route map (doc 66 §1b.8, streamlined per doc 70 §F). One source of truth for
 * the wizard sequence, the progress dots, and the persist-then-advance navigation.
 *
 * Streamlined flow (4 screens): welcome (+privacy consent) -> parent-gate-setup
 * (PIN) -> child-setup (+calm note) -> done (hand-off). `welcome` is the group's
 * index route. Routes are cast to `Href` (the typed-routes table is generated at
 * build; these literals match the (onboarding)/* files).
 *
 * The parent gate MUST precede child setup so the gate is configured before the
 * child can reach (kid) (gate-before-child invariant).
 */
import type { Href } from "expo-router";

import type { OnboardingStep } from "../../src/domain/types";

export interface OnboardingStepDef {
  step: OnboardingStep;
  route: Href;
}

export const ONBOARDING_ORDER: OnboardingStepDef[] = [
  { step: "welcome", route: "/(onboarding)" as Href },
  { step: "parent_gate_setup", route: "/(onboarding)/parent-gate-setup" as Href },
  { step: "child_setup", route: "/(onboarding)/child-setup" as Href },
  { step: "done", route: "/(onboarding)/done" as Href },
];

/**
 * Steps removed by the doc 70 §F streamline. A persisted in-flight `currentStep`
 * from an older build must still resume to a valid, invariant-safe survivor so
 * resume-after-kill never dead-ends:
 *   - `privacy_consent` -> `welcome` (consent is now written on the welcome CTA;
 *     re-run welcome to guarantee `privacyConsentAckAt`).
 *   - `pick_buddy` / `first_task` -> `child_setup` (these came AFTER child setup;
 *     routing through child-setup re-affirms the child and, crucially, sets
 *     `calmModeOffered` — the "offered once" invariant now lives there — before
 *     the done hand-off activates the routines).
 *   - `calm_offer` -> `child_setup` (the calm choice is folded inline there).
 */
const REMOVED_STEP_FALLBACK: Record<string, OnboardingStep> = {
  privacy_consent: "welcome",
  pick_buddy: "child_setup",
  first_task: "child_setup",
  calm_offer: "child_setup",
};

/**
 * Clamp any persisted `currentStep` string to a valid current `OnboardingStep`.
 * Survivors pass through; removed steps map to their nearest safe survivor; an
 * unrecognized value falls back to `welcome`.
 */
export function clampOnboardingStep(step: string): OnboardingStep {
  if (ONBOARDING_ORDER.some((s) => s.step === step)) return step as OnboardingStep;
  return REMOVED_STEP_FALLBACK[step] ?? "welcome";
}

/** Zero-based position of a step in the canonical order (-1 if unknown). */
export function stepIndexOf(step: OnboardingStep): number {
  return ONBOARDING_ORDER.findIndex((s) => s.step === step);
}

/** The route for a step (defaults to welcome if somehow unknown). */
export function routeForStep(step: OnboardingStep): Href {
  return (ONBOARDING_ORDER.find((s) => s.step === step) ?? ONBOARDING_ORDER[0]).route;
}

/** The step/route that follows `step` (undefined if `step` is the last). */
export function nextStepAfter(step: OnboardingStep): OnboardingStepDef | undefined {
  const i = stepIndexOf(step);
  if (i < 0) return undefined;
  return ONBOARDING_ORDER[i + 1];
}
