/**
 * packages/shared/src/bloop/turn.ts — the CANONICAL wire contract between the
 * kid client and the `bloopTurn` callable (M2.0, w2 §4/§6.1 + arch §4).
 *
 * `TurnOutcome` is ALIGNED 1:1 with the hand-crafted pipeline core
 * (`_build/spec2/handcraft/guardrailPipeline.ts` — the M2.1 `runTurn` returns
 * exactly this discriminated union), with ONE reconciliation: `crisisType`
 * uses the CANONICAL §8 #27 spelling from `compliance/crisisResources.ts`
 * (`self_harm|severe_distress|abuse|csam`) — never re-declared here (§8 #20).
 * `toCrisisType()` bridges the handcraft draft spellings
 * (`selfHarm`/`acuteDistress`/`csamRisk`).
 *
 * FAIL-CLOSED WIRE PARSING: `parseTurnOutcome` validates an untrusted wire
 * value structurally; anything malformed/unknown parses to `null` and the
 * caller serves the safe fallback — a bad server response can NEVER render
 * raw. `toModeratedReply` maps an outcome onto the ONE client-renderable
 * shape (`ModeratedReply`) so the surface renders pre-approved text only.
 *
 * Chat availability (`resolveChatAvailability`) is the client-side gate the
 * kid surface reads: when anything but "available", the deterministic
 * character is simply present WITHOUT chat — nothing broken, no error UI.
 */

import { type CrisisType } from "../compliance/crisisResources";
import type { ModerationFlag } from "./moderation";
import type {
  BloopContext,
  BloopTurnInput,
  ModeratedReply,
  ModeratedReplyStatus,
  QuickReply,
} from "./provider";

// ---------------------------------------------------------------------------
// Wire request.
// ---------------------------------------------------------------------------

/**
 * The callable request body. `ctx` is an UNTRUSTED HINT on the real proxy
 * path (§8 #28): the server derives `childId` from the authed uid and loads
 * every context field server-side. The client NEVER sends history — the
 * proxy reconstructs the N=4 window from the redacted transcript (§8 #32).
 */
export interface TurnRequest {
  input: BloopTurnInput;
  ctx: BloopContext;
}

// ---------------------------------------------------------------------------
// Wire outcome (the handcraft `TurnOutcome` shape — canonical, §BUILD prompt).
// ---------------------------------------------------------------------------

/**
 * Shield verdict categories (handcraft `ShieldVerdict["category"]`). This is
 * the PIPELINE vocabulary (what a shield saw); the transcript stores the
 * coarser `ModerationCategory` — the two are related but distinct on purpose.
 */
export type ShieldCategory =
  | "safe"
  | "crisis"
  | "pii"
  | "sexual"
  | "violence"
  | "hate"
  | "offTopic"
  | "jailbreak"
  | "medicalAdvice"
  | "isolationLanguage"
  | "externalContent"
  | "error";

/** Hard-stop reasons — I6: cheapest gates first, NO model call past any. */
export type TurnHardStopReason =
  | "disabled"
  | "consent"
  | "quietHours"
  | "budget"
  | "unreviewedLocale"
  | "shieldUnavailable";

export const ALL_HARD_STOP_REASONS: readonly TurnHardStopReason[] = [
  "disabled",
  "consent",
  "quietHours",
  "budget",
  "unreviewedLocale",
  "shieldUnavailable",
];

/**
 * THE canonical wire outcome — byte-compatible with the handcraft pipeline's
 * return type so M2.1 drops `runTurn` behind the callable without a mapping
 * layer. Crisis routing fields honor §8 #27: `alertParent` is FALSE for
 * abuse/csam (the caregiver may be the subject — never auto-notify a
 * potential abuser); those turns file a `safetyReport` + `legalHold` instead.
 */
export type TurnOutcome =
  | { kind: "reply"; text: string; flags: string[] }
  | { kind: "gentleRedirect"; text: string; reason: ShieldCategory }
  | {
      kind: "crisis";
      crisisType: CrisisType;
      /** pre-written, human-reviewed, locale-resolved card text (I3) */
      childText: string;
      alertParent: boolean;
      fileSafetyReport: boolean;
      legalHold: boolean;
    }
  | { kind: "hardStop"; reason: TurnHardStopReason }
  | { kind: "fallback"; text: string };

/**
 * Bridge the handcraft draft crisis spellings onto the canonical §8 #27
 * union. Unknown input FAILS CLOSED to `self_harm` — the HIGHEST-care
 * child-safe route (reviewed card + parent alert), never a silent drop.
 * (`abuse`/`csam` are never a fallback target: routing there SUPPRESSES the
 * parent alert, which must be an explicit, detected decision — §8 #27.)
 */
export function toCrisisType(raw: string): CrisisType {
  switch (raw) {
    case "self_harm":
    case "severe_distress":
    case "abuse":
    case "csam":
      return raw;
    case "selfHarm":
      return "self_harm";
    case "acuteDistress":
      return "severe_distress";
    case "csamRisk":
      return "csam";
    default:
      return "self_harm";
  }
}

// ---------------------------------------------------------------------------
// Deterministic, warm, reviewed copy (ported from the handcraft pipeline —
// i18n keys resolve upstream; embedded EN defaults keep the core testable).
// ---------------------------------------------------------------------------

/** I1 — the fail-safe reply for ANY shield/transport error. Warm, never blame. */
export const SAFE_FALLBACK_TEXT =
  "Hmm, my bubbles got tangled! Let's talk about your day instead. \u{1FAE7}";

/** Warm redirect lines per shield category (handcraft REDIRECTS, extended). */
export const REDIRECT_COPY: Partial<Record<ShieldCategory, string>> & { default: string } = {
  offTopic: "That's a big one! I'm best at routines, feelings, and fun. Want to tell me about your day?",
  pii: "Let's keep names and places just between you and your grown-ups! What else is on your mind?",
  jailbreak: "Nice try, bubble-friend! I only know how to be Bloop. \u{1FAE7}",
  medicalAdvice: "That's a great question for your grown-up or your doctor! I'm just a bubble buddy.",
  default: "Let's splash over to something else — how is your day going?",
};

// ---------------------------------------------------------------------------
// Fail-closed wire parsing.
// ---------------------------------------------------------------------------

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

const SHIELD_CATEGORIES: readonly ShieldCategory[] = [
  "safe",
  "crisis",
  "pii",
  "sexual",
  "violence",
  "hate",
  "offTopic",
  "jailbreak",
  "medicalAdvice",
  "isolationLanguage",
  "externalContent",
  "error",
];

const CRISIS_TYPES: readonly CrisisType[] = ["self_harm", "severe_distress", "abuse", "csam"];

/**
 * Structurally validate an UNTRUSTED wire value into a `TurnOutcome`.
 * Anything unexpected ⇒ `null` (the caller serves `SAFE_FALLBACK_TEXT`) —
 * a malformed/hostile response can never reach the child raw (I1).
 */
export function parseTurnOutcome(value: unknown): TurnOutcome | null {
  if (value === null || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  switch (o.kind) {
    case "reply":
      if (typeof o.text === "string" && isStringArray(o.flags))
        return { kind: "reply", text: o.text, flags: o.flags };
      return null;
    case "gentleRedirect":
      if (
        typeof o.text === "string" &&
        typeof o.reason === "string" &&
        (SHIELD_CATEGORIES as readonly string[]).includes(o.reason)
      )
        return { kind: "gentleRedirect", text: o.text, reason: o.reason as ShieldCategory };
      return null;
    case "crisis":
      if (
        typeof o.childText === "string" &&
        typeof o.crisisType === "string" &&
        (CRISIS_TYPES as readonly string[]).includes(o.crisisType) &&
        typeof o.alertParent === "boolean" &&
        typeof o.fileSafetyReport === "boolean" &&
        typeof o.legalHold === "boolean"
      )
        return {
          kind: "crisis",
          crisisType: o.crisisType as CrisisType,
          childText: o.childText,
          alertParent: o.alertParent,
          fileSafetyReport: o.fileSafetyReport,
          legalHold: o.legalHold,
        };
      return null;
    case "hardStop":
      if (
        typeof o.reason === "string" &&
        (ALL_HARD_STOP_REASONS as readonly string[]).includes(o.reason)
      )
        return { kind: "hardStop", reason: o.reason as TurnHardStopReason };
      return null;
    case "fallback":
      if (typeof o.text === "string") return { kind: "fallback", text: o.text };
      return null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Outcome → the ONE client-renderable shape.
// ---------------------------------------------------------------------------

/** Transcript/status vocabulary for a wire outcome (stored on every turn). */
export function turnOutcomeStatus(outcome: TurnOutcome): ModeratedReplyStatus {
  switch (outcome.kind) {
    case "reply":
      return "ok";
    case "gentleRedirect":
      // PII gets the dedicated warm-refusal status (w2 §2.3). The I7
      // never-list categories only an OUTPUT shield can raise map to the
      // output-FILTER status; everything else is the input-side warm redirect.
      if (outcome.reason === "pii") return "refused";
      if (outcome.reason === "isolationLanguage" || outcome.reason === "externalContent")
        return "filtered";
      return "redirect";
    case "crisis":
      return "crisis";
    case "hardStop":
      // quota-ish stops surface as rate_limited; every other hard stop reads
      // as "chat is off right now" (disabled) — the child never sees WHY.
      return outcome.reason === "quietHours" || outcome.reason === "budget"
        ? "rate_limited"
        : "disabled";
    case "fallback":
      return "error";
  }
}

export interface ToModeratedReplyOptions {
  /** curated on-scope chips for the next turn */
  quickReplies?: QuickReply[];
  /** the reviewed grown-up-facing crisis card (crisis outcomes only) */
  crisis?: ModeratedReply["crisis"];
  /** transcript turn id when the proxy logged one */
  turnId?: string;
  /** NON-PII verdict summary */
  flags?: ModerationFlag[];
}

/**
 * Map a wire `TurnOutcome` onto the client-renderable `ModeratedReply`.
 * Hard stops carry NO text on the wire — the surface hides chat entirely
 * (the deterministic character is simply present; nothing broken), so the
 * mapped text is empty and the status tells the surface which calm state
 * to show. Every other kind renders its pre-approved text verbatim.
 */
export function toModeratedReply(
  outcome: TurnOutcome,
  opts: ToModeratedReplyOptions = {},
): ModeratedReply {
  const base: ModeratedReply = {
    status: turnOutcomeStatus(outcome),
    text: "",
    flags: opts.flags ?? [],
    ...(opts.quickReplies ? { quickReplies: opts.quickReplies } : {}),
    ...(opts.crisis ? { crisis: opts.crisis } : {}),
    ...(opts.turnId ? { turnId: opts.turnId } : {}),
  };
  switch (outcome.kind) {
    case "reply":
    case "gentleRedirect":
    case "fallback":
      return { ...base, text: outcome.text };
    case "crisis":
      return { ...base, text: outcome.childText };
    case "hardStop":
      return base;
  }
}

// ---------------------------------------------------------------------------
// Chat availability (the kid-surface gate — M2.0 §BUILD prompt).
// ---------------------------------------------------------------------------

/** Why chat is not available right now (never an error surface for the child). */
export type ChatUnavailableReason =
  | "disabled"
  | "quietHours"
  | "budget"
  | "offline"
  | "shieldUnavailable";

export type ChatAvailability = "available" | ChatUnavailableReason;

export interface ChatAvailabilityInput {
  /** the parent master switch — ABSENT/false ⇒ chat OFF (default, §8 #15) */
  bloopEnabled: boolean;
  /**
   * The safety shield precondition. The offline MOCK provider is shielded by
   * construction (deterministic scripted replies — pass `true`); the REAL
   * proxy path passes whether the semantic output classifier is provisioned
   * (§8 #30 — regex-only builds report false and chat stays OFF).
   */
  shieldAvailable: boolean;
  /** transport reachable (the mock is always "online" — it never leaves the device) */
  online: boolean;
  withinQuietHours: boolean;
  turnsRemainingToday: number;
}

/**
 * Resolve the chat-availability state, FAIL CLOSED and in the handcraft I6
 * gate order (cheapest/most-authoritative first). Anything but "available"
 * means the surface shows the deterministic character WITHOUT chat.
 */
export function resolveChatAvailability(input: ChatAvailabilityInput): ChatAvailability {
  if (!input.bloopEnabled) return "disabled";
  if (!input.shieldAvailable) return "shieldUnavailable";
  if (!input.online) return "offline";
  if (input.withinQuietHours) return "quietHours";
  if (input.turnsRemainingToday <= 0) return "budget";
  return "available";
}
