/**
 * src/domain/plans.ts — PURE helpers for if-then "when X, I will Y" plans
 * (if-then-plans, M-C5). No React, no store: the assemble / selector / anchor
 * logic that both the kid glance and the point-of-performance firing read.
 *
 * ZERO AI, ANTI-SHAME by construction:
 *   - the assembled sentence is age-framed ONLY through resolveContent's
 *     `plans.thenYoung` glue, so NO component branches on `ageMode`;
 *   - a `time` plan maps to a `ReminderAnchor` fed into the SHIPPED reminder
 *     pipeline, so it inherits quiet-hours + the per-day budget + the banned-
 *     phrase gate (no new scheduling path);
 *   - `assertPlanCopyClean` runs any phrase that could become a notification
 *     through the reminder banned-tone gate before it can smuggle a nag/guilt
 *     string into the tray;
 *   - selectors carry NO adherence / miss / streak notion.
 *
 * Deterministic throughout — ZERO RNG in any assemble/anchor/selector path.
 */
import { isReminderCopyClean, isValidHm } from "../services/notifications";
import { resolveContent } from "../theme/resolveContent";

import type { AgeMode, Daypart, Plan, ReminderAnchor } from "./types";

export interface AssembledPlanPhrase {
  /** the "when X" cue phrase (display) */
  cue: string;
  /** the "I will Y" action phrase, incl. the resolved age glue (display) */
  action: string;
  /** a single TTS string: "When I finish breakfast, I'll pack my bag." */
  spoken: string;
}

const trimmed = (s: string | undefined): string => (s ?? "").trim();

/**
 * Compose the if-then sentence. The ONLY age-adaptive part is the `plans.thenYoung`
 * glue ("I'll" young / "I will" older/preteen) — the curated cue + action labels are
 * fixed strings chosen at authoring time, so the exact wording flows from the
 * resolver and a component never needs to branch on `ageMode`.
 */
export function assemblePlanPhrase(plan: Plan, ageMode: AgeMode): AssembledPlanPhrase {
  const glue = resolveContent("plans.thenYoung", { ageMode }); // "I'll" | "I will"
  const cueText = trimmed(plan.cue.label.text ?? plan.cue.label.spokenLabel);
  const actionText = trimmed(plan.action.label.text ?? plan.action.label.spokenLabel);
  const cueSpoken = trimmed(plan.cue.label.spokenLabel);
  const actionSpoken = trimmed(plan.action.label.spokenLabel);
  return {
    cue: cueText,
    action: `${glue} ${actionText}`.trim(),
    spoken: `${cueSpoken}, ${glue} ${actionSpoken}`.trim(),
  };
}

/**
 * Map a `type:'time'` ACTIVE plan to a `ReminderAnchor` (`id: 'plan:<id>'`) so it
 * rides the SHIPPED `rescheduleReminders` alongside routine reminders. Returns
 * `null` for a non-time / inactive / archived / proposed / invalid-time plan. The
 * `spokenLabel` is the assembled if-then phrase (which `buildReminderContent` wraps
 * in the fixed friendly copy). `ageMode` only chooses the glue and defaults to the
 * respectful `older` variant when a caller has no active child in hand.
 */
export function planToReminderAnchor(
  plan: Plan,
  ageMode: AgeMode = "older",
): ReminderAnchor | null {
  if (!plan.active || plan.archived || plan.proposed) return null;
  if (plan.cue.type !== "time") return null;
  const time = plan.cue.time;
  if (!time || !isValidHm(time)) return null;
  return {
    id: `plan:${plan.id}`,
    time,
    daysOfWeek: plan.cue.daysOfWeek ?? [],
    spokenLabel: assemblePlanPhrase(plan, ageMode).spoken,
  };
}

// ---------------------------------------------------------------------------
// Selectors (a "live" plan is active + not archived + not an unapproved proposal).
// ---------------------------------------------------------------------------

export function activePlans(plans: readonly Plan[] | undefined): Plan[] {
  return (plans ?? []).filter((p) => p.active && !p.archived && !p.proposed);
}

export function plansForStep(plans: readonly Plan[] | undefined, taskId: string): Plan[] {
  return activePlans(plans).filter(
    (p) => p.cue.type === "afterStep" && p.cue.taskId === taskId,
  );
}

export function plansForRoutine(
  plans: readonly Plan[] | undefined,
  routineId: string,
): Plan[] {
  return activePlans(plans).filter(
    (p) => p.cue.type === "afterRoutine" && p.cue.routineId === routineId,
  );
}

export function plansForDaypart(
  plans: readonly Plan[] | undefined,
  daypart: Daypart,
): Plan[] {
  return activePlans(plans).filter(
    (p) => p.cue.type === "afterRoutine" && p.cue.daypart === daypart,
  );
}

export function situationalPlans(plans: readonly Plan[] | undefined): Plan[] {
  return activePlans(plans).filter((p) => p.cue.type === "situational");
}

/**
 * Dev guard: an assembled plan phrase must pass the reminder banned-tone gate
 * (`isReminderCopyClean`) so a curated (or future) template can never smuggle a
 * nag/guilt/urgency string into a notification. Throws in `__DEV__` (asserted in
 * tests); a no-op in production.
 */
export function assertPlanCopyClean(phrase: string): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    if (!isReminderCopyClean(phrase)) {
      throw new Error(
        `Plan phrase violates the gentle-tone invariant (if-then-plans §7): "${phrase}"`,
      );
    }
  }
}
