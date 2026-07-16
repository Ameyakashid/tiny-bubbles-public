/**
 * packages/shared/src/bloop/provider.ts — the CANONICAL `InputMode` union +
 * mapper (w2 OWNS this module — 02-architecture §2.1/§8 #19/#20).
 *
 * SEEDED at M1.2 with ONLY the input-mode contract the w1 Firestore schema
 * needs (`ChildSettingsDoc.controls.inputMode`, `TranscriptTurnDoc.inputMode`).
 * COMPLETED at M2.0 (w2): the `BloopProvider` port + `BloopTurnInput`/
 * `BloopContext`/`ModeratedReply`/`QuickReply` (w2 §4.1, arch §4.2). The M1.2
 * seed is EXTENDED, never re-declared: the status union gains the arch-§4.2
 * client vocabulary (`redirect`/`error`) additively; every M1.2 member is
 * unchanged so the Firestore transcript contract is untouched.
 *
 * `CrisisCard` is IMPORTED from `compliance/crisisResources.ts` (§8 #20 —
 * one home per symbol; never re-declared here).
 *
 * §8 #19 — ONE union + ONE mapper: three drafts collided (`text|quickReply|
 * aac|voice` wire form · `chips|aac|freeText` caps form · `aac|chips|freetext|
 * voice` controls form). Canonical = `"aac" | "chips" | "freeText" | "voice"`,
 * used by controls, caps, and transcript turns alike; `toInputMode()` bridges
 * every legacy spelling. `BloopInputMode` is an alias of `InputMode`.
 */

import type { CrisisCard } from "../compliance/crisisResources";
import type { AgeMode, NeuroProfile } from "../domain/types";
import type { ModerationFlag } from "./moderation";
import type { TopicCategory } from "./topics";

/** THE canonical input-mode union (§8 #19). */
export type InputMode = "aac" | "chips" | "freeText" | "voice";

/** Alias — some drafts name the same union `BloopInputMode`. One home. */
export type BloopInputMode = InputMode;

/**
 * The moderated-reply status vocabulary (w2 transcript/status contract; the
 * schema stores it on every turn). `disabled` = server-side `bloopEnabled=
 * false` (returned with NO model call — §8 #28); `crisis` = the reviewed
 * crisis card path (§5.2).
 *
 * M2.0 widened this union ADDITIVELY (arch §4.2 client vocabulary):
 *   - `redirect` — off-scope/injection warm redirect (no model call);
 *   - `error`    — the fail-safe canned line (I1: any pipeline/transport
 *     failure ⇒ a warm deterministic reply, NEVER a broken surface).
 * Every M1.2 member is unchanged (`filtered` = output-shield FILTER path;
 * `refused` = PII/blocked-input warm refusal; `rate_limited` = quota/quiet
 * hours). Widening a stored string union is additive — no migration.
 */
export type ModeratedReplyStatus =
  | "ok"
  | "redirect"
  | "filtered"
  | "refused"
  | "crisis"
  | "disabled"
  | "rate_limited"
  | "error";

/** Every status, pinned for exhaustive tests/renderers (unknown ⇒ generic UI). */
export const ALL_MODERATED_REPLY_STATUSES: readonly ModeratedReplyStatus[] = [
  "ok",
  "redirect",
  "filtered",
  "refused",
  "crisis",
  "disabled",
  "rate_limited",
  "error",
];

/**
 * Bridge every draft/wire spelling onto the ONE union (§8 #19):
 * `quickReply → chips`, `freetext/text → freeText`; canonical members pass
 * through. Unknown input FAILS CLOSED to the PII-free-by-construction default
 * (`chips`) — never to free text.
 */
export function toInputMode(raw: string): InputMode {
  switch (raw) {
    case "aac":
    case "chips":
    case "freeText":
    case "voice":
      return raw;
    case "quickReply":
      return "chips";
    case "freetext":
    case "text":
      return "freeText";
    default:
      return "chips";
  }
}

// ---------------------------------------------------------------------------
// M2.0 — the `BloopProvider` port + turn contract (w2 §4.1, arch §4.2).
// ---------------------------------------------------------------------------

/** One curated, PII-free, topic-scoped tap-to-say chip (catalog: quickReplies.ts). */
export interface QuickReply {
  id: string;
  title: string;
  topic: TopicCategory;
}

/** The child's turn (utterance OR curated-chip payload). */
export interface BloopTurnInput {
  /** child utterance OR the quick-reply payload text */
  text: string;
  inputMode: InputMode;
  /** set when a curated chip was tapped (catalog id, never free text) */
  quickReplyId?: string;
}

/**
 * The client-supplied turn context. On the REAL proxy path this whole object
 * is an UNTRUSTED HINT (§8 #28): the server derives `childId` from the authed
 * kid uid (`childId === uid`) and loads `topicScope`/`ageMode`/`neuroProfile`/
 * `bloopEnabled`/`limits`/`locale` from Firestore server-side. A tampered
 * client cannot widen scope, spoof an older `ageMode`, or address another
 * child. The mock provider (offline) consumes it as-is.
 */
export interface BloopContext {
  childId: string;
  sessionId: string;
  /** shapes persona tone SERVER-side (passed as data, never a client branch) */
  neuroProfile: NeuroProfile;
  /** reading-level band (resolver input, never a raw client branch) */
  ageMode: AgeMode;
  /** BCP-47 crisis-resource locale, e.g. "en-US" | "en-IN" (§8 #16) */
  locale: string;
  /** parent-enabled subset of ALL_TOPICS (§8 #3) */
  topicScope: TopicCategory[];
}

/**
 * The ONLY thing the chat surface may render/TTS (arch §4.2): `text` is
 * ALWAYS safe, pre-approved copy — scripted, shielded-model, or a reviewed
 * crisis card line. Raw model output NEVER crosses this boundary.
 */
export interface ModeratedReply {
  status: ModeratedReplyStatus;
  /** ALWAYS safe, pre-approved text to render + TTS */
  text: string;
  /** curated on-scope chips for the next turn */
  quickReplies?: QuickReply[];
  /** grown-up-facing resource card (crisis only; from the reviewed table) */
  crisis?: CrisisCard;
  /** Firestore transcript turn id (when logged; absent on the offline mock) */
  turnId?: string;
  /** NON-PII verdict summary (client audit trail) */
  flags: ModerationFlag[];
}

/**
 * The mock-first provider port (arch §4.2 — mirrors v1 `services/purchases.ts`).
 * `MockBloopProvider` (default, offline, deterministic) and the callable-backed
 * proxy provider both implement this; the kid app selects via
 * `apps/kid/src/services/bloopProvider.ts` — NEVER a provider directly.
 */
export interface BloopProvider {
  /** stable provider id for seam assertions ("mock" | "proxy") */
  readonly id: string;
  sendTurn(input: BloopTurnInput, ctx: BloopContext): Promise<ModeratedReply>;
}
