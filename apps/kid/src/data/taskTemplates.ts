/**
 * src/data/taskTemplates.ts — the 15 starter task templates (doc 62 §14).
 *
 * Each carries a REQUIRED `spokenLabel` (non-reader support), an `emoji`, a
 * `color`, a default token value, and `verification.mode === 'none'` (light,
 * optional). Templates are reusable library entries; instantiating one produces
 * a per-child `Task` (see seed.ts `taskFromTemplate`).
 */
import type { TaskTemplate } from "../domain/types";

const DEFAULT_VERIFICATION = { mode: "none", required: false } as const;
const EVERY_DAY = { daysOfWeek: [] as number[] };

function tpl(
  id: string,
  spokenLabel: string,
  emoji: string,
  color: string,
  category: TaskTemplate["category"],
  suggestedAgeModes: TaskTemplate["suggestedAgeModes"],
  /**
   * Optional default visual-transition-timer budget in seconds (visual-timers §4
   * #16). A GENEROUS/forgiving pacing aid on transition-heavy steps so the feature
   * is demonstrable day one; most steps stay timer-less (`undefined`). Never a
   * deadline — the parent can change or clear it per task at assign time.
   */
  timerSeconds?: number,
): TaskTemplate {
  return {
    id,
    label: { spokenLabel, text: spokenLabel, emoji, color },
    verification: { ...DEFAULT_VERIFICATION },
    deadline: "today",
    schedule: { ...EVERY_DAY },
    category,
    suggestedAgeModes,
    suggestedTokenValue: 1,
    ...(timerSeconds !== undefined ? { timerSeconds } : {}),
  };
}

const BOTH = ["young", "older"] as const;

/** The starter library (doc 62 §14 table). Order is the gallery order. */
export const TASK_TEMPLATES: TaskTemplate[] = [
  tpl("brush_teeth", "Brush your teeth", "🪥", "#5BC8F5", "hygiene", [...BOTH], 120),
  tpl("get_dressed", "Get dressed", "👕", "#FF8FB1", "self-care", [...BOTH], 300),
  tpl("wash_hands", "Wash your hands", "🧼", "#7BD389", "hygiene", [...BOTH]),
  tpl("make_bed", "Make your bed", "🛏️", "#B79CED", "tidy", [...BOTH]),
  tpl("pack_bag", "Pack your school bag", "🎒", "#FFB703", "school", [...BOTH]),
  tpl("put_on_shoes", "Put on your shoes", "👟", "#4ECDC4", "self-care", [...BOTH]),
  tpl("eat_breakfast", "Eat breakfast", "🥣", "#FFD166", "meals", [...BOTH]),
  tpl("tidy_toys", "Tidy your toys", "🧸", "#F4978E", "tidy", [...BOTH], 300),
  tpl("homework", "Do your homework", "📒", "#6C9BD1", "school", ["older"]),
  tpl("water_drink", "Have a drink of water", "💧", "#56CFE1", "health", [...BOTH]),
  tpl("feed_pet", "Feed the pet", "🐶", "#C9ADA7", "chores", [...BOTH]),
  tpl("bath_time", "Bath time", "🛁", "#90DBF4", "hygiene", [...BOTH]),
  tpl("pajamas", "Put on pajamas", "🌙", "#9D8DF1", "bedtime", [...BOTH]),
  tpl("story_time", "Read a story", "📖", "#F6BD60", "bedtime", [...BOTH]),
  tpl("calm_breaths", "Take 3 calm breaths", "🫧", "#A8E6CF", "regulation", [...BOTH], 30),
  // Daypart fill-ins (doc 70 §E1) — afternoon snack + evening dinner/bed.
  tpl("have_snack", "Have a snack", "🍎", "#FFB4A2", "meals", [...BOTH]),
  tpl("eat_dinner", "Eat dinner", "🍽️", "#F4A261", "meals", [...BOTH]),
  tpl("go_to_bed", "Get into bed", "🛌", "#8E7DBE", "bedtime", [...BOTH]),
];

export const TASK_TEMPLATES_BY_ID: Record<string, TaskTemplate> = Object.fromEntries(
  TASK_TEMPLATES.map((t) => [t.id, t]),
);

export function getTaskTemplate(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES_BY_ID[id];
}
