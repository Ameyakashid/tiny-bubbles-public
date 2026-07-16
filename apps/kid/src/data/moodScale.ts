/**
 * src/data/moodScale.ts — the curated mood + energy content (mood-checkin §5).
 *
 * A content module (like `taskTemplates.ts`): the kid-facing FACES + ENERGY CELLS
 * live in DATA, not the component, so the grid stays age-agnostic and every tile
 * carries a REQUIRED `spokenLabel` (non-reader support via the shared TTS seam).
 *
 * The 4-level weather scale (🌧️ rough · ☁️ okay · 🌤️ good · ☀️ great) and the
 * 3/5-level energy ramp are the buildable interpretation of the data-model doc
 * (mood-checkin §1 donor grounding). Colors are WARM and NON-JUDGMENTAL — there is
 * deliberately NO red/danger hue for a "rough" mood (anti-shame §7): a rough day is
 * met with a calm cool tone, never an alarm. Nothing here can represent failure.
 *
 * Pure data (no React/RN import) so screens + unit tests import it freely.
 */
import type { Mood } from "../domain/types";

export interface MoodFace {
  mood: Mood;
  emoji: string;
  /** REQUIRED spoken string (TTS for non-readers) — warm, never a judgment. */
  spokenLabel: string;
  /** warm, non-judgmental hex — cool-calm for rough, warm for great. NEVER red. */
  color: string;
}

/**
 * The 4 weather faces, ordered rough → great. The order is the grid order; the
 * companion is NEVER made sad by a "rough" pick (CompanionMood has no negative
 * member — anti-shame §7), the response is only an OPTIONAL calm-breaths offer.
 */
export const MOOD_FACES: readonly MoodFace[] = [
  { mood: "rough", emoji: "🌧️", spokenLabel: "Rough", color: "#6C8AA0" },
  { mood: "okay", emoji: "☁️", spokenLabel: "Okay", color: "#8FA9C4" },
  { mood: "good", emoji: "🌤️", spokenLabel: "Good", color: "#7BD389" },
  { mood: "great", emoji: "☀️", spokenLabel: "Great", color: "#FFC53D" },
];

export interface EnergyCell {
  /** 1..energyScaleMax (young 1-3, older 1-5). Stored on the log verbatim. */
  value: number;
  emoji: string;
  /** REQUIRED spoken string (TTS) — a neutral level, never a judgment. */
  spokenLabel: string;
}

/** Young energy grid — 3 cells (low / some / lots). `energyScaleMax` = 3. */
export const ENERGY_CELLS_YOUNG: readonly EnergyCell[] = [
  { value: 1, emoji: "😴", spokenLabel: "Low energy" },
  { value: 2, emoji: "🙂", spokenLabel: "Some energy" },
  { value: 3, emoji: "⚡", spokenLabel: "Lots of energy" },
];

/** Older energy grid — 5 cells, a gentle low→high ramp. `energyScaleMax` = 5. */
export const ENERGY_CELLS_OLDER: readonly EnergyCell[] = [
  { value: 1, emoji: "😴", spokenLabel: "Very low" },
  { value: 2, emoji: "🙂", spokenLabel: "Low" },
  { value: 3, emoji: "😌", spokenLabel: "Medium" },
  { value: 4, emoji: "💪", spokenLabel: "High" },
  { value: 5, emoji: "⚡", spokenLabel: "Very high" },
];

/** Quick lookup from a stored `Mood` to its face (parent glance + trend chips). */
export const MOOD_FACE_BY_MOOD: Record<Mood, MoodFace> = MOOD_FACES.reduce(
  (acc, f) => {
    acc[f.mood] = f;
    return acc;
  },
  {} as Record<Mood, MoodFace>,
);
