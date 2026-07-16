/**
 * src/data/routinePresets.ts — the 3 starter routines (doc 62 §14).
 *
 * Each composes task templates by id. `ageOnly` marks a step that should appear
 * for only one age mode (e.g. `homework` -> older, `tidy_toys` -> young in the
 * after-school routine); the seeder filters these per child (see seed.ts).
 */
import type { RoutineTemplate } from "../domain/types";

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "morning",
    label: { spokenLabel: "Morning routine", text: "Morning", emoji: "🌅", color: "#FFD166" },
    daypart: "morning",
    stepTemplateIds: [
      "get_dressed",
      "eat_breakfast",
      "brush_teeth",
      "wash_hands",
      "put_on_shoes",
      "pack_bag",
    ],
    schedule: { daysOfWeek: [1, 2, 3, 4, 5], timeOfDay: "07:00" },
  },
  {
    id: "after_school",
    label: {
      spokenLabel: "After-school routine",
      text: "After School",
      emoji: "🏠",
      color: "#4ECDC4",
    },
    daypart: "afternoon",
    stepTemplateIds: ["have_snack", "homework", "tidy_toys", "water_drink", "calm_breaths"],
    schedule: { daysOfWeek: [1, 2, 3, 4, 5], timeOfDay: "16:00" },
    ageOnly: { homework: "older", tidy_toys: "young" },
  },
  {
    id: "bedtime",
    label: { spokenLabel: "Bedtime routine", text: "Bedtime", emoji: "🌙", color: "#9D8DF1" },
    daypart: "evening",
    // Every day (daysOfWeek: []) so evenings are never empty in the daypart flow.
    stepTemplateIds: [
      "eat_dinner",
      "bath_time",
      "pajamas",
      "brush_teeth",
      "story_time",
      "go_to_bed",
    ],
    schedule: { daysOfWeek: [], timeOfDay: "19:30" },
  },
];

export const ROUTINE_TEMPLATES_BY_ID: Record<string, RoutineTemplate> = Object.fromEntries(
  ROUTINE_TEMPLATES.map((r) => [r.id, r]),
);
