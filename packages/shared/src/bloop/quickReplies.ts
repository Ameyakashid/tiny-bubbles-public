/**
 * packages/shared/src/bloop/quickReplies.ts — the curated, topic-scoped,
 * PII-FREE tap-to-say chip catalog (M2.0, w2 §6.1). Also an AAC affordance:
 * chips are the PII-free-by-construction default input (§8 #19 — the
 * `chips` InputMode), so a child whose free text is off still converses.
 *
 * RULES (kid-llm-safety + anti-shame gates):
 *   - Every chip is pre-written, reviewed copy — no user text ever enters
 *     the catalog. No names, no places, no numbers, no links.
 *   - Warm, literal, short (autism preset: no idioms/sarcasm).
 *   - Deterministic order (parent scope pickers + the mock provider iterate
 *     this array; NEVER Math.random).
 *   - Scope filtering FAILS CLOSED: an empty/absent parent scope yields NO
 *     chips (an unknown scope id grants nothing — topics.ts contract).
 */

import type { QuickReply } from "./provider";
import type { TopicCategory } from "./topics";

/** The full curated catalog, grouped by canonical topic (§8 #3), fixed order. */
export const QUICK_REPLIES: readonly QuickReply[] = [
  // emotions — feelings vocabulary
  { id: "qr-emotions-happy", title: "I feel happy today", topic: "emotions" },
  { id: "qr-emotions-wobbly", title: "I feel wobbly inside", topic: "emotions" },
  { id: "qr-emotions-name", title: "Help me name a feeling", topic: "emotions" },
  // calming — breathing & sensory tools
  { id: "qr-calming-breathe", title: "Can we take slow breaths?", topic: "calming" },
  { id: "qr-calming-quiet", title: "I want something quiet", topic: "calming" },
  // focus — task-initiation / first-then
  { id: "qr-focus-start", title: "Starting feels hard", topic: "focus" },
  { id: "qr-focus-firstthen", title: "What comes first?", topic: "focus" },
  // schedules — visual schedules
  { id: "qr-schedules-today", title: "What is next today?", topic: "schedules" },
  // communication — AAC / communication
  { id: "qr-communication-say", title: "Help me say something", topic: "communication" },
  // social — social situations
  { id: "qr-social-friend", title: "Playing with a friend", topic: "social" },
  { id: "qr-social-turn", title: "Waiting for my turn", topic: "social" },
  // encouragement — celebrating effort
  { id: "qr-encourage-tried", title: "I tried something hard", topic: "encouragement" },
  { id: "qr-encourage-cheer", title: "Cheer me on!", topic: "encouragement" },
];

/** Catalog lookup by chip id (undefined ⇒ not a curated chip — fail closed). */
export function quickReplyById(id: string): QuickReply | undefined {
  return QUICK_REPLIES.find((q) => q.id === id);
}

/**
 * The chips available under a parent-enabled scope, in catalog order.
 * Empty scope ⇒ empty array (fail closed — no scope, no chips).
 */
export function quickRepliesForScope(scope: readonly TopicCategory[]): QuickReply[] {
  if (scope.length === 0) return [];
  const allowed = new Set<TopicCategory>(scope);
  return QUICK_REPLIES.filter((q) => allowed.has(q.topic));
}
