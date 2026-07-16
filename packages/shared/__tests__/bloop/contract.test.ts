/**
 * __tests__/bloop/contract.test.ts — the M2.0 wire-contract pins (w2 §4 +
 * arch §4.2; the TurnOutcome shape is ALIGNED with the handcraft pipeline —
 * `_build/spec2/handcraft/guardrailPipeline.ts`).
 *
 * Proves: (1) every TurnOutcome kind ROUND-TRIPS the wire (JSON) losslessly
 * through the fail-closed parser; (2) malformed/hostile wire values parse to
 * null (never render raw); (3) the outcome→ModeratedReply mapping is total
 * and status-correct; (4) crisis-type + input-mode mappers fail CLOSED to the
 * safe member; (5) chat availability resolves fail-closed in gate order.
 */
import { describe, expect, it } from "@jest/globals";

import {
  ALL_HARD_STOP_REASONS,
  ALL_MODERATED_REPLY_STATUSES,
  parseTurnOutcome,
  resolveChatAvailability,
  toCrisisType,
  toInputMode,
  toModeratedReply,
  turnOutcomeStatus,
  SAFE_FALLBACK_TEXT,
  type ChatAvailabilityInput,
  type TurnOutcome,
} from "@tiny-bubbles/shared";

// ---------------------------------------------------------------------------
// Round-trip: every kind survives serialize → parse byte-identically.
// ---------------------------------------------------------------------------

const OUTCOME_FIXTURES: TurnOutcome[] = [
  { kind: "reply", text: "Hello bubble friend!", flags: [] },
  { kind: "reply", text: "with flags", flags: ["sycophancyCapped"] },
  { kind: "gentleRedirect", text: "Let's talk about your day!", reason: "offTopic" },
  { kind: "gentleRedirect", text: "Names stay with grown-ups!", reason: "pii" },
  {
    kind: "crisis",
    crisisType: "self_harm",
    childText: "You are not alone. Please tell a trusted grown-up.",
    alertParent: true,
    fileSafetyReport: false,
    legalHold: false,
  },
  {
    kind: "crisis",
    crisisType: "abuse",
    childText: "What is happening is not your fault.",
    alertParent: false, // §8 #27 — NEVER auto-alert a potentially implicated caregiver
    fileSafetyReport: true,
    legalHold: true,
  },
  { kind: "hardStop", reason: "disabled" },
  { kind: "hardStop", reason: "quietHours" },
  { kind: "hardStop", reason: "budget" },
  { kind: "hardStop", reason: "shieldUnavailable" },
  { kind: "fallback", text: SAFE_FALLBACK_TEXT },
];

describe("TurnOutcome wire round-trip (handcraft-aligned shape)", () => {
  it.each(OUTCOME_FIXTURES.map((o) => [o.kind, o] as const))(
    "round-trips a %s outcome losslessly",
    (_kind, outcome) => {
      const parsed = parseTurnOutcome(JSON.parse(JSON.stringify(outcome)));
      expect(parsed).toEqual(outcome);
    },
  );

  it("covers every hard-stop reason on the wire", () => {
    for (const reason of ALL_HARD_STOP_REASONS) {
      expect(parseTurnOutcome({ kind: "hardStop", reason })).toEqual({ kind: "hardStop", reason });
    }
  });
});

describe("fail-closed wire parsing (I1 — a bad response never renders raw)", () => {
  const HOSTILE: unknown[] = [
    null,
    undefined,
    42,
    "reply",
    [],
    {},
    { kind: "reply" }, // missing text/flags
    { kind: "reply", text: "x", flags: [1] }, // non-string flag
    { kind: "gentleRedirect", text: "x", reason: "notACategory" },
    { kind: "crisis", crisisType: "selfHarm", childText: "x" }, // draft spelling + missing routing
    { kind: "crisis", crisisType: "self_harm", childText: "x", alertParent: "yes", fileSafetyReport: false, legalHold: false },
    { kind: "hardStop", reason: "becauseISaidSo" },
    { kind: "fallback" },
    { kind: "modelRaw", text: "UNSHIELDED" }, // unknown kind
  ];

  it.each(HOSTILE.map((v, i) => [i, v] as const))("parses hostile fixture #%s to null", (_i, v) => {
    expect(parseTurnOutcome(v)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Outcome → ModeratedReply (the ONE client-renderable shape).
// ---------------------------------------------------------------------------

describe("toModeratedReply / turnOutcomeStatus", () => {
  it("maps reply → ok with the pre-approved text", () => {
    const r = toModeratedReply({ kind: "reply", text: "Hi!", flags: [] });
    expect(r).toMatchObject({ status: "ok", text: "Hi!", flags: [] });
  });

  it("maps pii redirects to the refused status, others to redirect", () => {
    expect(turnOutcomeStatus({ kind: "gentleRedirect", text: "x", reason: "pii" })).toBe("refused");
    expect(turnOutcomeStatus({ kind: "gentleRedirect", text: "x", reason: "offTopic" })).toBe(
      "redirect",
    );
    expect(turnOutcomeStatus({ kind: "gentleRedirect", text: "x", reason: "jailbreak" })).toBe(
      "redirect",
    );
  });

  it("maps output-side never-list categories to the filtered status", () => {
    expect(
      turnOutcomeStatus({ kind: "gentleRedirect", text: "x", reason: "externalContent" }),
    ).toBe("filtered");
    expect(
      turnOutcomeStatus({ kind: "gentleRedirect", text: "x", reason: "isolationLanguage" }),
    ).toBe("filtered");
  });

  it("maps crisis → crisis and renders ONLY the reviewed childText", () => {
    const r = toModeratedReply({
      kind: "crisis",
      crisisType: "severe_distress",
      childText: "Reviewed card text.",
      alertParent: true,
      fileSafetyReport: false,
      legalHold: false,
    });
    expect(r.status).toBe("crisis");
    expect(r.text).toBe("Reviewed card text.");
  });

  it("maps quota-ish hard stops to rate_limited, the rest to disabled, with NO text", () => {
    expect(toModeratedReply({ kind: "hardStop", reason: "quietHours" })).toMatchObject({
      status: "rate_limited",
      text: "",
    });
    expect(toModeratedReply({ kind: "hardStop", reason: "budget" }).status).toBe("rate_limited");
    for (const reason of ["disabled", "consent", "unreviewedLocale", "shieldUnavailable"] as const) {
      const r = toModeratedReply({ kind: "hardStop", reason });
      expect(r.status).toBe("disabled");
      expect(r.text).toBe("");
    }
  });

  it("maps fallback → error with the warm canned line", () => {
    const r = toModeratedReply({ kind: "fallback", text: SAFE_FALLBACK_TEXT });
    expect(r).toMatchObject({ status: "error", text: SAFE_FALLBACK_TEXT });
  });

  it("every mapped status is a member of the canonical status union", () => {
    for (const outcome of OUTCOME_FIXTURES) {
      expect(ALL_MODERATED_REPLY_STATUSES).toContain(turnOutcomeStatus(outcome));
    }
  });
});

// ---------------------------------------------------------------------------
// Canonical mappers fail closed (§8 #19 / §8 #27).
// ---------------------------------------------------------------------------

describe("canonical mappers", () => {
  it("toCrisisType bridges the handcraft draft spellings", () => {
    expect(toCrisisType("selfHarm")).toBe("self_harm");
    expect(toCrisisType("acuteDistress")).toBe("severe_distress");
    expect(toCrisisType("csamRisk")).toBe("csam");
    expect(toCrisisType("abuse")).toBe("abuse");
    expect(toCrisisType("self_harm")).toBe("self_harm");
  });

  it("toCrisisType fails CLOSED to self_harm (highest-care route, never abuse)", () => {
    // Unknown must NEVER land on abuse/csam: that routing SUPPRESSES the
    // parent alert, which must be an explicit detected decision (§8 #27).
    expect(toCrisisType("someNewType")).toBe("self_harm");
    expect(toCrisisType("")).toBe("self_harm");
  });

  it("toInputMode fails closed to chips (PII-free by construction, §8 #19)", () => {
    expect(toInputMode("quickReply")).toBe("chips");
    expect(toInputMode("freetext")).toBe("freeText");
    expect(toInputMode("text")).toBe("freeText");
    expect(toInputMode("hologram")).toBe("chips");
  });
});

// ---------------------------------------------------------------------------
// Chat availability — fail closed, gate order (M2.0 §BUILD prompt).
// ---------------------------------------------------------------------------

describe("resolveChatAvailability", () => {
  const OPEN: ChatAvailabilityInput = {
    bloopEnabled: true,
    shieldAvailable: true,
    online: true,
    withinQuietHours: false,
    turnsRemainingToday: 5,
  };

  it("is available only when every gate passes", () => {
    expect(resolveChatAvailability(OPEN)).toBe("available");
  });

  it("the parent gate wins over everything (disabled first)", () => {
    expect(
      resolveChatAvailability({
        ...OPEN,
        bloopEnabled: false,
        shieldAvailable: false,
        online: false,
        withinQuietHours: true,
        turnsRemainingToday: 0,
      }),
    ).toBe("disabled");
  });

  it("a missing shield disables chat before transport (§8 #30 posture)", () => {
    expect(resolveChatAvailability({ ...OPEN, shieldAvailable: false, online: false })).toBe(
      "shieldUnavailable",
    );
  });

  it("offline / quietHours / budget resolve in order", () => {
    expect(resolveChatAvailability({ ...OPEN, online: false })).toBe("offline");
    expect(resolveChatAvailability({ ...OPEN, withinQuietHours: true })).toBe("quietHours");
    expect(resolveChatAvailability({ ...OPEN, turnsRemainingToday: 0 })).toBe("budget");
  });
});
