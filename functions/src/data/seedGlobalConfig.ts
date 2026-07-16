/**
 * functions/src/data/seedGlobalConfig.ts — the `config/{global}` seeding step
 * (w1 M1.2 — §8 #21b; run once at deploy, M6.1).
 *
 * The SHARED compliance modules are the source of truth; `config/{global}` is
 * an optional server-side override MIRRORED from them (idempotent admin
 * write). If the doc is absent/unseeded, w2's `config.ts` falls back to the
 * shared-module defaults — the proxy is never un-thresholded. NOT exposed as
 * a public callable (fail closed): invoked from the deploy checklist
 * (`functions/docs/RULES-REVIEW.md`) with admin credentials.
 *
 * The crisis tables mirror the w8-reviewed `CRISIS_RESOURCES` cards — NEVER
 * model-generated numbers (w1 §6.4); locales whose card is still
 * `reviewed:false` are seeded too but chat cannot ship there until the
 * sign-off flips it (§8 #16b — enforced by the crisis-review gate, not here).
 */
import {
  ALL_TOPICS,
  CRISIS_RESOURCES,
  globalConfigDoc,
  type GlobalConfigDoc,
} from "@tiny-bubbles/shared";

import type { Clock, DbPort } from "../ports";

/** Conservative default thresholds; w2 tunes via its moderation config. */
const DEFAULT_MODERATION_THRESHOLDS: Record<string, number> = {
  toxicity: 0.5,
  banned_topic: 0.5,
  off_scope: 0.6,
  pii: 0.5,
  crisis: 0.3, // most sensitive — fail toward the crisis pathway
  prompt_injection: 0.5,
};

const TOPIC_LABELS: Record<string, string> = {
  emotions: "Feelings",
  calming: "Calming down",
  focus: "Focus helpers",
  schedules: "My day",
  communication: "Saying things",
  social: "Friends & family",
  encouragement: "Cheering on",
};

export const AI_DISCLOSURE =
  "Bloop is an AI helper, not a person or a doctor. Grown-ups can see chats.";

/** Pure builder (unit-tested without any I/O). */
export function buildGlobalConfigDoc(version: string): GlobalConfigDoc {
  const crisisResources: GlobalConfigDoc["crisisResources"] = {};
  for (const [locale, card] of Object.entries(CRISIS_RESOURCES)) {
    crisisResources[locale] = card.resources.map((r) => ({
      label: r.label,
      contact: r.contact,
      ...(r.note ? { note: r.note } : {}),
    }));
  }
  return {
    moderationThresholds: { ...DEFAULT_MODERATION_THRESHOLDS },
    scopeCategories: ALL_TOPICS.map((id) => ({ id, label: TOPIC_LABELS[id] ?? id })),
    crisisResources,
    aiDisclosure: AI_DISCLOSURE,
    version,
  };
}

/** Idempotent admin write (safe to re-run at every deploy). */
export async function seedGlobalConfig(
  deps: { db: DbPort; clock: Clock },
  version = `seed-${new Date().toISOString().slice(0, 10)}`,
): Promise<GlobalConfigDoc> {
  const doc = buildGlobalConfigDoc(version);
  await deps.db.setDoc(globalConfigDoc(), doc as unknown as Record<string, unknown>, {
    merge: false,
  });
  return doc;
}
