/**
 * __tests__/domain/plans.test.ts — the PURE if-then plan helpers (if-then-plans,
 * M-C5). Proves: age-framed assembly (glue only); `planToReminderAnchor` maps ONLY
 * an active/valid `time` plan; the point-of-performance selectors; and that
 * `assertPlanCopyClean` accepts every seed template pairing but rejects a planted
 * banned tone.
 *
 * domain/plans transitively imports services/notifications (for the banned-tone
 * gate), which imports expo-notifications — mocked here (jest-expo does not).
 */
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  AndroidImportance: { DEFAULT: 3, MAX: 5 },
  SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly", DATE: "date" },
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

import {
  PLAN_ACTION_TEMPLATES,
  SITUATION_TEMPLATES,
  actionFromTemplate,
  planFromTemplates,
  routineCue,
  situationCue,
  stepCue,
  timeCue,
} from "../../src/data/planTemplates";
import {
  activePlans,
  assemblePlanPhrase,
  assertPlanCopyClean,
  planToReminderAnchor,
  plansForDaypart,
  plansForRoutine,
  plansForStep,
  situationalPlans,
} from "../../src/domain/plans";
import type { Plan, PlanAction, PlanCue } from "../../src/domain/types";

let seq = 0;
function makePlan(cue: PlanCue, action: PlanAction, over: Partial<Plan> = {}): Plan {
  // `over` is applied to the assembled plan (planFromTemplates only reads a few
  // builder fields), so `{ active:false }` / `{ archived:true }` actually take.
  return { ...planFromTemplates({ id: `p${seq++}`, childId: "c1", now: 0, cue, action }), ...over };
}
const bag = actionFromTemplate(PLAN_ACTION_TEMPLATES.find((a) => a.id === "act_bag")!);
const home = situationCue(SITUATION_TEMPLATES.find((s) => s.id === "sit_home")!);

// ---------------------------------------------------------------------------
describe("assemblePlanPhrase", () => {
  it("frames the sentence age-adaptively via the `plans.thenYoung` glue only", () => {
    const plan = makePlan(home, bag);
    const young = assemblePlanPhrase(plan, "young");
    const older = assemblePlanPhrase(plan, "older");
    expect(young.cue).toBe("When I get home");
    expect(young.action).toBe("I'll pack my bag");
    expect(young.spoken).toBe("When I get home, I'll pack my bag");
    expect(older.action).toBe("I will pack my bag");
    expect(older.spoken).toBe("When I get home, I will pack my bag");
    // preteen falls back to the respectful `older` glue
    expect(assemblePlanPhrase(plan, "preteen").action).toBe("I will pack my bag");
  });
});

// ---------------------------------------------------------------------------
describe("planToReminderAnchor", () => {
  it("maps an active `time` plan to a plan:<id> anchor with the assembled phrase", () => {
    const plan = makePlan(timeCue("16:00", [1, 2, 3, 4, 5]), bag);
    const anchor = planToReminderAnchor(plan, "older");
    expect(anchor).not.toBeNull();
    expect(anchor?.id).toBe(`plan:${plan.id}`);
    expect(anchor?.time).toBe("16:00");
    expect(anchor?.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    expect(anchor?.spokenLabel).toBe("When it's 4:00 PM, I will pack my bag");
  });

  it("returns null for a non-time / inactive / archived / proposed / invalid-time plan", () => {
    expect(planToReminderAnchor(makePlan(home, bag))).toBeNull(); // situational
    expect(planToReminderAnchor(makePlan(timeCue("16:00", []), bag, { active: false }))).toBeNull();
    expect(planToReminderAnchor(makePlan(timeCue("16:00", []), bag, { archived: true }))).toBeNull();
    expect(planToReminderAnchor(makePlan(timeCue("16:00", []), bag, { proposed: true, active: false }))).toBeNull();
    // an invalid stored time never yields an anchor (defensive)
    const bad = makePlan({ type: "time", time: "99:99", daysOfWeek: [], label: home.label }, bag);
    expect(planToReminderAnchor(bad)).toBeNull();
  });

  it("empty daysOfWeek carries through (an every-day anchor)", () => {
    const anchor = planToReminderAnchor(makePlan(timeCue("09:00", []), bag));
    expect(anchor?.daysOfWeek).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("selectors", () => {
  const stepPlan = makePlan(stepCue("t1", { spokenLabel: "brush teeth", color: "#fff" }), bag);
  const routinePlan = makePlan(
    routineCue("r1", "morning", { spokenLabel: "Morning routine", color: "#fff" }),
    bag,
  );
  const sitPlan = makePlan(home, bag);
  const timePlan = makePlan(timeCue("16:00", []), bag);
  const inactive = makePlan(stepCue("t1", { spokenLabel: "brush teeth", color: "#fff" }), bag, {
    active: false,
  });
  const all = [stepPlan, routinePlan, sitPlan, timePlan, inactive];

  it("activePlans excludes inactive / archived / proposed", () => {
    expect(activePlans(all).map((p) => p.id)).toEqual([
      stepPlan.id,
      routinePlan.id,
      sitPlan.id,
      timePlan.id,
    ]);
    expect(activePlans(undefined)).toEqual([]);
  });

  it("plansForStep / plansForRoutine / plansForDaypart / situationalPlans filter by cue", () => {
    expect(plansForStep(all, "t1").map((p) => p.id)).toEqual([stepPlan.id]); // inactive excluded
    expect(plansForStep(all, "nope")).toEqual([]);
    expect(plansForRoutine(all, "r1").map((p) => p.id)).toEqual([routinePlan.id]);
    expect(plansForDaypart(all, "morning").map((p) => p.id)).toEqual([routinePlan.id]);
    expect(plansForDaypart(all, "evening")).toEqual([]);
    expect(situationalPlans(all).map((p) => p.id)).toEqual([sitPlan.id]);
  });
});

// ---------------------------------------------------------------------------
describe("assertPlanCopyClean", () => {
  it("accepts every seed situation × action pairing (both age variants)", () => {
    for (const s of SITUATION_TEMPLATES) {
      for (const a of PLAN_ACTION_TEMPLATES) {
        const plan = makePlan(situationCue(s), actionFromTemplate(a));
        for (const mode of ["young", "older"] as const) {
          expect(() => assertPlanCopyClean(assemblePlanPhrase(plan, mode).spoken)).not.toThrow();
        }
      }
    }
  });

  it("rejects a planted banned tone (built from fragments)", () => {
    const shame = "You " + "forgot to pack your bag";
    expect(() => assertPlanCopyClean(shame)).toThrow();
    const urgency = "Hurry, " + "last chance to breathe";
    expect(() => assertPlanCopyClean(urgency)).toThrow();
  });
});
