/**
 * src/data/focusBreaks.ts — the FIXED, curated active-movement prompts shown on a
 * focus session's break (feature #22, `focus-intervals`, M-C3).
 *
 * The science-honest bit for kids: shorter blocks + GET-UP-AND-MOVE breaks (not
 * sit-and-wait). Every prompt is home-safe, equipment-free, and carries a REQUIRED
 * `spokenLabel` (non-reader / TTS support) + an emoji. The list is chosen by a
 * DETERMINISTIC rotating index (`nextMovementPrompt` in src/domain/focus.ts) — there
 * is NO `Math.random`, no adaptive "recommended move", no AI. A team may extend this
 * array; keep it deterministic + spoken-label-friendly.
 *
 * Breaks are framed as POSITIVE movement — never "your reward for suffering through
 * focus" (anti-shame, focus-intervals §6).
 */
import type { MovementPrompt } from "../domain/types";

export const MOVEMENT_PROMPTS: MovementPrompt[] = [
  { id: "star-jumps", spokenLabel: "Do 5 star jumps", emoji: "🤸" },
  { id: "sky-stretch", spokenLabel: "Reach up high to the sky", emoji: "🙆" },
  { id: "march", spokenLabel: "March in place for a bit", emoji: "🚶" },
  { id: "shoulder-rolls", spokenLabel: "Roll your shoulders slowly", emoji: "🔄" },
  { id: "wiggle", spokenLabel: "Wiggle it all out", emoji: "🫨" },
  { id: "water", spokenLabel: "Have a sip of water", emoji: "💧" },
  { id: "toe-touch", spokenLabel: "Try to touch your toes", emoji: "🧎" },
  { id: "big-stretch", spokenLabel: "Take one big stretch", emoji: "🌟" },
];
