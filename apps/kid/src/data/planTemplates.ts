/**
 * src/data/planTemplates.ts — curated if-then plan content (if-then-plans, M-C5).
 *
 * A hand-authored library of cue + action building blocks. ZERO AI: there is NO
 * free-text kid input and NO suggestion engine — a family assembles a plan by
 * PICKING from these curated pieces (curated autonomy). Every label carries a
 * REQUIRED `spokenLabel` (non-reader support) + emoji + color, and every phrase
 * that could become a notification is checked by `assertPlanCopyClean` at
 * authoring / in tests, so no template can smuggle a banned tone into the tray.
 *
 * Adding templates later is a pure DATA edit (+ optional `SEED_VERSION` bump) —
 * NO SCHEMA_VERSION migration.
 */
import type {
  Daypart,
  EpochMs,
  Plan,
  PlanAction,
  PlanActionTemplate,
  PlanCue,
  PlanCueTemplate,
  VisualLabel,
} from "../domain/types";

// ---------------------------------------------------------------------------
// Curated situational cues — the honest, self-checked kind. The app tells the
// family plainly it CANNOT sense these (anti-overclaim); they live as a
// glanceable reminder + an optional positive "I did it!" nod.
// ---------------------------------------------------------------------------
export const SITUATION_TEMPLATES: PlanCueTemplate[] = [
  {
    id: "sit_home",
    type: "situational",
    situationId: "home",
    label: { spokenLabel: "When I get home", text: "When I get home", emoji: "🏠", color: "#5BC8F5" },
  },
  {
    id: "sit_wiggly",
    type: "situational",
    situationId: "wiggly",
    label: { spokenLabel: "When I feel wiggly", text: "When I feel wiggly", emoji: "🌀", color: "#B79CED" },
  },
  {
    id: "sit_timer",
    type: "situational",
    situationId: "timer_beeps",
    label: { spokenLabel: "When the timer beeps", text: "When the timer beeps", emoji: "⏲️", color: "#FFB703" },
  },
  {
    id: "sit_stuck",
    type: "situational",
    situationId: "stuck",
    label: { spokenLabel: "When I feel stuck", text: "When I feel stuck", emoji: "🧩", color: "#4ECDC4" },
  },
  {
    id: "sit_loud",
    type: "situational",
    situationId: "too_loud",
    label: { spokenLabel: "When it feels too loud", text: "When it feels too loud", emoji: "🔊", color: "#56CFE1" },
  },
];

/** All curated cue templates. Time/afterStep/afterRoutine cues are BUILT from the
 *  family's own routines/steps at authoring time (see the builders below); the
 *  only fully-curated cues are situational. */
export const PLAN_CUE_TEMPLATES: PlanCueTemplate[] = [...SITUATION_TEMPLATES];

// ---------------------------------------------------------------------------
// Curated actions — the "I will Y". A plan may instead LINK an existing task
// (so completing it pays tokens normally); these templates are the no-link path.
// ---------------------------------------------------------------------------
export const PLAN_ACTION_TEMPLATES: PlanActionTemplate[] = [
  { id: "act_breaths", label: { spokenLabel: "take three calm breaths", text: "take 3 calm breaths", emoji: "🫧", color: "#5BC8F5" } },
  { id: "act_homework", label: { spokenLabel: "start my homework", text: "start my homework", emoji: "✏️", color: "#FFB703" } },
  { id: "act_shoes", label: { spokenLabel: "put my shoes away", text: "put my shoes away", emoji: "👟", color: "#7BD389" } },
  { id: "act_water", label: { spokenLabel: "drink some water", text: "drink some water", emoji: "💧", color: "#56CFE1" } },
  { id: "act_bag", label: { spokenLabel: "pack my bag", text: "pack my bag", emoji: "🎒", color: "#9D8DF1" } },
  { id: "act_tidy", label: { spokenLabel: "tidy one thing", text: "tidy one thing", emoji: "🧺", color: "#FF8FB1" } },
];

// ---------------------------------------------------------------------------
// Pure cue/action builders (no RN / no store) — reused by the parent author so
// the component stays thin and the phrasing is unit-testable.
// ---------------------------------------------------------------------------

/** Friendly 12h clock label for a 'HH:mm' string (pure — no RN dependency). */
export function formatClock(hhmm: string): string {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const min = m[2];
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${ampm}`;
}

/** A `time` cue: "When it's 4:00 PM" (empty daysOfWeek => every day). */
export function timeCue(hhmm: string, daysOfWeek: number[]): PlanCue {
  const nice = formatClock(hhmm);
  return {
    type: "time",
    time: hhmm,
    daysOfWeek,
    label: { spokenLabel: `When it's ${nice}`, text: `When it's ${nice}`, emoji: "⏰", color: "#5BC8F5" },
  };
}

/** An `afterStep` cue: "After I finish {step}" — genuine point-of-performance. */
export function stepCue(taskId: string, stepLabel: VisualLabel): PlanCue {
  const name = stepLabel.text ?? stepLabel.spokenLabel;
  return {
    type: "afterStep",
    taskId,
    label: {
      spokenLabel: `After I finish ${name}`,
      text: `After I finish ${name}`,
      emoji: stepLabel.emoji ?? "✅",
      color: stepLabel.color,
    },
  };
}

/** An `afterRoutine` cue: "When my {routine} is done" (surfaced on the done panel). */
export function routineCue(routineId: string, daypart: Daypart, routineLabel: VisualLabel): PlanCue {
  const name = routineLabel.text ?? routineLabel.spokenLabel;
  return {
    type: "afterRoutine",
    routineId,
    daypart,
    label: {
      spokenLabel: `When my ${name} is done`,
      text: `When my ${name} is done`,
      emoji: routineLabel.emoji ?? "🌈",
      color: routineLabel.color,
    },
  };
}

/** A situational cue from a curated template (the only fully-curated cue kind). */
export function situationCue(tpl: PlanCueTemplate): PlanCue {
  return { type: "situational", situationId: tpl.situationId, label: { ...tpl.label } };
}

/** An action from a curated template (no linked task). */
export function actionFromTemplate(tpl: PlanActionTemplate): PlanAction {
  return { label: { ...tpl.label }, linkedTaskId: null };
}

/** An action that LINKS an existing task (completing it pays tokens normally). */
export function actionFromTask(taskId: string, taskLabel: VisualLabel): PlanAction {
  const name = taskLabel.text ?? taskLabel.spokenLabel;
  return {
    label: { spokenLabel: name, text: name, emoji: taskLabel.emoji ?? "✨", color: taskLabel.color },
    linkedTaskId: taskId,
  };
}

/**
 * Assemble a full `Plan` from a built cue + action. A proposed plan (kid path) is
 * held inactive until a parent approves it; a co-authored plan is live on save.
 */
export function planFromTemplates(opts: {
  id: string;
  childId: string;
  now: EpochMs;
  cue: PlanCue;
  action: PlanAction;
  authoredBy?: Plan["authoredBy"];
  proposed?: boolean;
}): Plan {
  const proposed = opts.proposed ?? false;
  return {
    id: opts.id,
    childId: opts.childId,
    cue: opts.cue,
    action: opts.action,
    active: !proposed,
    authoredBy: opts.authoredBy ?? "together",
    proposed,
    createdAt: opts.now,
    updatedAt: opts.now,
    archived: false,
  };
}
