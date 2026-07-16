/**
 * guardrailPipeline.ts — the Bloop chat safety pipeline core. HAND-CRAFTED (Fable), M2.1.
 *
 * Pure, dependency-free TS (no firebase imports) → unit-testable, and portable
 * into functions/src/bloop/pipeline.ts. The Cloud Function wraps this with:
 * auth (derive childId from uid — NEVER trust client ctx), Firestore loads,
 * transcript writes, FCM alerts, and the provider adapters.
 *
 * INVARIANTS (from 02-architecture §5 / §8 — the model is NEVER the boundary):
 *  I1  FAIL CLOSED. Any shield error/timeout/unknown ⇒ the SAFE FALLBACK reply,
 *      never the raw model output, never a retry that skips a shield.
 *  I2  ORDER IS LAW: hardGate → inputShield → (model) → outputShield → crisis
 *      re-check. The OUTPUT shield runs on every reply including regenerations.
 *  I3  CRISIS IS NEVER A BARE REFUSAL. It returns pre-written, human-reviewed,
 *      REGION-LOCALIZED support copy from the card table — the model's text is
 *      discarded entirely on a crisis turn. Cards with reviewed:false ⇒ chat
 *      must not be enabled for that locale at all (enforced upstream).
 *  I4  CRISIS TYPE DIFFERENTIATION (§8 #27): selfHarm/distress ⇒ parent alert.
 *      abuse/csam ⇒ child-directed resources + safetyReport + legalHold, and
 *      NO automatic parent alert (the caregiver may be the subject).
 *  I5  PII refused BOTH directions; child PII never reaches the provider,
 *      model-emitted PII never reaches the child (redact, then judge).
 *  I6  Hard-stops before any model call: bloopEnabled=false, quiet hours,
 *      session/day budget exhausted, locale card unreviewed, consent missing.
 *  I7  The never-list is enforced in the OUTPUT shield too (sycophancy caps,
 *      no medical/therapeutic advice, no external links, no "I'm your only
 *      friend" isolation language, no engagement-farming "don't go!").
 */

// ----------------------------------------------------------------- contracts

export type CrisisType = "selfHarm" | "acuteDistress" | "abuse" | "csamRisk" | "none";

export interface ShieldVerdict {
  ok: boolean;
  category:
    | "safe" | "crisis" | "pii" | "sexual" | "violence" | "hate"
    | "offTopic" | "jailbreak" | "medicalAdvice" | "isolationLanguage"
    | "externalContent" | "error";
  crisisType?: CrisisType;
  /** input text with PII masked — the ONLY string allowed to reach the model */
  sanitized?: string;
  score?: number; // 0..1 classifier confidence, for logging/red-team tuning
}

export interface PipelineDeps {
  /** regex+DLP input scanner (fast, local-first) */
  scanInput(text: string): Promise<ShieldVerdict>;
  /** semantic output classifier — HARD ship-gate (§8 #30); regex-only builds
   *  must report available:false which disables chat upstream. */
  scanOutput(text: string): Promise<ShieldVerdict & { available: boolean }>;
  /** crisis detector — runs on input, output, AND session window (I2/I3);
   *  non-disableable (config cannot turn it off). */
  detectCrisis(text: string, sessionWindow: string[]): Promise<{ type: CrisisType; score: number }>;
  /** the LLM call — Gemini strict-thresholds or DeepSeek behind identical
   *  shields; single-shot + server-reconstructed N≤4 history (§8 #32). */
  callModel(systemPrompt: string, history: string[], userTurn: string): Promise<string>;
  /** pre-written, psychologist-reviewed, locale-resolved crisis card */
  crisisCard(type: Exclude<CrisisType, "none">): { reviewed: boolean; childText: string };
  log(event: string, data: Record<string, unknown>): void;
}

export interface TurnContext {
  /** ALL server-loaded (never from the client): */
  bloopEnabled: boolean;
  consentValid: boolean;
  localeCardReviewed: boolean;
  withinQuietHours: boolean;
  turnsRemainingToday: number;
  ageBand: "young" | "older" | "preteen";
  neuroProfile: "autism" | "adhd" | "balanced";
  topicScope: string;           // the allow-list system prompt fragment
  sessionWindow: string[];      // last ≤4 sanitized turns, server-reconstructed
}

export type TurnOutcome =
  | { kind: "reply"; text: string; flags: string[] }
  | { kind: "gentleRedirect"; text: string; reason: ShieldVerdict["category"] }
  | { kind: "crisis"; crisisType: Exclude<CrisisType, "none">; childText: string;
      alertParent: boolean; fileSafetyReport: boolean; legalHold: boolean }
  | { kind: "hardStop"; reason: "disabled" | "consent" | "quietHours" | "budget" | "unreviewedLocale" | "shieldUnavailable" }
  | { kind: "fallback"; text: string }; // I1 — shield failure path

/** Warm, deterministic, reviewed fallback/redirect copy (i18n keys resolved
 *  by the caller; embedded EN defaults keep the pure core testable). */
export const SAFE_FALLBACK = "Hmm, my bubbles got tangled! Let's talk about your day instead. 🫧";
export const REDIRECTS: Record<string, string> = {
  offTopic: "That's a big one! I'm best at routines, feelings, and fun. Want to tell me about your day?",
  pii: "Let's keep names and places just between you and your grown-ups! What else is on your mind?",
  jailbreak: "Nice try, bubble-friend! I only know how to be Bloop. 🫧",
  medicalAdvice: "That's a great question for your grown-up or your doctor! I'm just a bubble buddy.",
  default: "Let's splash over to something else — how is your day going?",
};

// ------------------------------------------------------------------ pipeline

export async function runTurn(userText: string, ctx: TurnContext, deps: PipelineDeps): Promise<TurnOutcome> {
  // I6 — hard gates, cheapest first, NO model call past any failure.
  if (!ctx.bloopEnabled) return { kind: "hardStop", reason: "disabled" };
  if (!ctx.consentValid) return { kind: "hardStop", reason: "consent" };
  if (!ctx.localeCardReviewed) return { kind: "hardStop", reason: "unreviewedLocale" }; // I3
  if (ctx.withinQuietHours) return { kind: "hardStop", reason: "quietHours" };
  if (ctx.turnsRemainingToday <= 0) return { kind: "hardStop", reason: "budget" };

  try {
    // Crisis detection FIRST — before topic/PII shields could swallow it (I2).
    const crisisIn = await deps.detectCrisis(userText, ctx.sessionWindow);
    if (crisisIn.type !== "none") return crisisOutcome(crisisIn.type, deps);

    // Input shield: PII masking + category screen.
    const input = await deps.scanInput(userText);
    if (input.category === "error") return { kind: "fallback", text: SAFE_FALLBACK }; // I1
    if (!input.ok) {
      deps.log("input_blocked", { category: input.category, score: input.score });
      return { kind: "gentleRedirect", text: REDIRECTS[input.category] ?? REDIRECTS.default, reason: input.category };
    }
    const sanitized = input.sanitized ?? userText; // I5 — only sanitized reaches the model

    // Output shield availability is a precondition, not a best-effort (§8 #30).
    const model = await deps.callModel(ctx.topicScope, ctx.sessionWindow, sanitized);

    const out = await deps.scanOutput(model);
    if (!out.available) return { kind: "hardStop", reason: "shieldUnavailable" };
    if (out.category === "error") return { kind: "fallback", text: SAFE_FALLBACK }; // I1

    // Crisis re-check on the OUTPUT + session (a model can introduce it) — I2.
    const crisisOut = await deps.detectCrisis(model, [...ctx.sessionWindow, sanitized]);
    if (crisisOut.type !== "none") return crisisOutcome(crisisOut.type, deps);

    if (!out.ok) {
      // I7 — never-list violations in the reply: discard, redirect gently.
      deps.log("output_blocked", { category: out.category, score: out.score });
      return { kind: "gentleRedirect", text: REDIRECTS[out.category] ?? REDIRECTS.default, reason: out.category };
    }

    return { kind: "reply", text: out.sanitized ?? model, flags: [] };
  } catch (e) {
    deps.log("pipeline_error", { message: e instanceof Error ? e.message : String(e) });
    return { kind: "fallback", text: SAFE_FALLBACK }; // I1 — fail closed, warm.
  }
}

/** I3 + I4 — crisis is a pre-written card + differentiated routing, never model text. */
function crisisOutcome(type: Exclude<CrisisType, "none">, deps: PipelineDeps): TurnOutcome {
  const card = deps.crisisCard(type);
  // Upstream guarantees reviewed cards (I6), but defense-in-depth:
  if (!card.reviewed) return { kind: "hardStop", reason: "unreviewedLocale" };
  const caregiverImplicated = type === "abuse" || type === "csamRisk";
  deps.log("crisis", { type, caregiverImplicated });
  return {
    kind: "crisis",
    crisisType: type,
    childText: card.childText,          // localized, human-reviewed (I3)
    alertParent: !caregiverImplicated,  // I4 — never alert a potential abuser
    fileSafetyReport: caregiverImplicated,
    legalHold: caregiverImplicated,     // TTL-exempt (§8 #27)
  };
}

/*
 * INTEGRATION NOTES for the M2.1 build agent:
 *  - functions/src/bloop/index.ts (callable): verify auth → load TurnContext
 *    SERVER-SIDE from Firestore (uid→family→child; §8 #28) → runTurn → persist
 *    the transcript turn (redacted, retention-TTL'd) → on crisis: FCM+email
 *    fan-out when alertParent, safetyReports/{id}+legalHold when implicated
 *    (arch §5.2) → return only outcome.kind-appropriate text to the client.
 *  - deps.scanInput: port llm-guard's scanner taxonomy (patterns) + DLP for
 *    full_name/school_name (arch §2.5). deps.scanOutput: Gemini-based semantic
 *    classifier; available:false in regex-only builds (chat stays OFF).
 *  - deps.callModel: providers/gemini.ts (explicit strict safety thresholds —
 *    2.5/3 default OFF), providers/deepseek.ts (gated OFF for child data until
 *    DPA/non-PRC, §8 #31), providers/mock.ts (default in dev/CI — deterministic
 *    scripted replies so the whole pipeline is red-team testable offline).
 *  - Red-team catalog (M2.1 scaffold, M6.1 gate): jailbreaks, multi-turn
 *    context attacks, PII elicitation, crisis phrasing variants (incl. output-
 *    side), sycophancy probes — every case asserts on TurnOutcome.kind.
 *  - runTurn is PURE: jest can prove I1–I7 without emulator or network.
 */
