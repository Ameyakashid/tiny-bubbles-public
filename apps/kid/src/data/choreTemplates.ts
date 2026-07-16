/**
 * src/data/choreTemplates.ts — curated starter suggestions for shared/rotating
 * chores (multi-child §4). Each seeds a chore's label + sensible daypart / cadence /
 * payout defaults; the parent can change any of them in the authoring form. Content
 * is original + MIT-free; every entry carries a REQUIRED `spokenLabel` (non-reader
 * support), matching the `VisualLabel` shape used everywhere else.
 *
 * These are SUGGESTIONS, not an assignment engine — picking one just pre-fills the
 * form. Rotation itself is pure date math (src/domain/chores.ts); ZERO AI.
 */
import type { Daypart, RotationCadence, VisualLabel } from "../domain/types";

export interface ChoreTemplate {
  id: string;
  label: VisualLabel;
  defaultDaypart: Exclude<Daypart, "night">;
  defaultCadence: RotationCadence;
  suggestedTokenValue: number;
}

function tpl(
  id: string,
  spokenLabel: string,
  emoji: string,
  color: string,
  defaultDaypart: Exclude<Daypart, "night">,
  defaultCadence: RotationCadence,
  suggestedTokenValue = 1,
): ChoreTemplate {
  return {
    id,
    label: { spokenLabel, text: spokenLabel, emoji, color },
    defaultDaypart,
    defaultCadence,
    suggestedTokenValue,
  };
}

/** The curated shared-chore suggestion library (multi-child §4). */
export const CHORE_TEMPLATES: ChoreTemplate[] = [
  tpl("take_out_trash", "Take out the trash", "🗑️", "#7BD389", "evening", "weekly", 2),
  tpl("feed_pet", "Feed the pet", "🐶", "#C9ADA7", "morning", "daily", 1),
  tpl("set_table", "Set the table", "🍽️", "#F4A261", "evening", "daily", 1),
  tpl("wash_dishes", "Wash the dishes", "🧽", "#56CFE1", "evening", "daily", 2),
  tpl("water_plants", "Water the plants", "🪴", "#2ED3A0", "morning", "weekly", 1),
  tpl("tidy_shared", "Tidy the shared space", "🧸", "#FFB703", "afternoon", "daily", 1),
];

export const CHORE_TEMPLATES_BY_ID: Record<string, ChoreTemplate> = Object.fromEntries(
  CHORE_TEMPLATES.map((c) => [c.id, c]),
);

export function getChoreTemplate(id: string): ChoreTemplate | undefined {
  return CHORE_TEMPLATES_BY_ID[id];
}
