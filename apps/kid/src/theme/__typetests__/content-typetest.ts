/**
 * src/theme/__typetests__/content-typetest.ts — COMPILE-TIME proofs (doc 66 M2).
 *
 * Not a jest test (no `.test.ts` suffix, so the runner ignores it) — it is
 * type-checked by `tsc --noEmit` because the tsconfig include glob covers it.
 * Each `@ts-expect-error` MUST trigger; if the guarantee regresses, the
 * directive becomes "unused" and tsc FAILS. This is how M2 enforces:
 *   (1) ModeKeyed<T> requires BOTH young + older variants, and
 *   (2) reinforcement `phase` can NEVER be passed to resolveCelebration.
 */
import { resolveCelebration } from "../resolveCelebration";
import { resolveContent, type ModeKeyed } from "../resolveContent";

// (1) ModeKeyed requires BOTH young + older — a half-populated key is a type error.
// @ts-expect-error missing `older` variant
export const bad: ModeKeyed<string> = { young: "hi" };
export const good: ModeKeyed<string> = { young: "hi", older: "yo" };

// (1b) `preteen` is an OPTIONAL identity override (aging-up §3.4): a preteen-only
// key STILL requires young + older, but adding `preteen` is allowed.
// @ts-expect-error a preteen-only key still requires young + older
export const badPreteen: ModeKeyed<string> = { preteen: "sup" };
export const goodPreteen: ModeKeyed<string> = { young: "hi", older: "yo", preteen: "sup" };

// copy keys resolve from ageMode and return a string
export const greet: string = resolveContent("buddy.greet", { ageMode: "older" });
// the buddy art-variant key resolves from companionStyle
export const art = resolveContent("buddy.artVariant", { companionStyle: "cool" });

// @ts-expect-error unknown copy key is rejected
resolveContent("nope.nope", { ageMode: "young" });
// @ts-expect-error a copy key needs `ageMode`, not `companionStyle`
resolveContent("task.done", { companionStyle: "cool" });

// (2) reinforcement phase is NOT an input to the celebration resolver.
resolveCelebration({
  ageMode: "young",
  salience: "step",
  sensoryMode: "standard",
  reducedMotion: false,
  calmMode: false,
  quietHours: false,
  // @ts-expect-error `phase` (or any mastery/streak axis) can never reduce celebration
  phase: "maintenance",
});
