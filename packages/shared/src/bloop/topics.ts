/**
 * packages/shared/src/bloop/topics.ts — the CANONICAL topic-scope enum
 * (w2 OWNS this module — 02-architecture §2.1/§8 #3/#20).
 *
 * SEEDED at M1.2 with only the union + catalog the w1 Firestore schema needs
 * (`ChildSettingsDoc.controls.topicScope`, `GlobalConfigDoc.scopeCategories`).
 * M2.0 (w2) completes the module (per-topic prompts/scope copy); it EXTENDS,
 * never re-declares.
 *
 * Canonical = the w2 seven-member enum (§8 #3); w3's `aac` maps to
 * `communication`, `socialStories` maps to `social` — those members do NOT
 * exist here.
 */

export type TopicCategory =
  | "emotions"
  | "calming"
  | "focus"
  | "schedules"
  | "communication"
  | "social"
  | "encouragement";

/** Every canonical topic (parent scope pickers iterate this, never re-list). */
export const ALL_TOPICS: readonly TopicCategory[] = [
  "emotions",
  "calming",
  "focus",
  "schedules",
  "communication",
  "social",
  "encouragement",
];

/**
 * Map a legacy/draft category id (w3's `aac`/`socialStories`) onto the
 * canonical union (§8 #3). Unknown ids resolve to `undefined` (callers fail
 * closed — an unknown scope id grants nothing).
 */
export function toTopicCategory(id: string): TopicCategory | undefined {
  if ((ALL_TOPICS as readonly string[]).includes(id)) return id as TopicCategory;
  if (id === "aac") return "communication";
  if (id === "socialStories") return "social";
  return undefined;
}
