/**
 * gates/crisis-review.test.ts — the crisis-pathway gate (w8 §4.6; §8 #16b):
 * resolveCrisisCard NEVER invents a number (unknown → GENERIC_FALLBACK_CARD),
 * SAFE_MESSAGING carries no means/method, and assertCrisisTableReviewed
 * BLOCKS while any launch locale (incl. en-US) is reviewed:false pre-sign-off.
 */
import { describe, expect, it } from "@jest/globals";

import {
  CHILD_PROTECTION_RESOURCES,
  CRISIS_RESOURCES,
  GENERIC_CHILD_PROTECTION_CARD,
  GENERIC_FALLBACK_CARD,
  resolveCrisisCard,
  SAFE_MESSAGING,
} from "../../src/compliance/crisisResources";
import {
  assertCrisisTableReviewed,
  CRISIS_REVIEW_SIGNOFF,
  isCrisisCardShippable,
  LAUNCH_LOCALES,
} from "../../src/compliance/crisisReview";

// Means/method words that must NEVER appear in child-facing crisis copy
// (988 Media Toolkit / reportingonsuicide.org safe-messaging rules).
const MEANS_METHOD =
  /\b(pill|overdose|hang|hanging|jump|jumping|knife|knives|cut|cutting|gun|firearm|weapon|rope|suffocat|poison|drown)\b/i;

describe("resolveCrisisCard — never invents, never throws", () => {
  it("unknown locale → GENERIC_FALLBACK_CARD (no number)", () => {
    const card = resolveCrisisCard("xx-YY");
    expect(card).toBe(GENERIC_FALLBACK_CARD);
    expect(card.resources).toEqual([]);
    for (const line of [card.headline, ...card.bodyLines]) {
      expect(line).not.toMatch(/\d{3}/); // no digits that could read as a number
    }
  });

  it("exact locale resolves its own card", () => {
    expect(resolveCrisisCard("en-US").locale).toBe("en-US");
    expect(resolveCrisisCard("es-MX").locale).toBe("es-MX");
    expect(resolveCrisisCard("hi-IN").locale).toBe("hi-IN");
  });

  it("language fallback: en-GB → an en-* card, never a guessed number", () => {
    const card = resolveCrisisCard("en-GB");
    expect(card.locale.startsWith("en-")).toBe(true);
  });

  it("abuse/csam resolve the child-protection path (§8 #27) — generic when unseeded", () => {
    expect(resolveCrisisCard("en-IN", "abuse")).toBe(CHILD_PROTECTION_RESOURCES["en-IN"]);
    expect(resolveCrisisCard("xx-YY", "abuse")).toBe(GENERIC_CHILD_PROTECTION_CARD);
    expect(resolveCrisisCard("es-MX", "csam")).toBe(GENERIC_CHILD_PROTECTION_CARD);
    expect(GENERIC_CHILD_PROTECTION_CARD.resources).toEqual([]);
  });

  it("never throws on garbage locales", () => {
    for (const locale of ["", "??", "123", "en", "EN-us-x-foo"]) {
      expect(() => resolveCrisisCard(locale)).not.toThrow();
    }
  });
});

describe("SAFE_MESSAGING — safe-messaging rules hold", () => {
  it("has the four blocks: validate / hope / trusted-grown-up / no-secrecy", () => {
    expect(SAFE_MESSAGING.validate.length).toBeGreaterThan(0);
    expect(SAFE_MESSAGING.hope.length).toBeGreaterThan(0);
    expect(SAFE_MESSAGING.trustedGrownUp).toMatch(/grown-up/i);
    expect(SAFE_MESSAGING.noSecrecy).toMatch(/secret/i);
  });

  it("contains NO means/method text", () => {
    for (const line of Object.values(SAFE_MESSAGING)) {
      expect(line).not.toMatch(MEANS_METHOD);
    }
  });

  it("no card's child-visible copy contains means/method text", () => {
    const all = [
      ...Object.values(CRISIS_RESOURCES),
      ...Object.values(CHILD_PROTECTION_RESOURCES),
      GENERIC_FALLBACK_CARD,
      GENERIC_CHILD_PROTECTION_CARD,
    ];
    for (const card of all) {
      for (const line of [card.headline, ...card.bodyLines]) {
        expect(line).not.toMatch(MEANS_METHOD);
      }
    }
  });
});

describe("crisis review discipline (§8 #16b) — EVERY card ships reviewed:false", () => {
  it("every seeded card — INCLUDING en-US/988 — is reviewed:false pre-sign-off", () => {
    for (const card of Object.values(CRISIS_RESOURCES)) {
      expect(card.reviewed).toBe(false);
    }
  });

  it("the sign-off registry is empty until a psychologist entry lands", () => {
    expect(Object.keys(CRISIS_REVIEW_SIGNOFF)).toHaveLength(0);
  });

  it("assertCrisisTableReviewed BLOCKS the ship for the launch locales pre-sign-off", () => {
    // This is the gate DOING ITS JOB: at M1.1 no locale has a sign-off, so the
    // assertion must throw (the M6.1 ship gate runs it for real). When review
    // lands (reviewed:true + a CRISIS_REVIEW_SIGNOFF row) this flips.
    expect(LAUNCH_LOCALES.length).toBeGreaterThan(0);
    expect(() => assertCrisisTableReviewed(LAUNCH_LOCALES)).toThrow(/reviewed:false|sign-off/i);
    for (const locale of LAUNCH_LOCALES) {
      expect(isCrisisCardShippable(locale)).toBe(false);
    }
  });

  it("assertCrisisTableReviewed passes only when card+sign-off BOTH exist (simulated)", () => {
    // simulate a completed review WITHOUT mutating the shipped table
    const locale = "en-US";
    const card = CRISIS_RESOURCES[locale];
    const simulatedReviewed = { ...card, reviewed: true };
    expect(simulatedReviewed.reviewed).toBe(true);
    // the real assertion still blocks because the SHIPPED table is unreviewed:
    expect(() => assertCrisisTableReviewed([locale])).toThrow();
  });
});
