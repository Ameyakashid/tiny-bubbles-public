/**
 * packages/shared/src/bloop/mock.ts — `MockBloopProvider` (M2.0, w2 §6.1).
 *
 * The DEFAULT provider (arch §4.2 mock-first seam): deterministic, fully
 * OFFLINE scripted replies so the app, CI, and the red-team scaffold exercise
 * EVERY `ModeratedReplyStatus` with zero network and zero model. Mirrors the
 * handcraft pipeline's gate order (crisis FIRST, then PII, then scope) so the
 * mock behaves like the real proxy will — the chat surface built against it
 * needs no changes at M2.1/M5.2.
 *
 * DETERMINISM CONTRACT: no `Math.random`, no `Date.now`. The same
 * (input, ctx) on a fresh provider always yields the same reply; `turnId` is
 * a per-session counter (`mock-<sessionId>-<n>`). Fixture triggers:
 *   - crisis phrases (self_harm / severe_distress / abuse / csam fixtures —
 *     differentiated per §8 #27: abuse/csam ⇒ NO parent alert, safetyReport +
 *     legalHold; the reviewed locale card comes from `resolveCrisisCard`);
 *   - real PII detection (shared `compliance/pii` — the canonical taxonomy);
 *   - off-scope + jailbreak keyword fixtures (warm redirect, "no model call");
 *   - explicit `[mock:disabled|rateLimited|filtered|error]` markers for the
 *     statuses that need server state the mock does not have.
 *
 * The mock NEVER echoes child text back (I5 — nothing the child typed is
 * repeated, so raw PII structurally cannot resurface in a reply).
 */

import {
  resolveCrisisCard,
  SAFE_MESSAGING,
  type CrisisType,
} from "../compliance/crisisResources";
import { containsPii } from "../compliance/pii";
import { OnFailAction, type ModerationFlag } from "./moderation";
import type {
  BloopContext,
  BloopProvider,
  BloopTurnInput,
  ModeratedReply,
} from "./provider";
import { quickReplyById, quickRepliesForScope } from "./quickReplies";
import { REDIRECT_COPY, SAFE_FALLBACK_TEXT, toModeratedReply, type TurnOutcome } from "./turn";
import type { TopicCategory } from "./topics";

// ---------------------------------------------------------------------------
// Deterministic fixture tables (fixed order — first match wins).
// ---------------------------------------------------------------------------

/** Explicit status markers (tests + dev screens; never typed by a child). */
export const MOCK_MARKERS = {
  disabled: "[mock:disabled]",
  rateLimited: "[mock:rateLimited]",
  filtered: "[mock:filtered]",
  error: "[mock:error]",
} as const;

/** Crisis fixture phrases → §8 #27 crisis type (recall-biased, tiny seed set). */
const CRISIS_FIXTURES: readonly { phrase: string; type: CrisisType }[] = [
  { phrase: "hurt myself", type: "self_harm" },
  { phrase: "want to disappear", type: "self_harm" },
  { phrase: "cry every day", type: "severe_distress" },
  { phrase: "hurts me at home", type: "abuse" },
  { phrase: "secret touching", type: "csam" },
];

/** Off-scope fixtures → warm redirect, no scripted topic reply. */
const OFF_SCOPE_FIXTURES: readonly string[] = ["youtube", "news", "money", "buy me"];

/** Medical-advice fixtures → the grown-up/doctor redirect. */
const MEDICAL_FIXTURES: readonly string[] = ["medicine", "dose", "pill"];

/** Injection/persona-override fixtures → the jailbreak redirect. */
const JAILBREAK_FIXTURES: readonly string[] = ["ignore your rules", "pretend you are", "system prompt"];

/** One warm, literal, scripted reply per canonical topic (fixed — deterministic). */
const SCRIPTED_REPLIES: Record<TopicCategory, string> = {
  emotions: "Thanks for telling me. Feelings come and go like bubbles. Want to name this one together?",
  calming: "Let's take three slow bubble breaths together. In... and out. You are doing it.",
  focus: "Starting is the biggest step. Let's pick one tiny first thing to do.",
  schedules: "Let's peek at your schedule together. One step at a time works great.",
  communication: "I love hearing from you. You can tap a picture or a chip to tell me more.",
  social: "Friends can feel big sometimes. Taking turns is something you can practice with me.",
  encouragement: "You tried, and trying is the part that counts. I am cheering for you!",
};

/** Topic keyword hints (checked in canonical topic order — deterministic). */
const TOPIC_HINTS: readonly { topic: TopicCategory; words: readonly string[] }[] = [
  { topic: "emotions", words: ["feel", "feeling", "happy", "sad", "angry", "wobbly"] },
  { topic: "calming", words: ["breath", "calm", "quiet", "loud"] },
  { topic: "focus", words: ["start", "first", "homework", "task"] },
  { topic: "schedules", words: ["today", "next", "schedule", "plan"] },
  { topic: "communication", words: ["say", "tell", "talk"] },
  { topic: "social", words: ["friend", "turn", "share", "play"] },
  { topic: "encouragement", words: ["tried", "hard", "cheer", "proud"] },
];

/** Warm line when nothing is on-scope for this child (never blame, never "no"). */
const NO_SCOPE_TEXT = "I'm here with you! Ask a grown-up to pick what we can chat about together.";

const flag = (
  category: ModerationFlag["category"],
  stage: ModerationFlag["stage"],
  action?: OnFailAction,
): ModerationFlag => ({ category, stage, score: 1, ...(action ? { action } : {}) });

// ---------------------------------------------------------------------------
// The pure turn core (exported for the contract tests + the M2.1 scaffold).
// ---------------------------------------------------------------------------

/**
 * Build the deterministic wire outcome for a turn — the mock's stand-in for
 * the M2.1 `runTurn`. Pure: same arguments ⇒ same outcome.
 */
export function mockTurnOutcome(input: BloopTurnInput, ctx: BloopContext): TurnOutcome {
  const text = input.text.toLowerCase();

  // Explicit markers first (deterministic status fixtures; case-insensitive —
  // the fixture text is lowercased above).
  if (text.includes(MOCK_MARKERS.error.toLowerCase()))
    return { kind: "fallback", text: SAFE_FALLBACK_TEXT };
  if (text.includes(MOCK_MARKERS.disabled.toLowerCase()))
    return { kind: "hardStop", reason: "disabled" };
  if (text.includes(MOCK_MARKERS.rateLimited.toLowerCase()))
    return { kind: "hardStop", reason: "budget" };
  if (text.includes(MOCK_MARKERS.filtered.toLowerCase()))
    return {
      kind: "gentleRedirect",
      text: REDIRECT_COPY.default,
      reason: "externalContent",
    };

  // Crisis BEFORE every other shield (I2 — a PII/topic screen must never
  // swallow a crisis phrase). Differentiated routing per §8 #27.
  for (const fixture of CRISIS_FIXTURES) {
    if (text.includes(fixture.phrase)) {
      const caregiverImplicated = fixture.type === "abuse" || fixture.type === "csam";
      const card = resolveCrisisCard(ctx.locale, fixture.type);
      const childText = caregiverImplicated
        ? // child-directed, NO promise-of-disclosure (§8 #27)
          `${card.bodyLines[0] ?? SAFE_MESSAGING.validate} ${SAFE_MESSAGING.trustedGrownUp}`
        : `${SAFE_MESSAGING.validate} ${SAFE_MESSAGING.hope} ${SAFE_MESSAGING.noSecrecy}`;
      return {
        kind: "crisis",
        crisisType: fixture.type,
        childText,
        alertParent: !caregiverImplicated,
        fileSafetyReport: caregiverImplicated,
        legalHold: caregiverImplicated,
      };
    }
  }

  // PII — refused both directions (I5); the shared canonical detector.
  if (containsPii(input.text))
    return { kind: "gentleRedirect", text: REDIRECT_COPY.pii ?? REDIRECT_COPY.default, reason: "pii" };

  // Injection / persona override.
  if (JAILBREAK_FIXTURES.some((w) => text.includes(w)))
    return {
      kind: "gentleRedirect",
      text: REDIRECT_COPY.jailbreak ?? REDIRECT_COPY.default,
      reason: "jailbreak",
    };

  // Medical advice → grown-up/doctor redirect.
  if (MEDICAL_FIXTURES.some((w) => text.includes(w)))
    return {
      kind: "gentleRedirect",
      text: REDIRECT_COPY.medicalAdvice ?? REDIRECT_COPY.default,
      reason: "medicalAdvice",
    };

  // Off-scope → warm redirect (the "no model call" path).
  if (OFF_SCOPE_FIXTURES.some((w) => text.includes(w)))
    return {
      kind: "gentleRedirect",
      text: REDIRECT_COPY.offTopic ?? REDIRECT_COPY.default,
      reason: "offTopic",
    };

  // Scripted on-scope reply. Topic = the tapped chip's topic, else the first
  // keyword hint that is IN SCOPE, else the first scoped topic. Fail closed:
  // no parent-enabled scope ⇒ a warm nudge, still a safe "reply".
  const chipTopic = input.quickReplyId ? quickReplyById(input.quickReplyId)?.topic : undefined;
  const scope = new Set<TopicCategory>(ctx.topicScope);
  let topic: TopicCategory | undefined = chipTopic && scope.has(chipTopic) ? chipTopic : undefined;
  if (!topic)
    topic = TOPIC_HINTS.find((h) => scope.has(h.topic) && h.words.some((w) => text.includes(w)))?.topic;
  if (!topic) topic = ctx.topicScope[0];
  return { kind: "reply", text: topic ? SCRIPTED_REPLIES[topic] : NO_SCOPE_TEXT, flags: [] };
}

/** NON-PII verdict summary for an outcome (what the real pipeline would log). */
function flagsFor(outcome: TurnOutcome): ModerationFlag[] {
  switch (outcome.kind) {
    case "crisis":
      return [flag("crisis", "input", OnFailAction.Custom)];
    case "gentleRedirect":
      if (outcome.reason === "pii") return [flag("pii", "input", OnFailAction.Refrain)];
      if (outcome.reason === "jailbreak")
        return [flag("prompt_injection", "input", OnFailAction.Refrain)];
      if (outcome.reason === "externalContent")
        return [flag("banned_topic", "output", OnFailAction.Filter)];
      return [flag("off_scope", "input", OnFailAction.Refrain)];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// The provider.
// ---------------------------------------------------------------------------

/**
 * The deterministic offline provider (DEFAULT — arch §4.2). Stateless except
 * a per-session turn counter used only for the `turnId` suffix.
 */
export class MockBloopProvider implements BloopProvider {
  readonly id = "mock";

  private turnCounts = new Map<string, number>();

  async sendTurn(input: BloopTurnInput, ctx: BloopContext): Promise<ModeratedReply> {
    const outcome = mockTurnOutcome(input, ctx);
    const n = (this.turnCounts.get(ctx.sessionId) ?? 0) + 1;
    this.turnCounts.set(ctx.sessionId, n);
    const crisisCard =
      outcome.kind === "crisis" ? resolveCrisisCard(ctx.locale, outcome.crisisType) : undefined;
    return toModeratedReply(outcome, {
      quickReplies: quickRepliesForScope(ctx.topicScope),
      ...(crisisCard ? { crisis: crisisCard } : {}),
      turnId: `mock-${ctx.sessionId}-${n}`,
      flags: flagsFor(outcome),
    });
  }
}
